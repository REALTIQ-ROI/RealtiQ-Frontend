import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import PublicLayout from "../../components/layout/PublicLayout";
import { escrowService } from "../../services/escrowService";
import { paymentService } from "../../services/paymentService";
import { titleDocumentService } from "../../services/titleDocumentService";

type VerifyStatus = "verifying" | "success" | "failed";
const wait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const PostPaymentRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pendingTitlePayment = titleDocumentService.getPendingPayment();
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
    (isEscrow ? escrowReference : paymentService.getPendingPaymentReference());
  const fired = useRef(false);
  const [status, setStatus] = useState<VerifyStatus>(
    reference ? "verifying" : "failed",
  );
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [titleDocumentId, setTitleDocumentId] = useState<string | null>(pendingTitlePayment.documentId);
  const [titlePropertyId, setTitlePropertyId] = useState<string | null>(pendingTitlePayment.propertyId);
  const [titleAccessReady, setTitleAccessReady] = useState(false);
  const [openingViewer, setOpeningViewer] = useState(false);
  const [isTitleDocumentPayment, setIsTitleDocumentPayment] = useState(
    Boolean(reference && (reference.startsWith("RTQ-DOC-PAY-") || reference === pendingTitlePayment.reference)),
  );
  const [errorMessage, setErrorMessage] = useState(
    reference
      ? null
      : "No payment reference was found. Return to your escrow or payment history to retry.",
  );

  const verify = useCallback(async () => {
    if (!reference) return;
    setStatus("verifying");
    setErrorMessage(null);
    try {
      const result = await paymentService.verifyPayment(reference);
      if (!result.verified) throw new Error("Payment could not be verified.");
      setPaymentId(result.payment._id);
      const verifiedTitlePayment =
        result.payment.purpose === "title_document_view" ||
        result.payment.metadata?.paymentPurpose === "title_document_view" ||
        reference.startsWith("RTQ-DOC-PAY-");
      if (verifiedTitlePayment) {
        const documentId = result.payment.metadata?.documentId ?? pendingTitlePayment.documentId;
        const propertyId = result.payment.metadata?.propertyId ?? pendingTitlePayment.propertyId;
        setIsTitleDocumentPayment(true);
        setTitleDocumentId(documentId);
        setTitlePropertyId(propertyId);
        if (!documentId) throw new Error("Payment was verified, but its title document could not be identified.");
        let ready = false;
        for (let attempt = 0; attempt < 4 && !ready; attempt += 1) {
          if (attempt > 0) await wait(750 * attempt);
          const access = await titleDocumentService.accessStatus(documentId);
          ready = access.hasAccess;
          if (!ready && !access.paymentRequired && access.message) break;
        }
        setTitleAccessReady(ready);
        titleDocumentService.clearPendingPayment();
        if (!sessionStorage.getItem(`realtiq.titlePaymentNotified.${reference}`)) {
          toast.success("Payment successful — your document access is ready.");
          sessionStorage.setItem(`realtiq.titlePaymentNotified.${reference}`, "1");
        }
      } else if (isEscrow && escrowId) {
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
  }, [escrowId, isEscrow, pendingTitlePayment.documentId, pendingTitlePayment.propertyId, reference]);

  const openTitleViewer = async () => {
    if (!titleDocumentId || openingViewer) return;
    setOpeningViewer(true);
    try {
      const session = await titleDocumentService.openViewer(titleDocumentId);
      navigate("/protected-title-viewer", {
        state: { session, documentId: titleDocumentId, propertyId: titlePropertyId ?? "" },
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
        {status === "success" ? (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <span className="material-symbols-outlined text-4xl text-emerald-700">
                verified_user
              </span>
            </div>
            <h1 className="text-3xl font-extrabold">
              {isEscrow ? "Payment secured in escrow" : isTitleDocumentPayment ? "Document access ready" : "Payment Successful"}
            </h1>
            <p className="mt-3 text-secondary">
              {isEscrow
                ? "Your payment is locked while the agreed conditions are completed. This is not yet a completed property purchase."
                : isTitleDocumentPayment
                  ? titleAccessReady
                    ? "Payment successful — your document access is ready. Payment did not start or consume a viewer session."
                    : "Payment was verified. Access activation is still processing; return to the property shortly and check access again."
                : "Your property purchase has been confirmed."}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {isTitleDocumentPayment && titleAccessReady && titleDocumentId ? (
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
              {reference ? (
                <button
                  type="button"
                  onClick={() => void verify()}
                  className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-on-primary"
                >
                  Retry Verification
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
