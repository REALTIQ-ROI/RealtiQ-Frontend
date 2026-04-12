import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="w-full py-16 px-8 mt-20 bg-slate-900 text-slate-100">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 max-w-7xl mx-auto">
        <div>
          <div className="font-manrope font-black text-2xl mb-4">RealtiQ</div>
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
          <div className="flex gap-2 mt-2">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-slate-500"
            />
            <button className="bg-slate-100 text-slate-900 text-xs font-bold px-3 py-2 rounded-lg hover:bg-white transition-colors">
              Join
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-slate-800 flex justify-between items-center text-xs uppercase tracking-wide">
        <p className="text-slate-400">© 2026 RealtiQ. All rights reserved.</p>
        <p className="text-slate-200 font-bold">Design of Excellence</p>
      </div>
    </footer>
  );
};

export default Footer;