import { useState } from 'react';
import type { PropertyFiltersQuery } from '../../services/propertyService';

interface PropertyFiltersProps {
  initialFilters?: PropertyFiltersQuery;
  onApply: (filters: PropertyFiltersQuery) => void;
}

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'land', label: 'Land' },
];

const BEDROOM_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4+' },
];

const PropertyFilters = ({ initialFilters = {}, onApply }: PropertyFiltersProps) => {
  const [search, setSearch] = useState(initialFilters.search ?? '');
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice?.toString() ?? '');
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice?.toString() ?? '');
  const [propertyType, setPropertyType] = useState(initialFilters.propertyType ?? '');
  const [bedrooms, setBedrooms] = useState(initialFilters.bedrooms?.toString() ?? '');

  const handleApply = () => {
    onApply({
      search: search.trim() || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      propertyType: propertyType || undefined,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
    });
  };

  const handleClear = () => {
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    setPropertyType('');
    setBedrooms('');
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

      {/* Search */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">
          Search
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-base">
            search
          </span>
          <input
            type="text"
            placeholder="Title, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      {/* Property Type */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">
          Property Type
        </label>
        <select
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
          className={inputClass}
        >
          {PROPERTY_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Bedrooms */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">
          Bedrooms
        </label>
        <div className="flex gap-2 flex-wrap">
          {BEDROOM_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setBedrooms(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                bedrooms === value
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">
          Price Range (NGN)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className={inputClass}
            min={0}
          />
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

      {/* Actions */}
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
