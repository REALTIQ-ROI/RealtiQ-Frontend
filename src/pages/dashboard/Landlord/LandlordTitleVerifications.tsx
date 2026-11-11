import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiRequestError } from '../../../lib/axios';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import RegistryAuditDetails from '../../../components/title/RegistryAuditDetails';
import TitleVerificationBadge from '../../../components/title/TitleVerificationBadge';
import { useAuth } from '../../../contexts/AuthContext';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { useCanonicalFieldDictionary } from '../../../hooks/useCanonicalFieldDictionary';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import { useProperties } from '../../../contexts/PropertiesContext';
import { documentService } from '../../../services/documentService';
import { titleVerificationService, type TitleFeeOrder, type TitleFeeQuote } from '../../../services/titleVerificationService';
import { formatMoneyMinor } from '../../../utils/moneyMinor';
import { titleDocumentService } from '../../../services/titleDocumentService';
import {
  propertyDisplayReference,
  propertyPublicReference,
  propertyRouteReference,
  resolvePropertyOwnerId,
  type TitleDocumentRecord,
  type TitleDocumentType,
  type TitleRiskFlag,
  type TitleVerification,
} from '../../../types';
import { currentDocumentTypeLabel, currentTitleDocumentTypeOptions, documentTypeLabel, formatDateTime, riskFlagText, shortenHash } from '../../../utils/titleVerification';
import { buildTitleUploadStepUpBody, digestTitleUpload, validateTitleUploadFile } from '../../../utils/titleUploadStepUp';

const TITLE_DOCUMENT_ACCEPT = '.pdf,image/jpeg,image/png,image/webp';

