import DashboardLayout from '../../../components/layout/DashboardLayout';
import Button from '../../../components/ui/Button';
import { useAsync } from '../../../hooks/useAsync';
import { inquiryService } from '../../../services/inquiryService';

const ManageInquiries = () => {
  const { data, execute } = useAsync(() => inquiryService.getInquiries(), true);

  return (
    <DashboardLayout>
      <section>
        <h1 className="text-3xl font-extrabold">Manage Inquiries</h1>
        <div className="mt-6 space-y-3">
          {(data ?? []).map((inquiry) => (
            <article key={inquiry.id} className="rounded-xl border border-outline-variant/20 p-4">
              <p className="font-semibold">{inquiry.fullName} • {inquiry.email}</p>
              <p className="text-sm mt-1">{inquiry.message}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs uppercase">{inquiry.status}</span>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await inquiryService.updateInquiryStatus(inquiry.id, inquiry.status === 'open' ? 'closed' : 'open');
                    await execute();
                  }}
                >
                  Toggle Status
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
};

export default ManageInquiries;