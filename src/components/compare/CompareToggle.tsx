import { toast } from 'sonner';
import type { Property } from '../../types';
import { compareCandidateFromProperty, useCompare } from '../../contexts/CompareContext';

const CompareToggle = ({ property, compact = false }: { property: Property; compact?: boolean }) => {
  const compare = useCompare();
  const id = property._id;
  const selected = compare.propertyIds.includes(id);
  const category = property.category ?? property.canonicalFields?.category ?? property.canonicalEffectiveFields?.category;
  if (!id || (category !== 'residential' && category !== 'commercial')) return null;

  const toggle = async () => {
    try { await compare.toggle(compareCandidateFromProperty(property)); }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to update Compare.'); }
  };

  return <button
    type="button"
    aria-pressed={selected}
    aria-label={`${selected ? 'Remove from' : 'Add to'} compare: ${property.title || 'property listing'}`}
    disabled={compare.busy || compare.loading || (compare.isBuyer && !compare.set)}
    onClick={() => void toggle()}
    className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/25 bg-surface px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5 disabled:cursor-wait disabled:opacity-60 ${compact ? 'min-h-9' : 'min-h-10'}`}
  >
    <span className="material-symbols-outlined text-base" aria-hidden="true">{selected ? 'check' : 'compare_arrows'}</span>
    {selected ? 'In Compare · Remove' : 'Add to compare'}
  </button>;
};

export default CompareToggle;
