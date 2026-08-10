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
  actionLabel?: string;
  actionTo?: string;
}

const ProxyPaymentReturn = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const fired = useRef(false);
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
      ? { loading: true, message: 'Verifying payment with the backend...', error: false }
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
        if (result.payment.purpose === 'multi_service_cart') {
          const pending = cartService.getPendingCheckout();
          let checkoutId = pending.checkoutId;
          if (!checkoutId) {
            const recent = await cartService.listCartCheckouts({ page: 1, limit: 10 });
            checkoutId =
              recent.checkouts.find((item) => item.paymentReference === reference)?.checkoutId ??
              recent.checkouts[0]?.checkoutId;
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

        if (result.payment.purpose === 'property_market_analytics') {
          if (!result.verified || result.payment.status !== 'paid') {
            setState({
              loading: false,
              error: true,
              message: 'Analytics payment is not yet confirmed. Return to the analytics page to retry.',
              actionLabel: 'Analytics',
              actionTo: '/analytics/property-market',
            });
            return;
          }

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

        const requestId = result.payment.proxyInspectionRequest || stored.requestId;
        if (!result.verified || result.payment.status !== 'paid') {
          setState({
            loading: false,
            error: true,
            message: 'Payment is not yet confirmed. Refresh the inspection workspace before trying again.',
            actionLabel: 'Inspection jobs',
            actionTo: '/buyer/proxy-inspections',
          });
          return;
        }

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
          message: raw instanceof Error ? raw.message : 'Payment verification could not be completed.',
          actionLabel: 'Back to Service Cart',
          actionTo: '/cart',
        }),
      );
  }, [isBuyer, navigate, params, refreshCart, setCartFromResponse]);

  return (
    <PublicLayout>
      <main className="mx-auto max-w-lg px-6 py-24 text-center">
        <div className="rounded-2xl bg-white p-10 shadow-sm">
          <h1 className="text-3xl font-black">
            {state.loading ? 'Verifying payment' : state.error ? 'Verification needs attention' : 'Payment verified'}
          </h1>
          <p className="mt-4 text-secondary">{state.message}</p>
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
