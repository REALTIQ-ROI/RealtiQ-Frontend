import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await register({ name, email, password, role: 'buyer' });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register. Please try again.');
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen overflow-x-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Fixed Header */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-8 py-6 max-w-screen-2xl mx-auto">
        <div className="text-2xl font-black tracking-tighter text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>RealtiQ</div>
        <Link to="/properties" className="text-sm font-semibold text-secondary hover:text-primary transition-colors flex items-center gap-2">
          Back to Explore
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </header>

      <main className="min-h-screen flex flex-col md:flex-row">
        {/* Left Column */}
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
            <h1 className="font-extrabold text-white leading-[1.1] tracking-tighter mb-8 text-5xl lg:text-7xl" style={{ fontFamily: 'Manrope, sans-serif' }}>
              The Archive of <br />Fine Living.
            </h1>
            <p className="text-on-primary-container text-lg max-w-md font-light leading-relaxed mb-12">
              Join an exclusive circle of architectural enthusiasts and investors. Access curated collections that redefine the modern dwelling.
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
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Right Column */}
        <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-surface">
          <div className="w-full max-w-md">
            <div className="md:hidden text-2xl font-black tracking-tighter text-slate-900 mb-12 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
              RealtiQ
            </div>

            <div className="mb-10 text-center md:text-left">
              <h2 className="font-bold tracking-tight text-primary mb-2 text-3xl" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Create Account
              </h2>
              <p className="text-secondary font-medium">Elevate your property search in seconds.</p>
            </div>

            <form className="space-y-6" onSubmit={(e) => void onSubmit(e)}>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-secondary ml-1" htmlFor="name">
                  Full Name
                </label>
                <input
                  className="w-full bg-surface-container-low border-0 focus:ring-2 focus:ring-surface-tint/20 rounded-lg px-4 py-4 text-on-surface placeholder:text-outline/50 transition-all font-medium"
                  id="name"
                  placeholder="E.g. Julian Vossen"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-secondary ml-1" htmlFor="email">
                  Email Address
                </label>
                <input
                  className="w-full bg-surface-container-low border-0 focus:ring-2 focus:ring-surface-tint/20 rounded-lg px-4 py-4 text-on-surface placeholder:text-outline/50 transition-all font-medium"
                  id="email"
                  placeholder="julian@realtiq.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-secondary ml-1" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-surface-container-low border-0 focus:ring-2 focus:ring-surface-tint/20 rounded-lg px-4 py-4 text-on-surface placeholder:text-outline/50 transition-all font-medium"
                    id="password"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary"
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility' : 'visibility_off'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 py-2">
                <input
                  className="mt-1 rounded bg-surface-container-low border-0 text-primary focus:ring-0"
                  id="terms"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <label className="text-xs text-secondary leading-relaxed" htmlFor="terms">
                  I agree to the{' '}
                  <a className="text-primary underline underline-offset-4" href="#">Terms of Service</a> and{' '}
                  <a className="text-primary underline underline-offset-4" href="#">Privacy Policy</a> regarding data usage.
                </label>
              </div>

              {error && <p className="text-error text-sm">{error}</p>}

              <button
                className="w-full bg-primary text-on-primary py-5 rounded-lg font-bold tracking-tight hover:opacity-90 transition-all flex justify-center items-center gap-2 group"
                style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Start Curating'}
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">chevron_right</span>
              </button>
            </form>

            {/* Social */}
            <div className="mt-12">
              <div className="relative flex items-center justify-center mb-8">
                <div className="w-full border-t border-outline-variant/20" />
                <span className="absolute bg-surface px-4 text-[10px] font-bold uppercase tracking-widest text-outline">Or continue with</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-3 py-3 rounded-lg bg-white border-0 hover:bg-surface-container-low transition-colors shadow-sm" type="button">
                  <img alt="Google Logo" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlDrUvePfH25L3FddD_elGaJif7AIbzMTz2yIdydlwouZDmsA9VMl_yhfRJQKWjoRgUR5cuAhtSdQfvJIn7G9TkVt_6q2FJ24xQfwWiq4SkVm1GjEFKyRTGPdMLU6UUd_GavglEPO5NYXp_Y8Y_q7JhM4c26CgQtuBM5iBtMidNOwVn1mrMaPM8WwQyVtPLbg-2I3NfwfIuIDMBDUzQ-OGlFRjTtO9eS6fAgubxc05A6QQhlpLDMDbMtu14_bN58vkBKr7Tb9JNw" />
                  <span className="text-sm font-semibold">Google</span>
                </button>
                <button className="flex items-center justify-center gap-3 py-3 rounded-lg bg-white border-0 hover:bg-surface-container-low transition-colors shadow-sm" type="button">
                  <img alt="Apple Logo" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbGtWKxh0jQ6P07d7XO103hLWIpIPXpr2vczd3rH-v2CsWkT48ZLw0TlD4a44fbs2Yq97rD71JerV5l0lD0BoHAkhHRrjX3EQjFHlK1e2MGuqLaIkxQEZVu8kYXC3mkgZlL8NzMoSu2LEmKRx5SWQZ9AqR2K7vYlg4JlwDcc4QYbWX3aGC20_f3-i2OTcweuvVda9GG4RLK-3o26ITX7rXppzCpXuZOsSkYC_MQp_Ss9FBl6f9AtUoVCF-uvsIehv68iykg3JHlQ" />
                  <span className="text-sm font-semibold">Apple</span>
                </button>
              </div>
            </div>

            <p className="mt-10 text-center text-sm text-secondary">
              Already have an account?{' '}
              <Link className="text-primary font-bold hover:underline underline-offset-4 ml-1" to="/login">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Fixed bottom footer */}
      <div className="fixed bottom-6 w-full flex justify-center gap-8 md:justify-end md:pr-12 text-[10px] uppercase tracking-tighter text-outline pointer-events-none">
        <span className="pointer-events-auto cursor-pointer hover:text-primary transition-colors">Support</span>
        <span className="pointer-events-auto cursor-pointer hover:text-primary transition-colors">Privacy</span>
        <span className="pointer-events-auto cursor-pointer hover:text-primary transition-colors">Security</span>
      </div>
    </div>
  );
};

export default Register;
