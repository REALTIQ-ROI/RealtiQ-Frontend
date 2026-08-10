import { Link, useParams } from 'react-router-dom';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { cartService } from '../../../services/cartService';
import type { CartCheckoutStatus } from '../../../types';
import { cartItemTypeLabel, checkoutStatusClasses, checkoutStatusLabel, formatNgn } from '../../../utils/cartFormatters';

const statusMessage = (status?: CartCheckoutStatus) => {
  if (status === 'completed') return 'Payment received and all services are active.';
  if (status === 'allocation_processing') return 'Payment received; services are being activated.';
  if (status === 'partially_failed') return 'Payment succeeded, but one or more services are still being activated. No additional payment is required.';
  if (status === 'failed') return 'Payment succeeded, but service activation needs support review. No additional payment is required.';
  if (status === 'paid') return 'Payment has been confirmed and allocation is queued.';
  return 'Checkout status is shown from the backend.';
};

const CartCheckoutDetail = () => {
  const { checkoutId = '' } = useParams();
  const { data, loading, error, execute } = useAsync(() => cartService.getCartCheckout(checkoutId), Boolean(checkoutId));

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
                  <p className="mt-3 max-w-2xl text-sm text-secondary">{statusMessage(data.status)}</p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${checkoutStatusClasses(data.status)}`}>
                  {checkoutStatusLabel(data.status)}
                </span>
              </div>
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
