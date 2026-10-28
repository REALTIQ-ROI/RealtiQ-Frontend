import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AdminPolicyValueEditor from '../../../components/admin/AdminPolicyValueEditor';
import AdminLayout from '../../../components/layout/AdminLayout';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../../lib/axios';
import { useAuth } from '../../../contexts/AuthContext';
import {
  adminPolicyService,
  type AdminPolicyJsonValue,
  type AdminPolicyKey,
  type AdminPolicyRevision,
  type AdminPolicySnapshot,
  type AdminPolicyValue,
  type PrepareAdminPolicyRevisionInput,
} from '../../../services/adminPolicyService';
import {
  adminPolicyKeys,
  getAdminPolicyCategories,
  getAdminPolicyMetadata,
} from '../../../services/adminPolicyRegistry';
import {
  createPolicyDraft,
  findPolicySchemaDrift,
  resizePolicyArraysForCount,
  serializePolicyDraft,
  updatePolicyDraftAtPath,
} from '../../../services/adminPolicyForm';

interface PolicyPanelState {
  policy?: AdminPolicySnapshot;
  revisions: AdminPolicyRevision[];
  nextCursor: string | null;
  loading: boolean;
  historyLoading: boolean;
  loadingMore: boolean;
  policyError: string | null;
  historyError: string | null;
  validationErrors: string[];
  notice: string | null;
  needsReview: boolean;
}

type PolicyPanels = Record<AdminPolicyKey, PolicyPanelState>;
type ActiveAction = { key: AdminPolicyKey; kind: 'prepare' | 'approved' | 'rejected' };
type EditorDraft = {
  value: Record<string, unknown>;
  reason: string;
};

const makePanel = (): PolicyPanelState => ({
  revisions: [], nextCursor: null, loading: true, historyLoading: false, loadingMore: false,
  policyError: null, historyError: null, validationErrors: [], notice: null, needsReview: false,
});

const makePanels = (): PolicyPanels => Object.fromEntries(adminPolicyKeys.map((key) => [key, makePanel()])) as PolicyPanels;
const makeRequestVersions = () => Object.fromEntries(adminPolicyKeys.map((key) => [key, 0])) as Record<AdminPolicyKey, number>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const safeDate = (value?: string | null) => {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleString('en-NG');
};

const sensitiveKey = /^(?:secret|password|token|api[_-]?key|private[_-]?key|client[_-]?secret|provider[_-]?secret)$/i;

const hasSensitiveFields = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(hasSensitiveFields);
  if (!isObject(value)) return false;
  return Object.entries(value).some(([key, nested]) => sensitiveKey.test(key) || hasSensitiveFields(nested));
};

const redactSensitiveFields = (value: AdminPolicyJsonValue): AdminPolicyJsonValue => {
  if (Array.isArray(value)) return value.map(redactSensitiveFields);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [
    key,
    sensitiveKey.test(key) ? '[redacted]' : redactSensitiveFields(nested as AdminPolicyJsonValue),
  ]));
};

const humanizeKey = (key: string) => key
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/^./, (first) => first.toUpperCase());

const PolicyValueDisplay = ({ value }: { value: AdminPolicyJsonValue | null }) => {
  if (value === null) return <span className="text-secondary">Null</span>;
  if (typeof value === 'boolean') return <span>{value ? 'Enabled' : 'Disabled'}</span>;
  if (typeof value === 'number') return <span>{value}</span>;
  if (typeof value === 'string') return <span className="break-words">{value || 'Empty'}</span>;
  if (Array.isArray(value)) {
    return value.length
      ? <ul className="list-disc space-y-1 pl-5">{value.map((item, index) => <li key={index}><PolicyValueDisplay value={item} /></li>)}</ul>
      : <span className="text-secondary">No entries</span>;
  }
  const safeEntries = Object.entries(redactSensitiveFields(value) as Record<string, AdminPolicyJsonValue>);
  if (!safeEntries.length) return <span className="text-secondary">No values</span>;
  return <dl className="space-y-2">{safeEntries.map(([key, nested]) => <div key={key}>
    <dt className="font-semibold">{humanizeKey(key)}</dt>
    <dd className="mt-0.5 break-words pl-3"><PolicyValueDisplay value={nested} /></dd>
  </div>)}</dl>;
};

