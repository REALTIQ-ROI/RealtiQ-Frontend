import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { CreateProjectRequest } from '../../services/projectService';
import type { MediaItem, ProjectDetail, ProjectType } from '../../types';
import { parseCanonicalInput, serializeCanonicalChanges } from '../../utils/canonicalFieldRegistry';
import MediaUploader from '../property/MediaUploader';
import LocationCascadeFields from '../property/LocationCascadeFields';
import { resolveCurrentLocationCascade, type LocationCascadeSelection, type LocationSuggestionLevel } from '../../services/locationService';
import Button from '../ui/Button';
import CanonicalFieldMutationsEditor from '../canonical/CanonicalFieldMutationsEditor';
import { useCanonicalFieldDictionary } from '../../hooks/useCanonicalFieldDictionary';
import { reconcileCanonicalFieldRegistry, serializeCanonicalMutationDrafts, type CanonicalMutationDraft } from '../../utils/canonicalFieldRegistry';
import { mediaItemsToProjectMedia, projectMediaToItems } from '../../utils/projectMedia';
import { amenityGroupsForField, dictionaryVocabularyOptions, fieldVocabularyOptions } from '../../utils/propertyVocabulary';

interface ProjectFormProps {
  initialData?: ProjectDetail;
  onSubmit: (payload: CreateProjectRequest) => Promise<void>;
  submitLabel?: string;
  preserveEmptyValues?: boolean;
  isLoading?: boolean;
  serverErrors?: Record<string, string>;
}

