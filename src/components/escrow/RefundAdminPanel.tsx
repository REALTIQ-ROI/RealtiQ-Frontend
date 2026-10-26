import { useState } from 'react';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { escrowErrorDetails, escrowService } from '../../services/escrowService';
import type { Escrow } from '../../types/escrow';
import { escrowBuyer, escrowProperty } from '../../types/escrow';
import StepUpDialog from '../auth/StepUpDialog';
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
  const stepUp = useBoundStepUp<Awaited<ReturnType<typeof escrowService.processRefund>>>();
  const buyer = escrowBuyer(escrow);
  const property = escrowProperty(escrow);
  const terminal = escrow.refundStatus === 'completed' || ['refunded', 'cancelled_refunded'].includes(escrow.status);
  const processing = escrow.refundStatus === 'processing' || ['refund_processing', 'cancellation_pending_refund'].includes(escrow.status);

  const process = async () => {
    if (pending || stepUp.busy || stepUp.challenge || terminal || processing) return;
    const confirmed = await Swal.fire({
      title: escrow.refundStatus === 'failed' ? 'Retry buyer refund?' : 'Process buyer refund?',
      text: `${buyer?.name ?? 'Buyer'} · ${property?.title ?? 'Property'} · ${formatEscrowMoney(escrow.amount, escrow.currency ?? property?.currency)}. Paystack will first attempt the original payment transaction.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: escrow.refundStatus === 'failed' ? 'Retry refund' : 'Process refund',
      confirmButtonColor: '#b42318',
    });
    if (!confirmed.isConfirmed) return;
    setAttention(null);
    const started = await stepUp.begin({
      method: 'POST',
      path: `/api/admin/escrows/${encodeURIComponent(escrow._id)}/process-refund`,
      body: {},
      label: 'Retry the eligible buyer refund through the original payment provider',
      execute: (challengeId) => escrowService.processRefund(escrow._id, challengeId),
    });
    if (!started) setAttention(stepUp.getError() ?? 'Unable to start the secure refund action.');
  };

  const submitStepUp = async (code: string): Promise<boolean> => {
    setPending(true);
    setAttention(null);
    try {
      const result = await stepUp.complete(code);
      if (!result.ok) {
        const error = escrowErrorDetails(result.error ?? stepUp.error ?? 'The refund request could not be completed.');
        setAttention(error.requiresAccountDetails
          ? 'Buyer account details are required. Request them through the refund conversation; administrators cannot enter another user’s bank account.'
          : error.message);
        await onChanged();
        return false;
      }
      toast.info(result.value.status === 202
        ? 'Buyer refund is pending provider confirmation. Do not submit another refund while it is processing.'
        : 'Refund response received. The current escrow state has been refreshed.');
      await onChanged();
      return true;
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="rounded-xl bg-white p-5 sm:p-7" aria-labelledby="admin-refund-title">
      <h2 id="admin-refund-title" className="text-xl font-bold">Admin refund processing</h2>
      <p className="mt-2 text-sm text-secondary">
        Refunds return through the original Paystack transaction first. Buyer bank details are requested only when RealtIQ indicates they are required.
      </p>
      {attention || stepUp.error ? <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{attention ?? stepUp.error}</p> : null}
      {escrow.refundStatus === 'needs_account_details' ? (
        <a href="#refund-chat" className="mt-4 inline-flex rounded-lg border border-primary px-4 py-2 font-bold text-primary">
          Open refund detail request
        </a>
      ) : null}
      {processing ? <p role="status" className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Provider confirmation is pending. Do not retry this financial action until RealtIQ receives confirmation.</p> : null}
      {terminal ? <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">RealtIQ has confirmed that the buyer refund is complete.</p> : null}
      {!processing && !terminal ? (
        <button type="button" disabled={pending || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void process()} className="mt-4 rounded-lg bg-red-700 px-4 py-3 font-bold text-white disabled:opacity-50">
          {pending || stepUp.busy ? 'Preparing secure action...' : escrow.refundStatus === 'failed' ? 'Retry refund' : 'Process refund'}
        </button>
      ) : null}
      <StepUpDialog challenge={stepUp.challenge} busy={pending || stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={submitStepUp} />
    </section>
  );
};

export default RefundAdminPanel;
