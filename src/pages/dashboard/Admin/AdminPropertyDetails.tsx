import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import MediaPreview from '../../../components/property/MediaPreview';
import TitleVerificationBadge from '../../../components/title/TitleVerificationBadge';
import TitleDocumentManagement from '../../../components/title/TitleDocumentManagement';
import { useProperties } from '../../../contexts/PropertiesContext';
import { propertyDisplayReference, propertyRouteReference, resolvePropertyOwnerId } from '../../../types';

// const sparkHeights = ['50%', '66%', '100%', '75%', '66%', '80%', '83%'];

const AdminPropertyDetails = () => {
  const { properties, updateProperty } = useProperties();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [adminNote, setAdminNote] = useState('');

  const propertyId = id ?? (location.state as { propertyId?: string } | null)?.propertyId;
  const property = propertyId
    ? properties.find((p) => p._id === propertyId || propertyRouteReference(p) === propertyId) ?? null
    : properties[0];

  if (!property) {
    return (
      <AdminLayout>
        <div className="pt-24 px-12 text-secondary">No property found.</div>
      </AdminLayout>
    );
  }

  const images = property.media?.filter((m) => m.type === 'image') ?? [];
  const propertyReference = propertyRouteReference(property);
  const owner = property.owner ?? (typeof property.ownerId !== 'string' ? property.ownerId : null);
  const ownerId = resolvePropertyOwnerId(property);
  const ownerName = owner?.name || 'Owner unavailable';
  const ownerInitials = (owner?.name || owner?.email || ownerId || 'NA')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'NA';

  return (
    <AdminLayout>
      <div className="min-h-screen px-4 pb-12 pt-6 sm:px-8 lg:px-12 lg:pb-20 lg:pt-8">
        {/* Header Actions */}
        <div className="flex items-start justify-between mb-12">
          <div>
            <nav className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-secondary mb-3">
              <button onClick={() => void navigate('/dashboard/admin/manage-properties')} className="hover:text-primary transition-colors">
                Properties
              </button>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-primary">Listing Details</span>
            </nav>
            <h1 className="text-4xl font-extrabold tracking-tighter text-primary font-headline">{property.title}</h1>
            <p className="text-secondary mt-2 flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-sm">location_on</span>
              {property.location}
            </p>
            <div className="mt-3"><TitleVerificationBadge summary={property.titleVerification} context="admin" /></div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-surface-container-low p-1 rounded-lg">
              <button
                onClick={() => void updateProperty(propertyReference, { featured: !property.featured })}
                disabled={!propertyReference}
                className="px-4 py-2 text-sm font-semibold rounded-md transition-all bg-white text-primary shadow-sm flex items-center gap-2"
              >
                <span
                  className="material-symbols-outlined text-sm"
                  style={property.featured ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  star
                </span>
                {property.featured ? 'Unfeature' : 'Mark as Featured'}
              </button>
            </div>
            <button
              onClick={() => void navigate('/dashboard/admin/manage-properties')}
              className="bg-primary text-on-primary px-6 py-3 rounded-md font-bold text-sm tracking-tight flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Listings
            </button>
            <button
              onClick={() => void navigate('/dashboard/admin/title-verifications')}
              className="bg-surface-container-high text-on-surface px-6 py-3 rounded-md font-bold text-sm tracking-tight flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">verified</span>
              Title Review
            </button>
            <button className="p-3 bg-surface-container-low text-secondary rounded-md hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-12 gap-8">
          {/* Gallery & Description – Left */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            {/* Gallery */}
            <div className="grid h-[300px] grid-cols-1 gap-4 sm:h-[420px] sm:grid-cols-3 sm:grid-rows-2 lg:h-[500px]">
              {/* Main image */}
              <div className="overflow-hidden rounded-xl bg-surface-container-low relative group sm:col-span-2 sm:row-span-2">
                <MediaPreview
                  media={images[0]}
                  alt={property.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  controls
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-6 left-6 text-white">
                  <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    Main Elevation
                  </span>
                </div>
              </div>
              {/* Second image */}
              <div className="hidden overflow-hidden rounded-xl bg-surface-container-low relative group sm:block">
                <MediaPreview
                  media={images[1]}
                  alt={`${property.title} interior`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              {/* Third image */}
              <div className="hidden overflow-hidden rounded-xl bg-surface-container-low relative group sm:block">
                <MediaPreview
                  media={images[2]}
                  alt={`${property.title} detail`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>

            {/* Description Card */}
            <div className="bg-surface-container-lowest p-8 rounded-xl" style={{ boxShadow: '0 20px 40px rgba(25,28,30,0.04)' }}>
              <h3 className="text-xl font-bold mb-6 tracking-tight font-headline">Property Description</h3>
              <p className="text-secondary leading-relaxed mb-6 text-sm">
                {property.description || 'No description provided for this listing.'}
              </p>
              <div className="grid grid-cols-2 gap-4 border-t border-surface-container-high/50 pt-6 sm:grid-cols-4 sm:gap-6">
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">Status</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      property.status === 'available'
                        ? 'bg-secondary-container text-on-secondary-fixed'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {property.status === 'available' ? 'Active' : 'Sold'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">Type</span>
                  <span className="text-primary font-bold text-sm">{property.propertyType}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">Sq. Ft</span>
                  <span className="text-primary font-bold text-sm">
                    {property.squareFeet ? property.squareFeet.toLocaleString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">Listing ID</span>
                  <span className="text-primary font-bold text-sm">
                    {property._id ? `RTQ-${property._id.slice(-6).toUpperCase()}` : propertyDisplayReference(property)}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Notes */}
            <div className="bg-surface-container-low p-8 rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold tracking-tight flex items-center gap-2 font-headline">
                  <span className="material-symbols-outlined text-secondary">edit_note</span>
                  Administrative Notes
                </h3>
                <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">Internal Only</span>
              </div>
              <textarea
                className="w-full h-32 bg-surface-container-lowest border-none rounded-lg p-4 text-sm focus:ring-2 focus:ring-surface-tint/20 placeholder:text-secondary/50 mb-4 resize-none"
                placeholder="Add notes about property access, seller requirements, or internal updates..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
              {adminNote && (
                <div className="space-y-4">
                  <div className="flex gap-4 p-4 bg-white/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-on-secondary-fixed">AD</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-primary">Admin</span>
                        <span className="text-[10px] text-secondary">just now</span>
                      </div>
                      <p className="text-sm text-secondary">{adminNote}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar – Right */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            {/* Financial Overview */}
            <div className="bg-primary-container p-8 rounded-xl text-white">
              <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold mb-2 block">Listing Price</span>
              <h2 className="text-4xl font-extrabold tracking-tighter mb-8 font-headline">
                ₦{property.price.toLocaleString()}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded-lg">
                  <span className="block text-[10px] opacity-70 mb-1">Bedrooms</span>
                  <span className="font-bold">{property.bedrooms}</span>
                </div>
                <div className="bg-white/10 p-4 rounded-lg">
                  <span className="block text-[10px] opacity-70 mb-1">Bathrooms</span>
                  <span className="font-bold">{property.bathrooms}</span>
                </div>
              </div>
            </div>

            {/* Analytics Card */}
            <div className="bg-surface-container-lowest p-8 rounded-xl" style={{ boxShadow: '0 20px 40px rgba(25,28,30,0.04)' }}>
              <h3 className="text-lg font-bold mb-6 tracking-tight font-headline">Market Performance</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary-container rounded-lg">
                      <span className="material-symbols-outlined text-on-secondary-fixed">visibility</span>
                    </div>
                    <div>
                      <span className="block text-xs text-secondary">Total Views</span>
                      <span className="font-bold text-lg">—</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-tertiary-fixed rounded-lg">
                      <span className="material-symbols-outlined text-on-tertiary-fixed">mail</span>
                    </div>
                    <div>
                      <span className="block text-xs text-secondary">Inquiries</span>
                      <span className="font-bold text-lg">—</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Live</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-fixed rounded-lg">
                      <span className="material-symbols-outlined text-on-primary-fixed">calendar_month</span>
                    </div>
                    <div>
                      <span className="block text-xs text-secondary">Listed</span>
                      <span className="font-bold text-base">
                        {property.createdAt ? new Date(property.createdAt).toLocaleDateString() : '—'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-on-primary-fixed-variant bg-surface-container px-2 py-1 rounded">
                    {property.status === 'available' ? 'Active' : 'Closed'}
                  </span>
                </div>
              </div>

              {/* Sparkline */}
              {/* <div className="mt-8 pt-8 border-t border-surface-container-high/50">
                <span className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-4 block">7-Day Traffic</span>
                <div className="flex items-end gap-1.5 h-16">
                  {sparkHeights.map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t ${i === 2 || i === 3 || i === 6 ? 'bg-primary' : 'bg-surface-container-high'}`}
                      style={{ height: h }}
                    />
                  ))}
                </div>
              </div> */}
            </div>

            {/* Owner Contact Card */}
            <div className="bg-surface-container-low p-6 rounded-xl">
              <h3 className="text-sm font-bold mb-4 tracking-tight uppercase text-secondary">Property Owner</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-fixed font-bold">
                  {ownerInitials}
                </div>
                <div>
                  <span className="block font-bold text-primary">
                    {ownerName}
                  </span>
                  <span className="text-xs text-secondary">
                    {owner?.email || (ownerId ? `...${ownerId.slice(-10)}` : 'Unknown')}
                  </span>
                  {owner?.phone ? <span className="mt-1 block text-xs text-secondary">{owner.phone}</span> : null}
                </div>
              </div>
              <div className="space-y-3">
                <button className="w-full py-2 bg-white rounded-lg text-sm font-semibold border border-outline-variant/20 hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">call</span>
                  Contact Owner
                </button>
                <button className="w-full py-2 bg-white rounded-lg text-sm font-semibold border border-outline-variant/20 hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">mail</span>
                  Message Portal
                </button>
              </div>
            </div>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="bg-surface-container-lowest p-6 rounded-xl">
                <h3 className="text-sm font-bold mb-4 tracking-tight uppercase text-secondary">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((a) => (
                    <span
                      key={a}
                      className="px-3 py-1 bg-surface-container-low rounded-full text-xs font-semibold text-on-surface-variant"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <TitleDocumentManagement propertyId={propertyReference} sold={property.status === 'sold'} />
      </div>
    </AdminLayout>
  );
};

export default AdminPropertyDetails;
