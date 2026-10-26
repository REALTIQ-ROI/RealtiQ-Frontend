import { useEffect, useState } from 'react';
import { locationService, locationSuggestionFailureMessage, type LocationSuggestion, type LocationSuggestionLevel } from '../../services/locationService';

interface Props {
  label: string;
  level: LocationSuggestionLevel;
  value: string;
  parentId?: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: LocationSuggestion) => void;
  className?: string;
}

const LocationSuggestionInput = ({ label, level, value, parentId, onChange, onSelect, className = '' }: Props) => {
  const query = value.trim();
  const requestKey = `${level}:${parentId ?? ''}:${query}`;
  const [result, setResult] = useState<{
    key: string;
    suggestions: LocationSuggestion[];
    loading: boolean;
    error: string;
  } | null>(null);
  const visibleResult = result?.key === requestKey ? result : null;
  const suggestions = visibleResult?.suggestions ?? [];
  const loading = visibleResult?.loading ?? false;
  const error = visibleResult?.error ?? '';

  useEffect(() => {
    if (query.length < 2 || (level !== 'state' && !parentId)) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setResult({ key: requestKey, suggestions: [], loading: true, error: '' });
      void locationService.suggestions({ level, q: query, ...(parentId ? { parentId } : {}), limit: 10 }, controller.signal)
        .then((response) => {
          if (!controller.signal.aborted) setResult({ key: requestKey, suggestions: response.suggestions, loading: false, error: '' });
        })
        .catch((raw: unknown) => {
          if (!controller.signal.aborted) {
            setResult({ key: requestKey, suggestions: [], loading: false, error: locationSuggestionFailureMessage(raw) });
          }
        });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [level, parentId, query, requestKey]);

  return <div className="relative">
    <label className="sr-only" htmlFor={`location-${level}`}>{label}</label>
    <input id={`location-${level}`} aria-label={label} aria-autocomplete="list" aria-expanded={Boolean(suggestions.length)} value={value} onChange={(event) => onChange(event.target.value)} className={className} placeholder={`Search ${label.toLowerCase()}`} />
    {loading ? <p role="status" className="mt-1 text-[11px] font-medium text-secondary">Finding published locations…</p> : null}
    {level !== 'state' && query.length >= 2 && !parentId ? <p className="mt-1 text-[11px] font-medium text-secondary">Select a parent location first to get suggestions.</p> : null}
    {error ? <p role="status" className="mt-1 text-[11px] font-medium text-amber-800">{error}</p> : null}
    {suggestions.length ? <ul role="listbox" aria-label={`${label} suggestions`} className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-outline-variant/30 bg-white p-1 shadow-lg">{suggestions.map((suggestion) => <li key={suggestion.id} role="option" aria-selected="false"><button type="button" onClick={() => { onSelect(suggestion); setResult(null); }} className="w-full rounded px-3 py-2 text-left hover:bg-surface-container-low"><span className="block text-sm font-semibold">{suggestion.name}</span><span className="block text-[11px] text-secondary">{suggestion.breadcrumbs.map((crumb) => crumb.name).join(' › ')} · {suggestion.publishedStockCount} published listings</span></button></li>)}</ul> : null}
  </div>;
};

export default LocationSuggestionInput;
