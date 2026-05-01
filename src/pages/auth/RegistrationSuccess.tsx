import { Link } from 'react-router-dom';

const RegistrationSuccess = () => {
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
          Registration successful. Please check your email to verify your account.
        </p>
        <p className="text-slate-400 text-xs leading-relaxed mb-8">
          Didn't receive an email? Check your spam folder or try registering again.
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
            to="/"
            className="inline-block w-full py-4 rounded-xl bg-surface-container-low text-on-surface font-bold text-sm tracking-tight hover:bg-surface-container transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSuccess;
