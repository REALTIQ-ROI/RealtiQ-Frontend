import { Link, useParams } from 'react-router-dom';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';

const LandlordPropertyDetails = () => {
  const { user } = useAuth();
  const { properties } = useProperties();
  const { id } = useParams<{ id: string }>();

  const property = id
    ? (properties.find((item) => item._id === id) ?? null)
    : (properties.find((item) => item.ownerId === user?._id) ?? null);

  const heroImage = property?.media?.[0]?.url;

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
      topRight={
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <span className="material-symbols-outlined text-slate-500 hover:text-slate-900 cursor-pointer transition-colors">
              notifications
            </span>
            <span className="material-symbols-outlined text-slate-500 hover:text-slate-900 cursor-pointer transition-colors">
              settings
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-300 border border-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
            {user?.name?.charAt(0) ?? 'M'}
          </div>
        </div>
      }
    >
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black tracking-widest uppercase rounded-full">
                {property?.status === 'available' ? 'Active' : property?.status ?? 'Active'}
              </span>
              <span className="text-secondary text-sm font-medium">Listed recently</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tighter text-slate-900 mb-2">
              {property?.title ?? 'The Glass Pavilion'}
            </h1>
            <p className="text-secondary font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">location_on</span>
              {property?.location ?? '882 Modernist Way, Beverly Hills, CA 90210'}
            </p>
          </div>
          <div className="flex gap-3">
            <button className="px-6 py-3 bg-white border-2 border-slate-100 text-slate-900 font-bold rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">visibility</span>
              Preview Listing
            </button>
            <Link
              to={`/dashboard/landlord/edit-property/${property?._id ?? ''}`}
              className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
              Quick Edit
            </Link>
          </div>
        </div>

        {/* Bento Grid Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-xl flex flex-col justify-between min-h-[200px]">
            <div className="flex justify-between items-start">
              <p className="text-secondary text-xs font-bold uppercase tracking-wider">Total Views</p>
              <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded">+12% this week</span>
            </div>
            <div>
              <p className="text-5xl font-black text-slate-900 tracking-tighter">4,829</p>
              <p className="text-slate-400 text-sm mt-2">Across all integrated platforms</p>
            </div>
          </div>
          <div className="bg-white p-8 rounded-xl flex flex-col justify-between">
            <p className="text-secondary text-xs font-bold uppercase tracking-wider">Inquiries</p>
            <div>
              <p className="text-4xl font-black text-slate-900 tracking-tighter">42</p>
              <div className="mt-4 flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                  JD
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                  MT
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                  BW
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                  +39
                </div>
              </div>
            </div>
          </div>
          <div className="bg-primary-container p-8 rounded-xl flex flex-col justify-between">
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Avg. Time to Close</p>
            <div>
              <p className="text-4xl font-black text-white tracking-tighter">18d</p>
              <p className="text-white/40 text-xs mt-2">4 days faster than area avg</p>
            </div>
          </div>
        </div>

        {/* Editorial Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-8">
            {/* Hero Image */}
            <div className="relative rounded-xl overflow-hidden aspect-[16/9] mb-8 bg-slate-100 group">
              {heroImage ? (
                <img alt={property?.title} className="w-full h-full object-cover" src={heroImage} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <span className="material-symbols-outlined text-6xl">domain</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                <button className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest">
                  Manage Gallery ({property?.media?.length ?? 0} Photos)
                </button>
              </div>
            </div>

            {/* Specs */}
            <div className="grid grid-cols-3 gap-6 mb-12">
              <div className="bg-surface-container-low p-6 rounded-xl">
                <span className="material-symbols-outlined text-slate-400 mb-2">bed</span>
                <p className="text-slate-900 font-bold">{property?.bedrooms ?? 5} Bedrooms</p>
                <p className="text-slate-500 text-xs">Primary suite with terrace</p>
              </div>
              <div className="bg-surface-container-low p-6 rounded-xl">
                <span className="material-symbols-outlined text-slate-400 mb-2">bathtub</span>
                <p className="text-slate-900 font-bold">{property?.bathrooms ?? 4.5} Bathrooms</p>
                <p className="text-slate-500 text-xs">Marble finishings</p>
              </div>
              <div className="bg-surface-container-low p-6 rounded-xl">
                <span className="material-symbols-outlined text-slate-400 mb-2">square_foot</span>
                <p className="text-slate-900 font-bold">{property?.squareFeet ?? 4200} sq.ft</p>
                <p className="text-slate-500 text-xs">Open floor plan</p>
              </div>
            </div>

            {/* Description */}
            <div className="prose prose-slate max-w-none">
              <p className="text-secondary leading-relaxed text-lg mb-6">
                {property?.description ??
                  'An architectural masterpiece defined by its seamless integration with the surrounding landscape. Featuring floor-to-ceiling glass walls, the residence offers panoramic views of the canyons. The interior boasts European oak flooring, a chef\'s kitchen with Gaggenau appliances, and a private wellness wing.'}
              </p>
              <h4 className="text-slate-900 font-bold text-xl mb-4">Investment Highlights</h4>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-secondary">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Currently generating ${((property?.price ?? 18500)).toLocaleString()}/mo in lease revenue
                </li>
                <li className="flex items-center gap-3 text-secondary">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Zoning approved for secondary ADU construction
                </li>
                <li className="flex items-center gap-3 text-secondary">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  98% occupancy rate over the last 36 months
                </li>
              </ul>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-8">
              {/* Pricing Card */}
              <div className="bg-white rounded-xl p-8 border border-slate-100 shadow-sm">
                <p className="text-secondary text-xs font-bold uppercase tracking-wider mb-2">Market Valuation</p>
                <div className="flex items-baseline gap-2 mb-6">
                  <h3 className="text-4xl font-black text-slate-900 tracking-tighter">
                    ${property?.price?.toLocaleString() ?? '8,450,000'}
                  </h3>
                  <span className="text-slate-400 text-sm font-medium">USD</span>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center py-3 border-b border-slate-50">
                    <span className="text-slate-500 text-sm">Monthly Revenue</span>
                    <span className="text-slate-900 font-bold">${((property?.price ?? 18500)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-slate-50">
                    <span className="text-slate-500 text-sm">Property Taxes (Annual)</span>
                    <span className="text-slate-900 font-bold">$105,625</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-slate-500 text-sm">Net Yield</span>
                    <span className="text-green-600 font-bold">4.2%</span>
                  </div>
                </div>
                <button className="w-full bg-primary text-white font-black py-4 rounded-lg hover:opacity-90 transition-all mb-4">
                  Update Financials
                </button>
                <button className="w-full bg-slate-50 text-slate-600 font-bold py-4 rounded-lg hover:bg-slate-100 transition-all">
                  Download PDF Report
                </button>
              </div>

              {/* Listing Status */}
              <div className="bg-surface-container-low rounded-xl p-8">
                <h4 className="text-slate-900 font-bold mb-6">Listing Status</h4>
                <div className="flex flex-col gap-4">
                  <label className="flex items-center justify-between p-4 bg-white rounded-lg cursor-pointer border border-transparent hover:border-slate-200 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="font-bold text-slate-900">Active Listing</span>
                    </div>
                    <input
                      defaultChecked={property?.status === 'available'}
                      className="text-primary focus:ring-primary h-4 w-4"
                      name="status"
                      type="radio"
                    />
                  </label>
                  <label className="flex items-center justify-between p-4 bg-white rounded-lg cursor-pointer border border-transparent hover:border-slate-200 transition-all opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="font-bold text-slate-900">Under Contract</span>
                    </div>
                    <input className="text-primary focus:ring-primary h-4 w-4" name="status" type="radio" />
                  </label>
                  <label className="flex items-center justify-between p-4 bg-white rounded-lg cursor-pointer border border-transparent hover:border-slate-200 transition-all opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="font-bold text-slate-900">Sold / Delisted</span>
                    </div>
                    <input className="text-primary focus:ring-primary h-4 w-4" name="status" type="radio" />
                  </label>
                </div>
              </div>

              {/* Map Preview */}
              <div className="rounded-xl overflow-hidden h-48 relative group bg-slate-200 flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-400 text-4xl">map</span>
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <button className="bg-white px-4 py-2 rounded-full text-xs font-bold text-slate-900 shadow-xl">
                    View Area Analytics
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Inquiry Log */}
        <div className="mt-20">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h4 className="text-2xl font-black tracking-tighter text-slate-900">Inquiry Log</h4>
              <p className="text-slate-500 text-sm">Most recent tenant applications and view requests</p>
            </div>
            <button className="text-primary font-bold text-sm flex items-center gap-1">
              View Full CRM <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-6 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-secondary">
              <div className="col-span-4">Prospective Tenant</div>
              <div className="col-span-3">Intent</div>
              <div className="col-span-2">Date Received</div>
              <div className="col-span-2">Lead Score</div>
              <div className="col-span-1 text-right">Action</div>
            </div>
            <div className="divide-y divide-slate-50">
              <div className="grid grid-cols-12 gap-4 p-6 items-center hover:bg-slate-50/50 transition-colors">
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">
                    JD
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Julianne Devis</p>
                    <p className="text-xs text-slate-500">Corporate Relocation</p>
                  </div>
                </div>
                <div className="col-span-3">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full">Viewing Request</span>
                </div>
                <div className="col-span-2 text-sm text-slate-600">Oct 24, 2:15 PM</div>
                <div className="col-span-2">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <span key={i} className="material-symbols-outlined text-xs text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                        star
                      </span>
                    ))}
                    <span className="material-symbols-outlined text-xs text-slate-200">star</span>
                  </div>
                </div>
                <div className="col-span-1 text-right">
                  <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-900">
                    <span className="material-symbols-outlined">mail</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4 p-6 items-center hover:bg-slate-50/50 transition-colors">
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">
                    MT
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Marcus Thorne</p>
                    <p className="text-xs text-slate-500">Private Buyer</p>
                  </div>
                </div>
                <div className="col-span-3">
                  <span className="px-3 py-1 bg-purple-50 text-purple-600 text-[10px] font-bold rounded-full">Price Inquiry</span>
                </div>
                <div className="col-span-2 text-sm text-slate-600">Oct 23, 11:40 AM</div>
                <div className="col-span-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className="material-symbols-outlined text-xs text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                        star
                      </span>
                    ))}
                  </div>
                </div>
                <div className="col-span-1 text-right">
                  <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-900">
                    <span className="material-symbols-outlined">mail</span>
                  </button>
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
