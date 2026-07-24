import { useEffect, useState, type FormEvent } from 'react';
import type { Property } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';

type EditableProperty = Omit<Property, '_id' | 'status'>;

interface PropertyFormProps {
  initialValue?: Partial<EditableProperty>;
  submitLabel: string;
  onSubmit: (payload: EditableProperty) => Promise<void>;
}

const defaultImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCW1b4FqPGmqmeY55_3DmIkYZppItdf4BONT9K3h9Chogho8LpD3K25Ozc2vrOOy8jnmnDcdz2kQPm9SRjDSsw_kORH_mFg2sS7t8G_XACaWZWRKvVK95WuaJGR285vcJeGpB-s1gkzgV47C4uPbdF3ToImr7C_hIfRNv7C-aTGlrzhMPOAnhQY8s_Th_nC6ndF3bZ1UGPFU_4tr5rOwG-Gvi2DX8mGqjT4kC1on_MugegV_-ks3Mz5Dq5bvr22mXYh03OolLPFqA';

const PropertyForm = ({ initialValue, submitLabel, onSubmit }: PropertyFormProps) => {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState(1000000);
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('house');
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [description, setDescription] = useState('');
  const [squareFeet, setSquareFeet] = useState(1200);
  const [mediaUrl, setMediaUrl] = useState(defaultImage);
  const [amenities, setAmenities] = useState('Parking, Security');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!initialValue) {
      return;
    }

    setTitle(initialValue.title ?? '');
    setPrice(initialValue.price ?? 1000000);
    setLocation(initialValue.location ?? '');
    setPropertyType(initialValue.propertyType ?? 'house');
    setBedrooms(initialValue.bedrooms ?? 3);
    setBathrooms(initialValue.bathrooms ?? 2);
    setDescription(initialValue.description ?? '');
    setSquareFeet(initialValue.squareFeet ?? 1200);
    setMediaUrl(initialValue.media?.[0]?.url ?? defaultImage);
    setAmenities((initialValue.amenities ?? []).join(', '));
  }, [initialValue]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        title,
        price,
        paymentTypes: initialValue?.paymentTypes ?? ['outright'],
        location,
        propertyType,
        bedrooms,
        bathrooms,
        description,
        squareFeet,
        media: [{ url: mediaUrl, public_id: `media-${Date.now()}`, type: 'image' }],
        featured: false,
        amenities: amenities
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        ownerId: initialValue?.ownerId,
        buyerId: initialValue?.buyerId,
        createdAt: initialValue?.createdAt,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
      <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
      <Input label="Location" value={location} onChange={(event) => setLocation(event.target.value)} required />
      <Input label="Price" type="number" value={price} onChange={(event) => setPrice(Number(event.target.value))} required />
      <div className="space-y-2">
        <label className="block text-on-surface font-label text-xs font-bold uppercase tracking-wider">Type</label>
        <div className="relative">
          <select
            className="w-full appearance-none bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-surface-tint/20 pr-10"
            value={propertyType}
            onChange={(event) => setPropertyType(event.target.value)}
            required
          >
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
            <option value="land">Land</option>
            <option value="commercial">Commercial</option>
            <option value="villa">Villa</option>
            <option value="penthouse">Penthouse</option>
            <option value="estate">Estate</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <svg className="h-4 w-4 text-on-surface-variant" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      <Input label="Bedrooms" type="number" value={bedrooms} onChange={(event) => setBedrooms(Number(event.target.value))} required />
      <Input label="Bathrooms" type="number" value={bathrooms} onChange={(event) => setBathrooms(Number(event.target.value))} required />
      <Input label="Square Feet" type="number" value={squareFeet} onChange={(event) => setSquareFeet(Number(event.target.value))} required />
      <Input label="Hero Image URL" value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} required />
      <div className="md:col-span-2">
        <label className="block text-on-surface font-label text-xs font-bold uppercase tracking-wider mb-2">Description</label>
        <textarea
          className="w-full min-h-24 bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        />
      </div>
      <div className="md:col-span-2">
        <Input label="Amenities (comma separated)" value={amenities} onChange={(event) => setAmenities(event.target.value)} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default PropertyForm;
