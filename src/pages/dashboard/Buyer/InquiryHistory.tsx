import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import { useAsync } from '../../../hooks/useAsync';
import { inquiryService } from '../../../services/inquiryService';

const statusStyles: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700',
};

const statusLabel = (status: string) => {
  if (status === 'closed') return 'Responded';
  if (status === 'scheduled') return 'Scheduled';
  return 'Pending';
};

const InquiryHistory = () => {
  const { logout } = useAuth();
  const { properties } = useProperties();
  const { data: inquiries } = useAsync(() => inquiryService.getInquiries(), true);

  const inquiryList = (inquiries ?? []).slice(0, 4);

  return (
    <div className="bg-surface font-body text-on-background antialiased">
      <aside className="fixed left-0 top-0 h-screen w-64 z-50 bg-white dark:bg-slate-950 flex flex-col p-6 gap-y-2 shadow-2xl shadow-slate-200/50 dark:shadow-none">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Curator</h1>
          <p className="text-xs tracking-widest uppercase text-secondary font-semibold">Premium Real Estate</p>
        </div>
        <nav className="flex-1 space-y-1">
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 text-sm font-semibold font-headline" to="/dashboard/buyer">
            <span className="material-symbols-outlined">dashboard</span>
            Overview
          </Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 text-sm font-semibold font-headline" to="/dashboard/buyer/my-properties">
            <span className="material-symbols-outlined">domain</span>
            My Properties
          </Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 text-sm font-semibold font-headline" to="/dashboard/buyer/payment-history">
            <span className="material-symbols-outlined">payments</span>
            Payment History
          </Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-900 bg-slate-100 rounded-md font-bold scale-98 transition-all text-sm font-headline" to="/dashboard/buyer/inquiry-history">
            <span className="material-symbols-outlined">chat_bubble</span>
            Inquiry History
          </Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 text-sm font-semibold font-headline" to="/dashboard/buyer/profile-settings">
            <span className="material-symbols-outlined">settings</span>
            Settings
          </Link>
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-100 space-y-1">
          <button className="w-full text-left flex items-center gap-3 px-4 py-2 text-slate-500 hover:bg-slate-50 text-xs font-semibold uppercase tracking-wider">
            <span className="material-symbols-outlined">help</span>
            Help Center
          </button>
          <button className="w-full text-left flex items-center gap-3 px-4 py-2 text-slate-500 hover:bg-slate-50 text-xs font-semibold uppercase tracking-wider" onClick={logout}>
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <header className="fixed top-0 w-full z-40 bg-slate-50/80 backdrop-blur-xl flex justify-between items-center px-8 h-16 ml-64 overflow-hidden">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-on-surface-variant">
              <span className="material-symbols-outlined text-lg">search</span>
            </span>
            <input className="pl-10 pr-4 py-1.5 bg-surface-container-low border-none rounded-md text-sm focus:ring-2 focus:ring-primary w-64 transition-all outline-none" placeholder="Search inquiries..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-4 pr-64">
          <button className="p-2 text-slate-500 hover:text-slate-900 transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
          </button>
          <button className="p-2 text-slate-500 hover:text-slate-900 transition-colors">
            <span className="material-symbols-outlined">mail</span>
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-high ml-2 cursor-pointer ring-2 ring-transparent hover:ring-primary transition-all">
            <img className="w-full h-full object-cover" alt="User profile avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIChpKoOjaFxmBpsTuJIuEeOeMZX13QXR6lZ3qxRbjFfpqzweDTRVmQzv99AfNp6r90RlevIXtlJKSkNGA4rUXKjL5BehPEI2Sbc8aOR_iq0VVhll_I7BbcPr26GiUUlcZJLklafk72PhsWzliAwWo1PxJIq4MOKF18gMcErZHBqNjqkrrK86HPmZ1K2ikmTZ0kgeEA2pEJylKs5pCMg20TklEGcRcrerY2MEhRRaKBwxWOSmFjFHll6zTOFPOpjPBa7u8pQay9A" />
          </div>
        </div>
      </header>

      <main className="ml-64 pt-24 px-12 pb-20 max-w-[1400px]">
        <header className="mb-12">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs font-bold text-secondary tracking-[0.2em] uppercase mb-2 block">Archive & Active</span>
              <h2 className="text-4xl font-headline font-extrabold text-primary tracking-tighter">Inquiry History</h2>
            </div>
            <div className="flex gap-3">
              <Link className="px-6 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-md shadow-lg shadow-primary/10 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2" to="/inquiry">
                <span className="material-symbols-outlined text-sm">add</span>
                New Inquiry
              </Link>
            </div>
          </div>
          <div className="mt-8 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            <button className="px-6 py-2 bg-secondary-fixed text-on-secondary-fixed text-xs font-bold rounded-full transition-all">All Inquiries</button>
            <button className="px-6 py-2 bg-surface-container-high text-on-surface-variant text-xs font-bold rounded-full hover:bg-secondary-fixed/50 transition-all">Responded</button>
            <button className="px-6 py-2 bg-surface-container-high text-on-surface-variant text-xs font-bold rounded-full hover:bg-secondary-fixed/50 transition-all">Pending</button>
            <button className="px-6 py-2 bg-surface-container-high text-on-surface-variant text-xs font-bold rounded-full hover:bg-secondary-fixed/50 transition-all">Scheduled</button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {inquiryList.map((inquiry) => {
            const property = properties.find((item) => item._id === inquiry.propertyId);
            const visualStatus = inquiry.status === 'closed' ? 'closed' : 'open';
            return (
              <div key={inquiry.id} className="group bg-surface-container-lowest rounded-xl overflow-hidden hover:translate-y-[-4px] transition-all duration-300 shadow-sm border border-outline-variant/10">
                <div className="relative h-48 overflow-hidden">
                  <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={property?.media[0]?.url ?? 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxL6O9vohoafRE9IDJNjUsEXY6FseCx6W94YAa1rqCWzA0T_rrzgMNej1LpRdusNAYGdCPbXnhugD6rrA3jB3famHKj_e-RKIBdVrnISKWtPe1R4ujmq3tJ5QWv1satUoTMvXShAOfMe7DrcZbmshKi_S5Z3vtfl2l8drfbkc64N0L-5QUd9znYF6PWJkuXbgn8NRU8_Urt2D5EvqTQd6bHuL3v5sb6gtcOZz9QrZ00lY6kpcAq1DShMZxX2VtOpnERZ8mMQN0Iw'} alt={property?.title ?? 'Property'} />
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 ${statusStyles[visualStatus] ?? 'bg-blue-100 text-blue-700'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {statusLabel(inquiry.status)}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-headline font-bold text-lg text-primary tracking-tight">{property?.title ?? 'Property Inquiry'}</h3>
                    <span className="text-[10px] font-medium text-secondary">{new Date(inquiry.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-6 line-clamp-3 italic">"{inquiry.message}"</p>
                  <div className="flex items-center justify-between pt-4 border-t border-surface-container-low">
                    <div className="flex -space-x-2">
                      <img alt="Agent profile" className="w-8 h-8 rounded-full border-2 border-white" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0Y4jvpN3j_TmpYKBkPOOss147kFp7G6u-iYnXauJeghk_6pvaEUcgEv2-GnPzVRUvpwj3xnJUD_UUZyVRoLyoYL9XrS_h44ThbLfu338xl-r6JsYZqLkkxhO4Y6pIzYuHdg2cow-5qtVjdwtclOeuoPGs7gbm9pHo2yunbnBQf9JZX5mKX96M8Nh4PwkQ5AjFhwGaREmc90I7ZkSLiS59JhQIm1pwC-7MpRdNZr5u45XNt0xLniJshsKuPlP78u0bxBaCxux4fg" />
                    </div>
                    <button className="text-sm font-bold text-primary hover:underline transition-all">View Details</button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="lg:col-span-2 bg-primary-container text-on-primary-container rounded-xl p-8 flex flex-col justify-center relative overflow-hidden min-h-[280px]">
            <div className="relative z-10 max-w-lg">
              <h3 className="font-headline font-bold text-2xl text-white mb-4">Concierge Assistant</h3>
              <p className="text-on-primary-container/80 text-sm leading-relaxed mb-8">Want to skip the wait? Our Premium Curator service can handle all negotiations and technical inquiries on your behalf, reducing response times by up to 60%.</p>
              <button className="px-8 py-3 bg-white text-primary text-xs font-bold rounded-md hover:scale-105 transition-transform">Enable Premium Concierge</button>
            </div>
          </div>
        </div>

        <div className="mt-16 flex items-center justify-between border-t border-surface-container-high pt-8">
          <p className="text-xs text-secondary font-medium tracking-wide">Showing {inquiryList.length} of {(inquiries ?? []).length} inquiries</p>
          <div className="flex gap-2">
            <button className="w-10 h-10 flex items-center justify-center rounded-md bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors">
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-md bg-primary text-on-primary font-bold text-xs">1</button>
            <button className="w-10 h-10 flex items-center justify-center rounded-md bg-surface-container-lowest text-on-surface hover:bg-surface-container-high transition-colors font-bold text-xs">2</button>
            <button className="w-10 h-10 flex items-center justify-center rounded-md bg-surface-container-lowest text-on-surface hover:bg-surface-container-high transition-colors font-bold text-xs">3</button>
            <button className="w-10 h-10 flex items-center justify-center rounded-md bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </main>

      <div className="fixed bottom-8 right-8 z-50">
        <button className="w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group">
          <span className="material-symbols-outlined">support_agent</span>
          <span className="absolute right-full mr-4 px-4 py-2 bg-on-background text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold">Talk to a Curator</span>
        </button>
      </div>
    </div>
  );
};

export default InquiryHistory;