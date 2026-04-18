import { type FormEvent, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';

const Editproperty = () => {
  const { user } = useAuth();
  const { properties, updateProperty } = useProperties();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const property = useMemo(
    () => (id ? (properties.find((item) => item._id === id) ?? null) : (properties.find((item) => item.ownerId === user?._id) ?? null)),
    [properties, user, id],
  );

  const [title, setTitle] = useState(property?.title ?? 'The Glass Pavilion');
  const [propertyType, setPropertyType] = useState(property?.propertyType ?? 'Luxury Villa');
  const [price, setPrice] = useState(String(property?.price ?? 2450000));
  const [description, setDescription] = useState(
    property?.description ??
      'A masterpiece of modern minimalism, The Glass Pavilion offers 4,500 square feet of seamless indoor-outdoor living. Located in the exclusive hills of Silver Lake, it features floor-to-ceiling glass walls, an infinity-edge pool, and bespoke architectural finishes throughout. Recently renovated kitchen with Sub-Zero appliances.',
  );
  const [street, setStreet] = useState('1242 Azure Heights Road');
  const [city, setCity] = useState('Los Angeles');
  const [stateCode, setStateCode] = useState('CA');
  const [zip, setZip] = useState('90039');
  const [bedrooms, setBedrooms] = useState(property?.bedrooms ?? 4);
  const [bathrooms, setBathrooms] = useState(property?.bathrooms ?? 3.5);
  const [squareFeet, setSquareFeet] = useState(String(property?.squareFeet ?? '4,500'));
  const [yearBuilt, setYearBuilt] = useState('2021');
  const [listingStatus, setListingStatus] = useState<'active' | 'draft' | 'sold'>('active');

  const media = property?.media ?? [];

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!property) return;

    await updateProperty(property._id, {
      title,
      propertyType,
      price: Number(price || 0),
      description,
      location: `${street}, ${city}, ${stateCode} ${zip}`,
      bedrooms,
      bathrooms,
      squareFeet: Number(squareFeet.replace(/,/g, '') || 0),
    });

    navigate('/dashboard/landlord/my-properties');
  };

  return (
    <LandlordPortalLayout active="my-properties" title="Edit Listing">
      <form className="p-8 lg:p-12 bg-surface min-h-screen" onSubmit={(e) => void onSubmit(e)}>
        {/* Header */}
        <header className="mb-12 flex justify-between items-end">
          <div>
            <nav className="flex items-center gap-2 mb-4 text-secondary text-xs font-semibold tracking-widest uppercase">
              <span>Properties</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary">Edit Listing</span>
            </nav>
            <h1 className="text-4xl font-extrabold text-primary tracking-tighter mb-2">{title}</h1>
            <p className="text-secondary">Editing property details for ID: #{property?._id?.slice(-8).toUpperCase() ?? 'RP-8829-QX'}</p>
          </div>
          <div className="flex gap-4">
            <button
              className="px-6 py-3 bg-surface-container-low text-on-surface font-semibold rounded-md hover:bg-surface-container transition-colors"
              type="button"
              onClick={() => navigate('/dashboard/landlord/my-properties')}
            >
              Discard
            </button>
            <button className="px-8 py-3 bg-primary text-on-primary font-bold rounded-md shadow-lg hover:opacity-90 transition-opacity" type="submit">
              Save Changes
            </button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-10">
          {/* Left Form */}
          <div className="col-span-12 lg:col-span-8 space-y-10">

            {/* Basic Information */}
            <section className="bg-surface-container-lowest p-8 rounded-xl">
              <div className="flex items-center gap-3 mb-8">
                <span className="material-symbols-outlined text-primary">info</span>
                <h2 className="text-xl font-bold tracking-tight">Basic Information</h2>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Property Title</label>
                  <input
                    className="w-full bg-surface-container-low border-none rounded-lg p-4 focus:ring-2 focus:ring-surface-tint/20 text-on-surface font-medium placeholder:text-outline-variant"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Property Type</label>
                  <select
                    className="w-full bg-surface-container-low border-none rounded-lg p-4 focus:ring-2 focus:ring-surface-tint/20 text-on-surface font-medium"
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                  >
                    <option>Luxury Villa</option>
                    <option>Modern Apartment</option>
                    <option>Penthouse</option>
                    <option>Commercial Space</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Asking Price ($)</label>
                  <input
                    className="w-full bg-surface-container-low border-none rounded-lg p-4 focus:ring-2 focus:ring-surface-tint/20 text-on-surface font-medium"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Description</label>
                  <textarea
                    className="w-full bg-surface-container-low border-none rounded-lg p-4 focus:ring-2 focus:ring-surface-tint/20 text-on-surface font-medium leading-relaxed"
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Media Gallery */}
            <section className="bg-surface-container-lowest p-8 rounded-xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">image</span>
                  <h2 className="text-xl font-bold tracking-tight">Property Media</h2>
                </div>
                <button className="text-sm font-bold text-primary flex items-center gap-1" type="button">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Upload New
                </button>
              </div>
              {media.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {media.slice(0, 3).map((item, idx) => (
                    <div key={item.public_id} className="relative group aspect-square rounded-lg overflow-hidden">
                      <img className="w-full h-full object-cover" src={item.url} alt={`Property photo ${idx + 1}`} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button className="p-2 bg-white rounded-full text-black" type="button">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button className="p-2 bg-white rounded-full text-error" type="button">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                      {idx === 0 && (
                        <div className="absolute top-3 left-3 bg-primary text-on-primary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-tighter">
                          Main Image
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="relative aspect-square rounded-lg overflow-hidden bg-surface-container-low flex items-center justify-center border-2 border-dashed border-outline-variant cursor-pointer hover:bg-surface-container transition-colors"
                    >
                      <div className="text-center">
                        <span className="material-symbols-outlined text-outline-variant text-3xl">add_photo_alternate</span>
                        <p className="text-xs text-secondary mt-1">{i === 0 ? 'Main Image' : `Photo ${i + 1}`}</p>
                      </div>
                      {i === 0 && (
                        <div className="absolute top-3 left-3 bg-primary text-on-primary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-tighter">
                          Main Image
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Location */}
            <section className="bg-surface-container-lowest p-8 rounded-xl">
              <div className="flex items-center gap-3 mb-8">
                <span className="material-symbols-outlined text-primary">location_on</span>
                <h2 className="text-xl font-bold tracking-tight">Location</h2>
              </div>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Street Address</label>
                  <input
                    className="w-full bg-surface-container-low border-none rounded-lg p-4 focus:ring-2 focus:ring-surface-tint/20 text-on-surface font-medium"
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">City</label>
                  <input
                    className="w-full bg-surface-container-low border-none rounded-lg p-4 focus:ring-2 focus:ring-surface-tint/20 text-on-surface font-medium"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">State / Zip</label>
                  <div className="flex gap-4">
                    <input
                      className="w-1/3 bg-surface-container-low border-none rounded-lg p-4 focus:ring-2 focus:ring-surface-tint/20 text-on-surface font-medium"
                      type="text"
                      value={stateCode}
                      onChange={(e) => setStateCode(e.target.value)}
                    />
                    <input
                      className="w-2/3 bg-surface-container-low border-none rounded-lg p-4 focus:ring-2 focus:ring-surface-tint/20 text-on-surface font-medium"
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="h-64 bg-surface-container-high rounded-xl overflow-hidden relative flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-300 text-6xl">map</span>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-primary text-on-primary w-12 h-12 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                      location_on
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-8">

            {/* Listing Status */}
            <div className="bg-surface-container-low p-8 rounded-xl">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-6">Listing Status</h3>
              <div className="space-y-4">
                <label
                  className={`flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg cursor-pointer border-2 ${listingStatus === 'active' ? 'border-primary' : 'border-transparent'}`}
                  onClick={() => setListingStatus('active')}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontVariationSettings: listingStatus === 'active' ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      check_circle
                    </span>
                    <span className="font-bold">Active</span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full ${listingStatus === 'active' ? 'border-4 border-primary bg-white' : 'border-2 border-outline-variant'}`}
                  />
                </label>
                <label
                  className={`flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg cursor-pointer border-2 ${listingStatus === 'draft' ? 'border-primary' : 'border-transparent'}`}
                  onClick={() => setListingStatus('draft')}
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined ${listingStatus === 'draft' ? 'text-primary' : 'text-secondary'}`}>
                      pause_circle
                    </span>
                    <span className={`font-bold ${listingStatus === 'draft' ? '' : 'text-secondary'}`}>Draft</span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full ${listingStatus === 'draft' ? 'border-4 border-primary bg-white' : 'border-2 border-outline-variant'}`}
                  />
                </label>
                <label
                  className={`flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg cursor-pointer border-2 ${listingStatus === 'sold' ? 'border-primary' : 'border-transparent'}`}
                  onClick={() => setListingStatus('sold')}
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined ${listingStatus === 'sold' ? 'text-primary' : 'text-secondary'}`}>
                      lock_clock
                    </span>
                    <span className={`font-bold ${listingStatus === 'sold' ? '' : 'text-secondary'}`}>Sold / Off-market</span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full ${listingStatus === 'sold' ? 'border-4 border-primary bg-white' : 'border-2 border-outline-variant'}`}
                  />
                </label>
              </div>
            </div>

            {/* Technical Specs */}
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-6">Technical Specs</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-surface-container py-2">
                  <span className="text-sm font-medium text-secondary">Bedrooms</span>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-primary"
                      onClick={() => setBedrooms((v) => Math.max(0, v - 1))}
                    >
                      <span className="material-symbols-outlined text-sm">remove</span>
                    </button>
                    <span className="font-bold">{bedrooms}</span>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-primary"
                      onClick={() => setBedrooms((v) => v + 1)}
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center border-b border-surface-container py-2">
                  <span className="text-sm font-medium text-secondary">Bathrooms</span>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-primary"
                      onClick={() => setBathrooms((v) => Math.max(0, Math.round((v - 0.5) * 2) / 2))}
                    >
                      <span className="material-symbols-outlined text-sm">remove</span>
                    </button>
                    <span className="font-bold">{bathrooms}</span>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-primary"
                      onClick={() => setBathrooms((v) => Math.round((v + 0.5) * 2) / 2)}
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center border-b border-surface-container py-2">
                  <span className="text-sm font-medium text-secondary">Square Feet</span>
                  <input
                    className="w-24 text-right bg-transparent border-none p-0 focus:ring-0 font-bold text-primary"
                    type="text"
                    value={squareFeet}
                    onChange={(e) => setSquareFeet(e.target.value)}
                  />
                </div>
                <div className="flex justify-between items-center border-b border-surface-container py-2">
                  <span className="text-sm font-medium text-secondary">Year Built</span>
                  <input
                    className="w-24 text-right bg-transparent border-none p-0 focus:ring-0 font-bold text-primary"
                    type="text"
                    value={yearBuilt}
                    onChange={(e) => setYearBuilt(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-6">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {(property?.amenities ?? ['Pool', '3-Car Garage', 'HVAC']).map((amenity) => (
                  <span
                    key={amenity}
                    className="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold uppercase tracking-tight rounded-full flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    {amenity}
                  </span>
                ))}
                <span className="px-3 py-1 bg-surface-container-high text-secondary text-[10px] font-bold uppercase tracking-tight rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">deck</span> Terrace
                </span>
                <span className="px-3 py-1 bg-surface-container-high text-secondary text-[10px] font-bold uppercase tracking-tight rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">fireplace</span> Fireplace
                </span>
                <button
                  type="button"
                  className="px-3 py-1 border border-outline-variant text-secondary text-[10px] font-bold uppercase tracking-tight rounded-full hover:bg-surface transition-colors"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="p-8 border-2 border-error/10 rounded-xl bg-error/5">
              <h3 className="text-xs font-bold text-error uppercase tracking-widest mb-4">Danger Zone</h3>
              <p className="text-xs text-error/80 mb-6">
                Once you delete a property, all data and history will be permanently erased. This action is irreversible.
              </p>
              <button
                type="button"
                className="w-full py-3 bg-white border border-error text-error font-bold rounded-md hover:bg-error hover:text-white transition-colors text-sm"
              >
                Archive Property
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Footer */}
        <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl p-4 flex gap-4 border-t border-slate-200">
          <button
            className="flex-1 py-4 bg-slate-100 font-bold rounded-lg"
            type="button"
            onClick={() => navigate('/dashboard/landlord/my-properties')}
          >
            Discard
          </button>
          <button className="flex-[2] py-4 bg-primary text-on-primary font-bold rounded-lg" type="submit">
            Save Changes
          </button>
        </footer>
      </form>
    </LandlordPortalLayout>
  );
};

export default Editproperty;
