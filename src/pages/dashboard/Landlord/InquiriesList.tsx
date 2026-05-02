import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { inquiryService } from '../../../services/inquiryService';
import { resolveInquiryProperty } from '../../../types';

const formatDate = (date: string) =>
  new Date(date).toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const InquiriesList = () => {
  const { data, loading, error, execute } = useAsync(() => inquiryService.getInquiries(), true);
  const inquiries = data ?? [];
  const openCount = inquiries.filter((item) => item.status === 'open').length;

  const toggleStatus = async (id: string, status: 'open' | 'closed') => {
    try {
      await inquiryService.updateInquiryStatus(id, status === 'open' ? 'closed' : 'open');
      toast.success(status === 'open' ? 'Inquiry closed.' : 'Inquiry reopened.');
      await execute();
    } catch {
      toast.error('Unable to update inquiry status.');
    }
  };

  return (
    <LandlordPortalLayout active="inquiries" title="Inquiries">
      <div className="p-10 flex flex-col gap-10">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-primary-container p-8 rounded-xl">
            <span className="text-on-primary-container text-xs font-bold tracking-widest uppercase mb-2 block">Total Inquiries</span>
            <h2 className="text-4xl font-extrabold text-white tracking-tighter">{inquiries.length}</h2>
          </div>
          <div className="bg-surface-container-low p-8 rounded-xl">
            <span className="text-secondary text-xs font-bold tracking-widest uppercase mb-1">Open</span>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{openCount}</h3>
          </div>
          <div className="bg-surface-container-low p-8 rounded-xl">
            <span className="text-secondary text-xs font-bold tracking-widest uppercase mb-1">Closed</span>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{inquiries.length - openCount}</h3>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          {loading ? (
            <LoadingState label="Loading property inquiries..." />
          ) : error ? (
            <ErrorState message={error} onRetry={() => void execute()} />
          ) : inquiries.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-secondary/40 mb-3 block">mark_email_unread</span>
              <p className="font-bold text-primary">No property inquiries available</p>
              <p className="text-sm text-secondary mt-1">New visitor messages will appear here.</p>
            </div>
          ) : (
            <div className="bg-surface-container-low rounded-xl overflow-hidden p-1">
              <div className="bg-surface-container-lowest rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[860px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">Property</th>
                      <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">Sender</th>
                      <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">Inquiry Type</th>
                      <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inquiries.map((item) => {
                      const property = resolveInquiryProperty(item.property);
                      return (
                        <tr key={item._id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-5 text-sm font-bold text-slate-900">{property?.title ?? 'Property unavailable'}</td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-900">{item.fullName}</span>
                              <span className="text-xs text-secondary">{item.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-sm text-secondary">{item.inquiryType}</td>
                          <td className="px-6 py-5 text-sm text-secondary">{formatDate(item.createdAt)}</td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              item.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {item.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex justify-end gap-2">
                              <Link to={`/dashboard/landlord/inquiry-details/${item._id}`} className="text-primary font-bold text-sm hover:underline self-center">
                                View
                              </Link>
                              <Button variant="secondary" onClick={() => void toggleStatus(item._id, item.status)}>
                                {item.status === 'open' ? 'Close' : 'Reopen'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </LandlordPortalLayout>
  );
};

export default InquiriesList;
