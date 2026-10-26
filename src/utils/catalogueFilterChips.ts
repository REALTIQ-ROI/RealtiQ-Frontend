import { writeCatalogueQuery } from './catalogueQuery';

const structuralKeys = new Set(['queryVersion', 'page', 'limit', 'mapActive', 'mapZoom', 'zoom', 'north', 'south', 'east', 'west']);
const humanize = (key: string) => key.replace(/([A-Z])/g, ' $1').replaceAll('_', ' ').trim();

export interface CatalogueFilterChip {
  key: string;
  value: string;
  index: number;
  label: string;
}

export const catalogueFilterChips = (params: URLSearchParams): CatalogueFilterChip[] => {
  const seen = new Map<string, number>();
  return [...params.entries()].flatMap(([key, value]) => {
    if (structuralKeys.has(key)) return [];
    const index = seen.get(key) ?? 0;
    seen.set(key, index + 1);
    const displayValue = value === 'true' ? 'Yes' : value === 'false' ? 'No' : value || '(empty)';
    return [{ key, value, index, label: `${humanize(key)}: ${displayValue}` }];
  });
};

export const removeCatalogueFilterChip = (params: URLSearchParams, chip: Pick<CatalogueFilterChip, 'key' | 'index'>): URLSearchParams => {
  const values = params.getAll(chip.key);
  const remaining = values.filter((_, index) => index !== chip.index);
  return writeCatalogueQuery({ [chip.key]: remaining.length ? remaining : null }, { base: params, resetPage: true });
};
