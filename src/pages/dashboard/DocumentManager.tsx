import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import BuyerPortalLayout from '../../components/layout/BuyerPortalLayout';
import LandlordPortalLayout from '../../components/layout/LandlordPortalLayout';
import StepUpDialog from '../../components/auth/StepUpDialog';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../lib/axios';
import { documentManagerService, type DocumentManagerReadiness, type DocumentTemplateDto, type ManagedDocumentDto } from '../../services/documentManagerService';

type Section = 'documents' | 'templates';
type ProtectedAction = 'approve' | 'issue' | 'sign' | 'archive';
const label = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const placeholders = (body: string) => [...new Set(Array.from(body.matchAll(/\{\{\s*([a-zA-Z][\w.-]*)\s*\}\}/g), (match) => match[1]))];

const DocumentManager = () => {
  const { user, activeProfile, profiles } = useAuth();
  const profileId = activeProfile?.id ?? '';
  const accountId = user?._id ?? '';
  const permissions = Array.isArray(activeProfile?.permissions) ? activeProfile.permissions : [];
  const canReadDocuments = permissions.includes('document.read');
  const canIssueDocuments = permissions.includes('document.issue');
  const profileIdRef = useRef(profileId);
  profileIdRef.current = profileId;
  const loadGeneration = useRef(0);
  const stepUp = useBoundStepUp<ManagedDocumentDto>();
  const cancelStepUpRef = useRef(stepUp.cancel);
  cancelStepUpRef.current = stepUp.cancel;
  const [section, setSection] = useState<Section>('documents');
  const [documents, setDocuments] = useState<ManagedDocumentDto[]>([]);
  const [readiness, setReadiness] = useState<DocumentManagerReadiness | null>(null);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplateDto[]>([]);
  const [documentsCursor, setDocumentsCursor] = useState<string | null>(null);
  const [templatesCursor, setTemplatesCursor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<ManagedDocumentDto | null>(null);
  const [history, setHistory] = useState<Array<{ action: string; actorProfileId: string; at: string; version: number }>>([]);
  const [historyViews, setHistoryViews] = useState<Array<{ profileId: string; action: string; viewedAt: string }>>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createType, setCreateType] = useState('');
  const [createBody, setCreateBody] = useState('');
  const [previousDocumentId, setPreviousDocumentId] = useState<string | null>(null);
  const [mergeValues, setMergeValues] = useState<Record<string, string>>({});
  const [recipientProfileIds, setRecipientProfileIds] = useState<string[]>([]);
  const [wetInk, setWetInk] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState('');
  const [editBody, setEditBody] = useState('');
  const [signName, setSignName] = useState('');
  const [protectedAction, setProtectedAction] = useState<ProtectedAction | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const selectedTemplate = templates.find((item) => item.id === templateId) ?? null;
  const requiredMergeKeys = useMemo(() => placeholders(selectedTemplate?.body ?? ''), [selectedTemplate]);
  const selectedIsIssuer = Boolean(selectedDocument && canIssueDocuments && selectedDocument.issuerProfileId === profileId);
  const selectedIsRecipient = Boolean(selectedDocument && selectedDocument.recipientProfileIds.includes(profileId));
  const myResponse = selectedDocument?.myResponse?.profileId === profileId ? selectedDocument.myResponse : null;
  const selectedCanApprove = Boolean(selectedDocument && canIssueDocuments && selectedDocument.state === 'approval_pending' &&
    selectedDocument.issuerProfileId !== profileId && !(accountId && selectedDocument.issuerIdentityId === accountId));

  const clearPrivateState = useCallback(() => {
    setDocuments([]); setTemplates([]); setDocumentsCursor(null); setTemplatesCursor(null); setSelectedId(''); setSelectedDocument(null); setHistory([]); setHistoryViews([]); setHistoryCursor(null);
    setReadiness(null); setReadinessError(null);
    setDocumentError(null); setTemplateError(null); setDetailError(null);
    setProtectedAction(null); setMergeValues({}); setRecipientProfileIds([]); setSignName(''); setBusy(false);
    setTemplateId(''); setCreateTitle(''); setCreateType(''); setCreateBody(''); setPreviousDocumentId(null); setWetInk(false);
    setPdfUrl((current) => { if (current) URL.revokeObjectURL(current); return null; });
  }, []);

  const load = useCallback(async () => {
    if (!profileId) { clearPrivateState(); setLoading(false); return; }
    const currentProfileId = profileId;
    const generation = ++loadGeneration.current;
    setLoading(true); setDocumentError(null); setTemplateError(null);
    if (!canReadDocuments && !canIssueDocuments) {
      clearPrivateState(); setDocumentError('The selected profile does not have document read or issue access.'); setLoading(false); return;
    }
    const [documentResult, templateResult, readinessResult] = await Promise.allSettled([
      canReadDocuments ? documentManagerService.listDocuments({ limit: 25 }) : Promise.resolve({ items: [], nextCursor: null }),
      canIssueDocuments ? documentManagerService.listTemplates({ state: 'active', limit: 25 }) : Promise.resolve({ items: [], nextCursor: null }),
      canIssueDocuments ? documentManagerService.getReadiness() : Promise.resolve(null),
    ]);
    if (generation !== loadGeneration.current || profileIdRef.current !== currentProfileId) return;
    if (documentResult.status === 'fulfilled') { setDocuments(documentResult.value.items); setDocumentsCursor(documentResult.value.nextCursor); }
    else setDocumentError(documentResult.reason instanceof Error ? documentResult.reason.message : 'Documents could not be loaded for this profile.');
    if (templateResult.status === 'fulfilled') { setTemplates(templateResult.value.items); setTemplatesCursor(templateResult.value.nextCursor); }
    else setTemplateError(templateResult.reason instanceof Error ? templateResult.reason.message : 'Templates are unavailable for this profile.');
    if (readinessResult.status === 'fulfilled') { setReadiness(readinessResult.value); setReadinessError(null); }
    else { const requestId = readinessResult.reason instanceof ApiRequestError ? readinessResult.reason.requestId : undefined; setReadiness(null); setReadinessError(`Issuance readiness is unavailable for this profile.${requestId ? ` Support reference: ${requestId}.` : ''}`); }
    setLoading(false);
  }, [canIssueDocuments, canReadDocuments, clearPrivateState, profileId]);

  const loadMoreDocuments = async () => {
    if (!profileId || !canReadDocuments || !documentsCursor || busy) return;
    const currentProfileId = profileId;
    setBusy(true); setDocumentError(null);
    try {
      const page = await documentManagerService.listDocuments({ limit: 25, after: documentsCursor });
      if (profileIdRef.current !== currentProfileId) return;
      setDocuments((current) => [...current, ...page.items]); setDocumentsCursor(page.nextCursor);
    } catch (raw) { if (profileIdRef.current === currentProfileId) setDocumentError(raw instanceof Error ? raw.message : 'More documents could not be loaded.'); }
    finally { if (profileIdRef.current === currentProfileId) setBusy(false); }
  };

  const loadMoreTemplates = async () => {
    if (!profileId || !canIssueDocuments || !templatesCursor || busy) return;
    const currentProfileId = profileId;
    setBusy(true); setTemplateError(null);
    try {
      const page = await documentManagerService.listTemplates({ state: 'active', limit: 25, after: templatesCursor });
      if (profileIdRef.current !== currentProfileId) return;
      setTemplates((current) => [...current, ...page.items]); setTemplatesCursor(page.nextCursor);
    } catch (raw) { if (profileIdRef.current === currentProfileId) setTemplateError(raw instanceof Error ? raw.message : 'More templates could not be loaded.'); }
    finally { if (profileIdRef.current === currentProfileId) setBusy(false); }
  };

  useEffect(() => {
    cancelStepUpRef.current();
    clearPrivateState();
    void load();
    return () => { loadGeneration.current += 1; };
  }, [clearPrivateState, load, profileId]); // Profile-bound private responses and viewer blobs must not cross profiles.

  const refreshSelected = useCallback(async (id: string) => {
    if (!id) return;
    const requestedProfileId = profileId;
    setSelectedDocument(null); setHistory([]); setHistoryViews([]); setHistoryCursor(null); setDetailError(null);
    try {
      const document = await documentManagerService.getDocument(id);
      if (profileIdRef.current !== requestedProfileId) return;
      setSelectedDocument(document);
      setEditTitle(document.title); setEditType(document.documentType); setEditBody(document.body ?? '');
      setSignName('');
      // History is issuer-only. Recipients can read their issued document without
      // triggering a history request that the backend correctly denies.
      if (canIssueDocuments && document.issuerProfileId === requestedProfileId) {
        const historyResult = await documentManagerService.getHistory(id, { limit: 25 });
        if (profileIdRef.current !== requestedProfileId) return;
        setHistory(historyResult.events ?? []); setHistoryViews(historyResult.views ?? []); setHistoryCursor(historyResult.nextCursor ?? null);
      }
    } catch (raw) {
      if (profileIdRef.current !== requestedProfileId) return;
      if (raw instanceof ApiRequestError && raw.status === 409) setDetailError('This document changed. Refresh it before making another change.');
      else setDetailError(raw instanceof Error ? raw.message : 'Document details are unavailable.');
    }
  }, [canIssueDocuments, profileId]);

  const loadMoreHistory = async () => {
    if (!selectedDocument || !historyCursor || selectedDocument.issuerProfileId !== profileId || busy) return;
    const currentProfileId = profileId;
    setBusy(true);
    try {
      const page = await documentManagerService.getHistory(selectedDocument.id, { limit: 25, after: historyCursor });
      if (profileIdRef.current !== currentProfileId) return;
      setHistory((current) => [...current, ...page.events]); setHistoryViews((current) => [...current, ...page.views]); setHistoryCursor(page.nextCursor ?? null);
    } catch (raw) { if (profileIdRef.current === currentProfileId) setDetailError(raw instanceof Error ? raw.message : 'More document history could not be loaded.'); }
    finally { if (profileIdRef.current === currentProfileId) setBusy(false); }
  };

  useEffect(() => { if (selectedId) void refreshSelected(selectedId); else setSelectedDocument(null); }, [selectedId, refreshSelected]);

  const chooseTemplate = (id: string) => {
    setTemplateId(id);
    const next = templates.find((item) => item.id === id);
    setMergeValues(Object.fromEntries(placeholders(next?.body ?? '').map((key) => [key, ''])));
    setCreateTitle(next?.title ?? ''); setCreateType(next?.documentType ?? ''); setWetInk(next?.requiresWetInk ?? false);
  };

  const startAmendmentDraft = () => {
    if (!selectedDocument || !selectedIsIssuer || !['issued', 'signed', 'acknowledged', 'archived'].includes(selectedDocument.state)) return;
    setTemplateId('');
    setMergeValues({});
    setRecipientProfileIds([]);
    setCreateTitle(`Amendment: ${selectedDocument.title}`);
    setCreateType(selectedDocument.documentType);
    setCreateBody(selectedDocument.body ?? '');
    setWetInk(selectedDocument.requiresWetInk);
    setPreviousDocumentId(selectedDocument.id);
    setDetailError(null);
  };

  const createDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !canIssueDocuments || !profileId) return;
    if (!templateId && (!createTitle.trim() || !createType.trim() || !createBody.trim())) {
      setDetailError('Enter a title, document type and document content, or choose an active template.'); return;
    }
    if (requiredMergeKeys.some((key) => !mergeValues[key]?.trim())) {
      setDetailError('Complete each template field before creating the document draft.'); return;
    }
    setBusy(true); setDetailError(null);
    try {
      const document = await documentManagerService.createDocument({
        ...(templateId ? { templateId, mergeValues: Object.fromEntries(requiredMergeKeys.map((key) => [key, mergeValues[key]])) } : { title: createTitle.trim(), documentType: createType.trim(), body: createBody }),
        ...(recipientProfileIds.length ? { recipientProfileIds } : {}),
        ...(previousDocumentId ? { previousDocumentId } : {}),
        requiresWetInk: wetInk,
      });
      setPreviousDocumentId(null);
      setSelectedId(document.id); setSection('documents');
      toast.success(previousDocumentId ? 'Amendment draft created. Review it before submitting.' : 'Document draft created. Review it before submitting.');
      await load();
    } catch (raw) { setDetailError(raw instanceof Error ? raw.message : 'Unable to create the document draft.'); }
    finally { setBusy(false); }
  };

  const saveTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy || !canIssueDocuments || !profileId) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get('templateTitle') ?? '').trim();
    const documentType = String(data.get('templateType') ?? '').trim();
    const body = String(data.get('templateBody') ?? '');
    if (!title || !documentType || !body.trim()) { setTemplateError('Enter the template title, document type and body.'); return; }
    setBusy(true); setTemplateError(null);
    try { await documentManagerService.createTemplate({ title, documentType, body, requiresWetInk: data.get('requiresWetInk') === 'on' }); toast.success('Template saved.'); form.reset(); await load(); }
    catch (raw) { setTemplateError(raw instanceof Error ? raw.message : 'Unable to save the template.'); }
    finally { setBusy(false); }
  };

  const saveDocumentDraft = async () => {
    if (!selectedDocument || selectedDocument.issuerProfileId !== profileId || !canIssueDocuments || selectedDocument.state !== 'draft' || busy) return;
    setBusy(true); setDetailError(null);
    try {
      const next = await documentManagerService.updateDocument(selectedDocument.id, { expectedVersion: selectedDocument.version, title: editTitle, documentType: editType, body: editBody, requiresWetInk: selectedDocument.requiresWetInk });
      setSelectedDocument(next); toast.success('Draft saved.'); await load();
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.status === 409) { await refreshSelected(selectedDocument.id); setDetailError('The document changed elsewhere. The latest version is loaded; review it before saving again.'); }
      else setDetailError(raw instanceof Error ? raw.message : 'Unable to save the draft.');
    } finally { setBusy(false); }
  };

  const runUnprotected = async (action: 'submit' | 'acknowledge') => {
    if (!selectedDocument || busy) return;
    if (action === 'submit' && (!canIssueDocuments || selectedDocument.issuerProfileId !== profileId || selectedDocument.state !== 'draft')) return;
    const response = selectedDocument.myResponse;
    if (action === 'acknowledge' && (!selectedDocument.recipientProfileIds.includes(profileId) || !response || response.profileId !== profileId || response.state !== 'pending' || response.acknowledged || response.signed)) return;
    setBusy(true); setDetailError(null);
    try {
      const next = action === 'submit'
        ? await documentManagerService.submit(selectedDocument.id, { expectedVersion: selectedDocument.version })
        : await documentManagerService.acknowledge(selectedDocument.id, { expectedVersion: selectedDocument.version });
      setSelectedDocument(next); toast.success(action === 'submit' ? `Document submitted: ${label(next.state)}.` : 'Acknowledgment recorded.'); await load();
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.status === 409 && ['CONFLICT_MANAGED_DOCUMENT_VERSION', 'CONFLICT_MANAGED_SIGNATURE_EXISTS'].includes(raw.code ?? '')) { await refreshSelected(selectedDocument.id); setDetailError('The document or recipient response changed. The current server response has been loaded; review it before continuing.'); }
      else if (raw instanceof ApiRequestError && raw.status === 409) { await refreshSelected(selectedDocument.id); setDetailError('The document version or state changed. Review the latest server state before continuing.'); }
      else setDetailError(raw instanceof Error ? raw.message : 'The document action could not be completed.');
    } finally { setBusy(false); }
  };

  const beginProtected = async (action: ProtectedAction, body: { expectedVersion: number; typedName?: string }) => {
    if (!selectedDocument || protectedAction || busy) return;
    const isIssuer = canIssueDocuments && selectedDocument.issuerProfileId === profileId;
    const isRecipient = selectedDocument.recipientProfileIds.includes(profileId);
    if ((action === 'approve' && (!canIssueDocuments || selectedDocument.state !== 'approval_pending' || selectedDocument.issuerProfileId === profileId || (Boolean(accountId) && selectedDocument.issuerIdentityId === accountId))) ||
        (action === 'issue' && (!isIssuer || !['approved', 'issuing'].includes(selectedDocument.state))) ||
        (action === 'sign' && (!isRecipient || !['issued', 'signed', 'acknowledged'].includes(selectedDocument.state))) ||
        (action === 'archive' && (!isIssuer || !['issued', 'signed', 'acknowledged'].includes(selectedDocument.state)))) return;
    const path = `/api/document-manager/documents/${encodeURIComponent(selectedDocument.id)}/${action}`;
    const requestBody = action === 'sign' ? { expectedVersion: body.expectedVersion, typedName: body.typedName ?? '' } : { expectedVersion: body.expectedVersion };
    setProtectedAction(action); setDetailError(null);
    const started = await stepUp.begin({ method: 'POST', path, body: requestBody, label: `${label(action)} this managed document`, execute: (challengeId, exactBody) => action === 'approve'
      ? documentManagerService.approve(selectedDocument.id, exactBody, challengeId)
      : action === 'issue' ? documentManagerService.issue(selectedDocument.id, exactBody, challengeId)
        : action === 'sign' ? documentManagerService.sign(selectedDocument.id, exactBody as { expectedVersion: number; typedName: string }, challengeId)
          : documentManagerService.archive(selectedDocument.id, exactBody, challengeId) });
    if (!started) { setProtectedAction(null); setDetailError(stepUp.error ?? 'Authenticator confirmation could not start.'); }
  };

  const completeStepUp = async (code: string): Promise<boolean> => {
    const result = await stepUp.complete(code);
    if (!result.ok) { setDetailError(result.error ?? 'Authenticator confirmation failed.'); return false; }
    setProtectedAction(null); setSelectedDocument(result.value); toast.success(`Document state: ${label(result.value.state)}.`); await load(); return true;
  };

  const openContent = async () => {
    if (!selectedDocument || busy || (selectedDocument.issuerProfileId !== profileId && !selectedDocument.recipientProfileIds.includes(profileId)) || !['issued', 'signed', 'acknowledged', 'archived'].includes(selectedDocument.state)) return;
    const requestedProfileId = profileId;
    setBusy(true); setDetailError(null);
    try { const blob = await documentManagerService.getContent(selectedDocument.id); if (profileIdRef.current !== requestedProfileId) return; setPdfUrl((current) => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(blob); }); }
    catch (raw) { setDetailError(raw instanceof Error ? raw.message : 'Protected document content is unavailable.'); }
    finally { if (profileIdRef.current === requestedProfileId) setBusy(false); }
  };

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const layoutContent = <div className="mx-auto grid max-w-7xl gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] lg:p-8">
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-secondary">Private, profile-scoped workspace</p><h2 className="text-3xl font-black">Document Manager</h2><p className="mt-1 text-sm text-secondary">Templates, drafts, issued records and recipient actions are checked against the selected profile by the server.</p>{activeProfile ? <p className="mt-2 text-xs text-secondary">Current profile: <strong>{activeProfile.name}</strong></p> : <p role="alert" className="mt-2 text-sm text-error">Select a profile before viewing documents.</p>}</div><Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>Refresh</Button></div>
      <div className="flex gap-2" role="tablist" aria-label="Document workspace"><button type="button" role="tab" aria-selected={section === 'documents'} onClick={() => setSection('documents')} className={`rounded-lg px-4 py-2 text-sm font-bold ${section === 'documents' ? 'bg-primary text-on-primary' : 'bg-surface-container-low'}`}>Documents</button>{canIssueDocuments ? <button type="button" role="tab" aria-selected={section === 'templates'} onClick={() => setSection('templates')} className={`rounded-lg px-4 py-2 text-sm font-bold ${section === 'templates' ? 'bg-primary text-on-primary' : 'bg-surface-container-low'}`}>Templates</button> : null}</div>
      {canIssueDocuments ? <Card className="p-4"><h3 className="font-bold">Sealed-document readiness</h3>{readinessError ? <p role="status" className="mt-2 text-sm text-secondary">Readiness could not be loaded: {readinessError}</p> : !readiness ? <p className="mt-2 text-sm text-secondary">Loading current issuance readiness…</p> : <><p role="status" className="mt-2 text-sm">Issuance {label(readiness.issuance.state)} · Authority {label(readiness.authority.state)} · Signatory {label(readiness.authority.signatory?.state ?? 'not returned')}</p><p className="mt-1 text-xs text-secondary">QR signing {label(readiness.qrSigning.state)} · Verification origin {label(readiness.verificationOrigin.state)} · Private envelope {label(readiness.privateEnvelope.state)} · Private storage {label(readiness.privateStorage.state)}{Number.isInteger(readiness.maxIssuedBytes) ? ` · Maximum ${Math.ceil((readiness.maxIssuedBytes ?? 0) / 1024)} KiB` : ''}</p>{readiness.issuance.reasonCodes?.length ? <p className="mt-1 text-xs text-secondary">Unavailable because: {readiness.issuance.reasonCodes.map(label).join(', ')}.</p> : null}<p className="mt-1 text-xs text-secondary">Readiness is informational. The server rechecks authority and current document version when you issue.</p></>}</Card> : null}
      {!canIssueDocuments && canReadDocuments ? <p role="status" className="rounded-lg bg-surface-container-low p-3 text-sm text-secondary">This profile can read its available documents. Draft creation and templates require the current profile’s document-issue permission.</p> : null}
      {loading ? <LoadingState label="Loading documents for this profile…" /> : null}
      {section === 'documents' && !loading ? <>
        {documentError ? <ErrorState message={documentError} onRetry={() => void load()} /> : null}
        {!documentError && !documents.length ? <Card className="p-6"><p className="font-bold">No documents are available for this profile.</p><p className="mt-1 text-sm text-secondary">Create a draft if this profile has document-issue authority, or refresh after switching to a recipient profile.</p></Card> : null}
        <div className="space-y-2">{documents.map((document) => <button key={document.id} type="button" onClick={() => { setSelectedId(document.id); setPdfUrl((current) => { if (current) URL.revokeObjectURL(current); return null; }); }} className={`w-full rounded-xl border p-4 text-left ${selectedId === document.id ? 'border-primary bg-primary/5' : 'border-outline-variant/20 bg-white'}`}><span className="flex flex-wrap items-center justify-between gap-2"><span><span className="block font-bold">{document.title}</span><span className="mt-1 block text-xs text-secondary">{document.documentType} · Version {document.version}</span></span><span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold">{label(document.state)}</span></span></button>)}</div>
        {documentsCursor ? <Button type="button" variant="secondary" disabled={busy} onClick={() => void loadMoreDocuments()}>{busy ? 'Loading…' : 'Load more documents'}</Button> : null}
        {canIssueDocuments ? <Card className="p-5"><h3 className="text-lg font-black">Create a document draft</h3><p className="mt-1 text-sm text-secondary">A draft is not issued or legally sealed until the backend confirms issuance.</p>{previousDocumentId ? <p role="status" className="mt-3 rounded-lg bg-primary/5 p-3 text-sm">This draft will be linked as an amendment to the selected document. <button type="button" className="ml-1 font-bold underline" onClick={() => setPreviousDocumentId(null)}>Remove amendment link</button></p> : null}{templateError ? <p role="alert" className="mt-2 text-sm text-error">Templates: {templateError}</p> : null}<form className="mt-4 space-y-3" onSubmit={(event) => void createDocument(event)}><label className="block text-sm font-semibold">Start from an active template<select className="mt-1 block w-full rounded-lg border px-3 py-2" value={templateId} onChange={(event) => chooseTemplate(event.target.value)}><option value="">Create from entered content</option>{templates.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.documentType}</option>)}</select></label>{requiredMergeKeys.map((key) => <label key={key} className="block text-sm font-semibold">{label(key)}<input required className="mt-1 block w-full rounded-lg border px-3 py-2" value={mergeValues[key] ?? ''} onChange={(event) => setMergeValues((current) => ({ ...current, [key]: event.target.value }))} /></label>)}{!templateId ? <><label className="block text-sm font-semibold">Document title<input required className="mt-1 block w-full rounded-lg border px-3 py-2" value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} /></label><label className="block text-sm font-semibold">Document type<input required className="mt-1 block w-full rounded-lg border px-3 py-2" value={createType} onChange={(event) => setCreateType(event.target.value)} /></label><label className="block text-sm font-semibold">Document body<textarea required rows={7} className="mt-1 block w-full rounded-lg border px-3 py-2" value={createBody} onChange={(event) => setCreateBody(event.target.value)} /></label></> : null}{profiles.length ? <fieldset className="rounded-lg border p-3"><legend className="px-1 text-sm font-semibold">Recipient profiles on this account</legend><p className="mb-2 text-xs text-secondary">Only your current account’s profiles are available here. Other organization recipients must be selected through an authorized profile workflow.</p>{profiles.map((profile) => <label key={profile.id} className="mr-4 inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={recipientProfileIds.includes(profile.id)} onChange={(event) => setRecipientProfileIds((current) => event.target.checked ? [...current, profile.id] : current.filter((id) => id !== profile.id))} />{profile.name} · {label(profile.kind)}</label>)}</fieldset> : null}<label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={wetInk} onChange={(event) => setWetInk(event.target.checked)} />Requires separate wet-ink execution</label><Button type="submit" disabled={busy || !profileId}>{busy ? 'Creating…' : 'Create draft'}</Button></form></Card> : null}
      </> : null}
      {section === 'templates' && canIssueDocuments && !loading ? <>
        {templateError ? <ErrorState message={templateError} onRetry={() => void load()} /> : null}
        <Card className="p-5"><h3 className="text-lg font-black">Active templates</h3>{!templates.length && !templateError ? <p className="mt-2 text-sm text-secondary">No active templates are available for this profile.</p> : <ul className="mt-3 space-y-2">{templates.map((template) => <li key={template.id} className="rounded-lg bg-surface-container-low p-3"><p className="font-bold">{template.title}</p><p className="text-xs text-secondary">{template.documentType} · Version {template.version}{template.requiresWetInk ? ' · Wet ink required' : ''}</p><details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold">Edit or archive template</summary><form className="mt-2 space-y-2" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void (async () => { setBusy(true); try { await documentManagerService.updateTemplate(template.id, { expectedVersion: template.version, title: String(data.get('title') ?? ''), documentType: String(data.get('type') ?? ''), body: String(data.get('body') ?? ''), requiresWetInk: data.get('wet') === 'on' }); await load(); } catch (raw) { if (raw instanceof ApiRequestError && raw.status === 409) { await load(); setTemplateError('The template changed elsewhere. The latest list was refreshed; review it before changing it again.'); } else setTemplateError(raw instanceof Error ? raw.message : 'Template update failed.'); } finally { setBusy(false); } })(); }}><input aria-label={`Template title ${template.id}`} name="title" defaultValue={template.title} className="w-full rounded border px-2 py-1" /><input aria-label={`Template type ${template.id}`} name="type" defaultValue={template.documentType} className="w-full rounded border px-2 py-1" /><textarea aria-label={`Template body ${template.id}`} name="body" defaultValue={template.body} rows={5} className="w-full rounded border px-2 py-1" /><label className="flex items-center gap-2"><input name="wet" type="checkbox" defaultChecked={template.requiresWetInk} />Requires wet ink</label><div className="flex gap-2"><Button type="submit" variant="secondary" disabled={busy}>Save template</Button><Button type="button" variant="secondary" disabled={busy} onClick={async () => { setBusy(true); try { await documentManagerService.updateTemplate(template.id, { expectedVersion: template.version, state: 'archived' }); await load(); } catch (raw) { if (raw instanceof ApiRequestError && raw.status === 409) { await load(); setTemplateError('The template changed elsewhere. The latest list was refreshed; review it before archiving it again.'); } else setTemplateError(raw instanceof Error ? raw.message : 'Template archive failed.'); } finally { setBusy(false); } }}>Archive</Button></div></form></details></li>)}</ul>}{templatesCursor ? <Button className="mt-3" type="button" variant="secondary" disabled={busy} onClick={() => void loadMoreTemplates()}>{busy ? 'Loading…' : 'Load more templates'}</Button> : null}</Card>
        <Card className="p-5"><h3 className="text-lg font-black">Create template</h3><p className="mt-1 text-sm text-secondary">Use placeholders such as {'{{name}}'}; the draft form will ask for each value.</p><form className="mt-3 space-y-3" onSubmit={(event) => void saveTemplate(event)}><label className="block text-sm font-semibold">Title<input name="templateTitle" required className="mt-1 block w-full rounded border px-3 py-2" /></label><label className="block text-sm font-semibold">Document type<input name="templateType" required className="mt-1 block w-full rounded border px-3 py-2" /></label><label className="block text-sm font-semibold">Template body<textarea name="templateBody" required rows={8} className="mt-1 block w-full rounded border px-3 py-2" /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requiresWetInk" />Requires separate wet-ink execution</label><Button type="submit" disabled={busy || !profileId}>Save template</Button>{templateError ? <p role="alert" className="text-sm text-error">{templateError}</p> : null}</form></Card>
      </> : null}
    </section>
    <aside className="space-y-5">
      <Card className="p-5"><h3 className="text-xl font-black">Selected document</h3>{!selectedId ? <p className="mt-2 text-sm text-secondary">Choose a document to review its current state and available actions.</p> : detailError ? <div className="mt-3"><ErrorState message={detailError} onRetry={() => void refreshSelected(selectedId)} /></div> : !selectedDocument ? <LoadingState label="Loading document details…" /> : <div className="mt-3 space-y-3"><div><p className="font-bold">{selectedDocument.title}</p><p className="text-sm text-secondary">{selectedDocument.documentType} · {label(selectedDocument.state)} · Version {selectedDocument.version}</p></div>{selectedIsIssuer && selectedDocument.recipientResponses ? <div className="rounded-lg bg-surface-container-low p-3"><p className="text-sm font-semibold">Recipient responses · {selectedDocument.recipientResponses.filter((entry) => entry.acknowledged || entry.signed).length} of {selectedDocument.recipientResponses.length} responded</p><ul className="mt-2 space-y-1 text-xs text-secondary">{selectedDocument.recipientResponses.map((entry, index) => <li key={`${entry.state}:${entry.respondedAt ?? 'pending'}:${index}`}>{label(entry.state)}{entry.respondedAt ? ` · ${new Date(entry.respondedAt).toLocaleString()}` : ''}</li>)}</ul></div> : null}{selectedIsRecipient && myResponse ? <p role="status" className="rounded-lg bg-surface-container-low p-3 text-sm">Your response: {label(myResponse.state)}{myResponse.respondedAt ? ` · ${new Date(myResponse.respondedAt).toLocaleString()}` : ''}{myResponse.acknowledged && !myResponse.signed ? ' · Receipt acknowledgment is not a typed signature.' : ''}</p> : null}{selectedDocument.requiresWetInk ? <p role="status" className="rounded bg-amber-50 p-3 text-sm">This document also requires separate physical wet-ink execution. A typed response does not record a physical signature.</p> : null}{selectedDocument.state === 'draft' && selectedIsIssuer ? <><label className="block text-sm font-semibold">Title<input className="mt-1 block w-full rounded border px-3 py-2" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} /></label><label className="block text-sm font-semibold">Document type<input className="mt-1 block w-full rounded border px-3 py-2" value={editType} onChange={(event) => setEditType(event.target.value)} /></label><label className="block text-sm font-semibold">Body<textarea rows={8} className="mt-1 block w-full rounded border px-3 py-2" value={editBody} onChange={(event) => setEditBody(event.target.value)} /></label><Button type="button" variant="secondary" disabled={busy} onClick={() => void saveDocumentDraft()}>Save draft</Button><Button type="button" disabled={busy} onClick={() => void runUnprotected('submit')}>Submit draft</Button></> : null}{selectedDocument.state === 'approval_pending' ? <p role="status" className="rounded bg-amber-50 p-3 text-sm">This organization document is awaiting an independent authorized team decision.</p> : null}{selectedDocument.state === 'approved' && selectedIsIssuer ? <Button type="button" disabled={busy || !readiness?.issuance.usableNow} onClick={() => void beginProtected('issue', { expectedVersion: selectedDocument.version })}>Issue sealed document with authenticator</Button> : null}{selectedDocument.state === 'issuing' && selectedIsIssuer ? <div role="status" className="rounded bg-amber-50 p-3 text-sm"><p>Issuance is recoverable. Refresh document details and continue only through the current same-version recovery action returned by the server.</p><Button className="mt-2" type="button" variant="secondary" disabled={busy} onClick={() => void beginProtected('issue', { expectedVersion: selectedDocument.version })}>Continue same-version issuance recovery</Button></div> : null}{selectedCanApprove ? <Button type="button" variant="secondary" disabled={busy} onClick={() => void beginProtected('approve', { expectedVersion: selectedDocument.version })}>Approve with authenticator</Button> : null}{['issued', 'signed', 'acknowledged', 'archived'].includes(selectedDocument.state) ? <><p className="rounded-lg bg-surface-container-low p-3 text-sm">Reference: <strong>{selectedDocument.reference ?? 'Not returned'}</strong>{selectedDocument.issuedAt ? ` · Issued ${new Date(selectedDocument.issuedAt).toLocaleDateString()}` : ''}</p>{selectedDocument.qrVerificationUrl ? <a className="font-bold underline" href={selectedDocument.qrVerificationUrl} target="_blank" rel="noreferrer">Open public QR verification</a> : null}{selectedIsIssuer || selectedIsRecipient ? <Button type="button" variant="secondary" disabled={busy} onClick={() => void openContent()}>View sealed PDF</Button> : null}{selectedIsRecipient && !selectedDocument.myResponse?.signed && !selectedDocument.signatures?.some((signature) => signature.profileId === profileId) ? <><label className="block text-sm font-semibold">Typed signature name<input className="mt-1 block w-full rounded border px-3 py-2" value={signName} onChange={(event) => setSignName(event.target.value)} /></label><Button type="button" disabled={!signName.trim() || busy} onClick={() => void beginProtected('sign', { expectedVersion: selectedDocument.version, typedName: signName.trim() })}>Sign with authenticator</Button>{myResponse?.state === 'pending' && !myResponse.acknowledged && !myResponse.signed ? <Button type="button" variant="secondary" disabled={busy} onClick={() => void runUnprotected('acknowledge')}>Acknowledge receipt</Button> : myResponse?.acknowledged ? <p role="status" className="text-sm text-secondary">Receipt acknowledged{myResponse.respondedAt ? ` · ${new Date(myResponse.respondedAt).toLocaleString()}` : ''}. Acknowledgment is not a typed signature.</p> : !myResponse ? <p role="status" className="text-sm text-secondary">Recipient response status is not available for this selected profile. Refresh before responding.</p> : null}</> : null}</> : null}{selectedIsIssuer && ['issued', 'signed', 'acknowledged', 'archived'].includes(selectedDocument.state) ? <Button type="button" variant="secondary" disabled={busy} onClick={startAmendmentDraft}>Create amendment draft</Button> : null}{['issued', 'signed', 'acknowledged'].includes(selectedDocument.state) && selectedIsIssuer ? <Button type="button" variant="secondary" disabled={busy} onClick={() => void beginProtected('archive', { expectedVersion: selectedDocument.version })}>Archive record with authenticator</Button> : null}{history.length || historyViews.length ? <div><h4 className="font-bold">Recent activity</h4>{history.length ? <ul className="mt-2 space-y-1 text-xs text-secondary">{history.map((event, index) => <li key={`${event.at}:${event.version}:${index}`}>{label(event.action)} · Version {event.version} · {new Date(event.at).toLocaleString()}</li>)}</ul> : null}{historyViews.length ? <><h5 className="mt-3 text-sm font-semibold">Access log</h5><ul className="mt-2 space-y-1 text-xs text-secondary">{historyViews.map((event, index) => <li key={`${event.viewedAt}:${event.action}:${index}`}>{label(event.action)} · {new Date(event.viewedAt).toLocaleString()}</li>)}</ul></> : null}{historyCursor ? <Button type="button" className="mt-2" variant="secondary" disabled={busy} onClick={() => void loadMoreHistory()}>{busy ? 'Loading…' : 'Load more activity'}</Button> : null}</div> : null}</div>}</Card>
      {pdfUrl ? <Card className="p-2"><div className="flex items-center justify-between p-2"><h3 className="font-bold">Protected PDF preview</h3><Button type="button" variant="secondary" onClick={() => setPdfUrl((current) => { if (current) URL.revokeObjectURL(current); return null; })}>Close</Button></div><object data={pdfUrl} type="application/pdf" aria-label="Protected issued document PDF" className="h-[65vh] w-full"><p className="p-4 text-sm">This browser cannot display the protected PDF. Close the preview and try a supported browser viewer.</p></object></Card> : null}
    </aside>
  </div>;

  const dialog = <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={() => { stepUp.cancel(); setProtectedAction(null); }} onSubmit={completeStepUp} />;
  if (activeProfile?.kind === 'buyer') return <><BuyerPortalLayout pageTitle="Document Manager" pageSubtitle="Manage documents available to your selected profile.">{layoutContent}</BuyerPortalLayout>{dialog}</>;
  if (activeProfile?.kind === 'owner') return <><LandlordPortalLayout active="documents" title="Document Manager">{layoutContent}</LandlordPortalLayout>{dialog}</>;
  return <main className="min-h-screen bg-surface p-6">{layoutContent}{dialog}</main>;
};

export default DocumentManager;
