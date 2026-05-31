import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import { useAsync } from '../../../hooks/useAsync';
import { inquiryService } from '../../../services/inquiryService';
import { resolveInquiryProperty, type ApiInquiry } from '../../../types';

type FilterTab = 'all' | 'open' | 'closed';

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const statusStyles: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-green-100 text-green-700',
};

const statusLabel = (status: ApiInquiry['status']) => (status === 'closed' ? 'Responded' : 'Pending');

const PLACEHOLDER_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBxL6O9vohoafRE9IDJNjUsEXY6FseCx6W94YAa1rqCWzA0T_rrzgMNej1LpRdusNAYGdCPbXnhugD6rrA3jB3famHKj_e-RKIBdVrnISKWtPe1R4ujmq3tJ5QWv1satUoTMvXShAOfMe7DrcZbmshKi_S5Z3vtfl2l8drfbkc64N0L-5QUd9znYF6PWJkuXbgn8NRU8_Urt2D5EvqTQd6bHuL3v5sb6gtcOZz9QrZ00lY6kpcAq1DShMZxX2VtOpnERZ8mMQN0Iw';

const InquiryHistory = () => {
  const navigate = useNavigate();
  const { data, loading, error, execute } = useAsync(() => inquiryService.getInquiries(), true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [query, setQuery] = useState('');

  const allInquiries = data ?? [];
  const filtered = allInquiries.filter((inquiry) => {
    const property = resolveInquiryProperty(inquiry.property);
    const matchesStatus = activeFilter === 'all' || inquiry.status === activeFilter;
    const needle = query.trim().toLowerCase();
    const matchesQuery =
      !needle ||
      `${inquiry.fullName} ${inquiry.email} ${inquiry.inquiryType} ${inquiry.message} ${property?.title ?? ''} ${property?.location ?? ''}`
        .toLowerCase()
        .includes(needle);
    return matchesStatus && matchesQuery;
  });

  const topbarSearch = (
    <div className="relative group">
      <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-on-surface-variant">
        <span className="material-symbols-outlined text-lg">search</span>
      </span>
      <input
        className="pl-10 pr-4 py-1.5 bg-surface-container-low border-none rounded-md text-sm focus:ring-2 focus:ring-primary w-64 transition-all outline-none"
        placeholder="Search inquiries..."
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </div>
  );

  return (
    <BuyerPortalLayout
      pageEyebrow="Archive & Active"
      pageTitle="Inquiry History"
      pageSubtitle="Review submitted inquiries, their response status, and the properties they reference."
      topbarRight={topbarSearch}
    >
      <header className="mb-12">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-bold text-secondary tracking-[0.2em] uppercase mb-2 block">Archive & Active</span>
            <h2 className="text-4xl font-headline font-extrabold text-primary tracking-tighter">Inquiry History</h2>
          </div>
          <div className="flex gap-3">
            <Link
              className="px-6 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-md shadow-lg shadow-primary/10 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
              to="/inquiry"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              New Inquiry
            </Link>
          </div>
        </div>
        <div className="mt-8 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-6 py-2 text-xs font-bold rounded-full transition-all ${
              activeFilter === 'all' ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container-high text-on-surface-variant hover:bg-secondary-fixed/50'
            }`}
          >
            All Inquiries
          </button>
          <button
            onClick={() => setActiveFilter('closed')}
            className={`px-6 py-2 text-xs font-bold rounded-full transition-all ${
              activeFilter === 'closed' ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container-high text-on-surface-variant hover:bg-secondary-fixed/50'
            }`}
          >
            Responded
          </button>
          <button
            onClick={() => setActiveFilter('open')}
            className={`px-6 py-2 text-xs font-bold rounded-full transition-all ${
              activeFilter === 'open' ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container-high text-on-surface-variant hover:bg-secondary-fixed/50'
            }`}
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
          <button onClick={() => void execute()} className="px-6 py-3 bg-primary text-on-primary rounded-xl text-sm font-bold">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-secondary">
          <span className="material-symbols-outlined text-6xl mb-4 opacity-30">chat_bubble</span>
          <p className="font-semibold">No inquiries found</p>
          <p className="text-sm mt-1">{activeFilter !== 'all' ? 'Try a different filter' : 'Submit your first inquiry to get started'}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((inquiry) => {
              const property = resolveInquiryProperty(inquiry.property);
              return (
                <div
                  key={inquiry._id}
                  className="group bg-surface-container-lowest rounded-xl overflow-hidden hover:translate-y-[-4px] transition-all duration-300 shadow-sm border border-outline-variant/10"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={PLACEHOLDER_IMG} alt={property?.title ?? 'Property inquiry'} />
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 ${statusStyles[inquiry.status] ?? 'bg-blue-100 text-blue-700'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
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
                      <button onClick={() => void navigate(`/dashboard/buyer/inquiry-details/${inquiry._id}`)} className="text-sm font-bold text-primary hover:underline transition-all">
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
                <p className="text-on-primary-container/80 text-sm leading-relaxed mb-8">
                  Want to skip the wait? Our Premium Curator service can handle all negotiations and technical inquiries on your behalf, reducing response times by up to 60%.
                </p>
                <button className="px-8 py-3 bg-white text-primary text-xs font-bold rounded-md hover:scale-105 transition-transform">Enable Premium Concierge</button>
              </div>
            </div>
          </div>

          <div className="mt-16 flex items-center justify-between border-t border-surface-container-high pt-8">
            <p className="text-xs text-secondary font-medium tracking-wide">Showing {filtered.length} of {allInquiries.length} inquiries</p>
          </div>
        </>
      )}

      <div className="fixed bottom-8 right-8 z-50">
        <button className="w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group">
          <span className="material-symbols-outlined">support_agent</span>
          <span className="absolute right-full mr-4 px-4 py-2 bg-on-background text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold">
            Talk to a Curator
          </span>
        </button>
      </div>
    </BuyerPortalLayout>
  );
};

export default InquiryHistory;
