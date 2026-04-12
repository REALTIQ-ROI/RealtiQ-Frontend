import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';

const teamMembers = [
  {
    name: 'Adaobi Nwosu',
    role: 'Chief Executive Officer',
    bio: 'With 15 years in Nigerian luxury real estate, Adaobi founded RealtiQ to bring institutional-grade curation to the premium property market.',
  },
  {
    name: 'Emeka Okonkwo',
    role: 'Head of Architecture & Curation',
    bio: 'Former principal architect at a top Lagos firm, Emeka leads our property vetting process — ensuring every listing meets RealtiQ\'s architectural and quality standards.',
  },
  {
    name: 'Fatima Aliyu',
    role: 'Director of Client Relations',
    bio: 'Fatima brings a decade of high-net-worth client management experience, ensuring every buyer and landlord receives a bespoke, white-glove service.',
  },
];

const values = [
  {
    icon: 'verified',
    title: 'Rigorous Curation',
    description: 'Every property on RealtiQ passes a multi-stage architectural and legal review before listing. We list fewer properties — and mean it.',
  },
  {
    icon: 'balance',
    title: 'Transparent Transactions',
    description: 'No hidden fees. No surprises. Our platform provides full documentation, verified title checks, and transparent pricing at every step.',
  },
  {
    icon: 'handshake',
    title: 'Long-Term Relationships',
    description: 'We are not a transactional platform. Our team stays with clients from initial inquiry through title transfer and beyond.',
  },
  {
    icon: 'apartment',
    title: 'Architectural Integrity',
    description: 'We champion properties that respect design, sustainability, and enduring value — not just square footage and specifications.',
  },
];

const milestones = [
  { year: '2019', event: 'RealtiQ founded in Lagos with a mission to redefine luxury real estate curation in Nigeria.' },
  { year: '2020', event: 'Launched our proprietary property vetting framework, reviewed by leading architects and legal experts.' },
  { year: '2022', event: 'Expanded to cover Abuja and Port Harcourt markets; surpassed ₦100B in total property listings.' },
  { year: '2024', event: 'Introduced the RealtiQ Digital Deed — a blockchain-anchored title verification system.' },
  { year: '2026', event: 'Over 500 successful transactions, 200+ verified landlords, and Nigeria\'s most trusted premium property platform.' },
];

const About = () => {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-8 pt-12 pb-6">
        <span className="text-xs uppercase tracking-[0.2em] text-secondary font-semibold">Our Story</span>
        <h1 className="text-5xl md:text-7xl font-headline font-extrabold tracking-tighter mt-3 mb-6 max-w-3xl">
          Real estate elevated to an art form.
        </h1>
        <p className="text-xl text-on-surface-variant leading-relaxed max-w-2xl">
          RealtiQ was built on a simple but radical belief: that finding your next home or investment property should feel
          as considered and premium as the properties themselves. We curate, verify, and champion Nigeria's finest
          residential and investment-grade real estate.
        </p>
      </section>

      {/* Stats */}
      <section className="bg-surface-container-low/50 py-16 mt-8">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '500+', label: 'Successful Transactions' },
            { value: '₦100B+', label: 'In Property Value' },
            { value: '200+', label: 'Verified Landlords' },
            { value: '7', label: 'Years of Excellence' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-4xl font-black text-primary mb-2">{stat.value}</p>
              <p className="text-sm text-secondary uppercase tracking-wide font-semibold">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission & Values */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <h2 className="text-3xl font-bold mb-2">Our Values</h2>
        <p className="text-on-surface-variant mb-10 max-w-xl">The principles that guide every property we list and every client we serve.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {values.map((value) => (
            <div key={value.title} className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-8 flex gap-5">
              <span className="material-symbols-outlined text-3xl text-primary mt-1 flex-shrink-0">{value.icon}</span>
              <div>
                <h3 className="font-bold text-lg mb-2">{value.title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">{value.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="bg-surface-container-low/50 py-16">
        <div className="max-w-7xl mx-auto px-8">
          <h2 className="text-3xl font-bold mb-2">Meet the Team</h2>
          <p className="text-on-surface-variant mb-10 max-w-xl">The people behind RealtiQ's commitment to excellence.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member) => (
              <div key={member.name} className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/20">
                <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-2xl text-primary">person</span>
                </div>
                <h3 className="font-bold text-xl mb-1">{member.name}</h3>
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">{member.role}</p>
                <p className="text-on-surface-variant text-sm leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <h2 className="text-3xl font-bold mb-10">Our Journey</h2>
        <div className="relative border-l-2 border-outline-variant/30 pl-8 space-y-8">
          {milestones.map((m) => (
            <div key={m.year} className="relative">
              <div className="absolute -left-[2.65rem] top-1 w-5 h-5 rounded-full bg-primary border-4 border-surface" />
              <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">{m.year}</p>
              <p className="text-on-surface-variant text-sm leading-relaxed max-w-xl">{m.event}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 mt-4">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold text-on-primary mb-2">Ready to find your masterpiece?</h2>
            <p className="text-on-primary/70">Browse our curated selection of Nigeria's finest properties.</p>
          </div>
          <div className="flex gap-4">
            <Link to="/properties">
              <button className="bg-on-primary text-primary font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-all">
                Browse Listings
              </button>
            </Link>
            <Link to="/contact">
              <button className="bg-transparent border-2 border-on-primary text-on-primary font-bold px-8 py-3 rounded-xl hover:bg-on-primary/10 transition-all">
                Get in Touch
              </button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default About;
