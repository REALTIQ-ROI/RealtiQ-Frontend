import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import Button from '../ui/Button';
import LoadingState from '../ui/LoadingState';
import { titleVerificationService } from '../../services/titleVerificationService';
import type { PublicRegistryRecord, RegistryIntegrity, RegistryPublicKey } from '../../types';
import { externalAnchorLabel, formatDateTime, shortenHash } from '../../utils/titleVerification';

interface RegistryAuditDetailsProps {
  publicVerificationId?: string | null;
}

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

const ValueRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="rounded-lg bg-surface-container-low p-3">
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[10px] font-bold uppercase tracking-widest text-secondary">{label}</dt>
      {typeof value === 'string' && value ? <button className="text-[10px] font-bold text-primary hover:underline" onClick={() => void copy(value)}>Copy</button> : null}
    </div>
    <dd className="mt-1 break-all font-mono text-xs">{value ?? 'Not recorded'}</dd>
  </div>
);

const RegistryAuditDetails = ({ publicVerificationId }: RegistryAuditDetailsProps) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<PublicRegistryRecord | null>(null);
  const [integrity, setIntegrity] = useState<RegistryIntegrity | null>(null);
  const [publicKey, setPublicKey] = useState<RegistryPublicKey | null>(null);
  const [showKey, setShowKey] = useState(false);

  const load = async () => {
    if (!publicVerificationId || loading || record) return;
    setLoading(true);
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
      toast.error(raw instanceof Error ? raw.message : 'Unable to load registry audit details.');
    } finally {
      setLoading(false);
    }
  };

  if (!publicVerificationId) return null;

  return (
    <section className="rounded-xl border border-outline-variant/20 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">Registry Audit Details</h3>
          <p className="mt-1 text-xs text-secondary">Full technical proof for internal review.</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const next = !expanded;
            setExpanded(next);
            if (next) void load();
          }}
        >
          {expanded ? 'Hide Details' : 'Show Details'}
        </Button>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-4">
          {loading ? <LoadingState label="Loading registry audit details..." /> : null}
          {record ? (
            <>
              <dl className="grid gap-3">
                <ValueRow label="Public verification ID" value={record.publicVerificationId} />
                <ValueRow label="Public verification URL" value={record.publicVerificationUrl} />
                <ValueRow label="Document hash" value={record.documentHash} />
                <ValueRow label="Record hash" value={record.recordHash} />
                <ValueRow label="Previous record hash" value={record.previousRecordHash} />
                <ValueRow label="Sequence number" value={record.sequenceNumber} />
                <ValueRow label="Version" value={record.verificationVersion} />
                <ValueRow label="Signature status" value={record.signatureStatus} />
                <ValueRow label="Signature algorithm" value={record.signatureAlgorithm} />
                <ValueRow label="Signing key ID" value={record.signingKeyId} />
                <ValueRow label="Approved" value={formatDateTime(record.approvedAt)} />
                <ValueRow label="Published" value={formatDateTime(record.publishedAt)} />
                <ValueRow label="External anchor" value={externalAnchorLabel(record.externalAnchor?.status)} />
                <ValueRow label="External transaction" value={record.externalAnchor?.transactionUrl} />
              </dl>

              <div className="grid gap-3 sm:grid-cols-3">
                <CheckPill label="Record hash" value={integrity?.recordHashValid} />
                <CheckPill label="Signature" value={integrity?.signatureValid} />
                <CheckPill label="Previous link" value={integrity?.previousRecordLinkValid} />
              </div>

              <div className="rounded-lg bg-surface-container-low p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">Registry Public Key</p>
                    <p className="mt-1 text-xs text-secondary">{publicKey?.configured ? `${publicKey.keyId} - ${publicKey.algorithm}` : 'No public signing key is configured.'}</p>
                  </div>
                  <button className="text-xs font-bold text-primary hover:underline" onClick={() => setShowKey((value) => !value)}>{showKey ? 'Hide' : 'Show'}</button>
                </div>
                {showKey ? (
                  <div className="mt-3">
                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs">{publicKey?.publicKey || 'Public key not configured.'}</pre>
                    {publicKey?.publicKey ? <Button className="mt-3" variant="secondary" onClick={() => void copy(publicKey.publicKey)}>Copy Public Key</Button> : null}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link className="font-bold text-primary hover:underline" to={`/title-verification/${record.publicVerificationId}`}>Open public registry page</Link>
                <Link className="font-bold text-primary hover:underline" to="/title-registry/snapshots">Open snapshot utility</Link>
                <span className="text-xs text-secondary">Short hash: {shortenHash(record.recordHash, 16)}</span>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default RegistryAuditDetails;
