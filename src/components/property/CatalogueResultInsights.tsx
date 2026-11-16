import { useMemo } from 'react';
import { useCanonicalFieldDictionary } from '../../hooks/useCanonicalFieldDictionary';
import { fieldVocabularyOptions } from '../../utils/propertyVocabulary';
import type { CatalogueQueryChanges } from '../../utils/catalogueQuery';

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue => typeof value === 'object' && value !== null && !Array.isArray(value);
const title = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
const countEntries = (value: unknown): Array<[string, number]> => isRecord(value)
  ? Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]))
  : [];

const facetGroups = ['categories', 'propertyTypes', 'buildStages', 'availability', 'media', 'viewings', 'freshness', 'priceCountsByCurrency'] as const;

const parseSuggestionPatch = (value: unknown): CatalogueQueryChanges | null => {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value);
  if (!entries.length || entries.some(([, item]) => item !== null && typeof item !== 'string' && typeof item !== 'number' && typeof item !== 'boolean' &&
    !(Array.isArray(item) && item.every((child) => typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean')))) return null;
  return value as CatalogueQueryChanges;
};

const describeChange = (patch: CatalogueQueryChanges): string => {
  const keys = Object.keys(patch);
  if (keys.some((key) => key === 'search')) return 'Broaden the keyword search';
  if (keys.some((key) => key === 'exactBedrooms' || key === 'bedrooms')) return 'Broaden the bedroom requirement';
  if (keys.some((key) => ['state', 'lga', 'area', 'estateName'].includes(key))) return 'Broaden the selected location';
  if (keys.some((key) => key === 'minPrice' || key === 'maxPrice')) return 'Expand the price range';
  return 'Try the server suggested criteria';
};

interface CatalogueResultInsightsProps {
  facets?: unknown;
  diagnostics?: unknown;
  onApplySuggestion?: (patch: CatalogueQueryChanges) => void;
}

export default function CatalogueResultInsights({ facets, diagnostics, onApplySuggestion }: CatalogueResultInsightsProps) {
  const { dictionary } = useCanonicalFieldDictionary();
  const fieldMap = useMemo(() => new Map((dictionary?.fields ?? []).map((field) => [field.key, field])), [dictionary]);
  if (!isRecord(facets) && !isRecord(diagnostics)) return null;
  const diagnosticRecord = isRecord(diagnostics) ? diagnostics : null;
  const suggestions = diagnosticRecord?.state === 'zero_results' && Array.isArray(diagnosticRecord.suggestions) ? diagnosticRecord.suggestions : [];
  const hasCounts = isRecord(facets) && (facetGroups.some((key) => countEntries(facets[key]).length > 0) ||
    (isRecord(facets.byField) && Object.values(facets.byField).some((value) => countEntries(value).length > 0)) ||
    ['unpriced', 'distressSale', 'verifiedListing'].some((key) => typeof facets[key] === 'number'));

  return <section className="space-y-3" aria-label="Search result details">
    {suggestions.length > 0 ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <h2 className="font-bold">No results for these criteria</h2>
      <p className="mt-1 text-sm">The suggestions below come from the search service. Choose one to run a new search; your current criteria stay unchanged until then.</p>
      <ol className="mt-3 space-y-2">{suggestions.map((raw, index) => {
        const suggestion = isRecord(raw) ? raw : {};
        const patch = parseSuggestionPatch(suggestion.change);
        const matched = typeof suggestion.matched === 'number' && Number.isFinite(suggestion.matched) ? suggestion.matched : null;
        const unavailable = suggestion.state === 'fx_unconfigured';
        return <li key={`suggestion-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-3 text-sm">
          <span>{unavailable ? 'This price suggestion needs configured currency comparison.' : patch ? describeChange(patch) : 'A server suggestion is available but cannot be applied from this response.'}{matched !== null ? ` · about ${matched.toLocaleString()} matches` : ''}</span>
          {patch && onApplySuggestion ? <button type="button" className="font-bold text-primary underline" onClick={() => onApplySuggestion(patch)}>Try this search</button> : null}
        </li>;
      })}</ol>
    </div> : null}
    {hasCounts && isRecord(facets) ? <details className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-3">
      <summary className="cursor-pointer text-sm font-bold">Result counts from the full matching set</summary>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {facetGroups.map((groupKey) => {
          const entries = countEntries(facets[groupKey]);
          if (!entries.length) return null;
          const fieldKey = groupKey === 'categories' ? 'category' : groupKey === 'propertyTypes' ? 'propertyType' : groupKey === 'buildStages' ? 'buildStage' : groupKey === 'availability' ? 'availability' : groupKey;
          const field = fieldMap.get(fieldKey);
          const labels = field ? new Map(fieldVocabularyOptions(field, dictionary).map((option) => [option.value, option.label])) : new Map<string, string>();
          return <div key={groupKey}><h3 className="text-xs font-bold uppercase tracking-wide text-secondary">{title(groupKey)}</h3><ul className="mt-1 space-y-1 text-sm">{entries.slice(0, 12).map(([key, count]) => <li key={key} className="flex justify-between gap-3"><span>{labels.get(key) ?? title(key)}</span><span className="tabular-nums">{count.toLocaleString()}</span></li>)}</ul></div>;
        })}
        {(['unpriced', 'distressSale', 'verifiedListing'] as const).map((key) => typeof facets[key] === 'number' ? <div key={key} className="flex justify-between gap-3 text-sm"><span>{key === 'unpriced' ? 'Price on application' : key === 'distressSale' ? 'Reviewed distress sale' : 'Platform verified listing'}</span><span className="tabular-nums">{(facets[key] as number).toLocaleString()}</span></div> : null)}
        {isRecord(facets.byField) ? Object.entries(facets.byField).flatMap(([key, value]) => {
          const entries = countEntries(value);
          if (!entries.length) return [];
          const field = fieldMap.get(key);
          const labelMap = new Map(field ? fieldVocabularyOptions(field, dictionary).map((option) => [option.value, option.label]) : []);
          const truncated = isRecord(facets.byFieldTruncated) && facets.byFieldTruncated[key] === true;
          return [<div key={`field-${key}`}><h3 className="text-xs font-bold uppercase tracking-wide text-secondary">{typeof field?.label === 'string' ? field.label : title(key)}</h3><ul className="mt-1 space-y-1 text-sm">{entries.slice(0, 12).map(([valueKey, count]) => <li key={valueKey} className="flex justify-between gap-3"><span>{labelMap.get(valueKey) ?? title(valueKey)}</span><span className="tabular-nums">{count.toLocaleString()}</span></li>)}</ul>{truncated ? <p className="mt-1 text-xs text-secondary">More values are available; these counts are not exhaustive.</p> : null}</div>];
        }) : null}
      </div>
    </details> : null}
  </section>;
}
