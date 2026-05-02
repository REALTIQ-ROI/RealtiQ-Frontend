import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import PublicLayout from '../../components/layout/PublicLayout';
import InquiryFormComponent from '../../components/forms/InquiryForm';
import { inquiryService } from '../../services/inquiryService';
import type { CreateInquiryPayload } from '../../types';

const InquiryForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('propertyId') ?? '';

  const submitInquiry = async (payload: CreateInquiryPayload) => {
    await inquiryService.createInquiry(payload);
    toast.success('Inquiry submitted successfully');
    void navigate('/inquiry-success');
  };

  return (
    <PublicLayout>
      <section className="max-w-xl mx-auto px-8 py-10">
        <h1 className="text-4xl font-headline font-extrabold mb-4">Property Inquiry</h1>
        <p className="text-secondary mb-6">Send us your details and we will contact you shortly.</p>
        <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-6">
          <InquiryFormComponent propertyId={propertyId} onSubmitInquiry={submitInquiry} />
        </div>
      </section>
    </PublicLayout>
  );
};

export default InquiryForm;
