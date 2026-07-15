import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import PublicLayout from '../../components/layout/PublicLayout';
import Button from '../../components/ui/Button';
import LoadingState from '../../components/ui/LoadingState';
import DocumentMatchUpload from '../../components/title/DocumentMatchUpload';
import { titleVerificationService } from '../../services/titleVerificationService';
import type { PublicRegistryRecord, RegistryIntegrity, RegistryPublicKey } from '../../types';
import { documentTypeLabel, externalAnchorLabel, formatDateTime, shortenHash, titleStatusClasses, titleVerificationDisclaimer } from '../../utils/titleVerification';

const copy = async (value?: string | null) => {
  if (!value) return;
  await navigator.clipboard.writeText(value);
  toast.success('Copied.');
};

const CheckPill = ({ label, value }: { label: string; value?: boolean }) => (
  <div className={`rounded-lg border p-3 text-sm ${value === true ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : value === false ? 'border-red-200 bg-red-50 text-red-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
    <p className="text-xs font-bold uppercase tracking-widest opacity-70">{label}</p>
    <p className="mt-1 font-bold">{value === true ? 'Pass' : value === false ? 'Fail' : 'Unknown'}</p>
  </div>
);

const HashRow = ({ label, value }: { label: string; value?: string | null }) => (
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
  const [integrity, setIntegrity] = useState<RegistryIntegrity | null>(null);
  const [publicKey, setPublicKey] = useState<RegistryPublicKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [recordResponse, integrityResponse, keyResponse] = await Promise.all([
          titleVerificationService.getPublicRegistryRecord(publicVerificationId),
          titleVerificationService.getRegistryIntegrity(publicVerificationId),
          titleVerificationService.getRegistryPublicKey(),
        ]);
        setRecord(recordResponse.record);
        setIntegrity(integrityResponse);
        setPublicKey(keyResponse);
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
  const signatureWarning = integrity?.signatureValid === false;
  const unsigned = record.signatureStatus === 'not_configured';

  return (
    <PublicLayout>
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-8">
        <section className={`rounded-xl border p-6 ${titleStatusClasses(status === 'active' ? 'published' : status)}`}>
          <p className="text-xs font-bold uppercase tracking-widest">RealtiQ Public Title Verification Registry</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{record.publicVerificationId}</h1>
          <p className="mt-3 max-w-3xl text-sm">{record.disclaimer || titleVerificationDisclaimer}</p>
          {status === 'revoked' ? <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-sm font-bold text-red-900">This title verification has been revoked. The record remains visible for registry history.</p> : null}
          {status === 'superseded' ? <p role="status" className="mt-4 rounded-lg bg-slate-200 p-3 text-sm font-bold text-slate-800">This title verification has been superseded by a newer registry record.</p> : null}
          {signatureWarning ? <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-sm font-bold text-red-900">Registry signature validation failed.</p> : null}
          {unsigned ? <p className="mt-4 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">This registry record is unsigned because a public signing key is not configured, but it is still hash-recorded by RealtiQ.</p> : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Registry Record</h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Property</dt><dd className="mt-1 font-bold">{record.property?.title ?? 'Property not listed'}</dd><dd className="text-sm text-secondary">{record.property?.location ?? 'Location not listed'}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Document type</dt><dd className="mt-1">{documentTypeLabel(record.documentType)}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Registry status</dt><dd className="mt-1 capitalize">{record.registryStatus}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Legal review status</dt><dd className="mt-1 capitalize">{record.legalReviewStatus ?? 'approved'}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Sequence number</dt><dd className="mt-1">{record.sequenceNumber ?? 'Not recorded'}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Version</dt><dd className="mt-1">{record.verificationVersion ?? 1}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Approved</dt><dd className="mt-1">{formatDateTime(record.approvedAt)}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Published</dt><dd className="mt-1">{formatDateTime(record.publishedAt)}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Signature</dt><dd className="mt-1">{record.signatureStatus ?? 'not_configured'} · {record.signatureAlgorithm ?? 'No algorithm'}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Signing key</dt><dd className="mt-1">{record.signingKeyId ?? 'Not configured'}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">External anchor</dt><dd className="mt-1">{externalAnchorLabel(record.externalAnchor?.status)}</dd>{record.externalAnchor?.status === 'anchored' && record.externalAnchor.transactionUrl ? <a className="text-sm font-bold text-primary hover:underline" href={record.externalAnchor.transactionUrl} target="_blank" rel="noreferrer">View anchor</a> : null}</div>
                {record.revokedAt ? <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Revoked</dt><dd className="mt-1">{formatDateTime(record.revokedAt)}</dd></div> : null}
                {record.revocationReason ? <div className="sm:col-span-2"><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Revocation reason</dt><dd className="mt-1">{record.revocationReason}</dd></div> : null}
              </dl>
            </section>

            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Hashes and Public URL</h2>
              <dl className="mt-5 grid gap-4">
                <HashRow label="Public verification ID" value={record.publicVerificationId} />
                <HashRow label="Public verification URL" value={record.publicVerificationUrl} />
                <HashRow label="SHA-256 document hash" value={record.documentHash} />
                <HashRow label="Record hash" value={record.recordHash} />
                <HashRow label="Previous record hash" value={record.previousRecordHash} />
              </dl>
            </section>

            <DocumentMatchUpload
              registeredHash={record.documentHash}
              onVerify={(file) => titleVerificationService.verifyRegistryDocument(record.publicVerificationId, file)}
            />
          </div>

          <aside className="space-y-6">
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Integrity Check</h2>
              <div className="mt-4 space-y-3">
                <CheckPill label="Record hash" value={integrity?.recordHashValid} />
                <CheckPill label="Signature" value={integrity?.signatureValid} />
                <CheckPill label="Previous link" value={integrity?.previousRecordLinkValid} />
              </div>
              <p className="mt-4 text-xs text-secondary">These checks only report what the RealtiQ registry endpoint returns.</p>
            </section>

            <section className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Registry Public Key</h2>
                <button className="text-xs font-bold text-primary hover:underline" onClick={() => setShowKey((value) => !value)}>{showKey ? 'Hide' : 'Show'}</button>
              </div>
              <p className="mt-2 text-sm text-secondary">{publicKey?.configured ? `${publicKey.keyId} · ${publicKey.algorithm}` : 'No public signing key is configured.'}</p>
              {showKey ? (
                <div className="mt-4">
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-container-low p-3 text-xs">{publicKey?.publicKey || 'Public key not configured.'}</pre>
                  {publicKey?.publicKey ? <Button className="mt-3" variant="secondary" onClick={() => void copy(publicKey.publicKey)}>Copy Public Key</Button> : null}
                </div>
              ) : null}
            </section>

            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Snapshot Proofs</h2>
              <p className="mt-2 text-sm text-secondary">Daily registry snapshots are available separately and are not required for property purchase.</p>
              <Link className="mt-4 inline-flex font-bold text-primary hover:underline" to="/title-registry/snapshots">Open snapshot utility</Link>
            </section>

            <section className="rounded-xl bg-surface-container-low p-5">
              <h2 className="text-lg font-bold">Short Hashes</h2>
              <p className="mt-2 break-all font-mono text-xs">{shortenHash(record.recordHash, 16)}</p>
            </section>
          </aside>
        </section>
      </main>
    </PublicLayout>
  );
};

export default TitleVerificationRegistry;
