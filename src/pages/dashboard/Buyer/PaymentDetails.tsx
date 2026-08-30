import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { paymentService } from '../../../services/paymentService';
import { propertyPublicReference } from '../../../types';
import type { ApiPayment } from '../../../types';

const formatNGN = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const statusBadge = (status: ApiPayment['status']) => {
  const cfg: Record<ApiPayment['status'], string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
    canceled: 'bg-slate-100 text-slate-700',
  };
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize ${cfg[status]}`}>{status}</span>;
};

const PaymentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [payment, setPayment] = useState<ApiPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('No payment ID provided.');
      setLoading(false);
      return;
    }
    setLoading(true);
    paymentService
      .getPaymentById(id)
      .then(setPayment)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Payment not found.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleVerify = async () => {
    if (!payment) return;
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
    if (!confirmed.isConfirmed) return;

    setVerifying(true);
    try {
      const result = await paymentService.verifyPayment(payment.reference);
      if (result.verified) {
        toast.success('Payment verified successfully');
        setPayment((prev) => (prev ? { ...prev, status: 'paid' } : prev));
      } else {
        toast.error('Payment verification failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to verify payment');
    } finally {
      setVerifying(false);
    }
  };

  const handleRefresh = async () => {
    if (!id) return;
    setVerifying(true);
    try {
      const refreshed = await paymentService.getPaymentById(id);
      setPayment(refreshed);
      toast.success('Status refreshed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <BuyerPortalLayout pageEyebrow="Payments" pageTitle="Transaction Receipt" pageSubtitle="Loading receipt details...">
        <div className="flex items-center justify-center py-32 gap-3 text-secondary">
          <LoaderCircle className="h-8 w-8 animate-spin" aria-hidden="true" />
          <span className="font-medium">Loading payment details…</span>
        </div>
      </BuyerPortalLayout>
    );
  }

  if (error || !payment) {
    return (
      <BuyerPortalLayout pageEyebrow="Payments" pageTitle="Transaction Receipt" pageSubtitle="Payment details could not be loaded.">
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <span className="material-symbols-outlined text-5xl text-red-400 mb-4">error_outline</span>
          <p className="text-lg font-bold text-slate-700 mb-2">Payment Not Found</p>
          <p className="text-secondary text-sm mb-6">{error}</p>
          <button onClick={() => void navigate('/dashboard/buyer/payment-history')} className="px-6 py-3 bg-primary text-on-primary rounded-xl text-sm font-bold">
            Back to Payment History
          </button>
        </div>
      </BuyerPortalLayout>
    );
  }

  const canVerify = payment.status === 'pending' && (user?.role === 'buyer' || user?.role === 'admin');
  const propertyReference = propertyPublicReference(payment.property);

  return (
    <BuyerPortalLayout
      pageEyebrow="Payments"
      pageTitle="Transaction Receipt"
      pageSubtitle="Review the payment record, property details, and verification state."
    >
      <div className="mb-10 flex justify-between items-end gap-4 flex-wrap">
        <div>
          <nav className="flex gap-2 text-xs font-semibold text-secondary mb-2 uppercase tracking-widest items-center">
            <button onClick={() => void navigate('/dashboard/buyer/payment-history')} className="hover:text-primary transition-colors">
              Payments
            </button>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-on-surface font-mono">{payment.reference}</span>
          </nav>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">Transaction Receipt</h1>
        </div>
        <div className="flex items-center gap-3">
          {canVerify && (
            <button
              disabled={verifying}
              onClick={() => void handleVerify()}
              className="flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-lg font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">verified</span>
              {verifying ? 'Verifying…' : 'Verify Payment'}
            </button>
          )}
          {payment.status === 'pending' && (
            <button
              disabled={verifying}
              onClick={() => void handleRefresh()}
              className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/30 px-4 py-3 rounded-lg font-bold text-sm hover:bg-surface-container transition-all disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-sm ${verifying ? 'animate-spin' : ''}`}>refresh</span>
              Refresh
            </button>
          )}
        </div>
      </div>

      {payment.status === 'pending' && (
        <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-4">
          <span className="material-symbols-outlined text-3xl text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>
            pending
          </span>
          <div>
            <h3 className="font-bold text-amber-800">Payment Pending</h3>
            <p className="text-amber-700 text-sm">We are waiting for payment confirmation</p>
          </div>
        </div>
      )}
      {payment.status === 'failed' && (
        <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-xl flex items-center gap-4">
          <span className="material-symbols-outlined text-3xl text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>
            cancel
          </span>
          <div>
            <h3 className="font-bold text-red-800">Payment Failed</h3>
            <p className="text-red-700 text-sm">We could not verify this payment</p>
          </div>
        </div>
      )}
      {payment.status === 'paid' && (
        <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-xl flex items-center gap-4">
          <span className="material-symbols-outlined text-3xl text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          <div className="flex-1">
            <h3 className="font-bold text-green-800">Payment Successful</h3>
            <p className="text-green-700 text-sm">Your property purchase has been confirmed</p>
          </div>
          {propertyReference ? (
            <button
              onClick={() => void navigate(`/properties/${propertyReference}`)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors"
            >
              View Property
            </button>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-12 gap-8 items-start">
        <div className="col-span-8 bg-surface-container-lowest p-12 rounded-xl shadow-2xl shadow-slate-200/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-surface-container-low -mr-16 -mt-16 rounded-full opacity-50" />
          <div className="flex justify-between items-start mb-10 relative">
            <div>
              <div className="text-2xl font-black mb-1">
                RealtIQ <span className="text-secondary font-medium">| Payments</span>
              </div>
              <p className="text-secondary text-sm">
                Reference: <span className="text-on-surface font-mono font-bold tracking-tight">{payment.reference}</span>
              </p>
            </div>
            <div className="text-right">
              {statusBadge(payment.status)}
              <p className="text-sm font-semibold text-on-surface mt-2">{formatDate(payment.createdAt)}</p>
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-6">Transaction Details</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Payment Reference', value: payment.reference, mono: true },
                { label: 'Amount', value: formatNGN(payment.amount) },
                { label: 'Status', value: payment.status.toUpperCase() },
                { label: 'Transaction Date', value: formatDate(payment.createdAt) },
                ...(payment.paystackData
                  ? [
                      { label: 'Payment Channel', value: payment.paystackData.channel },
                      { label: 'Currency', value: payment.paystackData.currency },
                      { label: 'Gateway Response', value: payment.paystackData.gateway_response },
                      { label: 'Processing Fees', value: formatNGN(payment.paystackData.fees) },
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

          <div className="mb-10">
            <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-6">Property Details</h3>
            <div className="flex gap-6 p-6 bg-surface-container-low rounded-xl">
              <div className="w-16 h-16 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-secondary text-2xl">home_work</span>
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="font-bold text-on-surface">{payment.property?.title ?? 'Property unavailable'}</h4>
                <p className="text-sm text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  {payment.property?.location ?? 'Related record unavailable'}
                </p>
                {payment.property ? <p className="text-sm font-bold text-primary mt-1">{formatNGN(payment.property.price)}</p> : null}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-6">Buyer Details</h3>
            <div className="flex items-center gap-4 p-6 bg-surface-container-low rounded-xl">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                {(payment.user?.name ?? 'G').charAt(0)}
              </div>
              <div>
                <p className="font-bold text-on-surface">{payment.user?.name ?? 'Guest'}</p>
                <p className="text-sm text-secondary">{payment.user?.email ?? 'Secure guest payment'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-widest text-secondary mb-4">Payment Summary</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-secondary">Amount</span>
                <span className="font-bold">{formatNGN(payment.amount)}</span>
              </div>
              {payment.paystackData && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Fees</span>
                    <span className="font-semibold">{formatNGN(payment.paystackData.fees)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Channel</span>
                    <span className="font-semibold capitalize">{payment.paystackData.channel.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Currency</span>
                    <span className="font-semibold">{payment.paystackData.currency}</span>
                  </div>
                </>
              )}
              <div className="pt-3 border-t border-surface-container">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-secondary">Status</span>
                  {statusBadge(payment.status)}
                </div>
              </div>
            </div>
          </div>

          {payment.status === 'pending' && canVerify && (
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl">
              <h4 className="text-sm font-bold text-amber-800 mb-2">Pending Verification</h4>
              <p className="text-xs text-amber-700 mb-4">Payment awaiting confirmation. Use the verify button to check status with Paystack.</p>
              <button
                disabled={verifying}
                onClick={() => void handleVerify()}
                className="w-full py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {verifying ? 'Verifying…' : 'Verify Payment'}
              </button>
            </div>
          )}

          {payment.status === 'failed' && (
            <div className="bg-red-50 border border-red-200 p-6 rounded-xl">
              <h4 className="text-sm font-bold text-red-800 mb-2">Payment Failed</h4>
              <p className="text-xs text-red-700 mb-4">We could not verify this payment. You can retry verification below.</p>
              {canVerify && (
                <button
                  disabled={verifying}
                  onClick={() => void handleVerify()}
                  className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {verifying ? 'Verifying…' : 'Retry Verification'}
                </button>
              )}
            </div>
          )}

          <div className="bg-primary-container p-8 rounded-xl text-on-primary-container">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-on-primary-container/20 p-2 rounded-lg">
                <span className="material-symbols-outlined text-secondary-fixed">verified_user</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Secured Transaction</h4>
                <p className="text-xs opacity-70">Powered by Paystack</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BuyerPortalLayout>
  );
};

export default PaymentDetails;
