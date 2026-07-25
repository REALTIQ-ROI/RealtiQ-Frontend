import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { escrowErrorDetails, escrowService } from '../../services/escrowService';
import type { Escrow } from '../../types/escrow';
import { populated } from '../../types/escrow';
import { formatDateTime } from './escrowConfig';

const referenceId = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return null;
  const reference = value as { _id?: unknown; id?: unknown };
  if (typeof reference._id === 'string') return reference._id;
  return typeof reference.id === 'string' ? reference.id : null;
};

const partyName = (value: unknown) => {
  const party = populated(value as { _id: string; name?: string } | string | null);
  return party?.name ?? (typeof value === 'string' ? 'Participant' : 'Unknown');
};

const EscrowDisputePanel = ({
  escrow,
  onChanged,
}: {
  escrow: Escrow;
  onChanged: () => void | Promise<unknown>;
}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [evidenceLabel, setEvidenceLabel] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = referenceId(user);
  const buyerId = referenceId(escrow.buyer ?? escrow.buyerId);
  const sellerId = referenceId(escrow.seller ?? escrow.sellerId);
  const participant = Boolean(
    user && userId && (
      (user.role === 'buyer' && buyerId === userId) ||
      (user.role === 'landlord' && sellerId === userId)
    ),
  );
  const canOpen = participant && ['locked', 'release_pending'].includes(escrow.status);
  const disputes = useMemo(
    () => [...(escrow.disputes ?? [])].sort(
      (left, right) => Date.parse(right.openedAt) - Date.parse(left.openedAt),
    ),
    [escrow.disputes],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanReason = reason.trim();
    if (!cleanReason) {
      setError('Reason is required.');
      return;
    }
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await escrowService.dispute(escrow._id, {
        reason: cleanReason,
        description: description.trim() || undefined,
        evidence: documentId.trim()
          ? [{ documentId: documentId.trim(), label: evidenceLabel.trim() || 'Escrow evidence' }]
          : [],
        metadata: { source: 'escrow_detail' },
      });
      setReason('');
      setDescription('');
      setDocumentId('');
      setEvidenceLabel('');
      setOpen(false);
      toast.success('Dispute opened for administrator review.');
      await onChanged();
    } catch (raw) {
      const requestError = escrowErrorDetails(raw);
      setError(requestError.message);
      if (requestError.status === 409) await onChanged();
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="rounded-xl bg-white p-5 sm:p-7" aria-labelledby="escrow-disputes-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="escrow-disputes-title" className="text-xl font-bold">Disputes</h2>
          <p className="mt-1 text-sm text-secondary">
            A dispute pauses normal release while RealtiQ reviews the transaction. Completed milestone progress remains unchanged.
          </p>
        </div>
        {canOpen ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-800"
          >
            {open ? 'Close dispute form' : 'Raise dispute'}
          </button>
        ) : null}
      </div>

      {escrow.status === 'disputed' ? (
        <p role="status" className="mt-4 rounded-lg bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          Dispute under review. Normal milestone mutations and release actions are paused.
        </p>
      ) : null}

      {open && canOpen ? (
        <form className="mt-5 space-y-4 rounded-xl border border-outline-variant/20 p-4" onSubmit={(event) => void submit(event)}>
          <label className="block text-sm font-bold">
            Reason
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1 w-full rounded-lg border border-outline-variant/30 p-3 font-normal"
              maxLength={200}
              required
            />
          </label>
          <label className="block text-sm font-bold">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 w-full rounded-lg border border-outline-variant/30 p-3 font-normal"
              rows={4}
              maxLength={2000}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold">
              Existing document ID (optional)
              <input
                value={documentId}
                onChange={(event) => setDocumentId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-outline-variant/30 p-3 font-normal"
                autoComplete="off"
              />
            </label>
            <label className="block text-sm font-bold">
              Evidence label
              <input
                value={evidenceLabel}
                onChange={(event) => setEvidenceLabel(event.target.value)}
                className="mt-1 w-full rounded-lg border border-outline-variant/30 p-3 font-normal"
              />
            </label>
          </div>
          <p className="text-xs text-secondary">Use an existing safe document reference. This form does not upload arbitrary files.</p>
          {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
          <button type="submit" disabled={pending} className="rounded-lg bg-red-700 px-4 py-3 font-bold text-white disabled:opacity-50">
            {pending ? 'Submitting dispute...' : 'Submit dispute'}
          </button>
        </form>
      ) : null}

      <div className="mt-5 space-y-3">
        {disputes.map((dispute) => (
          <article key={dispute._id} className="rounded-xl border border-outline-variant/20 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{dispute.reason}</strong>
              <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold capitalize">
                {dispute.status.replaceAll('_', ' ')}
              </span>
            </div>
            {dispute.description ? <p className="mt-2 text-secondary">{dispute.description}</p> : null}
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <div><dt className="font-bold">Opened by</dt><dd>{partyName(dispute.raisedBy)}</dd></div>
              <div><dt className="font-bold">Opened</dt><dd>{formatDateTime(dispute.openedAt)}</dd></div>
              <div><dt className="font-bold">Pre-dispute status</dt><dd className="capitalize">{dispute.preDisputeStatus.replaceAll('_', ' ')}</dd></div>
              <div><dt className="font-bold">Resolution</dt><dd className="capitalize">{dispute.resolution?.replaceAll('_', ' ') ?? 'Pending'}</dd></div>
            </dl>
            {dispute.resolutionReason ? <p className="mt-3 rounded-lg bg-surface-container-low p-3"><strong>Resolution reason:</strong> {dispute.resolutionReason}</p> : null}
            {dispute.resolvedAt ? <p className="mt-2 text-xs text-secondary">Resolved {formatDateTime(dispute.resolvedAt)}</p> : null}
            {dispute.evidence?.length ? (
              <ul className="mt-3 space-y-1 text-xs text-secondary">
                {dispute.evidence.map((item, index) => (
                  <li key={`${dispute._id}-evidence-${index}`}>
                    Evidence: {typeof item.label === 'string' ? item.label : 'Referenced record'}
                    {typeof item.documentId === 'string' ? ` (${item.documentId})` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
        {!disputes.length ? <p className="rounded-lg bg-surface-container-low p-4 text-sm text-secondary">No disputes have been opened for this escrow.</p> : null}
      </div>
    </section>
  );
};

export default EscrowDisputePanel;
