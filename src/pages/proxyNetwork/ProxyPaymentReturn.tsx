import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { cartService } from '../../services/cartService';
import { propertyAnalyticsService } from '../../services/propertyAnalyticsService';
import { proxyNetworkService } from '../../services/proxyNetworkService';

interface ReturnState {
  loading: boolean;
  message: string;
  error: boolean;
  reference?: string;
  actionLabel?: string;
  actionTo?: string;
}

const ProxyPaymentReturn = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const fired = useRef(false);
  const [retryCount, setRetryCount] = useState(0);
  const { isAuthenticated, user } = useAuth();
  const { refreshCart, setCartFromResponse } = useCart();
  const isBuyer = isAuthenticated && user?.role === 'buyer';
  const hasReference = Boolean(
    params.get('reference') ||
      params.get('trxref') ||
      sessionStorage.getItem('realtiq.proxyPaymentContext') ||
      sessionStorage.getItem('realtiq.analyticsPaymentReference'),
  );
  const [state, setState] = useState<ReturnState>(
    hasReference
      ? { loading: true, message: 'Verifying your payment...', error: false }
      : {
          loading: false,
          error: true,
          message: 'No payment reference was provided.',
          actionLabel: 'Back to Service Cart',
          actionTo: '/cart',
        },
  );

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    let stored: { reference?: string; requestId?: string } = {};
    try {
      stored = JSON.parse(sessionStorage.getItem('realtiq.proxyPaymentContext') || '{}') as typeof stored;
    } catch {
      stored = {};
    }

    const reference =
      params.get('reference') ||
      params.get('trxref') ||
      stored.reference ||
      sessionStorage.getItem('realtiq.analyticsPaymentReference');

    if (!reference) return;

    proxyNetworkService
      .verifyPayment(reference)
      .then(async (result) => {
        const pendingCart = cartService.getPendingCheckout();
        const hasCartContext = Boolean(
          pendingCart.checkoutId && (!pendingCart.reference || pendingCart.reference === reference),
        );
        const hasAnalyticsContext = sessionStorage.getItem('realtiq.analyticsPaymentReference') === reference;
        const payment = result.verified ? result.payment : undefined;

        if (!result.verified || !payment || payment.status !== 'paid') {
          const requestId = stored.requestId || payment?.proxyInspectionRequest;
          const actionTo = hasCartContext
            ? (isBuyer ? '/dashboard/buyer/cart-checkouts' : '/cart')
            : hasAnalyticsContext
              ? '/analytics/property-market'
              : requestId
                ? `/buyer/proxy-inspections/${encodeURIComponent(requestId)}`
                : isBuyer
                  ? '/dashboard/buyer/payment-history'
                  : '/properties';
          setState({
            loading: false,
            error: true,
            reference,
            message: 'The provider has not confirmed this payment. Its outcome is unresolved, not confirmed as failed. The existing reference is preserved; do not start a replacement payment while this is unresolved.',
            actionLabel: hasCartContext ? (isBuyer ? 'Checkout history' : 'Back to Service Cart') : hasAnalyticsContext ? 'Analytics' : requestId ? 'Open inspection workspace' : isBuyer ? 'Payment History' : 'Browse Properties',
            actionTo,
          });
          return;
        }

        if (payment.purpose === 'multi_service_cart') {
          let checkoutId = hasCartContext ? pendingCart.checkoutId : undefined;
          if (!checkoutId) {
            const recent = await cartService.listCartCheckouts({ page: 1, limit: 10 });
            checkoutId = recent.checkouts.find((item) => item.paymentReference === reference)?.checkoutId;
          }

          if (!checkoutId) {
            setState({
              loading: false,
              error: true,
              reference,
              message: 'Payment is verified, but its checkout record could not be matched. Keep this reference for reconciliation and do not start another checkout.',
              actionLabel: isBuyer ? 'Checkout history' : 'Back to Service Cart',
              actionTo: isBuyer ? '/dashboard/buyer/cart-checkouts' : '/cart',
            });
            return;
          }

          cartService.clearPendingCheckout();
          setCartFromResponse(null);
          window.setTimeout(() => void refreshCart().catch(() => undefined), 1000);
          if (checkoutId && isBuyer) {
            navigate(`/dashboard/buyer/cart-checkouts/${checkoutId}`, { replace: true });
            return;
          }

          setState({
            loading: false,
            error: false,
            message: checkoutId
              ? 'Cart payment verified. Allocation status is being processed; return to your service cart if you need to start another checkout.'
              : isBuyer
                ? 'Cart payment verified. Open your service checkout history to view allocation status.'
                : 'Cart payment verified. Return to your service cart if you need to start another checkout.',
            actionLabel: isBuyer ? 'Checkout history' : 'Back to Service Cart',
            actionTo: isBuyer ? '/dashboard/buyer/cart-checkouts' : '/cart',
          });
          return;
        }

        if (payment.purpose === 'property_market_analytics') {
          const access = await propertyAnalyticsService.getAccessStatus();
          if (access.hasAccess) {
            sessionStorage.removeItem('realtiq.analyticsPaymentReference');
            navigate('/analytics/property-market', { replace: true });
            return;
          }

          setState({
            loading: false,
            error: true,
            message: 'Payment was verified, but analytics access is not active yet. Use the retry button on the analytics page.',
            actionLabel: 'Analytics',
            actionTo: '/analytics/property-market',
          });
          return;
        }

        const requestId = payment.proxyInspectionRequest || stored.requestId;

        if (!requestId) {
          setState({
            loading: false,
            error: false,
            message: 'Payment verified. Return to your inspection list to view the funded job.',
            actionLabel: 'Inspection jobs',
            actionTo: '/buyer/proxy-inspections',
          });
          return;
        }

        for (const delay of [0, 1000, 2000, 4000]) {
          if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay));
          const detail = await proxyNetworkService.getDetail(requestId);
          if (detail.request.status === 'funded' || detail.serviceEscrow?.status === 'funded') break;
        }
        sessionStorage.removeItem('realtiq.proxyPaymentContext');
        navigate(`/buyer/proxy-inspections/${requestId}`, { replace: true });
      })
      .catch((raw) =>
        setState({
          loading: false,
          error: true,
          reference,
          message: raw instanceof Error ? raw.message : 'Payment verification could not be completed.',
          actionLabel: 'Back to Service Cart',
          actionTo: '/cart',
        }),
      );
  }, [isBuyer, navigate, params, refreshCart, retryCount, setCartFromResponse]);

  return (
    <PublicLayout>
      <main className="mx-auto max-w-lg px-6 py-24 text-center">
        <div className="rounded-2xl bg-white p-10 shadow-sm">
          <h1 className="text-3xl font-black">
            {state.loading ? 'Verifying payment' : state.error ? 'Verification needs attention' : 'Payment verified'}
          </h1>
          <p className="mt-4 text-secondary">{state.message}</p>
          {state.reference ? <p className="mt-2 break-all text-xs text-secondary">Payment reference: {state.reference}</p> : null}
          {!state.loading && state.error && (state.reference || hasReference) ? (
            <button
              type="button"
              className="mt-6 inline-block rounded-lg bg-primary px-5 py-3 font-bold text-on-primary"
              onClick={() => {
                fired.current = false;
                setState({ loading: true, error: false, message: 'Checking the current provider status...', reference: state.reference });
                setRetryCount((count) => count + 1);
              }}
            >
              Check payment status again
            </button>
          ) : null}
          {!state.loading && state.actionLabel && state.actionTo ? (
            <Link to={state.actionTo} className="mt-6 inline-block rounded-lg bg-primary px-5 py-3 font-bold text-on-primary">
              {state.actionLabel}
            </Link>
          ) : null}
        </div>
      </main>
    </PublicLayout>
  );
};

export default ProxyPaymentReturn;
