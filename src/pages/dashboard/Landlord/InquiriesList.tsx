import { Link } from 'react-router-dom';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import { inquiryService } from '../../../services/inquiryService';

const InquiriesList = () => {
  const { user } = useAuth();
  const { data } = useAsync(() => inquiryService.getInquiries(), true);
  const inquiries = (data ?? []).filter((item) => item.ownerId === user?._id);

  return (
    <LandlordPortalLayout active="inquiries" title="Inquiries">
      <div className="p-10 flex flex-col gap-10">
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2 bg-primary-container p-8 rounded-xl">
            <span className="text-on-primary-container text-xs font-bold tracking-widest uppercase mb-2 block">Total Inquiries</span>
            <h2 className="text-4xl font-extrabold text-white tracking-tighter">{inquiries.length}</h2>
          </div>
          <div className="bg-surface-container-low p-8 rounded-xl">
            <span className="text-secondary text-xs font-bold tracking-widest uppercase mb-1">Response Rate</span>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">94%</h3>
          </div>
          <div className="bg-surface-container-low p-8 rounded-xl">
            <span className="text-secondary text-xs font-bold tracking-widest uppercase mb-1">Avg. Response Time</span>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">2.4 hrs</h3>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="bg-surface-container-low rounded-xl overflow-hidden p-1">
            <div className="bg-surface-container-lowest rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">Property Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">Inquirer</th>
                    <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">Date Received</th>
                    <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inquiries.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5 text-sm font-bold text-slate-900">{item.propertyId}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900">{item.fullName}</span>
                          <span className="text-xs text-secondary">{item.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-secondary">{new Date(item.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary-fixed text-on-secondary-fixed">
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link to="/dashboard/landlord/inquiry-details" className="text-primary font-bold text-sm hover:underline">
                          View Message
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </LandlordPortalLayout>
  );
};

export default InquiriesList;
