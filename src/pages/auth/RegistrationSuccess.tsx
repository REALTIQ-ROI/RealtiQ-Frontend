import { Link, useLocation } from 'react-router-dom';
import { marketAuthPath, useMarketAccessIntent } from '../../hooks/useMarketAccessIntent';
import EmailVerificationResend from '../../components/auth/EmailVerificationResend';
import { EMAIL_VERIFICATION_RESEND_COOLDOWN_MS, normalizeVerificationEmail } from '../../lib/emailVerification';

const RegistrationSuccess = () => {
  const location = useLocation();
  const marketRedirect = useMarketAccessIntent();
  const routeState = location.state as { email?: unknown; verificationRequestedAt?: unknown } | null;
  const email = typeof routeState?.email === 'string' ? normalizeVerificationEmail(routeState.email) : '';
  const requestedAt = typeof routeState?.verificationRequestedAt === 'number' && Number.isFinite(routeState.verificationRequestedAt)
    ? routeState.verificationRequestedAt
    : null;
  const initialCooldownUntil = email
    ? (requestedAt ?? 0) + EMAIL_VERIFICATION_RESEND_COOLDOWN_MS
    : 0;
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
          RealtIQ
        </Link>

        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-blue-500 text-3xl">mark_email_read</span>
        </div>

        <h1
          className="text-2xl font-extrabold text-slate-900 tracking-tight mb-3"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Check Your Email
        </h1>

        <p className="text-slate-500 text-sm leading-relaxed mb-2">
          Registration successful. If your account is eligible, check your inbox and spam folder for a verification email.
          {marketRedirect ? ' After verification, sign in to continue to Property Market Analysis payment.' : ''}
        </p>
        <p className="text-slate-400 text-xs leading-relaxed mb-8">
          Registration requested a verification email, but this does not confirm provider delivery.
        </p>

        {email ? <div className="mb-8 text-left"><EmailVerificationResend email={email} initialCooldownUntil={initialCooldownUntil} /></div> : null}
        {!email ? <p className="mb-8 text-left text-xs text-slate-500" role="note">To resend a verification email, return here from the registration form you submitted.</p> : null}

        <div className="space-y-3">
          <Link
            to={marketAuthPath('/login', marketRedirect)}
            className="inline-block w-full py-4 rounded-xl text-white font-bold text-sm tracking-tight hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #000000 0%, #111c2d 100%)' }}
          >
            Back to Login
          </Link>
          <Link
            to="/"
            className="inline-block w-full py-4 rounded-xl bg-surface-container-low text-on-surface font-bold text-sm tracking-tight hover:bg-surface-container transition-colors"
          >
            Back to Home
          </Link>
          <Link to="/contact" className="inline-block w-full py-3 text-sm font-semibold text-primary hover:underline">
            Contact support about verification
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSuccess;
