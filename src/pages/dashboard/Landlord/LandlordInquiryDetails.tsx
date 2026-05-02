import { Link, useParams } from 'react-router-dom';
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
    hour: '2-digit',
    minute: '2-digit',
  });

const LandlordInquiryDetails = () => {
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
    <LandlordPortalLayout
      active="inquiries"
      title="Inquiry Details"
      topLeft={
        <div className="flex items-center gap-4">
          <Link to="/dashboard/landlord/inquiries" className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Inquiry Details</h1>
        </div>
      }
    >
      <div className="p-10 max-w-6xl mx-auto">
        {!id ? (
          <ErrorState message="No inquiry was selected." />
        ) : loading ? (
          <LoadingState label="Loading inquiry details..." />
        ) : error || !inquiry ? (
          <ErrorState message={error ?? 'Inquiry not found.'} onRetry={() => void execute()} />
        ) : (
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-8 space-y-8">
              <section className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(25,28,30,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed font-bold text-xl">
                      {inquiry.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">{inquiry.fullName}</h2>
                      <p className="text-sm text-slate-500">Sent {formatDate(inquiry.createdAt)}</p>
                    </div>
                  </div>
                  <span className={`px-4 py-1.5 text-xs font-bold rounded-full uppercase tracking-wider ${
                    inquiry.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {inquiry.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                  <p><strong>Email:</strong> {inquiry.email}</p>
                  <p><strong>Inquiry Type:</strong> {inquiry.inquiryType}</p>
                  <p><strong>Property:</strong> {property?.title ?? 'Property unavailable'}</p>
                  <p><strong>Location:</strong> {property?.location ?? 'Location unavailable'}</p>
                </div>

                <div className="bg-surface-container-low p-6 rounded-xl">
                  <p className="text-xs text-secondary uppercase tracking-widest mb-2">Message</p>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{inquiry.message}</p>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button onClick={() => void toggleStatus()}>
                    {inquiry.status === 'open' ? 'Mark Closed' : 'Reopen Inquiry'}
                  </Button>
                </div>
              </section>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="bg-primary-container text-white rounded-xl p-8">
                <h4 className="font-bold tracking-tight mb-4">Property Inquiry</h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Reply directly by email and use the status control to keep your inquiry queue current.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </LandlordPortalLayout>
  );
};

export default LandlordInquiryDetails;
