import { useState, type FormEvent, type KeyboardEvent } from 'react';
import MediaUploader from './MediaUploader';
import type { CreatePropertyPayload } from '../../services/propertyService';
import type { MediaItem } from '../../types';

interface PropertyFormProps {
  initialData?: Partial<CreatePropertyPayload & { status: string }>;
  onSubmit: (data: CreatePropertyPayload & { status?: string }) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
  mode?: 'create' | 'edit';
}

const PROPERTY_TYPES = ['house', 'apartment', 'land', 'commercial', 'villa', 'penthouse', 'estate'];
const CATEGORY_OPTIONS = ['residential', 'commercial', 'mixed_use'];
const STAGE_OPTIONS = ['off_plan', 'unfinished', 'finished', 'renovation'];
const CURRENCY_OPTIONS = ['NGN', 'USD', 'GBP'];
const STATUS_OPTIONS = ['available', 'sold'];

const inputClass =
  'w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all';
const labelClass = 'block text-[11px] font-bold uppercase tracking-widest text-secondary mb-1.5';
const errorClass = 'text-error text-xs mt-1';

const validate = (data: CreatePropertyPayload & { status?: string }): Record<string, string> => {
  const errs: Record<string, string> = {};
  if (!data.title.trim()) errs.title = 'Title is required';
  if (!data.price || data.price <= 0) errs.price = 'Price must be greater than 0';
  if (!data.location.trim()) errs.location = 'Location is required';
  if (!data.propertyType) errs.propertyType = 'Property type is required';
  if (!data.bedrooms || data.bedrooms < 1) errs.bedrooms = 'At least 1 bedroom required';
  if (!data.bathrooms || data.bathrooms < 1) errs.bathrooms = 'At least 1 bathroom required';
  if (!data.squareFeet || data.squareFeet <= 0) errs.squareFeet = 'Square footage must be greater than 0';
  if (!data.description.trim()) errs.description = 'Description is required';
  if (!data.media || data.media.length === 0) errs.media = 'At least one media file is required';
  if (!data.category) errs.category = 'Category is required';
  if (!data.completionStage) errs.completionStage = 'Completion stage is required';
  if (!data.currency) errs.currency = 'Currency is required';
  return errs;
};

