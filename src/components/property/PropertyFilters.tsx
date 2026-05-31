import { useState } from 'react';
import type { PropertyFiltersQuery } from '../../services/propertyService';

interface PropertyFiltersProps {
  initialFilters?: PropertyFiltersQuery;
  onApply: (filters: PropertyFiltersQuery) => void;
}

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'villa', label: 'Villa' },
  { value: 'penthouse', label: 'Penthouse' },
  { value: 'estate', label: 'Estate' },
];

const PropertyFilters = ({ initialFilters = {}, onApply }: PropertyFiltersProps) => {
  const [search, setSearch] = useState(initialFilters.search ?? '');
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice?.toString() ?? '');
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice?.toString() ?? '');
  const [propertyType, setPropertyType] = useState(initialFilters.propertyType ?? '');
  const [bedrooms, setBedrooms] = useState(initialFilters.bedrooms?.toString() ?? '');
  const [category, setCategory] = useState(initialFilters.category ?? '');
  const [completionStage, setCompletionStage] = useState(initialFilters.completionStage ?? '');
  const [currency, setCurrency] = useState(initialFilters.currency ?? '');
  const [featured, setFeatured] = useState(initialFilters.featured === true ? 'true' : '');
  const [status, setStatus] = useState(initialFilters.status ?? '');

  const handleApply = () => {
    onApply({
      search: search.trim() || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      propertyType: propertyType || undefined,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      category: category || undefined,
      completionStage: completionStage || undefined,
      currency: currency || undefined,
      featured: featured === '' ? undefined : featured === 'true',
      status: (status as PropertyFiltersQuery['status']) || undefined,
    });
  };

  const handleClear = () => {
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    setPropertyType('');
    setBedrooms('');
    setCategory('');
    setCompletionStage('');
    setCurrency('');
    setFeatured('');
    setStatus('');
    onApply({});
  };

  const inputClass =
    'w-full bg-surface-container-low rounded-lg px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all';

  return (
    <div className="space-y-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      <h3
        className="text-sm font-black uppercase tracking-widest text-on-surface-variant"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        Filters
      </h3>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Search</label>
        <input
          type="text"
          placeholder="Title, location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Min Price</label>
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className={inputClass}
            min={0}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Max Price</label>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className={inputClass}
            min={0}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Property Type</label>
        <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={inputClass}>
          {PROPERTY_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Bedrooms</label>
        <input
          type="number"
          value={bedrooms}
          onChange={(e) => setBedrooms(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Category</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="residential"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Completion Stage</label>
        <input
          type="text"
          value={completionStage}
          onChange={(e) => setCompletionStage(e.target.value)}
          placeholder="finished"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Currency</label>
        <input
          type="text"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          placeholder="NGN"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Status</label>
          <input value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Featured</label>
          <select value={featured} onChange={(e) => setFeatured(e.target.value)} className={inputClass}>
            <option value="">Any</option>
            <option value="true">Featured</option>
            <option value="false">Not Featured</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={handleApply}
          className="w-full py-3 rounded-xl bg-primary text-on-primary text-sm font-bold tracking-tight hover:opacity-90 transition-opacity"
        >
          Apply Filters
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="w-full py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm font-bold tracking-tight hover:bg-surface-container transition-colors"
        >
          Clear All
        </button>
      </div>
    </div>
  );
};

export default PropertyFilters;
