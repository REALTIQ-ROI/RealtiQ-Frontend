import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';

const LandlordLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const requestedRedirect = (location.state as { redirectTo?: unknown } | null)?.redirectTo;
  const landlordRedirect =
    typeof requestedRedirect === 'string' &&
    requestedRedirect.startsWith('/dashboard/landlord') &&
    !requestedRedirect.startsWith('//')
      ? requestedRedirect
      : null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const user = await login({ email, password, role: 'landlord' });

      if (user.role !== 'landlord') {
        logout();
        toast.error('You are attempting to log in through the wrong portal');
        return;
      }

      toast.success('Login successful');
      navigate(landlordRedirect ?? '/dashboard/landlord');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to login. Please check your details.';
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#f7f9fb' }}>
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl">
        <div className="flex justify-between items-center px-8 py-6 max-w-screen-2xl mx-auto">
          <Link
            to="/"
            className="text-2xl font-black tracking-tighter text-slate-900"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            RealtiQ
          </Link>
          <Link
            to="/properties"
            className="text-slate-500 hover:text-slate-900 transition-colors font-bold text-sm tracking-tight"
          >
            Back to Gallery
          </Link>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center pt-20 px-6">
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-0 overflow-hidden rounded-xl bg-white">
          <div className="hidden md:flex md:col-span-7 relative h-[700px] overflow-hidden">
            <img
              className="absolute inset-0 w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAuVWl4OXCKE9Q3cqPVSkHtNi_09DTHTtXG9KICEbNdRwgmmmDnKujsFTTgNrVd582CejeUacDf1Xd5QafxiD8LFRXPzJAqLbnwu_JkRYp4BpWFNqM7Go5DYQq3hG341mLWatHDbJOwFF2ypboWXcIZW5l2OZgtdng9R-Ttz-OTDyK2oKkfAlEzZGh4QtH6LLCnPeHIrq4OObSne-kSAYA4Q-E6stk6aBH5FyX8VZ0_BqoVV08S-pDC2Y9B-irv-wyxgKezlJtpwA"
              alt="Modern architectural interior"
            />
            <div
              className="absolute inset-0 flex flex-col justify-end p-12"
              style={{ background: 'rgba(17,28,45,0.2)', backdropFilter: 'brightness(0.75)' }}
            >
              <div className="max-w-md">
                <span className="text-white/80 text-xs uppercase tracking-widest mb-4 block">
                  Architectural Curation
                </span>
                <h2
                  className="text-white text-4xl font-extrabold tracking-tight leading-none mb-6"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  Experience real estate as an art form.
                </h2>
                <div className="h-1 w-12 bg-white/40 mb-6" />
                <p className="text-white/70 text-sm leading-relaxed">
                  Access your landlord workspace to manage listings, portfolio activity, and property operations.
                </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 p-8 md:p-16 flex flex-col justify-center bg-white">
            <div className="mb-8">
              <h1
                className="text-primary text-3xl font-extrabold tracking-tighter mb-2"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                Welcome Back
              </h1>
              <p className="text-secondary text-sm">Please enter your details to access your landlord dashboard.</p>
            </div>

            <div className="flex rounded-lg bg-surface-container-low p-1 mb-6">
              <button
                type="button"
                className="flex-1 py-2 rounded-md text-xs font-bold tracking-wide transition-all duration-200 bg-white text-on-surface shadow-sm"
              >
                Landlord
              </button>
            </div>

            <form className="space-y-5" onSubmit={(e) => void onSubmit(e)}>
              <div>
                <label
                  htmlFor="landlord-login-email"
                  className="block text-on-surface text-xs font-bold uppercase tracking-wider mb-2"
                >
                  Email Address
                </label>
                <input
                  id="landlord-login-email"
                  className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-surface-tint/20 transition-all duration-300"
                  style={{ border: '1px solid rgba(198,198,205,0.2)' }}
                  type="email"
                  placeholder="curator@realtiq.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="landlord-login-password"
                  className="block text-on-surface text-xs font-bold uppercase tracking-wider mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="landlord-login-password"
                    className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-surface-tint/20 transition-all duration-300"
                    style={{ border: '1px solid rgba(198,198,205,0.2)' }}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 cursor-pointer"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <div className="mt-2 text-right">
                  <Link
                    to={`/forgot-password?role=landlord&email=${encodeURIComponent(email)}`}
                    className="text-xs font-bold text-primary hover:underline uppercase tracking-wider"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>

              <button
                className="w-full text-white font-bold py-4 rounded-lg hover:opacity-90 transition-opacity duration-300 disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  background: 'linear-gradient(135deg, #000000 0%, #111c2d 100%)',
                  fontFamily: 'Manrope, sans-serif',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                }}
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <p className="mt-8 text-center text-secondary text-sm">
              Don&apos;t have an account?{' '}
              <Link to="/auth/landlord/register" className="text-primary font-bold hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </main>

      <footer className="w-full mt-auto bg-slate-900">
        <div className="w-full px-8 py-12 flex flex-col md:flex-row justify-between items-center gap-6 max-w-screen-2xl mx-auto">
          <div
            className="text-xl font-bold text-white tracking-tighter"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            RealtiQ
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a className="text-slate-400 hover:text-white transition-colors text-sm tracking-wide" href="#">
              Privacy Policy
            </a>
            <a className="text-slate-400 hover:text-white transition-colors text-sm tracking-wide" href="#">
              Terms of Service
            </a>
          </div>
          <p className="text-slate-500 text-xs tracking-wide">&copy; 2024 RealtiQ Architectural Curation.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandlordLogin;
