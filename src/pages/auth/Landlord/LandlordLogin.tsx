import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

const LandlordLogin = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login({ email, password, role: 'landlord' });
      navigate('/dashboard/landlord');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to login. Please check your details.');
    }
  };

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      <main className="flex-grow flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Background blurs */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-secondary-fixed/30 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-primary-fixed/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md z-10">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">domain</span>
              <h1 className="font-black text-2xl tracking-tighter text-primary" style={{ fontFamily: 'Manrope, sans-serif' }}>RealtiQ</h1>
            </div>
            <p className="text-secondary uppercase tracking-[0.1rem] text-[0.65rem] font-bold">Landlord Portal Access</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-xl p-8 sm:p-10" style={{ boxShadow: '0 20px 40px rgba(25,28,30,0.06)' }}>
            <header className="mb-8">
              <h2 className="font-bold text-2xl text-on-surface mb-2 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Welcome back
              </h2>
              <p className="text-secondary">Enter your credentials to manage your property portfolio.</p>
            </header>

            <form className="space-y-6" onSubmit={(e) => void onSubmit(e)}>
              <div className="space-y-2">
                <label className="block font-semibold text-[0.75rem] text-on-surface-variant uppercase tracking-wider" htmlFor="email">
                  Email Address
                </label>
                <input
                  className="w-full bg-surface-container-low rounded-md px-4 py-3 text-on-surface placeholder:text-outline focus:ring-0 focus:border-surface-tint transition-all outline-none"
                  style={{ border: '1px solid rgba(198,199,205,0.2)' }}
                  id="email"
                  placeholder="name@realtiq.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block font-semibold text-[0.75rem] text-on-surface-variant uppercase tracking-wider" htmlFor="password">
                    Password
                  </label>
                  <button type="button" className="text-[0.7rem] text-surface-tint hover:text-primary font-bold transition-colors uppercase tracking-wider">
                    Forgot?
                  </button>
                </div>
                <input
                  className="w-full bg-surface-container-low rounded-md px-4 py-3 text-on-surface placeholder:text-outline focus:ring-0 focus:border-surface-tint transition-all outline-none"
                  style={{ border: '1px solid rgba(198,199,205,0.2)' }}
                  id="password"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-error text-sm">{error}</p>}

              <button
                className="w-full text-on-primary font-bold py-4 rounded-md hover:opacity-90 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #000000 0%, #111c2d 100%)', fontFamily: 'Manrope, sans-serif' }}
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In to Dashboard'}
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-surface-container flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="h-[1px] flex-grow bg-surface-container-highest" />
                <span className="text-[0.7rem] text-outline font-medium uppercase tracking-wider">Partner Access</span>
                <div className="h-[1px] flex-grow bg-surface-container-highest" />
              </div>
              <button
                className="w-full bg-surface-container-low text-on-surface font-semibold py-3 rounded-md hover:bg-surface-container-high transition-colors flex items-center justify-center gap-3"
                style={{ border: '1px solid rgba(198,199,205,0.2)' }}
                type="button"
              >
                <span className="material-symbols-outlined text-lg">key</span>
                Single Sign-On
              </button>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-8 text-center space-y-4">
            <p className="text-secondary text-sm">
              New to RealtiQ?{' '}
              <Link className="text-primary font-bold hover:underline" to="/auth/landlord/register">
                Apply for Partnership
              </Link>
            </p>
            <div className="flex justify-center gap-6">
              <a className="text-outline text-xs hover:text-secondary transition-colors" href="#">Privacy Policy</a>
              <a className="text-outline text-xs hover:text-secondary transition-colors" href="#">Terms of Service</a>
            </div>
          </footer>
        </div>
      </main>

      {/* Bottom Image Strip */}
      <section className="hidden lg:grid grid-cols-3 h-48 w-full bg-surface-container-low">
        <div className="relative group overflow-hidden">
          <img
            className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKTI9ghJ1OyMkFfvNu9UDdv9fccJakCyxi2ItFtpS48VNojUFn8b9Wg2nCDxvcowI59GuYrphG7A1ZllKsWhUDv2bioFGgTD8Q0iF4TbIoIcWh7eeyH_vLjLWODk0U8wX9sCy1NqPcmDakLPLso40Bxf2ygqGvW7vRDD26MlHqAhdNfIZJkaZ9f2MMVVrNaC6bL6ONnTK8HCQjs-sggns8F1AK9E-ZEF6APR26S5bfVgOvNwEh1xCU--0KEtIURZcqveKev34WSw"
            alt="Modern apartment building"
          />
          <div className="absolute inset-0 bg-primary-container/20" />
        </div>
        <div className="relative group overflow-hidden">
          <img
            className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHC-s0gQ_-Wm6VcvSPdKSjy7KzQQ70Ph5jthqB3_V_2yhJWRo94jPB6MbabjZrw6NJmJYPgUhckQTEgfKnnoW9x8nqJOAzHLIaOnQ5e_-rhqezhQKEzvCwHqiyYjGjO5WnzA-X2bVV-uBRRu0wast0LeUDT1rowxy_Q9tsYHPP5dnTAzTfrCCzIEZNYY5hwhvT-8mVenjOJFAWSIpcLvOCPPwvwsOxMub9-eff_pqZFZSSm8RSPys1P8n3gS3jYJuTB41rbnlkgg"
            alt="Contemporary villa"
          />
          <div className="absolute inset-0 bg-primary-container/20" />
        </div>
        <div className="relative group overflow-hidden">
          <img
            className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAlQiraA21mkJ7FP6Yjzv6D_PJPkyTLuuZBpaBFLIHYoqq6pzUfHEKaP8d8GM37EgUo9oucbfVezznP29bSs9UIjkrnONIryzZ_792DefolPSzBEQxT4ezSY11Lvv6OgDwUABMvsxzqEkRXchWDfxvfSy6SaIxYC-2trBQFtbfNXlGVuyftGxldsCkdgixX9AuhGNEdDqVMhsJ2fkhHqKfRkeQV8aDar5nylUkB3L5Ou9W8T0WiiilP5JChIsKDn6vbTD5AhHAeqg"
            alt="Glass skyscraper"
          />
          <div className="absolute inset-0 bg-primary-container/20" />
        </div>
      </section>
    </div>
  );
};

export default LandlordLogin;
