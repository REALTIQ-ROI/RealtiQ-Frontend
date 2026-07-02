import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import PublicLayout from '../../components/layout/PublicLayout';
import { escrowService } from '../../services/escrowService';
import { paymentService } from '../../services/paymentService';

type VerifyStatus = 'verifying' | 'success' | 'failed';
const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const PostPaymentRedirect = () => {
  const [searchParams] = useSearchParams();
  const queryReference = searchParams.get('reference') ?? searchParams.get('trxref');
  const escrowId = escrowService.getPendingId();
  const escrowReference = escrowService.getPendingReference();
  const isEscrow = Boolean(escrowId && escrowReference && (!queryReference || queryReference === escrowReference));
  const reference = queryReference ?? (isEscrow ? escrowReference : paymentService.getPendingPaymentReference());
  const fired = useRef(false);
  const [status, setStatus] = useState<VerifyStatus>(reference ? 'verifying' : 'failed');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState(reference ? null : 'No payment reference was found. Return to your escrow or payment history to retry.');

  const verify = useCallback(async () => {
    if (!reference) return;
    setStatus('verifying'); setErrorMessage(null);
    try {
      const result = await paymentService.verifyPayment(reference);
      if (!result.verified) throw new Error('Payment could not be verified.');
      setPaymentId(result.payment._id);
      if (isEscrow && escrowId) {
        let escrow = await escrowService.get(escrowId);
        for (let attempt = 0; attempt < 4 && escrow.status === 'pending_payment'; attempt += 1) {
          await wait(1000 * (attempt + 1));
          escrow = await escrowService.get(escrowId);
        }
        if (escrow.status === 'pending_payment') throw new Error('Payment was verified, but escrow locking is still processing. Retry in a moment.');
        escrowService.clearPending();
        toast.success('Payment secured in escrow.');
      } else {
        paymentService.clearPendingPayment();
        toast.success('Payment verified successfully.');
      }
      setStatus('success');
    } catch (error) {
      setStatus('failed'); setErrorMessage(error instanceof Error ? error.message : 'Unable to verify payment.');
    }
  }, [escrowId, isEscrow, reference]);

  useEffect(() => { if (fired.current) return; fired.current = true; void verify(); }, [verify]);

  return <PublicLayout><main className="mx-auto max-w-xl px-6 py-24 text-center">
    {status === 'verifying' ? <><div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100"><span className="material-symbols-outlined animate-spin text-4xl text-amber-600">progress_activity</span></div><h1 className="text-3xl font-extrabold">Verifying payment</h1><p className="mt-3 text-secondary">{isEscrow ? 'Confirming payment and securing the funds in escrow…' : 'Confirming your payment…'}</p>{reference ? <p className="mt-2 break-all text-xs text-secondary">Reference: {reference}</p> : null}</> : null}
    {status === 'success' ? <><div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100"><span className="material-symbols-outlined text-4xl text-emerald-700">verified_user</span></div><h1 className="text-3xl font-extrabold">{isEscrow ? 'Payment secured in escrow' : 'Payment Successful'}</h1><p className="mt-3 text-secondary">{isEscrow ? 'Your payment is locked while the agreed conditions are completed. This is not yet a completed property purchase.' : 'Your property purchase has been confirmed.'}</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">{isEscrow && escrowId ? <Link to={`/dashboard/buyer/escrows/${escrowId}`} className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-on-primary">View Escrow</Link> : paymentId ? <Link to={`/dashboard/buyer/payment-details/${paymentId}`} className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-on-primary">View Receipt</Link> : null}<Link to="/dashboard/buyer" className="rounded-xl bg-surface-container-low px-8 py-3 text-sm font-bold">Go to Dashboard</Link></div></> : null}
    {status === 'failed' ? <><div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100"><span className="material-symbols-outlined text-4xl text-red-600">error</span></div><h1 className="text-3xl font-extrabold">Payment verification incomplete</h1><p role="alert" className="mt-3 text-red-700">{errorMessage}</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">{reference ? <button type="button" onClick={() => void verify()} className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-on-primary">Retry Verification</button> : null}{isEscrow && escrowId ? <Link to={`/dashboard/buyer/escrows/${escrowId}`} className="rounded-xl bg-surface-container-low px-8 py-3 text-sm font-bold">Return to Escrow</Link> : <Link to="/dashboard/buyer/payment-history" className="rounded-xl bg-surface-container-low px-8 py-3 text-sm font-bold">Payment History</Link>}</div></> : null}
  </main></PublicLayout>;
};
export default PostPaymentRedirect;