const errorText = (error: unknown) => {
  if (error instanceof ApiRequestError && error.code) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'The policy request could not be completed.';
};

const validationMessages = (error: unknown): string[] => {
  if (!(error instanceof ApiRequestError)) return [];
  return (error.fieldErrors ?? []).flatMap(({ path, msg }) => {
    const safeMessage = typeof msg === 'string' ? msg.trim() : '';
    if (!safeMessage) return [];
    return [path ? `${path}: ${safeMessage}` : safeMessage];
  });
};

const draftSignature = (draft: EditorDraft) => JSON.stringify(draft);

interface PolicyEditorProps {
  policyKey: AdminPolicyKey;
  panel: PolicyPanelState;
  currentIdentityId: string | null;
  protectedBusy: boolean;
  onPrepare: (key: AdminPolicyKey, value: AdminPolicyValue, reason: string) => Promise<void>;
  onDecision: (key: AdminPolicyKey, revision: AdminPolicyRevision, decision: 'approved' | 'rejected') => Promise<void>;
  onLoadMore: (key: AdminPolicyKey) => Promise<void>;
  onRetry: (key: AdminPolicyKey) => void;
  onAcknowledgeReview: (key: AdminPolicyKey) => void;
  onDirtyChange: (dirty: boolean) => void;
  onRegisterCommit: (commit: (() => void) | null) => void;
}

