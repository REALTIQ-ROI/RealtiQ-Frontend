import { useRef, useState } from 'react';
import type { PropertyFilters } from '../../types';
import type { CatalogueQueryChanges } from '../../utils/catalogueQuery';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface PropertyFiltersProps {
  initialFilters?: PropertyFilters;
  initialQuery?: URLSearchParams;
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

const buildStages = ['Off-plan', 'Under construction', 'Uncompleted building', 'Semi-finished (Advanced Shell / Lock-up)', 'Newly built', 'Renovated', 'Previously owned', 'Old'];

const PropertyFiltersPanel = ({ initialFilters = {}, initialQuery, onApply }: PropertyFiltersProps) => {
  const [values, setValues] = useState({
    search: initialFilters.search ?? '',
    minPrice: initialFilters.minPrice?.toString() ?? '',
    maxPrice: initialFilters.maxPrice?.toString() ?? '',
    propertyType: initialFilters.propertyType ?? '',
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
    allBedroomsEnSuite: initialQuery?.get('allBedroomsEnSuite') === 'true',
    minInternalFloorArea: initialQuery?.get('minInternalFloorArea') ?? '',
    maxInternalFloorArea: initialQuery?.get('maxInternalFloorArea') ?? '',
    handoverFrom: initialQuery?.get('handoverFrom') ?? '',
    handoverBy: initialQuery?.get('handoverBy') ?? '',
  });
  const startingValues = useRef(values);
  const [moreOpen, setMoreOpen] = useState(false);
  const set = (key: keyof typeof values, value: string | boolean | string[]) => setValues((current) => ({ ...current, [key]: value }));
  const buildFilters = (current: typeof values): CatalogueQueryChanges => ({
    search: current.search.trim() || undefined,
    minPrice: current.minPrice === '' ? undefined : Number(current.minPrice),
    maxPrice: current.maxPrice === '' ? undefined : Number(current.maxPrice),
    propertyType: current.propertyType || undefined,
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
    allBedroomsEnSuite: current.allBedroomsEnSuite || undefined,
    minInternalFloorArea: current.minInternalFloorArea === '' ? undefined : Number(current.minInternalFloorArea),
    maxInternalFloorArea: current.maxInternalFloorArea === '' ? undefined : Number(current.maxInternalFloorArea),
    handoverFrom: current.handoverFrom || undefined,
    handoverBy: current.handoverBy || undefined,
  });
  const changedFilters = (current: typeof values): CatalogueQueryChanges => {
    const built = buildFilters(current);
    return Object.fromEntries(
      (Object.keys(current) as Array<keyof typeof values>)
        .filter((key) => JSON.stringify(current[key]) !== JSON.stringify(startingValues.current[key]))
        .map((key) => [key, built[key]]),
    ) as CatalogueQueryChanges;
  };
  const clear = () => {
    setValues({ search: '', minPrice: '', maxPrice: '', propertyType: '', bedrooms: '', bathrooms: '', buildStage: [], status: '', sort: 'recommended', priceBand: '', includeUnpriced: true, withPhotosOnly: true, platformVerifiedTitleOnly: false, platformVerifiedListingOnly: false, has3dTour: false, hasFloorPlan: false, openHouse: false, reducedSinceListing: false, negotiable: false, serviceCharge: '', paymentOptions: [], readyToMoveIn: false, furnishing: '', servicedStatus: '', parkingSpaces: '', occupancy: '', publishedWithin: '', videoTour: '', hasDroneFlyThrough: false, openHouseThisWeekend: false, privateShowingsByAppointment: false, hasShowHome: false, distressSaleOnly: false, allBedroomsEnSuite: false, minInternalFloorArea: '', maxInternalFloorArea: '', handoverFrom: '', handoverBy: '' });
    onApply({ sort: 'recommended' }, true);
  };
  const selectClass = 'rounded-full border border-outline-variant/30 bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20';
  const fieldClass = 'w-full rounded-lg bg-surface-container-low px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20';
  return <div className="relative z-20 border-b border-outline-variant/20 bg-surface-container-lowest px-4 py-3 sm:px-6">
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-[min(100%,280px)] flex-1 sm:min-w-[300px]">
        <label htmlFor="property-search" className="sr-only">Search properties</label>
        <Input id="property-search" value={values.search} onChange={(event) => set('search', event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onApply(changedFilters(values)); }} placeholder="Search properties" />
      </div>
      <Button onClick={() => onApply(changedFilters(values))}>Search</Button>
      <select aria-label="Property type" value={values.propertyType} onChange={(event) => { const next = { ...values, propertyType: event.target.value }; setValues(next); onApply(changedFilters(next)); }} className={selectClass}>
        {[['', 'Type'], ['house', 'House'], ['apartment', 'Apartment'], ['commercial', 'Commercial'], ['villa', 'Villa'], ['penthouse', 'Penthouse'], ['estate', 'Estate']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select aria-label="Sort properties" value={values.sort} onChange={(event) => { const next = { ...values, sort: event.target.value as NonNullable<PropertyFilters['sort']> }; setValues(next); onApply(changedFilters(next)); }} className={selectClass}>
        {sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <button type="button" className={`${selectClass} inline-flex items-center gap-1`} onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen}>More Filters <span className="material-symbols-outlined text-base">tune</span></button>
      <Button variant="secondary" onClick={clear}>Clear</Button>
    </div>
    {moreOpen ? <div className="mt-3 grid max-h-[min(70vh,720px)] grid-cols-1 gap-3 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface p-4 shadow-lg sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 text-xs font-bold text-secondary"><span>Min / Max Price</span><div className="grid grid-cols-2 gap-2"><input type="number" min="0" value={values.minPrice} onChange={(event) => set('minPrice', event.target.value)} className={fieldClass} placeholder="Min" /><input type="number" min="0" value={values.maxPrice} onChange={(event) => set('maxPrice', event.target.value)} className={fieldClass} placeholder="Max" /></div></label>
      <label className="space-y-1 text-xs font-bold text-secondary"><span>Beds / Baths</span><div className="grid grid-cols-2 gap-2"><input type="number" min="0" value={values.bedrooms} onChange={(event) => set('bedrooms', event.target.value)} className={fieldClass} placeholder="Beds" /><input type="number" min="0" value={values.bathrooms} onChange={(event) => set('bathrooms', event.target.value)} className={fieldClass} placeholder="Baths" /></div></label>
      <fieldset className="space-y-1 text-xs font-bold text-secondary"><legend>Build stage</legend>{buildStages.map((stage) => <label key={stage} className="flex items-center gap-2 font-medium"><input type="checkbox" checked={values.buildStage.includes(stage)} onChange={(event) => set('buildStage', event.target.checked ? [...values.buildStage, stage] : values.buildStage.filter((item) => item !== stage))} />{stage}</label>)}</fieldset>
      <label className="space-y-1 text-xs font-bold text-secondary"><span>Status</span><select value={values.status} onChange={(event) => set('status', event.target.value)} className={fieldClass}>{[['', 'Available'], ['all', 'All public'], ['under_offer', 'Under offer'], ['sold', 'Sold']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="space-y-1 text-xs font-bold text-secondary"><span>Price band</span><select value={values.priceBand} onChange={(event) => set('priceBand', event.target.value)} className={fieldClass}>{[['', 'Any price'], ['under_25m', 'Under ₦25M'], ['25m_50m', '₦25M–₦50M'], ['50m_100m', '₦50M–₦100M'], ['100m_250m', '₦100M–₦250M'], ['250m_500m', '₦250M–₦500M'], ['500m_1b', '₦500M–₦1B'], ['over_1b', 'Over ₦1B']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Listing evidence</span>{([['platformVerifiedTitleOnly', 'Platform-verified title'], ['platformVerifiedListingOnly', 'Platform-verified listing'], ['has3dTour', '3D tour'], ['hasFloorPlan', 'Floor plan'], ['openHouse', 'Open house']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={values[key]} onChange={(event) => set(key, event.target.checked)} />{label}</label>)}</div>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Availability</span><label className="flex items-center gap-2"><input type="checkbox" checked={values.includeUnpriced} onChange={(event) => set('includeUnpriced', event.target.checked)} />Include price on application</label><label className="flex items-center gap-2"><input type="checkbox" checked={values.withPhotosOnly} onChange={(event) => set('withPhotosOnly', event.target.checked)} />Photos only</label></div>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Price and payment</span>{([['reducedSinceListing', 'Price reduced'], ['negotiable', 'Negotiable']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={values[key]} onChange={(event) => set(key, event.target.checked)} />{label}</label>)}<select aria-label="Service charge" value={values.serviceCharge} onChange={(event) => set('serviceCharge', event.target.value)} className={fieldClass}>{[['', 'Any service charge'], ['none', 'No service charge'], ['up_to_500k', 'Up to ₦500k'], ['up_to_1m', 'Up to ₦1m'], ['up_to_2.5m', 'Up to ₦2.5m'], ['up_to_5m', 'Up to ₦5m']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{(['Outright Purchase', 'Instalment Plan'] as const).map((option) => <label key={option} className="flex items-center gap-2"><input type="checkbox" checked={values.paymentOptions.includes(option)} onChange={(event) => set('paymentOptions', event.target.checked ? [...values.paymentOptions, option] : values.paymentOptions.filter((item) => item !== option))} />{option}</label>)}</div>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Home and building</span><label className="flex items-center gap-2"><input type="checkbox" checked={values.readyToMoveIn} onChange={(event) => set('readyToMoveIn', event.target.checked)} />Ready to move in</label><label className="flex items-center gap-2"><input type="checkbox" checked={values.allBedroomsEnSuite} onChange={(event) => set('allBedroomsEnSuite', event.target.checked)} />All bedrooms en suite</label><select aria-label="Furnishing" value={values.furnishing} onChange={(event) => set('furnishing', event.target.value)} className={fieldClass}>{['', 'Furnished', 'Semi-Furnished', 'Unfurnished'].map((item) => <option key={item} value={item}>{item || 'Any furnishing'}</option>)}</select><select aria-label="Serviced status" value={values.servicedStatus} onChange={(event) => set('servicedStatus', event.target.value)} className={fieldClass}>{[['', 'Any servicing'], ['Serviced', 'Serviced'], ['Not Serviced', 'Not serviced']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input aria-label="Minimum parking spaces" type="number" min={0} step={1} value={values.parkingSpaces} onChange={(event) => set('parkingSpaces', event.target.value)} className={fieldClass} placeholder="Parking spaces" /></div>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Area and handover</span><div className="grid grid-cols-2 gap-2"><input aria-label="Minimum internal area square metres" type="number" min={0} value={values.minInternalFloorArea} onChange={(event) => set('minInternalFloorArea', event.target.value)} className={fieldClass} placeholder="Min m²" /><input aria-label="Maximum internal area square metres" type="number" min={0} value={values.maxInternalFloorArea} onChange={(event) => set('maxInternalFloorArea', event.target.value)} className={fieldClass} placeholder="Max m²" /></div><div className="grid grid-cols-2 gap-2"><input aria-label="Handover from month" type="month" value={values.handoverFrom} onChange={(event) => set('handoverFrom', event.target.value)} className={fieldClass} /><input aria-label="Handover by month" type="month" value={values.handoverBy} onChange={(event) => set('handoverBy', event.target.value)} className={fieldClass} /></div></div>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Occupancy and age</span><select aria-label="Occupancy" value={values.occupancy} onChange={(event) => set('occupancy', event.target.value)} className={fieldClass}>{[['', 'Any occupancy'], ['Vacant possession', 'Vacant possession'], ['Sold with occupiers', 'Sold with occupiers']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Published within" value={values.publishedWithin} onChange={(event) => set('publishedWithin', event.target.value)} className={fieldClass}>{[['', 'Any age'], ['24h', 'Last 24 hours'], ['3d', 'Last 3 days'], ['7d', 'Last 7 days'], ['14d', 'Last 14 days'], ['30d', 'Last 30 days']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Tours and viewings</span><select aria-label="Video tour" value={values.videoTour} onChange={(event) => set('videoTour', event.target.value)} className={fieldClass}>{[['', 'Any video'], ['live', 'Live video'], ['recorded', 'Recorded video']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{([['hasDroneFlyThrough', 'Drone fly-through'], ['openHouseThisWeekend', 'Open house this weekend'], ['privateShowingsByAppointment', 'Private showings'], ['hasShowHome', 'Show home']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={values[key]} onChange={(event) => set(key, event.target.checked)} />{label}</label>)}</div>
      <label className="flex items-center gap-2 text-xs font-bold text-secondary"><input type="checkbox" checked={values.distressSaleOnly} onChange={(event) => set('distressSaleOnly', event.target.checked)} />Independently reviewed distress sale</label>
      <div className="flex items-end gap-2"><Button onClick={() => { onApply(changedFilters(values)); setMoreOpen(false); }}>Apply Filters</Button><Button variant="secondary" onClick={() => setMoreOpen(false)}>Close</Button></div>
    </div> : null}
  </div>;
};

export default PropertyFiltersPanel;
