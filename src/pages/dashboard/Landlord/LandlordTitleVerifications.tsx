import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import TitleVerificationBadge from '../../../components/title/TitleVerificationBadge';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import { ApiRequestError } from '../../../lib/axios';
import { titleVerificationService, type TitleVerificationConflictDetails } from '../../../services/titleVerificationService';
import { resolveOwnerId, type TitleDocumentType, type TitleRiskFlag, type TitleVerification } from '../../../types';
import { documentTypeLabel, formatDateTime, riskFlagText, shortenHash, titleDocumentTypeOptions } from '../../../utils/titleVerification';

const LandlordTitleVerifications = () => {
  const { user } = useAuth();
  const { properties, refreshProperties } = useProperties();
  const [searchParams] = useSearchParams();
  const [propertyId, setPropertyId] = useState(searchParams.get('propertyId') ?? '');
  const [documentId, setDocumentId] = useState('');
  const [documentType, setDocumentType] = useState<TitleDocumentType>('certificate_of_occupancy');
  const [verifications, setVerifications] = useState<TitleVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictFlags, setConflictFlags] = useState<TitleRiskFlag[]>([]);

  const ownProperties = useMemo(
    () => properties.filter((property) => resolveOwnerId(property.ownerId) === user?._id),
    [properties, user?._id],
  );

  useEffect(() => {
    if (!propertyId && ownProperties[0]?._id) setPropertyId(ownProperties[0]._id);
  }, [ownProperties, propertyId]);

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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setConflictFlags([]);
    if (!propertyId) {
      toast.error('Select one of your properties.');
      return;
    }
    if (!ownProperties.some((property) => property._id === propertyId)) {
      toast.error('You can only submit title documents for your own properties.');
      return;
    }
    if (!documentId.trim()) {
      toast.error('Enter an existing Document Vault document ID.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await titleVerificationService.submitTitleVerification({
        propertyId,
        documentId: documentId.trim(),
        documentType,
        metadata: { source: 'landlord_dashboard' },
      });
      toast.success(response.existing ? 'This title verification is already active.' : 'Title verification submitted for legal review.');
      setDocumentId('');
      setDocumentType('certificate_of_occupancy');
      await Promise.all([load(), refreshProperties()]);
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.status === 409) {
        const details = raw.details as TitleVerificationConflictDetails | undefined;
        setConflictFlags(details?.riskFlags ?? []);
        toast.error(raw.message);
      } else {
        toast.error(raw instanceof Error ? raw.message : 'Unable to submit title verification.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LandlordPortalLayout active="title-verifications" title="Title Verification">
      <main className="mx-auto max-w-7xl space-y-8 p-4 sm:p-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Title Verification</h1>
          <p className="mt-2 max-w-3xl text-sm text-secondary">
            Submit an existing Document Vault title document for RealtiQ legal review. The backend hashes the exact stored document bytes with SHA-256.
          </p>
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <form className="rounded-xl bg-white p-6 shadow-sm" onSubmit={(event) => void submit(event)}>
            <h2 className="text-xl font-bold">Submit Title Document</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Property
                <select className="mt-1 w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm" value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
                  {ownProperties.map((property) => (
                    <option key={property._id} value={property._id}>{property.title}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Document Type
                <select className="mt-1 w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm" value={documentType} onChange={(event) => setDocumentType(event.target.value as TitleDocumentType)}>
                  {titleDocumentTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="sm:col-span-2 text-sm font-semibold">
                Existing Document Vault ID
                <input className="mt-1 w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm" value={documentId} onChange={(event) => setDocumentId(event.target.value)} placeholder="Paste the stored document ID" />
              </label>
            </div>
            <p className="mt-3 text-xs text-secondary">Title document formats accepted by verification checks: PDF, JPEG, PNG, and WebP. Do not upload raw title files here.</p>
            {conflictFlags.length ? (
              <div role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-bold">A matching title-document fingerprint already exists and requires legal review.</p>
                <ul className="mt-2 space-y-1">
                  {conflictFlags.map((flag, index) => <li key={flag._id ?? `${flag.type}-${index}`}>{riskFlagText(flag)}</li>)}
                </ul>
              </div>
            ) : null}
            <Button className="mt-5" type="submit" disabled={submitting || !ownProperties.length}>{submitting ? 'Submitting...' : 'Submit for Legal Review'}</Button>
          </form>

          <aside className="rounded-xl bg-surface-container-low p-6">
            <h2 className="text-lg font-bold">Property Title Status</h2>
            <div className="mt-4 space-y-3">
              {ownProperties.map((property) => (
                <div key={property._id} className="rounded-lg bg-white p-4">
                  <p className="font-bold">{property.title}</p>
                  <p className="mb-3 text-xs text-secondary">{property.location}</p>
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
                      <td className="py-4">{documentTypeLabel(item.documentType)}</td>
                      <td className="py-4"><TitleVerificationBadge summary={{ status: item.status === 'superseded' ? 'revoked' : item.status, badgeLabel: item.badgeLabel, publicVerificationId: item.publicVerificationId ?? undefined, externalAnchorStatus: item.externalAnchorStatus }} context="owner" /></td>
                      <td className="py-4">{formatDateTime(item.submittedAt)}</td>
                      <td className="py-4 font-mono text-xs">{shortenHash(item.submissionHash)}</td>
                      <td className="py-4">{item.publicVerificationId ? <Link className="font-bold text-primary hover:underline" to={`/title-verification/${item.publicVerificationId}`}>{item.publicVerificationId}</Link> : 'Not published'}</td>
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
