import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import PublicLayout from "../../components/layout/PublicLayout";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { cartService } from "../../services/cartService";
import { escrowService } from "../../services/escrowService";
import { paymentService } from "../../services/paymentService";
import { titleDocumentService } from "../../services/titleDocumentService";
import { protectedMediaService, type ProtectedMediaOrder } from "../../services/protectedMediaService";
import type { CartCheckoutDetail } from "../../types";
import { checkoutStatusClasses, checkoutStatusLabel } from "../../utils/cartFormatters";

type VerifyStatus = "verifying" | "pending" | "success" | "failed";
const wait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const PostPaymentRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, activeProfile } = useAuth();
  const pendingTitlePayment = titleDocumentService.getPendingPayment();
  const pendingMediaOrder = protectedMediaService.getPendingOrder();
  const queryReference =
    searchParams.get("reference") ?? searchParams.get("trxref");
  const escrowId = escrowService.getPendingId();
  const escrowReference = escrowService.getPendingReference();
  const isEscrow = Boolean(
    escrowId &&
    escrowReference &&
    (!queryReference || queryReference === escrowReference),
  );
  const reference =
    queryReference ??
    (isEscrow ? escrowReference : pendingTitlePayment.reference ?? paymentService.getPendingPaymentReference());
  const fired = useRef(false);
  const [status, setStatus] = useState<VerifyStatus>(
    reference || pendingMediaOrder.id || pendingTitlePayment.documentId ? "verifying" : "failed",
  );
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [cartCheckout, setCartCheckout] = useState<CartCheckoutDetail | null>(null);
  const [protectedMediaOrder, setProtectedMediaOrder] = useState<{ order: ProtectedMediaOrder; paymentStatus: string } | null>(null);
  const [titleDocumentId, setTitleDocumentId] = useState<string | null>(pendingTitlePayment.documentId);
  const [titlePropertyId, setTitlePropertyId] = useState<string | null>(pendingTitlePayment.propertyId);
  const [titleAccessReady, setTitleAccessReady] = useState(false);
  const [titlePurchaseState, setTitlePurchaseState] = useState<string | null>(null);
  const [openingViewer, setOpeningViewer] = useState(false);
  const [isTitleDocumentPayment, setIsTitleDocumentPayment] = useState(
    Boolean(pendingTitlePayment.documentId || reference && (reference.startsWith("RTQ-DOC-PAY-") || reference === pendingTitlePayment.reference)),
  );
  const [errorMessage, setErrorMessage] = useState(
    reference
      ? null
      : "No payment reference was found. Return to your escrow or payment history to retry.",
  );
  const { refreshCart, setCartFromResponse } = useCart();
  const isBuyer = isAuthenticated && activeProfile?.kind === "buyer";

  const verify = useCallback(async () => {
    const pendingOrder = protectedMediaService.getPendingOrder();
    if (!reference && !pendingOrder.id && !pendingTitlePayment.documentId) return;
    setStatus("verifying");
    setErrorMessage(null);
    try {
      const titleReturn = Boolean(pendingTitlePayment.documentId && (!queryReference || !pendingTitlePayment.reference || queryReference === pendingTitlePayment.reference));
      if (titleReturn || reference?.startsWith('RTQ-DOC-')) {
        setIsTitleDocumentPayment(true);
        if (activeProfile?.kind !== 'buyer') throw new Error('Select an eligible Buyer profile to check this title-document access status.');
        if (pendingTitlePayment.profileId && pendingTitlePayment.profileId !== activeProfile?.id) throw new Error('Select the Buyer profile that started this document checkout, then check its status again.');
        if (queryReference && pendingTitlePayment.reference && queryReference !== pendingTitlePayment.reference) throw new Error('This provider return does not match the current title-document checkout. Check the saved checkout status before taking another action.');
        const documentId = pendingTitlePayment.documentId;
        if (!documentId) throw new Error('The title-document checkout reference is present, but its document cannot be identified from the saved request. Contact support; do not start another checkout.');
        setTitleDocumentId(documentId); setTitlePropertyId(pendingTitlePayment.propertyId);
        const access = await titleDocumentService.accessStatus(documentId);
        setTitlePurchaseState(access.purchaseState ?? 'unknown');
        const ready = access.hasAccess && access.purchaseState === 'active';
        setTitleAccessReady(ready);
        if (ready) titleDocumentService.clearPendingPayment();
        if (access.purchaseState === 'failed' || access.purchaseState === 'consumed' && !access.hasAccess) {
          setStatus('failed');
          setErrorMessage(access.message ?? (access.purchaseState === 'failed' ? 'The server reports that this checkout failed. Review its current status before starting another request.' : 'This document access has been consumed and is not currently available.'));
        } else {
          setStatus(ready ? 'success' : 'pending');
          if (!sessionStorage.getItem(`realtiq.titlePaymentNotified.${pendingTitlePayment.reference ?? 'unknown'}`)) {
            toast.info(ready ? 'The server confirms that document access is active.' : 'The provider returned, but the server has not confirmed document access yet.');
            sessionStorage.setItem(`realtiq.titlePaymentNotified.${pendingTitlePayment.reference ?? 'unknown'}`, '1');
          }
        }
        return;
      }
      if (pendingOrder.id && (!reference || pendingOrder.paymentReference === reference)) {
        if (pendingOrder.profileId && pendingOrder.profileId !== activeProfile?.id) {
          throw new Error('Select the Buyer profile that started this media order, then check its status again.');
        }
        const current = await protectedMediaService.getOrder(pendingOrder.id);
        if (!reference || current.order.paymentReference === reference) {
          setProtectedMediaOrder(current);
          if (current.order.state === 'active' || current.order.state === 'failed') protectedMediaService.clearPendingOrder();
          setStatus(current.order.state === 'pending' || current.order.state === 'held' ? 'pending' : 'success');
          return;
        }
      }
      if (!reference) throw new Error('No payment reference was returned. Check the existing order status before trying another payment.');
      const result = await paymentService.verifyPayment(reference);
      if (!result.verified) throw new Error("The provider has not confirmed this payment yet. No payment success or failure is assumed. Check the status again later and do not start another payment while the outcome is unresolved.");
      setPaymentId(result.payment._id);
      const paymentPurpose = result.payment.purpose || result.payment.metadata?.paymentPurpose;
      if (paymentPurpose === "multi_service_cart") {
        const pendingCheckout = cartService.getPendingCheckout();
        let checkout: CartCheckoutDetail | null = null;
        if (pendingCheckout.checkoutId) {
          checkout = await cartService.getCartCheckout(pendingCheckout.checkoutId);
          if (checkout.paymentReference !== reference && !checkout.paymentParts?.some((part) => part.reference === reference)) checkout = null;
        }
        if (!checkout) {
          const recent = await cartService.listCartCheckouts({ page: 1, limit: 10 });
          checkout = recent.checkouts.find((item) => item.paymentReference === reference || item.paymentParts?.some((part) => part.reference === reference)) ?? null;
        }
        if (!checkout) throw new Error('The payment reference was verified, but its checkout could not be loaded. Refresh checkout history before taking another payment action.');
        setCartCheckout(checkout);
        if (checkout && ['completed', 'failed', 'expired', 'refunded'].includes(checkout.status)) cartService.clearPendingCheckout();
        setCartFromResponse(null);
        window.setTimeout(() => void refreshCart().catch(() => undefined), 1000);
        if (!sessionStorage.getItem(`realtiq.cartPaymentNotified.${reference}`)) {
          toast.info("A cart payment reference was verified. Review every payment part and service allocation.");
          sessionStorage.setItem(`realtiq.cartPaymentNotified.${reference}`, "1");
        }
        setStatus("success");
        return;
      }
      if (isEscrow && escrowId) {
        let escrow = await escrowService.get(escrowId);
        for (
          let attempt = 0;
          attempt < 4 && escrow.status === "pending_payment";
          attempt += 1
        ) {
          await wait(1000 * (attempt + 1));
          escrow = await escrowService.get(escrowId);
        }
        if (escrow.status === "pending_payment")
          throw new Error(
            "Payment was verified, but escrow locking is still processing. Retry in a moment.",
          );
        escrowService.clearPending();
        toast.success("Payment secured in escrow.");
      } else {
        paymentService.clearPendingPayment();
        toast.success("Payment verified successfully.");
      }
      setStatus("success");
    } catch (error) {
      setStatus("failed");
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to verify payment.",
      );
    }
  }, [activeProfile?.id, escrowId, isEscrow, pendingTitlePayment.documentId, pendingTitlePayment.profileId, pendingTitlePayment.propertyId, pendingTitlePayment.reference, queryReference, reference, refreshCart, setCartFromResponse]);

  const refreshProtectedMediaOrder = async () => {
    const pendingOrder = protectedMediaService.getPendingOrder();
    const orderId = protectedMediaOrder?.order.id ?? pendingOrder.id;
    if (!orderId) return;
    setStatus('verifying'); setErrorMessage(null);
    try {
      if (pendingOrder.profileId && pendingOrder.profileId !== activeProfile?.id) throw new Error('Select the Buyer profile that started this media order, then check its status again.');
      const current = await protectedMediaService.getOrder(orderId);
      setProtectedMediaOrder(current);
      if (current.order.state === 'active' || current.order.state === 'failed') protectedMediaService.clearPendingOrder();
      setStatus(current.order.state === 'pending' || current.order.state === 'held' ? 'pending' : 'success');
    } catch (raw) {
      setStatus('failed');
      setErrorMessage(raw instanceof Error ? raw.message : 'The protected media order could not be checked.');
    }
  };

  const openTitleViewer = async () => {
    if (!titleDocumentId || openingViewer) return;
    setOpeningViewer(true);
    try {
      if (pendingTitlePayment.profileId && pendingTitlePayment.profileId !== activeProfile?.id) throw new Error('Select the Buyer profile that received this access before opening the document.');
      const access = await titleDocumentService.accessStatus(titleDocumentId);
      setTitlePurchaseState(access.purchaseState ?? 'unknown');
      if (!access.hasAccess || access.purchaseState !== 'active') throw new Error('The server has not confirmed current access for this document.');
      const session = await titleDocumentService.openViewer(titleDocumentId);
      navigate("/protected-title-viewer", {
        state: { session, documentId: titleDocumentId, propertyId: titlePropertyId ?? "", mode: access.mode },
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to open the protected viewer.");
      setStatus("failed");
    } finally {
      setOpeningViewer(false);
    }
  };

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void verify();
  }, [verify]);

  return (
    <PublicLayout>
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        {status === "verifying" ? (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            </div>
            <h1 className="text-3xl font-extrabold">Verifying payment</h1>
            <p className="mt-3 text-secondary">
              {isEscrow
                ? "Confirming payment and securing the funds in escrow…"
                : isTitleDocumentPayment
                  ? "Confirming payment and preparing access without starting a viewer session…"
                  : "Confirming your payment…"}
            </p>
            {reference ? (
              <p className="mt-2 break-all text-xs text-secondary">
                Reference: {reference}
              </p>
            ) : null}
          </>
        ) : null}
        {status === "pending" && protectedMediaOrder ? (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
              <span className="material-symbols-outlined text-4xl text-amber-800">hourglass_top</span>
            </div>
            <h1 className="text-3xl font-extrabold">Protected media order pending</h1>
            <p role="status" className="mt-3 text-secondary">Order {protectedMediaOrder.order.state.replaceAll('_', ' ')} · payment {protectedMediaOrder.paymentStatus.replaceAll('_', ' ')}. The server has not confirmed access yet. Refresh this same order; do not start another payment while its result is pending.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={() => void refreshProtectedMediaOrder()} className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-on-primary">Refresh order status</button>
              <Link to="/dashboard/buyer" className="rounded-xl bg-surface-container-low px-8 py-3 text-sm font-bold">Return to Buyer dashboard</Link>
            </div>
          </>
        ) : null}
        {status === "pending" && isTitleDocumentPayment ? (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100"><span className="material-symbols-outlined text-4xl text-amber-800">hourglass_top</span></div>
            <h1 className="text-3xl font-extrabold">Checking document access</h1>
            <p role="status" className="mt-3 text-secondary">The provider return is not confirmation of payment. The server currently reports {titlePurchaseState?.replaceAll('_', ' ') ?? 'an unresolved status'}. Refresh this same access status; do not start another checkout while the result is pending.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={() => void verify()} className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-on-primary">Refresh access status</button><Link to={titlePropertyId ? `/properties/${titlePropertyId}` : '/dashboard/buyer'} className="rounded-xl bg-surface-container-low px-8 py-3 text-sm font-bold">Return to property</Link></div>
          </>
        ) : null}
        {status === "success" ? (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <span className="material-symbols-outlined text-4xl text-emerald-700">
                verified_user
              </span>
            </div>
            <h1 className="text-3xl font-extrabold">
              {protectedMediaOrder ? "Protected media order update" : cartCheckout ? "Service checkout update" : isEscrow ? "Payment secured in escrow" : isTitleDocumentPayment ? titleAccessReady ? "Document access ready" : "Document access pending" : "Payment verified"}
            </h1>
            <p className="mt-3 text-secondary">
              {protectedMediaOrder
                ? protectedMediaOrder.order.state === 'active'
                  ? 'The backend confirms active access for this purchase profile. Return to the listing to open the protected viewer; no viewer session has been started.'
                  : protectedMediaOrder.order.state === 'failed'
                    ? 'The backend reports that this order failed. Review the order before starting a new purchase.'
                    : 'The order is not active yet. Refresh the same order to check its current payment and access state.'
                : cartCheckout
                ? cartCheckout.status === "completed"
                  ? "Payment received and all services are active."
                  : cartCheckout.status === "allocation_processing"
                    ? "Payment received; services are being activated."
                    : cartCheckout.status === "partially_failed"
                      ? "Payment succeeded, but one or more services are still being activated. No additional payment is required."
                      : cartCheckout.status === "failed"
                        ? "A payment reference was verified, but checkout failed. Review all payment parts before another attempt."
                        : "A payment reference was verified. Other parts or service allocations may still be pending."
                : isEscrow
                ? "Your payment is locked while the agreed conditions are completed. This is not yet a completed property purchase."
                : isTitleDocumentPayment
                  ? titleAccessReady
                    ? "The server confirms that this Buyer profile has document access. Opening the viewer starts a separate protected viewing session."
                    : "The server has not confirmed document access. Refresh the current access status before taking another action."
                : "The backend verified this payment. Check the related ownership or allocation record for its current status."}
            </p>
            {cartCheckout ? (
              <div className="mx-auto mt-5 max-w-sm rounded-xl bg-surface-container-low p-4 text-left text-sm">
                <p className="font-bold">Allocation status</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${checkoutStatusClasses(cartCheckout.status)}`}>
                  {checkoutStatusLabel(cartCheckout.status)}
                </span>
              </div>
            ) : null}
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {protectedMediaOrder ? (
                <Link to="/dashboard/buyer" className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-on-primary">Return to Buyer dashboard</Link>
              ) : cartCheckout ? (
                <Link
                  to={isBuyer ? `/dashboard/buyer/cart-checkouts/${cartCheckout.checkoutId}` : "/cart"}
                  className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-on-primary"
                >
                  {isBuyer ? "View Service Checkout" : "Back to Service Cart"}
                </Link>
              ) : isTitleDocumentPayment && titleAccessReady && titleDocumentId ? (
                <button
                  type="button"
                  onClick={() => void openTitleViewer()}
                  disabled={openingViewer}
                  className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-on-primary disabled:opacity-60"
                >
                  {openingViewer ? "Opening…" : "Open protected viewer"}
                </button>
              ) : isEscrow && escrowId ? (
                <Link
                  to={`/dashboard/buyer/escrows/${escrowId}`}
                  className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-on-primary"
                >
                  View Escrow
                </Link>
              ) : paymentId ? (
                <Link
                  to={`/dashboard/buyer/payment-details/${paymentId}`}
                  className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-on-primary"
                >
                  View Receipt
                </Link>
              ) : null}
              <Link
                to={isTitleDocumentPayment && titlePropertyId ? `/properties/${titlePropertyId}` : "/dashboard/buyer"}
                className="rounded-xl bg-surface-container-low px-8 py-3 text-sm font-bold"
              >
                {isTitleDocumentPayment ? "Return to property" : "Go to Dashboard"}
              </Link>
            </div>
          </>
        ) : null}
        {status === "failed" ? (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <span className="material-symbols-outlined text-4xl text-red-600">
                error
              </span>
            </div>
            <h1 className="text-3xl font-extrabold">
              Payment verification incomplete
            </h1>
            <p role="alert" className="mt-3 text-red-700">
              {errorMessage}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {reference || pendingMediaOrder.id ? (
                <button
                  type="button"
                  onClick={() => pendingMediaOrder.id ? void refreshProtectedMediaOrder() : void verify()}
                  className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-on-primary"
                >
                  {pendingMediaOrder.id ? 'Check order status again' : isTitleDocumentPayment ? 'Check document access status again' : 'Check payment status again'}
                </button>
              ) : null}
              {isEscrow && escrowId ? (
                <Link
                  to={`/dashboard/buyer/escrows/${escrowId}`}
                  className="rounded-xl bg-surface-container-low px-8 py-3 text-sm font-bold"
                >
                  Return to Escrow
                </Link>
              ) : (
                <Link
                  to="/dashboard/buyer/payment-history"
                  className="rounded-xl bg-surface-container-low px-8 py-3 text-sm font-bold"
                >
                  Payment History
                </Link>
              )}
            </div>
          </>
        ) : null}
      </main>
    </PublicLayout>
  );
};
export default PostPaymentRedirect;
