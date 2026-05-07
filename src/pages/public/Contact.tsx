import { useState } from 'react';
import PublicLayout from '../../components/layout/PublicLayout';
import { contactService } from '../../services/contactService';

const offices = [
  {
    city: 'Lagos (HQ)',
    address: '14B Bourdillon Road, Ikoyi, Lagos',
    phone: '+234 812 345 6789',
    email: 'lagos@realtiq.com',
    hours: 'Mon – Fri: 8am – 6pm',
  },
  {
    city: 'Abuja',
    address: '7 Aguiyi Ironsi Street, Maitama, Abuja',
    phone: '+234 803 456 7890',
    email: 'abuja@realtiq.com',
    hours: 'Mon – Fri: 9am – 5pm',
  },
  {
    city: 'Port Harcourt',
    address: '22 Olu Obasanjo Road, Port Harcourt',
    phone: '+234 701 234 5678',
    email: 'ph@realtiq.com',
    hours: 'Mon – Fri: 9am – 5pm',
  },
];

const inquiryTypes = [
  'I want to buy a property',
  'I want to list my property',
  'I have a general enquiry',
  'Press & Media',
  'Partnership / Investment',
];

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', type: '', message: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof typeof form, string>> = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.name.trim()) nextErrors.name = 'Enter your full name.';
    if (!emailPattern.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!form.type) nextErrors.type = 'Select an enquiry type.';
    if (form.message.trim().length < 10) nextErrors.message = 'Message must be at least 10 characters.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await contactService.submitMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        type: form.type,
        message: form.message.trim(),
      });
      setStatus({ type: 'success', message: response.message || 'Thanks. Your message has been sent successfully.' });
      setForm({ name: '', email: '', phone: '', type: '', message: '' });
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to send your message. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      {/* Header */}
      <section className="max-w-7xl mx-auto px-8 pt-12 pb-10">
        <span className="text-xs uppercase tracking-[0.2em] text-secondary font-semibold">Get in Touch</span>
        <h1 className="text-5xl md:text-6xl font-headline font-extrabold tracking-tighter mt-3 mb-4 max-w-2xl">
          Let's start a conversation.
        </h1>
        <p className="text-xl text-on-surface-variant leading-relaxed max-w-xl">
          Whether you're looking to buy, sell, or simply learn more — our team is ready to assist with a bespoke,
          white-glove experience.
        </p>
      </section>

      {/* Main grid */}
      <section className="max-w-7xl mx-auto px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-1">Send us a message</h2>
              <p className="text-on-surface-variant text-sm mb-8">We typically respond within 2 business hours.</p>

              {status ? (
                <div
                  className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
                    status.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-red-200 bg-red-50 text-red-800'
                  }`}
                >
                  {status.message}
                </div>
              ) : null}
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Full Name *</label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        placeholder="Your full name"
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      {errors.name ? <p className="mt-2 text-xs text-error">{errors.name}</p> : null}
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Email Address *</label>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        placeholder="you@example.com"
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      {errors.email ? <p className="mt-2 text-xs text-error">{errors.email}</p> : null}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Phone Number</label>
                      <input
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="+234 ..."
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Enquiry Type *</label>
                      <select
                        name="type"
                        value={form.type}
                        onChange={handleChange}
                        required
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">Select a type...</option>
                        {inquiryTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {errors.type ? <p className="mt-2 text-xs text-error">{errors.type}</p> : null}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Message *</label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="Tell us how we can help..."
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                    {errors.message ? <p className="mt-2 text-xs text-error">{errors.message}</p> : null}
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? 'Sending Message...' : 'Send Message'}
                  </button>
                </form>
            </div>
          </div>

          {/* Sidebar — Offices & Direct Contact */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Contact */}
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4">Quick Contact</h3>
              <div className="space-y-4">
                <a href="tel:+2348123456789" className="flex items-center gap-3 text-sm group">
                  <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-sm text-primary">call</span>
                  </span>
                  <div>
                    <p className="text-xs text-secondary uppercase tracking-widest">Phone</p>
                    <p className="font-semibold group-hover:text-primary transition-colors">+234 812 345 6789</p>
                  </div>
                </a>
                <a href="mailto:hello@realtiq.com" className="flex items-center gap-3 text-sm group">
                  <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-sm text-primary">mail</span>
                  </span>
                  <div>
                    <p className="text-xs text-secondary uppercase tracking-widest">Email</p>
                    <p className="font-semibold group-hover:text-primary transition-colors">hello@realtiq.com</p>
                  </div>
                </a>
                <div className="flex items-center gap-3 text-sm">
                  <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-sm text-primary">schedule</span>
                  </span>
                  <div>
                    <p className="text-xs text-secondary uppercase tracking-widest">Business Hours</p>
                    <p className="font-semibold">Mon – Fri: 8am – 6pm WAT</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Offices */}
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4">Our Offices</h3>
              <div className="space-y-5">
                {offices.map((office) => (
                  <div key={office.city} className="pb-5 border-b border-outline-variant/15 last:border-0 last:pb-0">
                    <p className="font-bold text-sm mb-1">{office.city}</p>
                    <p className="text-xs text-on-surface-variant leading-relaxed mb-1">{office.address}</p>
                    <p className="text-xs text-secondary">{office.hours}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <a href={`tel:${office.phone}`} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">call</span>
                        {office.phone}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Social */}
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4">Follow Us</h3>
              <div className="flex gap-3">
                {['instagram', 'linkedin', 'twitter', 'youtube'].map((platform) => (
                  <button
                    key={platform}
                    className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all capitalize text-xs font-black"
                    title={platform}
                  >
                    {platform[0].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Contact;
