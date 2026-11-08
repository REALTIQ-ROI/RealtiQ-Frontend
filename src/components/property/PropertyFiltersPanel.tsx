import { useMemo, useRef, useState } from 'react';
import type { PropertyFilters } from '../../types';
import type { CatalogueQueryChanges } from '../../utils/catalogueQuery';
import { useCanonicalFieldDictionary } from '../../hooks/useCanonicalFieldDictionary';
import { canonicalSearchControls, canonicalSearchQueryValue, canonicalSearchValueFromUrl, type CanonicalSearchControl } from '../../utils/canonicalSearchFilters';
import type { AccountProfileSummary } from '../../services/profileService';
import Button from '../ui/Button';
import Input from '../ui/Input';
import LocationCascadeFields from './LocationCascadeFields';
import type { LocationCascadeSelection, LocationSuggestionLevel } from '../../services/locationService';
import { dictionaryVocabularyOptions, fieldVocabularyOptions, groupedFieldVocabularyOptions } from '../../utils/propertyVocabulary';

interface PropertyFiltersProps {
  initialFilters?: PropertyFilters;
  initialQuery?: URLSearchParams;
  activeProfile?: AccountProfileSummary | null;
  entityLabel?: 'properties' | 'projects';
  onApply: (changes: CatalogueQueryChanges, clearAll?: boolean) => void;
}

const sorts: Array<[NonNullable<PropertyFilters['sort']>, string]> = [
  ['recommended', 'Recommended'], ['newest', 'Newest'], ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'], ['handover_soonest', 'Handover soonest'],
  ['verified_first', 'Verified first'], ['recently_reduced', 'Recently reduced'],
  ['largest_reduction', 'Largest price drop'], ['bedrooms_desc', 'Most bedrooms'],
  ['floor_area_desc', 'Largest floor area'], ['highest_rated', 'Highest rated'],
  ['trust_tier', 'Trust tier'],
];

