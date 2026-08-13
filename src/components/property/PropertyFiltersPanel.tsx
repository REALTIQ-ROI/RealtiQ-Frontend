import { useState } from 'react';
import type { PropertyFilters } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface PropertyFiltersProps {
  initialFilters?: PropertyFilters;
  onApply: (filters: PropertyFilters) => void;
  onSearchChange?: (search: string) => void;
}
const options = {
  propertyType: [['', 'Type'], ['house', 'House'], ['apartment', 'Apartment'], ['land', 'Land'], ['commercial', 'Commercial'], ['villa', 'Villa'], ['penthouse', 'Penthouse'], ['estate', 'Estate']],
  category: [['', 'All Categories'], ['residential', 'Residential'], ['commercial', 'Commercial'], ['mixed_use', 'Mixed Use']],
  completionStage: [['', 'Any Stage'], ['off_plan', 'Off Plan'], ['unfinished', 'Unfinished'], ['finished', 'Finished'], ['renovation', 'Renovation']],
  currency: [['', 'Any Currency'], ['NGN', 'NGN'], ['USD', 'USD'], ['GBP', 'GBP']],
  listingType: [['', 'Any Listing Type'], ['ready', 'Ready'], ['off_plan', 'Off-Plan']],
  status: [['', 'Any Status'], ['available', 'Available'], ['sold', 'Sold']],
} as const;

