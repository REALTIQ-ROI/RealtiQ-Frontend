import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import PublicLayout from '../../components/layout/PublicLayout';
import LoadingState from '../../components/ui/LoadingState';
import DocumentMatchUpload from '../../components/title/DocumentMatchUpload';
import { titleVerificationService } from '../../services/titleVerificationService';
import type { PublicRegistryRecord } from '../../types';
import { documentTypeLabel, formatDateTime, titleStatusClasses, titleVerificationDisclaimer } from '../../utils/titleVerification';

const copy = async (value?: string | null) => {
  if (!value) return;
  await navigator.clipboard.writeText(value);
  toast.success('Copied.');
};

const PublicReferenceRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="rounded-lg bg-surface-container-low p-4">
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs font-bold uppercase tracking-widest text-secondary">{label}</dt>
      {value ? <button className="text-xs font-bold text-primary hover:underline" onClick={() => void copy(value)}>Copy</button> : null}
    </div>
    <dd className="mt-2 break-all font-mono text-xs">{value ?? 'Not recorded'}</dd>
  </div>
);

const TitleVerificationRegistry = () => {
  const { publicVerificationId = '' } = useParams();
  const [record, setRecord] = useState<PublicRegistryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await titleVerificationService.getPublicRegistryRecord(publicVerificationId);
        setRecord(response.record);

        /*
         * Technical audit endpoints intentionally hidden from buyer-facing registry.
         * Restore these calls only for an advanced audit view:
         * - titleVerificationService.getRegistryIntegrity(publicVerificationId)
         * - titleVerificationService.getRegistryPublicKey()
         */
      } catch (raw) {
        setError(raw instanceof Error ? raw.message : 'Title registry record not found.');
      } finally {
        setLoading(false);
      }
    };
    if (publicVerificationId) void load();
  }, [publicVerificationId]);

  if (loading) return <PublicLayout><LoadingState label="Loading title registry record..." /></PublicLayout>;
  if (error || !record) {
    return (
      <PublicLayout>
        <main className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h1 className="text-3xl font-bold">Title registry record not found</h1>
          <p className="mt-3 text-secondary">{error ?? 'We could not load this public verification ID.'}</p>
          <Link className="mt-6 inline-flex font-bold text-primary hover:underline" to="/properties">Browse properties</Link>
        </main>
      </PublicLayout>
    );
  }

  const status = record.registryStatus;

  return (
    <PublicLayout>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-8">
        <section className={`rounded-xl border p-6 ${titleStatusClasses(status === 'active' ? 'published' : status)}`}>
          <p className="text-xs font-bold uppercase tracking-widest">RealtiQ Public Title Verification Registry</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{record.publicVerificationId}</h1>
          <p className="mt-3 max-w-3xl text-sm">{record.disclaimer || titleVerificationDisclaimer}</p>
          {status === 'revoked' ? <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-sm font-bold text-red-900">This title verification has been revoked. The record remains visible for registry history.</p> : null}
          {status === 'superseded' ? <p role="status" className="mt-4 rounded-lg bg-slate-200 p-3 text-sm font-bold text-slate-800">This title verification has been superseded by a newer registry record.</p> : null}

          {/* Technical signature warnings hidden from buyer-facing registry. */}
          {/* {signatureWarning ? <p role="alert">Registry signature validation failed.</p> : null} */}
          {/* {unsigned ? <p>This registry record is unsigned because a public signing key is not configured.</p> : null} */}
        </section>

        <section className="space-y-6">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Registry Record</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-secondary">Property</dt>
                <dd className="mt-1 font-bold">{record.property?.title ?? 'Property not listed'}</dd>
                <dd className="text-sm text-secondary">{record.property?.location ?? 'Location not listed'}</dd>
                <dd className="text-xs font-semibold text-secondary">{record.property?.publicReference ?? 'Reference pending'}</dd>
              </div>
              <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Document type</dt><dd className="mt-1">{documentTypeLabel(record.documentType)}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Registry status</dt><dd className="mt-1 capitalize">{record.registryStatus}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Legal review status</dt><dd className="mt-1 capitalize">{record.legalReviewStatus ?? 'approved'}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Approved</dt><dd className="mt-1">{formatDateTime(record.approvedAt)}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Published</dt><dd className="mt-1">{formatDateTime(record.publishedAt)}</dd></div>

              {/* Technical audit fields hidden from buyer-facing registry. */}
              {/* <div><dt>Sequence number</dt><dd>{record.sequenceNumber ?? 'Not recorded'}</dd></div> */}
              {/* <div><dt>Version</dt><dd>{record.verificationVersion ?? 1}</dd></div> */}
              {/* <div><dt>Signature</dt><dd>{record.signatureStatus ?? 'not_configured'} - {record.signatureAlgorithm ?? 'No algorithm'}</dd></div> */}
              {/* <div><dt>Signing key</dt><dd>{record.signingKeyId ?? 'Not configured'}</dd></div> */}
              {/* <div><dt>External anchor</dt><dd>{record.externalAnchor?.status ?? 'not_configured'}</dd></div> */}

              {record.revokedAt ? <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Revoked</dt><dd className="mt-1">{formatDateTime(record.revokedAt)}</dd></div> : null}
              {record.revocationReason ? <div className="sm:col-span-2"><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Revocation reason</dt><dd className="mt-1">{record.revocationReason}</dd></div> : null}
            </dl>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Public Verification</h2>
            <dl className="mt-5 grid gap-4">
              <PublicReferenceRow label="Public verification ID" value={record.publicVerificationId} />
              <PublicReferenceRow label="Public verification URL" value={record.publicVerificationUrl} />

              {/* Technical hashes hidden from buyer-facing registry. */}
              {/* <PublicReferenceRow label="SHA-256 document hash" value={record.documentHash} /> */}
              {/* <PublicReferenceRow label="Record hash" value={record.recordHash} /> */}
              {/* <PublicReferenceRow label="Previous record hash" value={record.previousRecordHash} /> */}
            </dl>
          </section>

          <DocumentMatchUpload
            registeredHash={record.documentHash}
            onVerify={(file) => titleVerificationService.verifyRegistryDocument(record.publicVerificationId, file)}
          />

          {/* Technical audit sidebar hidden from buyer-facing registry. */}
          {/* <aside>
            <section>
              <h2>Integrity Check</h2>
              <CheckPill label="Record hash" value={integrity?.recordHashValid} />
              <CheckPill label="Signature" value={integrity?.signatureValid} />
              <CheckPill label="Previous link" value={integrity?.previousRecordLinkValid} />
            </section>

            <section>
              <h2>Registry Public Key</h2>
              <pre>{publicKey?.publicKey || 'Public key not configured.'}</pre>
            </section>

            <section>
              <h2>Snapshot Proofs</h2>
              <Link to="/title-registry/snapshots">Open snapshot utility</Link>
            </section>

            <section>
              <h2>Short Hashes</h2>
              <p>{shortenHash(record.recordHash, 16)}</p>
            </section>
          </aside> */}
        </section>
      </main>
    </PublicLayout>
  );
};

export default TitleVerificationRegistry;
