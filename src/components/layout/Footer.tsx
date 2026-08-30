import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { newsletterService } from '../../services/newsletterService';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setMessage({ type: 'error', text: 'Enter a valid email address.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const response = await newsletterService.subscribe(trimmedEmail);
      setMessage({ type: 'success', text: response.message || 'You are subscribed to the RealtIQ newsletter.' });
      setEmail('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to subscribe right now. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <footer className="mt-12 w-full bg-slate-900 px-4 py-10 text-slate-100 sm:mt-20 sm:px-8 sm:py-16">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 md:gap-12">
        <div>
          <div className="font-manrope font-black text-2xl mb-4">RealtIQ</div>
          <p className="text-slate-400 text-sm leading-relaxed">
            Excellence in real estate through intentional curation and architectural advocacy.
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

        <div className="space-y-3 text-sm text-slate-400">
          <h4 className="text-slate-50 uppercase tracking-wide text-xs font-bold">Newsletter</h4>
          <p>Join our list for exclusive off-market opportunities.</p>
          <form className="mt-2 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => void onSubmit(event)}>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setMessage(null);
              }}
              placeholder="you@example.com"
              className="min-w-0 flex-1 bg-slate-800 text-slate-100 placeholder:text-slate-500 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
              disabled={isLoading}
              aria-label="Newsletter email"
            />
            <button
              className="bg-slate-100 text-slate-900 text-xs font-bold px-3 py-2 rounded-lg hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? 'Joining...' : 'Join'}
            </button>
          </form>
          {message ? (
            <p className={`text-xs ${message.type === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
              {message.text}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl flex-col items-start justify-between gap-3 border-t border-slate-800 pt-6 text-xs uppercase tracking-wide sm:flex-row sm:items-center">
        <p className="text-slate-400">© 2026 RealtIQ. All rights reserved.</p>
        <p className="text-slate-200 font-bold">Design of Excellence</p>
      </div>
    </footer>
  );
};

export default Footer;
