import PublicLayout from '../../components/layout/PublicLayout';

const AboutAndContact = () => {
  return (
    <PublicLayout>
      <section className="max-w-5xl mx-auto px-8 py-10 space-y-12">
        <div>
          <h1 className="text-5xl font-headline font-extrabold tracking-tighter mb-4">About RealtiQ</h1>
          <p className="text-on-surface-variant leading-relaxed">
            RealtiQ curates premium residential and investment properties with a focus on architecture, value, and long-term growth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <article className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-6">
            <h2 className="font-bold text-2xl mb-3">Contact</h2>
            <p className="text-on-surface-variant">Email: hello@realtiq.com</p>
            <p className="text-on-surface-variant">Phone: +1 (555) 123-9087</p>
          </article>

          <article className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-6">
            <h2 className="font-bold text-2xl mb-3">Office</h2>
            <p className="text-on-surface-variant">450 Market Street</p>
            <p className="text-on-surface-variant">San Francisco, CA</p>
          </article>
        </div>
      </section>
    </PublicLayout>
  );
};

export default AboutAndContact;