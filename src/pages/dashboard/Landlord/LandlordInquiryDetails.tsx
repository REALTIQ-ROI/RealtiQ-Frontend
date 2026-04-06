import { Link } from 'react-router-dom';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import { inquiryService } from '../../../services/inquiryService';

const LandlordInquiryDetails = () => {
  const { user } = useAuth();
  const { data } = useAsync(() => inquiryService.getInquiries(), true);
  const inquiry = (data ?? []).find((item) => item.ownerId === user?._id) ?? null;

  return (
    <LandlordPortalLayout
      active="inquiries"
      title="Inquiry Details"
      topLeft={
        <div className="flex items-center gap-4">
          <Link to="/dashboard/landlord/inquiries" className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Inquiry Details</h1>
        </div>
      }
    >
      <div className="p-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8 space-y-8">
            <section className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(25,28,30,0.04)]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed font-bold text-xl">JW</div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">{inquiry?.fullName ?? 'Julianna Wright'}</h2>
                    <p className="text-sm text-slate-500">Sent {inquiry ? new Date(inquiry.createdAt).toLocaleString() : '2 hours ago'}</p>
                  </div>
                </div>
                <span className="px-4 py-1.5 bg-secondary-fixed text-on-secondary-fixed text-xs font-bold rounded-full uppercase tracking-wider">{inquiry?.status ?? 'new'} Inquiry</span>
              </div>

              <div className="bg-surface-container-low p-6 rounded-xl">
                <p className="text-slate-700 leading-relaxed">{inquiry?.message ?? 'Inquiry message details.'}</p>
              </div>
            </section>

            <section className="bg-white rounded-xl p-8 border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Compose Reply</h3>
              <textarea className="w-full bg-surface-container-low border-none rounded-xl p-6" placeholder="Write your response here..." rows={6} />
              <div className="mt-4 flex justify-end">
                <button className="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold flex items-center gap-2">
                  Send Reply
                  <span className="material-symbols-outlined text-sm">send</span>
                </button>
              </div>
            </section>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-primary-container text-white rounded-xl p-8">
              <h4 className="font-bold tracking-tight mb-4">Verified Buyer Profile</h4>
              <p className="text-sm text-slate-300 leading-relaxed">Buyer intent appears high based on inquiry history and urgency.</p>
            </div>
          </div>
        </div>
      </div>
    </LandlordPortalLayout>
  );
};

export default LandlordInquiryDetails;
