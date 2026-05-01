import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import AuthLoader from '../../components/common/AuthLoader';

type Status = 'loading' | 'success' | 'error';

const VerifyEmail = () => {
  const { token: pathToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? pathToken;
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(3);
  // Prevents React StrictMode's double-invocation from firing two API calls.
  // The token is a one-time secret; a second request would return "already used".
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    authService
      .verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
      })
      .catch((err: unknown) => {
        setStatus('error');
        setMessage(
          err instanceof Error ? err.message : 'Email verification failed. Please try again.',
        );
      });
  }, [token]);

  // Auto-redirect to login after successful verification
  useEffect(() => {
    if (status !== 'success') return;

    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          navigate('/login', { replace: true });
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, navigate]);

  if (status === 'loading') return <AuthLoader />;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#f7f9fb', fontFamily: 'Inter, sans-serif' }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl p-10 shadow-sm text-center">
        <Link
          to="/"
          className="text-2xl font-black tracking-tighter text-slate-900 mb-8 block"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          RealtiQ
        </Link>

        {status === 'success' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
            </div>
            <h1
              className="text-2xl font-extrabold text-slate-900 tracking-tight mb-3"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Email Verified
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-2">
              {message || 'Email verified successfully. You can now log in.'}
            </p>
            <p className="text-slate-400 text-xs mb-8">
              Redirecting to login in {countdown}s…
            </p>
            <Link
              to="/login"
              className="inline-block w-full py-4 rounded-xl text-white font-bold text-sm tracking-tight hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #000000 0%, #111c2d 100%)' }}
            >
              Proceed to Login
            </Link>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
            </div>
            <h1
              className="text-2xl font-extrabold text-slate-900 tracking-tight mb-3"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Verification Failed
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              {message || 'This verification link is invalid or has expired.'}
            </p>
            <div className="space-y-3">
              <Link
                to="/login"
                className="inline-block w-full py-4 rounded-xl text-white font-bold text-sm tracking-tight hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #000000 0%, #111c2d 100%)' }}
              >
                Back to Login
              </Link>
              <Link
                to="/register"
                className="inline-block w-full py-4 rounded-xl bg-surface-container-low text-on-surface font-bold text-sm tracking-tight hover:bg-surface-container transition-colors"
              >
                Create New Account
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
