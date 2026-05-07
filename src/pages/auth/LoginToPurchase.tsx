import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LoginToPurchase = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login({ email, password, role: 'buyer' });
      navigate('/checkout');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to login. Please check your details.');
    }
  };

  return (
    <div className="bg-surface text-on-surface antialiased overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12">
        {/* Left Brand Section */}
        <section className="hidden lg:flex lg:col-span-7 relative bg-primary-container overflow-hidden items-center justify-center p-20">
          <div className="absolute inset-0 opacity-40">
            <img
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCbjCh9nSpwiqCdojWZGH7rJGnSGwRVZ8FTgS04bWKTNp7aO4rY0auVQipfFJbizos6hRJ9LVkFuwNgUCGUfOWvfyg6Yw2Qt0AsijSkxslizhqYxY3CzAsN6DT5P66dCf3zIlettuF9DpUIKvvD0DApD0xfFsZqKMfotZR79phHuKOi7PkaSmmlSltqzVYfIaHr09bLjOu-NTcmGlrEHRTCtSgH1nWXQTSzKXJmpc6mIIeL4y4JOcxtGspY7H2SGLJz-YWEQ_XAWA"
              alt="Ultra-modern architectural villa"
            />
          </div>
          <div className="relative z-10 max-w-xl">
            <div className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full mb-8">
              <span className="text-white text-[10px] uppercase tracking-[0.2em] font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Curated Excellence
              </span>
            </div>
            <h1 className="text-white font-extrabold text-6xl leading-[1.1] tracking-tighter mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              The final step <br />to your new <br />
              <span className="text-secondary-fixed">narrative.</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed max-w-md">
              You are moments away from securing one of the world's most distinguished architectural landmarks.
            </p>
            <div className="mt-16 flex gap-12 border-t border-white/10 pt-8">
              <div>
                <span className="block text-white font-bold text-2xl" style={{ fontFamily: 'Manrope, sans-serif' }}>4.9/5</span>
                <span className="text-white/40 text-xs uppercase tracking-widest">Curator Rating</span>
              </div>
              <div>
                <span className="block text-white font-bold text-2xl" style={{ fontFamily: 'Manrope, sans-serif' }}>12k+</span>
                <span className="text-white/40 text-xs uppercase tracking-widest">Global Estates</span>
              </div>
            </div>
          </div>
          {/* Floating Card */}
          <div className="absolute bottom-12 right-12 w-64 p-6 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 transform rotate-3">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-secondary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              <span className="text-white text-xs font-bold tracking-tight">Verified Curators Only</span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-secondary-fixed" />
            </div>
          </div>
        </section>

        {/* Right Form Section */}
        <section className="lg:col-span-5 flex flex-col justify-center px-8 sm:px-16 lg:px-20 bg-surface">
          <div className="max-w-md w-full mx-auto">
            {/* Branding */}
            <div className="mb-12 flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-2xl text-primary tracking-tighter" style={{ fontFamily: 'Manrope, sans-serif' }}>RealtiQ</h2>
                <span className="text-[10px] text-secondary font-semibold tracking-widest uppercase block mt-1">Architectural Curator</span>
              </div>
              <Link to="/properties" className="text-primary flex items-center gap-2 hover:opacity-70 transition-opacity">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </Link>
            </div>

            {/* Messaging */}
            <div className="mb-10">
              <h3 className="text-3xl font-bold text-on-surface mb-2 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Login to continue
              </h3>
              <p className="text-on-surface-variant leading-relaxed">
                Please authenticate your account to complete the purchase of{' '}
                <span className="text-primary font-semibold italic">The Horizon Penthouse</span>.
              </p>
            </div>

            {/* Form */}
            <form className="space-y-6" onSubmit={(e) => void onSubmit(e)}>
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest uppercase text-secondary ml-1" htmlFor="email">
                  Email Address
                </label>
                <input
                  className="w-full h-14 px-5 bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline/50 focus:ring-2 focus:ring-surface-tint/20 transition-all outline-none"
                  id="email"
                  placeholder="curator@realtiq.luxury"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-bold tracking-widest uppercase text-secondary" htmlFor="password">
                    Security Code
                  </label>
                  <Link
                    to={`/forgot-password?role=buyer&email=${encodeURIComponent(email)}`}
                    className="text-[11px] font-bold text-primary hover:underline underline-offset-4 uppercase tracking-tighter"
                  >
                    Forgot?
                  </Link>
                </div>
                <input
                  className="w-full h-14 px-5 bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline/50 focus:ring-2 focus:ring-surface-tint/20 transition-all outline-none"
                  id="password"
                  placeholder="••••••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-error text-sm">{error}</p>}

              <div className="pt-4">
                <button
                  className="w-full h-14 bg-primary text-on-primary rounded-lg font-bold text-base hover:bg-primary-container transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing In...' : 'Sign In to Purchase'}
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
              </div>
            </form>

            {/* Social Proof */}
            <div className="mt-12 pt-8 border-t border-surface-container-high text-center">
              <p className="text-xs text-on-surface-variant mb-6">Or authenticate with secure identity provider</p>
              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center h-12 bg-white rounded-lg border border-outline-variant/20 hover:bg-surface-container-low transition-colors" type="button">
                  <img
                    alt="Google"
                    className="w-5 h-5"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCoTQ5gEhXOL6YT0Tb9gd1b3ssTp2NydHZHCAbdHSdNuaHcDyKOAsXfYKNmMEvFZcQaX3lUNPBVPp4kY2VjOY2gXuXrcw6x_rYG_aNCUJPaz89liBCwjcD1AVNjfGNQDBb_4sdZnE7HEyeHnH9Pw1WRpmlWnzPoOv3ymtOOd2isDvmhT2P4aS1sMRGJ7wUfR7mHDZXhVaMiC9ofhj5NtWoSI4zEILGkJ64ySj5W79a7g-s4fCQoV9tTurJTbSdMVgcGs4jSZzUTWw"
                  />
                </button>
                <button className="flex items-center justify-center h-12 bg-white rounded-lg border border-outline-variant/20 hover:bg-surface-container-low transition-colors" type="button">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>fingerprint</span>
                </button>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-on-surface-variant">
                Don't have an account?{' '}
                <Link className="text-primary font-bold hover:underline underline-offset-4 ml-1" to="/register-to-purchase">
                  Create an Identity
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-20 flex flex-wrap gap-6 justify-center max-w-md mx-auto">
            <a className="text-[10px] text-outline uppercase tracking-widest hover:text-primary transition-colors" href="#">Terms of Sale</a>
            <a className="text-[10px] text-outline uppercase tracking-widest hover:text-primary transition-colors" href="#">Privacy Protocol</a>
            <a className="text-[10px] text-outline uppercase tracking-widest hover:text-primary transition-colors" href="#">Identity Security</a>
          </footer>
        </section>
      </main>

      {/* Decorative blurs */}
      <div className="fixed top-0 right-0 w-32 h-32 bg-secondary-fixed opacity-10 blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-primary-fixed opacity-5 blur-3xl pointer-events-none" />
    </div>
  );
};

export default LoginToPurchase;
