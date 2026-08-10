import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import PublicLayout from '../../../components/layout/PublicLayout';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { useCart } from '../../../contexts/CartContext';
import { ApiRequestError } from '../../../lib/axios';
import { cartService } from '../../../services/cartService';
import type { CartItemResponse } from '../../../types';
import { cartItemTypeLabel, formatNgn } from '../../../utils/cartFormatters';

interface InvalidCartItem {
  itemId?: string;
  itemType?: string;
  resourceId?: string;
  reason?: string;
}

const parseInvalidItems = (value: unknown): InvalidCartItem[] =>
  Array.isArray(value)
    ? value.filter((item): item is InvalidCartItem => typeof item === 'object' && item !== null)
    : [];

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const ServiceCart = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { cart, loading, refreshCart, removeItem, clearCart } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [invalidItems, setInvalidItems] = useState<InvalidCartItem[]>([]);
  const [guestEmail, setGuestEmail] = useState('');

  const locked = cart?.status === 'checkout_pending';
  const isBuyer = isAuthenticated && user?.role === 'buyer';
  const requiresGuestEmail = !isAuthenticated;

  const handleRemove = async (item: CartItemResponse) => {
    try {
      await removeItem(item.id);
      toast.success('Item removed from cart.');
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to remove cart item.');
      if (raw instanceof ApiRequestError && raw.status === 409) void refreshCart();
    }
  };

  const handleClear = async () => {
    try {
      await clearCart();
      setInvalidItems([]);
      toast.success('Cart cleared.');
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to clear cart.');
      if (raw instanceof ApiRequestError && raw.status === 409) void refreshCart();
    }
  };

  const handleCheckout = async () => {
    const email = guestEmail.trim();
    if (requiresGuestEmail && !isValidEmail(email)) {
      toast.error('Enter a valid email address for your guest receipt and document access.');
      return;
    }

    setCheckingOut(true);
    setInvalidItems([]);
    try {
      const response = await cartService.initializeCartCheckout(requiresGuestEmail ? { email } : undefined);
      const redirect = response.authorizationUrl || response.redirectUrl;
      if (!redirect) {
        toast.error('No checkout URL was returned.');
        return;
      }
      if (response.pending) toast.info('Continuing your existing cart checkout.');
      window.location.href = redirect;
    } catch (raw) {
      if (raw instanceof ApiRequestError) {
        const stale = parseInvalidItems(raw.invalidItems);
        if (stale.length) {
          setInvalidItems(stale);
          toast.error(raw.message);
          await refreshCart();
          return;
        }
      }
      toast.error(raw instanceof Error ? raw.message : 'Unable to initialize cart checkout.');
    } finally {
      setCheckingOut(false);
    }
  };

  const content = (
      <div className="max-w-5xl space-y-6">
        {loading ? <LoadingState label="Loading cart..." /> : null}
        {locked ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            A checkout has already started for this cart. Continue the existing Paystack checkout or wait for verification before editing items.
          </div>
        ) : null}
        {invalidItems.length ? (
          <section className="rounded-xl border border-red-200 bg-red-50 p-4">
            <h3 className="font-bold text-red-900">Some cart items need review</h3>
            <div className="mt-3 space-y-2">
              {invalidItems.map((item, index) => (
                <p key={`${item.itemId ?? item.resourceId ?? index}`} className="text-sm text-red-800">
                  {item.itemType ? `${item.itemType.replaceAll('_', ' ')}: ` : ''}{item.reason ?? 'No longer available.'}
                </p>
              ))}
            </div>
          </section>
        ) : null}
        <section className="rounded-xl border border-outline-variant/10 bg-white">
          <div className="flex flex-col gap-3 border-b border-outline-variant/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-black">Cart items</h3>
              <p className="text-sm text-secondary">{cart?.itemCount ?? 0} item{(cart?.itemCount ?? 0) === 1 ? '' : 's'} from backend cart state</p>
            </div>
            <Button type="button" variant="secondary" disabled={loading} onClick={() => void refreshCart()}>
              Refresh
            </Button>
          </div>
          {cart?.items.length ? (
            <div className="divide-y divide-outline-variant/10">
              {cart.items.map((item) => (
                <article key={item.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-secondary">{cartItemTypeLabel(item.itemType)}</p>
                    <h4 className="mt-1 font-bold">{item.description || item.resourceId}</h4>
                    <p className="mt-1 text-xs text-secondary">
                      Quantity {item.quantity} - Unit {formatNgn(item.unitAmount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <strong>{formatNgn(item.amount)}</strong>
                    <Button type="button" variant="ghost" disabled={locked} onClick={() => void handleRemove(item)}>
                      Remove
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-secondary">
              Your service cart is empty.
            </div>
          )}
        </section>
        <section className="flex flex-col gap-4 rounded-xl border border-outline-variant/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Subtotal</p>
            <p className="mt-1 text-3xl font-black">{formatNgn(cart?.subtotal ?? 0)}</p>
            <p className="mt-1 text-xs text-secondary">Amount is supplied by the backend and revalidated at checkout.</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-80">
            {requiresGuestEmail ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-secondary">Guest email</label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                  className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none"
                  placeholder="guest@example.com"
                />
                <p className="mt-2 text-xs text-secondary">Used for receipts, support, and activating guest document access after checkout.</p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3 sm:justify-end">
            <Button type="button" variant="secondary" disabled={locked || !cart?.items.length} onClick={() => void handleClear()}>
              Clear cart
            </Button>
            <Button type="button" disabled={checkingOut || !cart?.items.length} onClick={() => void handleCheckout()}>
              {checkingOut ? 'Starting checkout...' : locked ? 'Continue checkout' : 'Checkout with Paystack'}
            </Button>
            </div>
          </div>
        </section>
        <Button type="button" variant="ghost" onClick={() => navigate('/properties')}>
          Browse eligible services
        </Button>
      </div>
  );

  if (!isBuyer) {
    return (
      <PublicLayout>
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Service Cart</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary sm:text-4xl">Service Cart</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
              Review optional service purchases and pay once through Paystack.
            </p>
          </div>
          {content}
        </section>
      </PublicLayout>
    );
  }

  return (
    <BuyerPortalLayout
      pageTitle="Service Cart"
      pageSubtitle="Review optional service purchases and pay once through Paystack."
      topbarRight={<Link className="rounded-lg bg-surface-container-low px-4 py-2 text-sm font-bold" to="/dashboard/buyer/cart-checkouts">Checkout history</Link>}
    >
      {content}
    </BuyerPortalLayout>
  );
};

export default ServiceCart;
