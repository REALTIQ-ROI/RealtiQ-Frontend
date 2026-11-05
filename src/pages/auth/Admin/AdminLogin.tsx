import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import LoginSecondFactorForm from '../../../components/auth/LoginSecondFactorForm';
import { ApiRequestError } from '../../../lib/axios';
import { authService, isInitialStaffPasswordChangeRequired } from '../../../services/authService';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login, isLoading, loginChallenge } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationSetup, setInvitationSetup] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationBusy, setInvitationBusy] = useState(false);
  const [invitationNotice, setInvitationNotice] = useState('');
  const [invitationExpired, setInvitationExpired] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      const user = await login({ email, password, role: 'admin' });
      if (user) void navigate('/dashboard/admin');
    } catch (err) {
      if (isInitialStaffPasswordChangeRequired(err)) {
        setInvitationSetup({ email: email.trim().toLowerCase(), temporaryPassword: password });
        setPassword('');
        setError(null);
        setInvitationNotice('');
        setInvitationExpired(false);
        return;
      }
      const message = err instanceof Error ? err.message : 'Unable to login. Please check your details.';
      setError(message);
    }
  };

  const completeInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invitationSetup || invitationBusy) return;
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    const utf8Bytes = new TextEncoder().encode(newPassword).length;
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword) || utf8Bytes > 72) {
      setError('Use at least 8 characters, one uppercase letter and one number. Passwords may contain at most 72 UTF-8 bytes.');
      return;
    }
    setInvitationBusy(true);
    setError(null);
    try {
      await authService.completeStaffInvitation({
        email: invitationSetup.email,
        temporaryPassword: invitationSetup.temporaryPassword,
        newPassword,
      });
      setEmail(invitationSetup.email);
      setPassword('');
      setInvitationSetup(null);
      setNewPassword('');
      setConfirmPassword('');
      setInvitationNotice('Password activated. Sign in with your new password. No session was created by password setup.');
    } catch (raw) {
      const code = raw instanceof ApiRequestError ? raw.code : undefined;
      if (code === 'AUTH_STAFF_INVITATION_EXPIRED') {
        setInvitationExpired(true);
        setError('This invitation has expired. Contact an Executive and ask them to resend it.');
      } else {
        setError(raw instanceof Error ? raw.message : 'Password setup could not be completed. Try again or contact an Executive.');
      }
    } finally {
      setInvitationBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen overflow-hidden bg-surface text-on-surface">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-3/5 relative bg-primary-container overflow-hidden">
        <img
          alt="Modern architectural facade"
          className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcnrOMCF2MpmMLP_7ndDFjbjvvtQuJlJjEX-rdOMls-6Ea64PXQ8vKlIOxBIQszTlV9SSCsdHcYdW9lFHv75ox6W4zqZ6Pl0fIH86OG1pS2_bkLr76g-6dA18QSq-BLsK_p_U4S5Z9wbIWjJhA94gYY1NfBZFGUqBuo30tSNbFBCaURpGvtCJwZGUF7jgxnSSCT6pPhmwHjPcVE1k9VqhQqaqwza-LGpC-kuLQF8n730_RenOqgiuyq3j7R85Gkwt0eDPrZvHo1g"
        />
        <div className="relative z-10 p-20 flex flex-col justify-between h-full w-full">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-on-primary flex items-center justify-center rounded-lg">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                architecture
              </span>
            </div>
            <span className="font-headline text-3xl font-extrabold tracking-tighter text-on-primary">RealtIQ</span>
          </div>

          <div className="max-w-xl">
            <span className="font-label text-xs uppercase tracking-[0.2em] text-on-primary-container mb-4 block">
              Architectural Intelligence
            </span>
            <h1 className="font-headline text-6xl font-bold text-on-primary leading-[1.1] mb-8 tracking-tight">
              Precision in every <br />Square foot.
            </h1>
            <p className="text-on-primary-container text-lg font-body leading-relaxed max-w-md">
              Access the most powerful administration suite for high-end luxury real estate portfolios. Curated, managed,
              and optimized.
            </p>
          </div>

          <div className="flex gap-8 items-center text-on-primary-container font-label text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-on-primary font-bold">2.4k+</span>
              <span>Active Properties</span>
            </div>
            <div className="w-px h-8 bg-on-primary-container/20" />
            <div className="flex flex-col gap-1">
              <span className="text-on-primary font-bold">98%</span>
              <span>Admin Efficiency</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 right-0 p-8">
          <div className="backdrop-blur-xl bg-white/5 p-4 rounded-xl border border-white/10">
            <p className="text-on-primary-container text-xs italic">
              &ldquo;Design is not just what it looks like and feels like. Design is how it works.&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel – Login Form */}
      <main className="w-full lg:w-2/5 flex items-center justify-center p-8 bg-surface">
        <div className="w-full max-w-md space-y-12">
          <div className="space-y-4">
            <div className="lg:hidden flex items-center gap-2 mb-8">
              <span className="font-headline text-3xl font-extrabold tracking-tighter text-primary">RealtIQ</span>
            </div>
            <h2 className="font-headline text-4xl font-bold tracking-tight text-on-surface">Login to Admin Console</h2>
            <p className="text-secondary font-body">Welcome back. Enter your credentials to manage the portfolio.</p>
          </div>

          {invitationSetup ? <section className="space-y-5" aria-labelledby="staff-invitation-title">
            <div><h2 id="staff-invitation-title" className="font-headline text-2xl font-bold">Set your permanent password</h2><p className="mt-2 text-sm text-secondary">This Admin invitation requires a new password before sign-in. The temporary password remains only in this page’s memory and will not create a session.</p><p className="mt-2 text-sm font-semibold">Account: {invitationSetup.email}</p></div>
            <form className="space-y-4" onSubmit={(event) => void completeInvitation(event)}>
              <label className="block text-sm font-semibold" htmlFor="staff-new-password">New password<input id="staff-new-password" type="password" autoComplete="new-password" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3" /></label>
              <label className="block text-sm font-semibold" htmlFor="staff-confirm-password">Confirm new password<input id="staff-confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3" /></label>
              <p className="text-xs text-secondary">At least 8 characters, including one uppercase letter and one number; maximum 72 UTF-8 bytes.</p>
              {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
              <button type="submit" disabled={invitationBusy || invitationExpired} className="w-full rounded-xl bg-primary py-4 font-bold text-on-primary disabled:opacity-60">{invitationBusy ? 'Setting password…' : 'Set password and return to sign in'}</button>
              {invitationExpired ? <button type="button" onClick={() => { setInvitationSetup(null); setInvitationExpired(false); setError(null); setNewPassword(''); setConfirmPassword(''); }} className="w-full rounded-xl border border-outline-variant/30 py-3 font-semibold">Return to sign in</button> : null}
            </form>
          </section> : loginChallenge ? (
            <LoginSecondFactorForm challenge={loginChallenge} onSuccess={() => void navigate('/dashboard/admin')} />
          ) : <form className="space-y-6" onSubmit={onSubmit}>
            <div className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <label className="font-label text-sm font-semibold text-on-surface-variant" htmlFor="email">
                  Email Address
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl transition-colors group-focus-within:text-primary">
                    mail
                  </span>
                  <input
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline/50 focus:ring-2 focus:ring-primary/5 transition-all outline outline-offset-0 outline-1 outline-outline-variant/20 focus:outline-surface-tint"
                    id="email"
                    name="email"
                    placeholder="name@realtiq.admin"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-label text-sm font-semibold text-on-surface-variant" htmlFor="password">
                    Password
                  </label>
                  {/* <Link
                    className="text-sm font-semibold text-primary hover:underline underline-offset-4 transition-all"
                    to={`/forgot-password?email=${encodeURIComponent(email)}`}
                  >
                    Forgot Password?
                  </Link> */}
                </div>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl transition-colors group-focus-within:text-primary">
                    lock
                  </span>
                  <input
                    className="w-full pl-12 pr-12 py-4 bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline/50 focus:ring-2 focus:ring-primary/5 transition-all outline outline-offset-0 outline-1 outline-outline-variant/20 focus:outline-surface-tint"
                    id="password"
                    name="password"
                    placeholder="••••••••••••"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Remember device */}
            <div className="flex items-center gap-3">
              <input
                className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20 bg-surface-container-low"
                id="remember"
                type="checkbox"
              />
              <label className="text-sm text-on-surface-variant font-medium select-none" htmlFor="remember">
                Remember this device for 30 days
              </label>
            </div>

            {error && <p className="text-error text-sm">{error}</p>}
            {invitationNotice ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{invitationNotice}</p> : null}

            <button
              className="w-full bg-primary text-on-primary font-headline font-bold py-5 rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
              style={{ boxShadow: '0 20px 40px rgba(25,28,30,0.06)' }}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In…' : 'Enter Console'}
              {!isLoading && (
                <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              )}
            </button>
          </form>}

          <div className="pt-8 border-t border-surface-container flex flex-col items-center gap-4">
            <p className="text-sm text-on-surface-variant">Authenticated access only.</p>
            <div className="flex gap-6 text-xs text-outline font-medium">
              <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
              <a className="hover:text-primary transition-colors" href="#">Security Standards</a>
              <a className="hover:text-primary transition-colors" href="#">Support</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLogin;
