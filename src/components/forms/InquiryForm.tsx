import { useState, type FormEvent } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import type { CreateInquiryPayload } from '../../types';

interface InquiryFormProps {
  propertyId: string;
  onSubmitInquiry: (payload: CreateInquiryPayload) => Promise<unknown>;
}

const InquiryForm = ({ propertyId, onSubmitInquiry }: InquiryFormProps) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [inquiryType, setInquiryType] = useState('Schedule a Private Viewing');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmitInquiry({
        propertyId,
        fullName,
        email,
        message,
        inquiryType,
      });
      setFullName('');
      setEmail('');
      setMessage('');
    } catch {
      setError('Unable to send inquiry right now.');
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

      <textarea
        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg py-3 px-4 text-sm"
        placeholder="Your Message"
        rows={4}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        required
      />

      {error ? <p className="text-error text-sm">{error}</p> : null}

      <Button fullWidth type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Inquiry'}
      </Button>
    </form>
  );
};

export default InquiryForm;