const PropertyForm = ({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = 'Save Property',
  mode = 'create',
}: PropertyFormProps) => {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [price, setPrice] = useState(initialData?.price?.toString() ?? '');
  const [location, setLocation] = useState(initialData?.location ?? '');
  const [propertyType, setPropertyType] = useState(initialData?.propertyType ?? 'apartment');
  const [bedrooms, setBedrooms] = useState(initialData?.bedrooms?.toString() ?? '1');
  const [bathrooms, setBathrooms] = useState(initialData?.bathrooms?.toString() ?? '1');
  const [squareFeet, setSquareFeet] = useState(initialData?.squareFeet?.toString() ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [category, setCategory] = useState(initialData?.category ?? 'residential');
  const [completionStage, setCompletionStage] = useState(initialData?.completionStage ?? 'finished');
  const [currency, setCurrency] = useState(initialData?.currency ?? 'NGN');
  const [coordinatesLat, setCoordinatesLat] = useState(initialData?.coordinates?.lat?.toString() ?? '');
  const [coordinatesLng, setCoordinatesLng] = useState(initialData?.coordinates?.lng?.toString() ?? '');
  const [amenities, setAmenities] = useState<string[]>(initialData?.amenities ?? []);
  const [amenityInput, setAmenityInput] = useState('');
  const [media, setMedia] = useState<MediaItem[]>(initialData?.media ?? []);
  const [status, setStatus] = useState(initialData?.status ?? 'available');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addAmenity = () => {
    const trimmed = amenityInput.trim();
    if (trimmed && !amenities.includes(trimmed)) {
      setAmenities((prev) => [...prev, trimmed]);
    }
    setAmenityInput('');
  };

  const handleAmenityKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addAmenity();
    }
  };

  const removeAmenity = (item: string) => {
    setAmenities((prev) => prev.filter((a) => a !== item));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload: CreatePropertyPayload & { status?: string } = {
      title: title.trim(),
      price: Number(price),
      location: location.trim(),
      propertyType,
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      squareFeet: Number(squareFeet),
      description: description.trim(),
      amenities,
      media,
      category,
      completionStage,
      currency,
      coordinates:
        coordinatesLat && coordinatesLng
          ? { lat: Number(coordinatesLat), lng: Number(coordinatesLng) }
          : undefined,
      ...(mode === 'edit' && { status }),
    };
    const errs = validate(payload);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    await onSubmit(payload);
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="bg-white rounded-2xl p-6 space-y-5 border border-outline-variant/10">
        <h2 className="text-base font-black text-on-surface tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Property Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 3 Bedroom Flat in Lekki"
              className={inputClass}
            />
            {errors.title && <p className={errorClass}>{errors.title}</p>}
          </div>

          <div>
            <label className={labelClass}>Property Type</label>
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={inputClass}>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
            {errors.propertyType && <p className={errorClass}>{errors.propertyType}</p>}
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace('_', ' ')}
                </option>
              ))}
            </select>
            {errors.category && <p className={errorClass}>{errors.category}</p>}
          </div>

          <div>
            <label className={labelClass}>Price</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 15000000"
              min={0}
              className={inputClass}
            />
            {errors.price && <p className={errorClass}>{errors.price}</p>}
          </div>

          <div>
            <label className={labelClass}>Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.currency && <p className={errorClass}>{errors.currency}</p>}
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Lekki, Lagos"
              className={inputClass}
            />
            {errors.location && <p className={errorClass}>{errors.location}</p>}
          </div>

          <div>
            <label className={labelClass}>Bedrooms</label>
            <input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} min={1} className={inputClass} />
            {errors.bedrooms && <p className={errorClass}>{errors.bedrooms}</p>}
          </div>

          <div>
            <label className={labelClass}>Bathrooms</label>
            <input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} min={1} className={inputClass} />
            {errors.bathrooms && <p className={errorClass}>{errors.bathrooms}</p>}
          </div>

          <div>
            <label className={labelClass}>Square Feet</label>
            <input
              type="number"
              value={squareFeet}
              onChange={(e) => setSquareFeet(e.target.value)}
              placeholder="e.g. 1200"
              min={0}
              className={inputClass}
            />
            {errors.squareFeet && <p className={errorClass}>{errors.squareFeet}</p>}
          </div>

          <div>
            <label className={labelClass}>Completion Stage</label>
            <select value={completionStage} onChange={(e) => setCompletionStage(e.target.value)} className={inputClass}>
              {STAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace('_', ' ')}
                </option>
              ))}
            </select>
            {errors.completionStage && <p className={errorClass}>{errors.completionStage}</p>}
          </div>

          <div>
            <label className={labelClass}>Latitude</label>
            <input
              type="number"
              step="any"
              value={coordinatesLat}
              onChange={(e) => setCoordinatesLat(e.target.value)}
              placeholder="6.45"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Longitude</label>
            <input
              type="number"
              step="any"
              value={coordinatesLng}
              onChange={(e) => setCoordinatesLng(e.target.value)}
              placeholder="3.39"
              className={inputClass}
            />
          </div>

          {mode === 'edit' && (
            <div>
              <label className={labelClass}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as 'available' | 'sold')} className={inputClass}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="md:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the property..."
              className={`${inputClass} resize-none`}
            />
            {errors.description && <p className={errorClass}>{errors.description}</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 space-y-4 border border-outline-variant/10">
        <h2 className="text-base font-black text-on-surface tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Amenities
        </h2>

        <div className="flex gap-2">
          <input
            type="text"
            value={amenityInput}
            onChange={(e) => setAmenityInput(e.target.value)}
            onKeyDown={handleAmenityKey}
            placeholder="Type amenity and press Enter"
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={addAmenity}
            className="px-4 py-3 rounded-lg bg-surface-container text-on-surface text-sm font-bold hover:bg-surface-container-high transition-colors"
          >
            Add
          </button>
        </div>

        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {amenities.map((a) => (
              <span
                key={a}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface text-xs font-semibold"
              >
                {a}
                <button
                  type="button"
                  onClick={() => removeAmenity(a)}
                  className="text-on-surface-variant hover:text-error transition-colors"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 space-y-4 border border-outline-variant/10">
        <h2 className="text-base font-black text-on-surface tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Media
        </h2>
        <MediaUploader value={media} onChange={setMedia} error={errors.media} />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-4 rounded-xl text-white font-bold text-sm tracking-tight hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #000000 0%, #111c2d 100%)' }}
      >
        {isLoading ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
};

export default PropertyForm;
