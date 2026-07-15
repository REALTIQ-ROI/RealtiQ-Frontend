import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import PublicLayout from '../../components/layout/PublicLayout';
import Button from '../../components/ui/Button';
import { titleVerificationService } from '../../services/titleVerificationService';
import type { RegistrySnapshot, RegistrySnapshotManifest } from '../../types';
import { formatDateTime, shortenHash } from '../../utils/titleVerification';

const today = () => new Date().toISOString().slice(0, 10);

const TitleRegistrySnapshots = () => {
  const [date, setDate] = useState(today());
  const [snapshot, setSnapshot] = useState<RegistrySnapshot | null>(null);
  const [manifest, setManifest] = useState<RegistrySnapshotManifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [manifestLoaded, setManifestLoaded] = useState(false);

  const loadSnapshot = async (event?: FormEvent) => {
    event?.preventDefault();
    setLoading(true);
    setManifest(null);
    setManifestLoaded(false);
    try {
      const next = await titleVerificationService.getRegistrySnapshot(date);
      setSnapshot(next);
    } catch (raw) {
      setSnapshot(null);
      toast.error(raw instanceof Error ? raw.message : 'Unable to load snapshot.');
    } finally {
      setLoading(false);
    }
  };

  const loadManifest = async () => {
    setLoading(true);
    try {
      const next = await titleVerificationService.getRegistrySnapshotManifest(date);
      setManifest(next);
      setManifestLoaded(true);
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to load snapshot manifest.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-8">
        <section>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Title Registry Snapshot Proofs</h1>
          <p className="mt-2 max-w-3xl text-sm text-secondary">Inspect daily RealtiQ registry snapshot hashes and manifests. Snapshots are separate from the main property purchase workflow.</p>
        </section>
        <form className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm sm:flex-row sm:items-end" onSubmit={(event) => void loadSnapshot(event)}>
          <label className="flex-1 text-sm font-semibold">Snapshot date
            <input className="mt-1 w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <Button type="submit" disabled={loading}>{loading ? 'Loading...' : 'Load Snapshot'}</Button>
        </form>
        {snapshot ? (
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Snapshot Proof</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Record count</dt><dd className="mt-1">{snapshot.recordCount ?? 0}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Sequence range</dt><dd className="mt-1">{snapshot.firstSequenceNumber ?? 'N/A'} - {snapshot.lastSequenceNumber ?? 'N/A'}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Generated</dt><dd className="mt-1">{formatDateTime(snapshot.generatedAt)}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Signature</dt><dd className="mt-1">{snapshot.signatureStatus ?? 'not_configured'} · {snapshot.signingKeyId ?? 'No key'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Snapshot hash</dt><dd className="mt-1 break-all font-mono text-xs">{snapshot.snapshotHash ?? 'Not recorded'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs font-bold uppercase tracking-widest text-secondary">Previous snapshot hash</dt><dd className="mt-1 break-all font-mono text-xs">{snapshot.previousSnapshotHash ?? 'Not recorded'}</dd></div>
            </dl>
            <Button className="mt-5" variant="secondary" disabled={loading || manifestLoaded} onClick={() => void loadManifest()}>{manifestLoaded ? 'Manifest Loaded' : 'Load Manifest'}</Button>
          </section>
        ) : null}
        {manifest ? (
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Snapshot Manifest</h2>
            <p className="mt-2 text-sm text-secondary">{manifest.records.length} public record hashes for {manifest.snapshotDate}.</p>
            <div className="mt-5 max-h-[520px] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-widest text-secondary"><tr><th className="py-3">Public ID</th><th>Sequence</th><th>Record hash</th></tr></thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {manifest.records.map((record) => (
                    <tr key={record.publicVerificationId}>
                      <td className="py-3 font-bold text-primary">{record.publicVerificationId}</td>
                      <td className="py-3">{record.sequenceNumber}</td>
                      <td className="py-3 font-mono text-xs">{shortenHash(record.recordHash, 18)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </main>
    </PublicLayout>
  );
};

export default TitleRegistrySnapshots;
