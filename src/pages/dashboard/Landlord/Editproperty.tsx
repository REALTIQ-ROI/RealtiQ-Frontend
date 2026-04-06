import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';

const Editproperty = () => {
  const { user } = useAuth();
  const { properties, updateProperty } = useProperties();
  const navigate = useNavigate();

  const property = useMemo(() => properties.find((item) => item.ownerId === user?._id) ?? null, [properties, user]);

  const [title, setTitle] = useState(property?.title ?? 'The Glass Pavilion');
  const [price, setPrice] = useState(String(property?.price ?? 2450000));
  const [description, setDescription] = useState(property?.description ?? 'A masterpiece of modern minimalism.');
  const [location, setLocation] = useState(property?.location ?? 'Los Angeles, CA 90039');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!property) return;

    await updateProperty(property._id, {
      title,
      price: Number(price || 0),
      description,
      location,
    });

    navigate('/dashboard/landlord/my-properties');
  };

  return (
    <LandlordPortalLayout active="my-properties" title="Edit Listing">
      <form className="p-8 lg:p-12" onSubmit={onSubmit}>
        <header className="mb-12 flex justify-between items-end">
          <div>
            <nav className="flex items-center gap-2 mb-4 text-secondary text-xs font-semibold tracking-widest uppercase">
              <span>Properties</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary">Edit Listing</span>
            </nav>
            <h1 className="text-4xl font-extrabold text-primary tracking-tighter mb-2">{title}</h1>
            <p className="text-secondary">Editing property details</p>
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-surface-container-low text-on-surface font-semibold rounded-md" type="button">
              Discard
            </button>
            <button className="px-8 py-3 bg-primary text-on-primary font-bold rounded-md shadow-lg" type="submit">
              Save Changes
            </button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-8 space-y-10">
            <section className="bg-surface-container-lowest p-8 rounded-xl">
              <h2 className="text-xl font-bold tracking-tight mb-8">Basic Information</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Property Title</label>
                  <input className="w-full bg-surface-container-low border-none rounded-lg p-4" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Property Type</label>
                  <input className="w-full bg-surface-container-low border-none rounded-lg p-4" value="Luxury Villa" disabled />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Asking Price ($)</label>
                  <input
                    className="w-full bg-surface-container-low border-none rounded-lg p-4"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Description</label>
                  <textarea
                    className="w-full bg-surface-container-low border-none rounded-lg p-4"
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest p-8 rounded-xl">
              <h2 className="text-xl font-bold tracking-tight mb-8">Location</h2>
              <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Address</label>
              <input className="w-full bg-surface-container-low border-none rounded-lg p-4" value={location} onChange={(e) => setLocation(e.target.value)} />
            </section>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-8">
            <div className="bg-surface-container-low p-8 rounded-xl">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-6">Listing Status</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg border-2 border-primary">
                  <span className="font-bold">Active</span>
                  <span className="w-4 h-4 rounded-full border-4 border-primary bg-white" />
                </label>
                <label className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg border-2 border-transparent">
                  <span className="font-bold text-secondary">Draft</span>
                  <span className="w-4 h-4 rounded-full border-2 border-outline-variant" />
                </label>
              </div>
            </div>

            <div className="p-8 border-2 border-error/10 rounded-xl bg-error/5">
              <h3 className="text-xs font-bold text-error uppercase tracking-widest mb-4">Danger Zone</h3>
              <p className="text-xs text-error/80 mb-6">Archive this property from active listing visibility.</p>
              <button className="w-full py-3 bg-white border border-error text-error font-bold rounded-md text-sm" type="button">
                Archive Property
              </button>
            </div>
          </div>
        </div>
      </form>
    </LandlordPortalLayout>
  );
};

export default Editproperty;
