import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { titleDocumentService, type TitleDocumentAccessRequest } from '../../services/titleDocumentService';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { useCanonicalFieldDictionary } from '../../hooks/useCanonicalFieldDictionary';
import StepUpDialog from '../auth/StepUpDialog';
import { ApiRequestError } from '../../lib/axios';
import type {
  ManagedTitleDocument,
  TitleDocumentAnalytics,
  TitleDocumentPolicyMode,
  TitleDocumentType,
} from '../../types';
import { canonicalTitleDocumentTypeKey, currentDocumentTypeLabel, currentTitleDocumentTypeOptions, documentTypeLabel, formatDateTime, titleStatusClasses } from '../../utils/titleVerification';
import { buildTitleUploadStepUpBody, digestTitleUpload, validateTitleUploadFile } from '../../utils/titleUploadStepUp';
import Button from '../ui/Button';

interface TitleDocumentManagementProps {
  propertyId: string;
  sold: boolean;
}

const activeStatuses = new Set(['pending', 'under_review', 'approved', 'published']);
const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);

const TitleDocumentManagement = ({ propertyId, sold }: TitleDocumentManagementProps) => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<ManagedTitleDocument[]>([]);
  const [accessRequests, setAccessRequests] = useState<TitleDocumentAccessRequest[]>([]);
  const [accessRequestError, setAccessRequestError] = useState('');
  const [analytics, setAnalytics] = useState<Record<string, TitleDocumentAnalytics>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<TitleDocumentPolicyMode>('private');
  const [uploadOutcomeUnknown, setUploadOutcomeUnknown] = useState(false);
  const uploadStepUp = useBoundStepUp<Awaited<ReturnType<typeof titleDocumentService.upload>>>();
  const policyStepUp = useBoundStepUp<Awaited<ReturnType<typeof titleDocumentService.updatePolicy>>>();
  const accessDecisionStepUp = useBoundStepUp<TitleDocumentAccessRequest>();
  const { dictionary, loading: dictionaryLoading } = useCanonicalFieldDictionary();
  const documentTypeOptions = currentTitleDocumentTypeOptions(dictionary);

  const refresh = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const [documentResult, requestResult] = await Promise.allSettled([
      titleDocumentService.listManaged(propertyId),
      titleDocumentService.listAccessRequests(propertyId, { page: 1, limit: 50 }),
    ]);
    if (documentResult.status === 'fulfilled') setDocuments(documentResult.value);
    else toast.error(documentResult.reason instanceof Error ? documentResult.reason.message : 'Unable to load title-document management.');
    if (requestResult.status === 'fulfilled') { setAccessRequests(requestResult.value.requests); setAccessRequestError(''); }
    else { setAccessRequests([]); setAccessRequestError(requestResult.reason instanceof Error ? requestResult.reason.message : 'Access-request review is unavailable for this profile.'); }
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const unavailableTypes = useMemo(
    () => new Set(documents.filter((document) => activeStatuses.has(document.verificationStatus)).map((document) => canonicalTitleDocumentTypeKey(document.documentType) ?? document.documentType)),
    [documents],
  );

  const submitDocument = async (event: FormEvent) => {
    event.preventDefault();
    if (sold || !file || uploadOutcomeUnknown || uploadStepUp.busy || uploadStepUp.challenge) return;
    if (!documentTypeOptions.some((option) => option.value === documentType)) { toast.error('Choose a current title document type from the backend dictionary.'); return; }
    const fileError = validateTitleUploadFile(file);
    if (fileError) { toast.error(fileError); return; }
    const input = { file, documentType: documentType as TitleDocumentType, title: title.trim(), accessPolicy: { enabled: mode !== 'private', mode } };
    try {
      const digest = await digestTitleUpload(file);
      const body = buildTitleUploadStepUpBody({ documentType, title: input.title, accessPolicy: input.accessPolicy }, digest);
      await uploadStepUp.begin({
        method: 'POST',
        path: `/api/documents/properties/${encodeURIComponent(propertyId)}/title-upload`,
        body,
        label: 'Upload this title document to the selected property vault',
        execute: async (challengeId, exactBody) => {
          setBusyId('upload');
          try {
            const result = await titleDocumentService.upload(propertyId, input, challengeId, exactBody);
            setUploadOutcomeUnknown(false);
            toast.success(result.verificationExisting ? 'Title document uploaded. The existing title review remains active.' : 'Title document uploaded and title review submitted.');
            if (result.riskDetected) toast.warning('Legal review is required before this title document can be verified.');
            setFile(null);
            setShowUpload(false);
            await refresh();
            return result;
          } catch (raw) {
            if (!(raw instanceof ApiRequestError) || !raw.status || raw.status >= 500) setUploadOutcomeUnknown(true);
            throw raw;
          } finally { setBusyId(null); }
        },
      });
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to prepare the protected title upload.');
    }
  };

  const submitUploadStepUp = async (code: string): Promise<boolean> => {
    const result = await uploadStepUp.complete(code);
    if (!result.ok && result.error) toast.error(result.error);
    return result.ok;
  };

  const updatePolicy = async (document: ManagedTitleDocument, nextMode: TitleDocumentPolicyMode, passOverride?: boolean) => {
    if (sold || policyStepUp.busy || policyStepUp.challenge) return;
    if (!Number.isInteger(document.version)) { toast.error('The current document version was not returned. Refresh the vault before changing access.'); return; }
    setBusyId(document.id);
    const isPaid = nextMode === 'paid_view_once' || nextMode === 'paid_view_multiple';
    const body = { expectedVersion: document.version!, accessPolicy: { enabled: nextMode !== 'private', mode: nextMode, ...(isPaid ? { buyerPassEnabled: passOverride ?? document.accessPolicy.buyerPassEnabled ?? false } : {}) } };
    const started = await policyStepUp.begin({ method: 'PATCH', path: `/api/title-documents/${encodeURIComponent(document.id)}/access-policy`, body, label: 'Change title-document access policy', execute: (challengeId, exactBody) => titleDocumentService.updatePolicy(document.id, exactBody, challengeId) });
    if (!started) { setBusyId(null); toast.error(policyStepUp.error ?? 'Authenticator confirmation could not start.'); }
  };

  const completePolicyStepUp = async (code: string): Promise<boolean> => {
    const result = await policyStepUp.complete(code);
    if (!result.ok) { toast.error(result.error ?? 'Access policy was not changed.'); return false; }
    setBusyId(null);
    toast.success('Access policy updated. The server still controls price and every access decision.');
    await refresh();
    return true;
  };

  const decideAccessRequest = async (request: TitleDocumentAccessRequest, decision: 'approve' | 'decline' | 'revoke') => {
    if (busyId || accessDecisionStepUp.busy || accessDecisionStepUp.challenge || !Number.isInteger(request.version)) return;
    setBusyId(`request-${request.id}`);
    const body = { requestId: request.id, decision, expectedVersion: request.version };
    const started = await accessDecisionStepUp.begin({
      method: 'POST', path: `/api/documents/${encodeURIComponent(request.documentId)}/grant`, body,
      label: `${decision === 'approve' ? 'Approve' : decision === 'decline' ? 'Decline' : 'Revoke'} document access request`,
      execute: (challengeId, exactBody) => titleDocumentService.decideAccessRequest(request.documentId, exactBody, challengeId),
    });
    if (!started) { setBusyId(null); toast.error(accessDecisionStepUp.error ?? 'Authenticator confirmation could not start.'); }
  };

  const completeAccessDecision = async (code: string): Promise<boolean> => {
    const result = await accessDecisionStepUp.complete(code);
    if (!result.ok) { toast.error(result.error ?? 'The access request was not changed.'); return false; }
    setBusyId(null);
    toast.success(`Document access request ${result.value.state}.`);
    await refresh();
    return true;
  };

  const loadAnalytics = async (documentId: string) => {
    setBusyId(documentId);
    try {
      const result = await titleDocumentService.analytics(documentId);
      setAnalytics((current) => ({ ...current, [documentId]: result }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load document analytics.');
    } finally {
      setBusyId(null);
    }
  };

  const openPrivilegedViewer = async (document: ManagedTitleDocument) => {
    if (busyId) return;
    setBusyId(document.id);
    try {
      const session = await titleDocumentService.openViewer(document.id);
      navigate('/protected-title-viewer', { state: { session, documentId: document.id, propertyId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'A protected privileged session is unavailable.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mt-10 rounded-2xl border border-outline-variant/20 bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold">Private title-document vault</h2>
          <p className="mt-1 text-sm text-secondary">Each document is a separate private record with independent verification, policy, history, and analytics.</p>
        </div>
      <Button type="button" disabled={sold || busyId === 'upload' || uploadStepUp.busy} onClick={() => setShowUpload((current) => !current)}>
          Upload a missing type
        </Button>
      </div>
      {sold ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This property has been sold. Upload, resubmission, and seller policy changes are unavailable; existing history and permitted protected viewing remain available.</p> : null}
      {!sold ? <p className="mt-4 text-sm text-secondary">New title documents are uploaded to the private property vault after a one-use authenticator check bound to the selected file and metadata.</p> : null}

      <div className="mt-6 rounded-xl border border-outline-variant/20 p-4">
        <h3 className="font-bold">On-request access reviews</h3>
        <p className="mt-1 text-xs text-secondary">Review current requests for this property. The server rechecks buyer eligibility, publication and document version for every decision.</p>
        {accessRequestError ? <p role="status" className="mt-3 text-xs text-secondary">Access-request review is unavailable for this profile: {accessRequestError}</p> : null}
        {!accessRequestError && accessRequests.length === 0 ? <p className="mt-3 text-sm text-secondary">There are no access requests on this page.</p> : null}
        <div className="mt-3 space-y-3">{accessRequests.map((request) => {
          const requestDocument = documents.find((document) => document.id === request.documentId);
          return <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3">
            <div><p className="text-sm font-semibold">{requestDocument?.title ?? 'Title document'}</p><p className="text-xs text-secondary">Requested {formatDateTime(request.requestedAt)} · {request.state.replaceAll('_', ' ')}</p></div>
            <div className="flex flex-wrap gap-2">{request.state === 'pending' ? <><Button type="button" disabled={sold || busyId !== null || accessDecisionStepUp.busy} onClick={() => void decideAccessRequest(request, 'approve')}>Approve</Button><Button type="button" variant="secondary" disabled={busyId !== null || accessDecisionStepUp.busy} onClick={() => void decideAccessRequest(request, 'decline')}>Decline</Button></> : null}{request.state === 'approved' ? <Button type="button" variant="secondary" disabled={busyId !== null || accessDecisionStepUp.busy} onClick={() => void decideAccessRequest(request, 'revoke')}>Revoke access</Button> : null}</div>
          </div>;
        })}</div>
      </div>

      {showUpload && !sold ? (
        <form onSubmit={(event) => void submitDocument(event)} className="mt-5 grid gap-4 rounded-xl bg-surface-container-low p-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-secondary">Document type</label>
            <select
              value={documentType}
                disabled={dictionaryLoading || !documentTypeOptions.length || busyId === 'upload' || uploadStepUp.busy || Boolean(uploadStepUp.challenge)}
              onChange={(event) => {
                const next = event.target.value;
                setDocumentType(next);
                setTitle(currentDocumentTypeLabel(dictionary, next));
              }}
              className="mt-2 w-full rounded-lg bg-white px-4 py-3 text-sm"
            >
              <option value="">Choose a document type</option>
              {documentTypeOptions.map((option) => (
                <option key={option.value} value={option.value} disabled={unavailableTypes.has(option.value as TitleDocumentType)}>
                  {option.label}{unavailableTypes.has(option.value as TitleDocumentType) ? ' — active submission exists' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-secondary">Title</label>
            <input value={title} disabled={busyId === 'upload' || uploadStepUp.busy || Boolean(uploadStepUp.challenge)} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-lg bg-white px-4 py-3 text-sm" />
          </div>
          <div>
            <label htmlFor="title-document-file" className="text-xs font-bold uppercase tracking-widest text-secondary">Restricted file</label>
            <input id="title-document-file" type="file" accept=".pdf,image/jpeg,image/png,image/webp" disabled={busyId === 'upload' || uploadStepUp.busy || Boolean(uploadStepUp.challenge)} onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 w-full rounded-lg bg-white px-4 py-3 text-sm" />
            {file ? <p role="status" className="mt-2 text-xs text-secondary">Selected file retained: {file.name} · {Math.ceil(file.size / 1024)} KB</p> : null}
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-secondary">Access policy</label>
            <select value={mode} disabled={busyId === 'upload' || uploadStepUp.busy || Boolean(uploadStepUp.challenge)} onChange={(event) => setMode(event.target.value as TitleDocumentPolicyMode)} className="mt-2 w-full rounded-lg bg-white px-4 py-3 text-sm">
              <option value="private">Private</option>
              <option value="paid_view_once">Paid — one view</option>
              <option value="paid_view_multiple">Paid — multiple views</option>
              <option value="on_request">On request</option>
            </select>
            {mode !== 'private' ? <p className="mt-2 text-xs text-secondary">The server controls the current viewing price and policy.</p> : null}
          </div>
          <div className="md:col-span-2">
            <div>
              <Button type="submit" loading={uploadStepUp.busy} loadingLabel="Preparing secure upload…" disabled={sold || busyId === 'upload' || uploadStepUp.busy || Boolean(uploadStepUp.challenge) || !file || uploadOutcomeUnknown}>Submit new vault record</Button>
              {uploadOutcomeUnknown ? <div role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><p>The upload response was not confirmed. The file was not resubmitted. Refresh the vault to inspect the current records first.</p><Button type="button" variant="secondary" className="mt-2" onClick={() => void refresh().then(() => setUploadOutcomeUnknown(false))}>Refresh vault and review before a new attempt</Button></div> : null}
              {uploadStepUp.error && !uploadStepUp.challenge ? <p role="alert" className="mt-2 text-xs text-error">{uploadStepUp.error}</p> : null}
            </div>
          </div>
        </form>
      ) : null}

      {loading ? <p className="mt-6 text-sm text-secondary">Loading vault records…</p> : null}
      {!loading && documents.length === 0 ? <p className="mt-6 rounded-lg border border-dashed p-5 text-sm text-secondary">No title documents have been submitted.</p> : null}
      <div className="mt-6 grid gap-4">
        {documents.map((document) => {
          const stats = analytics[document.id];
          const rejected = document.verificationStatus === 'rejected';
          return (
            <article key={document.id} className="rounded-xl border border-outline-variant/20 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary">{documentTypeLabel(document.documentType)}</p>
                  <h3 className="mt-1 font-bold">{document.title}</h3>
                  <p className="mt-1 text-xs text-secondary">
                    {document.publicReference || 'Reference pending'} • Submission version {document.submissionVersion} • {formatDateTime(document.submittedAt)}
                  </p>
                  {document.previousDocument ? <p className="mt-1 text-xs text-secondary">Prior version reference: {document.previousDocument}</p> : null}
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${titleStatusClasses(document.verificationStatus)}`}>
                  {document.verificationStatus.replace('_', ' ')}
                </span>
              </div>
              {document.rejectionReason ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">Rejection reason: {document.rejectionReason}</p> : null}
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div><p className="text-xs text-secondary">Policy</p><p className="text-sm font-bold">{document.accessPolicy.mode.replaceAll('_', ' ')}</p></div>
                <div><p className="text-xs text-secondary">Fixed price</p><p className="text-sm font-bold">{formatNaira(document.accessPolicy.price)}</p></div>
                <div><p className="text-xs text-secondary">Payments</p><p className="text-sm font-bold">{stats?.successfulPayments ?? 'Load analytics'}</p></div>
                <div><p className="text-xs text-secondary">Viewer sessions</p><p className="text-sm font-bold">{stats?.totalViews ?? 'Load analytics'}</p></div>
              </div>
              {stats ? <p className="mt-3 text-xs text-secondary">Unique viewers: {stats.uniqueViewers} • Consumed one-time access: {stats.consumedViewOnce} • Revenue: {formatNaira(stats.revenue)}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
                <select
                  aria-label={`Access policy for ${document.title}`}
                  value={document.accessPolicy.mode}
                  disabled={sold || busyId === document.id}
                  onChange={(event) => void updatePolicy(document, event.target.value as TitleDocumentPolicyMode)}
                  className="rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold capitalize disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="private">Private</option>
                  <option value="paid_view_once">Paid — one view</option>
                  <option value="paid_view_multiple">Paid — multiple views</option>
                  <option value="on_request">On request</option>
                </select>
                {document.accessPolicy.mode === 'paid_view_once' || document.accessPolicy.mode === 'paid_view_multiple' ? <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={document.accessPolicy.buyerPassEnabled ?? false} disabled={sold || busyId === document.id} onChange={(event) => void updatePolicy(document, document.accessPolicy.mode, event.target.checked)} /><span>Allow Buyer Pass</span></label> : null}
                <Button type="button" variant="secondary" loading={busyId === document.id} loadingLabel="Loading analytics..." onClick={() => void loadAnalytics(document.id)}>Inspect analytics</Button>
                <Button type="button" variant="secondary" loading={busyId === document.id} loadingLabel="Opening..." disabled={document.verificationStatus === 'revoked'} onClick={() => void openPrivilegedViewer(document)}>Open protected viewer</Button>
                {document.publicVerificationId ? <Link className="text-xs font-bold text-primary underline" to={`/title-verification/${document.publicVerificationId}`}>Registry record</Link> : null}
                {rejected && !sold ? (
                  <button
                    type="button"
                    className="text-xs font-bold text-primary underline"
                    onClick={() => {
                      setDocumentType(canonicalTitleDocumentTypeKey(document.documentType) ?? '');
                      setTitle(document.title);
                      setShowUpload(true);
                    }}
                  >
                    Submit a new version
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      <StepUpDialog challenge={uploadStepUp.challenge} busy={uploadStepUp.busy || busyId === 'upload'} error={uploadStepUp.error} onCancel={uploadStepUp.cancel} onSubmit={submitUploadStepUp} />
      <StepUpDialog challenge={policyStepUp.challenge} busy={policyStepUp.busy} error={policyStepUp.error} onCancel={() => { policyStepUp.cancel(); setBusyId(null); }} onSubmit={completePolicyStepUp} />
      <StepUpDialog challenge={accessDecisionStepUp.challenge} busy={accessDecisionStepUp.busy} error={accessDecisionStepUp.error} onCancel={() => { accessDecisionStepUp.cancel(); setBusyId(null); }} onSubmit={completeAccessDecision} />
    </section>
  );
};

export default TitleDocumentManagement;
