import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import { inquiryService } from '../../../services/inquiryService';

const InquiryDetails = () => {
  const { user } = useAuth();
  const { data } = useAsync(() => inquiryService.getInquiries(), true);
  const inquiry = (data ?? []).find((item) => item.userId === user?._id) ?? null;

  return (
    <DashboardLayout>
      <section className="space-y-4">
        <h1 className="text-3xl font-extrabold">Inquiry Details</h1>
        {inquiry ? (
          <div className="rounded-xl border border-outline-variant/20 p-5 space-y-2">
            <p><strong>Type:</strong> {inquiry.inquiryType}</p>
            <p><strong>Status:</strong> {inquiry.status}</p>
            <p><strong>Email:</strong> {inquiry.email}</p>
            <p><strong>Message:</strong> {inquiry.message}</p>
          </div>
        ) : (
          <p className="text-secondary">No inquiry found.</p>
        )}
      </section>
    </DashboardLayout>
  );
};

export default InquiryDetails;