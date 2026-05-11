import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import MediaUploader from '../../../components/property/MediaUploader';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import type { MediaItem } from '../../../types';

const PROPERTY_TYPES = ['house', 'apartment', 'land', 'commercial', 'villa', 'penthouse', 'estate'] as const;

const AddProperty = () => {
  const { user } = useAuth();
  const { addProperty } = useProperties();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState<string>('house');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [squareFeet, setSquareFeet] = useState('');
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [amenityInput, setAmenityInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddAmenity = () => {
    const trimmed = amenityInput.trim();
    if (!trimmed || amenities.includes(trimmed)) return;
    setAmenities((prev) => [...prev, trimmed]);
    setAmenityInput('');
  };

  const handleAmenityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAmenity();
    }
  };

  const handleRemoveAmenity = (item: string) => {
    setAmenities((prev) => prev.filter((a) => a !== item));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await addProperty(user._id, {
        title,
        price: Number(price || 0),
        location,
        propertyType,
        bedrooms: Number(bedrooms || 0),
        bathrooms: Number(bathrooms || 0),
        description,
        squareFeet: Number(squareFeet || 0),
        media,
        amenities,
      });

      toast.success('Property listed successfully');
      navigate('/dashboard/landlord/my-properties');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create property.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LandlordPortalLayout active="add-property" title="New Property Listing">
      <div className="p-12 max-w-6xl mx-auto">
        <nav className="flex mb-8 gap-2 text-sm font-medium text-secondary">
          <span>Dashboard</span>
          <span className="material-symbols-outlined text-xs self-center">chevron_right</span>
          <span>Properties</span>
          <span className="material-symbols-outlined text-xs self-center">chevron_right</span>
          <span className="text-primary">Add New</span>
        </nav>

        <form className="grid grid-cols-1 lg:grid-cols-12 gap-12" onSubmit={onSubmit}>
          <div className="lg:col-span-8 space-y-10">
            <section className="space-y-6">
              <h3 className="text-2xl font-bold tracking-tight text-primary">Architectural Details</h3>
              <p className="text-secondary text-sm">Define the core identity and market positioning of your property.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Property Title</label>
                  <input
                    className="w-full bg-surface-container-low border-none rounded-xl px-4 py-4"
                    placeholder="e.g. The Glass Pavilion at North Ridge"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Price (NGN)</label>
                    <input
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-4"
                      placeholder="0.00"
                      type="number"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Property Status</label>
                    <input className="w-full bg-surface-container border-none rounded-xl px-4 py-4" value="Available" disabled />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Location</label>
                  <input
                    className="w-full bg-surface-container-low border-none rounded-xl px-4 py-4"
                    placeholder="Enter full address"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6 pt-6 border-t border-surface-container">
              <h3 className="text-xl font-bold tracking-tight text-primary">Technical Specifications</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Property Type</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none bg-surface-container-low border-none rounded-xl px-4 py-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-surface-tint/20 pr-10 capitalize"
                      value={propertyType}
                      onChange={(event) => setPropertyType(event.target.value)}
                      required
                    >
                      {PROPERTY_TYPES.map((type) => (
                        <option key={type} value={type} className="capitalize">
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <svg className="h-4 w-4 text-on-surface-variant" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Square Feet</label>
                  <input
                    className="w-full bg-surface-container-low border-none rounded-xl px-4 py-4"
                    placeholder="e.g. 2400"
                    type="number"
                    value={squareFeet}
                    onChange={(event) => setSquareFeet(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-4"
                  placeholder="Bedrooms"
                  type="number"
                  value={bedrooms}
                  onChange={(event) => setBedrooms(event.target.value)}
                />
                <input
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-4"
                  placeholder="Bathrooms"
                  type="number"
                  value={bathrooms}
                  onChange={(event) => setBathrooms(event.target.value)}
                />
              </div>
              <textarea
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-4 resize-none"
                placeholder="Describe the architectural soul of this property..."
                rows={6}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </section>

            <section className="space-y-6 pt-6 border-t border-surface-container">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-primary">Amenities</h3>
                <p className="text-secondary text-sm mt-1">Add each amenity one at a time and press Add or Enter.</p>
              </div>
              <div className="flex gap-3">
                <input
                  className="flex-1 bg-surface-container-low border-none rounded-xl px-4 py-4"
                  placeholder="e.g. Swimming Pool"
                  value={amenityInput}
                  onChange={(e) => setAmenityInput(e.target.value)}
                  onKeyDown={handleAmenityKeyDown}
                />
                <button
                  type="button"
                  onClick={handleAddAmenity}
                  className="px-6 py-4 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  Add
                </button>
              </div>
              {amenities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {amenities.map((item) => (
                    <span
                      key={item}
                      className="flex items-center gap-2 px-4 py-2 bg-surface-container rounded-full text-sm font-medium text-on-surface"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => handleRemoveAmenity(item)}
                        className="text-secondary hover:text-error transition-colors"
                        aria-label={`Remove ${item}`}
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </section>

            <div className="flex items-center gap-4 pt-8">
              <button
                className="bg-primary text-white px-8 py-4 rounded-lg font-bold disabled:opacity-60"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Publishing…' : 'Publish Property'}
              </button>
              <button
                className="text-secondary font-bold px-8 py-4 hover:bg-surface-container-low rounded-lg"
                type="button"
                disabled={isSubmitting}
                onClick={() => navigate('/dashboard/landlord/my-properties')}
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="bg-surface-container-lowest p-8 rounded-xl ring-1 ring-black/5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-widest text-secondary mb-6">Visual Assets</h3>
              <MediaUploader
                value={media}
                onChange={setMedia}
              />
            </div>

            <div className="bg-primary-container p-8 rounded-xl text-white">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Quality Standards</h3>
              <ul className="space-y-3 text-xs text-on-primary-container leading-relaxed">
                <li>Use high-resolution architectural photography only.</li>
                <li>Descriptions should be evocative and professional.</li>
                <li>Ensure all legal certifications are ready for verification.</li>
              </ul>
            </div>
          </div>
        </form>
      </div>
    </LandlordPortalLayout>
  );
};

export default AddProperty;
