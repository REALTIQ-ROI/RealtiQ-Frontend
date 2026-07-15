import { Link, useParams } from 'react-router-dom';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import MediaPreview from '../../../components/property/MediaPreview';
import TitleVerificationBadge from '../../../components/title/TitleVerificationBadge';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import { useAsync } from '../../../hooks/useAsync';
import { inquiryService } from '../../../services/inquiryService';
import { paymentService } from '../../../services/paymentService';
import { resolveOwnerId } from '../../../types';

const formatRelativeDate = (date?: string) => {
  if (!date) return 'Recently';
  const delta = Date.now() - new Date(date).getTime();
  const hours = Math.max(1, Math.round(delta / (1000 * 60 * 60)));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.max(1, Math.round(hours / 24))}d ago`;
};

const LandlordPropertyDetails = () => {
  const { user } = useAuth();
  const { properties } = useProperties();
  const { id } = useParams<{ id: string }>();
  const { data: inquiries } = useAsync(() => inquiryService.getInquiries(), true);
  const { data: payments } = useAsync(() => paymentService.getPayments(), true);

  const property = id
    ? (properties.find((item) => item._id === id) ?? null)
    : (properties.find((item) => resolveOwnerId(item.ownerId) === user?._id) ?? null);

  const relatedInquiries = (inquiries ?? []).filter((item) => {
    const propertyRef = item.property;
    if (typeof propertyRef === 'string') {
      return propertyRef === property?._id;
    }
    return propertyRef._id === property?._id;
  });

  const relatedPayments = (payments ?? []).filter((item) => item.property._id === property?._id);
  const heroMedia = property?.media?.[0];
  const latestInquiry = [...relatedInquiries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;

  return (
    <LandlordPortalLayout
      active="my-properties"
      title="Property Details"
      topLeft={
        <div className="flex items-center gap-4">
          <Link to="/dashboard/landlord/my-properties" className="text-slate-400 hover:text-slate-900 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Property Details</h2>
        </div>
      }
    >
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black tracking-widest uppercase rounded-full">
                {property?.status === 'available' ? 'Active' : property?.status ?? 'Not Found'}
              </span>
              <span className="text-secondary text-sm font-medium">Live API data</span>
              <TitleVerificationBadge summary={property?.titleVerification} context="owner" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tighter text-slate-900 mb-2">
              {property?.title ?? 'Property not found'}
            </h1>
            <p className="text-secondary font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">location_on</span>
              {property?.location ?? 'Select a property from your portfolio'}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link
              to={property ? `/properties/${property._id}` : '/properties'}
              className="px-6 py-3 bg-white border-2 border-slate-100 text-slate-900 font-bold rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">visibility</span>
              Preview Listing
            </Link>
            <Link
              to={property ? `/dashboard/landlord/edit-property/${property._id}` : '/dashboard/landlord/my-properties'}
              className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
              Quick Edit
            </Link>
            <Link
              to={property ? `/dashboard/landlord/title-verifications?propertyId=${property._id}` : '/dashboard/landlord/title-verifications'}
              className="px-6 py-3 bg-surface-container-high text-slate-900 font-bold rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">verified</span>
              Verify Title
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-xl flex flex-col justify-between min-h-[200px]">
            <div className="flex justify-between items-start">
              <p className="text-secondary text-xs font-bold uppercase tracking-wider">Total Views</p>
              <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded">
                {property?.views ? `+${property.views}` : 'No view data'}
              </span>
            </div>
            <div>
              <p className="text-5xl font-black text-slate-900 tracking-tighter">{property?.views ?? 0}</p>
              <p className="text-slate-400 text-sm mt-2">From the live property API</p>
            </div>
          </div>
          <div className="bg-white p-8 rounded-xl flex flex-col justify-between">
            <p className="text-secondary text-xs font-bold uppercase tracking-wider">Inquiries</p>
            <div>
              <p className="text-4xl font-black text-slate-900 tracking-tighter">{relatedInquiries.length}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {relatedInquiries.slice(0, 3).map((item) => (
                  <span key={item._id} className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-600">
                    {item.status}
                  </span>
                ))}
                {relatedInquiries.length === 0 ? <span className="text-xs text-secondary">No inquiries yet</span> : null}
              </div>
            </div>
          </div>
          <div className="bg-primary-container p-8 rounded-xl flex flex-col justify-between text-white">
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Payments</p>
            <div>
              <p className="text-4xl font-black text-white tracking-tighter">{relatedPayments.length}</p>
              <p className="text-white/40 text-xs mt-2">Latest activity: {formatRelativeDate(relatedPayments[0]?.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8">
            <div className="relative rounded-xl overflow-hidden aspect-[16/9] mb-8 bg-slate-100 group">
              <MediaPreview media={heroMedia} alt={property?.title ?? 'Property'} className="w-full h-full object-cover" controls />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                <span className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest">
                  Manage Gallery ({property?.media?.length ?? 0} Photos)
                </span>
              </div>
            </div>

            <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
              <div className="bg-surface-container-low p-6 rounded-xl">
                <span className="material-symbols-outlined text-slate-400 mb-2">bed</span>
                <p className="text-slate-900 font-bold">{property?.bedrooms ?? 0} Bedrooms</p>
                <p className="text-slate-500 text-xs">Live listing data</p>
              </div>
              <div className="bg-surface-container-low p-6 rounded-xl">
                <span className="material-symbols-outlined text-slate-400 mb-2">bathtub</span>
                <p className="text-slate-900 font-bold">{property?.bathrooms ?? 0} Bathrooms</p>
                <p className="text-slate-500 text-xs">Live listing data</p>
              </div>
              <div className="bg-surface-container-low p-6 rounded-xl">
                <span className="material-symbols-outlined text-slate-400 mb-2">square_foot</span>
                <p className="text-slate-900 font-bold">{property?.squareFeet?.toLocaleString() ?? 0} sq.ft</p>
                <p className="text-slate-500 text-xs">Live listing data</p>
              </div>
            </div>

            <div className="prose prose-slate max-w-none">
              <p className="text-secondary leading-relaxed text-lg mb-6">
                {property?.description ?? 'No description has been published for this property.'}
              </p>

              {property?.amenities && property.amenities.length > 0 ? (
                <div className="mb-8">
                  <h4 className="text-slate-900 font-bold text-xl mb-4">Amenities</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {property.amenities.map((amenity) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-2 text-sm text-secondary bg-surface-container-low rounded-lg px-4 py-3"
                      >
                        <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-8">
              <div className="bg-white rounded-xl p-8 border border-slate-100 shadow-sm">
                <p className="text-secondary text-xs font-bold uppercase tracking-wider mb-2">Market Valuation</p>
                <div className="flex items-baseline gap-2 mb-6">
                  <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{property?.price?.toLocaleString() ?? '0'}</h3>
                  <span className="text-slate-400 text-sm font-medium">NGN</span>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center py-3 border-b border-slate-50">
                    <span className="text-slate-500 text-sm">Listing Status</span>
                    <span className="text-slate-900 font-bold capitalize">{property?.status ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-slate-50">
                    <span className="text-slate-500 text-sm">Saves</span>
                    <span className="text-slate-900 font-bold">{property?.saves ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-slate-500 text-sm">Latest Inquiry</span>
                    <span className="text-green-600 font-bold">{latestInquiry ? latestInquiry.status : 'None'}</span>
                  </div>
                </div>
                <Link
                  to={property ? `/dashboard/landlord/edit-property/${property._id}` : '/dashboard/landlord/my-properties'}
                  className="block w-full bg-primary text-white font-black py-4 rounded-lg hover:opacity-90 transition-all text-center mb-4"
                >
                  Update Financials
                </Link>
                <button className="w-full bg-slate-50 text-slate-600 font-bold py-4 rounded-lg hover:bg-slate-100 transition-all" onClick={() => window.print()} type="button">
                  Download PDF Report
                </button>
              </div>

              <div className="bg-surface-container-low rounded-xl p-8">
                <h4 className="text-slate-900 font-bold mb-6">Related Inquiries</h4>
                <div className="flex flex-col gap-4">
                  {relatedInquiries.length > 0 ? (
                    relatedInquiries.slice(0, 3).map((item) => (
                      <Link
                        key={item._id}
                        to={`/dashboard/landlord/inquiry-details/${item._id}`}
                        className="p-4 bg-white rounded-lg hover:border-slate-200 transition-all border border-transparent"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-900">{item.fullName}</p>
                            <p className="text-xs text-slate-500">{item.inquiryType}</p>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">{item.status}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">{formatRelativeDate(item.createdAt)}</p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-secondary">No related inquiries available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LandlordPortalLayout>
  );
};

export default LandlordPropertyDetails;
