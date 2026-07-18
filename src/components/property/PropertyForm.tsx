import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import MediaUploader from './MediaUploader';
import { documentService } from '../../services/documentService';
import type { CreatePropertyPayload, TitleDocumentUploadMetadata } from '../../services/propertyService';
import type { MediaItem, TitleDocumentType } from '../../types';
import { titleDocumentTypeOptions } from '../../utils/titleVerification';

interface PropertyFormProps {
  initialData?: Partial<CreatePropertyPayload & { status: string }>;
  onSubmit: (data: CreatePropertyPayload & { status?: string }) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
  mode?: 'create' | 'edit';
}

const PROPERTY_TYPES = ['house', 'apartment', 'land', 'commercial', 'villa', 'penthouse', 'estate'];
const CATEGORY_OPTIONS = ['residential', 'commercial', 'mixed_use'];
const LAND_CATEGORY_OPTIONS = ['residential_land', 'commercial_land', 'agricultural_land', 'industrial_land', 'mixed_use_land'];
const STAGE_OPTIONS = ['off_plan', 'unfinished', 'finished', 'renovation'];
const CURRENCY_OPTIONS = ['NGN', 'USD', 'GBP'];
const STATUS_OPTIONS = ['available', 'sold'];
const TITLE_DOCUMENT_ACCEPT = '.pdf,image/jpeg,image/png,image/webp';

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
  if (data.propertyType !== 'land') {
    if (!data.bedrooms || data.bedrooms < 1) errs.bedrooms = 'At least 1 bedroom required';
    if (!data.bathrooms || data.bathrooms < 1) errs.bathrooms = 'At least 1 bathroom required';
    if (!data.completionStage) errs.completionStage = 'Completion stage is required';
  }
  if (!data.squareFeet || data.squareFeet <= 0) errs.squareFeet = 'Square footage must be greater than 0';
  if (!data.description.trim()) errs.description = 'Description is required';
  if (!data.media || data.media.length === 0) errs.media = 'At least one media file is required';
  if (!data.category) errs.category = 'Category is required';
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
  const [titleDocumentFile, setTitleDocumentFile] = useState<File | null>(null);
  const [titleDocumentType, setTitleDocumentType] = useState<TitleDocumentType>('certificate_of_occupancy');
  const [titleDocumentTitle, setTitleDocumentTitle] = useState('Certificate of Occupancy');
  const [uploadingTitleDocument, setUploadingTitleDocument] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isLandProperty = propertyType === 'land';
  const categoryOptions = isLandProperty ? LAND_CATEGORY_OPTIONS : CATEGORY_OPTIONS;

  useEffect(() => {
    if (!categoryOptions.includes(category)) {
      setCategory(categoryOptions[0]);
    }
  }, [category, categoryOptions]);

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
    const basePayload: CreatePropertyPayload & { status?: string } = {
      title: title.trim(),
      price: Number(price),
      location: location.trim(),
      propertyType,
      squareFeet: Number(squareFeet),
      description: description.trim(),
      amenities,
      media,
      category,
      currency,
      coordinates:
        coordinatesLat && coordinatesLng
          ? { lat: Number(coordinatesLat), lng: Number(coordinatesLng) }
          : undefined,
      ...(!isLandProperty && {
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        completionStage,
      }),
      ...(mode === 'edit' && { status }),
    };
    const errs = validate(basePayload);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    let titleDocuments: TitleDocumentUploadMetadata[] | undefined;
    if (mode === 'create' && titleDocumentFile) {
      setUploadingTitleDocument(true);
      try {
        const upload = await documentService.uploadTitleAsset(titleDocumentFile);
        const uploaded = upload.titleDocument;
        if (!uploaded?.fileUrl) {
          throw new Error('Title document upload did not return a file URL.');
        }
        titleDocuments = [{
          title: titleDocumentTitle.trim() || titleDocumentTypeOptions.find((option) => option.value === titleDocumentType)?.label || 'Title Document',
          documentType: titleDocumentType,
          fileUrl: uploaded.fileUrl,
          publicId: uploaded.publicId,
          resourceType: uploaded.resourceType,
          mimeType: uploaded.mimeType || titleDocumentFile.type,
          originalFileName: uploaded.originalFileName || titleDocumentFile.name,
          fileSizeBytes: uploaded.fileSizeBytes || titleDocumentFile.size,
        }];
      } catch (raw) {
        const message = raw instanceof Error ? raw.message : 'Unable to upload title document.';
        toast.error(`${message} Please re-upload using the title document uploader.`);
        setUploadingTitleDocument(false);
        return;
      }
      setUploadingTitleDocument(false);
    }

    const payload = titleDocuments ? { ...basePayload, titleDocuments } : basePayload;
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
              {categoryOptions.map((option) => (
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

          {!isLandProperty ? (
            <>
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
            </>
          ) : null}

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

          {!isLandProperty ? (
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
          ) : null}

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

      {mode === 'create' ? (
        <div className="bg-white rounded-2xl p-6 space-y-4 border border-outline-variant/10">
          <div>
            <h2 className="text-base font-black text-on-surface tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Optional Title Document
            </h2>
            <p className="mt-1 text-xs text-secondary">
              Title documents are stored as restricted Document Vault records and are not shown as public listing media.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Document Type</label>
              <select value={titleDocumentType} onChange={(e) => setTitleDocumentType(e.target.value as TitleDocumentType)} className={inputClass}>
                {titleDocumentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Document Title</label>
              <input value={titleDocumentTitle} onChange={(e) => setTitleDocumentTitle(e.target.value)} className={inputClass} placeholder="Certificate of Occupancy" />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Restricted File</label>
              <input
                type="file"
                accept={TITLE_DOCUMENT_ACCEPT}
                onChange={(event) => setTitleDocumentFile(event.target.files?.[0] ?? null)}
                className={inputClass}
              />
              <p className="mt-2 text-xs text-secondary">Accepted: PDF, JPEG, PNG, and WebP. Replacement or editing after submission requires admin/legal support.</p>
              {titleDocumentFile ? <p className="mt-2 text-xs font-semibold text-on-surface">{titleDocumentFile.name}</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isLoading || uploadingTitleDocument}
        className="w-full py-4 rounded-xl text-white font-bold text-sm tracking-tight hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #000000 0%, #111c2d 100%)' }}
      >
        {isLoading || uploadingTitleDocument ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
};

export default PropertyForm;
