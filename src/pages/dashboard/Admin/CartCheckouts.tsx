import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { cartService } from '../../../services/cartService';
import { checkoutStatusClasses, checkoutStatusLabel, formatNgn } from '../../../utils/cartFormatters';

const AdminCartCheckouts = () => {
  const { data, loading, error, execute } = useAsync(() => cartService.adminListCartCheckouts({ page: 1, limit: 30 }), true);
  const checkouts = data?.checkouts ?? [];

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">Admin audit</p>
          <h1 className="mt-2 text-4xl font-black text-primary">Cart Checkouts</h1>
        </header>
        {loading ? <LoadingState label="Loading cart checkouts..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        {!loading && !error ? (
          <div className="overflow-hidden rounded-xl border border-outline-variant/10 bg-white">
            <div className="grid grid-cols-[1fr_150px_140px_120px] gap-4 border-b border-outline-variant/10 p-4 text-xs font-bold uppercase tracking-widest text-secondary">
              <span>Checkout</span>
              <span>Status</span>
              <span>Amount</span>
              <span>Items</span>
            </div>
            {checkouts.map((checkout) => (
              <Link
                key={checkout.checkoutId}
                to={`/dashboard/admin/cart-checkouts/${checkout.checkoutId}`}
                className="grid grid-cols-[1fr_150px_140px_120px] gap-4 border-b border-outline-variant/10 p-4 text-sm last:border-b-0 hover:bg-surface-container-low"
              >
                <span className="font-bold">{checkout.paymentReference || checkout.checkoutId}</span>
                <span><span className={`rounded-full px-2 py-1 text-xs font-bold ${checkoutStatusClasses(checkout.status)}`}>{checkoutStatusLabel(checkout.status)}</span></span>
                <span>{formatNgn(checkout.totalAmount)}</span>
                <span>{checkout.items.length}</span>
              </Link>
            ))}
            {!checkouts.length ? <div className="p-10 text-center text-secondary">No cart checkouts found.</div> : null}
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default AdminCartCheckouts;
