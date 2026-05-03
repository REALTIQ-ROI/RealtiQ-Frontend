import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const RegisterToPurchase = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await register({ name, email, password, role: 'buyer' });
      navigate('/checkout');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register. Please try again.');
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen flex items-center justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
      <main className="w-full max-w-6xl mx-auto flex flex-col md:flex-row min-h-[800px] bg-white rounded-xl overflow-hidden shadow-2xl" style={{ boxShadow: '0 20px 40px rgba(25,28,30,0.05)' }}>
        {/* Left Editorial Column */}
        <section className="hidden md:flex md:w-1/2 bg-primary-container relative p-16 flex-col justify-between overflow-hidden">
          <div className="relative z-10">
            <h1 className="font-extrabold tracking-tighter text-white mb-4 text-4xl" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Architectural Curator
            </h1>
            <p className="text-on-primary-container text-lg font-medium max-w-sm">
              Elevate your property acquisition journey with exclusive access to curated high-end estates.
            </p>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex -space-x-3">
                <img
                  className="w-10 h-10 rounded-full border-2 border-primary-container object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRm2akren4IwAhipAMDQpd4Fa6KA6MsOcqHapzxkCzCM1oJveCd1HPD9bwLCKEUcJ1SoAozSHiAC9ZvZnL5jm3FaBUYp9ZooA-p9WaEyfQbJNFpCAAABHQvmrGRulz1Tg8bGGV1_Ty6AXQatgjlAiuy4-N87UtTEbHlDqNRj_u2QLdLhqCkvV9Jnk2kUYjQKR2Y1aPTy0su5E_t7QXymHcPe4JSioGgQBgX_sFp9FZC4hg6s00aks_3WYRlfFcNcZcGxR1E_vQtA"
                  alt="Curator 1"
                />
                <img
                  className="w-10 h-10 rounded-full border-2 border-primary-container object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-nDHClM1xEEoZOcFwd5brvVRL-DZlF2UBoCsY9AfhUyvbXCR0I6RmP5UWQfF2meew-LwY2UUR-do9riahAq1NW--s8f4Ldkha3RVdq-ZxkFQOK9B6XX_r3UmkpVTInfs4kBqm2CV4ky7cvnzBKoo8789kMhIPkLfSC6pNBM3SIS-c_LLlpwNmzg_UngdSsbT0CRvSLkdrND6qEd_amYTabk4wRrCikatxNZ3-fG7c0p-hYwWwdZO3NEiBE54I89QG0wBd8s2GYQ"
                  alt="Curator 2"
                />
                <img
                  className="w-10 h-10 rounded-full border-2 border-primary-container object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkA4OqJ08SXub46zyMkF8t_1xJsHzfDqqaIz7oX3sq5JX1bf0Voue38M-xJACfwCfYOH_LfRvz-VzfVwIGnx7CloqdrwdOud3MXsZymjbSr_iIot3r1GnhfAqMr-53lpqosA6cAh6dC6ZmP_asuzsbBv09Q_l-QTd9sv6t9N-r49Taip6E_60NqxQieTZ2dbxAhTz8imS4rVmmK0QOk3-kctZMY7ozmfhlbmNuypG5U2T4CPpGHtCD30xaCPBfRsIEagjxaqbAoA"
                  alt="Curator 3"
                />
              </div>
              <span className="text-sm text-on-primary-container">Joined by 2,000+ discerning investors</span>
            </div>

            <blockquote className="border-l-2 border-surface-tint pl-6 py-2">
              <p className="text-white italic text-lg leading-relaxed mb-4">
                "The platform transforms property browsing into a sensory architectural experience."
              </p>
              <cite className="text-on-primary-container text-sm not-italic font-semibold tracking-widest uppercase">
                Julian Vane | Design Principal
              </cite>
            </blockquote>
          </div>

          {/* Background texture */}
          <div className="absolute inset-0 opacity-20">
            <img
              className="w-full h-full object-cover grayscale"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKiXd7tAK_-WOOWXB_I0gYdWDCS7rrZeZbwbnF28TWMpXUN1maylihqKI4HHshCfl0M4nVDpX7ACVT7IsOMW04G9WVe2ne1nEOHTX_6aw1W3KWKHYnjM1qDNKIV1Mkrsj_Izs9KKbH2IpH3HCMSwchhl7NrZRBCQ4iF5yuyzH4njVmvTvL3nnZUiVwGY1o1QfG9pnkTyaa1h3rp8SbTpUToA6n1Z2c4mU0wokQ4p7VmJH3awyrlNf16PgcfAqok9VGYDI_8cjwMg"
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary-container via-primary-container to-transparent" />
          </div>
        </section>

        {/* Right Registration Column */}
        <section className="w-full md:w-1/2 flex flex-col p-8 md:p-20 justify-center">
          <div className="max-w-md mx-auto w-full">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-12">
              <div className="h-1 w-12 bg-primary rounded-full" />
              <div className="h-1 w-12 bg-surface-container-highest rounded-full" />
              <div className="h-1 w-12 bg-surface-container-highest rounded-full" />
              <span className="ml-4 text-[10px] font-bold tracking-widest uppercase text-secondary">Step 01: Account</span>
            </div>

            <header className="mb-10">
              <h2 className="font-bold tracking-tight text-primary mb-2 text-3xl" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Create Account
              </h2>
              <p className="text-secondary">Please provide your details to secure this property listing and continue your purchase flow.</p>
            </header>

            <form className="space-y-6" onSubmit={(e) => void onSubmit(e)}>
              <div className="space-y-2">
                <label className="block text-xs font-semibold tracking-wider text-secondary uppercase" htmlFor="full_name">
                  Full Name
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">person</span>
                  <input
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low rounded-lg outline-none transition-all placeholder:text-outline/50 font-medium text-on-surface"
                    style={{ border: '1px solid rgba(198,198,205,0.2)' }}
                    id="full_name"
                    placeholder="Alexander Hamilton"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold tracking-wider text-secondary uppercase" htmlFor="email">
                  Email Address
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">mail</span>
                  <input
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low rounded-lg outline-none transition-all placeholder:text-outline/50 font-medium text-on-surface"
                    style={{ border: '1px solid rgba(198,198,205,0.2)' }}
                    id="email"
                    placeholder="alexander@curator.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Phone — decorative only (not submitted) */}
              {/* <div className="space-y-2">
                <label className="block text-xs font-semibold tracking-wider text-secondary uppercase" htmlFor="phone">
                  Phone Number
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">call</span>
                  <input
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low rounded-lg outline-none transition-all placeholder:text-outline/50 font-medium text-on-surface"
                    style={{ border: '1px solid rgba(198,198,205,0.2)' }}
                    id="phone"
                    placeholder="+1 (555) 000-0000"
                    type="tel"
                  />
                </div>
              </div> */}

              <div className="space-y-2">
                <label className="block text-xs font-semibold tracking-wider text-secondary uppercase" htmlFor="password">
                  Password
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">lock</span>
                  <input
                    className="w-full pl-12 pr-12 py-4 bg-surface-container-low rounded-lg outline-none transition-all placeholder:text-outline/50 font-medium text-on-surface"
                    style={{ border: '1px solid rgba(198,198,205,0.2)' }}
                    id="password"
                    placeholder="••••••••••••"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary"
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {error && <p className="text-error text-sm">{error}</p>}

              <div className="pt-4 flex flex-col gap-6">
                <button
                  className="w-full bg-primary text-on-primary py-5 rounded-lg font-bold text-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="text-secondary">Already have an account?</span>
                  <Link className="text-primary font-bold hover:underline" to="/login-to-purchase">
                    Log in
                  </Link>
                </div>
              </div>
            </form>

            {/* Trust Footer */}
            <footer className="mt-12 pt-8 flex items-center justify-between border-t border-surface-container">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-surface-tint" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-secondary">Bank-grade Security</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-surface-tint" style={{ fontVariationSettings: "'FILL' 1" }}>privacy_tip</span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-secondary">Privacy Compliant</span>
              </div>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
};

export default RegisterToPurchase;
