import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { cartService } from '../../../services/cartService';
import { paymentService } from '../../../services/paymentService';
import { ApiRequestError } from '../../../lib/axios';
import type { CartCheckoutStatus } from '../../../types';
import { cartItemTypeLabel, checkoutStatusClasses, checkoutStatusLabel, formatNgn } from '../../../utils/cartFormatters';

const statusMessage = (status?: CartCheckoutStatus) => {
  if (status === 'completed') return 'Payment received and all services are active.';
  if (status === 'allocation_processing') return 'Payment received; services are being activated.';
  if (status === 'partially_failed') return 'Payment succeeded, but one or more services are still being activated. No additional payment is required.';
  if (status === 'failed') return 'The checkout failed. Confirm payment and allocation state from the returned records before starting another payment.';
  if (status === 'paid') return 'Payment has been confirmed and allocation is queued.';
  return 'Your latest checkout status is shown here.';
};

const CartCheckoutDetail = () => {
  const { checkoutId = '' } = useParams();
  const { data, loading, error, execute } = useAsync(() => cartService.getCartCheckout(checkoutId), Boolean(checkoutId));
  const [pollCount, setPollCount] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!data || pollCount >= 6) return;
    const needsRefresh = ['paid', 'allocation_processing'].includes(data.status) || ['pending', 'outcome_unknown'].includes(data.initializationState ?? '');
    if (!needsRefresh) return;
    const timer = window.setTimeout(() => {
      void execute({ silent: true }).then((next) => { if (next) setPollCount((count) => count + 1); });
    }, 15000);
    return () => window.clearTimeout(timer);
  }, [data, execute, pollCount]);

  const verifyAndRefresh = async () => {
    if (!data?.paymentReference || verifying) return;
    setVerifying(true); setVerifyMessage(null);
    try {
      const result = await paymentService.verifyPayment(data.paymentReference);
      if (!result.verified) setVerifyMessage('The payment is not yet verified. The provider callback/webhook remains authoritative; refresh again later.');
      else { setVerifyMessage('Payment verification returned confirmed. Refreshing checkout allocations.'); toast.success('Payment verification completed; refreshing service allocations.'); }
      const refreshed = await execute();
      if (!refreshed) setVerifyMessage((current) => `${current ?? ''} Checkout detail could not be refreshed.`);
      setPollCount(0);
    } catch (raw) {
      const requestId = raw instanceof ApiRequestError ? raw.requestId : undefined;
      setVerifyMessage(`${raw instanceof Error ? raw.message : 'Unable to verify payment.'}${requestId ? ` Request ID: ${requestId}` : ''}`);
    } finally { setVerifying(false); }
  };

  return (
    <BuyerPortalLayout
      pageTitle="Service Receipt"
      pageSubtitle="Unified checkout payment and service allocation breakdown."
      topbarRight={<Link className="rounded-lg bg-surface-container-low px-4 py-2 text-sm font-bold" to="/dashboard/buyer/cart-checkouts">Checkout history</Link>}
    >
      <div className="max-w-5xl space-y-6">
        {loading ? <LoadingState label="Loading receipt..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        {data ? (
          <>
            <section className="rounded-xl border border-outline-variant/10 bg-white p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary">{data.paymentReference || data.checkoutId}</p>
                  <h3 className="mt-2 text-3xl font-black">{formatNgn(data.totalAmount)}</h3>
                  <p className="mt-3 max-w-2xl text-sm text-secondary">{data.initializationState === 'outcome_unknown' ? 'The provider initialization outcome is unresolved. Do not start another checkout. Refresh status or contact support with this checkout reference and any request ID returned by the server.' : statusMessage(data.status)}</p>
                  {data.initializationState ? <p className="mt-2 text-xs font-semibold text-secondary">Provider initialization: {data.initializationState.replaceAll('_', ' ')}</p> : null}
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${checkoutStatusClasses(data.status)}`}>
                  {checkoutStatusLabel(data.status)}
                </span>
              </div>
            </section>
            <section className="flex flex-wrap items-center gap-3 rounded-xl border border-outline-variant/10 bg-white p-4">
              <Button type="button" variant="secondary" disabled={loading} onClick={() => { setPollCount(0); void execute(); }}>Refresh checkout status</Button>
              {data.paymentReference && !['completed', 'partially_failed'].includes(data.status) ? <Button type="button" disabled={verifying || loading} loading={verifying} loadingLabel="Checking payment…" onClick={() => void verifyAndRefresh()}>Verify payment then refresh allocations</Button> : null}
              {verifyMessage ? <p role="status" className="text-sm text-secondary">{verifyMessage}</p> : null}
              {pollCount >= 6 ? <p className="text-xs text-secondary">Automatic status refresh paused after six checks. Use Refresh checkout status to continue.</p> : null}
            </section>
            <section className="rounded-xl border border-outline-variant/10 bg-white">
              <div className="border-b border-outline-variant/10 p-5">
                <h3 className="text-xl font-black">Service allocations</h3>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {data.items.map((item) => (
                  <article key={item.id} className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-secondary">{cartItemTypeLabel(item.type)}</p>
                        <h4 className="mt-1 font-bold">{item.description || item.resourceId}</h4>
                        {item.failureReason ? <p className="mt-2 text-sm text-amber-800">{item.failureReason}</p> : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <strong>{formatNgn(item.amount)}</strong>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${checkoutStatusClasses(item.status)}`}>
                          {checkoutStatusLabel(item.status)}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </BuyerPortalLayout>
  );
};

export default CartCheckoutDetail;
