import { useState, type FormEvent } from 'react';
import { newsletterService } from '../../services/newsletterService';

const NewsletterSignup = ({ compact = false }: { compact?: boolean }) => {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setMessage({ type: 'error', text: 'Enter a valid email address.' }); return; }
    setBusy(true);
    setMessage(null);
    try {
      const response = await newsletterService.subscribe(value);
      setMessage({ type: 'success', text: response.message || 'You are subscribed to REALTIQ updates.' });
      setEmail('');
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to subscribe right now.' });
    } finally { setBusy(false); }
  };
  return <div className={compact ? '' : 'rounded-2xl border border-outline-variant/50 bg-white p-7 sm:p-9'}>
    <div className={compact ? '' : 'grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center'}>
      <div><h2 className={compact ? 'text-xs font-bold uppercase tracking-wide text-white' : 'text-xl font-black text-on-surface'}>New listings and market updates, by email</h2><p className={`mt-2 text-sm ${compact ? 'text-slate-400' : 'text-secondary'}`}>Subscribe for property and market updates. Sponsored features are labelled.</p></div>
      <form onSubmit={(event) => void submit(event)} className="mt-4 flex flex-col gap-2 sm:flex-row lg:mt-0"><label className="sr-only" htmlFor={compact ? 'footer-newsletter-email' : 'home-newsletter-email'}>Email address</label><input id={compact ? 'footer-newsletter-email' : 'home-newsletter-email'} type="email" value={email} onChange={(event) => { setEmail(event.target.value); setMessage(null); }} placeholder="Email address" className="min-w-0 flex-1 rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface" disabled={busy} /><button type="submit" disabled={busy} className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Subscribing…' : 'Subscribe'}</button></form>
    </div>
    {message ? <p role="status" className={`mt-3 text-sm ${message.type === 'success' ? 'text-secondary' : 'text-red-600'}`}>{message.text}</p> : null}
  </div>;
};

export default NewsletterSignup;