const PolicyEditor = ({
  policyKey, panel, currentIdentityId, protectedBusy, onPrepare, onDecision, onLoadMore,
  onRetry, onAcknowledgeReview, onDirtyChange, onRegisterCommit,
}: PolicyEditorProps) => {
  const metadata = getAdminPolicyMetadata(policyKey);
  const policy = panel.policy;
  const [draft, setDraft] = useState<EditorDraft>(() => ({ value: createPolicyDraft(metadata.fields, policy?.value ?? null), reason: '' }));
  const [formError, setFormError] = useState<string | null>(null);
  const baseline = useRef(draftSignature(draft));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const nextDirty = draftSignature(draft) !== baseline.current;
    setDirty(nextDirty);
    onDirtyChange(nextDirty);
  }, [draft, onDirtyChange]);

  useEffect(() => {
    const commitDraft = () => {
      baseline.current = draftSignature(draft);
      setDirty(false);
      onDirtyChange(false);
    };
    onRegisterCommit(commitDraft);
    return () => onRegisterCommit(null);
  }, [draft, onDirtyChange, onRegisterCommit]);

  useEffect(() => {
    if (!dirty) return undefined;
    const preventAccidentalExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', preventAccidentalExit);
    return () => window.removeEventListener('beforeunload', preventAccidentalExit);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return undefined;
    const confirmPolicyNavigation = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest('a[href]');
      if (!(link instanceof HTMLAnchorElement) || link.target || event.defaultPrevented) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin === window.location.origin
        && (destination.pathname !== window.location.pathname || destination.search !== window.location.search)) {
        if (!window.confirm('Discard unsaved policy changes and leave this page?')) {
          event.preventDefault();
          event.stopImmediatePropagation();
        } else {
          onDirtyChange(false);
        }
      }
    };
    document.addEventListener('click', confirmPolicyNavigation, true);
    return () => document.removeEventListener('click', confirmPolicyNavigation, true);
  }, [dirty, onDirtyChange]);

  const updateValue = (path: Array<string | number>, nextValue: unknown) => {
    setDraft((current) => {
      const topLevelField = path.length === 1 && typeof path[0] === 'string'
        ? metadata.fields.find((field) => field.key === path[0])
        : undefined;
      const value = topLevelField?.type === 'number'
        ? resizePolicyArraysForCount(metadata.fields, current.value, topLevelField.key, nextValue)
        : updatePolicyDraftAtPath(current.value, path, nextValue) as Record<string, unknown>;
      return { ...current, value };
    });
    setFormError(null);
  };

  const updateReason = (reason: string) => {
    setDraft((current) => ({ ...current, reason }));
    setFormError(null);
  };

  const parseValue = (): AdminPolicyValue | null => {
    const result = serializePolicyDraft(policyKey, metadata.fields, draft.value);
    if (result.errors.length || result.value === null) {
      setFormError(result.errors.join(' '));
      return null;
    }
    return result.value;
  };

  const submitRevision = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!policy || !Number.isInteger(policy.revision) || policy.revision < 0) {
      setFormError('The current policy revision is unavailable. Refresh before submitting.'); return;
    }
    if (policy.value && hasSensitiveFields(policy.value)) {
      setFormError('This policy contains sensitive fields and is read-only in this editor.'); return;
    }
    const schemaDrift = findPolicySchemaDrift(metadata.fields, policy.value);
    if (schemaDrift.length) {
      setFormError(`The active value contains fields this editor does not recognize (${schemaDrift.join(', ')}). Refresh or ask the policy owner to reconcile the schema before editing.`);
      return;
    }
    const reason = draft.reason.trim();
    if (!reason || reason.length > 500) {
      setFormError('Enter a reason of 1–500 characters.'); return;
    }
    const value = parseValue();
    if (value === null) return;
    await onPrepare(policyKey, value, reason);
  };

  const requestDecision = (revision: AdminPolicyRevision, decision: 'approved' | 'rejected') => {
    const verb = decision === 'approved' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${verb} this ${metadata.label} revision? The server checks authority and records the decision.`)) return;
    void onDecision(policyKey, revision, decision);
  };

  if (panel.loading && !policy) return <LoadingState label={`Loading ${metadata.label} policy...`} />;
  if (panel.policyError && !policy) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert"><p>{panel.policyError}</p><Button type="button" variant="secondary" className="mt-3" onClick={() => onRetry(policyKey)}>Retry policy and history</Button></div>;
  if (!policy) return <div className="rounded-2xl border border-outline-variant/15 bg-white p-5" role="status">No policy response is available.</div>;

  const currentHasSecret = policy.value !== null && hasSensitiveFields(policy.value);
  const schemaDrift = findPolicySchemaDrift(metadata.fields, policy.value);
  const schemaAvailable = schemaDrift.length === 0 && !currentHasSecret;

  return <section className="rounded-2xl border border-outline-variant/15 bg-white p-5 shadow-sm sm:p-7" aria-labelledby={`${policyKey}-heading`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-secondary">{metadata.category}</p>
        <h2 id={`${policyKey}-heading`} className="mt-1 text-xl font-black">{metadata.label}</h2>
        <p className="mt-1 break-all font-mono text-xs text-secondary">{policyKey}</p>
        <p className="mt-1 text-xs text-secondary">Policy department: <span className="font-mono">{metadata.department}</span> · Backend authorization is authoritative.</p>
      </div>
      <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold capitalize">{policy.state}</span>
    </div>

    {panel.policyError ? <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{panel.policyError}</div> : null}
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <div className="space-y-3">
        <h3 className="font-bold">Current active policy</h3>
        <p className="text-sm">State: <strong className="capitalize">{policy.state}</strong></p>
        <p className="text-sm">Approved revision: <strong>{policy.revision}</strong></p>
        {policy.approvedAt ? <p className="text-sm">Approved/effective: {safeDate(policy.approvedAt)}</p> : null}
        {policy.state === 'unconfigured'
          ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No approved value is configured. No default values are supplied here.</p>
          : <div className="max-h-80 overflow-auto rounded-lg bg-surface-container-low p-4 text-sm" aria-label={`${metadata.label} current values`}><PolicyValueDisplay value={policy.value} /></div>}
        {currentHasSecret ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Sensitive fields are redacted. Editing is disabled to avoid resubmitting redacted values.</p> : null}
        <p className="text-xs text-secondary">A configured Console policy does not by itself confirm that external providers, credentials, datasets, or runtime services are available. Feature operations remain subject to backend readiness.</p>
      </div>

      <form className="space-y-3" noValidate onSubmit={(event) => void submitRevision(event)}>
        <div>
          <h3 className="font-bold">Edit policy values</h3>
          <p className="mt-1 text-xs text-secondary">This draft is separate from active values. Backend authorization and validation remain authoritative. Protected submissions require authenticator step-up.</p>
        </div>
        {metadata.note ? <p role="note" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{metadata.note}</p> : null}
        {!schemaAvailable ? <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{currentHasSecret ? 'This policy contains sensitive fields and is read-only in this editor.' : `The active value contains fields not represented by this editor: ${schemaDrift.join(', ')}. Refresh or ask the policy owner to reconcile the schema before editing.`}</p> : null}
        <AdminPolicyValueEditor fields={metadata.fields} value={draft.value} onChange={updateValue} disabled={protectedBusy || !schemaAvailable} />
        <label className="block text-sm font-semibold">Reason<textarea aria-label="Reason" required className="mt-1 w-full rounded-lg border border-outline-variant/30 px-3 py-2" rows={3} maxLength={500} value={draft.reason} onChange={(event) => updateReason(event.target.value)} /><span className="mt-1 block text-xs font-normal text-secondary">{draft.reason.trim().length}/500 characters</span></label>
        {formError ? <p role="alert" className="text-sm text-red-700">{formError}</p> : null}
        {panel.validationErrors.length ? <ul role="alert" aria-label="Server validation errors" className="list-disc space-y-1 rounded-lg bg-red-50 p-3 pl-8 text-sm text-red-800">{panel.validationErrors.map((message, index) => <li key={`${index}:${message}`}>{message}</li>)}</ul> : null}
        {panel.needsReview ? <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><input className="mt-1" type="checkbox" onChange={() => onAcknowledgeReview(policyKey)} /><span>I reviewed the refreshed current policy and revision history before preparing another revision.</span></label> : null}
        {panel.notice ? <div role="status" className="rounded-lg bg-surface-container-low p-3 text-sm"><p>{panel.notice}</p>{panel.notice.toLowerCase().includes('authenticator') ? <Link className="mt-2 inline-block font-bold text-primary underline" to="/dashboard/admin/settings">Open account security settings</Link> : null}</div> : null}
        <Button type="submit" loading={protectedBusy} disabled={protectedBusy || panel.loading || panel.needsReview || !schemaAvailable}>Submit policy revision</Button>
      </form>
    </div>

    <div className="mt-7 border-t border-outline-variant/10 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Revision history</h3><Button type="button" variant="secondary" disabled={panel.loading || panel.historyLoading} onClick={() => onRetry(policyKey)}>Refresh policy and history</Button></div>
      {panel.historyError ? <div role="alert" className="mt-3 text-sm text-red-700"><p>{panel.historyError}</p><Button type="button" variant="secondary" className="mt-2" onClick={() => onRetry(policyKey)}>Retry history</Button></div> : null}
      {panel.historyLoading && panel.revisions.length === 0 ? <LoadingState label="Loading revision history..." /> : null}
      {panel.revisions.length === 0 && !panel.historyLoading && !panel.loading ? <p className="mt-3 text-sm text-secondary">No revisions have been returned for this policy.</p> : null}
      <ol className="mt-3 space-y-3">
        {panel.revisions.map((revision) => {
          const isPending = revision.state === 'pending';
          const currentPersonPrepared = Boolean(currentIdentityId && revision.preparedBy === currentIdentityId);
          const canPresentDecision = isPending && Boolean(currentIdentityId) && !currentPersonPrepared;
          return <li key={revision.id} className="rounded-xl border border-outline-variant/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2"><span className="font-bold capitalize">{revision.state}</span><span className="text-xs text-secondary">Based on revision {revision.basedOnRevision}</span></div>
              <span className="text-xs text-secondary">Submitted {safeDate(revision.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm"><strong>Reason:</strong> {revision.reason}</p>
            <details className="mt-2"><summary className="cursor-pointer text-sm font-semibold">View submitted policy values</summary><div className="mt-2 max-h-60 overflow-auto rounded-lg bg-surface-container-low p-3 text-sm"><PolicyValueDisplay value={revision.value} /></div></details>
            {revision.approvedAt ? <p className="mt-2 text-xs text-secondary">Approved/effective {safeDate(revision.approvedAt)}</p> : null}
            {revision.rejectedAt ? <p className="mt-2 text-xs text-secondary">Rejected {safeDate(revision.rejectedAt)}</p> : null}
            {isPending && currentPersonPrepared ? <p className="mt-3 text-sm text-secondary">Prepared by your account; a separate authorized decision maker must use the server decision workflow.</p> : null}
            {isPending && !currentIdentityId ? <p className="mt-3 text-sm text-secondary">Decision controls are hidden because the signed-in identity could not be confirmed.</p> : null}
            {canPresentDecision ? <div className="mt-3"><p className="mb-2 text-xs text-secondary">The backend will verify separate decision authority when you submit.</p><div className="flex flex-wrap gap-2"><Button type="button" disabled={protectedBusy} onClick={() => requestDecision(revision, 'approved')}>Approve revision</Button><Button type="button" variant="secondary" disabled={protectedBusy} onClick={() => requestDecision(revision, 'rejected')}>Reject revision</Button></div></div> : null}
          </li>;
        })}
      </ol>
      {panel.nextCursor ? <Button type="button" variant="secondary" className="mt-4" loading={panel.loadingMore} disabled={panel.loadingMore || panel.loading} onClick={() => void onLoadMore(policyKey)}>Load more history</Button> : null}
    </div>
  </section>;
};

interface PolicyIndexProps {
  panels: PolicyPanels;
  onSelect: (key: AdminPolicyKey) => void;
  onRefresh: (key: AdminPolicyKey) => void;
}

const PolicyIndex = ({ panels, onSelect, onRefresh }: PolicyIndexProps) => <div className="space-y-7">
  {getAdminPolicyCategories().map((category) => <section key={category} aria-labelledby={`category-${category.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}>
    <h2 id={`category-${category.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`} className="mb-3 text-lg font-bold">{category}</h2>
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {adminPolicyKeys.filter((key) => getAdminPolicyMetadata(key).category === category).map((key) => {
        const metadata = getAdminPolicyMetadata(key);
        const panel = panels[key];
        const policy = panel.policy;
        return <li key={key} className="rounded-xl border border-outline-variant/15 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div><h3 className="font-bold">{metadata.label}</h3><p className="mt-1 break-all font-mono text-xs text-secondary">{key}</p></div>
            {policy ? <span className="rounded-full bg-surface-container-low px-2 py-1 text-xs font-semibold capitalize">{policy.state}</span> : null}
          </div>
          {panel.loading && !policy ? <p className="mt-3 text-sm text-secondary">Loading current policy…</p> : null}
          {panel.policyError ? <div className="mt-3" role="alert"><p className="text-sm text-red-700">{panel.policyError}</p><Button type="button" variant="secondary" className="mt-2" onClick={() => onRefresh(key)}>Retry</Button></div> : null}
          {policy ? <>
            <p className="mt-3 text-sm">Approved revision: <strong>{policy.revision}</strong></p>
            {policy.approvedAt ? <p className="mt-1 text-xs text-secondary">Effective {safeDate(policy.approvedAt)}</p> : null}
            <div className="mt-2 line-clamp-4 break-words text-xs text-secondary">{policy.state === 'unconfigured' ? 'No approved policy value is configured.' : policy.value === null ? 'No value returned.' : <PolicyValueDisplay value={policy.value} />}</div>
            <p className="mt-2 text-xs text-secondary">Revision access is checked by the backend for the selected staff profile.</p>
          </> : null}
          <Button type="button" variant="secondary" className="mt-4 w-full" disabled={!policy} onClick={() => onSelect(key)}>View and edit policy</Button>
        </li>;
      })}
    </ul>
  </section>)}
