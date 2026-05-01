import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import MediaUploader from '../../../components/property/MediaUploader';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import type { MediaItem } from '../../../types';

const AddProperty = () => {
  const { user } = useAuth();
  const { addProperty } = useProperties();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await addProperty(user._id, {
        title,
        price: Number(price || 0),
        location,
        propertyType: 'Sale Only',
        bedrooms: Number(bedrooms || 0),
        bathrooms: Number(bathrooms || 0),
        description,
        squareFeet: 0,
        media,
        amenities: [],
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
              <div className="grid grid-cols-3 gap-4">
                <input className="w-full bg-surface-container border-none rounded-xl px-4 py-4" value="Sale Only" disabled />
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
