import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
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

const InquiryDetailsContent = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { activeProfile } = useAuth();
  const [consentSaving, setConsentSaving] = useState(false);
  const { data: inquiry, loading, error, execute } = useAsync(
    () => (id ? inquiryService.getInquiryById(id) : Promise.reject(new Error('Missing inquiry id'))),
    Boolean(id),
  );
  const property = inquiry ? resolveInquiryProperty(inquiry.property) : null;
  const selectedProperties = inquiry ? resolveInquiryProperties(inquiry) : [];
  const inquiryId = inquiry ? resolveInquiryId(inquiry) : '';
  const startConversation = async () => {
    if (!inquiry || !inquiryId) return;
    const propertyId = typeof inquiry.property === 'string' ? inquiry.property : inquiry.property.id ?? inquiry.property._id;
    if (!propertyId) { toast.error('This inquiry does not include a current listing reference.'); return; }
    try {
      const conversation = await messageService.start(propertyId, inquiryId);
      navigate(`/messages/${encodeURIComponent(conversation._id)}`);
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to open the on-platform conversation.'); }
  };
  const updateLeadConsent = async () => {
    if (!id || !inquiry || typeof inquiry.version !== 'number' || consentSaving) return;
    setConsentSaving(true);
    try {
      await inquiryService.updateLeadUpdatesConsent(id, { optIn: !inquiry.leadUpdatesOptIn, expectedVersion: inquiry.version });
      toast.success(!inquiry.leadUpdatesOptIn ? 'Property updates enabled.' : 'Property updates stopped.');
      await execute();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Your update choice could not be saved. Refresh the inquiry and try again.'); }
    finally { setConsentSaving(false); }
  };

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
                <p className="text-xs text-secondary uppercase tracking-widest">{selectedProperties.length > 1 ? 'Selected units' : 'Property'}</p>
                <h2 className="text-xl font-extrabold">{property?.title ?? selectedProperties[0]?.title ?? 'Property unavailable'}</h2>
                <p className="text-sm text-secondary">{property?.location ?? selectedProperties[0]?.location ?? 'Location unavailable'}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  inquiry.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                }`}
              >
                {inquiry.status}
              </span>
            </div>

            {selectedProperties.length > 1 ? <section className="rounded-xl border border-outline-variant/15 p-4">
              <h3 className="font-bold">Units included in this enquiry</h3>
              <ul className="mt-2 divide-y divide-outline-variant/15">{selectedProperties.map((selected, index) => <li key={selected.id ?? selected._id ?? `${selected.title}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="font-semibold">{selected.title || 'Unit'}</span><span className="text-secondary">{[selected.publicReference, selected.location, selected.status].filter(Boolean).join(' · ') || 'Current status unavailable'}</span></li>)}</ul>
              <p className="mt-2 text-xs text-secondary">This is one enquiry for the selected units, not a purchase negotiation.</p>
            </section> : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <p><strong>Type:</strong> {inquiry.inquiryType}</p>
              <p><strong>Sent:</strong> {formatDate(inquiry.createdAt)}</p>
              <p><strong>Name:</strong> {inquiry.fullName ?? 'Your account'}</p>
              {inquiry.email ? <p><strong>Email:</strong> {inquiry.email}</p> : null}
            </div>

            <div className="bg-surface-container-low rounded-xl p-5">
              <p className="text-xs text-secondary uppercase tracking-widest mb-2">Message</p>
              <p className="text-on-surface-variant leading-relaxed whitespace-pre-wrap">{inquiry.message}</p>
            </div>

            {activeProfile?.kind === 'buyer' ? <section className="rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Property updates</h3><p className="mt-1 text-sm text-secondary">{inquiry.leadUpdatesOptIn ? 'You agreed to receive occasional in-app updates about this property.' : 'You are not receiving property updates for this inquiry.'}</p></div><button type="button" disabled={consentSaving || typeof inquiry.version !== 'number'} onClick={() => void updateLeadConsent()} className="rounded-lg border px-4 py-2 font-bold disabled:opacity-50">{consentSaving ? 'Saving…' : inquiry.leadUpdatesOptIn ? 'Stop updates' : 'Allow updates'}</button></div>{typeof inquiry.version !== 'number' ? <p className="mt-2 text-xs text-secondary">This inquiry does not include the current version needed to change the choice. Refresh later to try again.</p> : null}</section> : null}

            <Button variant="secondary" onClick={() => window.history.back()}>
              Back
            </Button>
            <Button onClick={() => void startConversation()}>Continue in messages</Button>
          </div>
        )}
      </section>
    </BuyerPortalLayout>
  );
};

export default function InquiryDetails() {
  const { activeProfile } = useAuth();
  return <InquiryDetailsContent key={activeProfile?.id ?? 'no-profile'} />;
}
