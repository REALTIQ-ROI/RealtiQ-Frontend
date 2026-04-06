import DashboardLayout from '../../../components/layout/DashboardLayout';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import { inquiryService } from '../../../services/inquiryService';

const InquiriesList = () => {
  const { user } = useAuth();
  const { data, execute } = useAsync(() => inquiryService.getInquiries(), true);
  const inquiries = (data ?? []).filter((item) => item.ownerId === user?._id);

  return (
    <DashboardLayout>
      <section>
        <h1 className="text-3xl font-extrabold">Inquiries</h1>
        <div className="mt-6 space-y-3">
          {inquiries.map((item) => (
            <article key={item.id} className="rounded-xl border border-outline-variant/20 p-4">
              <p className="font-semibold">{item.fullName}</p>
              <p className="text-sm text-secondary">{item.email}</p>
              <p className="mt-2 text-sm">{item.message}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide">{item.status}</span>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await inquiryService.updateInquiryStatus(item.id, item.status === 'open' ? 'closed' : 'open');
                    await execute();
                  }}
                >
                  Toggle Status
                </Button>
              </div>
            </article>
          ))}
          {!inquiries.length ? <p className="text-secondary">No inquiries yet.</p> : null}
        </div>
      </section>
    </DashboardLayout>
  );
};

export default InquiriesList;