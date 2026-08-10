import { Link } from 'react-router-dom';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { cartService } from '../../../services/cartService';
import { checkoutStatusClasses, checkoutStatusLabel, formatNgn } from '../../../utils/cartFormatters';

const CartCheckouts = () => {
  const { data, loading, error, execute } = useAsync(() => cartService.listCartCheckouts({ page: 1, limit: 20 }), true);
  const checkouts = data?.checkouts ?? [];

  return (
    <BuyerPortalLayout
      pageTitle="Service Checkout History"
      pageSubtitle="Receipts and allocation status for unified service-cart payments."
      topbarRight={<Link className="rounded-lg bg-surface-container-low px-4 py-2 text-sm font-bold" to="/dashboard/buyer/cart">Open cart</Link>}
    >
      <div className="max-w-6xl space-y-4">
        {loading ? <LoadingState label="Loading checkouts..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        {!loading && !error && checkouts.length ? (
          checkouts.map((checkout) => (
            <Link
              key={checkout.checkoutId}
              to={`/dashboard/buyer/cart-checkouts/${checkout.checkoutId}`}
              className="block rounded-xl border border-outline-variant/10 bg-white p-5 transition hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary">{checkout.paymentReference || checkout.checkoutId}</p>
                  <h3 className="mt-1 text-lg font-black">{formatNgn(checkout.totalAmount)}</h3>
                  <p className="mt-1 text-sm text-secondary">{checkout.items.length} service allocation{checkout.items.length === 1 ? '' : 's'}</p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${checkoutStatusClasses(checkout.status)}`}>
                  {checkoutStatusLabel(checkout.status)}
                </span>
              </div>
            </Link>
          ))
        ) : null}
        {!loading && !error && !checkouts.length ? (
          <div className="rounded-xl border border-outline-variant/10 bg-white p-12 text-center text-secondary">
            No cart checkouts yet.
          </div>
        ) : null}
      </div>
    </BuyerPortalLayout>
  );
};

export default CartCheckouts;
