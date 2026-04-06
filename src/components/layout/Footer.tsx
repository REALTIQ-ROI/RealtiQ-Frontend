const Footer = () => {
  return (
    <footer className="w-full py-16 px-8 mt-20 bg-slate-900 text-slate-100">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 max-w-7xl mx-auto">
        <div>
          <div className="font-manrope font-black text-2xl mb-4">RealtiQ</div>
          <p className="text-slate-400 text-sm leading-relaxed">
            Excellence in real estate through intentional curation and architectural advocacy.
          </p>
        </div>

        <div className="space-y-3 text-sm text-slate-400">
          <h4 className="text-slate-50 uppercase tracking-wide text-xs font-bold">Company</h4>
          <p>About Us</p>
          <p>Our Process</p>
          <p>Press</p>
        </div>

        <div className="space-y-3 text-sm text-slate-400">
          <h4 className="text-slate-50 uppercase tracking-wide text-xs font-bold">Support</h4>
          <p>Privacy Policy</p>
          <p>Terms of Service</p>
          <p>Contact Us</p>
        </div>

        <div className="space-y-3 text-sm text-slate-400">
          <h4 className="text-slate-50 uppercase tracking-wide text-xs font-bold">Newsletter</h4>
          <p>Join our list for exclusive off-market opportunities.</p>
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