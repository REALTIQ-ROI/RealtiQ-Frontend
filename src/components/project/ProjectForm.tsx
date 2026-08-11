import { useState, type Dispatch, type FormEvent, type KeyboardEvent, type SetStateAction } from 'react';
import { toast } from 'sonner';
import type { CreateProjectRequest } from '../../services/projectService';
import type { MediaItem, ProjectDetail, ProjectMedia, ProjectType } from '../../types';
import { nigeriaStateCities, nigeriaStates } from '../../utils/nigeriaLocations';
import MediaUploader from '../property/MediaUploader';
import Button from '../ui/Button';

interface ProjectFormProps {
  initialData?: ProjectDetail;
  onSubmit: (payload: CreateProjectRequest) => Promise<void>;
  submitLabel?: string;
}

const projectTypes: ProjectType[] = ['estate', 'apartment_development', 'residential', 'commercial', 'mixed_use', 'housing_project', 'other'];
const inputClass = 'w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20';
const labelClass = 'block text-xs font-bold uppercase tracking-widest text-secondary mb-2';

const toMediaItems = (media?: ProjectMedia[]): MediaItem[] =>
  (media ?? []).map((item) => ({
    url: item.url,
    public_id: item.public_id ?? item.publicId ?? item.url,
    type: item.type,
  }));

const toProjectMedia = (media: MediaItem[]): ProjectMedia[] =>
  media.map((item, index) => ({
    url: item.url,
    public_id: item.public_id,
    type: item.type === 'video' ? 'video' : 'image',
    isCover: index === 0,
  }));

interface ChipInputProps {
  id: string;
  label: string;
  placeholder: string;
  value: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (item: string) => void;
}

