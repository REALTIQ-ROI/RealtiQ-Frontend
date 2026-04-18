import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

const LandlordRegistration = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await register({ name, email, password, role: 'landlord' });
      navigate('/dashboard/landlord');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register. Please try again.');
    }
  };

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen" style={{ fontFamily: 'Inter, sans-serif' }}>
      <main className="min-h-screen flex flex-col md:flex-row">
        {/* Left: Editorial Branding */}
        <section className="hidden md:flex w-1/2 bg-primary-container relative overflow-hidden flex-col justify-between p-16">
          {/* Background */}
          <div className="absolute inset-0 z-0 opacity-40">
            <img
              alt=""
              className="w-full h-full object-cover grayscale"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnx1M1OYpHtX0qbcQEe7mQd2QQ_mGJciCwUVXQSFv8n3G6ARvbfSAHOGCIRBhehW_eBtbNrN4dml9scmdA68nnQBxVSFhzIkcNe5u-8sIbQOkEAgdqRZNGyGBDHtmkLgufCaIntq5cyXibwVfcQ16458YQ_ImjnmgNxWFuv1ALeXN_FYDe794FKx2o4CX3PMtd9IWFiur6D8doGZNAhovkEW9XWyOFa6z7TqvzOAkoX3vVTchUv-KCMNvAVmdHb6hfttxzBPKvtg"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary-container via-primary-container/80 to-transparent" />
          </div>

          <div className="relative z-10">
            <div className="text-3xl font-extrabold tracking-tighter text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>RealtiQ</div>
            <div className="mt-24">
              <span className="text-secondary tracking-[0.1rem] uppercase text-[0.65rem] font-bold">The Architectural Curator</span>
              <h1 className="text-5xl font-bold text-white mt-4 leading-[1.1] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Transforming <br />Property Management <br />Into Fine Art.
              </h1>
            </div>
          </div>

          <div className="relative z-10 max-w-sm">
            <div className="p-8 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-secondary-fixed-dim italic text-lg leading-relaxed">
                "RealtiQ isn't just a platform; it's the digital backbone of my real estate portfolio. The aesthetic clarity matches the premium nature of our holdings."
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden">
                  <img
                    alt="Landlord Profile"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqHV7Egw1t2rXw1lP2Pz4ob3LrqR0JAca2EE9pTyg_hVe2GKoHqNib3mezNUOa_n9lEWoxaWaC7jcOCFm_qjHejuYzHdt5BH5aDaVPc_no8jdoiUKAe9bDgoE5kPzmkSKmpcIB1usZVifE5ddLpfkTkpyW0DmpCNadVqlqhVWCzZC216LuyrgpuoVQ_KDedFcMlK39i4_p7kOTqAwqwml3XiYbERRt6oNaPDgHXAPAPVRUCUjJqIOg0JhgEMSFY47f_99zMJ1rtw"
                  />
                </div>
                <div>
                  <p className="text-white font-bold text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Julian Vane</p>
                  <p className="text-on-primary-container text-xs">Vane Capital Partners</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Registration Form */}
        <section className="flex-1 bg-surface flex flex-col justify-center items-center p-8 md:p-24 relative">
          <div className="w-full max-w-[440px]">
            {/* Mobile Branding */}
            <div className="md:hidden mb-12 flex justify-center">
              <div className="text-2xl font-extrabold tracking-tighter text-primary" style={{ fontFamily: 'Manrope, sans-serif' }}>RealtiQ</div>
            </div>

            <div className="mb-10 text-center md:text-left">
              <h2 className="text-3xl font-bold text-primary tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>Create your account</h2>
              <p className="text-secondary mt-2">Enter your professional details to start your journey.</p>
            </div>

            <form className="space-y-6" onSubmit={(e) => void onSubmit(e)}>
              {/* Progress Bar */}
              <div className="flex gap-2 mb-8">
                <div className="h-1 flex-1 bg-primary rounded-full" />
                <div className="h-1 flex-1 bg-surface-container-highest rounded-full" />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase tracking-widest mb-2 px-1">Full Name</label>
                  <input
                    className="w-full bg-surface-container-low border-none rounded-lg p-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-surface-tint/20 transition-all outline-none"
                    placeholder="e.g. Alexander Hamilton"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase tracking-widest mb-2 px-1">Work Email</label>
                  <input
                    className="w-full bg-surface-container-low border-none rounded-lg p-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-surface-tint/20 transition-all outline-none"
                    placeholder="alexander@firm.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-secondary uppercase tracking-widest mb-2 px-1">Password</label>
                    <input
                      className="w-full bg-surface-container-low border-none rounded-lg p-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-surface-tint/20 transition-all outline-none"
                      placeholder="••••••••"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-secondary uppercase tracking-widest mb-2 px-1">
                      Company <span className="opacity-50">(Optional)</span>
                    </label>
                    <input
                      className="w-full bg-surface-container-low border-none rounded-lg p-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-surface-tint/20 transition-all outline-none"
                      placeholder="Real Estate Co."
                      type="text"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="text-error text-sm">{error}</p>}

              <div className="pt-4">
                <button
                  className="w-full bg-primary text-on-primary font-bold py-4 rounded-lg hover:opacity-90 transition-all transform active:scale-[0.98]"
                  style={{ fontFamily: 'Manrope, sans-serif', boxShadow: '0 20px 40px rgba(25,28,30,0.06)' }}
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating Account...' : 'Begin Onboarding'}
                </button>
              </div>

              <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-[1px] bg-surface-container-highest" />
                <span className="text-xs text-outline uppercase tracking-widest">or continue with</span>
                <div className="flex-1 h-[1px] bg-surface-container-highest" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  className="flex items-center justify-center gap-3 bg-white py-3 rounded-lg hover:bg-surface-container-low transition-colors"
                  style={{ border: '1px solid rgba(198,198,205,0.2)' }}
                  type="button"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span className="text-sm font-medium">Google</span>
                </button>
                <button
                  className="flex items-center justify-center gap-3 bg-white py-3 rounded-lg hover:bg-surface-container-low transition-colors"
                  style={{ border: '1px solid rgba(198,198,205,0.2)' }}
                  type="button"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  <span className="text-sm font-medium">GitHub</span>
                </button>
              </div>
            </form>

            <div className="mt-12 pt-8 border-t border-surface-container-highest text-center">
              <p className="text-secondary text-sm">
                Already part of the portfolio?{' '}
                <Link className="text-primary font-bold hover:underline ml-1" to="/auth/landlord/login">
                  Log in here
                </Link>
              </p>
            </div>

            <div className="mt-16 flex flex-wrap justify-center gap-x-8 gap-y-4 text-[0.65rem] text-outline uppercase tracking-[0.15em]">
              <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
              <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
              <a className="hover:text-primary transition-colors" href="#">Contact Curator</a>
            </div>
          </div>

          {/* Decorative background */}
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary-container/10 blur-[100px] -z-10 rounded-full" />
        </section>
      </main>
    </div>
  );
};

export default LandlordRegistration;