</div>;

const AdminPolicies = () => {
  const { user, activeProfile, token } = useAuth();
  const [panels, setPanels] = useState<PolicyPanels>(makePanels);
  const [selectedKey, setSelectedKey] = useState<AdminPolicyKey | null>(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const requestVersions = useRef<Record<AdminPolicyKey, number>>(makeRequestVersions());
  const loadingMoreRef = useRef<Set<AdminPolicyKey>>(new Set());
  const actionRef = useRef<ActiveAction | null>(null);
  const editorCommitRef = useRef<(() => void) | null>(null);
  const stepUp = useBoundStepUp<AdminPolicyRevision>();
  const currentIdentityId = user?._id ?? null;
  const registerEditorCommit = useCallback((commit: (() => void) | null) => {
    editorCommitRef.current = commit;
  }, []);

  const refreshPolicy = useCallback(async (key: AdminPolicyKey, includeHistory = false) => {
    const requestVersion = ++requestVersions.current[key];
    setPanels((current) => ({ ...current, [key]: {
      ...current[key], loading: true, historyLoading: includeHistory, policyError: null,
      historyError: includeHistory ? null : current[key].historyError, validationErrors: [],
    } }));
    const policyPromise = adminPolicyService.getPolicy(key);
    const historyPromise = includeHistory ? adminPolicyService.getHistory(key, { limit: 25 }) : null;
    const [policyResult, historyResult] = await Promise.all([
      Promise.allSettled([policyPromise]),
      historyPromise ? Promise.allSettled([historyPromise]) : Promise.resolve(null),
    ]);
    if (requestVersions.current[key] !== requestVersion) return;
    const policyOutcome = policyResult[0];
    const historyOutcome = historyResult?.[0];
    setPanels((current) => {
      const next: PolicyPanelState = { ...current[key], loading: false, historyLoading: false };
      if (policyOutcome.status === 'fulfilled') {
        next.policy = policyOutcome.value.policy;
        next.policyError = null;
      } else next.policyError = errorText(policyOutcome.reason);
      if (historyOutcome) {
        if (historyOutcome.status === 'fulfilled') {
          next.revisions = historyOutcome.value.revisions;
          next.nextCursor = historyOutcome.value.nextCursor;
          next.historyError = null;
        } else next.historyError = errorText(historyOutcome.reason);
      }
      return { ...current, [key]: next };
    });
  }, []);

  useEffect(() => {
    const loadingKeys = loadingMoreRef.current;
    const versions = requestVersions.current;
    setPanels(makePanels());
    setSelectedKey(null);
    setDraftDirty(false);
    actionRef.current = null;
    editorCommitRef.current = null;
    for (const key of adminPolicyKeys) void refreshPolicy(key);
    return () => {
      for (const key of adminPolicyKeys) versions[key] += 1;
      loadingKeys.clear();
    };
  }, [activeProfile?.id, refreshPolicy, token]);

  const selectPolicy = (key: AdminPolicyKey) => {
    if (draftDirty && !window.confirm('Discard unsaved policy changes and open another policy?')) return;
    setDraftDirty(false);
    setSelectedKey(key);
    void refreshPolicy(key, true);
  };

  const returnToIndex = () => {
    if (draftDirty && !window.confirm('Discard unsaved policy changes and return to the policy index?')) return;
    setDraftDirty(false);
    setSelectedKey(null);
  };

  const loadMore = async (key: AdminPolicyKey) => {
    const cursor = panels[key].nextCursor;
    if (!cursor || loadingMoreRef.current.has(key)) return;
    const requestVersion = requestVersions.current[key];
    loadingMoreRef.current.add(key);
    setPanels((current) => ({ ...current, [key]: { ...current[key], loadingMore: true, historyError: null } }));
    try {
      const result = await adminPolicyService.getHistory(key, { limit: 25, before: cursor });
      if (requestVersions.current[key] !== requestVersion) return;
      setPanels((current) => {
        const existingIds = new Set(current[key].revisions.map((revision) => revision.id));
        return { ...current, [key]: {
          ...current[key],
          revisions: [...current[key].revisions, ...result.revisions.filter((revision) => !existingIds.has(revision.id))],
          nextCursor: result.nextCursor,
          loadingMore: false,
        } };
      });
    } catch (error) {
      if (requestVersions.current[key] === requestVersion) setPanels((current) => ({ ...current, [key]: { ...current[key], loadingMore: false, historyError: errorText(error) } }));
    } finally {
      loadingMoreRef.current.delete(key);
    }
  };

  const refreshAfterError = async (key: AdminPolicyKey, error: unknown, action: 'prepare' | 'decision') => {
    const code = error instanceof ApiRequestError ? error.code : undefined;
    const status = error instanceof ApiRequestError ? error.status : undefined;
    const validationErrors = validationMessages(error);
    if (code === 'CONFLICT_POLICY_VERSION') {
      await refreshPolicy(key, true);
      setPanels((current) => ({ ...current, [key]: { ...current[key], needsReview: true, notice: 'The approved policy revision changed. The current policy and history were refreshed; review them before preparing again.', validationErrors } }));
      return;
    }
    if (code === 'CONFLICT_POLICY_DECIDED') {
      await refreshPolicy(key, true);
      setPanels((current) => ({ ...current, [key]: { ...current[key], notice: 'This revision was already decided. Refreshed history shows the server-recorded decision.', validationErrors } }));
      return;
    }
    if (status === undefined || status >= 500) {
      await refreshPolicy(key, true);
      setPanels((current) => ({ ...current, [key]: { ...current[key], notice: `The ${action} result could not be confirmed. Policy and history were refreshed; inspect the server state before taking another action.`, validationErrors } }));
    } else {
      setPanels((current) => ({ ...current, [key]: { ...current[key], notice: errorText(error), validationErrors } }));
    }
  };

  const beginPrepare = async (key: AdminPolicyKey, value: AdminPolicyValue, reason: string) => {
    const expectedRevision = panels[key].policy?.revision;
    if (!Number.isInteger(expectedRevision) || expectedRevision === undefined || expectedRevision < 0 || panels[key].needsReview) return;
    const body: PrepareAdminPolicyRevisionInput = { value, reason, expectedRevision };
    const path = `/api/admin/policies/${key}/revisions`;
    actionRef.current = { key, kind: 'prepare' };
    setPanels((current) => ({ ...current, [key]: { ...current[key], notice: null, validationErrors: [] } }));
    const started = await stepUp.begin({
      method: 'POST', path, body, label: `Submit ${getAdminPolicyMetadata(key).label} revision`,
      execute: async (challengeId, exactBody) => {
        try { return await adminPolicyService.prepareRevision(key, exactBody, challengeId); }
        catch (error) { await refreshAfterError(key, error, 'prepare'); throw error; }
      },
    });
    if (!started) {
      actionRef.current = null;
      setPanels((current) => ({ ...current, [key]: { ...current[key], notice: stepUp.getError() ?? 'The policy revision request could not start.' } }));
    }
  };

  const beginDecision = async (key: AdminPolicyKey, revision: AdminPolicyRevision, decision: 'approved' | 'rejected') => {
    if (!currentIdentityId || revision.preparedBy === currentIdentityId) return;
    const path = `/api/admin/policies/${key}/revisions/${encodeURIComponent(revision.id)}/${decision}`;
    actionRef.current = { key, kind: decision };
    setPanels((current) => ({ ...current, [key]: { ...current[key], notice: null } }));
    const started = await stepUp.begin({
      method: 'POST', path, body: {}, label: `${decision === 'approved' ? 'Approve' : 'Reject'} ${getAdminPolicyMetadata(key).label} revision`,
      execute: async (challengeId) => {
        try { return await adminPolicyService.decideRevision(key, revision.id, decision, challengeId); }
        catch (error) { await refreshAfterError(key, error, 'decision'); throw error; }
      },
    });
    if (!started) {
      actionRef.current = null;
      setPanels((current) => ({ ...current, [key]: { ...current[key], notice: stepUp.getError() ?? 'The policy decision request could not start.' } }));
    }
  };

  const completeProtectedAction = async (code: string): Promise<boolean> => {
    const action = actionRef.current;
    if (!action) return false;
    const result = await stepUp.complete(code);
    if (!result.ok) {
      setPanels((current) => ({ ...current, [action.key]: { ...current[action.key], notice: result.error ?? 'Authenticator verification did not complete.' } }));
      return false;
    }
    actionRef.current = null;
    if (action.kind === 'prepare') editorCommitRef.current?.();
    const responseState = result.value.state;
    const message = action.kind === 'prepare'
      ? `Revision ${result.value.id} was submitted. The server reports its state as “${responseState}”.`
      : `Revision ${result.value.id} is ${responseState} according to the server.`;
    setPanels((current) => ({ ...current, [action.key]: { ...current[action.key], notice: message } }));
    await refreshPolicy(action.key, true);
    setPanels((current) => {
      const revisions = current[action.key].revisions;
      const existingIndex = revisions.findIndex((revision) => revision.id === result.value.id);
      const nextRevisions = existingIndex < 0
        ? [result.value, ...revisions]
        : revisions.map((revision) => revision.id === result.value.id ? result.value : revision);
      return { ...current, [action.key]: {
        ...current[action.key], revisions: nextRevisions,
      } };
    });
    return true;
  };

  const cancelProtectedAction = () => {
    actionRef.current = null;
    stepUp.cancel();
  };

  const selectedPanel = selectedKey ? panels[selectedKey] : null;
  const currentDescription = useMemo(() => selectedKey ? getAdminPolicyMetadata(selectedKey).label : 'Policy registry', [selectedKey]);

  return <AdminLayout>
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8" aria-labelledby="admin-policies-heading">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-secondary">Platform administration</p>
        <h1 id="admin-policies-heading" className="mt-1 text-3xl font-black">Policies</h1>
        <p className="mt-2 max-w-3xl text-sm text-secondary">Review current policy values, revision history, and submit protected changes. The backend checks staff authority, selected profile, policy schema, and revision conflicts.</p>
      </header>
      {!selectedKey ? <>
        <p className="text-sm text-secondary">Choose a policy to review its current server state and revision history. There is no policy discovery endpoint; the index contains the supported policy keys registered for this frontend.</p>
        <PolicyIndex panels={panels} onSelect={selectPolicy} onRefresh={(key) => void refreshPolicy(key)} />
      </> : <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="secondary" onClick={returnToIndex}>Back to policy index</Button>
          <Button type="button" variant="secondary" disabled={Boolean(selectedPanel?.loading || selectedPanel?.historyLoading)} onClick={() => void refreshPolicy(selectedKey, true)}>Refresh {currentDescription}</Button>
        </div>
        <PolicyEditor
          key={`${activeProfile?.id ?? 'no-active-profile'}:${selectedKey}`}
          policyKey={selectedKey}
          panel={selectedPanel!}
          currentIdentityId={currentIdentityId}
          protectedBusy={stepUp.busy || Boolean(stepUp.challenge)}
          onPrepare={beginPrepare}
          onDecision={beginDecision}
          onLoadMore={loadMore}
          onRetry={(key) => void refreshPolicy(key, true)}
          onAcknowledgeReview={(key) => setPanels((current) => ({ ...current, [key]: { ...current[key], needsReview: false } }))}
          onDirtyChange={setDraftDirty}
          onRegisterCommit={registerEditorCommit}
        />
      </>}
      <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={cancelProtectedAction} onSubmit={completeProtectedAction} />
    </section>
  </AdminLayout>;
};

export default AdminPolicies;
