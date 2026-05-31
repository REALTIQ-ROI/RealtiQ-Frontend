import { Link, useParams } from 'react-router-dom';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
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

const InquiryDetails = () => {
  const { id } = useParams();
  const { data: inquiry, loading, error, execute } = useAsync(
    () => (id ? inquiryService.getInquiryById(id) : Promise.reject(new Error('Missing inquiry id'))),
    Boolean(id),
  );
  const property = inquiry ? resolveInquiryProperty(inquiry.property) : null;

  return (
    <BuyerPortalLayout
      pageEyebrow="Inquiry History"
      pageTitle="Inquiry Details"
      pageSubtitle="Review the full message and related property information."
    >
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold">Inquiry Details</h1>
          <Link className="text-sm font-bold text-primary hover:underline" to="/dashboard/buyer/inquiry-history">
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
          <div className="rounded-xl border border-outline-variant/20 p-5 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-secondary uppercase tracking-widest">Property</p>
                <h2 className="text-xl font-extrabold">{property?.title ?? 'Property unavailable'}</h2>
                <p className="text-sm text-secondary">{property?.location ?? 'Location unavailable'}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  inquiry.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                }`}
              >
                {inquiry.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <p><strong>Type:</strong> {inquiry.inquiryType}</p>
              <p><strong>Sent:</strong> {formatDate(inquiry.createdAt)}</p>
              <p><strong>Name:</strong> {inquiry.fullName}</p>
              <p><strong>Email:</strong> {inquiry.email}</p>
            </div>

            <div className="bg-surface-container-low rounded-xl p-5">
              <p className="text-xs text-secondary uppercase tracking-widest mb-2">Message</p>
              <p className="text-on-surface-variant leading-relaxed whitespace-pre-wrap">{inquiry.message}</p>
            </div>

            <Button variant="secondary" onClick={() => window.history.back()}>
              Back
            </Button>
          </div>
        )}
      </section>
    </BuyerPortalLayout>
  );
};

export default InquiryDetails;
