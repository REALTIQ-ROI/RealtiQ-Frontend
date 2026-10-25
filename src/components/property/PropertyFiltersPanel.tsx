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

const PropertyFiltersPanel = ({ initialFilters = {}, initialQuery, onApply }: PropertyFiltersProps) => {
  const [values, setValues] = useState({
    search: initialFilters.search ?? '',
    minPrice: initialFilters.minPrice?.toString() ?? '',
    maxPrice: initialFilters.maxPrice?.toString() ?? '',
    propertyType: initialFilters.propertyType ?? '',
    bedrooms: initialFilters.bedrooms?.toString() ?? '',
    bathrooms: initialFilters.bathrooms?.toString() ?? '',
    completionStage: initialFilters.completionStage ?? '',
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
  });
  const startingValues = useRef(values);
  const [moreOpen, setMoreOpen] = useState(false);
  const set = (key: keyof typeof values, value: string | boolean) => setValues((current) => ({ ...current, [key]: value }));
  const buildFilters = (current: typeof values): CatalogueQueryChanges => ({
    search: current.search.trim() || undefined,
    minPrice: current.minPrice === '' ? undefined : Number(current.minPrice),
    maxPrice: current.maxPrice === '' ? undefined : Number(current.maxPrice),
    propertyType: current.propertyType || undefined,
    bedrooms: current.bedrooms === '' ? undefined : Number(current.bedrooms),
    bathrooms: current.bathrooms === '' ? undefined : Number(current.bathrooms),
    completionStage: current.completionStage as PropertyFilters['completionStage'] || undefined,
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
  });
  const changedFilters = (current: typeof values): CatalogueQueryChanges => {
    const built = buildFilters(current);
    return Object.fromEntries(
      (Object.keys(current) as Array<keyof typeof values>)
        .filter((key) => current[key] !== startingValues.current[key])
        .map((key) => [key, built[key]]),
    ) as CatalogueQueryChanges;
  };
  const clear = () => {
    setValues({ search: '', minPrice: '', maxPrice: '', propertyType: '', bedrooms: '', bathrooms: '', completionStage: '', status: '', sort: 'recommended', priceBand: '', includeUnpriced: true, withPhotosOnly: true, platformVerifiedTitleOnly: false, platformVerifiedListingOnly: false, has3dTour: false, hasFloorPlan: false, openHouse: false });
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
    {moreOpen ? <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-outline-variant/20 bg-surface p-4 shadow-lg sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 text-xs font-bold text-secondary"><span>Min / Max Price</span><div className="grid grid-cols-2 gap-2"><input type="number" min="0" value={values.minPrice} onChange={(event) => set('minPrice', event.target.value)} className={fieldClass} placeholder="Min" /><input type="number" min="0" value={values.maxPrice} onChange={(event) => set('maxPrice', event.target.value)} className={fieldClass} placeholder="Max" /></div></label>
      <label className="space-y-1 text-xs font-bold text-secondary"><span>Beds / Baths</span><div className="grid grid-cols-2 gap-2"><input type="number" min="0" value={values.bedrooms} onChange={(event) => set('bedrooms', event.target.value)} className={fieldClass} placeholder="Beds" /><input type="number" min="0" value={values.bathrooms} onChange={(event) => set('bathrooms', event.target.value)} className={fieldClass} placeholder="Baths" /></div></label>
      <label className="space-y-1 text-xs font-bold text-secondary"><span>Build stage</span><select value={values.completionStage} onChange={(event) => set('completionStage', event.target.value)} className={fieldClass}>{[['', 'Any stage'], ['off_plan', 'Off plan'], ['unfinished', 'Unfinished'], ['finished', 'Finished'], ['renovation', 'Renovation']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="space-y-1 text-xs font-bold text-secondary"><span>Status</span><select value={values.status} onChange={(event) => set('status', event.target.value)} className={fieldClass}>{[['', 'Available'], ['all', 'All public'], ['under_offer', 'Under offer'], ['sold', 'Sold']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="space-y-1 text-xs font-bold text-secondary"><span>Price band</span><select value={values.priceBand} onChange={(event) => set('priceBand', event.target.value)} className={fieldClass}>{[['', 'Any price'], ['under_25m', 'Under ₦25M'], ['25m_50m', '₦25M–₦50M'], ['50m_100m', '₦50M–₦100M'], ['100m_250m', '₦100M–₦250M'], ['250m_500m', '₦250M–₦500M'], ['500m_1b', '₦500M–₦1B'], ['over_1b', 'Over ₦1B']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Listing evidence</span>{([['platformVerifiedTitleOnly', 'Platform-verified title'], ['platformVerifiedListingOnly', 'Platform-verified listing'], ['has3dTour', '3D tour'], ['hasFloorPlan', 'Floor plan'], ['openHouse', 'Open house']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={values[key]} onChange={(event) => set(key, event.target.checked)} />{label}</label>)}</div>
      <div className="space-y-2 text-xs font-bold text-secondary"><span className="block">Availability</span><label className="flex items-center gap-2"><input type="checkbox" checked={values.includeUnpriced} onChange={(event) => set('includeUnpriced', event.target.checked)} />Include price on application</label><label className="flex items-center gap-2"><input type="checkbox" checked={values.withPhotosOnly} onChange={(event) => set('withPhotosOnly', event.target.checked)} />Photos only</label></div>
      <div className="flex items-end gap-2"><Button onClick={() => { onApply(changedFilters(values)); setMoreOpen(false); }}>Apply Filters</Button><Button variant="secondary" onClick={() => setMoreOpen(false)}>Close</Button></div>
    </div> : null}
  </div>;
};

export default PropertyFiltersPanel;
