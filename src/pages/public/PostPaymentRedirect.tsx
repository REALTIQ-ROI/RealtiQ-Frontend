import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import PublicLayout from '../../components/layout/PublicLayout';
import { paymentService } from '../../services/paymentService';

type VerifyStatus = 'verifying' | 'success' | 'failed';

const PostPaymentRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get('reference') ?? searchParams.get('trxref');
  const hasFired = useRef(false);

  const [status, setStatus] = useState<VerifyStatus>('verifying');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    if (!reference) {
      setStatus('failed');
      setErrorMessage('No payment reference found in the URL.');
      return;
    }

    paymentService
      .verifyPayment(reference)
      .then((result) => {
        if (result.verified) {
          setPaymentId(result.payment._id);
          setStatus('success');
          toast.success('Payment verified successfully');
        } else {
          setStatus('failed');
          setErrorMessage('Payment could not be verified.');
          toast.error('Payment verification failed');
        }
      })
      .catch((err: unknown) => {
        setStatus('failed');
        setErrorMessage(err instanceof Error ? err.message : 'Unable to verify payment');
        toast.error(err instanceof Error ? err.message : 'Payment verification failed');
      });
  }, [reference]);

  const handleRetry = () => {
    if (!reference) return;
    hasFired.current = false;
    setStatus('verifying');
    setErrorMessage(null);

    paymentService
      .verifyPayment(reference)
      .then((result) => {
        if (result.verified) {
          setPaymentId(result.payment._id);
          setStatus('success');
          toast.success('Payment verified successfully');
        } else {
          setStatus('failed');
          setErrorMessage('Payment could not be verified.');
          toast.error('Payment verification failed');
        }
      })
      .catch((err: unknown) => {
        setStatus('failed');
        setErrorMessage(err instanceof Error ? err.message : 'Unable to verify payment');
        toast.error(err instanceof Error ? err.message : 'Payment verification failed');
      });
  };

  return (
    <PublicLayout>
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        {status === 'verifying' && (
          <>
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-amber-500 animate-spin">progress_activity</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-3">Payment Pending</h1>
            <p className="text-secondary mb-2">We are waiting for payment confirmation</p>
            {reference && (
              <p className="text-xs font-mono text-secondary/60 mt-2">Ref: {reference}</p>
            )}
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-3">Payment Successful</h1>
            <p className="text-secondary mb-8">Your property purchase has been confirmed</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {paymentId && (
                <button
                  onClick={() => void navigate(`/dashboard/buyer/payment-details/${paymentId}`)}
                  className="px-8 py-3 bg-primary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  View Receipt
                </button>
              )}
              <button
                onClick={() => void navigate('/dashboard/buyer')}
                className="px-8 py-3 bg-surface-container-low text-on-surface rounded-xl font-bold text-sm hover:bg-surface-container transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-3">Payment Failed</h1>
            <p className="text-secondary mb-2">We could not verify this payment</p>
            {errorMessage && (
              <p className="text-sm text-red-600 mb-8">{errorMessage}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {reference && (
                <button
                  onClick={handleRetry}
                  className="px-8 py-3 bg-primary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  Retry Verification
                </button>
              )}
              <button
                onClick={() => void navigate('/dashboard/buyer/payment-history')}
                className="px-8 py-3 bg-surface-container-low text-on-surface rounded-xl font-bold text-sm hover:bg-surface-container transition-colors"
              >
                View Payment History
              </button>
            </div>
          </>
        )}
      </div>
    </PublicLayout>
  );
};

export default PostPaymentRedirect;
