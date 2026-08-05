import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';

const validatePassword = (pwd: string): string | null => {
  if (pwd.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(pwd)) return 'Password must include an uppercase letter';
  if (!/[a-z]/.test(pwd)) return 'Password must include a lowercase letter';
  if (!/\d/.test(pwd)) return 'Password must include a number';
  if (!/[@$!%*?&]/.test(pwd)) return 'Password must include a special character (@$!%*?&)';
  return null;
};

const LandlordRegistration = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const pwdErr = validatePassword(password);
    if (pwdErr) {
      setPasswordError(pwdErr);
      return;
    }
    setPasswordError(null);

    try {
      await register({ name, email, password, role: 'landlord' });
      toast.success('Registration successful. Please check your email to verify your account.');
      navigate('/registration-success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to register. Please try again.';
      toast.error(message);
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen overflow-x-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-8 py-6 max-w-screen-2xl mx-auto">
        <Link
          to="/"
          className="text-2xl font-black tracking-tighter text-slate-900"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          RealtiQ
        </Link>
        <Link
          to="/properties"
          className="text-sm font-semibold text-secondary hover:text-primary transition-colors flex items-center gap-2"
        >
          Back to Explore
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </header>

      <main className="min-h-screen flex flex-col md:flex-row">
        <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-primary-container relative overflow-hidden items-center justify-center p-20">
          <div className="absolute inset-0 opacity-40">
            <img
              alt="Minimalist modern villa architecture"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBvI4dDv08QCQJMUdTo9piCE38R-zX7vnd7GnAi-roexWqE3TQxnNVYemVrgrDH0mFNU81WBr6dL6R5-be55MhSxUghhR3wHsffP7F92bM3AauG-5HMUcLd2NEszhI4nvUmLUIuux0qPY0RzQSzEqLIEt1PNxORG3R9dgrH9Ye4XhPfHG76UDdJYyjX7lxw0-j0s9xUnRPx5hbLED4uF4JureXWnhkIlgjgG8DPXKgrKV5f0pD7Pgo_lt9wYLBMTiT12iAuIiWyyA"
            />
          </div>
          <div className="relative z-10 max-w-lg">
            <span className="inline-block px-4 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] uppercase tracking-widest font-bold mb-6">
              Curated Selection
            </span>
            <h1
              className="font-extrabold text-white leading-[1.1] tracking-tighter mb-8 text-5xl lg:text-7xl"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              The Archive of <br />
              Fine Living.
            </h1>
            <p className="text-on-primary-container text-lg max-w-md font-light leading-relaxed mb-12">
              Join RealtiQ as a landlord and manage listings, tenant activity, and property workflows from a dedicated
              portfolio dashboard.
            </p>
            <div className="flex items-center gap-4 text-white">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-primary-container bg-surface-container-highest" />
                <div className="w-10 h-10 rounded-full border-2 border-primary-container bg-surface-container-high" />
                <div className="w-10 h-10 rounded-full border-2 border-primary-container bg-surface-container-low" />
              </div>
              <span className="text-sm font-medium opacity-80">Joined by 4,200+ curators</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center px-6 py-16 bg-surface">
          <div className="w-full max-w-md">
            <div
              className="md:hidden text-2xl font-black tracking-tighter text-slate-900 mb-12 text-center"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              RealtiQ
            </div>

            <div className="mb-8 text-center md:text-left">
              <h2
                className="font-bold tracking-tight text-primary mb-2 text-3xl"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                Create Account
              </h2>
              <p className="text-secondary font-medium">Elevate your property management in seconds.</p>
            </div>

            <div className="grid gap-3 mb-7 grid-cols-1">
              <button
                type="button"
                className="p-4 rounded-xl border-2 text-left transition-all duration-200 border-primary bg-primary/5"
              >
                <div className="text-sm font-bold mb-1 text-primary">Landlord</div>
                <div className="text-xs text-secondary">List and manage your properties</div>
              </button>
            </div>

            <form className="space-y-5" onSubmit={(e) => void onSubmit(e)}>
              <div className="space-y-2">
                <label
                  className="block text-[11px] font-bold uppercase tracking-widest text-secondary ml-1"
                  htmlFor="landlord-name"
                >
                  Full Name
                </label>
                <input
                  className="w-full bg-surface-container-low border-0 focus:ring-2 focus:ring-surface-tint/20 rounded-lg px-4 py-4 text-on-surface placeholder:text-outline/50 transition-all font-medium"
                  id="landlord-name"
                  placeholder="E.g. Julian Vossen"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  className="block text-[11px] font-bold uppercase tracking-widest text-secondary ml-1"
                  htmlFor="landlord-email"
                >
                  Email Address
                </label>
                <input
                  className="w-full bg-surface-container-low border-0 focus:ring-2 focus:ring-surface-tint/20 rounded-lg px-4 py-4 text-on-surface placeholder:text-outline/50 transition-all font-medium"
                  id="landlord-email"
                  placeholder="julian@realtiq.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  className="block text-[11px] font-bold uppercase tracking-widest text-secondary ml-1"
                  htmlFor="landlord-password"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    className={`w-full bg-surface-container-low border-0 focus:ring-2 rounded-lg px-4 py-4 text-on-surface placeholder:text-outline/50 transition-all font-medium ${
                      passwordError ? 'ring-2 ring-error/30 focus:ring-error/30' : 'focus:ring-surface-tint/20'
                    }`}
                    id="landlord-password"
                    placeholder="Min. 8 chars, uppercase, number, symbol"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(validatePassword(e.target.value));
                    }}
                    required
                  />
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary"
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
                {passwordError && <p className="text-error text-xs ml-1">{passwordError}</p>}
              </div>

              <button
                className="w-full bg-primary text-on-primary py-5 rounded-lg font-bold tracking-tight hover:opacity-90 transition-all flex justify-center items-center gap-2 group disabled:cursor-not-allowed disabled:opacity-70"
                style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Start Curating'}
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                  chevron_right
                </span>
              </button>
            </form>

            <p className="mt-10 text-center text-sm text-secondary">
              Already have an account?{' '}
              <Link
                className="text-primary font-bold hover:underline underline-offset-4 ml-1"
                to="/auth/landlord/login"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>

      <div className="fixed bottom-6 w-full flex justify-center gap-8 md:justify-end md:pr-12 text-[10px] uppercase tracking-tighter text-outline pointer-events-none">
        <span className="pointer-events-auto cursor-pointer hover:text-primary transition-colors">Support</span>
        <span className="pointer-events-auto cursor-pointer hover:text-primary transition-colors">Privacy</span>
        <span className="pointer-events-auto cursor-pointer hover:text-primary transition-colors">Security</span>
      </div>
    </div>
  );
};

export default LandlordRegistration;
