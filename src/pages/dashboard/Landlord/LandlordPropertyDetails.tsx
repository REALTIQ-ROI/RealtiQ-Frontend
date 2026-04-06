import { Link } from 'react-router-dom';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';

const LandlordPropertyDetails = () => {
  const { user } = useAuth();
  const { properties } = useProperties();
  const property = properties.find((item) => item.ownerId === user?._id) ?? null;

  return (
    <LandlordPortalLayout
      active="my-properties"
      title="Property Details View"
      topLeft={
        <div className="flex items-center gap-4">
          <Link to="/dashboard/landlord/my-properties" className="text-slate-400 hover:text-slate-900 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Property Details View</h2>
        </div>
      }
    >
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black tracking-widest uppercase rounded-full">
                {property?.status ?? 'Active'}
              </span>
              <span className="text-secondary text-sm font-medium">Listed recently</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tighter text-slate-900 mb-2">{property?.title ?? 'The Glass Pavilion'}</h1>
            <p className="text-secondary font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">location_on</span>
              {property?.location ?? 'Beverly Hills, CA'}
            </p>
          </div>
          <div className="flex gap-3">
            <button className="px-6 py-3 bg-white border-2 border-slate-100 text-slate-900 font-bold rounded-lg">Preview Listing</button>
            <Link to="/dashboard/landlord/edit-property" className="px-6 py-3 bg-primary text-white font-bold rounded-lg">
              Quick Edit
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-xl min-h-[200px]">
            <p className="text-secondary text-xs font-bold uppercase tracking-wider">Total Views</p>
            <p className="text-5xl font-black text-slate-900 tracking-tighter">4,829</p>
          </div>
          <div className="bg-white p-8 rounded-xl">
            <p className="text-secondary text-xs font-bold uppercase tracking-wider">Inquiries</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">42</p>
          </div>
          <div className="bg-primary-container p-8 rounded-xl">
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Avg. Time to Close</p>
            <p className="text-4xl font-black text-white tracking-tighter">18d</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8">
            <div className="relative rounded-xl overflow-hidden aspect-[16/9] mb-8 bg-slate-100" />
            <div className="grid grid-cols-3 gap-6 mb-12">
              <div className="bg-surface-container-low p-6 rounded-xl">
                <p className="text-slate-900 font-bold">{property?.bedrooms ?? 5} Bedrooms</p>
              </div>
              <div className="bg-surface-container-low p-6 rounded-xl">
                <p className="text-slate-900 font-bold">{property?.bathrooms ?? 4.5} Bathrooms</p>
              </div>
              <div className="bg-surface-container-low p-6 rounded-xl">
                <p className="text-slate-900 font-bold">{property?.squareFeet ?? 4200} sq.ft</p>
              </div>
            </div>
            <p className="text-secondary leading-relaxed text-lg mb-6">{property?.description ?? 'Architectural showcase with premium finishes.'}</p>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-8">
              <div className="bg-white rounded-xl p-8 border border-slate-100 shadow-sm">
                <p className="text-secondary text-xs font-bold uppercase tracking-wider mb-2">Market Valuation</p>
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter mb-6">${property?.price?.toLocaleString() ?? '8,450,000'}</h3>
                <button className="w-full bg-primary text-white font-black py-4 rounded-lg">Update Financials</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LandlordPortalLayout>
  );
};

export default LandlordPropertyDetails;
