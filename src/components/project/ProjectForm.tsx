import { useState, type Dispatch, type FormEvent, type KeyboardEvent, type SetStateAction } from 'react';
import { toast } from 'sonner';
import type { CreateProjectRequest } from '../../services/projectService';
import type { MediaItem, ProjectDetail, ProjectMedia, ProjectType } from '../../types';
import { nigeriaStateCities, nigeriaStates } from '../../utils/nigeriaLocations';
import { getCanonicalField, parseCanonicalInput, serializeCanonicalChanges } from '../../utils/canonicalFieldRegistry';
import MediaUploader from '../property/MediaUploader';
import Button from '../ui/Button';
import CanonicalFieldMutationsEditor from '../canonical/CanonicalFieldMutationsEditor';
import { useCanonicalFieldDictionary } from '../../hooks/useCanonicalFieldDictionary';
import { reconcileCanonicalFieldRegistry, serializeCanonicalMutationDrafts, type CanonicalMutationDraft } from '../../utils/canonicalFieldRegistry';

interface ProjectFormProps {
  initialData?: ProjectDetail;
  onSubmit: (payload: CreateProjectRequest) => Promise<void>;
  submitLabel?: string;
  preserveEmptyValues?: boolean;
  isLoading?: boolean;
  serverErrors?: Record<string, string>;
}

