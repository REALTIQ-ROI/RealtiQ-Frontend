import { useMemo, useState } from 'react';
import type { PropertyFiltersQuery } from '../../services/propertyService';
import { useCanonicalFieldDictionary } from '../../hooks/useCanonicalFieldDictionary';
import { dictionaryVocabularyOptions, fieldVocabularyOptions, propertyTypesForCategory } from '../../utils/propertyVocabulary';

interface PropertyFiltersProps {
  initialFilters?: PropertyFiltersQuery;
  onApply: (filters: PropertyFiltersQuery) => void;
}

const PropertyFilters = ({ initialFilters = {}, onApply }: PropertyFiltersProps) => {
  const { dictionary, loading, error, refresh } = useCanonicalFieldDictionary();
  const [category, setCategory] = useState(initialFilters.category ?? '');
  const categoryField = dictionary?.fields.find((field) => field.key === 'category');
  const propertyTypeField = dictionary?.fields.find((field) => field.key === 'propertyType');
  const categories = useMemo(() => dictionaryVocabularyOptions(dictionary, 'categories', categoryField), [dictionary, categoryField]);
  const propertyTypes = useMemo(
    () => propertyTypesForCategory(dictionaryVocabularyOptions(dictionary, 'propertyTypes', propertyTypeField), category),
    [dictionary, propertyTypeField, category],
  );
  const buildStages = useMemo(() => fieldVocabularyOptions(dictionary?.fields.find((field) => field.key === 'buildStage'), dictionary), [dictionary]);
  const currencies = useMemo(() => fieldVocabularyOptions(dictionary?.fields.find((field) => field.key === 'currency'), dictionary), [dictionary]);
  const availability = useMemo(() => fieldVocabularyOptions(dictionary?.fields.find((field) => field.key === 'availability'), dictionary), [dictionary]);
  const [search, setSearch] = useState(initialFilters.search ?? '');
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice?.toString() ?? '');
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice?.toString() ?? '');
  const [propertyType, setPropertyType] = useState(initialFilters.propertyType ?? '');
  const [bedrooms, setBedrooms] = useState(initialFilters.bedrooms?.toString() ?? '');
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
        <label htmlFor="property-filter-type" className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Property Type</label>
        <select id="property-filter-type" value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={inputClass} disabled={!dictionary || !category}>
          <option value="">{category ? 'All types in category' : 'Choose a category first'}</option>
          {propertyType && !propertyTypes.some((option) => option.value === propertyType) ? <option value={propertyType}>Unavailable option: {propertyType}</option> : null}
          {propertyTypes.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
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
        <label htmlFor="property-filter-category" className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Category</label>
        <select id="property-filter-category" value={category} onChange={(e) => { setCategory(e.target.value); setPropertyType(''); }} className={inputClass} disabled={!dictionary}>
          <option value="">All categories</option>
          {category && !categories.some((option) => option.value === category) ? <option value={category}>Unavailable option: {category}</option> : null}
          {categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="property-filter-stage" className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Completion Stage</label>
        <select id="property-filter-stage" value={completionStage} onChange={(e) => setCompletionStage(e.target.value)} className={inputClass} disabled={!dictionary}>
          <option value="">Any stage</option>
          {completionStage && !buildStages.some((option) => option.value === completionStage) ? <option value={completionStage}>Unavailable option: {completionStage}</option> : null}
          {buildStages.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="property-filter-currency" className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Currency</label>
        <select id="property-filter-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass} disabled={!dictionary}>
          <option value="">Any currency</option>
          {currency && !currencies.some((option) => option.value === currency) ? <option value={currency}>Unavailable option: {currency}</option> : null}
          {currencies.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label htmlFor="property-filter-status" className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Status</label>
          <select id="property-filter-status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass} disabled={!dictionary}>
            <option value="">Any status</option>
            {status && !availability.some((option) => option.value === status) ? <option value={status}>Unavailable option: {status}</option> : null}
            {availability.filter((option) => option.label.trim().toLowerCase() !== 'not released').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
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

      {!dictionary ? <div role="status" className="text-xs text-secondary">{loading ? 'Loading current property vocabulary…' : <>{error ?? 'Property vocabulary is unavailable.'} <button type="button" className="font-bold underline" onClick={refresh}>Retry</button></>}</div> : null}

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
