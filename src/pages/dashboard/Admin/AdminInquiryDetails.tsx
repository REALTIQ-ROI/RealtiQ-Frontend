import { Link, useParams } from 'react-router-dom';
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
    hour: '2-digit',
    minute: '2-digit',
  });

const AdminInquiryDetails = () => {
  const { id } = useParams();
  const { data: inquiry, loading, error, execute } = useAsync(
    () => (id ? inquiryService.getInquiryById(id) : Promise.reject(new Error('Missing inquiry id'))),
    Boolean(id),
  );
  const property = inquiry ? resolveInquiryProperty(inquiry.property) : null;

  const toggleStatus = async () => {
    if (!inquiry) return;
    try {
      await inquiryService.updateInquiryStatus(inquiry._id, inquiry.status === 'open' ? 'closed' : 'open');
      toast.success(inquiry.status === 'open' ? 'Inquiry closed.' : 'Inquiry reopened.');
      await execute();
    } catch {
      toast.error('Unable to update inquiry status.');
    }
  };

  return (
    <AdminLayout>
      <div className="pt-8 px-8 pb-12 max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-secondary mb-2 block">
              Inquiry Record
            </span>
            <h2 className="font-headline text-4xl font-extrabold tracking-tight text-primary leading-none">
              Inquiry Details
            </h2>
          </div>
          <Link className="text-sm font-bold text-primary hover:underline" to="/dashboard/admin/manage-inquiries">
            Back to inquiries
          </Link>
        </div>

        {!id ? (
          <ErrorState message="No inquiry was selected." />
        ) : loading ? (
          <LoadingState label="Loading inquiry details..." />
        ) : error || !inquiry ? (
          <ErrorState message={error ?? 'Inquiry not found.'} onRetry={() => void execute()} />
        ) : (
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-8 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-secondary uppercase tracking-widest">Sender</p>
                <h3 className="text-2xl font-extrabold text-primary">{inquiry.fullName}</h3>
                <p className="text-sm text-secondary">{inquiry.email}</p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase ${
                inquiry.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
              }`}>
                {inquiry.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <p><strong>Property:</strong> {property?.title ?? 'Property unavailable'}</p>
              <p><strong>Location:</strong> {property?.location ?? 'Location unavailable'}</p>
              <p><strong>Inquiry Type:</strong> {inquiry.inquiryType}</p>
              <p><strong>Created:</strong> {formatDate(inquiry.createdAt)}</p>
              <p><strong>Owner ID:</strong> {inquiry.ownerId}</p>
              <p><strong>User ID:</strong> {inquiry.userId ?? 'Visitor inquiry'}</p>
            </div>

            <div className="bg-surface-container-low rounded-xl p-6">
              <p className="text-xs text-secondary uppercase tracking-widest mb-2">Message</p>
              <p className="text-on-surface-variant leading-relaxed whitespace-pre-wrap">{inquiry.message}</p>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => void toggleStatus()}>
                {inquiry.status === 'open' ? 'Mark Closed' : 'Reopen Inquiry'}
              </Button>
            </div>
          </section>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminInquiryDetails;