const projectTypes: ProjectType[] = ['estate', 'apartment_development', 'residential', 'commercial', 'mixed_use', 'housing_project', 'other'];
const developmentStructures = getCanonicalField('developmentStructure')?.options ?? [];
const unitDisplayModes = getCanonicalField('unitDisplayMode')?.options ?? [];
const accessRoadOptions = getCanonicalField('accessRoadConditions')?.options ?? [];
const buildStages = getCanonicalField('buildStage')?.options ?? [];
const paymentOptionValues = getCanonicalField('paymentOptions')?.options ?? [];
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
  const isEdit = Boolean(initialData);
  const canonical = initialData?.canonicalFields ?? {};
  const canonicalText = (key: string) => typeof canonical[key] === 'string' ? canonical[key] as string : '';
  const hasCanonicalField = (key: string) => Object.prototype.hasOwnProperty.call(canonical, key);
  const canonicalTextOr = (key: string, fallback?: string) => hasCanonicalField(key) && typeof canonical[key] === 'string' ? canonical[key] as string : fallback ?? '';
  const pin = canonical.projectPin && typeof canonical.projectPin === 'object' ? canonical.projectPin as { lat?: unknown; lng?: unknown } : null;
  const [name, setName] = useState(canonicalTextOr('projectName', initialData?.name));
  const [projectType, setProjectType] = useState<ProjectType>(initialData?.projectType ?? 'estate');
  const [shortDescription, setShortDescription] = useState(canonicalTextOr('shortDescription', initialData?.shortDescription));
  const [description, setDescription] = useState(canonicalTextOr('projectDescription', initialData?.description));
  const [address, setAddress] = useState(initialData?.address ?? '');
  const [state, setState] = useState(canonicalTextOr('state', initialData?.state ?? initialData?.location?.state));
  const [city, setCity] = useState(initialData?.city ?? initialData?.location?.city ?? '');
  const [area, setArea] = useState(canonicalTextOr('area', initialData?.area ?? initialData?.location?.area));
  const [lat, setLat] = useState((typeof pin?.lat === 'number' ? pin.lat : initialData?.coordinates?.lat)?.toString() ?? '');
  const [lng, setLng] = useState((typeof pin?.lng === 'number' ? pin.lng : initialData?.coordinates?.lng)?.toString() ?? '');
  const [amenities, setAmenities] = useState<string[]>(initialData?.amenities ?? []);
  const [amenityInput, setAmenityInput] = useState('');
  const [features, setFeatures] = useState<string[]>(initialData?.features ?? []);
  const [featureInput, setFeatureInput] = useState('');
  const [completionDate, setCompletionDate] = useState(initialData?.completionDate?.slice(0, 10) ?? '');
  const [launchDate, setLaunchDate] = useState(canonicalTextOr('launchDate', initialData?.launchDate?.slice(0, 10)));
  const [approximateUnitCount, setApproximateUnitCount] = useState(typeof canonical.approximateUnitCount === 'number' ? String(canonical.approximateUnitCount) : '');
  const [servicedStatus, setServicedStatus] = useState(canonicalText('servicedStatus'));
  const [paymentOptions, setPaymentOptions] = useState<string[]>(Array.isArray(canonical.paymentOptions) ? canonical.paymentOptions.filter((item): item is string => typeof item === 'string') : []);
  const [paymentOptionsTouched, setPaymentOptionsTouched] = useState(false);
  const savedMortgageOption = paymentOptions.includes('Mortgage Accepted');
  const [maximumInstallmentMonths, setMaximumInstallmentMonths] = useState(canonical.maximumInstallmentMonths == null ? '' : String(canonical.maximumInstallmentMonths));
  const [initialDepositPercent, setInitialDepositPercent] = useState(canonical.initialDepositPercent == null ? '' : String(canonical.initialDepositPercent));
  const [transactionFeePayer, setTransactionFeePayer] = useState(canonicalText('transactionFeePayer'));
  const [privateShowingsByAppointment, setPrivateShowingsByAppointment] = useState(typeof canonical.privateShowingsByAppointment === 'boolean' ? String(canonical.privateShowingsByAppointment) : '');
  const [liveVideoTourAvailable, setLiveVideoTourAvailable] = useState(typeof canonical.liveVideoTourAvailable === 'boolean' ? String(canonical.liveVideoTourAvailable) : '');
  const [developmentStructure, setDevelopmentStructure] = useState(canonicalText('developmentStructure'));
  const [unitDisplayMode, setUnitDisplayMode] = useState(canonicalText('unitDisplayMode'));
  const [gatedEstate, setGatedEstate] = useState(typeof canonical.gatedEstate === 'boolean' ? String(canonical.gatedEstate) : '');
  const [estateName, setEstateName] = useState(canonicalText('estateName'));
  const [canonicalStreetAddress, setCanonicalStreetAddress] = useState(canonicalTextOr('streetAddress', initialData?.address));
  const [lga, setLga] = useState(canonicalText('lga'));
  const [accessRoadConditions, setAccessRoadConditions] = useState<string[]>(Array.isArray(canonical.accessRoadConditions) ? canonical.accessRoadConditions.filter((item): item is string => typeof item === 'string') : []);
  const [accessRoadTouched, setAccessRoadTouched] = useState(false);
  const [buildStage, setBuildStage] = useState(canonicalText('buildStage'));
  const [media, setMedia] = useState<MediaItem[]>(toMediaItems(initialData?.media));
  const [canonicalMutationDrafts, setCanonicalMutationDrafts] = useState<CanonicalMutationDraft[]>([]);
  const { dictionary } = useCanonicalFieldDictionary();
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
    !servicedStatus && 'serviced status',
    gatedEstate === 'false' && !canonicalStreetAddress.trim() && 'street address',
    !paymentOptions.length && 'payment options',
    !transactionFeePayer && 'transaction fee payer before publication',
    paymentOptions.includes('Instalment Plan') && !maximumInstallmentMonths.trim() && 'maximum instalment months',
    paymentOptions.includes('Instalment Plan') && !initialDepositPercent.trim() && 'initial deposit percentage',
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
    const pinResetRequested = canonicalMutationDrafts.some((draft) => draft.field === 'projectPin' && draft.operation !== 'set');
    if (isEdit && (hasCanonicalField('projectPin') || Boolean(initialData?.coordinates)) && !lat.trim() && !lng.trim() && !pinResetRequested) {
      toast.error('The saved map pin cannot be cleared through an empty coordinate input. Choose an allowed unset/null operation from the canonical field editor.');
      return;
    }
    const canonicalDraft: Record<string, unknown> = {};
    if (!isEdit || hasCanonicalField('projectName') || name.trim() !== (initialData?.name ?? '')) canonicalDraft.projectName = name.trim();
    const canonicalErrors: string[] = [];
    const hasSavedCanonicalValue = (key: string) => hasCanonicalField(key) && canonical[key] !== null && canonical[key] !== '';
    const clearableTextControls: Array<[string, string]> = [
      ['shortDescription', shortDescription], ['projectDescription', description], ['state', state], ['lga', lga], ['area', area], ['launchDate', launchDate],
      ...(gatedEstate === 'true' ? [['estateName', estateName] as [string, string]] : []),
      ...(gatedEstate === 'false' ? [['streetAddress', canonicalStreetAddress] as [string, string]] : []),
    ];
    if (isEdit && clearableTextControls.some(([key, value]) => hasSavedCanonicalValue(key) && !value.trim())) {
      canonicalErrors.push('A saved canonical value was cleared. Omission means no mutation and no reset operation is documented for these fields; restore the value before saving.');
    }
    const enumInputs: Array<[string, string]> = [['developmentStructure', developmentStructure], ['unitDisplayMode', unitDisplayMode], ['buildStage', buildStage], ['servicedStatus', servicedStatus], ['transactionFeePayer', transactionFeePayer]];
    for (const [key, value] of enumInputs) {
      if (!value) continue;
      const definition = getCanonicalField(key);
      const parsed = definition ? parseCanonicalInput(definition, value) : null;
      if (!parsed || !parsed.ok) canonicalErrors.push(parsed && !parsed.ok ? parsed.error : `Unsupported ${key} value.`);
      else canonicalDraft[key] = parsed.value;
    }
    if ((shortDescription.trim() || preserveEmptyValues) && (!isEdit || hasCanonicalField('shortDescription') || shortDescription.trim() !== (initialData?.shortDescription ?? ''))) canonicalDraft.shortDescription = shortDescription.trim();
    if ((description.trim() || preserveEmptyValues) && (!isEdit || hasCanonicalField('projectDescription') || description.trim() !== (initialData?.description ?? ''))) canonicalDraft.projectDescription = description.trim();
    if (state.trim() && (!isEdit || hasCanonicalField('state') || state.trim() !== (initialData?.state ?? initialData?.location?.state ?? ''))) canonicalDraft.state = state.trim();
    if ((lga.trim() || preserveEmptyValues) && (!isEdit || hasCanonicalField('lga') || lga.trim() !== '')) canonicalDraft.lga = lga.trim();
    if ((area.trim() || preserveEmptyValues) && (!isEdit || hasCanonicalField('area') || area.trim() !== (initialData?.area ?? initialData?.location?.area ?? ''))) canonicalDraft.area = area.trim();
    if (gatedEstate === 'false' && (canonicalStreetAddress.trim() || preserveEmptyValues) && (!isEdit || hasCanonicalField('streetAddress') || canonicalStreetAddress.trim() !== (initialData?.address ?? ''))) canonicalDraft.streetAddress = canonicalStreetAddress.trim();
    if (gatedEstate !== '') {
      const parsed = parseCanonicalInput(getCanonicalField('gatedEstate')!, gatedEstate);
      if (parsed.ok) canonicalDraft.gatedEstate = parsed.value;
      else canonicalErrors.push(parsed.error);
    }
    if (paymentOptionsTouched) {
      if (!paymentOptions.length) canonicalErrors.push('Choose at least one payment option. Clearing the saved options requires a reset operation that is not documented.');
      else if (savedMortgageOption) canonicalErrors.push('Payment options cannot be changed while Mortgage Accepted is present because the active Mortgage Partner gate is unavailable.');
      else if (!paymentOptions.includes('Instalment Plan') && (hasSavedCanonicalValue('maximumInstallmentMonths') || hasSavedCanonicalValue('initialDepositPercent'))) canonicalErrors.push('Saved instalment terms cannot be cleared when removing Instalment Plan because no reset operation is documented.');
      else if (paymentOptions.some((item) => !paymentOptionValues.includes(item))) canonicalErrors.push('A selected payment option is not in the canonical dictionary.');
      else canonicalDraft.paymentOptions = [...paymentOptions];
    }
    if (paymentOptions.includes('Instalment Plan')) {
      if (hasSavedCanonicalValue('maximumInstallmentMonths') && !maximumInstallmentMonths.trim()) canonicalErrors.push('The saved maximum instalment term cannot be cleared because no reset operation is documented.');
      if (hasSavedCanonicalValue('initialDepositPercent') && !initialDepositPercent.trim()) canonicalErrors.push('The saved initial deposit cannot be cleared because no reset operation is documented.');
      if (maximumInstallmentMonths.trim()) {
        const parsed = parseCanonicalInput(getCanonicalField('maximumInstallmentMonths')!, maximumInstallmentMonths);
        if (parsed.ok) canonicalDraft.maximumInstallmentMonths = parsed.value;
        else canonicalErrors.push(parsed.error);
      }
      if (initialDepositPercent.trim()) {
        const parsed = parseCanonicalInput(getCanonicalField('initialDepositPercent')!, initialDepositPercent);
        if (parsed.ok) canonicalDraft.initialDepositPercent = parsed.value;
        else canonicalErrors.push(parsed.error);
      }
    }
    for (const [key, raw] of [['privateShowingsByAppointment', privateShowingsByAppointment], ['liveVideoTourAvailable', liveVideoTourAvailable]] as const) {
      if (!raw) continue;
      const parsed = parseCanonicalInput(getCanonicalField(key)!, raw);
      if (parsed.ok) canonicalDraft[key] = parsed.value;
      else canonicalErrors.push(parsed.error);
    }
    if (isEdit && gatedEstate !== '' && (canonical.gatedEstate === undefined || canonical.gatedEstate !== (gatedEstate === 'true'))) {
      const fieldsToClear = gatedEstate === 'true' ? ['streetAddress'] : ['estateName'];
      if (fieldsToClear.some((key) => Object.prototype.hasOwnProperty.call(canonical, key) && canonical[key] !== null && canonical[key] !== '')) canonicalErrors.push('Changing the address path would leave saved values in the other path. No reset operation is documented for those fields.');
    }
    if (gatedEstate === 'true' && (estateName.trim() || preserveEmptyValues)) canonicalDraft.estateName = estateName.trim();
    const initialCoordinates = initialData?.coordinates;
    if (coordinates && (!isEdit || hasCanonicalField('projectPin') || coordinates.lat !== initialCoordinates?.lat || coordinates.lng !== initialCoordinates?.lng)) canonicalDraft.projectPin = coordinates;
    if (accessRoadTouched) {
      if (!accessRoadConditions.length) canonicalErrors.push('Choose at least one access road condition. Clearing the last saved condition requires a reset operation that is not documented.');
      else if (accessRoadConditions.some((item) => !accessRoadOptions.includes(item))) canonicalErrors.push('Choose only documented access road conditions.');
      else canonicalDraft.accessRoadConditions = [...accessRoadConditions];
    }
    if (launchDate && (!isEdit || hasCanonicalField('launchDate') || launchDate !== (initialData?.launchDate?.slice(0, 10) ?? ''))) {
      const parsed = parseCanonicalInput(getCanonicalField('launchDate')!, launchDate);
      if (parsed.ok) canonicalDraft.launchDate = parsed.value;
      else canonicalErrors.push(parsed.error);
    }
    if (approximateUnitCount.trim()) {
      const parsed = parseCanonicalInput(getCanonicalField('approximateUnitCount')!, approximateUnitCount);
      if (parsed.ok) canonicalDraft.approximateUnitCount = parsed.value;
      else canonicalErrors.push(parsed.error);
    }
    if (canonicalErrors.length) {
      toast.error(canonicalErrors.join(' '));
      return;
    }
    const canonicalFields = serializeCanonicalChanges(canonical, canonicalDraft);
    let canonicalFieldMutations: CreateProjectRequest['canonicalFieldMutations'] = [];
    if (canonicalMutationDrafts.length) {
      if (!dictionary) { toast.error('Canonical field policy is unavailable. Refresh it before saving these fields.'); return; }
      const serialized = serializeCanonicalMutationDrafts(canonicalMutationDrafts, reconcileCanonicalFieldRegistry(dictionary), 'project');
      if (Object.keys(serialized.errors).length) { toast.error(Object.values(serialized.errors).join(' ')); return; }
      if (isEdit) canonicalFieldMutations = serialized.mutations;
      else {
        const extraFields = Object.fromEntries(serialized.mutations.filter((item) => item.operation === 'set').map((item) => [item.field, item.value]));
        Object.assign(canonicalFields, extraFields);
      }
    }
    const duplicateCanonicalField = canonicalFieldMutations.find((mutation) => Object.prototype.hasOwnProperty.call(canonicalFields, mutation.field));
    if (duplicateCanonicalField) {
      toast.error(`${duplicateCanonicalField.field} is already changed in the main form. Remove its duplicate entry from Additional canonical project fields.`);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        canonicalFields,
        ...(canonicalFieldMutations.length ? { canonicalFieldMutations } : {}),
        name: name.trim(),
        projectType,
        shortDescription: shortDescription.trim() || (preserveEmptyValues ? '' : undefined),
        description: description.trim(),
        address: address.trim() || (preserveEmptyValues ? '' : undefined),
        country: 'Nigeria',
        state: state.trim(),
        city: city.trim(),
        area: area.trim() || (preserveEmptyValues ? '' : undefined),
        coordinates,
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

      <CanonicalFieldMutationsEditor
        target="project"
        title="Additional canonical project fields"
        value={canonicalMutationDrafts}
        onChange={setCanonicalMutationDrafts}
        canonicalFields={canonical}
        effectiveFields={initialData?.effectiveFields}
        fieldSources={initialData?.fieldSources}
        createMode={!isEdit}
        exclude={['projectName', 'developmentStructure', 'shortDescription', 'projectDescription', 'unitDisplayMode', 'state', 'lga', 'area', 'gatedEstate', 'estateName', 'streetAddress', 'accessRoadConditions', 'buildStage', 'launchDate', 'approximateUnitCount', 'servicedStatus', 'paymentOptions', 'maximumInstallmentMonths', 'initialDepositPercent', 'transactionFeePayer', 'privateShowingsByAppointment', 'liveVideoTourAvailable', ...(!isEdit ? ['projectPin'] : [])]}
      />

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
            <label htmlFor="project-launch-date" className={labelClass}>Launch date <span className="normal-case tracking-normal">(optional)</span></label>
            <input id="project-launch-date" type="date" value={launchDate} onChange={(event) => setLaunchDate(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="project-approximate-unit-count" className={labelClass}>Approximate unit count <span className="normal-case tracking-normal">(optional)</span></label>
            <input id="project-approximate-unit-count" type="number" min={1} step={1} value={approximateUnitCount} onChange={(event) => setApproximateUnitCount(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="project-serviced-status" className={labelClass}>Serviced status</label>
            <select id="project-serviced-status" value={servicedStatus} onChange={(event) => setServicedStatus(event.target.value)} className={inputClass}>
              <option value="">Not specified</option>{getCanonicalField('servicedStatus')?.options?.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="project-gated-estate" className={labelClass}>Gated estate</label>
            <select id="project-gated-estate" value={gatedEstate} onChange={(event) => setGatedEstate(event.target.value)} className={inputClass}>
              <option value="">Not specified</option><option value="true">Yes</option><option value="false">No</option>
            </select>
          </div>
          {gatedEstate === 'false' ? <div>
            <label htmlFor="project-canonical-street-address" className={labelClass}>Canonical street address</label>
            <input id="project-canonical-street-address" value={canonicalStreetAddress} onChange={(event) => { setCanonicalStreetAddress(event.target.value); if (!isEdit || !hasCanonicalField('streetAddress')) setAddress(event.target.value); }} className={inputClass} />
          </div> : null}
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
              {accessRoadOptions.map((item) => <label key={item} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={accessRoadConditions.includes(item)} onChange={(event) => { setAccessRoadTouched(true); setAccessRoadConditions((current) => event.target.checked ? [...current, item] : current.filter((value) => value !== item)); }} />{item}</label>)}
            </div>
          </fieldset>
          <fieldset className="md:col-span-2">
            <legend className={labelClass}>Payment options</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {paymentOptionValues.map((item) => {
                const gated = item === 'Mortgage Accepted';
                return <label key={item} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={paymentOptions.includes(item)} disabled={gated || savedMortgageOption} onChange={(event) => { setPaymentOptionsTouched(true); setPaymentOptions((current) => event.target.checked ? [...current, item] : current.filter((value) => value !== item)); }} />{item}{gated ? <span className="text-xs text-secondary">(active Mortgage Partner policy required)</span> : null}</label>;
              })}
            </div>
            <p className="mt-2 text-xs text-secondary">Mortgage Accepted remains controlled by the active Mortgage Partner policy. Existing server values are retained in an edit but cannot be added or removed here.</p>
          </fieldset>
          {paymentOptions.includes('Instalment Plan') ? <>
            <div>
              <label htmlFor="project-maximum-installment-months" className={labelClass}>Maximum instalment months</label>
              <input id="project-maximum-installment-months" type="number" min={1} step={1} value={maximumInstallmentMonths} onChange={(event) => setMaximumInstallmentMonths(event.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="project-initial-deposit-percent" className={labelClass}>Initial deposit (%)</label>
              <input id="project-initial-deposit-percent" type="number" min={0} max={100} step="any" value={initialDepositPercent} onChange={(event) => setInitialDepositPercent(event.target.value)} className={inputClass} />
            </div>
          </> : null}
          <div>
            <label htmlFor="project-transaction-fee-payer" className={labelClass}>Transaction fee payer</label>
            <select id="project-transaction-fee-payer" value={transactionFeePayer} onChange={(event) => setTransactionFeePayer(event.target.value)} className={inputClass}>
              <option value="">Not specified</option>{getCanonicalField('transactionFeePayer')?.options?.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <p className="mt-1 text-xs text-secondary">Required for publication; the server decides readiness.</p>
          </div>
          <div>
            <label htmlFor="project-private-showings" className={labelClass}>Private showings by appointment</label>
            <select id="project-private-showings" value={privateShowingsByAppointment} onChange={(event) => setPrivateShowingsByAppointment(event.target.value)} className={inputClass}><option value="">Not specified</option><option value="true">Yes</option><option value="false">No</option></select>
          </div>
          <div>
            <label htmlFor="project-live-video-tour" className={labelClass}>Live video tour available</label>
            <select id="project-live-video-tour" value={liveVideoTourAvailable} onChange={(event) => setLiveVideoTourAvailable(event.target.value)} className={inputClass}><option value="">Not specified</option><option value="true">Yes</option><option value="false">No</option></select>
          </div>
        </div>
        {incompleteCanonicalIntake.length ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Draft intake fields still to complete: {incompleteCanonicalIntake.join(', ')}. Server publication readiness remains authoritative.</p> : <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">The visible required project intake fields are populated. The server still decides publication readiness.</p>}
        <p role="note" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Annual service charge is a canonical `money_or_none` value; the handoff does not define its exact request representation, and explicit None differs from unanswered. This form preserves drafts and does not send that field.</p>
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
            <label htmlFor="project-completion-date" className={labelClass}>Expected completion date</label>
            <input id="project-completion-date" type="date" value={completionDate} onChange={(event) => setCompletionDate(event.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="mt-5" role="group" aria-labelledby="project-media-label">
          <h3 id="project-media-label" className={labelClass}>Project media</h3>
          <MediaUploader value={media} onChange={setMedia} />
          {preserveEmptyValues ? <p className="mt-2 text-xs text-secondary">Saving replaces the complete project media association list. Removing every item clears the list.</p> : null}
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
