import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import AdminLayout from '../../../components/layout/AdminLayout';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { useAsync } from '../../../hooks/useAsync';
import { cartService } from '../../../services/cartService';
import type { CartCheckoutDetail } from '../../../types';
import { cartItemTypeLabel, checkoutStatusClasses, checkoutStatusLabel, formatNgn } from '../../../utils/cartFormatters';

const canRetry = (detail: Awaited<ReturnType<typeof cartService.adminGetCartCheckout>> | null) => {
  const checkout = detail?.checkout;
  if (!checkout) return false;
  return detail.payment?.status === 'paid'
    && (['failed', 'partially_failed'].includes(checkout.status) || checkout.items.some((item) => ['failed', 'pending'].includes(item.status)));
};

const AdminCartCheckoutDetail = () => {
  const { checkoutId = '' } = useParams();
  const { data, loading, error, execute } = useAsync(() => cartService.adminGetCartCheckout(checkoutId), Boolean(checkoutId));
  const retryStepUp = useBoundStepUp<CartCheckoutDetail>();
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState('');

  const beginRetry = async () => {
    if (!data || !canRetry(data) || retrying || retryStepUp.busy || retryStepUp.challenge) return;
    if (!window.confirm('Retry eligible allocations for this already paid checkout? This does not start another payment.')) return;
    const body = {};
    setRetryMessage('');
    await retryStepUp.begin({
      method: 'POST',
      path: `/api/admin/cart-checkouts/${encodeURIComponent(checkoutId)}/retry-allocations`,
      body,
      label: 'Retry eligible paid checkout allocations',
      execute: (challengeId) => cartService.adminRetryCartAllocations(checkoutId, challengeId),
    });
  };

  const completeRetry = async (code: string): Promise<boolean> => {
    setRetrying(true);
    try {
      const result = await retryStepUp.complete(code);
      if (!result.ok) return false;
      setRetryMessage('The retry request was accepted. Refreshing authoritative allocation states…');
      await execute();
      setRetryMessage('Allocation states were refreshed from the server. Pending or failed rows remain visible until the server confirms a terminal result.');
      return true;
    } finally {
      setRetrying(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
        <Link to="/dashboard/admin/cart-checkouts" className="text-sm font-bold text-primary hover:underline">Back to cart checkouts</Link>
        {loading ? <LoadingState label="Loading checkout detail..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        {data ? (
          <>
            <section className="rounded-xl border border-outline-variant/10 bg-white p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary">{data.checkout.paymentReference || data.checkout.checkoutId}</p>
                  <h1 className="mt-2 text-3xl font-black">{formatNgn(data.checkout.totalAmount)}</h1>
                  {data.user ? <p className="mt-2 text-sm text-secondary">{data.user.name} - {data.user.email}</p> : null}
                  {data.payment ? <p className="mt-1 text-xs text-secondary">Payment {data.payment._id} - {data.payment.status}</p> : null}
                </div>
                <div className="flex flex-wrap gap-3">
                  <span className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${checkoutStatusClasses(data.checkout.status)}`}>
                    {checkoutStatusLabel(data.checkout.status)}
                  </span>
                  {canRetry(data) ? (
                    <button type="button" disabled={retrying || retryStepUp.busy || Boolean(retryStepUp.challenge)} onClick={() => void beginRetry()} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">Retry eligible allocations with authenticator</button>
                  ) : null}
                </div>
              </div>
            </section>
            {canRetry(data) ? <p role="note" className="text-sm text-secondary">Retry is available only while the payment is server-reported paid and eligible allocation rows remain. The retry does not charge the buyer again.</p> : null}
            {retryMessage ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{retryMessage}</p> : null}
            {retryStepUp.error && !retryStepUp.challenge ? <p role="alert" className="rounded-lg bg-error-container p-3 text-sm text-on-error-container">{retryStepUp.error}</p> : null}
            <section className="rounded-xl border border-outline-variant/10 bg-white">
              <div className="border-b border-outline-variant/10 p-5">
                <h2 className="text-xl font-black">Allocation items</h2>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {data.checkout.items.map((item) => (
                  <article key={item.id} className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-secondary">{cartItemTypeLabel(item.type)}</p>
                        <h3 className="mt-1 font-bold">{item.description || item.resourceId}</h3>
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
      <StepUpDialog challenge={retryStepUp.challenge} busy={retrying || retryStepUp.busy} error={retryStepUp.error} onCancel={retryStepUp.cancel} onSubmit={completeRetry} />
    </AdminLayout>
  );
};

export default AdminCartCheckoutDetail;
