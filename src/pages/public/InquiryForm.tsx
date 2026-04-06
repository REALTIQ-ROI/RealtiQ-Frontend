import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import InquiryFormComponent from '../../components/forms/InquiryForm';
import { inquiryService } from '../../services/inquiryService';

const InquiryForm = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const submitInquiry = async (payload: {
    propertyId: string;
    fullName: string;
    email: string;
    message: string;
    inquiryType: string;
  }) => {
    try {
      await inquiryService.createInquiry(payload);
      navigate('/inquiry-success');
    } catch {
      setError('Unable to submit inquiry at the moment.');
    }
  };

  return (
    <PublicLayout>
      <section className="max-w-xl mx-auto px-8 py-10">
        <h1 className="text-4xl font-headline font-extrabold mb-4">Property Inquiry</h1>
        <p className="text-secondary mb-6">Send us your details and we will contact you shortly.</p>
        {error ? <p className="text-error mb-4">{error}</p> : null}
        <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-6">
          <InquiryFormComponent propertyId="p-1" onSubmitInquiry={submitInquiry} />
        </div>
      </section>
    </PublicLayout>
  );
};

export default InquiryForm;