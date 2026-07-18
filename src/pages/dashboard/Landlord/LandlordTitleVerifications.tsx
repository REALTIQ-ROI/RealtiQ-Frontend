import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import RegistryAuditDetails from '../../../components/title/RegistryAuditDetails';
import TitleVerificationBadge from '../../../components/title/TitleVerificationBadge';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import { documentService } from '../../../services/documentService';
import { titleVerificationService } from '../../../services/titleVerificationService';
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
import { documentTypeLabel, formatDateTime, riskFlagText, shortenHash, titleDocumentTypeOptions } from '../../../utils/titleVerification';

const TITLE_DOCUMENT_ACCEPT = '.pdf,image/jpeg,image/png,image/webp';

const LandlordTitleVerifications = () => {
  const { user } = useAuth();
  const { properties, refreshProperties } = useProperties();
  const [searchParams] = useSearchParams();
  const [propertyId, setPropertyId] = useState(searchParams.get('propertyId') ?? '');
  const [documentType, setDocumentType] = useState<TitleDocumentType>('certificate_of_occupancy');
  const [documents, setDocuments] = useState<TitleDocumentRecord[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('Certificate of Occupancy');
  const [uploading, setUploading] = useState(false);
  const [openingDocumentId, setOpeningDocumentId] = useState('');
  const [verifications, setVerifications] = useState<TitleVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskFlags, setRiskFlags] = useState<TitleRiskFlag[]>([]);

  const ownProperties = useMemo(
    () => properties.filter((property) => resolvePropertyOwnerId(property) === user?._id),
    [properties, user?._id],
  );
  const selectedProperty = useMemo(
    () => ownProperties.find((property) => propertyRouteReference(property) === propertyId) ?? null,
    [ownProperties, propertyId],
  );
  const selectedPropertyPublicReference = selectedProperty ? propertyPublicReference(selectedProperty) : '';

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
      toast.error('Select a property with a RealtiQ public reference before uploading.');
      return;
    }
    if (!uploadFile) {
      toast.error('Select a PDF, JPEG, PNG, or WebP title document.');
      return;
    }
    setUploading(true);
    try {
      const response = await documentService.uploadTitleDocument({
        propertyId: selectedPropertyPublicReference,
        documentType,
        title: uploadTitle,
        file: uploadFile,
      });
      const publicReference = response.document.publicReference;
      if (response.verification) {
        setVerifications((current) => {
          const withoutDuplicate = current.filter((item) => item.verificationId !== response.verification?.verificationId);
          return [response.verification, ...withoutDuplicate];
        });
        setRiskFlags(response.verification.riskFlags ?? []);
      }
      toast.success(
        response.verificationExisting
          ? 'Title document uploaded. Existing title review is active.'
          : publicReference
            ? `Title document uploaded as ${publicReference}. Title review pending.`
            : 'Title document uploaded. Title review pending.',
      );
      if (response.riskDetected) {
        toast.warning('Legal review is required for this title document before verification can be published.');
      }
      setUploadFile(null);
      setUploadTitle('Certificate of Occupancy');
      await Promise.all([loadDocuments(selectedPropertyPublicReference), load(), refreshProperties()]);
    } catch (raw) {
      const message = raw instanceof Error ? raw.message : 'Unable to upload title document.';
      toast.error(`${message} Please re-upload using the title document uploader.`);
    } finally {
      setUploading(false);
    }
  };

  const openTitleDocument = async (document: TitleDocumentRecord) => {
    const reference = document.publicReference || document._id;
    if (!reference) {
      toast.error('This document is missing its reference.');
      return;
    }

    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const popup = window.open('about:blank', '_blank');
    setOpeningDocumentId(reference);
    try {
      const response = await documentService.getDocument(reference);
      if (!response.document.fileUrl) {
        throw new Error('This document does not have a viewable file URL.');
      }
      if (popup) {
        popup.opener = null;
        popup.location.href = response.document.fileUrl;
      } else {
        window.open(response.document.fileUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (raw) {
      popup?.close();
      toast.error(raw instanceof Error ? raw.message : 'Unable to open title document.');
    } finally {
      setOpeningDocumentId('');
    }
  };

  return (
    <LandlordPortalLayout active="title-verifications" title="Title Verification">
      <main className="mx-auto max-w-7xl space-y-8 p-4 sm:p-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Title Verification</h1>
          <p className="mt-2 max-w-3xl text-sm text-secondary">Upload restricted title documents for your properties. A title review record is created automatically after upload.</p>
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Upload Title Document</h2>
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
                  onChange={(event) => {
                    const nextType = event.target.value as TitleDocumentType;
                    setDocumentType(nextType);
                    setUploadTitle(titleDocumentTypeOptions.find((option) => option.value === nextType)?.label ?? 'Title Document');
                  }}
                >
                  {titleDocumentTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
              {!documents.length && !documentsLoading ? <p className="sm:col-span-2 rounded-lg bg-surface-container-low p-4 text-sm text-secondary">No title documents uploaded for this property yet.</p> : null}
              {documentsLoading ? <div className="sm:col-span-2"><LoadingState label="Loading title documents..." /></div> : null}
            </div>
            <div className="mt-5 rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
              <p className="text-sm font-bold">Upload a restricted title document</p>
              <p className="mt-1 text-xs text-secondary">The backend stores the file as a restricted Document Vault record and creates the title review automatically.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <select className="rounded-lg bg-white px-3 py-2 text-sm" value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)}>
                  {titleDocumentTypeOptions.map((option) => <option key={option.value} value={option.label}>{option.label}</option>)}
                </select>
                <input className="rounded-lg bg-white px-3 py-2 text-sm" type="file" accept={TITLE_DOCUMENT_ACCEPT} onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} />
                <Button type="button" variant="secondary" onClick={() => void uploadTitleDocument()} disabled={uploading || !selectedPropertyPublicReference}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-secondary">Title document formats accepted: PDF, JPEG, PNG, and WebP. PDFs are stored as raw files; images are stored as image files.</p>
            {riskFlags.length ? (
              <div role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-bold">Legal review is required for this title document.</p>
                <ul className="mt-2 space-y-1">
                  {riskFlags.map((flag, index) => <li key={flag._id ?? `${flag.type}-${index}`}>{riskFlagText(flag)}</li>)}
                </ul>
              </div>
            ) : null}
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
      </main>
    </LandlordPortalLayout>
  );
};

export default LandlordTitleVerifications;
