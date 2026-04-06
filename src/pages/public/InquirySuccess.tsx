import PublicLayout from '../../components/layout/PublicLayout';
import PageNotice from '../../components/ui/PageNotice';

const InquirySuccess = () => {
  return (
    <PublicLayout>
      <PageNotice
        title="Inquiry Sent"
        description="Your inquiry has been sent successfully. Our team will reach out shortly."
        actionLabel="Back to Listings"
        actionTo="/properties"
      />
    </PublicLayout>
  );
};

export default InquirySuccess;