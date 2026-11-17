import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { ApiRequestError } from '../../../lib/axios';
import { inquiryService } from '../../../services/inquiryService';
import { messageService } from '../../../services/messageService';
import { resolveInquiryId, resolveInquiryProperties, resolveInquiryProperty } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';

const formatDate = (date: string) =>
  new Date(date).toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const LandlordInquiryDetailsContent = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: inquiry, loading, error, execute } = useAsync(
    () => (id ? inquiryService.getInquiryById(id) : Promise.reject(new Error('Missing inquiry id'))),
    Boolean(id),
  );
  const property = inquiry ? resolveInquiryProperty(inquiry.property) : null;
  const selectedProperties = inquiry ? resolveInquiryProperties(inquiry) : [];
  const inquiryId = inquiry ? resolveInquiryId(inquiry) : '';
  const senderLabel = inquiry?.inquirer?.trim() || 'REALTIQ user';

  const startConversation = async () => {
    if (!inquiry || !inquiryId) return;
    const propertyId = typeof inquiry.property === 'string' ? inquiry.property : inquiry.property.id ?? inquiry.property._id;
    if (!propertyId) { toast.error('This inquiry does not include a current listing reference.'); return; }
    try {
      const conversation = await messageService.start(propertyId, inquiryId);
      navigate(`/messages/${encodeURIComponent(conversation._id)}`);
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to open the on-platform conversation.'); }
  };

  const toggleStatus = async () => {
    if (!inquiry || !inquiryId) return;
    try {
      await inquiryService.updateInquiryStatus(inquiryId, inquiry.status === 'open' ? 'closed' : 'open', inquiry.version);
      toast.success(inquiry.status === 'open' ? 'Inquiry closed.' : 'Inquiry reopened.');
      await execute();
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'CONFLICT_INQUIRY_VERSION') {
        await execute();
        toast.error('This inquiry changed since you opened it. The latest version is loaded; review it before trying again.');
      } else toast.error(error instanceof Error ? error.message : 'Unable to update inquiry status.');
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
                      {senderLabel.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">{senderLabel}</h2>
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
                  <p><strong>Inquiry Type:</strong> {inquiry.inquiryType}</p>
                  <p><strong>{selectedProperties.length > 1 ? 'First selected unit' : 'Property'}:</strong> {property?.title ?? selectedProperties[0]?.title ?? 'Property unavailable'}</p>
                  <p><strong>Location:</strong> {property?.location ?? selectedProperties[0]?.location ?? 'Location unavailable'}</p>
                </div>

                {selectedProperties.length > 1 ? <section className="mb-6 rounded-xl border border-outline-variant/15 p-5">
                  <h3 className="font-bold">Selected units · {selectedProperties.length}</h3>
                  <ul className="mt-3 divide-y divide-outline-variant/15">{selectedProperties.map((selected, index) => <li key={selected.id ?? selected._id ?? `${selected.title}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="font-semibold">{selected.title || 'Unit'}</span><span className="text-secondary">{[selected.publicReference, selected.location, selected.status].filter(Boolean).join(' · ') || 'Current status unavailable'}</span></li>)}</ul>
                  <p className="mt-3 text-xs text-secondary">This is one enquiry covering the selected units. Current availability is shown as returned by the server.</p>
                </section> : null}

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
                  Continue the conversation on REALTIQ and use the status control to keep your inquiry queue current.
                </p>
                <Button className="mt-4" onClick={() => void startConversation()}>Continue in messages</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LandlordPortalLayout>
  );
};

export default function LandlordInquiryDetails() {
  const { activeProfile } = useAuth();
  return <LandlordInquiryDetailsContent key={activeProfile?.id ?? 'no-profile'} />;
}