const PropertyFiltersPanel = ({ initialFilters = {}, initialQuery, activeProfile, entityLabel = 'properties', onApply }: PropertyFiltersProps) => {
  const { dictionary, error: dictionaryError, refresh: refreshDictionary } = useCanonicalFieldDictionary();
  const dynamicControls = useMemo(() => canonicalSearchControls(dictionary), [dictionary]);
  const dictionaryPropertyTypes = useMemo(() => fieldVocabularyOptions(dictionary?.fields.find((field) => field.key === 'propertyType'), dictionary), [dictionary]);
  const dictionaryProjectTypes = useMemo(() => fieldVocabularyOptions(dictionary?.fields.find((field) => field.key === 'projectType'), dictionary), [dictionary]);
  const buildStageOptions = useMemo(() => fieldVocabularyOptions(dictionary?.fields.find((field) => field.key === 'buildStage'), dictionary), [dictionary]);
  const availabilityOptions = useMemo(() => fieldVocabularyOptions(dictionary?.fields.find((field) => field.key === 'availability'), dictionary).filter((option) => option.label.trim().toLowerCase() !== 'not released'), [dictionary]);
  const advertiserField = dictionary?.fields.find((field) => field.key === 'advertiserType');
  const advertiserOptions = useMemo(() => dictionaryVocabularyOptions(dictionary, 'advertiserTypes', advertiserField), [advertiserField, dictionary]);
  const paymentOptions = useMemo(() => fieldVocabularyOptions(dictionary?.fields.find((field) => field.key === 'paymentOptions'), dictionary), [dictionary]);
  const furnishingOptions = useMemo(() => fieldVocabularyOptions(dictionary?.fields.find((field) => field.key === 'furnishing'), dictionary), [dictionary]);
  const servicedOptions = useMemo(() => fieldVocabularyOptions(dictionary?.fields.find((field) => field.key === 'servicedStatus'), dictionary), [dictionary]);
  const occupancyOptions = useMemo(() => fieldVocabularyOptions(dictionary?.fields.find((field) => field.key === 'occupancy'), dictionary), [dictionary]);
  const mortgageEnabled = dictionary?.configuration.mortgage?.state === 'enabled';
  const [dynamicValues, setDynamicValues] = useState<Record<string, string | string[]>>({});
  const [dynamicError, setDynamicError] = useState('');
  const dynamicValue = (control: CanonicalSearchControl) => dynamicValues[control.field.key] ?? canonicalSearchValueFromUrl(control, initialQuery ?? new URLSearchParams());
  const setDynamicValue = (control: CanonicalSearchControl, value: string | string[]) => { setDynamicError(''); setDynamicValues((current) => ({ ...current, [control.field.key]: value })); };
  const [values, setValues] = useState({
    search: initialFilters.search ?? '',
    minPrice: initialFilters.minPrice?.toString() ?? '',
    maxPrice: initialFilters.maxPrice?.toString() ?? '',
    propertyType: initialFilters.propertyType ?? '',
    projectType: initialQuery?.get('projectType') ?? '',
    bedrooms: initialFilters.bedrooms?.toString() ?? '',
    bathrooms: initialFilters.bathrooms?.toString() ?? '',
    buildStage: initialQuery?.getAll('buildStage') ?? [],
    status: initialFilters.status ?? '',
    sort: initialFilters.sort ?? 'recommended',
    priceBand: initialQuery?.get('priceBand') ?? '',
    includeUnpriced: initialQuery?.get('includeUnpriced') !== 'false',
    withPhotosOnly: initialQuery?.get('withPhotosOnly') !== 'false',
    platformVerifiedTitleOnly: initialQuery?.get('platformVerifiedTitleOnly') === 'true',
    platformVerifiedListingOnly: initialQuery?.get('platformVerifiedListingOnly') === 'true',
    has3dTour: initialQuery?.get('has3dTour') === 'true',
    hasFloorPlan: initialQuery?.get('hasFloorPlan') === 'true',
    openHouse: initialQuery?.get('openHouse') === 'true',
    reducedSinceListing: initialQuery?.get('reducedSinceListing') === 'true',
    negotiable: initialQuery?.get('negotiable') === 'true',
    serviceCharge: initialQuery?.get('serviceCharge') ?? '',
    paymentOptions: initialQuery?.getAll('paymentOptions') ?? [],
    instalmentDuration: initialQuery?.get('instalmentDuration') ?? '',
    initialDepositCap: initialQuery?.get('initialDepositCap') ?? '',
    escrowAvailable: initialQuery?.get('escrowAvailable') === 'true',
    readyToMoveIn: initialQuery?.get('readyToMoveIn') === 'true',
    furnishing: initialQuery?.get('furnishing') ?? '',
    servicedStatus: initialQuery?.get('servicedStatus') ?? '',
    parkingSpaces: initialQuery?.get('parkingSpaces') ?? '',
    occupancy: initialQuery?.get('occupancy') ?? '',
    publishedWithin: initialQuery?.get('publishedWithin') ?? '',
    videoTour: initialQuery?.get('videoTour') ?? '',
    hasDroneFlyThrough: initialQuery?.get('hasDroneFlyThrough') === 'true',
    openHouseThisWeekend: initialQuery?.get('openHouseThisWeekend') === 'true',
    privateShowingsByAppointment: initialQuery?.get('privateShowingsByAppointment') === 'true',
    hasShowHome: initialQuery?.get('hasShowHome') === 'true',
    distressSaleOnly: initialQuery?.get('distressSaleOnly') === 'true',
    allBedroomsEnSuite: initialQuery?.get('allBedroomsEnSuite') ?? '',
    minInternalFloorArea: initialQuery?.get('minInternalFloorArea') ?? '',
    maxInternalFloorArea: initialQuery?.get('maxInternalFloorArea') ?? '',
    minBedrooms: initialQuery?.get('minBedrooms') ?? initialQuery?.get('min_beds') ?? '',
    maxBedrooms: initialQuery?.get('maxBedrooms') ?? initialQuery?.get('max_beds') ?? '',
    minBathrooms: initialQuery?.get('minBathrooms') ?? '',
    maxBathrooms: initialQuery?.get('maxBathrooms') ?? '',
    powderRooms: initialQuery?.get('powderRooms') ?? initialQuery?.get('toilets') ?? '',
    minPowderRooms: initialQuery?.get('minPowderRooms') ?? '',
    maxPowderRooms: initialQuery?.get('maxPowderRooms') ?? '',
    minBuiltUpArea: initialQuery?.get('minBuiltUpArea') ?? initialQuery?.get('min_built_up_area') ?? '',
    maxBuiltUpArea: initialQuery?.get('maxBuiltUpArea') ?? initialQuery?.get('max_built_up_area') ?? '',
    minPlotArea: initialQuery?.get('minPlotArea') ?? initialQuery?.get('min_plot_area') ?? '',
    maxPlotArea: initialQuery?.get('maxPlotArea') ?? initialQuery?.get('max_plot_area') ?? '',
    numberOfFloors: initialQuery?.get('numberOfFloors') ?? '',
    handoverFrom: initialQuery?.get('handoverFrom') ?? '',
    handoverBy: initialQuery?.get('handoverBy') ?? '',
    state: initialQuery?.get('state') ?? '',
    lga: initialQuery?.get('lga') ?? '',
    area: initialQuery?.get('area') ?? '',
    gatedEstate: initialQuery?.get('gatedEstate') ?? '',
    estateName: initialQuery?.get('estateName') ?? '',
    exactReference: initialQuery?.get('reference') ?? initialQuery?.get('exactReference') ?? '',
    advertiserType: initialQuery?.get('advertiserType') ?? '',
    fromAccountsIFollow: initialQuery?.get('fromAccountsIFollow') === 'true',
    commuteFrom: initialQuery?.get('commuteFrom') ?? '',
    commuteMinutes: initialQuery?.get('commuteMinutes') ?? '',
    nearbyLat: initialQuery?.get('nearbyLat') ?? '',
    nearbyLng: initialQuery?.get('nearbyLng') ?? '',
    nearbyRadiusKm: initialQuery?.get('nearbyRadiusKm') ?? '',
  });
  const startingValues = useRef(values);
  const [locationLabels, setLocationLabels] = useState<Partial<Record<LocationSuggestionLevel, string>>>({});
  const [locationSelection, setLocationSelection] = useState<LocationCascadeSelection>({});
  const [moreOpen, setMoreOpen] = useState(false);
  const set = (key: keyof typeof values, value: string | boolean | string[]) => setValues((current) => ({ ...current, [key]: value }));
  const buildFilters = (current: typeof values): CatalogueQueryChanges => ({
    search: current.search.trim() || undefined,
    minPrice: current.minPrice === '' ? undefined : Number(current.minPrice),
    maxPrice: current.maxPrice === '' ? undefined : Number(current.maxPrice),
    propertyType: current.propertyType || undefined,
    projectType: current.projectType || undefined,
    bedrooms: current.bedrooms === '' ? undefined : Number(current.bedrooms),
    bathrooms: current.bathrooms === '' ? undefined : Number(current.bathrooms),
    buildStage: current.buildStage.length ? current.buildStage : undefined,
    status: current.status as PropertyFilters['status'] || undefined,
    sort: current.sort as PropertyFilters['sort'],
    priceBand: current.priceBand || undefined,
    includeUnpriced: current.includeUnpriced,
    withPhotosOnly: current.withPhotosOnly,
    platformVerifiedTitleOnly: current.platformVerifiedTitleOnly || undefined,
    platformVerifiedListingOnly: current.platformVerifiedListingOnly || undefined,
    has3dTour: current.has3dTour || undefined,
    hasFloorPlan: current.hasFloorPlan || undefined,
    openHouse: current.openHouse || undefined,
    reducedSinceListing: current.reducedSinceListing || undefined,
    negotiable: current.negotiable || undefined,
    serviceCharge: current.serviceCharge || undefined,
    paymentOptions: current.paymentOptions.length ? current.paymentOptions : undefined,
    instalmentDuration: current.instalmentDuration || undefined,
    initialDepositCap: current.initialDepositCap || undefined,
    escrowAvailable: current.escrowAvailable || undefined,
    readyToMoveIn: current.readyToMoveIn || undefined,
    furnishing: current.furnishing || undefined,
    servicedStatus: current.servicedStatus || undefined,
    parkingSpaces: current.parkingSpaces === '' ? undefined : Number(current.parkingSpaces),
    occupancy: current.occupancy || undefined,
    publishedWithin: current.publishedWithin || undefined,
    videoTour: current.videoTour || undefined,
    hasDroneFlyThrough: current.hasDroneFlyThrough || undefined,
    openHouseThisWeekend: current.openHouseThisWeekend || undefined,
    privateShowingsByAppointment: current.privateShowingsByAppointment || undefined,
    hasShowHome: current.hasShowHome || undefined,
    distressSaleOnly: current.distressSaleOnly || undefined,
    allBedroomsEnSuite: current.allBedroomsEnSuite === '' ? undefined : current.allBedroomsEnSuite === 'true',
    minInternalFloorArea: current.minInternalFloorArea === '' ? undefined : Number(current.minInternalFloorArea),
    maxInternalFloorArea: current.maxInternalFloorArea === '' ? undefined : Number(current.maxInternalFloorArea),
    minBedrooms: current.minBedrooms === '' ? undefined : Number(current.minBedrooms),
    maxBedrooms: current.maxBedrooms === '' ? undefined : Number(current.maxBedrooms),
    minBathrooms: current.minBathrooms === '' ? undefined : Number(current.minBathrooms),
    maxBathrooms: current.maxBathrooms === '' ? undefined : Number(current.maxBathrooms),
    powderRooms: current.powderRooms === '' ? undefined : Number(current.powderRooms),
    minPowderRooms: current.minPowderRooms === '' ? undefined : Number(current.minPowderRooms),
    maxPowderRooms: current.maxPowderRooms === '' ? undefined : Number(current.maxPowderRooms),
    minBuiltUpArea: current.minBuiltUpArea === '' ? undefined : Number(current.minBuiltUpArea),
    maxBuiltUpArea: current.maxBuiltUpArea === '' ? undefined : Number(current.maxBuiltUpArea),
    minPlotArea: current.minPlotArea === '' ? undefined : Number(current.minPlotArea),
    maxPlotArea: current.maxPlotArea === '' ? undefined : Number(current.maxPlotArea),
    numberOfFloors: current.numberOfFloors || undefined,
    handoverFrom: current.handoverFrom || undefined,
    handoverBy: current.handoverBy || undefined,
    state: locationSelection.state?.id,
    lga: locationSelection.lga?.id,
    area: locationSelection.area?.id,
    gatedEstate: current.gatedEstate === '' ? undefined : current.gatedEstate === 'true',
    estateName: locationSelection.estate?.name || undefined,
    reference: current.exactReference.trim() || undefined,
    advertiserType: current.advertiserType || undefined,
    fromAccountsIFollow: current.fromAccountsIFollow || undefined,
    commuteFrom: current.commuteFrom.trim() || undefined,
    commuteMinutes: current.commuteFrom.trim() ? current.commuteMinutes || undefined : undefined,
    nearbyLat: current.nearbyLat === '' ? undefined : Number(current.nearbyLat),
    nearbyLng: current.nearbyLng === '' ? undefined : Number(current.nearbyLng),
    nearbyRadiusKm: current.nearbyLat !== '' && current.nearbyLng !== '' && current.nearbyRadiusKm !== '' ? Number(current.nearbyRadiusKm) : undefined,
  });
  const changedFilters = (current: typeof values): CatalogueQueryChanges => {
    const built = buildFilters(current);
    const changes = Object.fromEntries(
      (Object.keys(current) as Array<keyof typeof values>)
        .filter((key) => JSON.stringify(current[key]) !== JSON.stringify(startingValues.current[key]))
        .map((key) => [key, built[key]]),
    ) as CatalogueQueryChanges;
    for (const control of dynamicControls) {
      const nextValue = dynamicValue(control);
      const oldValue = canonicalSearchValueFromUrl(control, initialQuery ?? new URLSearchParams());
      if (JSON.stringify(nextValue) !== JSON.stringify(oldValue)) Object.assign(changes, canonicalSearchQueryValue(control, nextValue));
    }
    return changes;
  };
  const commuteIsValid = (current: typeof values) => {
    if (!current.commuteFrom.trim()) return current.commuteMinutes === '';
    const match = /^(-?(?:\d+(?:\.\d+)?)),\s*(-?(?:\d+(?:\.\d+)?))$/.exec(current.commuteFrom.trim());
    if (!match || !['15', '30', '45', '60'].includes(current.commuteMinutes)) return false;
    const lng = Number(match[1]); const lat = Number(match[2]);
    return Number.isFinite(lng) && lng >= -180 && lng <= 180 && Number.isFinite(lat) && lat >= -90 && lat <= 90;
  };
  const nearbyIsValid = (current: typeof values) =>
    ![current.nearbyLat, current.nearbyLng, current.nearbyRadiusKm].some(Boolean) ||
    (current.nearbyLat !== '' && current.nearbyLng !== '' && current.nearbyRadiusKm !== '' &&
      Number.isFinite(Number(current.nearbyLat)) && Number(current.nearbyLat) >= -90 && Number(current.nearbyLat) <= 90 &&
      Number.isFinite(Number(current.nearbyLng)) && Number(current.nearbyLng) >= -180 && Number(current.nearbyLng) <= 180 &&
      Number.isFinite(Number(current.nearbyRadiusKm)) && Number(current.nearbyRadiusKm) > 0);
  const invalidCommute = !commuteIsValid(values);
  const invalidNearby = !nearbyIsValid(values);
  const dynamicValuesAreValid = () => {
    for (const control of dynamicControls) {
      const value = dynamicValue(control);
      if (control.kind === 'numeric') {
        const [minimum = '', maximum = ''] = Array.isArray(value) ? value : [value, ''];
        const min = minimum === '' ? null : Number(minimum);
        const max = maximum === '' ? null : Number(maximum);
        if ((min !== null && (!Number.isFinite(min) || (typeof control.field.minimum === 'number' && min < control.field.minimum) || (typeof control.field.maximum === 'number' && min > control.field.maximum))) ||
            (max !== null && (!Number.isFinite(max) || (typeof control.field.minimum === 'number' && max < control.field.minimum) || (typeof control.field.maximum === 'number' && max > control.field.maximum))) ||
            (min !== null && max !== null && min > max)) return false;
      } else if (control.kind === 'enum' && !Array.isArray(value) && value !== '' && !control.options.includes(value)) return false;
      else if (control.kind === 'multi_enum' && Array.isArray(value) && value.some((item) => !control.options.includes(item))) return false;
      else if (control.kind === 'boolean' && !Array.isArray(value) && value !== '' && value !== 'true' && value !== 'false') return false;
    }
    return true;
  };
  const apply = (current: typeof values) => {
    if (!commuteIsValid(current) || !nearbyIsValid(current)) return;
    if (current.status && !availabilityOptions.some((option) => option.value === current.status)) {
      setDynamicError('Choose an availability value from the current backend dictionary before applying filters.');
      return;
    }
    if (current.advertiserType && !advertiserOptions.some((option) => option.value === current.advertiserType)) {
      setDynamicError('Choose a listing advertiser from the current backend dictionary before applying filters.');
      return;
    }
    if (Object.entries(locationLabels).some(([level, label]) => Boolean(label?.trim()) && !locationSelection[level as LocationSuggestionLevel])) {
      setDynamicError('Choose each entered location from current suggestions. A typed name is not a valid location ID.');
      return;
    }
    if (Object.entries({ state: initialQuery?.get('state'), lga: initialQuery?.get('lga'), area: initialQuery?.get('area') }).some(([level, id]) => Boolean(id) && !locationSelection[level as LocationSuggestionLevel])) {
      setDynamicError('A saved location filter has not been confirmed against the active directory. Select it again before applying filters.');
      return;
    }
    if (!dynamicValuesAreValid()) { setDynamicError('Check canonical filter values and ranges.'); return; }
    setDynamicError('');
    onApply(changedFilters(current));
  };
  const clear = () => {
    setDynamicValues({});
    setDynamicError('');
    setLocationSelection({});
    setLocationLabels({});
    setValues({ search: '', minPrice: '', maxPrice: '', propertyType: '', projectType: '', bedrooms: '', bathrooms: '', buildStage: [], status: '', sort: 'recommended', priceBand: '', includeUnpriced: true, withPhotosOnly: true, platformVerifiedTitleOnly: false, platformVerifiedListingOnly: false, has3dTour: false, hasFloorPlan: false, openHouse: false, reducedSinceListing: false, negotiable: false, serviceCharge: '', paymentOptions: [], instalmentDuration: '', initialDepositCap: '', escrowAvailable: false, readyToMoveIn: false, furnishing: '', servicedStatus: '', parkingSpaces: '', occupancy: '', publishedWithin: '', videoTour: '', hasDroneFlyThrough: false, openHouseThisWeekend: false, privateShowingsByAppointment: false, hasShowHome: false, distressSaleOnly: false, allBedroomsEnSuite: '', minInternalFloorArea: '', maxInternalFloorArea: '', minBedrooms: '', maxBedrooms: '', minBathrooms: '', maxBathrooms: '', powderRooms: '', minPowderRooms: '', maxPowderRooms: '', minBuiltUpArea: '', maxBuiltUpArea: '', minPlotArea: '', maxPlotArea: '', numberOfFloors: '', handoverFrom: '', handoverBy: '', state: '', lga: '', area: '', gatedEstate: '', estateName: '', exactReference: '', advertiserType: '', fromAccountsIFollow: false, commuteFrom: '', commuteMinutes: '', nearbyLat: '', nearbyLng: '', nearbyRadiusKm: '' });
    onApply({ sort: 'recommended' }, true);
  };
  const selectClass = 'rounded-full border border-outline-variant/30 bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20';
  const fieldClass = 'w-full rounded-lg bg-surface-container-low px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20';
  return <div className="relative z-20 border-b border-outline-variant/20 bg-surface-container-lowest px-4 py-3 sm:px-6">
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-[min(100%,280px)] flex-1 sm:min-w-[300px]">
        <label htmlFor="property-search" className="sr-only">Search {entityLabel}</label>
        <Input id="property-search" value={values.search} onChange={(event) => set('search', event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') apply(values); }} placeholder={`Search ${entityLabel}`} />
      </div>
      <Button onClick={() => apply(values)}>Search</Button>
      <select aria-label={entityLabel === 'projects' ? 'Unit property type' : 'Property type'} value={values.propertyType} onChange={(event) => { const next = { ...values, propertyType: event.target.value }; setValues(next); apply(next); }} className={selectClass} disabled={!dictionary}>
        <option value="">{entityLabel === 'projects' ? 'Any unit type' : 'Any property type'}</option>
        {values.propertyType && !dictionaryPropertyTypes.some((option) => option.value === values.propertyType) ? <option value={values.propertyType}>Unavailable option: {values.propertyType}</option> : null}
        {dictionaryPropertyTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {entityLabel === 'projects' ? <select aria-label="Project type" value={values.projectType} onChange={(event) => { const next = { ...values, projectType: event.target.value }; setValues(next); apply(next); }} className={selectClass} disabled={!dictionary}><option value="">All project types</option>{values.projectType && !dictionaryProjectTypes.some((option) => option.value === values.projectType) ? <option value={values.projectType}>Unavailable option: {values.projectType}</option> : null}{dictionaryProjectTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : null}
      <select aria-label="Sort properties" value={values.sort} onChange={(event) => { const next = { ...values, sort: event.target.value as NonNullable<PropertyFilters['sort']> }; setValues(next); apply(next); }} className={selectClass}>
        {sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <button type="button" className={`${selectClass} inline-flex items-center gap-1`} onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen}>More Filters <span className="material-symbols-outlined text-base">tune</span></button>
      <Button variant="secondary" onClick={clear}>Clear</Button>
    </div>
    {moreOpen ? <div className="mt-3 grid max-h-[min(70vh,720px)] grid-cols-1 gap-3 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface p-4 shadow-lg sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 text-xs font-bold text-secondary"><span>Min / Max Price (NGN basis)</span><div className="grid grid-cols-2 gap-2"><input type="number" min="0" value={values.minPrice} onChange={(event) => set('minPrice', event.target.value)} className={fieldClass} placeholder="Min ₦" /><input type="number" min="0" value={values.maxPrice} onChange={(event) => set('maxPrice', event.target.value)} className={fieldClass} placeholder="Max ₦" /></div><span className="block text-[11px] font-medium">Foreign-currency comparison and aggregates depend on approved FX configuration.</span></label>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Canonical location</span><LocationCascadeFields initialIds={{ state: initialQuery?.get('state') ?? undefined, lga: initialQuery?.get('lga') ?? undefined, area: initialQuery?.get('area') ?? undefined }} initialLabels={values.estateName ? { estate: values.estateName } : {}} includeEstate={values.gatedEstate === 'true'} onChange={(selection, labels) => { setLocationSelection(selection); setLocationLabels(labels); setValues((current) => ({ ...current, state: selection.state?.id ?? '', lga: selection.lga?.id ?? '', area: selection.area?.id ?? '', estateName: selection.estate?.name ?? '' })); }} /><select aria-label="Gated estate filter" value={values.gatedEstate} onChange={(event) => { const next = event.target.value; const updated = { ...values, gatedEstate: next, ...(next === 'false' ? { estateName: '' } : {}) }; setValues(updated); if (next === 'false') { setLocationSelection((current) => { const selected = { ...current }; delete selected.estate; return selected; }); setLocationLabels((current) => { const selected = { ...current }; delete selected.estate; return selected; }); } }} className={fieldClass}><option value="">Any estate type</option><option value="true">Gated estate</option><option value="false">Not gated</option></select><p className="text-[11px] font-medium">Choose current directory suggestions. Changing a parent clears child selections.</p></div>
      <label className="space-y-1 text-xs font-bold text-secondary"><span>Beds / Baths</span><div className="grid grid-cols-2 gap-2"><input type="number" min="0" value={values.bedrooms} onChange={(event) => set('bedrooms', event.target.value)} className={fieldClass} placeholder="Beds" /><input type="number" min="0" value={values.bathrooms} onChange={(event) => set('bathrooms', event.target.value)} className={fieldClass} placeholder="Baths" /></div></label>
      <fieldset className="space-y-1 text-xs font-bold text-secondary"><legend>Build stage</legend>{values.buildStage.filter((stage) => !buildStageOptions.some((option) => option.value === stage)).map((stage) => <p key={`stale:${stage}`} role="status" className="font-medium text-amber-800">Unavailable option: {stage}</p>)}{buildStageOptions.map((stage) => <label key={stage.value} className="flex items-center gap-2 font-medium"><input type="checkbox" checked={values.buildStage.includes(stage.value)} onChange={(event) => set('buildStage', event.target.checked ? [...values.buildStage, stage.value] : values.buildStage.filter((item) => item !== stage.value))} />{stage.label}</label>)}</fieldset>
      <label className="space-y-1 text-xs font-bold text-secondary"><span>Availability</span><select aria-label="Availability" value={values.status} onChange={(event) => set('status', event.target.value)} className={fieldClass} disabled={!dictionary || !availabilityOptions.length}><option value="">Any availability</option>{values.status && !availabilityOptions.some((option) => option.value === values.status) ? <option value={values.status}>Unavailable option: {values.status}</option> : null}{availabilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="space-y-1 text-xs font-bold text-secondary"><span>Price band</span><select value={values.priceBand} onChange={(event) => set('priceBand', event.target.value)} className={fieldClass}>{[['', 'Any price'], ['under_25m', 'Under ₦25M'], ['25m_50m', '₦25M–₦50M'], ['50m_100m', '₦50M–₦100M'], ['100m_250m', '₦100M–₦250M'], ['250m_500m', '₦250M–₦500M'], ['500m_1b', '₦500M–₦1B'], ['over_1b', 'Over ₦1B']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Listing evidence</span>{([['platformVerifiedTitleOnly', 'Platform-verified title'], ['platformVerifiedListingOnly', 'Platform-verified listing'], ['has3dTour', '3D tour'], ['hasFloorPlan', 'Floor plan'], ['openHouse', 'Open house']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={values[key]} onChange={(event) => set(key, event.target.checked)} />{label}</label>)}</div>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Availability</span><label className="flex items-center gap-2"><input type="checkbox" checked={values.includeUnpriced} onChange={(event) => set('includeUnpriced', event.target.checked)} />Include price on application</label><label className="flex items-center gap-2"><input type="checkbox" checked={values.withPhotosOnly} onChange={(event) => set('withPhotosOnly', event.target.checked)} />Photos only</label></div>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Price and payment</span>{([['reducedSinceListing', 'Price reduced'], ['negotiable', 'Negotiable']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={values[key]} onChange={(event) => set(key, event.target.checked)} />{label}</label>)}<select aria-label="Service charge" value={values.serviceCharge} onChange={(event) => set('serviceCharge', event.target.value)} className={fieldClass}>{[['', 'Any service charge'], ['none', 'No service charge'], ['up_to_500k', 'Up to ₦500k'], ['up_to_1m', 'Up to ₦1m'], ['up_to_2.5m', 'Up to ₦2.5m'], ['up_to_5m', 'Up to ₦5m']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{values.paymentOptions.filter((item) => !paymentOptions.some((option) => option.value === item) || (item === 'Mortgage Accepted' && !mortgageEnabled)).map((item) => <label key={`stale-payment-${item}`} className="flex items-center gap-2 text-amber-800"><input type="checkbox" checked disabled />Unavailable payment filter: {item}</label>)}{paymentOptions.filter((option) => option.value !== 'Mortgage Accepted' || mortgageEnabled).map((option) => <label key={option.value} className="flex items-center gap-2"><input type="checkbox" checked={values.paymentOptions.includes(option.value)} onChange={(event) => set('paymentOptions', event.target.checked ? [...values.paymentOptions, option.value] : values.paymentOptions.filter((item) => item !== option.value))} />{option.label}</label>)}<label className="block">Instalment duration<select aria-label="Instalment duration" value={values.instalmentDuration} onChange={(event) => set('instalmentDuration', event.target.value)} className={fieldClass}>{[['', 'No duration preference'], ['any', 'Any instalment duration'], ['6+', '6 months or more'], ['12+', '12 months or more'], ['24+', '24 months or more'], ['36+', '36 months or more']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block">Initial deposit cap<select aria-label="Initial deposit cap" value={values.initialDepositCap} onChange={(event) => set('initialDepositCap', event.target.value)} className={fieldClass}>{[['', 'No deposit preference'], ['any', 'Any deposit'], ['10', 'Up to 10%'], ['20', 'Up to 20%'], ['30', 'Up to 30%'], ['50', 'Up to 50%']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="flex items-center gap-2"><input type="checkbox" checked={values.escrowAvailable} onChange={(event) => set('escrowAvailable', event.target.checked)} />Escrow available</label></div>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Home and building</span><label className="flex items-center gap-2"><input type="checkbox" checked={values.readyToMoveIn} onChange={(event) => set('readyToMoveIn', event.target.checked)} />Ready to move in</label><select aria-label="All bedrooms en suite" value={values.allBedroomsEnSuite} onChange={(event) => set('allBedroomsEnSuite', event.target.value)} className={fieldClass}>{[['', 'Any en-suite status'], ['true', 'All bedrooms en suite'], ['false', 'Not all bedrooms en suite']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Furnishing" value={values.furnishing} onChange={(event) => set('furnishing', event.target.value)} className={fieldClass} disabled={!dictionary}><option value="">Any furnishing</option>{values.furnishing && !furnishingOptions.some((option) => option.value === values.furnishing) ? <option value={values.furnishing}>Unavailable option: {values.furnishing}</option> : null}{furnishingOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><select aria-label="Serviced status" value={values.servicedStatus} onChange={(event) => set('servicedStatus', event.target.value)} className={fieldClass} disabled={!dictionary}><option value="">Any servicing</option>{values.servicedStatus && !servicedOptions.some((option) => option.value === values.servicedStatus) ? <option value={values.servicedStatus}>Unavailable option: {values.servicedStatus}</option> : null}{servicedOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><input aria-label="Minimum parking spaces" type="number" min={0} step={1} value={values.parkingSpaces} onChange={(event) => set('parkingSpaces', event.target.value)} className={fieldClass} placeholder="Parking spaces" /></div>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Canonical ranges</span><div className="grid grid-cols-2 gap-2"><input aria-label="Minimum bedrooms" type="number" min={0} step={1} value={values.minBedrooms} onChange={(event) => set('minBedrooms', event.target.value)} className={fieldClass} placeholder="Min beds" /><input aria-label="Maximum bedrooms" type="number" min={0} step={1} value={values.maxBedrooms} onChange={(event) => set('maxBedrooms', event.target.value)} className={fieldClass} placeholder="Max beds" /></div><div className="grid grid-cols-2 gap-2"><input aria-label="Minimum bathrooms" type="number" min={0} step={1} value={values.minBathrooms} onChange={(event) => set('minBathrooms', event.target.value)} className={fieldClass} placeholder="Min baths" /><input aria-label="Maximum bathrooms" type="number" min={0} step={1} value={values.maxBathrooms} onChange={(event) => set('maxBathrooms', event.target.value)} className={fieldClass} placeholder="Max baths" /></div><div className="grid grid-cols-2 gap-2"><input aria-label="Minimum powder rooms" type="number" min={0} step={1} value={values.minPowderRooms} onChange={(event) => set('minPowderRooms', event.target.value)} className={fieldClass} placeholder="Min powder rooms" /><input aria-label="Maximum powder rooms" type="number" min={0} step={1} value={values.maxPowderRooms} onChange={(event) => set('maxPowderRooms', event.target.value)} className={fieldClass} placeholder="Max powder rooms" /></div><input aria-label="Exact powder rooms" type="number" min={0} step={1} value={values.powderRooms} onChange={(event) => set('powderRooms', event.target.value)} className={fieldClass} placeholder="Exact powder rooms" /><div className="grid grid-cols-2 gap-2"><input aria-label="Minimum built-up area square metres" type="number" min={0} step="any" value={values.minBuiltUpArea} onChange={(event) => set('minBuiltUpArea', event.target.value)} className={fieldClass} placeholder="Min built-up m²" /><input aria-label="Maximum built-up area square metres" type="number" min={0} step="any" value={values.maxBuiltUpArea} onChange={(event) => set('maxBuiltUpArea', event.target.value)} className={fieldClass} placeholder="Max built-up m²" /></div><div className="grid grid-cols-2 gap-2"><input aria-label="Minimum plot area square metres" type="number" min={0} step="any" value={values.minPlotArea} onChange={(event) => set('minPlotArea', event.target.value)} className={fieldClass} placeholder="Min plot m²" /><input aria-label="Maximum plot area square metres" type="number" min={0} step="any" value={values.maxPlotArea} onChange={(event) => set('maxPlotArea', event.target.value)} className={fieldClass} placeholder="Max plot m²" /></div><select aria-label="Number of floors" value={values.numberOfFloors} onChange={(event) => set('numberOfFloors', event.target.value)} className={fieldClass}>{[['', 'Any number of floors'], ['2', '2 floors'], ['3', '3 floors'], ['4+', '4 or more floors']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Area and handover</span><div className="grid grid-cols-2 gap-2"><input aria-label="Minimum internal area square metres" type="number" min={0} value={values.minInternalFloorArea} onChange={(event) => set('minInternalFloorArea', event.target.value)} className={fieldClass} placeholder="Min m²" /><input aria-label="Maximum internal area square metres" type="number" min={0} value={values.maxInternalFloorArea} onChange={(event) => set('maxInternalFloorArea', event.target.value)} className={fieldClass} placeholder="Max m²" /></div><div className="grid grid-cols-2 gap-2"><input aria-label="Handover from month" type="month" value={values.handoverFrom} onChange={(event) => set('handoverFrom', event.target.value)} className={fieldClass} /><input aria-label="Handover by month" type="month" value={values.handoverBy} onChange={(event) => set('handoverBy', event.target.value)} className={fieldClass} /></div></div>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Occupancy and age</span><select aria-label="Occupancy" value={values.occupancy} onChange={(event) => set('occupancy', event.target.value)} className={fieldClass} disabled={!dictionary}><option value="">Any occupancy</option>{values.occupancy && !occupancyOptions.some((option) => option.value === values.occupancy) ? <option value={values.occupancy}>Unavailable option: {values.occupancy}</option> : null}{occupancyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><select aria-label="Published within" value={values.publishedWithin} onChange={(event) => set('publishedWithin', event.target.value)} className={fieldClass}>{[['', 'Any age'], ['24h', 'Last 24 hours'], ['3d', 'Last 3 days'], ['7d', 'Last 7 days'], ['14d', 'Last 14 days'], ['30d', 'Last 30 days']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Tours and viewings</span><select aria-label="Video tour" value={values.videoTour} onChange={(event) => set('videoTour', event.target.value)} className={fieldClass}>{[['', 'Any video'], ['live', 'Live video'], ['recorded', 'Recorded video']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{([['hasDroneFlyThrough', 'Drone fly-through'], ['openHouseThisWeekend', 'Open house this weekend'], ['privateShowingsByAppointment', 'Private showings'], ['hasShowHome', 'Show home']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={values[key]} onChange={(event) => set(key, event.target.checked)} />{label}</label>)}</div>
      <label className="flex items-center gap-2 text-xs font-bold text-secondary"><input type="checkbox" checked={values.distressSaleOnly} onChange={(event) => set('distressSaleOnly', event.target.checked)} />Independently reviewed distress sale</label>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Reference and audience</span><input aria-label="Exact public reference" value={values.exactReference} onChange={(event) => set('exactReference', event.target.value)} className={fieldClass} placeholder="Exact public listing reference" /><select aria-label="Listed by" value={values.advertiserType} onChange={(event) => set('advertiserType', event.target.value)} className={fieldClass} disabled={!dictionary || !advertiserOptions.length}><option value="">Any advertiser</option>{values.advertiserType && !advertiserOptions.some((option) => option.value === values.advertiserType) ? <option value={values.advertiserType}>Unavailable option: {values.advertiserType}</option> : null}{advertiserOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{dictionary && !advertiserOptions.length ? <span role="status" className="block text-[11px] font-medium">Advertiser filter unavailable: no current accepted values were returned.</span> : null}<label className={`flex items-center gap-2 ${!activeProfile ? 'opacity-60' : ''}`}><input type="checkbox" checked={values.fromAccountsIFollow} disabled={!activeProfile} onChange={(event) => set('fromAccountsIFollow', event.target.checked)} />From accounts I follow</label><span className="block text-[11px] font-medium">{activeProfile ? `Search follows for ${activeProfile.name}.` : 'Sign in and select an active profile to use this filter.'}</span></div>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Nearby and commute</span><div className="grid grid-cols-2 gap-2"><input aria-label="Nearby latitude" type="number" step="any" min="-90" max="90" value={values.nearbyLat} onChange={(event) => set('nearbyLat', event.target.value)} className={fieldClass} placeholder="Latitude" /><input aria-label="Nearby longitude" type="number" step="any" min="-180" max="180" value={values.nearbyLng} onChange={(event) => set('nearbyLng', event.target.value)} className={fieldClass} placeholder="Longitude" /></div><input aria-label="Nearby radius kilometres" type="number" step="any" min="0.1" value={values.nearbyRadiusKm} onChange={(event) => set('nearbyRadiusKm', event.target.value)} className={fieldClass} placeholder="Nearby radius (km)" /><input aria-label="Commute origin longitude, latitude" value={values.commuteFrom} onChange={(event) => set('commuteFrom', event.target.value)} className={fieldClass} placeholder="Commute origin: longitude,latitude" /><select aria-label="Commute minutes" value={values.commuteMinutes} onChange={(event) => set('commuteMinutes', event.target.value)} className={fieldClass}>{[['', 'Any commute time'], ['15', 'Within 15 minutes'], ['30', 'Within 30 minutes'], ['45', 'Within 45 minutes'], ['60', 'Within 60 minutes']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{invalidCommute ? <p role="alert" className="text-error">Enter valid commute coordinates and choose 15, 30, 45 or 60 minutes.</p> : null}{invalidNearby ? <p role="alert" className="text-error">Enter a valid latitude, longitude and positive radius together.</p> : null}<p className="text-[11px] font-medium">Nearby radius and routing require backend configuration. The server error is shown without removing these criteria.</p></div>
      {dynamicControls.length ? <div className="contents">{dynamicControls.map((control) => {
        const value = dynamicValue(control);
        if (control.kind === 'numeric') {
          const range = Array.isArray(value) ? value : [value, ''];
          return <fieldset key={control.field.key} className="space-y-1 text-xs font-bold text-secondary"><legend>{control.label}{control.field.unit ? ` (${control.field.unit})` : ''}</legend><div className="grid grid-cols-2 gap-2"><input aria-label={`Minimum ${control.label}`} type="number" step={control.field.dataType === 'integer' ? 1 : 'any'} min={typeof control.field.minimum === 'number' ? control.field.minimum : undefined} max={typeof control.field.maximum === 'number' ? control.field.maximum : undefined} value={range[0] ?? ''} onChange={(event) => setDynamicValue(control, [event.target.value, range[1] ?? ''])} className={fieldClass} placeholder="Min" /><input aria-label={`Maximum ${control.label}`} type="number" step={control.field.dataType === 'integer' ? 1 : 'any'} min={typeof control.field.minimum === 'number' ? control.field.minimum : undefined} max={typeof control.field.maximum === 'number' ? control.field.maximum : undefined} value={range[1] ?? ''} onChange={(event) => setDynamicValue(control, [range[0] ?? '', event.target.value])} className={fieldClass} placeholder="Max" /></div></fieldset>;
        }
        if (control.kind === 'multi_enum') {
          const selected = Array.isArray(value) ? value : [];
          const groups = groupedFieldVocabularyOptions(dictionary, control.field);
          return <fieldset key={control.field.key} className="space-y-3 text-xs font-bold text-secondary"><legend>{control.label}</legend>{selected.filter((item) => !control.options.includes(item)).map((item) => <p key={`stale-${item}`} role="status" className="text-amber-800">Previously selected value unavailable: {item}</p>)}{groups.length ? groups.map((group) => <fieldset key={group.label} className="rounded-lg border border-outline-variant/20 p-3"><legend className="px-1">{group.label}</legend>{group.values.map((option) => <label key={option.value} className="flex items-center gap-2 font-medium"><input type="checkbox" checked={selected.includes(option.value)} onChange={(event) => setDynamicValue(control, event.target.checked ? [...selected, option.value] : selected.filter((item) => item !== option.value))} />{option.label}{option.priority ? <span className="text-[10px] text-secondary">Priority</span> : null}</label>)}</fieldset>) : control.options.map((option) => <label key={option} className="flex items-center gap-2 font-medium"><input type="checkbox" checked={selected.includes(option)} onChange={(event) => setDynamicValue(control, event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} />{control.optionLabels[option] ?? option}</label>)}</fieldset>;
        }
        const selected = Array.isArray(value) ? value[0] ?? '' : value;
        const groups = control.kind === 'enum' && /milestone/i.test(control.field.key) ? groupedFieldVocabularyOptions(dictionary, control.field) : [];
        return <label key={control.field.key} className="space-y-1 text-xs font-bold text-secondary">{control.label}<select aria-label={control.label} value={selected} onChange={(event) => setDynamicValue(control, event.target.value)} className={fieldClass}>{control.kind === 'boolean' ? <><option value="">Any</option><option value="true">Yes</option><option value="false">No</option></> : <><option value="">Any</option>{selected && !control.options.includes(selected) ? <option value={selected}>Unavailable option: {selected}</option> : null}{groups.length ? groups.map((group) => <optgroup key={group.label} label={group.label}>{group.values.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</optgroup>) : control.options.map((option) => <option key={option} value={option}>{control.optionLabels[option] ?? option}</option>)}</>}</select></label>;
      })}</div> : null}
      {dynamicError ? <p role="alert" className="text-xs text-error">{dynamicError}</p> : null}
      {dictionaryError ? <p role="status" className="text-xs text-amber-800">Additional canonical filters are unavailable. <button type="button" className="font-bold underline" onClick={refreshDictionary}>Retry filter metadata</button></p> : null}
      <div className="flex items-end gap-2"><Button onClick={() => { apply(values); if (!invalidCommute && !invalidNearby) setMoreOpen(false); }}>Apply Filters</Button><Button variant="secondary" onClick={() => setMoreOpen(false)}>Close</Button></div>
    </div> : null}
  </div>;
};

export default PropertyFiltersPanel;
