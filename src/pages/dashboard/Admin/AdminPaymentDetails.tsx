import { useCallback, useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import AdminLayout from '../../../components/layout/AdminLayout';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { paymentService } from '../../../services/paymentService';
import type { ApiPayment } from '../../../types';

const formatNGN = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const statusBadge = (status: ApiPayment['status']) => {
  const cfg: Record<ApiPayment['status'], string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
    canceled: 'bg-slate-100 text-slate-700',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize ${cfg[status]}`}>
      {status}
    </span>
  );
};

const AdminPaymentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [payment, setPayment] = useState<ApiPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const cancelStepUp = useBoundStepUp<Awaited<ReturnType<typeof paymentService.cancelPayment>>>();
  const requestSequence = useRef(0);
  const paymentIdRef = useRef(id);
  paymentIdRef.current = id;
  const cancelPendingChallenge = cancelStepUp.cancel;

  const refreshPayment = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (!id) { setError('No payment ID provided.'); setLoading(false); return; }
    setLoading(true);
    setError(null);
    setPayment(null);
    try {
      const nextPayment = await paymentService.getPaymentById(id);
      if (requestId === requestSequence.current) setPayment(nextPayment);
    } catch (err) {
      if (requestId === requestSequence.current) setError(err instanceof Error ? err.message : 'Payment not found.');
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cancelPendingChallenge();
    void refreshPayment();
    return () => { requestSequence.current += 1; cancelPendingChallenge(); };
  }, [cancelPendingChallenge, refreshPayment]);

  const handleVerify = async () => {
    if (!payment) return;
    const requestId = requestSequence.current;
    const confirmed = await Swal.fire({
      title: 'Verify Payment?',
      text: 'This will check payment status with Paystack',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Verify',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#000000',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });
    if (!confirmed.isConfirmed || requestSequence.current !== requestId) return;

    setVerifying(true);
    try {
      const result = await paymentService.verifyPayment(payment.reference);
      if (requestSequence.current !== requestId) return;
      if (result.verified) {
        toast.success('Provider verification completed. Refreshing the authorized payment record.');
        const refreshed = await paymentService.getPaymentById(payment._id || payment.reference);
        if (requestSequence.current === requestId) setPayment(refreshed);
      } else {
        toast.info('The provider has not confirmed payment yet. No success or failure is assumed.');
        const refreshed = await paymentService.getPaymentById(payment._id || payment.reference);
        if (requestSequence.current === requestId) setPayment(refreshed);
      }
    } catch (err) {
      if (requestSequence.current === requestId) toast.error(err instanceof Error ? err.message : 'Unable to verify payment');
    } finally {
      if (requestSequence.current === requestId) setVerifying(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-32 gap-3 text-secondary">
          <LoaderCircle className="h-8 w-8 animate-spin" aria-hidden="true" />
          <span className="font-medium">Loading payment details…</span>
        </div>
      </AdminLayout>
    );
  }

  if (error || !payment) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-32 text-center px-8">
          <span className="material-symbols-outlined text-5xl text-red-400 mb-4">error_outline</span>
          <p className="text-lg font-bold text-slate-700 mb-2">Payment Not Found</p>
          <p className="text-secondary text-sm mb-6">{error}</p>
          <button
            onClick={() => void navigate('/dashboard/admin/manage-payments')}
            className="px-6 py-3 bg-primary text-on-primary rounded-xl text-sm font-bold"
          >
            Back to Payments
          </button>
        </div>
      </AdminLayout>
    );
  }

  const canVerify = payment.status === 'pending' || payment.status === 'failed';
  const canCancel = payment.status === 'pending' && Boolean(payment._id);
  const busy = verifying || cancelling || cancelStepUp.busy;

  const beginCancel = async () => {
    if (!canCancel || busy || cancelStepUp.challenge) return;
    const review = await Swal.fire({
      title: 'Cancel pending payment?',
      text: 'This requires Finance authorization and a fresh authenticator check. Cancellation does not issue a refund.',
      input: 'textarea',
      inputLabel: 'Reason (optional)',
      inputAttributes: { maxlength: '1000' },
      showCancelButton: true,
      confirmButtonText: 'Review with authenticator',
      confirmButtonColor: '#9f1239',
      inputValidator: (value) => value.length > 1000 ? 'The reason must be 1,000 characters or fewer.' : undefined,
    });
    if (!review.isConfirmed) return;
    const reason = typeof review.value === 'string' ? review.value.trim() : '';
    const body = reason ? { reason } : {};
    setCancelError(null);
    setCancelling(true);
    const started = await cancelStepUp.begin({
      method: 'PATCH',
      path: `/api/admin/payments/${encodeURIComponent(payment._id)}/cancel`,
      body,
      label: 'Cancel this pending payment attempt',
      execute: (challengeId, exactBody) => {
        if (paymentIdRef.current !== id) throw new Error('The payment detail changed. Reload the current payment before starting cancellation again.');
        return paymentService.cancelPayment(payment._id, exactBody, challengeId);
      },
    });
    setCancelling(false);
    if (!started) setCancelError(cancelStepUp.error ?? 'The secure cancellation challenge could not be started. Try again or refresh this payment.');
  };

  const completeCancel = async (code: string): Promise<boolean> => {
    const requestId = requestSequence.current;
    setCancelling(true);
    setCancelError(null);
    try {
      const result = await cancelStepUp.complete(code);
      if (requestSequence.current !== requestId) return false;
      if (!result.ok) {
        setCancelError(result.error ?? 'The payment was not canceled. Refresh the current payment before reviewing another action.');
        return false;
      }
      setPayment(result.value.payment);
      toast.success(result.value.alreadyCanceled ? 'Payment was already canceled.' : result.value.message || 'Payment canceled. No refund was issued.');
      return true;
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AdminLayout>
      <div className="pt-8 pb-20 px-12 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <nav className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-secondary mb-3">
              <button onClick={() => void navigate('/dashboard/admin/manage-payments')} className="hover:text-primary transition-colors">
                Payments
              </button>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-primary font-mono">{payment.reference}</span>
            </nav>
            <h1 className="text-4xl font-extrabold tracking-tighter text-primary">Transaction Details</h1>
          </div>
          <div className="flex gap-3">
            {canVerify && (
              <button
                disabled={busy}
                onClick={() => void handleVerify()}
                className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-md font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">verified</span>
                {verifying ? 'Verifying…' : 'Verify Payment'}
              </button>
            )}
            {canCancel && (
              <button
                disabled={busy || Boolean(cancelStepUp.challenge)}
                onClick={() => void beginCancel()}
                className="flex items-center gap-2 border border-rose-200 text-rose-700 px-6 py-3 rounded-md font-bold text-sm hover:bg-rose-50 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">block</span>
                {cancelling ? 'Preparing…' : 'Cancel payment'}
              </button>
            )}
            <button
              onClick={() => void navigate('/dashboard/admin/manage-payments')}
              className="flex items-center gap-2 bg-surface-container-low text-on-surface px-5 py-3 rounded-md font-semibold text-sm hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back
            </button>
          </div>
        </div>
        <p className="mb-6 text-sm text-secondary">Payment cancellation is available only for a pending attempt, requires the current Finance staff profile and a bound authenticator challenge, and does not issue a refund.</p>
        {cancelError && !cancelStepUp.challenge ? <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-900"><span>{cancelError}</span><button type="button" className="font-bold underline" onClick={() => void refreshPayment()}>Reload current payment</button></div> : null}

        {/* Status banner */}
        {payment.status === 'pending' && (
          <div className="mb-8 p-5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-4">
            <span className="material-symbols-outlined text-2xl text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>pending</span>
            <div>
              <p className="font-bold text-amber-800">Payment Pending</p>
              <p className="text-amber-700 text-sm">We are waiting for payment confirmation</p>
            </div>
          </div>
        )}
        {payment.status === 'failed' && (
          <div className="mb-8 p-5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-4">
            <span className="material-symbols-outlined text-2xl text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
            <div>
              <p className="font-bold text-red-800">Payment Failed</p>
              <p className="text-red-700 text-sm">We could not verify this payment</p>
            </div>
          </div>
        )}
        {payment.status === 'canceled' && (
          <div className="mb-8 p-5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
            <span className="material-symbols-outlined text-2xl text-slate-500" style={{ fontVariationSettings: "'FILL' 1" }}>block</span>
            <div>
              <p className="font-bold text-slate-800">Payment Canceled</p>
              <p className="text-slate-700 text-sm">This transaction remains visible for audit/history and can no longer be verified or canceled.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-8">
          {/* Main details */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            {/* Transaction Details */}
            <div className="bg-surface-container-lowest p-8 rounded-xl">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-6">Transaction Details</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Payment Reference', value: payment.reference, mono: true },
                  { label: 'Amount', value: formatNGN(payment.amount) },
                  { label: 'Status', value: payment.status.toUpperCase() },
                  { label: 'Transaction Date', value: formatDate(payment.createdAt) },
                  ...(payment.paystackData
                    ? [
                        { label: 'Payment Channel', value: payment.paystackData.channel || 'Not recorded' },
                        { label: 'Currency', value: payment.paystackData.currency || 'Not recorded' },
                        { label: 'Gateway Response', value: payment.paystackData.gateway_response || 'Not recorded' },
                        { label: 'Processing Fees', value: typeof payment.paystackData.fees === 'number' ? formatNGN(payment.paystackData.fees) : 'Not recorded' },
                      ]
                    : []),
                  ...(payment.metadata?.canceledAt
                    ? [
                        { label: 'Canceled At', value: formatDate(payment.metadata.canceledAt) },
                        { label: 'Canceled By', value: payment.metadata.canceledBy || 'Admin' },
                        { label: 'Cancellation Reason', value: payment.metadata.cancellationReason || 'No reason provided' },
                      ]
                    : []),
                ].map((row) => (
                  <div key={row.label} className="bg-surface-container-low p-4 rounded-lg">
                    <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">{row.label}</p>
                    <p className={`font-bold text-sm text-on-surface ${row.mono ? 'font-mono' : ''}`}>{row.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Property Details */}
            <div className="bg-surface-container-lowest p-8 rounded-xl">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-6">Property Details</h3>
              <div className="flex gap-6 p-6 bg-surface-container-low rounded-xl">
                <div className="w-16 h-16 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-secondary text-2xl">home_work</span>
                </div>
                <div>
                  <h4 className="font-bold text-on-surface">{payment.property?.title ?? 'Property unavailable'}</h4>
                  <p className="text-sm text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    {payment.property?.location ?? 'Related record unavailable'}
                  </p>
                  {payment.property ? <p className="text-sm font-bold text-primary mt-1">{formatNGN(payment.property.price)}</p> : null}
                </div>
              </div>
            </div>

            {/* Buyer Details */}
            <div className="bg-surface-container-lowest p-8 rounded-xl">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-6">Buyer Details</h3>
              <div className="flex items-center gap-4 p-6 bg-surface-container-low rounded-xl">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-lg">
                  {(payment.user?.name ?? 'G').charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-on-surface">{payment.user?.name ?? 'Guest'}</p>
                  <p className="text-sm text-secondary">{payment.user?.email ?? 'Secure guest payment'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-primary-container p-8 rounded-xl">
              <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold mb-2 block text-on-primary-container">Payment Amount</span>
              <h2 className="text-3xl font-extrabold tracking-tighter text-white mb-4">{formatNGN(payment.amount)}</h2>
              <div className="pt-4 border-t border-white/20">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-primary-container/70">Status</span>
                  {statusBadge(payment.status)}
                </div>
                {payment.paystackData && (
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-on-primary-container/70">Channel</span>
                    <span className="text-xs font-bold text-white capitalize">{payment.paystackData.channel?.replace('_', ' ') || 'Not recorded'}</span>
                  </div>
                )}
              </div>
            </div>

            {canVerify && (
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20">
                <h4 className="text-sm font-bold text-on-surface mb-2">Verification Required</h4>
                <p className="text-xs text-secondary mb-4">
                  {payment.status === 'pending'
                    ? 'Payment is awaiting confirmation. Click to verify with Paystack.'
                    : 'Payment failed. You can retry verification.'}
                </p>
                <button
                  disabled={busy}
                  onClick={() => void handleVerify()}
                  className="w-full py-2.5 bg-primary text-on-primary rounded-lg text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {verifying ? 'Verifying…' : payment.status === 'failed' ? 'Retry Verification' : 'Verify Payment'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <StepUpDialog
        challenge={cancelStepUp.challenge}
        busy={cancelling || cancelStepUp.busy}
        error={cancelStepUp.error ?? cancelError}
        onCancel={() => { cancelStepUp.cancel(); setCancelling(false); }}
        onSubmit={completeCancel}
      />
    </AdminLayout>
  );
};

export default AdminPaymentDetails;
