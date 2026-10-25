import { useState } from 'react';
import type { PropertyFilters } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface PropertyFiltersProps {
  initialFilters?: PropertyFilters;
  onApply: (filters: PropertyFilters) => void;
}

const sorts: Array<[NonNullable<PropertyFilters['sort']>, string]> = [
  ['recommended', 'Recommended'], ['newest', 'Newest'], ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'], ['handover_soonest', 'Handover soonest'],
  ['verified_first', 'Verified first'], ['recently_reduced', 'Recently reduced'],
  ['largest_reduction', 'Largest price drop'], ['bedrooms_desc', 'Most bedrooms'],
  ['floor_area_desc', 'Largest floor area'], ['highest_rated', 'Highest rated'],
  ['trust_tier', 'Trust tier'],
];

const PropertyFiltersPanel = ({ initialFilters = {}, onApply }: PropertyFiltersProps) => {
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
  });
  const [moreOpen, setMoreOpen] = useState(false);
  const set = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const buildFilters = (): PropertyFilters => ({
    queryVersion: 'canonical-v1',
    search: values.search.trim() || undefined,
    minPrice: values.minPrice === '' ? undefined : Number(values.minPrice),
    maxPrice: values.maxPrice === '' ? undefined : Number(values.maxPrice),
    propertyType: values.propertyType || undefined,
    bedrooms: values.bedrooms === '' ? undefined : Number(values.bedrooms),
    bathrooms: values.bathrooms === '' ? undefined : Number(values.bathrooms),
    completionStage: values.completionStage as PropertyFilters['completionStage'] || undefined,
    status: values.status as PropertyFilters['status'] || undefined,
    sort: values.sort as PropertyFilters['sort'],
  });
  const clear = () => {
    setValues({ search: '', minPrice: '', maxPrice: '', propertyType: '', bedrooms: '', bathrooms: '', completionStage: '', status: '', sort: 'recommended' });
    onApply({ queryVersion: 'canonical-v1', sort: 'recommended' });
  };
  const selectClass = 'rounded-full border border-outline-variant/30 bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20';
  const fieldClass = 'w-full rounded-lg bg-surface-container-low px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20';
  return <div className="relative z-20 border-b border-outline-variant/20 bg-surface-container-lowest px-4 py-3 sm:px-6">
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-[min(100%,280px)] flex-1 sm:min-w-[300px]">
        <label htmlFor="property-search" className="sr-only">Search properties</label>
        <Input id="property-search" value={values.search} onChange={(event) => set('search', event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onApply(buildFilters()); }} placeholder="Search properties" />
      </div>
      <Button onClick={() => onApply(buildFilters())}>Search</Button>
      <select aria-label="Property type" value={values.propertyType} onChange={(event) => { set('propertyType', event.target.value); onApply({ ...buildFilters(), propertyType: event.target.value || undefined }); }} className={selectClass}>
        {[['', 'Type'], ['house', 'House'], ['apartment', 'Apartment'], ['commercial', 'Commercial'], ['villa', 'Villa'], ['penthouse', 'Penthouse'], ['estate', 'Estate']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select aria-label="Sort properties" value={values.sort} onChange={(event) => { set('sort', event.target.value); onApply({ ...buildFilters(), sort: event.target.value as PropertyFilters['sort'] }); }} className={selectClass}>
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
      <div className="flex items-end gap-2"><Button onClick={() => { onApply(buildFilters()); setMoreOpen(false); }}>Apply Filters</Button><Button variant="secondary" onClick={() => setMoreOpen(false)}>Close</Button></div>
    </div> : null}
  </div>;
};

export default PropertyFiltersPanel;
