import { useState, type FormEvent } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import type { CreateInquiryPayload } from '../../types';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

interface InquiryFormProps {
  propertyId?: string;
  propertyIds?: string[];
  onSubmitInquiry: (payload: CreateInquiryPayload) => Promise<unknown>;
  allowLeadUpdatesOptIn?: boolean;
  allowComparisonContextOptIn?: boolean;
}

const InquiryForm = ({ propertyId, propertyIds, onSubmitInquiry, allowLeadUpdatesOptIn = false, allowComparisonContextOptIn = false }: InquiryFormProps) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [inquiryType, setInquiryType] = useState('Schedule a Private Viewing');
  const [message, setMessage] = useState('');
  const [leadUpdatesOptIn, setLeadUpdatesOptIn] = useState(false);
  const [comparisonContextOptIn, setComparisonContextOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!propertyId && !propertyIds?.length) {
      setError('Please select a property before sending an inquiry.');
      return;
    }

    if (!fullName.trim() || !email.trim() || !inquiryType.trim() || !message.trim()) {
      setError('Please complete all inquiry fields.');
      return;
    }

    if (message.trim().length < 20) {
      setError('Message must be at least 20 characters.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await onSubmitInquiry({
        ...(propertyIds?.length ? { propertyIds } : { propertyId: propertyId! }),
        fullName: fullName.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        message: message.trim(),
        inquiryType,
        ...(allowLeadUpdatesOptIn ? { leadUpdatesOptIn } : {}),
        ...(allowComparisonContextOptIn ? { comparisonContextOptIn } : {}),
      });
      setFullName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setLeadUpdatesOptIn(false);
      setComparisonContextOptIn(false);
    } catch (raw) {
      setError(apiErrorMessage(raw, 'Unable to send inquiry right now.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="inquiryType" className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wide">
          Inquiry Type
        </label>
        <select
          id="inquiryType"
          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg py-3 px-4 text-sm"
          value={inquiryType}
          onChange={(event) => setInquiryType(event.target.value)}
        >
          <option>Schedule a Private Viewing</option>
          <option>Request Digital Brochure</option>
          <option>General Inquiry</option>
        </select>
      </div>

      <Input placeholder="Full Name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
      <Input type="email" placeholder="Email Address" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Input type="tel" placeholder="Phone Number (optional)" value={phone} onChange={(event) => setPhone(event.target.value)} />

      <textarea
        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg py-3 px-4 text-sm"
        placeholder="Your Message"
        rows={4}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        required
      />

      {allowLeadUpdatesOptIn ? <label className="flex items-start gap-2 text-sm text-secondary"><input type="checkbox" checked={leadUpdatesOptIn} onChange={(event) => setLeadUpdatesOptIn(event.target.checked)} className="mt-1" /><span>Send me occasional REALTIQ updates about this property. I can change this choice later from my inquiry details.</span></label> : null}
      {allowComparisonContextOptIn ? <label className="flex items-start gap-2 text-sm text-secondary"><input type="checkbox" checked={comparisonContextOptIn} onChange={(event) => setComparisonContextOptIn(event.target.checked)} className="mt-1" /><span>Tell the seller I found this listing while comparing properties. This is separate from marketing updates and shares no other listing IDs.</span></label> : null}

      {error ? <p className="text-error text-sm">{error}</p> : null}

      <Button fullWidth type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Inquiry'}
      </Button>
    </form>
  );
};

export default InquiryForm;
