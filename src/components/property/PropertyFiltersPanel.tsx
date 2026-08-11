import { useEffect, useRef, useState } from 'react';
import type { PropertyFilters } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface PropertyFiltersProps {
  initialFilters?: PropertyFilters;
  onApply: (filters: PropertyFilters) => void;
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

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed_use', label: 'Mixed Use' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Any Status' },
  { value: 'available', label: 'Available' },
  { value: 'sold', label: 'Sold' },
];

const STAGE_OPTIONS = [
  { value: '', label: 'Any Stage' },
  { value: 'off_plan', label: 'Off Plan' },
  { value: 'unfinished', label: 'Unfinished' },
  { value: 'finished', label: 'Finished' },
  { value: 'renovation', label: 'Renovation' },
];

const CURRENCY_OPTIONS = [
  { value: '', label: 'Any Currency' },
  { value: 'NGN', label: 'NGN' },
  { value: 'USD', label: 'USD' },
  { value: 'GBP', label: 'GBP' },
];

const LISTING_TYPE_OPTIONS = [
  { value: '', label: 'Any Listing Type' },
  { value: 'ready', label: 'Ready' },
  { value: 'off_plan', label: 'Off-Plan' },
];

const DEVELOPMENT_STATUS_OPTIONS = [
  { value: '', label: 'Any Construction Stage' },
  { value: 'planned', label: 'Planned' },
  { value: 'pre_construction', label: 'Pre-construction' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'structural', label: 'Structural' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'completed', label: 'Completed' },
];

const PropertyFiltersPanel = ({ initialFilters = {}, onApply }: PropertyFiltersProps) => {
  const [search, setSearch] = useState(initialFilters.search ?? '');
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice?.toString() ?? '');
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice?.toString() ?? '');
  const [propertyType, setPropertyType] = useState(initialFilters.propertyType ?? '');
  const [bedrooms, setBedrooms] = useState(initialFilters.bedrooms?.toString() ?? '');
  const [category, setCategory] = useState(initialFilters.category ?? '');
  const [completionStage, setCompletionStage] = useState(initialFilters.completionStage ?? '');
  const [currency, setCurrency] = useState(initialFilters.currency ?? '');
  const [status, setStatus] = useState(initialFilters.status ?? '');
  const [featured, setFeatured] = useState(initialFilters.featured === true ? 'true' : '');
  const [listingType, setListingType] = useState(initialFilters.listingType ?? '');
  const [developmentStatus, setDevelopmentStatus] = useState(initialFilters.developmentStatus ?? '');
  const [projectSlug, setProjectSlug] = useState(initialFilters.projectSlug ?? '');
  const [minConstructionProgress, setMinConstructionProgress] = useState(initialFilters.minConstructionProgress?.toString() ?? '');
  const [maxConstructionProgress, setMaxConstructionProgress] = useState(initialFilters.maxConstructionProgress?.toString() ?? '');
  const [completionBefore, setCompletionBefore] = useState(initialFilters.completionBefore ?? '');
  const [completionAfter, setCompletionAfter] = useState(initialFilters.completionAfter ?? '');
  const [installmentAvailable, setInstallmentAvailable] = useState(initialFilters.installmentAvailable === true ? 'true' : '');
  const initialSearchRender = useRef(true);

  const buildFilters = (): PropertyFilters => ({
    search: search.trim() || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    propertyType: propertyType || undefined,
    bedrooms: bedrooms ? Number(bedrooms) : undefined,
    category: category || undefined,
    completionStage: completionStage || undefined,
    currency: currency || undefined,
    status: (status as PropertyFilters['status']) || undefined,
    featured: featured === '' ? undefined : featured === 'true',
    listingType: (listingType as PropertyFilters['listingType']) || undefined,
    developmentStatus: (developmentStatus as PropertyFilters['developmentStatus']) || undefined,
    projectSlug: projectSlug.trim() || undefined,
    minConstructionProgress: minConstructionProgress ? Number(minConstructionProgress) : undefined,
    maxConstructionProgress: maxConstructionProgress ? Number(maxConstructionProgress) : undefined,
    completionBefore: completionBefore || undefined,
    completionAfter: completionAfter || undefined,
    installmentAvailable: installmentAvailable === '' ? undefined : installmentAvailable === 'true',
  });

  useEffect(() => {
    if (initialSearchRender.current) {
      initialSearchRender.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      onApply(buildFilters());
    }, 400);
    return () => window.clearTimeout(timer);
    // Search is intentionally the only live API trigger; other filters retain Apply behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const apply = () => {
    onApply(buildFilters());
  };

  const clear = () => {
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    setPropertyType('');
    setBedrooms('');
    setCategory('');
    setCompletionStage('');
    setCurrency('');
    setStatus('');
    setFeatured('');
    setListingType('');
    setDevelopmentStatus('');
    setProjectSlug('');
    setMinConstructionProgress('');
    setMaxConstructionProgress('');
    setCompletionBefore('');
    setCompletionAfter('');
    setInstallmentAvailable('');
    onApply({});
  };

  const inputClass =
    'w-full bg-surface-container-low rounded-lg px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all';

  return (
    <aside className="w-full lg:w-80">
      <div className="sticky top-28 bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 space-y-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Search & Filter</p>
          <h3 className="font-headline font-bold text-xl mt-1">Listings</h3>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Search</label>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Title, location, type..."
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Min Price</label>
            <input
              type="number"
              min={0}
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Max Price</label>
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Property Type</label>
          <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={inputClass}>
            {PROPERTY_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Bedrooms</label>
          <input
            type="number"
            min={0}
            value={bedrooms}
            onChange={(event) => setBedrooms(event.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Completion Stage</label>
          <select value={completionStage} onChange={(e) => setCompletionStage(e.target.value)} className={inputClass}>
            {STAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Listing Type</label>
          <select value={listingType} onChange={(e) => setListingType(e.target.value)} className={inputClass}>
            {LISTING_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Construction Stage</label>
          <select value={developmentStatus} onChange={(e) => setDevelopmentStatus(e.target.value)} className={inputClass}>
            {DEVELOPMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Project Slug</label>
          <input value={projectSlug} onChange={(event) => setProjectSlug(event.target.value)} placeholder="palm-heights-estate" className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Min Progress</label>
            <input type="number" min={0} max={100} value={minConstructionProgress} onChange={(event) => setMinConstructionProgress(event.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Max Progress</label>
            <input type="number" min={0} max={100} value={maxConstructionProgress} onChange={(event) => setMaxConstructionProgress(event.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Completion After</label>
            <input type="date" value={completionAfter} onChange={(event) => setCompletionAfter(event.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Before</label>
            <input type="date" value={completionBefore} onChange={(event) => setCompletionBefore(event.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Payment Plan</label>
          <select value={installmentAvailable} onChange={(e) => setInstallmentAvailable(e.target.value)} className={inputClass}>
            <option value="">Any</option>
            <option value="true">Available</option>
            <option value="false">Not available</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
            {CURRENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-secondary block">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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

        <div className="flex flex-col gap-2 pt-2">
          <Button fullWidth onClick={apply}>
            Apply Filters
          </Button>
          <Button fullWidth variant="secondary" onClick={clear}>
            Clear All
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default PropertyFiltersPanel;