const PropertyFiltersPanel = ({ initialFilters = {}, onApply, onSearchChange }: PropertyFiltersProps) => {
  const [values, setValues] = useState<Record<string, string>>({
    search: initialFilters.search ?? '', minPrice: initialFilters.minPrice?.toString() ?? '', maxPrice: initialFilters.maxPrice?.toString() ?? '', propertyType: initialFilters.propertyType ?? '', bedrooms: initialFilters.bedrooms?.toString() ?? '', bathrooms: initialFilters.bathrooms?.toString() ?? '', category: initialFilters.category ?? '', completionStage: initialFilters.completionStage ?? '', currency: initialFilters.currency ?? '', status: initialFilters.status ?? '', featured: initialFilters.featured === undefined ? '' : String(initialFilters.featured), listingType: initialFilters.listingType ?? '', completionBefore: initialFilters.completionBefore ?? '', completionAfter: initialFilters.completionAfter ?? '', installmentAvailable: initialFilters.installmentAvailable === undefined ? '' : String(initialFilters.installmentAvailable),
  });
  const [moreOpen, setMoreOpen] = useState(false);
  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const buildFilters = (): PropertyFilters => ({
    minPrice: values.minPrice ? Number(values.minPrice) : undefined, maxPrice: values.maxPrice ? Number(values.maxPrice) : undefined, propertyType: values.propertyType || undefined, bedrooms: values.bedrooms ? Number(values.bedrooms) : undefined, bathrooms: values.bathrooms ? Number(values.bathrooms) : undefined, category: values.category as PropertyFilters['category'] || undefined, completionStage: values.completionStage as PropertyFilters['completionStage'] || undefined, currency: values.currency as PropertyFilters['currency'] || undefined, status: values.status as PropertyFilters['status'] || undefined, featured: values.featured === '' ? undefined : values.featured === 'true', listingType: values.listingType as PropertyFilters['listingType'] || undefined, completionBefore: values.completionBefore || undefined, completionAfter: values.completionAfter || undefined, installmentAvailable: values.installmentAvailable === '' ? undefined : values.installmentAvailable === 'true',
  });
  const clear = () => { setValues({ search: '', minPrice: '', maxPrice: '', propertyType: '', bedrooms: '', bathrooms: '', category: '', completionStage: '', currency: '', status: '', featured: '', listingType: '', completionBefore: '', completionAfter: '', installmentAvailable: '' }); onSearchChange?.(''); onApply({}); };
  const selectClass = 'rounded-full border border-outline-variant/30 bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20';
  const fieldClass = 'w-full rounded-lg bg-surface-container-low px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20';
  const renderSelect = (name: string, label: string, items: readonly (readonly [string, string])[]) => <label className="space-y-1 text-xs font-bold text-secondary"><span>{label}</span><select value={values[name] ?? ''} onChange={(e) => set(name, e.target.value)} className={fieldClass}>{items.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
  return <div className="relative z-20 border-b border-outline-variant/20 bg-surface-container-lowest px-4 py-3 sm:px-6">
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-[min(100%,280px)] flex-1 sm:min-w-[300px]"><label htmlFor="property-search" className="sr-only">Search loaded properties</label><Input id="property-search" value={values.search} onChange={(e) => { set('search', e.target.value); onSearchChange?.(e.target.value); }} placeholder="Search loaded properties" /></div>
      <select aria-label="Property type" value={values.propertyType} onChange={(e) => { set('propertyType', e.target.value); onApply({ ...buildFilters(), propertyType: e.target.value || undefined }); }} className={selectClass}>{options.propertyType.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
      <button type="button" className={selectClass} onClick={() => setMoreOpen(true)}>Price{values.minPrice || values.maxPrice ? ' · Set' : ''} <span className="material-symbols-outlined text-base">expand_more</span></button>
      <button type="button" className={selectClass} onClick={() => setMoreOpen(true)}>Beds & Baths{values.bedrooms || values.bathrooms ? ' · Set' : ''} <span className="material-symbols-outlined text-base">expand_more</span></button>
      <button type="button" className={`${selectClass} inline-flex items-center gap-1`} onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen}>More Filters <span className="material-symbols-outlined text-base">tune</span></button>
      <Button variant="secondary" onClick={clear}>Clear</Button>
    </div>
    {moreOpen ? <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-outline-variant/20 bg-surface p-4 shadow-lg sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 text-xs font-bold text-secondary"><span>Min / Max Price</span><div className="grid grid-cols-2 gap-2"><input type="number" min="0" value={values.minPrice} onChange={(e) => set('minPrice', e.target.value)} className={fieldClass} placeholder="Min" /><input type="number" min="0" value={values.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} className={fieldClass} placeholder="Max" /></div></label>
      <label className="space-y-1 text-xs font-bold text-secondary"><span>Beds / Baths</span><div className="grid grid-cols-2 gap-2"><input type="number" min="0" value={values.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} className={fieldClass} placeholder="Beds" /><input type="number" min="0" value={values.bathrooms} onChange={(e) => set('bathrooms', e.target.value)} className={fieldClass} placeholder="Baths" /></div></label>
      {renderSelect('category', 'Category', options.category)}{renderSelect('completionStage', 'Completion Stage', options.completionStage)}{renderSelect('listingType', 'Listing Type', options.listingType)}{renderSelect('currency', 'Currency', options.currency)}{renderSelect('status', 'Status', options.status)}
      {renderSelect('featured', 'Featured', [['', 'Any'], ['true', 'Featured'], ['false', 'Not Featured']])}
      {renderSelect('installmentAvailable', 'Installment plan', [['', 'Any installment plan'], ['true', 'Has installment plan'], ['false', 'No installment plan']])}
      <label className="space-y-1 text-xs font-bold text-secondary"><span>Completion window</span><div className="grid grid-cols-2 gap-2"><input type="date" value={values.completionAfter} onChange={(e) => set('completionAfter', e.target.value)} className={fieldClass} /><input type="date" value={values.completionBefore} onChange={(e) => set('completionBefore', e.target.value)} className={fieldClass} /></div></label>
      <div className="flex items-end gap-2"><Button onClick={() => { onApply(buildFilters()); setMoreOpen(false); }}>Apply Filters</Button><Button variant="secondary" onClick={() => setMoreOpen(false)}>Close</Button></div>
    </div> : null}
  </div>;
};
export default PropertyFiltersPanel;
