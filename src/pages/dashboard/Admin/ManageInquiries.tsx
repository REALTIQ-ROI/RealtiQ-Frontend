import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import AdminLayout from '../../../components/layout/AdminLayout';
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

const ManageInquiries = () => {
  const { data, loading, error, execute } = useAsync(() => inquiryService.getInquiries(), true);
  const inquiries = data ?? [];
  const openCount = inquiries.filter((inquiry) => inquiry.status === 'open').length;

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
    <AdminLayout>
      <div className="min-h-screen pt-8 px-8 pb-12">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-secondary mb-2 block">
              System Intelligence
            </span>
            <h2 className="font-headline text-4xl font-extrabold tracking-tight text-primary leading-none">
              Inquiries Feed
            </h2>
            <p className="text-secondary mt-3 max-w-xl font-body">
              Monitor and manage property inquiries across the platform.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-primary-container text-white rounded-xl p-6">
            <p className="text-xs font-medium text-on-primary-container mb-1">Total Inquiries</p>
            <p className="text-3xl font-extrabold tracking-tighter">{inquiries.length}</p>
          </div>
          <div className="bg-surface-container-low rounded-xl p-6">
            <p className="text-xs font-medium text-secondary mb-1">Open</p>
            <p className="text-3xl font-extrabold tracking-tighter">{openCount}</p>
          </div>
          <div className="bg-surface-container-low rounded-xl p-6">
            <p className="text-xs font-medium text-secondary mb-1">Closed</p>
            <p className="text-3xl font-extrabold tracking-tighter">{inquiries.length - openCount}</p>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Loading inquiries..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void execute()} />
        ) : inquiries.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-secondary/40 mb-3 block">inbox</span>
            <p className="font-bold text-primary">No inquiries yet</p>
            <p className="text-sm text-secondary mt-1">Visitor property inquiries will appear here.</p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl overflow-x-auto border border-outline-variant/10">
            <table className="w-full min-w-[960px] text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-[0.1em]">Sender</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-[0.1em]">Property</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-[0.1em]">Inquiry Type</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-[0.1em]">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-[0.1em]">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-[0.1em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {inquiries.map((inquiry) => {
                  const property = resolveInquiryProperty(inquiry.property);
                  return (
                    <tr key={inquiry._id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-fixed font-bold text-xs">
                            {inquiry.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-primary text-sm">{inquiry.fullName}</h4>
                            <p className="text-xs text-secondary">{inquiry.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-primary">{property?.title ?? 'Property unavailable'}</p>
                        <p className="text-xs text-secondary">{property?.location ?? 'Location unavailable'}</p>
                      </td>
                      <td className="px-6 py-5 text-sm text-secondary">{inquiry.inquiryType}</td>
                      <td className="px-6 py-5 text-sm text-secondary">{formatDate(inquiry.createdAt)}</td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          inquiry.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {inquiry.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <Link to={`/dashboard/admin/inquiry-details/${inquiry._id}`} className="self-center text-primary font-bold text-sm hover:underline">
                            View
                          </Link>
                          <Button variant="secondary" onClick={() => void toggleStatus(inquiry._id, inquiry.status)}>
                            {inquiry.status === 'open' ? 'Close' : 'Reopen'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManageInquiries;