const inputClass = 'w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20';
const labelClass = 'block text-xs font-bold uppercase tracking-widest text-secondary mb-2';
const dateTimeLocalValue = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const ProjectForm = ({ initialData, onSubmit, submitLabel = 'Save Project', preserveEmptyValues = false, isLoading = false, serverErrors = {} }: ProjectFormProps) => {
  const isEdit = Boolean(initialData);
  const canonical = initialData?.canonicalFields ?? {};
  const canonicalText = (key: string) => typeof canonical[key] === 'string' ? canonical[key] as string : '';
  const hasCanonicalField = (key: string) => Object.prototype.hasOwnProperty.call(canonical, key);
  const canonicalTextOr = (key: string, fallback?: string) => hasCanonicalField(key) && typeof canonical[key] === 'string' ? canonical[key] as string : fallback ?? '';
  const pin = canonical.projectPin && typeof canonical.projectPin === 'object' ? canonical.projectPin as { lat?: unknown; lng?: unknown } : null;
  const [name, setName] = useState(canonicalTextOr('projectName', initialData?.name));
  const [projectType, setProjectType] = useState<ProjectType | ''>(initialData?.projectType ?? '');
  const [shortDescription, setShortDescription] = useState(canonicalTextOr('shortDescription', initialData?.shortDescription));
  const [description, setDescription] = useState(canonicalTextOr('projectDescription', initialData?.description));
  const [address, setAddress] = useState(initialData?.address ?? '');
  const [locationSelection, setLocationSelection] = useState<LocationCascadeSelection>({});
  const [locationLabels, setLocationLabels] = useState<Partial<Record<LocationSuggestionLevel, string>>>({});
  const [lat, setLat] = useState((typeof pin?.lat === 'number' ? pin.lat : initialData?.coordinates?.lat)?.toString() ?? '');
  const [lng, setLng] = useState((typeof pin?.lng === 'number' ? pin.lng : initialData?.coordinates?.lng)?.toString() ?? '');
  const [facilityStates, setFacilityStates] = useState<Record<string, 'Delivered' | 'Planned' | ''>>(() => {
    const saved = canonical.estateFacilities;
    if (!Array.isArray(saved)) return {};
    return Object.fromEntries(saved.flatMap((item) => item && typeof item === 'object' && typeof (item as { key?: unknown }).key === 'string' && ['Delivered', 'Planned'].includes(String((item as { state?: unknown }).state))
      ? [[(item as { key: string }).key, (item as { state: 'Delivered' | 'Planned' }).state]] : []));
  });
  const [facilitiesTouched, setFacilitiesTouched] = useState(false);
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
  const [accessRoadConditions, setAccessRoadConditions] = useState<string[]>(Array.isArray(canonical.accessRoadConditions) ? canonical.accessRoadConditions.filter((item): item is string => typeof item === 'string') : []);
  const [accessRoadTouched, setAccessRoadTouched] = useState(false);
  const [buildStage, setBuildStage] = useState(canonicalText('buildStage'));
  const [media, setMedia] = useState<MediaItem[]>(projectMediaToItems(initialData?.media));
  const [canonicalMutationDrafts, setCanonicalMutationDrafts] = useState<CanonicalMutationDraft[]>([]);
  const { dictionary, loading: dictionaryLoading, error: dictionaryError, refresh: refreshDictionary } = useCanonicalFieldDictionary();
  const [saving, setSaving] = useState(false);
  const projectTypeOptions = fieldVocabularyOptions(dictionary?.fields.find((field) => field.key === 'projectType'), dictionary);
  const developmentStructures = dictionaryVocabularyOptions(dictionary, 'developmentStructures', dictionary?.fields.find((field) => field.key === 'developmentStructure'));
  const unitDisplayModes = dictionaryVocabularyOptions(dictionary, 'unitDisplayModes', dictionary?.fields.find((field) => field.key === 'unitDisplayMode'));
  const accessRoadOptions = fieldVocabularyOptions(dictionary?.fields.find((field) => field.key === 'accessRoadConditions'), dictionary);
  const buildStages = fieldVocabularyOptions(dictionary?.fields.find((field) => field.key === 'buildStage'), dictionary);
  const paymentOptionValues = fieldVocabularyOptions(dictionary?.fields.find((field) => field.key === 'paymentOptions'), dictionary);
  const servicedValues = dictionaryVocabularyOptions(dictionary, 'servicedValues', dictionary?.fields.find((field) => field.key === 'servicedStatus'));
  const amenityGroups = amenityGroupsForField(dictionary, dictionary?.fields.find((field) => field.key === 'estateFacilities') ?? null);
  const mortgageState = dictionary?.configuration.mortgage?.state;
  const mortgageEnabled = mortgageState === 'enabled';
  const transactionFeePayerOptions = fieldVocabularyOptions(dictionary?.fields.find((field) => field.key === 'transactionFeePayer'), dictionary);
  const incompleteCanonicalIntake = [
    !developmentStructure && 'development structure',
    !shortDescription.trim() && 'short description',
    !description.trim() && 'project description',
    !unitDisplayMode && 'unit display mode',
    !locationSelection.state && 'state',
    !locationSelection.lga && 'Local Government Area',
    !locationSelection.area && 'area',
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (dictionaryLoading) { toast.error('Wait for the current property vocabulary to load before saving this project.'); return; }
    if (!dictionary || !projectTypeOptions.some((item) => item.value === projectType)) { toast.error('Choose a current project type returned by the backend dictionary.'); return; }
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
    if (isEdit && ['state', 'lga', 'area'].some((level) => hasCanonicalField(level) && canonical[level] !== null && canonical[level] !== '' && !locationSelection[level as LocationSuggestionLevel])) {
      toast.error('The saved location has not been confirmed against the active directory. Wait for resolution or choose it again before saving.');
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
      ['shortDescription', shortDescription], ['projectDescription', description], ['launchDate', launchDate],
      ...(gatedEstate === 'true' ? [['estateName', estateName] as [string, string]] : []),
      ...(gatedEstate === 'false' ? [['streetAddress', canonicalStreetAddress] as [string, string]] : []),
    ];
    if (isEdit && clearableTextControls.some(([key, value]) => hasSavedCanonicalValue(key) && !value.trim())) {
      canonicalErrors.push('A saved canonical value was cleared. Omission means no mutation and no reset operation is documented for these fields; restore the value before saving.');
    }
    const enumInputs: Array<[string, string]> = [['developmentStructure', developmentStructure], ['unitDisplayMode', unitDisplayMode], ['buildStage', buildStage], ['servicedStatus', servicedStatus], ['transactionFeePayer', transactionFeePayer]];
    for (const [key, value] of enumInputs) {
      if (!value) continue;
      const definition = dictionary ? reconcileCanonicalFieldRegistry(dictionary).find((field) => field.key === key) : undefined;
      const parsed = definition ? parseCanonicalInput(definition, value) : null;
      if (!parsed || !parsed.ok) canonicalErrors.push(parsed && !parsed.ok ? parsed.error : `Unsupported ${key} value.`);
      else canonicalDraft[key] = parsed.value;
    }
    if ((shortDescription.trim() || preserveEmptyValues) && (!isEdit || hasCanonicalField('shortDescription') || shortDescription.trim() !== (initialData?.shortDescription ?? ''))) canonicalDraft.shortDescription = shortDescription.trim();
    if ((description.trim() || preserveEmptyValues) && (!isEdit || hasCanonicalField('projectDescription') || description.trim() !== (initialData?.description ?? ''))) canonicalDraft.projectDescription = description.trim();
    const unresolvedLocationText = Object.entries(locationLabels).some(([level, label]) => Boolean(label?.trim()) && !locationSelection[level as LocationSuggestionLevel]);
    if (unresolvedLocationText) {
      toast.error('Choose each location from the current suggestions. Typed names are labels, not valid location IDs.');
      return;
    }
    let resolvedLocations: LocationCascadeSelection;
    try {
      resolvedLocations = await resolveCurrentLocationCascade(locationSelection);
    } catch (raw: unknown) {
      toast.error(raw instanceof Error ? raw.message : 'The current location directory could not confirm this selection.');
      return;
    }
    if (gatedEstate === 'true' && !resolvedLocations.estate) {
      toast.error('Choose a current gated estate from the location directory.');
      return;
    }
    for (const level of ['state', 'lga', 'area'] as const) {
      const selected = resolvedLocations[level];
      if (selected && (!isEdit || hasCanonicalField(level) || selected.id !== canonical[level])) canonicalDraft[level] = selected.id;
    }
    if (gatedEstate === 'true' && resolvedLocations.estate && (!hasCanonicalField('estateName') || canonical.estateName !== resolvedLocations.estate.name)) canonicalDraft.estateName = resolvedLocations.estate.name;
    if (gatedEstate === 'false' && (canonicalStreetAddress.trim() || preserveEmptyValues) && (!isEdit || hasCanonicalField('streetAddress') || canonicalStreetAddress.trim() !== (initialData?.address ?? ''))) canonicalDraft.streetAddress = canonicalStreetAddress.trim();
    if (gatedEstate !== '') {
      const definition = dictionary ? reconcileCanonicalFieldRegistry(dictionary).find((field) => field.key === 'gatedEstate') : undefined;
      const parsed = definition ? parseCanonicalInput(definition, gatedEstate) : null;
      if (parsed?.ok) canonicalDraft.gatedEstate = parsed.value;
      else canonicalErrors.push(parsed && !parsed.ok ? parsed.error : 'Gated-estate field is not available in the current dictionary.');
    }
    if (paymentOptionsTouched) {
      if (!paymentOptions.length) canonicalErrors.push('Choose at least one payment option. Clearing the saved options requires a reset operation that is not documented.');
      else if (!mortgageEnabled && paymentOptions.includes('Mortgage Accepted')) canonicalErrors.push('Mortgage Accepted is unavailable while backend configuration is disabled. Clear that saved option before saving.');
      else if (!paymentOptions.includes('Instalment Plan') && (hasSavedCanonicalValue('maximumInstallmentMonths') || hasSavedCanonicalValue('initialDepositPercent'))) canonicalErrors.push('Saved instalment terms cannot be cleared when removing Instalment Plan because no reset operation is documented.');
      else if (paymentOptions.some((item) => !paymentOptionValues.some((option) => option.value === item))) canonicalErrors.push('A selected payment option is not in the current canonical dictionary.');
      else canonicalDraft.paymentOptions = [...paymentOptions];
    }
    if (paymentOptions.includes('Instalment Plan')) {
      if (hasSavedCanonicalValue('maximumInstallmentMonths') && !maximumInstallmentMonths.trim()) canonicalErrors.push('The saved maximum instalment term cannot be cleared because no reset operation is documented.');
      if (hasSavedCanonicalValue('initialDepositPercent') && !initialDepositPercent.trim()) canonicalErrors.push('The saved initial deposit cannot be cleared because no reset operation is documented.');
      if (maximumInstallmentMonths.trim()) {
        const definition = dictionary ? reconcileCanonicalFieldRegistry(dictionary).find((field) => field.key === 'maximumInstallmentMonths') : undefined;
        const parsed = definition ? parseCanonicalInput(definition, maximumInstallmentMonths) : null;
        if (parsed?.ok) canonicalDraft.maximumInstallmentMonths = parsed.value;
        else canonicalErrors.push(parsed && !parsed.ok ? parsed.error : 'Maximum installment months is not available in the current dictionary.');
      }
      if (initialDepositPercent.trim()) {
        const definition = dictionary ? reconcileCanonicalFieldRegistry(dictionary).find((field) => field.key === 'initialDepositPercent') : undefined;
        const parsed = definition ? parseCanonicalInput(definition, initialDepositPercent) : null;
        if (parsed?.ok) canonicalDraft.initialDepositPercent = parsed.value;
        else canonicalErrors.push(parsed && !parsed.ok ? parsed.error : 'Initial deposit field is not available in the current dictionary.');
      }
    }
    for (const [key, raw] of [['privateShowingsByAppointment', privateShowingsByAppointment], ['liveVideoTourAvailable', liveVideoTourAvailable]] as const) {
      if (!raw) continue;
      const definition = dictionary ? reconcileCanonicalFieldRegistry(dictionary).find((field) => field.key === key) : undefined;
      const parsed = definition ? parseCanonicalInput(definition, raw) : null;
      if (parsed?.ok) canonicalDraft[key] = parsed.value;
      else canonicalErrors.push(parsed && !parsed.ok ? parsed.error : `${key} is not available in the current dictionary.`);
    }
    if (isEdit && gatedEstate !== '' && (canonical.gatedEstate === undefined || canonical.gatedEstate !== (gatedEstate === 'true'))) {
      const fieldsToClear = gatedEstate === 'true' ? ['streetAddress'] : ['estateName'];
      if (fieldsToClear.some((key) => Object.prototype.hasOwnProperty.call(canonical, key) && canonical[key] !== null && canonical[key] !== '')) canonicalErrors.push('Changing the address path would leave saved values in the other path. No reset operation is documented for those fields.');
    }
    const initialCoordinates = initialData?.coordinates;
    if (coordinates && (!isEdit || hasCanonicalField('projectPin') || coordinates.lat !== initialCoordinates?.lat || coordinates.lng !== initialCoordinates?.lng)) canonicalDraft.projectPin = coordinates;
    if (accessRoadTouched) {
      if (!accessRoadConditions.length) canonicalErrors.push('Choose at least one access road condition. Clearing the last saved condition requires a reset operation that is not documented.');
      else if (accessRoadConditions.some((item) => !accessRoadOptions.some((option) => option.value === item))) canonicalErrors.push('Choose only current dictionary access road conditions.');
      else canonicalDraft.accessRoadConditions = [...accessRoadConditions];
    }
    if (launchDate && (!isEdit || hasCanonicalField('launchDate') || launchDate !== (initialData?.launchDate?.slice(0, 10) ?? ''))) {
      const definition = dictionary ? reconcileCanonicalFieldRegistry(dictionary).find((field) => field.key === 'launchDate') : undefined;
      const parsed = definition ? parseCanonicalInput(definition, launchDate) : null;
      if (parsed?.ok) canonicalDraft.launchDate = parsed.value;
      else canonicalErrors.push(parsed && !parsed.ok ? parsed.error : 'Launch-date field is not available in the current dictionary.');
    }
    if (approximateUnitCount.trim()) {
      const definition = dictionary ? reconcileCanonicalFieldRegistry(dictionary).find((field) => field.key === 'approximateUnitCount') : undefined;
      const parsed = definition ? parseCanonicalInput(definition, approximateUnitCount) : null;
      if (parsed?.ok) canonicalDraft.approximateUnitCount = parsed.value;
      else canonicalErrors.push(parsed && !parsed.ok ? parsed.error : 'Approximate unit count is not available in the current dictionary.');
    }
    if (facilitiesTouched) {
      const facilityOptions = dictionaryVocabularyOptions(dictionary, 'amenities', dictionary.fields.find((field) => field.key === 'estateFacilities'));
      const currentAmenityKeys = new Set(facilityOptions.map((item) => item.key ?? item.value));
      const invalid = Object.keys(facilityStates).some((key) => !currentAmenityKeys.has(key));
      if (invalid) canonicalErrors.push('A selected project facility is not in the current amenity dictionary. Refresh and review it.');
      else if (Object.values(facilityStates).some((state) => !state)) canonicalErrors.push('Choose Delivered or Planned for every selected project facility.');
      else canonicalDraft.estateFacilities = Object.entries(facilityStates).map(([key, state]) => ({ key, state }));
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
        ...(!isEdit ? { publicationAction: 'save_draft' as const } : {}),
        canonicalFields,
        ...(canonicalFieldMutations.length ? { canonicalFieldMutations } : {}),
        name: name.trim(),
        projectType,
        shortDescription: shortDescription.trim() || (preserveEmptyValues ? '' : undefined),
        description: description.trim(),
        address: address.trim() || (preserveEmptyValues ? '' : undefined),
        state: resolvedLocations.state?.name,
        area: resolvedLocations.area?.name || (preserveEmptyValues ? '' : undefined),
        coordinates,
        media: mediaItemsToProjectMedia(media),
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
      {dictionaryLoading ? <p role="status" className="rounded-lg bg-surface-container-low p-3 text-sm">Loading current property vocabulary…</p> : null}
      {dictionaryError ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Current property vocabulary is unavailable. The form will not substitute local options. <button type="button" className="font-bold underline" onClick={() => void refreshDictionary()}>Retry</button></p> : null}
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
            <select id="project-type" value={projectType} onChange={(event) => setProjectType(event.target.value as ProjectType)} className={inputClass} disabled={!dictionary || dictionaryLoading}>
              <option value="">Choose a project type</option>
              {projectType && !projectTypeOptions.some((option) => option.value === projectType) ? <option value={projectType}>Unavailable option: {projectType}</option> : null}
              {projectTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
          <LocationCascadeFields
            className="md:col-span-2"
            includeEstate={gatedEstate === 'true'}
            initialIds={{ state: canonicalText('state'), lga: canonicalText('lga'), area: canonicalText('area') }}
            initialLabels={{ state: initialData?.state ?? initialData?.location?.state, lga: '', area: initialData?.area ?? initialData?.location?.area, ...(gatedEstate === 'true' && estateName ? { estate: estateName } : {}) }}
            onChange={(selection, labels) => {
              setLocationSelection(selection);
              setLocationLabels(labels);
              setEstateName(selection.estate?.name ?? labels.estate ?? '');
            }}
          />
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
              <option value="">Not specified</option>{developmentStructure && !developmentStructures.some((item) => item.value === developmentStructure) ? <option value={developmentStructure}>Unavailable option: {developmentStructure}</option> : null}{developmentStructures.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="project-unit-display-mode" className={labelClass}>Unit display mode</label>
            <select id="project-unit-display-mode" value={unitDisplayMode} onChange={(event) => setUnitDisplayMode(event.target.value)} className={inputClass}>
              <option value="">Not specified</option>{unitDisplayMode && !unitDisplayModes.some((item) => item.value === unitDisplayMode) ? <option value={unitDisplayMode}>Unavailable option: {unitDisplayMode}</option> : null}{unitDisplayModes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
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
              <option value="">Not specified</option>{servicedStatus && !servicedValues.some((item) => item.value === servicedStatus) ? <option value={servicedStatus}>Unavailable option: {servicedStatus}</option> : null}{servicedValues.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="project-gated-estate" className={labelClass}>Gated estate</label>
            <select id="project-gated-estate" value={gatedEstate} onChange={(event) => { const next = event.target.value; setGatedEstate(next); if (next !== 'true') { setLocationSelection((current) => { const selected = { ...current }; delete selected.estate; return selected; }); setLocationLabels((current) => { const selected = { ...current }; delete selected.estate; return selected; }); setEstateName(''); } }} className={inputClass}>
              <option value="">Not specified</option><option value="true">Yes</option><option value="false">No</option>
            </select>
          </div>
          {gatedEstate === 'false' ? <div>
            <label htmlFor="project-canonical-street-address" className={labelClass}>Canonical street address</label>
            <input id="project-canonical-street-address" value={canonicalStreetAddress} onChange={(event) => { setCanonicalStreetAddress(event.target.value); if (!isEdit || !hasCanonicalField('streetAddress')) setAddress(event.target.value); }} className={inputClass} />
          </div> : null}
          <div>
            <label htmlFor="project-build-stage" className={labelClass}>Build stage</label>
            <select id="project-build-stage" value={buildStage} onChange={(event) => setBuildStage(event.target.value)} className={inputClass}>
              <option value="">Not specified</option>{buildStage && !buildStages.some((item) => item.value === buildStage) ? <option value={buildStage}>Unavailable option: {buildStage}</option> : null}{buildStages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <fieldset className="md:col-span-2">
            <legend className={labelClass}>Access road conditions</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {accessRoadOptions.map((item) => <label key={item.value} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={accessRoadConditions.includes(item.value)} onChange={(event) => { setAccessRoadTouched(true); setAccessRoadConditions((current) => event.target.checked ? [...current, item.value] : current.filter((value) => value !== item.value)); }} />{item.label}</label>)}
            </div>
          </fieldset>
          <fieldset className="md:col-span-2">
            <legend className={labelClass}>Payment options</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {paymentOptionValues.filter((item) => item.value !== 'Mortgage Accepted' || mortgageEnabled || savedMortgageOption).map((item) => {
                const gated = item.value === 'Mortgage Accepted' && !mortgageEnabled;
                return <label key={item.value} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={paymentOptions.includes(item.value)} disabled={gated && !paymentOptions.includes(item.value)} onChange={(event) => { setPaymentOptionsTouched(true); setPaymentOptions((current) => event.target.checked ? [...current, item.value] : current.filter((value) => value !== item.value)); }} />{item.label}{gated ? <span className="text-xs text-secondary">(not available while backend configuration is disabled; clear this saved choice to continue)</span> : null}</label>;
              })}
            </div>
            {!mortgageEnabled ? <p className="mt-2 text-xs text-secondary">Mortgage Accepted is unavailable while backend configuration is disabled. It will not be added to a submitted payment-options value.</p> : null}
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
            <select id="project-transaction-fee-payer" value={transactionFeePayer} onChange={(event) => setTransactionFeePayer(event.target.value)} className={inputClass} disabled={!dictionary || transactionFeePayerOptions.length === 0}>
              <option value="">Not specified</option>{transactionFeePayer && !transactionFeePayerOptions.some((option) => option.value === transactionFeePayer) ? <option value={transactionFeePayer}>Unavailable option: {transactionFeePayer}</option> : null}{transactionFeePayerOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
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
        <h2 className="text-xl font-black">Estate facilities and media</h2>
        <p className="mt-1 text-sm text-secondary">Choose facilities from the current dictionary and mark each as Delivered or Planned. Planned facilities are not displayed as delivered.</p>
        {dictionary && !amenityGroups.length ? <p role="status" className="mt-3 text-sm text-secondary">The backend has not returned an amenity catalogue.</p> : null}
        <div className="mt-5 space-y-5">
          {amenityGroups.map((group) => <fieldset key={group.label} className="rounded-lg border border-outline-variant/20 p-4">
            <legend className="px-2 text-sm font-bold">{group.label}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.entries.map((amenity) => {
                const checked = Object.prototype.hasOwnProperty.call(facilityStates, amenity.key ?? amenity.value);
                const key = amenity.key ?? amenity.value;
                return <div key={key} className="rounded-lg bg-surface-container-low p-3">
                  <label className="flex items-start gap-2 text-sm font-medium"><input type="checkbox" checked={checked} onChange={(event) => {
                    setFacilitiesTouched(true);
                    setFacilityStates((current) => {
                      const next = { ...current };
                      if (event.target.checked) next[key] = '';
                      else delete next[key];
                      return next;
                    });
                  }} /><span>{amenity.label}{amenity.priority ? <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Priority</span> : null}</span></label>
                  {checked ? <label className="mt-2 block text-xs font-semibold text-secondary">Facility state<select aria-label={`${amenity.label} state`} value={facilityStates[key] ?? ''} onChange={(event) => { setFacilitiesTouched(true); setFacilityStates((current) => ({ ...current, [key]: event.target.value as 'Delivered' | 'Planned' | '' })); }} className={`${inputClass} mt-1`}><option value="">Choose state</option><option value="Delivered">Delivered</option><option value="Planned">Planned</option></select></label> : null}
                </div>;
              })}
            </div>
          </fieldset>)}
          <div className="max-w-md">
            <label htmlFor="project-completion-date" className={labelClass}>Expected completion date</label>
            <input id="project-completion-date" type="date" value={completionDate} onChange={(event) => setCompletionDate(event.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="mt-5" role="group" aria-labelledby="project-media-label">
          <h3 id="project-media-label" className={labelClass}>Project media</h3>
          <MediaUploader value={media} onChange={setMedia} />
          {preserveEmptyValues ? <p className="mt-2 text-xs text-secondary">Saving replaces the complete project media association list. Removing every item clears the list.</p> : null}
          <p className="mt-2 text-xs text-secondary">Choose the cover image explicitly. Ordering and documented captions/attribution are saved with the complete media array.</p>
          {media.map((item, index) => <fieldset key={item.public_id || item.url || index} className="mt-4 grid gap-3 rounded-lg border border-outline-variant/10 p-3 sm:grid-cols-2">
              <legend className="px-1 text-xs font-bold">Media {index + 1} · {item.type}</legend>
              <label className="text-xs font-bold">Caption<input className="mt-1 w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm font-normal" value={item.caption ?? ''} onChange={(event) => setMedia((current) => current.map((mediaItem, mediaIndex) => mediaIndex === index ? { ...mediaItem, caption: event.target.value } : mediaItem))} /></label>
              <label className="text-xs font-bold">Alt text<input className="mt-1 w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm font-normal" value={item.altText ?? ''} onChange={(event) => setMedia((current) => current.map((mediaItem, mediaIndex) => mediaIndex === index ? { ...mediaItem, altText: event.target.value } : mediaItem))} /></label>
              <label className="text-xs font-bold">Source<input className="mt-1 w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm font-normal" value={item.source ?? ''} onChange={(event) => setMedia((current) => current.map((mediaItem, mediaIndex) => mediaIndex === index ? { ...mediaItem, source: event.target.value } : mediaItem))} /></label>
              <label className="text-xs font-bold">Attribution<input className="mt-1 w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm font-normal" value={item.attribution ?? ''} onChange={(event) => setMedia((current) => current.map((mediaItem, mediaIndex) => mediaIndex === index ? { ...mediaItem, attribution: event.target.value } : mediaItem))} /></label>
              <label className="text-xs font-bold">Captured at<input type="datetime-local" className="mt-1 w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm font-normal" value={dateTimeLocalValue(item.capturedAt)} onChange={(event) => setMedia((current) => current.map((mediaItem, mediaIndex) => mediaIndex === index ? { ...mediaItem, capturedAt: event.target.value ? new Date(event.target.value).toISOString() : undefined } : mediaItem))} /></label>
              <label className="text-xs font-bold">Construction milestone<input className="mt-1 w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm font-normal" value={item.milestone ?? ''} onChange={(event) => setMedia((current) => current.map((mediaItem, mediaIndex) => mediaIndex === index ? { ...mediaItem, milestone: event.target.value } : mediaItem))} /></label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="project-media-cover" checked={Boolean(item.isCover)} onChange={() => setMedia((current) => current.map((mediaItem, mediaIndex) => ({ ...mediaItem, isCover: mediaIndex === index })))} />Use as project cover</label>
            </fieldset>)}
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
