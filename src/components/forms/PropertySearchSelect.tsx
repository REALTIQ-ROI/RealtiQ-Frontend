import { useEffect, useMemo, useRef, useState } from 'react';
import type { Property } from '../../types';

interface PropertySearchSelectProps {
  label: string;
  properties: Property[];
  value: string;
  onChange: (property: Property | null) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  helperText?: string;
}

const PropertySearchSelect = ({
  label,
  properties,
  value,
  onChange,
  loading = false,
  disabled = false,
  placeholder = 'Search properties...',
  emptyMessage = 'No eligible properties available.',
  helperText,
}: PropertySearchSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedProperty = useMemo(() => properties.find((property) => property._id === value) ?? null, [properties, value]);

  const filteredProperties = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return properties;
    return properties.filter((property) =>
      `${property.title} ${property.location} ${property.propertyType}`.toLowerCase().includes(needle),
    );
  }, [properties, query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setQuery('');
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">{label}</label>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() =>
          setOpen((current) => {
            if (current) setQuery('');
            return !current;
          })
        }
        className="w-full flex items-center justify-between gap-3 bg-surface-container-low rounded-lg px-4 py-3 text-left text-sm outline-none border border-transparent focus:border-surface-tint/30 disabled:opacity-60"
      >
        <span className="min-w-0 flex-1">
          {selectedProperty ? (
            <span className="block truncate font-semibold text-on-surface">{selectedProperty.title}</span>
          ) : (
            <span className="text-secondary">{loading ? 'Loading properties...' : 'Select a property'}</span>
          )}
          {selectedProperty ? <span className="block truncate text-xs text-secondary mt-1">{selectedProperty.location}</span> : null}
        </span>
        <span className="material-symbols-outlined text-base text-secondary">expand_more</span>
      </button>

      {helperText ? <p className="mt-2 text-xs text-secondary">{helperText}</p> : null}

      {open ? (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-outline-variant/10">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input
                autoFocus
                className="w-full rounded-lg border border-outline-variant/10 bg-surface-container-low pl-10 pr-3 py-2 text-sm outline-none focus:border-surface-tint/30"
                placeholder={placeholder}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-sm text-secondary">Loading properties...</div>
            ) : filteredProperties.length > 0 ? (
              filteredProperties.map((property) => (
                <button
                  key={property._id}
                  type="button"
                  onClick={() => {
                    onChange(property);
                    setQuery('');
                    setOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 last:border-b-0 ${
                    property._id === value ? 'bg-primary/5' : ''
                  }`}
                >
                  <span className="block font-semibold text-sm text-on-surface">{property.title}</span>
                  <span className="block text-xs text-secondary mt-1">{property.location}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-sm text-secondary">{emptyMessage}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PropertySearchSelect;
