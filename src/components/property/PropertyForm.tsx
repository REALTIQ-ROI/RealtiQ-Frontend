import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { ApiRequestError } from '../../lib/axios';
import MediaUploader from './MediaUploader';
import { documentService } from '../../services/documentService';
import type { CreatePropertyPayload, TitleDocumentUploadMetadata } from '../../services/propertyService';
import type { MediaItem, TitleDocumentPolicyMode, TitleDocumentType } from '../../types';
import { documentTypeLabel, titleDocumentTypeOptions } from '../../utils/titleVerification';

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
const MAX_TITLE_DOCUMENT_BYTES = 50 * 1024 * 1024;

interface TitleDocumentRow {
  key: string;
  file: File | null;
  documentType: TitleDocumentType;
  title: string;
  mode: TitleDocumentPolicyMode;
  assetId?: string;
  expiresAt?: string;
  progress: number;
  status: 'idle' | 'uploading' | 'staged' | 'failed';
  error?: string;
}

const createTitleDocumentRow = (): TitleDocumentRow => ({
  key: crypto.randomUUID(),
  file: null,
  documentType: 'survey_plan',
  title: 'Survey Plan',
  mode: 'private',
  progress: 0,
  status: 'idle',
});

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
  const [titleDocumentRows, setTitleDocumentRows] = useState<TitleDocumentRow[]>([]);
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
    if (mode === 'create' && titleDocumentRows.length > 0) {
      const duplicateTypes = titleDocumentRows.filter(
        (row, index, rows) => rows.findIndex((candidate) => candidate.documentType === row.documentType) !== index,
      );
      if (duplicateTypes.length > 0) {
        setErrors((current) => ({ ...current, titleDocuments: 'Each active title document must use a different type.' }));
        return;
      }
      if (titleDocumentRows.some((row) => !row.file)) {
        setErrors((current) => ({ ...current, titleDocuments: 'Choose a file for every title document row.' }));
        return;
      }

      setUploadingTitleDocument(true);
      try {
        const stagedRows: TitleDocumentRow[] = [];
        for (const row of titleDocumentRows) {
          if (row.assetId && row.expiresAt && new Date(row.expiresAt).getTime() > Date.now()) {
            stagedRows.push(row);
            continue;
          }
          setTitleDocumentRows((current) =>
            current.map((item) => item.key === row.key ? { ...item, status: 'uploading', progress: 0, error: undefined } : item),
          );
          try {
            const upload = await documentService.uploadTitleAsset(row.file!, (progress) => {
              setTitleDocumentRows((current) =>
                current.map((item) => item.key === row.key ? { ...item, progress } : item),
              );
            });
            const asset = upload.titleDocumentAsset;
            const staged = { ...row, assetId: asset.assetId, expiresAt: asset.expiresAt, status: 'staged' as const, progress: 100 };
            stagedRows.push(staged);
            setTitleDocumentRows((current) => current.map((item) => item.key === row.key ? staged : item));
          } catch (raw) {
            const message = raw instanceof Error ? raw.message : 'Unable to stage this title document.';
            setTitleDocumentRows((current) =>
              current.map((item) => item.key === row.key ? { ...item, status: 'failed', error: message } : item),
            );
            throw raw;
          }
        }
        titleDocuments = stagedRows.map((row) => ({
          assetId: row.assetId!,
          title: row.title.trim() || documentTypeLabel(row.documentType),
          documentType: row.documentType,
          accessPolicy: { enabled: row.mode !== 'private', mode: row.mode },
        }));
      } catch (raw) {
        const message = raw instanceof Error ? raw.message : 'Unable to upload title document.';
        toast.error(`${message} Retry the affected title document; ordinary property details have been retained.`);
        setUploadingTitleDocument(false);
        return;
      }
      setUploadingTitleDocument(false);
    }

    const payload = titleDocuments ? { ...basePayload, titleDocuments } : basePayload;
    try {
      await onSubmit(payload);
      setTitleDocumentRows([]);
    } catch (raw) {
      const message = raw instanceof Error ? raw.message : 'Unable to create the property.';
      if (
        raw instanceof ApiRequestError &&
        raw.status === 409 &&
        /\b(asset|expired|consumed)\b/i.test(message)
      ) {
        setTitleDocumentRows((current) => current.map((row) => ({
          ...row,
          assetId: undefined,
          expiresAt: undefined,
          status: 'failed',
          error: 'This staged asset expired or was already consumed. Select the file again to create a fresh private asset.',
        })));
      }
      toast.error(message);
    }
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
            <h2 className="text-base font-black text-on-surface tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Private title documents
            </h2>
            <p className="mt-1 text-xs text-secondary">
              Add different document types to the private vault. They never become public property media.
            </p>
            </div>
            <button
              type="button"
              onClick={() => setTitleDocumentRows((current) => [...current, createTitleDocumentRow()])}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary"
            >
              Add document
            </button>
          </div>
          {titleDocumentRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-outline-variant/20 p-5 text-sm text-secondary">
              Title documents are optional. You can add or resubmit them later from the property vault.
            </p>
          ) : null}
          {titleDocumentRows.map((row, index) => (
            <div key={row.key} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold">Document {index + 1}</p>
                <button
                  type="button"
                  onClick={() => setTitleDocumentRows((current) => current.filter((item) => item.key !== row.key))}
                  className="text-xs font-bold text-error"
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Document type</label>
                  <select
                    value={row.documentType}
                    onChange={(event) => {
                      const documentType = event.target.value as TitleDocumentType;
                      setTitleDocumentRows((current) => current.map((item) =>
                        item.key === row.key ? { ...item, documentType, title: documentTypeLabel(documentType) } : item,
                      ));
                    }}
                    className={inputClass}
                  >
                    {titleDocumentTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Document title</label>
                  <input
                    value={row.title}
                    onChange={(event) => setTitleDocumentRows((current) => current.map((item) =>
                      item.key === row.key ? { ...item, title: event.target.value } : item,
                    ))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Access</label>
                  <select
                    value={row.mode}
                    onChange={(event) => setTitleDocumentRows((current) => current.map((item) =>
                      item.key === row.key ? { ...item, mode: event.target.value as TitleDocumentPolicyMode } : item,
                    ))}
                    className={inputClass}
                  >
                    <option value="private">Private</option>
                    <option value="paid_view_once">Paid — one view</option>
                    <option value="paid_view_multiple">Paid — multiple views</option>
                  </select>
                  {row.mode !== 'private' ? <p className="mt-2 text-xs text-secondary">₦5,000 — set by RealtiQ. The server controls the final price.</p> : null}
                </div>
                <div>
                  <label className={labelClass}>Restricted file</label>
                  <input
                    type="file"
                    accept={TITLE_DOCUMENT_ACCEPT}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      const fileError = file && file.size > MAX_TITLE_DOCUMENT_BYTES ? 'Maximum file size is 50 MB.' : undefined;
                      setTitleDocumentRows((current) => current.map((item) =>
                        item.key === row.key
                          ? { ...item, file: fileError ? null : file, assetId: undefined, expiresAt: undefined, status: fileError ? 'failed' : 'idle', progress: 0, error: fileError }
                          : item,
                      ));
                    }}
                    className={inputClass}
                  />
                </div>
              </div>
              {row.status === 'uploading' ? <p className="mt-3 text-xs text-secondary">Staging securely… {row.progress}%</p> : null}
              {row.status === 'staged' ? <p className="mt-3 text-xs font-semibold text-emerald-700">Securely staged until {new Date(row.expiresAt!).toLocaleString()}.</p> : null}
              {row.error ? <p className="mt-3 text-xs text-error">{row.error} Select the file again or submit to retry.</p> : null}
            </div>
          ))}
          {errors.titleDocuments ? <p className={errorClass}>{errors.titleDocuments}</p> : null}
          <p className="text-xs text-secondary">Accepted: PDF, JPEG, PNG, and WebP, up to 50 MB. A rejected document is resubmitted as a new version; verified history is retained.</p>
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
