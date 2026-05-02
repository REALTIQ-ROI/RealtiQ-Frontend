import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import { inquiryService } from '../../../services/inquiryService';
import { resolveInquiryProperty, type ApiInquiry } from '../../../types';

type FilterTab = 'all' | 'open' | 'closed';

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

const statusStyles: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-green-100 text-green-700',
};

const statusLabel = (status: ApiInquiry['status']) =>
  status === 'closed' ? 'Responded' : 'Pending';

const PLACEHOLDER_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBxL6O9vohoafRE9IDJNjUsEXY6FseCx6W94YAa1rqCWzA0T_rrzgMNej1LpRdusNAYGdCPbXnhugD6rrA3jB3famHKj_e-RKIBdVrnISKWtPe1R4ujmq3tJ5QWv1satUoTMvXShAOfMe7DrcZbmshKi_S5Z3vtfl2l8drfbkc64N0L-5QUd9znYF6PWJkuXbgn8NRU8_Urt2D5EvqTQd6bHuL3v5sb6gtcOZz9QrZ00lY6kpcAq1DShMZxX2VtOpnERZ8mMQN0Iw';

const InquiryHistory = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, execute } = useAsync(() => inquiryService.getInquiries(), true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const allInquiries = data ?? [];
  const filtered =
    activeFilter === 'all' ? allInquiries : allInquiries.filter((i) => i.status === activeFilter);

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
            <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">U</div>
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
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-6 py-2 text-xs font-bold rounded-full transition-all ${activeFilter === 'all' ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container-high text-on-surface-variant hover:bg-secondary-fixed/50'}`}
            >
              All Inquiries
            </button>
            <button
              onClick={() => setActiveFilter('closed')}
              className={`px-6 py-2 text-xs font-bold rounded-full transition-all ${activeFilter === 'closed' ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container-high text-on-surface-variant hover:bg-secondary-fixed/50'}`}
            >
              Responded
            </button>
            <button
              onClick={() => setActiveFilter('open')}
              className={`px-6 py-2 text-xs font-bold rounded-full transition-all ${activeFilter === 'open' ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container-high text-on-surface-variant hover:bg-secondary-fixed/50'}`}
            >
              Pending
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-32 gap-3 text-secondary">
            <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
            <span className="font-medium">Loading inquiries…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <span className="material-symbols-outlined text-5xl text-red-400 mb-4">error_outline</span>
            <p className="font-bold text-slate-700 mb-2">Failed to load inquiries</p>
            <p className="text-secondary text-sm mb-6">{error}</p>
            <button
              onClick={() => void execute()}
              className="px-6 py-3 bg-primary text-on-primary rounded-xl text-sm font-bold"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-secondary">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-30">chat_bubble</span>
            <p className="font-semibold">No inquiries found</p>
            <p className="text-sm mt-1">
              {activeFilter !== 'all' ? 'Try a different filter' : 'Submit your first inquiry to get started'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((inquiry) => {
                const property = resolveInquiryProperty(inquiry.property);
                return (
                <div key={inquiry._id} className="group bg-surface-container-lowest rounded-xl overflow-hidden hover:translate-y-[-4px] transition-all duration-300 shadow-sm border border-outline-variant/10">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      src={PLACEHOLDER_IMG}
                      alt={property?.title ?? 'Property inquiry'}
                    />
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 ${statusStyles[inquiry.status] ?? 'bg-blue-100 text-blue-700'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {statusLabel(inquiry.status)}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-headline font-bold text-lg text-primary tracking-tight">{property?.title ?? 'Property unavailable'}</h3>
                      <span className="text-[10px] font-medium text-secondary">{formatDate(inquiry.createdAt)}</span>
                    </div>
                    <p className="text-xs text-secondary/70 uppercase tracking-wider font-medium mb-2">{inquiry.inquiryType}</p>
                    <p className="text-sm text-on-surface-variant leading-relaxed mb-6 line-clamp-3 italic">"{inquiry.message}"</p>
                    <div className="flex items-center justify-between pt-4 border-t border-surface-container-low">
                      <p className="text-xs text-secondary">{property?.location ?? 'Location unavailable'}</p>
                      <button
                        onClick={() => void navigate(`/dashboard/buyer/inquiry-details/${inquiry._id}`)}
                        className="text-sm font-bold text-primary hover:underline transition-all"
                      >
                        View Details
                      </button>
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
              <p className="text-xs text-secondary font-medium tracking-wide">Showing {filtered.length} of {allInquiries.length} inquiries</p>
            </div>
          </>
        )}
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
