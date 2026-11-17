import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useCompare } from '../../contexts/CompareContext';

const CompareTray = () => {
  const compare = useCompare();
  const location = useLocation();
  if (!compare.propertyIds.length) return null;
  const canOpen = compare.isBuyer ? Boolean(compare.set?.canOpen) : compare.propertyIds.length >= 2;
  const sourcePath = `${location.pathname}${location.search}`;

  const clear = async () => {
    try { await compare.clear(); toast.success('Compare list cleared.'); }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to clear Compare.'); }
  };
  const remove = async (id: string) => {
    try { await compare.remove(id); }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to remove this listing.'); }
  };

  return <aside aria-label="Compare tray" className="fixed inset-x-2 bottom-3 z-[1200] mx-auto max-w-5xl rounded-2xl border border-outline-variant/20 bg-surface/95 p-3 shadow-2xl backdrop-blur sm:inset-x-4 sm:bottom-5 sm:p-4">
    <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div aria-hidden="true" className="flex -space-x-2">
          {compare.trayEntries.slice(0, 4).map((entry) => entry.thumbnail ? <img key={entry.id} src={entry.thumbnail} alt="" className="h-10 w-10 rounded-lg border-2 border-surface object-cover" /> : <span key={entry.id} className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-surface bg-surface-container-low text-xs font-black">{entry.title.slice(0, 1).toUpperCase()}</span>)}
        </div>
        <div className="min-w-0"><p className="font-black text-on-surface">Compare <span className="text-primary">{compare.propertyIds.length} of 4</span></p><p className="truncate text-xs text-secondary">{compare.category ? `${compare.category === 'residential' ? 'Residential' : 'Commercial'} comparison` : 'Choose 2–4 listings in the same category'}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/compare" state={{ returnTo: sourcePath, returnScrollY: window.scrollY }} aria-disabled={!canOpen} className={`rounded-lg px-4 py-2 text-sm font-bold ${canOpen ? 'bg-primary text-on-primary' : 'pointer-events-none bg-surface-container-low text-secondary'}`} tabIndex={canOpen ? undefined : -1}>Compare</Link>
        <button type="button" disabled={compare.busy || compare.loading || (compare.isBuyer && !compare.set)} onClick={() => void clear()} className="rounded-lg border px-3 py-2 text-sm font-bold text-on-surface disabled:opacity-50">Clear</button>
        {compare.canUndo ? <button type="button" disabled={compare.busy} onClick={() => void compare.undo().catch((raw) => toast.error(raw instanceof Error ? raw.message : 'Undo is unavailable.'))} className="rounded-lg px-3 py-2 text-sm font-bold text-primary disabled:opacity-50">Undo</button> : null}
      </div>
    </div>
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Selected listings">
      {compare.trayEntries.map((entry) => <div key={entry.id} className="flex max-w-[220px] shrink-0 items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-xs">
        <span className="truncate font-semibold">{entry.title}</span>
        <button type="button" aria-label={`Remove ${entry.title} from compare`} disabled={compare.busy} onClick={() => void remove(entry.id)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-surface-container-high disabled:opacity-50"><span aria-hidden="true">×</span></button>
      </div>)}
      {compare.propertyIds.length === 1 ? <Link to="/compare" state={{ returnTo: sourcePath, returnScrollY: window.scrollY }} className="shrink-0 self-center text-xs font-bold text-primary underline">Add another or compare with similar</Link> : null}
    </div>
    {compare.error ? <p role="status" className="mt-2 text-xs text-amber-800">{compare.error}</p> : null}
  </aside>;
};

export default CompareTray;