const ChipInput = ({ id, label, placeholder, value, draft, onDraftChange, onAdd, onRemove }: ChipInputProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      onAdd();
    }
  };

  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${inputClass} flex-1`}
        />
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg bg-surface-container px-4 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high"
        >
          Add
        </button>
      </div>
      {value.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((item) => (
            <span key={item} className="flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5 text-xs font-semibold text-on-surface">
              {item}
              <button type="button" onClick={() => onRemove(item)} className="text-on-surface-variant transition-colors hover:text-error" aria-label={`Remove ${item}`}>
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const ProjectForm = ({ initialData, onSubmit, submitLabel = 'Save Project' }: ProjectFormProps) => {
  const [name, setName] = useState(initialData?.name ?? '');
  const [developerName, setDeveloperName] = useState(initialData?.developer?.name ?? '');
  const [projectType, setProjectType] = useState<ProjectType>(initialData?.projectType ?? 'estate');
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [address, setAddress] = useState(initialData?.address ?? '');
  const [state, setState] = useState(initialData?.state ?? initialData?.location?.state ?? '');
  const [city, setCity] = useState(initialData?.city ?? initialData?.location?.city ?? '');
  const [area, setArea] = useState(initialData?.area ?? initialData?.location?.area ?? '');
  const [lat, setLat] = useState(initialData?.coordinates?.lat?.toString() ?? '');
  const [lng, setLng] = useState(initialData?.coordinates?.lng?.toString() ?? '');
  const [amenities, setAmenities] = useState<string[]>(initialData?.amenities ?? []);
  const [amenityInput, setAmenityInput] = useState('');
  const [features, setFeatures] = useState<string[]>(initialData?.features ?? []);
  const [featureInput, setFeatureInput] = useState('');
  const [completionDate, setCompletionDate] = useState(initialData?.completionDate?.slice(0, 10) ?? '');
  const [launchDate, setLaunchDate] = useState(initialData?.launchDate?.slice(0, 10) ?? '');
  const [media, setMedia] = useState<MediaItem[]>(toMediaItems(initialData?.media));
  const [saving, setSaving] = useState(false);
  const cityOptions = state ? nigeriaStateCities[state] ?? [] : [];

  const addListItem = (draft: string, setDraft: (value: string) => void, setItems: Dispatch<SetStateAction<string[]>>) => {
    const trimmed = draft.trim();
    if (trimmed) {
      setItems((current) => current.includes(trimmed) ? current : [...current, trimmed]);
    }
    setDraft('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !description.trim() || !state.trim() || !city.trim()) {
      toast.error('Name, description, state, and city are required.');
      return;
    }
    if (media.length === 0) {
      toast.error('At least one project image is required before publishing.');
      return;
    }
    const coordinates = lat.trim() && lng.trim() ? { lat: Number(lat), lng: Number(lng) } : undefined;
    if (coordinates && (!Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng))) {
      toast.error('Project coordinates must be valid numbers.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        developerName: developerName.trim() || undefined,
        projectType,
        shortDescription: shortDescription.trim() || undefined,
        description: description.trim(),
        address: address.trim() || undefined,
        country: 'Nigeria',
        state: state.trim(),
        city: city.trim(),
        area: area.trim() || undefined,
        coordinates,
        amenities,
        features,
        media: toProjectMedia(media),
        completionDate: completionDate || undefined,
        launchDate: launchDate || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
      <section className="rounded-xl border border-outline-variant/10 bg-white p-6">
        <h2 className="text-xl font-black">Project information</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="project-name" className={labelClass}>Project name</label>
            <input id="project-name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="developer-name" className={labelClass}>Developer name</label>
            <input id="developer-name" value={developerName} onChange={(event) => setDeveloperName(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="project-type" className={labelClass}>Project type</label>
            <select id="project-type" value={projectType} onChange={(event) => setProjectType(event.target.value as ProjectType)} className={inputClass}>
              {projectTypes.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="short-description" className={labelClass}>Short description</label>
            <input id="short-description" value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="project-description" className={labelClass}>Description</label>
            <textarea id="project-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className={`${inputClass} resize-none`} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant/10 bg-white p-6">
        <h2 className="text-xl font-black">Location</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="project-address" className={labelClass}>Address</label>
            <input id="project-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street address or estate address" className={inputClass} />
          </div>
          <div>
            <label htmlFor="project-state" className={labelClass}>State</label>
            <select
              id="project-state"
              value={state}
              onChange={(event) => {
                setState(event.target.value);
                setCity('');
              }}
              className={inputClass}
            >
              <option value="">Select state</option>
              {nigeriaStates.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="project-city" className={labelClass}>City</label>
            <select id="project-city" value={city} onChange={(event) => setCity(event.target.value)} className={inputClass} disabled={!state}>
              <option value="">{state ? 'Select city' : 'Select state first'}</option>
              {cityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="project-area" className={labelClass}>Area</label>
            <input id="project-area" value={area} onChange={(event) => setArea(event.target.value)} placeholder="Neighbourhood or district" className={inputClass} />
          </div>
          <div>
            <label htmlFor="project-latitude" className={labelClass}>Latitude</label>
            <input id="project-latitude" type="number" step="any" value={lat} onChange={(event) => setLat(event.target.value)} placeholder="e.g. 6.4401" className={inputClass} />
          </div>
          <div>
            <label htmlFor="project-longitude" className={labelClass}>Longitude</label>
            <input id="project-longitude" type="number" step="any" value={lng} onChange={(event) => setLng(event.target.value)} placeholder="e.g. 3.5104" className={inputClass} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant/10 bg-white p-6">
        <h2 className="text-xl font-black">Features and media</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <ChipInput
            id="project-amenities"
            label="Amenities"
            placeholder="Type amenity and press Enter"
            value={amenities}
            draft={amenityInput}
            onDraftChange={setAmenityInput}
            onAdd={() => addListItem(amenityInput, setAmenityInput, setAmenities)}
            onRemove={(item) => setAmenities((current) => current.filter((value) => value !== item))}
          />
          <ChipInput
            id="project-features"
            label="Features"
            placeholder="Type feature and press Enter"
            value={features}
            draft={featureInput}
            onDraftChange={setFeatureInput}
            onAdd={() => addListItem(featureInput, setFeatureInput, setFeatures)}
            onRemove={(item) => setFeatures((current) => current.filter((value) => value !== item))}
          />
          <div>
            <label htmlFor="project-launch-date" className={labelClass}>Launch date</label>
            <input id="project-launch-date" type="date" value={launchDate} onChange={(event) => setLaunchDate(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="project-completion-date" className={labelClass}>Expected completion date</label>
            <input id="project-completion-date" type="date" value={completionDate} onChange={(event) => setCompletionDate(event.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="mt-5" role="group" aria-labelledby="project-media-label">
          <h3 id="project-media-label" className={labelClass}>Project media</h3>
          <MediaUploader value={media} onChange={setMedia} />
          <p className="mt-2 text-xs text-secondary">The first uploaded media item is used as the cover image.</p>
        </div>
      </section>

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
};

export default ProjectForm;
