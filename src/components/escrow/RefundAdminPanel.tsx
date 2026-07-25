import { useState } from 'react';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { escrowErrorDetails, escrowService } from '../../services/escrowService';
import type { Escrow } from '../../types/escrow';
import { escrowBuyer, escrowProperty } from '../../types/escrow';
import { formatEscrowMoney } from './escrowConfig';

const RefundAdminPanel = ({
  escrow,
  onChanged,
}: {
  escrow: Escrow;
  onChanged: () => Promise<unknown>;
}) => {
  const [pending, setPending] = useState(false);
  const [attention, setAttention] = useState<string | null>(null);
  const buyer = escrowBuyer(escrow);
  const property = escrowProperty(escrow);
  const terminal = escrow.refundStatus === 'completed' || ['refunded', 'cancelled_refunded'].includes(escrow.status);
  const processing = escrow.refundStatus === 'processing' || ['refund_processing', 'cancellation_pending_refund'].includes(escrow.status);

  const process = async () => {
    if (pending || terminal || processing) return;
    const confirmed = await Swal.fire({
      title: escrow.refundStatus === 'failed' ? 'Retry buyer refund?' : 'Process buyer refund?',
      text: `${buyer?.name ?? 'Buyer'} · ${property?.title ?? 'Property'} · ${formatEscrowMoney(escrow.amount, escrow.currency ?? property?.currency)}. Paystack will first attempt the original payment transaction.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: escrow.refundStatus === 'failed' ? 'Retry refund' : 'Process refund',
      confirmButtonColor: '#b42318',
    });
    if (!confirmed.isConfirmed) return;
    setPending(true);
    setAttention(null);
    try {
      const result = await escrowService.processRefund(escrow._id);
      toast.success(result.status === 202 ? 'Buyer refund is processing.' : 'Refund state refreshed.');
      await onChanged();
    } catch (raw) {
      const error = escrowErrorDetails(raw);
      if (error.requiresAccountDetails) {
        setAttention('Buyer account details are required. Request them through the refund conversation; administrators cannot enter another user’s bank account.');
      } else {
        setAttention(error.message);
      }
      if (error.status === 409) await onChanged();
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="rounded-xl bg-white p-5 sm:p-7" aria-labelledby="admin-refund-title">
      <h2 id="admin-refund-title" className="text-xl font-bold">Admin refund processing</h2>
      <p className="mt-2 text-sm text-secondary">
        Refunds return through the original Paystack transaction first. Buyer bank details are requested only when the backend reports they are required.
      </p>
      {attention ? <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{attention}</p> : null}
      {escrow.refundStatus === 'needs_account_details' ? (
        <a href="#refund-chat" className="mt-4 inline-flex rounded-lg border border-primary px-4 py-2 font-bold text-primary">
          Open refund detail request
        </a>
      ) : null}
      {processing ? <p role="status" className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Provider confirmation is pending. Do not retry this financial action until RealtiQ receives confirmation.</p> : null}
      {terminal ? <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">The backend has confirmed that the buyer refund is complete.</p> : null}
      {!processing && !terminal ? (
        <button type="button" disabled={pending} onClick={() => void process()} className="mt-4 rounded-lg bg-red-700 px-4 py-3 font-bold text-white disabled:opacity-50">
          {pending ? 'Submitting...' : escrow.refundStatus === 'failed' ? 'Retry refund' : 'Process refund'}
        </button>
      ) : null}
    </section>
  );
};

export default RefundAdminPanel;
