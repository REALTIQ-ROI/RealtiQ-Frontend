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
  preserveEmptyValues?: boolean;
  isLoading?: boolean;
  serverErrors?: Record<string, string>;
}

const projectTypes: ProjectType[] = ['estate', 'apartment_development', 'residential', 'commercial', 'mixed_use', 'housing_project', 'other'];
const developmentStructures = ['Estate / gated community', 'Apartment building', 'Mixed-use development', 'Commercial complex', 'Other'] as const;
const unitDisplayModes = ['Grouped by unit type', 'Individual units'] as const;
const accessRoadOptions = ['Tarred', 'Untarred', 'Flood-prone', 'Sand-filled area'] as const;
const buildStages = ['Off-plan', 'Under construction', 'Uncompleted building', 'Semi-finished (Advanced Shell / Lock-up)', 'Newly built', 'Renovated', 'Previously owned', 'Old'] as const;
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

const ProjectForm = ({ initialData, onSubmit, submitLabel = 'Save Project', preserveEmptyValues = false, isLoading = false, serverErrors = {} }: ProjectFormProps) => {
  const canonical = initialData?.canonicalFields ?? {};
  const canonicalText = (key: string) => typeof canonical[key] === 'string' ? canonical[key] as string : '';
  const pin = canonical.projectPin && typeof canonical.projectPin === 'object' ? canonical.projectPin as { lat?: unknown; lng?: unknown } : null;
  const [name, setName] = useState(initialData?.name ?? '');
  const [projectType, setProjectType] = useState<ProjectType>(initialData?.projectType ?? 'estate');
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [address, setAddress] = useState(initialData?.address ?? '');
  const [state, setState] = useState(initialData?.state ?? initialData?.location?.state ?? '');
  const [city, setCity] = useState(initialData?.city ?? initialData?.location?.city ?? '');
  const [area, setArea] = useState(initialData?.area ?? (typeof canonical.area === 'string' ? canonical.area : initialData?.location?.area ?? ''));
  const [lat, setLat] = useState((typeof pin?.lat === 'number' ? pin.lat : initialData?.coordinates?.lat)?.toString() ?? '');
  const [lng, setLng] = useState((typeof pin?.lng === 'number' ? pin.lng : initialData?.coordinates?.lng)?.toString() ?? '');
  const [amenities, setAmenities] = useState<string[]>(initialData?.amenities ?? []);
  const [amenityInput, setAmenityInput] = useState('');
  const [features, setFeatures] = useState<string[]>(initialData?.features ?? []);
  const [featureInput, setFeatureInput] = useState('');
  const [completionDate, setCompletionDate] = useState(initialData?.completionDate?.slice(0, 10) ?? '');
  const [launchDate, setLaunchDate] = useState(initialData?.launchDate?.slice(0, 10) ?? '');
  const [developmentStructure, setDevelopmentStructure] = useState(canonicalText('developmentStructure'));
  const [unitDisplayMode, setUnitDisplayMode] = useState(canonicalText('unitDisplayMode'));
  const [gatedEstate, setGatedEstate] = useState(typeof canonical.gatedEstate === 'boolean' ? String(canonical.gatedEstate) : '');
  const [estateName, setEstateName] = useState(canonicalText('estateName'));
  const [lga, setLga] = useState(canonicalText('lga'));
  const [accessRoadConditions, setAccessRoadConditions] = useState<string[]>(Array.isArray(canonical.accessRoadConditions) ? canonical.accessRoadConditions.filter((item): item is string => typeof item === 'string') : []);
  const [buildStage, setBuildStage] = useState(canonicalText('buildStage'));
  const [media, setMedia] = useState<MediaItem[]>(toMediaItems(initialData?.media));
  const [saving, setSaving] = useState(false);
  const cityOptions = state ? nigeriaStateCities[state] ?? [] : [];
  const incompleteCanonicalIntake = [
    !developmentStructure && 'development structure',
    !shortDescription.trim() && 'short description',
    !description.trim() && 'project description',
    !unitDisplayMode && 'unit display mode',
    !state.trim() && 'state',
    !lga.trim() && 'Local Government Area',
    !area.trim() && 'area',
    !lat.trim() && !lng.trim() && 'map pin',
    gatedEstate === '' && 'gated-estate selection',
    gatedEstate === 'true' && !estateName.trim() && 'estate name',
    !accessRoadConditions.length && 'access road conditions',
    !buildStage && 'build stage',
  ].filter((item): item is string => Boolean(item));

  const addListItem = (draft: string, setDraft: (value: string) => void, setItems: Dispatch<SetStateAction<string[]>>) => {
    const trimmed = draft.trim();
    if (trimmed) {
      setItems((current) => current.includes(trimmed) ? current : [...current, trimmed]);
    }
    setDraft('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error('Project name is required.');
      return;
    }
    const coordinates = lat.trim() && lng.trim() ? { lat: Number(lat), lng: Number(lng) } : undefined;
    if (coordinates && (!Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng))) {
      toast.error('Project coordinates must be valid numbers.');
      return;
    }
    if (Boolean(lat.trim()) !== Boolean(lng.trim())) {
      toast.error('Enter both coordinates or clear both values.');
      return;
    }
    setSaving(true);
    try {
      const canonicalFields: Record<string, unknown> = { projectName: name.trim() };
      if (developmentStructure) canonicalFields.developmentStructure = developmentStructure;
      if (shortDescription.trim() || preserveEmptyValues) canonicalFields.shortDescription = shortDescription.trim();
      if (description.trim() || preserveEmptyValues) canonicalFields.projectDescription = description.trim();
      if (unitDisplayMode) canonicalFields.unitDisplayMode = unitDisplayMode;
      if (state.trim()) canonicalFields.state = state.trim();
      if (lga.trim() || preserveEmptyValues) canonicalFields.lga = lga.trim();
      if (area.trim() || preserveEmptyValues) canonicalFields.area = area.trim();
      if (gatedEstate !== '') canonicalFields.gatedEstate = gatedEstate === 'true';
      if (gatedEstate === 'true' && (estateName.trim() || preserveEmptyValues)) canonicalFields.estateName = estateName.trim();
      if (coordinates) canonicalFields.projectPin = coordinates;
      if (accessRoadConditions.length || preserveEmptyValues) canonicalFields.accessRoadConditions = [...accessRoadConditions];
      if (buildStage) canonicalFields.buildStage = buildStage;
      await onSubmit({
        canonicalFields,
        name: name.trim(),
        projectType,
        shortDescription: shortDescription.trim() || (preserveEmptyValues ? '' : undefined),
        description: description.trim(),
        address: address.trim() || (preserveEmptyValues ? '' : undefined),
        country: 'Nigeria',
        state: state.trim(),
        city: city.trim(),
        area: area.trim() || (preserveEmptyValues ? '' : undefined),
        coordinates: coordinates ?? (preserveEmptyValues ? null : undefined),
        amenities,
        features,
        media: toProjectMedia(media),
        completionDate: completionDate || (preserveEmptyValues ? '' : undefined),
        launchDate: launchDate || (preserveEmptyValues ? '' : undefined),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
      {Object.keys(serverErrors).length ? <div role="alert" className="rounded-lg bg-error-container p-4 text-sm text-on-error-container"><p className="font-bold">The server needs these project fields corrected:</p><ul className="mt-2 list-disc space-y-1 pl-5">{Object.entries(serverErrors).map(([field, message]) => <li key={field}><span className="font-semibold">{field.replaceAll('_', ' ')}:</span> {message}</li>)}</ul></div> : null}
      <fieldset className="space-y-6">
      <section className="rounded-xl border border-outline-variant/10 bg-white p-6">
        <h2 className="text-xl font-black">Project information</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="project-name" className={labelClass}>Project name</label>
            <input id="project-name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
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
        <h2 className="text-xl font-black">Canonical project intake</h2>
        <p className="mt-1 text-sm text-secondary">These fields use the project canonical dictionary. Drafts can be saved while intake is incomplete; the server decides publication readiness.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="project-development-structure" className={labelClass}>Development structure</label>
            <select id="project-development-structure" value={developmentStructure} onChange={(event) => setDevelopmentStructure(event.target.value)} className={inputClass}>
              <option value="">Not specified</option>{developmentStructures.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="project-unit-display-mode" className={labelClass}>Unit display mode</label>
            <select id="project-unit-display-mode" value={unitDisplayMode} onChange={(event) => setUnitDisplayMode(event.target.value)} className={inputClass}>
              <option value="">Not specified</option>{unitDisplayModes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="project-gated-estate" className={labelClass}>Gated estate</label>
            <select id="project-gated-estate" value={gatedEstate} onChange={(event) => setGatedEstate(event.target.value)} className={inputClass}>
              <option value="">Not specified</option><option value="true">Yes</option><option value="false">No</option>
            </select>
          </div>
          {gatedEstate === 'true' ? <div>
            <label htmlFor="project-estate-name" className={labelClass}>Estate name</label>
            <input id="project-estate-name" value={estateName} onChange={(event) => setEstateName(event.target.value)} className={inputClass} />
          </div> : null}
          <div>
            <label htmlFor="project-lga" className={labelClass}>Local Government Area</label>
            <input id="project-lga" value={lga} onChange={(event) => setLga(event.target.value)} className={inputClass} placeholder="Validated against approved location data" />
          </div>
          <div>
            <label htmlFor="project-build-stage" className={labelClass}>Build stage</label>
            <select id="project-build-stage" value={buildStage} onChange={(event) => setBuildStage(event.target.value)} className={inputClass}>
              <option value="">Not specified</option>{buildStages.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <fieldset className="md:col-span-2">
            <legend className={labelClass}>Access road conditions</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {accessRoadOptions.map((item) => <label key={item} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={accessRoadConditions.includes(item)} onChange={(event) => setAccessRoadConditions((current) => event.target.checked ? [...current, item] : current.filter((value) => value !== item))} />{item}</label>)}
            </div>
          </fieldset>
        </div>
        {incompleteCanonicalIntake.length ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Draft intake fields still to complete: {incompleteCanonicalIntake.join(', ')}. Server publication readiness remains authoritative.</p> : <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">The visible required project intake fields are populated. The server still decides publication readiness.</p>}
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
          <MediaUploader value={media} onChange={setMedia} disabled={preserveEmptyValues} />
          {preserveEmptyValues ? <p className="mt-2 text-xs text-secondary">Existing project media remains attached. The handoff does not define the request body for the separate media-association route, so media changes are withheld on edit.</p> : null}
          <p className="mt-2 text-xs text-secondary">The first uploaded media item is used as the cover image.</p>
        </div>
      </section>

      <Button type="submit" disabled={saving || isLoading}>
        {saving ? 'Saving...' : isLoading ? 'Waiting for verification...' : submitLabel}
      </Button>
      </fieldset>
    </form>
  );
};

export default ProjectForm;