const LandlordTitleVerifications = () => {
  const { user, activeProfile } = useAuth();
  const navigate = useNavigate();
  const { properties, refreshProperties } = useProperties();
  const [searchParams] = useSearchParams();
  const [propertyId, setPropertyId] = useState(searchParams.get('propertyId') ?? '');
  const [documentType, setDocumentType] = useState('');
  const [documents, setDocuments] = useState<TitleDocumentRecord[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadOutcomeUnknown, setUploadOutcomeUnknown] = useState(false);
  const titleUploadStepUp = useBoundStepUp<Awaited<ReturnType<typeof documentService.uploadTitleDocument>>>();
  const { dictionary, loading: dictionaryLoading } = useCanonicalFieldDictionary();
  const documentTypeOptions = currentTitleDocumentTypeOptions(dictionary);
  const [openingDocumentId, setOpeningDocumentId] = useState('');
  const [verifications, setVerifications] = useState<TitleVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskFlags, setRiskFlags] = useState<TitleRiskFlag[]>([]);
  const [feeMode, setFeeMode] = useState<'upfront' | 'deferred' | ''>('');
  const [feeQuote, setFeeQuote] = useState<TitleFeeQuote | null>(null);
  const [feeOrder, setFeeOrder] = useState<TitleFeeOrder | null>(null);
  const [feeBusy, setFeeBusy] = useState(false);
  const [feeError, setFeeError] = useState('');
  const [feePaymentUrl, setFeePaymentUrl] = useState<string | null>(null);
  const feeOperationKey = useRef<string | null>(null);
  const feeOrderStepUp = useBoundStepUp<Awaited<ReturnType<typeof titleVerificationService.createFeeOrder>>>();

  const ownProperties = useMemo(
    () => properties.filter((property) => resolvePropertyOwnerId(property) === user?._id),
    [properties, user?._id],
  );
  const selectedProperty = useMemo(
    () => ownProperties.find((property) => propertyRouteReference(property) === propertyId) ?? null,
    [ownProperties, propertyId],
  );
  const selectedPropertyPublicReference = selectedProperty ? propertyPublicReference(selectedProperty) : '';
  const feeOrderStorageKey = selectedProperty && activeProfile ? `realtiq.titleFeeOrder:${activeProfile.id}:${selectedProperty._id}` : '';
  const feeOperationStorageKey = feeOrderStorageKey ? `${feeOrderStorageKey}:operation` : '';

  useEffect(() => {
    let active = true;
    setFeeMode(''); setFeeQuote(null); setFeeOrder(null); setFeeError(''); setFeePaymentUrl(null); feeOperationKey.current = null;
    const savedId = feeOrderStorageKey ? sessionStorage.getItem(feeOrderStorageKey) : null;
    if (savedId) titleVerificationService.getFeeOrder(savedId).then((order) => { if (active) setFeeOrder(order); }).catch((raw) => { if (active) setFeeError(raw instanceof Error ? raw.message : 'Unable to reload the title fee order.'); });
    return () => { active = false; feeOrderStepUp.cancel(); };
    // A change to the property/profile must clear its fee flow and protected challenge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeOrderStorageKey]);

  const loadFeeQuote = async () => {
    if (!selectedProperty || !feeMode || feeBusy) return;
    setFeeBusy(true); setFeeError(''); setFeeQuote(null);
    try { setFeeQuote(await titleVerificationService.quoteFee({ propertyId: selectedProperty._id, serviceFeeMode: feeMode })); }
    catch (raw) { setFeeError(raw instanceof Error ? raw.message : 'Title fee quote is unavailable.'); }
    finally { setFeeBusy(false); }
  };

  const beginFeeOrder = async () => {
    if (!selectedProperty || !feeMode || !feeQuote?.payable || feeOrder || feeOrderStepUp.busy || feeOrderStepUp.challenge) return;
    const saved = feeOperationStorageKey ? sessionStorage.getItem(feeOperationStorageKey)?.split('|') : null;
    if (saved?.[0] && saved[0] !== feeMode) { setFeeError('A prior fee-order request has an unresolved result. Review that request before changing the payment mode.'); return; }
    feeOperationKey.current = saved?.[1] || feeOperationKey.current || `title_fee_${crypto.randomUUID()}`;
    const body = { propertyId: selectedProperty._id, serviceFeeMode: feeMode, operationKey: feeOperationKey.current };
    setFeeError('');
    await feeOrderStepUp.begin({ method: 'POST', path: '/api/title-verifications/fee-orders', body, label: 'Initialize title verification fee order', execute: (challengeId, exactBody) => { if (feeOperationStorageKey) sessionStorage.setItem(feeOperationStorageKey, `${exactBody.serviceFeeMode}|${exactBody.operationKey}`); return titleVerificationService.createFeeOrder(exactBody, challengeId); } });
  };

  const completeFeeOrder = async (code: string) => {
    const result = await feeOrderStepUp.complete(code);
    if (!result.ok) { setFeeError(result.error ?? 'The order outcome is unresolved. Check its reference before another attempt.'); return false; }
    setFeeOrder(result.value.order);
    if (feeOrderStorageKey) sessionStorage.setItem(feeOrderStorageKey, result.value.order.id);
    if (feeOperationStorageKey) sessionStorage.removeItem(feeOperationStorageKey);
    setFeePaymentUrl(/^https:\/\//i.test(result.value.payment.redirectUrl ?? '') ? result.value.payment.redirectUrl : null);
    return true;
  };

  const refreshFeeOrder = async () => {
    if (!feeOrder) return;
    setFeeBusy(true); setFeeError('');
    try { setFeeOrder(await titleVerificationService.getFeeOrder(feeOrder.id)); }
    catch (raw) { setFeeError(raw instanceof Error ? raw.message : 'Unable to refresh the title fee order.'); }
    finally { setFeeBusy(false); }
  };

  useEffect(() => {
    if (!propertyId && ownProperties[0]) setPropertyId(propertyRouteReference(ownProperties[0]));
  }, [ownProperties, propertyId]);

  const loadDocuments = async (reference: string) => {
    if (!reference) {
      setDocuments([]);
      return;
    }
    setDocumentsLoading(true);
    try {
      const response = await documentService.listPropertyDocuments({ propertyId: reference, category: 'title_document' });
      setDocuments(response.documents ?? []);
      setSelectedDocumentId((current) => current || response.documents?.[0]?.publicReference || response.documents?.[0]?._id || '');
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to load title documents.');
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments(selectedPropertyPublicReference);
  }, [selectedPropertyPublicReference]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await titleVerificationService.listTitleVerifications({ limit: 100 });
      setVerifications(response.verifications);
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : 'Unable to load title verifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const uploadTitleDocument = async () => {
    setRiskFlags([]);
    if (!selectedPropertyPublicReference) {
      toast.error('Select a property with a RealtIQ public reference before uploading.');
      return;
    }
    if (!uploadFile) {
      toast.error('Select a PDF, JPEG, PNG, or WebP title document.');
      return;
    }
    if (!documentTypeOptions.some((option) => option.value === documentType)) {
      toast.error('Choose a current title document type from the backend dictionary.');
      return;
    }
    if (uploadOutcomeUnknown || titleUploadStepUp.busy || titleUploadStepUp.challenge) return;
    const fileError = validateTitleUploadFile(uploadFile);
    if (fileError) { toast.error(fileError); return; }
    setUploading(true);
    try {
      const input = {
        propertyId: selectedPropertyPublicReference,
        documentType: documentType as TitleDocumentType,
        title: uploadTitle,
        file: uploadFile,
      };
      const digest = await digestTitleUpload(uploadFile);
      const body = buildTitleUploadStepUpBody({ documentType: documentType as TitleDocumentType, title: uploadTitle }, digest);
      await titleUploadStepUp.begin({
        method: 'POST',
        path: `/api/documents/properties/${encodeURIComponent(selectedPropertyPublicReference)}/title-upload`,
        body,
        label: 'Upload this title document to the selected property vault',
        execute: async (challengeId, exactBody) => {
          setUploading(true);
          try {
            const response = await documentService.uploadTitleDocument(input, challengeId, exactBody);
            setUploadOutcomeUnknown(false);
            const publicReference = response.document.publicReference;
            const verification = response.verification;
            if (verification) {
              setVerifications((current) => [verification, ...current.filter((item) => item.verificationId !== verification.verificationId)]);
              setRiskFlags(verification.riskFlags ?? []);
            }
            toast.success(response.verificationExisting ? 'Title document uploaded. Existing title review is active.' : publicReference ? `Title document uploaded as ${publicReference}. Title review pending.` : 'Title document uploaded. Title review pending.');
            if (response.riskDetected) toast.warning('Legal review is required for this title document before verification can be published.');
            setUploadFile(null);
            setUploadTitle('Certificate of Occupancy');
            await Promise.all([loadDocuments(selectedPropertyPublicReference), load(), refreshProperties()]);
            return response;
          } catch (raw) {
            if (!(raw instanceof ApiRequestError) || !raw.status || raw.status >= 500) setUploadOutcomeUnknown(true);
            throw raw;
          } finally { setUploading(false); }
        },
      });
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to prepare title document upload.');
    } finally {
      setUploading(false);
    }
  };

  const submitTitleUploadStepUp = async (code: string): Promise<boolean> => {
    const result = await titleUploadStepUp.complete(code);
    if (!result.ok && result.error) setSubmissionError(result.error);
    return result.ok;
  };

  const openTitleDocument = async (document: TitleDocumentRecord) => {
    const reference = document.publicReference || document._id;
    if (!reference) {
      toast.error('This document is missing its reference.');
      return;
    }

    setOpeningDocumentId(reference);
    try {
      const session = await titleDocumentService.openViewer(reference);
      navigate('/protected-title-viewer', {
        state: { session, documentId: reference, propertyId: selectedPropertyPublicReference },
      });
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to open title document.');
    } finally {
      setOpeningDocumentId('');
    }
  };

  const submitForLegalReview = async () => {
    const document = documents.find((item) => (item.publicReference || item._id) === selectedDocumentId);
    if (!feeOrder || feeOrder.state !== 'paid' || feeOrder.propertyId !== selectedProperty?._id) {
      setSubmissionError('A matching title fee order must be confirmed paid by the server before legal review submission. Refresh its status.');
      return;
    }
    if (!document || !selectedPropertyPublicReference) {
      toast.error('Select a restricted title document before submitting it for legal review.');
      return;
    }
    const selectedDocumentType = document.documentType || documentType;
    if (!documentTypeOptions.some((option) => option.value === selectedDocumentType)) {
      toast.error('This document type is not in the current title document dictionary. Refresh the document list and select a current document type.');
      return;
    }
    setSubmittingVerification(true);
    setRiskFlags([]);
    setSubmissionError(null);
    try {
      const response = await titleVerificationService.submitTitleVerification({
        propertyId: selectedProperty._id,
        documentId: selectedDocumentId,
        documentType: selectedDocumentType as TitleDocumentType,
        feeOrderId: feeOrder.id,
        metadata: { source: 'title_document_upload' },
      });
      setVerifications((current) => [
        response.verification,
        ...current.filter((item) => item.verificationId !== response.verification.verificationId),
      ]);
      toast.success(response.existing ? 'The existing legal review remains active.' : 'Submitted for legal review.');
    } catch (raw) {
      setSubmissionError(raw instanceof Error ? raw.message : 'Unable to submit the document for legal review.');
      if (raw instanceof ApiRequestError && raw.details && typeof raw.details === 'object' && 'riskFlags' in raw.details) {
        const flags = (raw.details as { riskFlags?: TitleRiskFlag[] }).riskFlags;
        if (Array.isArray(flags)) setRiskFlags(flags);
      }
      toast.error(raw instanceof Error ? raw.message : 'Unable to submit the document for legal review.');
    } finally {
      setSubmittingVerification(false);
    }
  };

  return (
    <LandlordPortalLayout active="title-verifications" title="Title Verification">
      <main className="mx-auto max-w-7xl space-y-8 p-4 sm:p-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Title Verification</h1>
          <p className="mt-2 max-w-3xl text-sm text-secondary">Review restricted title documents and submit eligible records for legal review.</p>
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Upload Title Document</h2>
            <section className="mt-5 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4" aria-label="Title verification fee order">
              <h3 className="font-bold">Title verification fee</h3>
              <p className="mt-1 text-sm text-secondary">The current state band, registry and travel costs, VAT and payable amount come from the server. A quote is informational; only a server-confirmed paid order can accompany a new legal-review submission.</p>
              <div className="mt-3 flex flex-wrap items-end gap-3"><label className="text-sm font-bold">Service fee mode<select className="mt-1 block rounded-lg border bg-white p-2" value={feeMode} disabled={Boolean(feeOrder)} onChange={(event) => { setFeeMode(event.target.value as 'upfront' | 'deferred'); setFeeQuote(null); feeOperationKey.current = null; }}><option value="">Choose when the service fee is paid</option><option value="upfront">Upfront</option><option value="deferred">Deferred</option></select></label><Button type="button" variant="secondary" disabled={!selectedProperty || !feeMode || feeBusy} onClick={() => void loadFeeQuote()}>{feeBusy ? 'Loading…' : 'Get current quote'}</Button></div>
              {feeError ? <p role="alert" className="mt-3 text-sm text-error">{feeError}</p> : null}
              {feeQuote ? <div className="mt-4 rounded-lg bg-white p-4 text-sm"><p className="font-bold">{feeQuote.payable ? 'Payable quote' : 'Quote unavailable'} · {feeQuote.stateLocation?.name ?? 'State unresolved'}</p><dl className="mt-2 grid gap-2 sm:grid-cols-2"><div><dt>Registry and search</dt><dd>{formatMoneyMinor(feeQuote.passThrough.registryAndSearchMinor, 'NGN')}</dd></div><div><dt>Travel</dt><dd>{feeQuote.passThrough.travelMode ?? 'Not returned'} · {formatMoneyMinor(feeQuote.passThrough.travelMinor, 'NGN')}</dd></div><div><dt>Service fee net</dt><dd>{formatMoneyMinor(feeQuote.serviceFee.netMinor, 'NGN')}</dd></div><div><dt>VAT</dt><dd>{formatMoneyMinor(feeQuote.serviceFee.vatMinor, 'NGN')}</dd></div><div><dt>Due now</dt><dd className="font-bold">{formatMoneyMinor(feeQuote.dueNowMinor, 'NGN')}</dd></div></dl>{!feeQuote.payable ? <p role="status" className="mt-2">{feeQuote.unavailableReason ?? 'The current quote cannot be ordered.'}</p> : !feeOrder ? <Button type="button" className="mt-3" disabled={feeOrderStepUp.busy || Boolean(feeOrderStepUp.challenge)} onClick={() => void beginFeeOrder()}>Create fee order with authenticator</Button> : null}</div> : null}
              {feeOrder ? <div className="mt-4 rounded-lg bg-white p-4 text-sm"><p><strong>Order status:</strong> {feeOrder.state.replaceAll('_', ' ')} · <strong>Provider settlement:</strong> {feeOrder.providerSettlementState.replaceAll('_', ' ')}</p><p className="mt-1">Amount: {formatMoneyMinor(feeOrder.amountMinor, feeOrder.currency)}{feeOrder.paymentReference ? ` · Reference: ${feeOrder.paymentReference}` : ''}</p><div className="mt-3 flex flex-wrap items-center gap-3"><Button type="button" variant="secondary" disabled={feeBusy} onClick={() => void refreshFeeOrder()}>Refresh order status</Button>{feePaymentUrl ? <a className="font-bold underline" href={feePaymentUrl}>Continue at payment provider</a> : null}</div>{feeOrder.state !== 'paid' ? <p className="mt-2 text-secondary">Legal review submission stays unavailable until the server confirms this order as paid.</p> : null}</div> : null}
            </section>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Property
                <select className="mt-1 w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm" value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
                  {ownProperties.map((property) => (
                    <option key={propertyRouteReference(property)} value={propertyRouteReference(property)}>
                      {property.title} - {propertyDisplayReference(property)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Document Type
                <select
                  className="mt-1 w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm"
                  value={documentType}
                  disabled={dictionaryLoading || !documentTypeOptions.length || uploading || titleUploadStepUp.busy || Boolean(titleUploadStepUp.challenge)}
                  onChange={(event) => {
                    const nextType = event.target.value;
                    setDocumentType(nextType);
                    setUploadTitle(currentDocumentTypeLabel(dictionary, nextType));
                  }}
                >
                  <option value="">Choose a document type</option>
                  {documentTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              {documents.length ? (
                <div className="sm:col-span-2 rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary">Uploaded Title Documents</p>
                  <div className="mt-3 space-y-2">
                    {documents.map((document) => {
                      const reference = document.publicReference || document._id || '';
                      return (
                        <div key={reference || document.title} className="flex flex-col gap-3 rounded-lg bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-bold">{document.title || document.originalFileName || 'Title document'}</p>
                            <p className="mt-1 text-xs text-secondary">
                              {document.publicReference || 'Reference pending'} - {documentTypeLabel(document.documentType)} - {document.resourceType || 'metadata only'}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => void openTitleDocument(document)}
                            disabled={!reference || openingDocumentId === reference}
                          >
                            {openingDocumentId === reference ? 'Opening...' : 'View'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {documents.length ? (
                <div className="sm:col-span-2 rounded-lg border border-outline-variant/20 p-4">
                  <label className="text-sm font-semibold">
                    Restricted title document
                    <select
                      value={selectedDocumentId}
                      onChange={(event) => setSelectedDocumentId(event.target.value)}
                      className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm"
                    >
                      {documents.map((document) => {
                        const reference = document.publicReference || document._id || '';
                        return <option key={reference} value={reference}>{document.title || documentTypeLabel(document.documentType)} — {reference}</option>;
                      })}
                    </select>
                  </label>
                  <Button type="button" className="mt-3" disabled={submittingVerification || !selectedDocumentId || feeOrder?.state !== 'paid'} onClick={() => void submitForLegalReview()}>
                    {submittingVerification ? 'Submitting…' : 'Submit for legal review'}
                  </Button>
                </div>
              ) : null}
              {!documents.length && !documentsLoading ? <p className="sm:col-span-2 rounded-lg bg-surface-container-low p-4 text-sm text-secondary">No title documents uploaded for this property yet.</p> : null}
              {documentsLoading ? <div className="sm:col-span-2"><LoadingState label="Loading title documents..." /></div> : null}
            </div>
            <div className="mt-5 rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
              <p className="text-sm font-bold">Upload a restricted title document</p>
              <p className="mt-1 text-xs text-secondary">RealtIQ stores the file in the restricted Document Vault. Review submission and fee-order confirmation are separate steps.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <select className="rounded-lg bg-white px-3 py-2 text-sm" value={uploadTitle} disabled={dictionaryLoading || !documentTypeOptions.length || uploading || titleUploadStepUp.busy || Boolean(titleUploadStepUp.challenge)} onChange={(event) => { const option = documentTypeOptions.find((item) => item.label === event.target.value); if (option) { setDocumentType(option.value); setUploadTitle(option.label); } }}>
                  <option value="">Choose a document title</option>{documentTypeOptions.map((option) => <option key={option.value} value={option.label}>{option.label}</option>)}
                </select>
                <input className="rounded-lg bg-white px-3 py-2 text-sm" type="file" accept={TITLE_DOCUMENT_ACCEPT} disabled={uploading || titleUploadStepUp.busy || Boolean(titleUploadStepUp.challenge)} onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} />
                <Button type="button" variant="secondary" onClick={() => void uploadTitleDocument()} disabled={uploading || titleUploadStepUp.busy || Boolean(titleUploadStepUp.challenge) || !uploadFile || uploadOutcomeUnknown}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
            {uploadOutcomeUnknown ? <div role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><p>The upload response was not confirmed. Do not upload the file again until the title-document list has been refreshed.</p><Button type="button" variant="secondary" className="mt-2" onClick={() => void loadDocuments(selectedPropertyPublicReference).then(() => setUploadOutcomeUnknown(false))}>Refresh documents and review</Button></div> : null}
            {titleUploadStepUp.error && !titleUploadStepUp.challenge ? <p role="alert" className="mt-3 text-xs text-error">{titleUploadStepUp.error}</p> : null}
            <p className="mt-3 text-xs text-secondary">Title document formats accepted: PDF, JPEG, PNG, and WebP. PDFs are stored as raw files; images are stored as image files.</p>
            {riskFlags.length ? (
              <div role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-bold">Legal review is required for this title document.</p>
                <ul className="mt-2 space-y-1">
                  {riskFlags.map((flag, index) => <li key={flag._id ?? `${flag.type}-${index}`}>{riskFlagText(flag)}</li>)}
                </ul>
              </div>
            ) : null}
            {submissionError ? <p role="alert" className="mt-3 text-sm text-red-700">{submissionError}</p> : null}
          </section>

          <aside className="rounded-xl bg-surface-container-low p-6">
            <h2 className="text-lg font-bold">Property Title Status</h2>
            <div className="mt-4 space-y-3">
              {ownProperties.map((property) => (
                <div key={propertyRouteReference(property)} className="rounded-lg bg-white p-4">
                  <p className="font-bold">{property.title}</p>
                  <p className="mb-1 text-xs text-secondary">{property.location}</p>
                  <p className="mb-3 text-xs font-semibold text-secondary">{propertyDisplayReference(property)}</p>
                  <TitleVerificationBadge summary={property.titleVerification} context="owner" />
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Submitted Title Verifications</h2>
          {loading ? <LoadingState label="Loading title verifications..." /> : error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-widest text-secondary">
                  <tr><th className="py-3">Document</th><th>Status</th><th>Submitted</th><th>Fingerprint</th><th>Registry</th></tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {verifications.map((item) => (
                    <tr key={item.verificationId}>
                      <td className="py-4" colSpan={5}>
                        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_1fr] md:items-start">
                          <div>{documentTypeLabel(item.documentType)}</div>
                          <div><TitleVerificationBadge summary={{ status: item.status === 'superseded' ? 'revoked' : item.status, badgeLabel: item.badgeLabel, publicVerificationId: item.publicVerificationId ?? undefined, externalAnchorStatus: item.externalAnchorStatus }} context="owner" /></div>
                          <div>{formatDateTime(item.submittedAt)}</div>
                          <div className="break-all font-mono text-xs">{shortenHash(item.submissionHash)}</div>
                          <div>{item.publicVerificationId ? <Link className="font-bold text-primary hover:underline" to={`/title-verification/${item.publicVerificationId}`}>{item.publicVerificationId}</Link> : 'Not published'}</div>
                        </div>
                        {item.publicVerificationId ? <div className="mt-4"><RegistryAuditDetails publicVerificationId={item.publicVerificationId} /></div> : null}
                      </td>
                    </tr>
                  ))}
                  {!verifications.length ? <tr><td className="py-6 text-secondary" colSpan={5}>No title verifications submitted yet.</td></tr> : null}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <StepUpDialog challenge={titleUploadStepUp.challenge} busy={uploading || titleUploadStepUp.busy} error={titleUploadStepUp.error} onCancel={titleUploadStepUp.cancel} onSubmit={submitTitleUploadStepUp} />
        <StepUpDialog challenge={feeOrderStepUp.challenge} busy={feeOrderStepUp.busy} error={feeOrderStepUp.error} onCancel={feeOrderStepUp.cancel} onSubmit={completeFeeOrder} />
      </main>
    </LandlordPortalLayout>
  );
};

export default LandlordTitleVerifications;
