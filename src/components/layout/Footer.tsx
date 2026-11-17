import { Link, useLocation } from 'react-router-dom';
import NewsletterSignup from './NewsletterSignup';

const Footer = () => {
  const isHome = useLocation().pathname === '/';

  return (
    <footer className={`w-full px-4 py-10 text-slate-100 sm:px-8 sm:py-16 ${isHome ? 'mt-0 bg-slate-900' : 'mt-12 bg-slate-900 sm:mt-20'}`}>
      <div className={`mx-auto grid max-w-7xl grid-cols-1 gap-8 sm:grid-cols-2 md:gap-12 ${isHome ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
        <div>
          <div className="font-manrope font-black text-2xl mb-4">REALTIQ</div>
          <p className="text-slate-400 text-sm leading-relaxed">
            Property for sale across Nigeria.
          </p>
          <p className="text-slate-500 text-xs mt-4">Lagos · Abuja · Port Harcourt</p>
        </div>

        <div className="space-y-3 text-sm text-slate-400">
          <h4 className="text-slate-50 uppercase tracking-wide text-xs font-bold">Company</h4>
          <Link to="/about" className="block hover:text-slate-100 transition-colors">About Us</Link>
          <Link to="/about" className="block hover:text-slate-100 transition-colors">Our Process</Link>
          <p className="cursor-default">Press</p>
        </div>

        <div className="space-y-3 text-sm text-slate-400">
          <h4 className="text-slate-50 uppercase tracking-wide text-xs font-bold">Support</h4>
          <p className="cursor-default">Privacy Policy</p>
          <p className="cursor-default">Terms of Service</p>
          <Link to="/contact" className="block hover:text-slate-100 transition-colors">Contact Us</Link>
        </div>

        {!isHome ? <NewsletterSignup compact /> : null}
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl flex-col items-start justify-between gap-3 border-t border-slate-800 pt-6 text-xs uppercase tracking-wide sm:flex-row sm:items-center">
        <p className="text-slate-400">© 2026 REALTIQ. All rights reserved.</p>
        <p className="text-slate-200 font-bold">Verification is administrative validation, not a title warranty.</p>
      </div>
    </footer>
  );
};

export default Footer;
