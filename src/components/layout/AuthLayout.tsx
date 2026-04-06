import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerText: string;
  footerLinkLabel: string;
  footerLinkTo: string;
}

const AuthLayout = ({ title, subtitle, children, footerText, footerLinkLabel, footerLinkTo }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="w-full border-b border-outline-variant/20">
        <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
          <Link to="/" className="text-2xl font-black tracking-tighter font-headline text-on-surface">
            RealtiQ
          </Link>
          <Link to="/properties" className="text-sm font-semibold text-on-surface-variant hover:text-on-surface">
            Back to Gallery
          </Link>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-8">
          <h1 className="text-3xl font-headline font-extrabold tracking-tight mb-2">{title}</h1>
          <p className="text-secondary mb-8">{subtitle}</p>
          {children}
          <p className="mt-8 text-sm text-secondary text-center">
            {footerText}{' '}
            <Link to={footerLinkTo} className="text-primary font-semibold hover:underline">
              {footerLinkLabel}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;