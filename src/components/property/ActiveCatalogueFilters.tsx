import { catalogueFilterChips } from '../../utils/catalogueFilterChips';

interface Props {
  params: URLSearchParams;
  onClear: (key: string, index: number) => void;
}

const ActiveCatalogueFilters = ({ params, onClear }: Props) => {
  const chips = catalogueFilterChips(params);
  if (!chips.length) return null;
  return <div className="flex shrink-0 flex-wrap gap-2 border-b border-outline-variant/20 bg-surface px-4 py-2 sm:px-6" aria-label="Active search filters">
    {chips.map((chip) => <button key={`${chip.key}:${chip.index}:${chip.value}`} type="button" title={`Clear ${chip.label}`} onClick={() => onClear(chip.key, chip.index)} className="inline-flex items-center gap-1 rounded-full border border-outline-variant/30 bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-on-surface hover:border-primary">
      <span>{chip.label}</span><span aria-hidden="true" className="material-symbols-outlined text-sm">close</span>
    </button>)}
  </div>;
};

export default ActiveCatalogueFilters;
