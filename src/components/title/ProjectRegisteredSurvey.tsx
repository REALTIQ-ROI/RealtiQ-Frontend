import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { documentService, sha256FileHex, type ProjectDocumentAccessRequest, type ProjectSurveyAccessStatus, type ProjectSurveyDocument, type ProjectSurveyUploadResult, type ProjectSurveyViewerSession } from '../../services/documentService';
import StepUpDialog from '../auth/StepUpDialog';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ErrorState from '../ui/ErrorState';
import LoadingState from '../ui/LoadingState';

interface ProjectRegisteredSurveyProps {
  projectId: string;
  sellerMode?: boolean;
  projectVersion?: number;
  onProjectChanged?: () => void | Promise<void>;
}

type StepUpResult = { kind: 'decision'; request: ProjectDocumentAccessRequest } | { kind: 'upload'; result: ProjectSurveyUploadResult };
const documentId = (document: ProjectSurveyDocument) => document.id ?? document._id ?? '';
const formatStatus = (value?: string) => (value ?? 'not available').replaceAll('_', ' ');
const MAX_SURVEY_BYTES = 50 * 1024 * 1024;

const ProjectRegisteredSurvey = ({ projectId, sellerMode = false, projectVersion, onProjectChanged }: ProjectRegisteredSurveyProps) => {
  const { activeProfile } = useAuth();
  const profileId = activeProfile?.id ?? '';
  const permissions = Array.isArray(activeProfile?.permissions) ? activeProfile.permissions : [];
  const canReview = sellerMode && permissions.includes('document.request.approve');
  const canUpload = sellerMode && permissions.includes('document.issue') && permissions.includes('project.edit');
  const isBuyer = activeProfile?.kind === 'buyer';
  const [documents, setDocuments] = useState<ProjectSurveyDocument[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ProjectSurveyAccessStatus>>({});
  const [requests, setRequests] = useState<ProjectDocumentAccessRequest[]>([]);
  const [loading, setLoading] = useState(Boolean(profileId));
  const [error, setError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [viewer, setViewer] = useState<{ url: string; type: string; title: string; session: ProjectSurveyViewerSession } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [accessMode, setAccessMode] = useState<'private' | 'on_request'>('private');
  const [uploadError, setUploadError] = useState('');
  const [requestExpiry, setRequestExpiry] = useState('');
  const generation = useRef(0);
  const stepUp = useBoundStepUp<StepUpResult>();

  const load = useCallback(async () => {
    if (!profileId || !projectId) { setDocuments([]); setStatuses({}); setRequests([]); setLoading(false); return; }
    const currentGeneration = ++generation.current;
    setLoading(true); setError(''); setRequestError('');
    const [listResult, requestResult] = await Promise.allSettled([
      (async () => {
        const first = await documentService.listProjectRegisteredSurveys(projectId, { page: 1, limit: 50 });
        const documents = [...first.documents];
        for (let page = 2; page <= (first.pagination?.pages ?? 1); page += 1) {
          const next = await documentService.listProjectRegisteredSurveys(projectId, { page, limit: 50 });
          documents.push(...next.documents);
        }
        return documents;
      })(),
      canReview ? (async () => {
        const first = await documentService.listProjectSurveyAccessRequests(projectId, { page: 1, limit: 50 });
        const requests = [...first.requests];
        for (let page = 2; page <= first.pagination.pages; page += 1) {
          const next = await documentService.listProjectSurveyAccessRequests(projectId, { page, limit: 50 });
          requests.push(...next.requests);
        }
        return requests;
      })() : Promise.resolve(null),
    ]);
    if (currentGeneration !== generation.current) return;
    if (listResult.status === 'fulfilled') {
      const nextDocuments = listResult.value;
      setDocuments(nextDocuments);
      const statusResults = await Promise.allSettled(nextDocuments.map(async (document) => {
        const id = documentId(document);
        return id ? [id, await documentService.projectSurveyAccessStatus(id)] as const : null;
      }));
      if (currentGeneration === generation.current) setStatuses(Object.fromEntries(statusResults.flatMap((result) => result.status === 'fulfilled' && result.value ? [[result.value[0], result.value[1]]] : [])));
    } else { setDocuments([]); setStatuses({}); setError(listResult.reason instanceof Error ? listResult.reason.message : 'Registered survey information could not be loaded.'); }
    if (canReview) {
      if (requestResult.status === 'fulfilled' && requestResult.value) setRequests(requestResult.value);
      else if (requestResult.status === 'rejected') { setRequests([]); setRequestError(requestResult.reason instanceof Error ? requestResult.reason.message : 'Survey access requests could not be loaded.'); }
      else setRequests([]);
    } else setRequests([]);
    if (currentGeneration === generation.current) setLoading(false);
  }, [canReview, profileId, projectId]);

  useEffect(() => {
    setDocuments([]); setStatuses({}); setRequests([]); setUploadFile(null); setUploadError(''); setRequestError(''); setBusyId(''); setAccessMode('private'); setViewer(null);
    void load();
    return () => { generation.current += 1; };
  }, [load, profileId]);

  useEffect(() => {
    if (!viewer) return;
    const expiresAt = Date.parse(viewer.session.expiresAt);
    const timeout = window.setTimeout(() => {
      setViewer((current) => current?.url === viewer.url ? null : current);
      toast.info('This protected survey viewing session has expired. Request access again if you still need to view it.');
    }, Math.max(0, (Number.isFinite(expiresAt) ? expiresAt : Date.now()) - Date.now()));
    return () => {
      window.clearTimeout(timeout);
      URL.revokeObjectURL(viewer.url);
    };
  }, [viewer]);

  const requestAccess = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try { const request = await documentService.requestProjectSurveyAccess(id); toast.success(`Survey access request ${formatStatus(request.state)}.`); await load(); }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Survey access could not be requested.'); await load(); }
    finally { setBusyId(''); }
  };

  const decide = async (request: ProjectDocumentAccessRequest, decision: 'approve' | 'decline' | 'revoke') => {
    if (!Number.isInteger(request.version) || busyId || stepUp.busy || stepUp.challenge) return;
    const expiryIso = decision === 'approve' && requestExpiry ? new Date(requestExpiry).toISOString() : undefined;
    const body = { requestId: request.id, decision, expectedVersion: request.version, ...(decision === 'approve' ? { downloadsAllowed: false, ...(expiryIso ? { expiresAt: expiryIso } : {}) } : {}) };
    const path = `/api/documents/${encodeURIComponent(request.documentId)}/grant`;
    setBusyId(request.id);
    const started = await stepUp.begin({ method: 'POST', path, body, label: `${decision === 'approve' ? 'Approve' : decision === 'decline' ? 'Decline' : 'Revoke'} registered-survey access`, execute: async (challengeId, exactBody) => ({ kind: 'decision', request: await documentService.decideProjectSurveyAccess(request.documentId, exactBody, challengeId) }) });
    if (!started) { setBusyId(''); toast.error(stepUp.error ?? 'Authenticator confirmation could not start.'); }
  };

  const completeDecision = async (code: string): Promise<boolean> => {
    const result = await stepUp.complete(code);
    if (!result.ok) {
      setBusyId('');
      if (result.code === 'CONFLICT_PROJECT_VERSION' || result.code === 'CONFLICT_PROJECT_STATE') {
        await onProjectChanged?.(); await load();
        setUploadError('The project changed. Its current version and survey list were refreshed; review them and start a new authenticator confirmation.');
      } else if (result.code === 'DOCUMENT_SIZE_INVALID') setUploadError('This file exceeds the active survey upload limit of 50 MiB.');
      else if (result.code === 'DOCUMENT_CONTENT_INVALID') setUploadError('The file content or format was rejected. Choose a PDF, JPEG, PNG or WebP survey file.');
      else if (result.code === 'INPUT_DOCUMENT_REQUIRED' || result.code === 'INPUT_DOCUMENT_MULTIPART_INVALID' || result.code === 'INPUT_DOCUMENT_FIELDS_INVALID') setUploadError('The survey upload could not be parsed. Select one supported file and try again.');
      else if (result.code?.startsWith('FEATURE_') || result.code?.startsWith('DOCUMENT_PRIVATE_')) setUploadError('Private survey storage is unavailable right now. Contact support before trying again.');
      toast.error(result.error ?? 'The protected survey action was not confirmed.');
      if (result.code?.startsWith('CONFLICT_')) await load();
      return false;
    }
    setBusyId('');
    if (result.value.kind === 'decision') toast.success(`Survey access request ${formatStatus(result.value.request.state)}.`);
    else {
      setUploadError(''); setUploadFile(null); setAccessMode('private');
      toast.success(`Survey upload accepted as version ${result.value.result.document.submissionVersion ?? 'returned by the server'}. It still needs the applicable review and publication steps.`);
      await onProjectChanged?.();
    }
    await load(); return true;
  };

  const uploadSurvey = async () => {
    if (!canUpload || !uploadFile || busyId || stepUp.busy || stepUp.challenge) return;
    if (uploadFile.size > MAX_SURVEY_BYTES) { setUploadError('Choose a file no larger than 50 MiB.'); return; }
    if (uploadFile.type && !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(uploadFile.type)) { setUploadError('Choose a PDF, JPEG, PNG or WebP file.'); return; }
    setBusyId('survey-upload'); setUploadError('');
    try {
      const digest = await sha256FileHex(uploadFile);
      const accessPolicy = JSON.stringify(accessMode === 'private' ? { mode: 'private', enabled: false } : { mode: 'on_request', enabled: true });
      const fields = { ...(Number.isInteger(projectVersion) ? { expectedProjectVersion: String(projectVersion) } : {}), accessPolicy, __stepUpFileSha256: digest };
      const body = { ...fields };
      const path = `/api/documents/projects/${encodeURIComponent(projectId)}/registered-survey`;
      const started = await stepUp.begin({ method: 'POST', path, body, label: 'Upload the registered survey with authenticator', execute: async (challengeId) => ({ kind: 'upload', result: await documentService.uploadProjectRegisteredSurvey(projectId, uploadFile, fields, challengeId) }) });
      if (!started) { setBusyId(''); setUploadError(stepUp.error ?? 'Authenticator confirmation could not start.'); }
    } catch (raw) { setBusyId(''); setUploadError(raw instanceof Error ? raw.message : 'The survey file could not be prepared.'); }
  };

  const openSurvey = async (document: ProjectSurveyDocument) => {
    const id = documentId(document);
    if (!id || busyId) return;
    setBusyId(id);
    try {
      const status = await documentService.projectSurveyAccessStatus(id);
      setStatuses((current) => ({ ...current, [id]: status }));
      if (!status.hasAccess || !status.documentVersion?.current) throw new Error('The server has not confirmed access to the current survey version.');
      const detail = await documentService.getDocument(id);
      const session = await documentService.openProjectSurveyViewer(id);
      const expected = status.documentVersion;
      if (!expected || session.documentVersion !== expected.submissionVersion || (detail.document.isCurrentVersion === false) || (detail.document.versionId && detail.document.versionId !== expected.versionId)) throw new Error('The protected survey version changed. Refresh access status before opening it.');
      const content = await documentService.getAuthorizedViewerContent(session.contentUrl);
      if (content.documentVersionId !== expected.versionId || content.submissionVersion !== expected.submissionVersion || content.contentSha256 !== expected.contentHash.toLowerCase()) throw new Error('The protected survey version changed. Refresh access status before opening it.');
      setViewer({ url: URL.createObjectURL(content.blob), type: content.contentType, title: document.title ?? 'Registered survey', session });
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'The registered survey cannot be opened through its protected viewer.'); }
    finally { setBusyId(''); }
  };

  return <section className="space-y-4" aria-labelledby="registered-survey-heading">
    <div><h2 id="registered-survey-heading" className="text-2xl font-black">Registered survey</h2><p className="mt-1 text-sm text-secondary">Protected survey access is checked for the selected profile each time.</p></div>
    {!profileId ? <p role="status" className="rounded-lg bg-surface-container-low p-4 text-sm text-secondary">Select a profile to check registered-survey access.</p> : null}
    {canUpload ? <div className="space-y-3 rounded-xl border p-4"><div><h3 className="font-bold">Upload or replace registered survey</h3><p className="mt-1 text-sm text-secondary">The server validates and stores the file. Upload does not verify title or publish the project.</p></div><label className="block text-sm font-semibold">Survey file (PDF, JPEG, PNG or WebP; up to 50 MiB)<input className="mt-1 block w-full rounded-lg border px-3 py-2" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => { setUploadFile(event.target.files?.[0] ?? null); setUploadError(''); }} /></label><label className="block text-sm font-semibold">Buyer access<select className="mt-1 block w-full rounded-lg border px-3 py-2" value={accessMode} onChange={(event) => setAccessMode(event.target.value as 'private' | 'on_request')}><option value="private">Private</option><option value="on_request">Available by request</option></select></label>{uploadFile ? <p className="text-xs text-secondary">Selected: {uploadFile.name} · {Math.ceil(uploadFile.size / 1024)} KiB</p> : null}{uploadError ? <p role="alert" className="text-sm text-error">{uploadError}</p> : null}<Button type="button" disabled={!uploadFile || Boolean(busyId) || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void uploadSurvey()}>{busyId === 'survey-upload' ? 'Preparing authenticator confirmation…' : 'Upload with authenticator'}</Button></div> : sellerMode ? <p role="status" className="rounded-lg bg-surface-container-low p-4 text-sm text-secondary">Survey upload is available to profiles with the current document-issue and project-edit permissions.</p> : null}
    {loading ? <LoadingState label="Loading registered-survey access…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : documents.length ? <div className="space-y-3">{documents.map((document, index) => {
      const id = documentId(document);
      const status = statuses[id];
      return <Card key={id || `survey-${index}`} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{document.title || 'Registered survey'}</h3><p className="mt-1 text-xs text-secondary">{formatStatus(document.accessMode ?? document.accessPolicy?.mode ?? status?.mode)} · {formatStatus(document.submissionState ?? status?.requestState)}{document.submissionVersion ? ` · Version ${document.submissionVersion}` : ''}</p>{document.publicReference ? <p className="text-xs text-secondary">Reference {document.publicReference}</p> : null}{document.previousDocumentId ? <p className="text-xs text-secondary">Replaces prior survey{document.replacementReference ? ` (${document.replacementReference})` : ''}.</p> : null}</div>{status?.hasAccess && status.documentVersion?.current ? <Button type="button" disabled={busyId === id} onClick={() => void openSurvey(document)}>{busyId === id ? 'Opening…' : 'Open protected survey'}</Button> : status?.canRequest && isBuyer ? <Button type="button" variant="secondary" disabled={busyId === id} onClick={() => void requestAccess(id)}>{busyId === id ? 'Requesting…' : 'Request access'}</Button> : null}</div>{status?.requestState && status.requestState !== 'none' ? <p role="status" className="mt-2 text-sm text-secondary">Your request: {formatStatus(status.requestState)}.</p> : null}{status?.grant ? <p className="mt-2 text-xs text-secondary">Your access grant: {formatStatus(status.grant.state)}{status.grant.expiresAt ? ` · Expires ${new Date(status.grant.expiresAt).toLocaleDateString()}` : ''}.</p> : null}{status?.canRequest && !isBuyer ? <p className="mt-2 text-xs text-secondary">Select an eligible Buyer profile to request access.</p> : null}{status?.paymentRequired ? <p role="status" className="mt-2 text-xs text-secondary">The server reports that payment is required for this survey. No payment is started from this access request.</p> : null}</Card>;
    })}</div> : profileId ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No eligible registered-survey record is available for this profile.</p> : null}
    {canReview ? <div className="space-y-3 rounded-xl border p-4"><div><h3 className="font-bold">Survey access requests</h3><p className="mt-1 text-xs text-secondary">Approve, decline or revoke only the server-returned request versions. Approved downloads remain disabled.</p></div>{requestError ? <p role="alert" className="text-sm text-error">{requestError}</p> : null}{requests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3"><div><p className="font-semibold">{documents.find((document) => documentId(document) === request.documentId)?.title ?? 'Registered survey'}</p><p className="text-xs text-secondary">{formatStatus(request.state)} · Requested {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.requestedAt))} · Version {request.version}</p></div><div className="flex gap-2">{request.state === 'pending' ? <><Button type="button" disabled={Boolean(busyId)} onClick={() => void decide(request, 'approve')}>Approve</Button><Button type="button" variant="secondary" disabled={Boolean(busyId)} onClick={() => void decide(request, 'decline')}>Decline</Button></> : request.state === 'approved' ? <Button type="button" variant="secondary" disabled={Boolean(busyId)} onClick={() => void decide(request, 'revoke')}>Revoke</Button> : null}</div></div>)}{requests.some((request) => request.state === 'pending') ? <label className="block text-sm">Optional access expiry<input type="datetime-local" className="mt-1 block w-full rounded border px-2 py-2" value={requestExpiry} onChange={(event) => setRequestExpiry(event.target.value)} /></label> : null}{requests.length === 0 && !requestError ? <p className="text-sm text-secondary">No survey access requests were returned.</p> : null}<Button type="button" variant="secondary" disabled={loading || Boolean(busyId)} onClick={() => void load()}>Refresh requests</Button></div> : null}
    {viewer ? <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label="Protected registered survey viewer"><div className="flex max-h-full w-full max-w-6xl flex-col rounded-xl bg-white p-3"><div className="flex items-center justify-between gap-3"><h3 className="font-bold">{viewer.title}</h3><Button type="button" variant="secondary" onClick={() => setViewer(null)}>Close protected survey</Button></div><div className="mt-3 min-h-0 flex-1 overflow-auto bg-slate-900 p-2">{viewer.type === 'application/pdf' ? <iframe title="Protected registered survey PDF" src={`${viewer.url}#toolbar=0&navpanes=0`} className="h-[78vh] w-full bg-white" /> : <img alt={viewer.title} src={viewer.url} className="mx-auto max-h-[78vh] max-w-full object-contain" />}</div></div></div> : null}
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={() => { stepUp.cancel(); setBusyId(''); }} onSubmit={completeDecision} />
  </section>;
};

export default ProjectRegisteredSurvey;
