import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import PublicLayout from '../../../components/layout/PublicLayout';
import Button from '../../../components/ui/Button';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { useCart } from '../../../contexts/CartContext';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../../lib/axios';
import { cartService } from '../../../services/cartService';
import { profileService } from '../../../services/profileService';
import type { CartEligibilityResponse, CartItemResponse } from '../../../types';
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

const EMPTY_CART_ITEMS: CartItemResponse[] = [];
const checkoutAttemptKey = (profileId: string) => `realtiq.cartCheckoutInitializationAttempt:${profileId}`;
const eligibilityParams = (item: CartItemResponse) => {
  const rawAccessType = item.metadata?.accessType;
  const accessType = ['one_time', 'daily', 'monthly'].includes(String(rawAccessType)) ? rawAccessType as 'one_time' | 'daily' | 'monthly' : undefined;
  return { itemType: item.itemType, resourceId: item.resourceId, ...(accessType ? { accessType } : {}) };
};

const ServiceCart = () => {
  const navigate = useNavigate();
  const { isAuthenticated, activeProfile } = useAuth();
  const { cart, loading, refreshCart, removeItem, clearCart } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [invalidItems, setInvalidItems] = useState<InvalidCartItem[]>([]);
  const [eligibility, setEligibility] = useState<Record<string, { result?: CartEligibilityResponse; error?: string }>>({});
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [checkouts, setCheckouts] = useState<Array<{ checkoutId: string; paymentReference?: string; status: string; totalAmount: number; currency: string; items: Array<{ id: string; type: string; amount: number; status: string; failureReason?: string }> }>>([]);
  const [recoveryRequired, setRecoveryRequired] = useState(false);
  const [recoveryReviewed, setRecoveryReviewed] = useState(false);
  const [recoveryAcknowledged, setRecoveryAcknowledged] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const checkoutStepUp = useBoundStepUp<Awaited<ReturnType<typeof cartService.initializeCartCheckout>>>();

  const locked = cart?.status === 'checkout_pending';
  const isBuyer = isAuthenticated && activeProfile?.kind === 'buyer';
  const cartItems = cart?.items ?? EMPTY_CART_ITEMS;
  const eligibilityItems = useMemo(() => cartItems.map((item) => ({ id: item.id, params: eligibilityParams(item) })), [cartItems]);
  const eligibilityProblems = cartItems.flatMap((item) => {
    const itemResult = eligibility[item.id];
    if (!itemResult) return [];
    if (itemResult.error) return [{ item, message: itemResult.error }];
    if (itemResult.result && !itemResult.result.eligible) return [{ item, message: itemResult.result.reason || 'This item is not currently eligible.' }];
    return [];
  });
  const eligibilityComplete = !isBuyer || eligibilityItems.every((item) => Boolean(eligibility[item.id]));
  const paidTourItems = cartItems.filter((item) => item.itemType === 'paid_virtual_tour');

  const inspectCheckouts = useCallback(async () => {
    setRecoveryError(null);
    try {
      const result = await cartService.listCartCheckouts({ page: 1, limit: 10 });
      setCheckouts(result.checkouts);
      setRecoveryReviewed(true);
      setRecoveryAcknowledged(false);
    } catch (raw) {
      setRecoveryError(raw instanceof Error ? raw.message : 'Unable to inspect recent checkout state.');
      setRecoveryReviewed(false);
    }
  }, []);

  useEffect(() => {
    if (!isBuyer || !activeProfile?.id || !eligibilityItems.length) {
      setEligibility({});
      setEligibilityLoading(false);
      return;
    }
    let current = true;
    setEligibilityLoading(true);
    void Promise.all(eligibilityItems.map(async (item) => {
      try {
        const result = await cartService.checkCartEligibility(item.params);
        return [item.id, { result }] as const;
      } catch (raw) {
        return [item.id, { error: raw instanceof Error ? raw.message : 'Unable to confirm this item’s eligibility.' }] as const;
      }
    })).then((entries) => {
      if (current) setEligibility(Object.fromEntries(entries));
    }).finally(() => { if (current) setEligibilityLoading(false); });
    return () => { current = false; };
  }, [activeProfile?.id, eligibilityItems, isBuyer]);

  useEffect(() => {
    if (!activeProfile?.id || !isBuyer) {
      setRecoveryRequired(false);
      setRecoveryReviewed(false);
      setRecoveryAcknowledged(false);
      setCheckouts([]);
      return;
    }
    const hasUnresolvedAttempt = sessionStorage.getItem(checkoutAttemptKey(activeProfile.id)) !== null;
    setRecoveryRequired(hasUnresolvedAttempt);
    setRecoveryReviewed(false);
    setRecoveryAcknowledged(false);
    if (hasUnresolvedAttempt || locked) {
      void inspectCheckouts();
    } else {
      setCheckouts([]);
    }
  }, [activeProfile?.id, inspectCheckouts, isBuyer, locked]);

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
    if (!activeProfile?.id || checkingOut || checkoutStepUp.busy || checkoutStepUp.challenge || locked) return;
    if (recoveryRequired && (!recoveryReviewed || !recoveryAcknowledged)) return;
    if (paidTourItems.length) {
      toast.error('Paid or live tour purchases are not available in this cart workflow. Remove those items before checkout.');
      return;
    }
    if (eligibilityLoading) return;
    if (eligibilityProblems.length) {
      toast.error('Resolve every cart eligibility issue before checkout.');
      return;
    }
    setCheckingOut(true);
    setInvalidItems([]);
    try {
      const current = await profileService.current(activeProfile.id);
      if (current.profile.id !== activeProfile.id || current.profile.kind !== 'buyer') {
        throw new Error('Select the current buyer profile before starting checkout.');
      }
      if (localStorage.getItem('activeProfileId') !== activeProfile.id) throw new Error('The selected profile changed. Select the buyer profile again before checkout.');
      const freshEligibility = await Promise.all(cartItems.map(async (item) => ({ item, result: await cartService.checkCartEligibility(eligibilityParams(item)) })));
      const failed = freshEligibility.filter(({ item, result }) => item.itemType === 'paid_virtual_tour' || !result.eligible);
      if (failed.length) {
        setEligibility(Object.fromEntries(freshEligibility.map(({ item, result }) => [item.id, { result }])));
        throw new Error(failed.some(({ item }) => item.itemType === 'paid_virtual_tour')
          ? 'Paid or live tour purchases are not supported by this checkout workflow.'
          : 'One or more cart items are no longer eligible. Review the item-level reasons.');
      }
      const started = await checkoutStepUp.begin({
        method: 'POST', path: '/api/cart/checkout/initialize', body: {}, label: 'Initialize the current buyer cart checkout',
        execute: async (challengeId, exactBody) => {
          sessionStorage.setItem(checkoutAttemptKey(activeProfile.id), new Date().toISOString());
          try {
            return await cartService.initializeCartCheckout(exactBody, challengeId);
          } catch (raw) {
            setRecoveryRequired(true);
            setRecoveryReviewed(false);
            setRecoveryAcknowledged(false);
            const stale = raw instanceof ApiRequestError ? parseInvalidItems(raw.invalidItems) : [];
            if (stale.length) { setInvalidItems(stale); await refreshCart(); }
            void inspectCheckouts();
            throw raw;
          }
        },
      });
      if (!started && checkoutStepUp.error) toast.error(checkoutStepUp.error);
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to initialize cart checkout.');
    } finally {
      setCheckingOut(false);
    }
  };

  const completeCheckout = async (code: string): Promise<boolean> => {
    const result = await checkoutStepUp.complete(code);
    if (!result.ok) return false;
    const response = result.value;
    setServerTotal(response.totalAmount);
    setRecoveryRequired(false);
    setRecoveryReviewed(false);
    setRecoveryAcknowledged(false);
    if (response.pending) toast.info('Continuing the existing pending cart checkout.');
    toast.success(`Checkout total confirmed by the server: ${formatNgn(response.totalAmount)} ${response.currency}.`);
    const redirect = response.authorizationUrl || response.redirectUrl;
    if (!redirect) {
      setRecoveryRequired(true);
      setRecoveryReviewed(false);
      setRecoveryError('Checkout was created, but no provider URL was returned. Review checkout history before taking another action.');
      void inspectCheckouts();
      return false;
    }
    sessionStorage.removeItem(checkoutAttemptKey(activeProfile!.id));
    window.location.assign(redirect);
    return true;
  };

  const content = (
      <div className="max-w-5xl space-y-6">
        {loading ? <LoadingState label="Loading cart..." /> : null}
        {locked ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            A checkout has already started for this cart. Review its current status in checkout history; do not initialize another payment for this cart.
            <div className="mt-2"><Link className="font-bold underline" to="/dashboard/buyer/cart-checkouts">Open checkout history</Link></div>
          </div>
        ) : null}
        {recoveryRequired ? <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Previous checkout result needs review</h3><Button type="button" variant="secondary" disabled={checkingOut || checkoutStepUp.busy} onClick={() => void inspectCheckouts()}>Inspect checkout state</Button></div>
          <p className="mt-2">The last initialization request may have created a pending checkout before the connection failed. No new payment request will be sent until you inspect the latest checkout records and explicitly authorize a recovery attempt.</p>
          {recoveryError ? <p role="alert" className="mt-2 text-error">{recoveryError}</p> : null}
          {recoveryReviewed ? <>
            {checkouts.length ? <div className="mt-3 space-y-2">{checkouts.slice(0, 5).map((checkout) => <div key={checkout.checkoutId} className="rounded-lg bg-white p-3"><p className="font-bold">{checkout.status.replaceAll('_', ' ')} · {formatNgn(checkout.totalAmount)}</p><p className="mt-1 text-xs text-secondary">Checkout {checkout.checkoutId}{checkout.paymentReference ? ` · Reference ${checkout.paymentReference}` : ''}</p><p className="mt-1 text-xs text-secondary">{checkout.items.map((item) => `${item.type.replaceAll('_', ' ')}: ${item.status.replaceAll('_', ' ')}`).join(' · ')}</p><Link className="mt-2 inline-block text-xs font-bold text-primary underline" to={`/dashboard/buyer/cart-checkouts/${encodeURIComponent(checkout.checkoutId)}`}>Review this checkout</Link></div>)}</div> : <p className="mt-3">No recent checkout record was returned. The backend does not guarantee exactly-once initialization; verify again before authorizing another attempt.</p>}
            <label className="mt-3 flex items-start gap-2"><input type="checkbox" checked={recoveryAcknowledged} onChange={(event) => setRecoveryAcknowledged(event.target.checked)} /><span>I reviewed the returned checkout state and understand another attempt may create a separate provider initialization.</span></label>
          </> : <p className="mt-3">Checkout history must load successfully before recovery is available.</p>}
        </section> : null}
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
              <p className="text-sm text-secondary">{cart?.itemCount ?? 0} item{(cart?.itemCount ?? 0) === 1 ? '' : 's'} in your cart</p>
            </div>
            <Button type="button" variant="secondary" disabled={loading || checkingOut || Boolean(checkoutStepUp.challenge)} onClick={() => void refreshCart()}>
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
                    {isBuyer ? eligibilityLoading ? <p className="mt-1 text-xs text-secondary">Checking current eligibility…</p> : eligibility[item.id]?.result ? <p className={`mt-1 text-xs ${eligibility[item.id]?.result?.eligible ? 'text-emerald-700' : 'text-error'}`}>{eligibility[item.id]?.result?.eligible ? 'Eligible at checkout review' : eligibility[item.id]?.result?.reason || 'Not currently eligible'}</p> : eligibility[item.id]?.error ? <p className="mt-1 text-xs text-error">{eligibility[item.id]?.error}</p> : null : null}
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <strong>{formatNgn(item.amount)}</strong>
                    <Button type="button" variant="ghost" disabled={locked || checkingOut || Boolean(checkoutStepUp.challenge)} onClick={() => void handleRemove(item)}>
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
            <p className="mt-1 text-xs text-secondary">The backend recalculates checkout totals and item eligibility when you authorize payment.</p>
            {serverTotal !== null ? <p role="status" className="mt-2 text-xs font-semibold text-primary">Last server-confirmed total: {formatNgn(serverTotal)} NGN</p> : null}
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-80">
            {!isBuyer ? <p className="text-xs text-amber-800">Cart checkout is available only from an authorized selected buyer profile. Guest checkout is not supported by this endpoint.</p> : <p className="text-xs text-secondary">Current profile: {activeProfile?.name} · {activeProfile?.verification?.status ?? 'verification status not returned'}; final purchase eligibility is checked by the backend.</p>}
            {eligibilityProblems.length ? <div className="rounded-lg bg-error-container p-3 text-xs text-on-error-container"><strong>Resolve these eligibility issues:</strong><ul className="mt-1 list-disc pl-5">{eligibilityProblems.map(({ item, message }) => <li key={item.id}>{item.description || item.resourceId}: {message}</li>)}</ul></div> : null}
            {paidTourItems.length ? <p role="alert" className="text-xs text-error">Paid/live tour purchase is not enabled in this checkout flow. Remove the affected cart item to continue.</p> : null}
            <div className="flex flex-wrap gap-3 sm:justify-end">
            <Button type="button" variant="secondary" disabled={locked || checkingOut || Boolean(checkoutStepUp.challenge) || !cart?.items.length} onClick={() => void handleClear()}>
              Clear cart
            </Button>
            <Button type="button" disabled={!isBuyer || !cart?.items.length || locked || checkingOut || checkoutStepUp.busy || Boolean(checkoutStepUp.challenge) || eligibilityLoading || !eligibilityComplete || Boolean(eligibilityProblems.length) || Boolean(paidTourItems.length) || (recoveryRequired && (!recoveryReviewed || !recoveryAcknowledged))} onClick={() => void handleCheckout()}>
              {checkingOut || checkoutStepUp.busy ? 'Preparing secure checkout…' : recoveryRequired ? 'Authorize a new checkout attempt' : 'Checkout with Paystack'}
            </Button>
            </div>
            {checkoutStepUp.error ? <p role="alert" className="text-xs text-error">{checkoutStepUp.error}</p> : null}
            <p className="text-xs text-secondary">Checkout initialization uses a TOTP-bound JSON request. A failed connection is inspected before another initialization can be authorized.</p>
          </div>
        </section>
        <Button type="button" variant="ghost" onClick={() => navigate('/properties')}>
          Browse eligible services
        </Button>
        <StepUpDialog challenge={checkoutStepUp.challenge} busy={checkoutStepUp.busy} error={checkoutStepUp.error} onCancel={checkoutStepUp.cancel} onSubmit={completeCheckout} />
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
