import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PortalShell from '../../components/phase2/PortalShell';
import { personalisationService } from '../../services/personalisationService';
import type { FavouriteItem, RecentlyViewedItem, SavedSearch } from '../../types';
import type { SavedSearchAlerts } from '../../types';
import { ApiRequestError } from '../../lib/axios';
import { savedSearchFiltersToUrl } from '../../utils/savedSearchQuery';

type Tab = 'favourites' | 'searches' | 'recent';
interface SearchEditDraft { search: SavedSearch; name: string; enabled: boolean; cadence: SavedSearchAlerts['cadence']; conflict: boolean; reviewedLatest: boolean }

export default function Personalisation() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('favourites');
  const [favourites, setFavourites] = useState<FavouriteItem[]>([]);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [recent, setRecent] = useState<RecentlyViewedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingSearch, setDeletingSearch] = useState<string | null>(null);
  const [editingSearch, setEditingSearch] = useState<SearchEditDraft | null>(null);
  const [savingSearch, setSavingSearch] = useState(false);

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const [favouriteResponse, searchResponse, recentResponse] = await Promise.all([
        personalisationService.favourites(),
        personalisationService.searches(),
        personalisationService.recent(),
      ]);
      setFavourites(favouriteResponse.favourites);
      setSearches(searchResponse.savedSearches);
      setRecent(recentResponse.recentlyViewed);
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : 'Unable to load saved marketplace activity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const propertyRow = (property: FavouriteItem['property'], action?: ReactNode) => (
    <article key={property.publicReference} className="flex justify-between gap-4 rounded-xl border bg-white p-4">
      <div><Link className="font-bold text-primary" to={`/properties/${property.publicReference}`}>{property.title}</Link><p className="text-sm text-slate-500">{property.location}</p></div>
      {action}
    </article>
  );

  const removeFavourite = async (propertyReference: string) => {
    const previous = favourites;
    setFavourites((items) => items.filter((item) => item.property.publicReference !== propertyReference));
    try { await personalisationService.setFavourite(propertyReference, false); }
    catch (raw) { setFavourites(previous); toast.error(raw instanceof Error ? raw.message : 'Unable to remove this favourite.'); }
  };

  const removeRecent = async (propertyReference: string) => {
    try {
      await personalisationService.removeRecent(propertyReference);
      setRecent((items) => items.filter((item) => item.property.publicReference !== propertyReference));
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to remove this history item.'); }
  };

  const removeSearch = async (search: SavedSearch) => {
    if (!window.confirm('Delete this saved search?')) return;
    setDeletingSearch(search._id);
    try {
      await personalisationService.deleteSearch(search.publicReference || search._id);
      setSearches((items) => items.filter((item) => item._id !== search._id));
      toast.success('Saved search deleted.');
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to delete this saved search.'); }
    finally { setDeletingSearch(null); }
  };

  const startSearchEdit = (search: SavedSearch) => setEditingSearch({
    search,
    name: search.name,
    enabled: search.alerts?.enabled ?? false,
    cadence: search.alerts?.cadence ?? 'daily',
    conflict: false,
    reviewedLatest: false,
  });

  const saveSearchSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingSearch || savingSearch || (editingSearch.conflict && !editingSearch.reviewedLatest)) return;
    setSavingSearch(true);
    const alertSettings: SavedSearchAlerts = { ...(editingSearch.search.alerts ?? {}), enabled: editingSearch.enabled, cadence: editingSearch.cadence };
    try {
      const updated = await personalisationService.updateSearch(editingSearch.search.publicReference || editingSearch.search._id, {
        name: editingSearch.name.trim(),
        alerts: alertSettings,
        expectedConfigurationRevision: editingSearch.search.configurationRevision,
      });
      setSearches((items) => items.map((item) => item._id === updated._id ? updated : item));
      setEditingSearch(null);
      toast.success('Saved search settings updated.');
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.code === 'CONFLICT_SAVED_SEARCH_VERSION') {
        try {
          const latest = await personalisationService.getSearch(editingSearch.search.publicReference || editingSearch.search._id);
          setSearches((items) => items.map((item) => item._id === latest._id ? latest : item));
          setEditingSearch({ ...editingSearch, search: latest, conflict: true, reviewedLatest: false });
          setError('This saved search changed elsewhere. The latest server revision is shown below; your edits are preserved for review.');
        } catch (refreshError) { setError(refreshError instanceof Error ? refreshError.message : 'The saved search changed, but its latest revision could not be loaded.'); }
      } else setError(raw instanceof Error ? raw.message : 'Unable to update this saved search.');
    } finally { setSavingSearch(false); }
  };

  return <PortalShell><main className="mx-auto max-w-5xl p-4 md:p-8">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="mb-2 text-3xl font-extrabold">Saved marketplace activity</h1><p className="text-slate-500">Manage favourites, saved searches and recent property history from your profile.</p></div><button type="button" onClick={() => void load()} className="rounded-lg border bg-white px-4 py-2 text-sm font-bold text-primary">Refresh</button></div>
    {error ? <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-800">{error}</p> : null}
    <nav aria-label="Personalisation sections" className="mb-6 flex flex-wrap gap-2">{(['favourites', 'searches', 'recent'] as const).map((item) => <button key={item} aria-current={tab === item ? 'page' : undefined} className={`rounded-full px-4 py-2 capitalize ${tab === item ? 'bg-primary text-white' : 'border bg-white'}`} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {loading ? <p role="status" className="py-8 text-center text-sm text-slate-500">Loading saved activity…</p> : null}
    {!loading && tab === 'favourites' ? <section aria-label="Saved properties" className="space-y-3">{favourites.length ? favourites.map(({ property }) => propertyRow(property, <button className="text-red-700 underline" onClick={() => void removeFavourite(property.publicReference)}>Remove</button>)) : <p className="rounded-xl border border-dashed p-8 text-center text-slate-500">No saved properties.</p>}</section> : null}
    {!loading && tab === 'recent' ? <section aria-label="Recently viewed properties"><div className="mb-3 flex justify-end"><button className="underline disabled:opacity-50" disabled={!recent.length} onClick={() => void personalisationService.clearRecent().then(() => setRecent([])).catch((raw: Error) => toast.error(raw.message))}>Clear history</button></div><div className="space-y-3">{recent.length ? recent.map(({ property }) => propertyRow(property, <button className="text-red-700 underline" onClick={() => void removeRecent(property.publicReference)}>Remove</button>)) : <p className="rounded-xl border border-dashed p-8 text-center text-slate-500">No recently viewed properties.</p>}</div></section> : null}
    {!loading && tab === 'searches' ? <section aria-label="Saved searches" className="space-y-4">
      <p className="text-sm text-slate-600">Saved-search alerts use server configuration. Delivery cadence or channels can remain paused when provider policy is unavailable.</p>
      {searches.length ? searches.map((search) => <article key={search._id} className="space-y-3 rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">{search.name || 'Saved search'}</h3><p className="text-sm text-slate-500">Revision {search.configurationRevision} · Saved {search.createdAt ? new Date(search.createdAt).toLocaleDateString() : 'date unavailable'}</p></div><div className="flex flex-wrap gap-3"><Link className="font-bold text-primary underline" to={`/properties?${savedSearchFiltersToUrl(search.filters)}`}>Open search</Link><button className="font-bold text-primary underline" onClick={() => navigate(`/properties?${savedSearchFiltersToUrl(search.filters)}`, { state: { savedSearchEdit: { id: search.publicReference || search._id, name: search.name, revision: search.configurationRevision } } })}>Edit criteria</button><button className="font-bold text-secondary underline" onClick={() => startSearchEdit(search)}>Edit settings</button><button className="text-red-700 underline disabled:opacity-50" disabled={deletingSearch === search._id} onClick={() => void removeSearch(search)}>{deletingSearch === search._id ? 'Deleting…' : 'Delete'}</button></div></div>
        {editingSearch?.search._id === search._id ? <form onSubmit={(event) => void saveSearchSettings(event)} className="grid gap-3 rounded-lg bg-surface-container-low p-4 sm:grid-cols-2"><label className="text-sm font-semibold">Name<input className="mt-1 block w-full rounded border bg-white px-3 py-2" value={editingSearch.name} maxLength={120} onChange={(event) => setEditingSearch({ ...editingSearch, name: event.target.value })} required /></label><label className="text-sm font-semibold">Alert cadence<select className="mt-1 block w-full rounded border bg-white px-3 py-2" value={editingSearch.cadence} onChange={(event) => setEditingSearch({ ...editingSearch, cadence: event.target.value as SavedSearchAlerts['cadence'] })}><option value="instant">Instant</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={editingSearch.enabled} onChange={(event) => setEditingSearch({ ...editingSearch, enabled: event.target.checked })} />Enable search alerts</label><div className="flex flex-wrap items-center justify-end gap-3"><button type="button" onClick={() => setEditingSearch(null)} className="text-sm underline">Cancel</button><button type="submit" disabled={savingSearch || !editingSearch.name.trim() || (editingSearch.conflict && !editingSearch.reviewedLatest)} className="rounded bg-primary px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{savingSearch ? 'Saving…' : 'Save settings'}</button></div>{editingSearch.conflict ? <div className="sm:col-span-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><p>Latest server revision: {editingSearch.search.configurationRevision}. Server criteria: <code>{JSON.stringify(editingSearch.search.filters)}</code>. Your name/alert edits remain in the form. Review this revision before updating it.</p><button type="button" className="mt-2 font-bold underline" onClick={() => setEditingSearch({ ...editingSearch, reviewedLatest: true })}>I reviewed the latest version</button></div> : null}</form> : null}
      </article>) : <p className="rounded-xl border border-dashed p-8 text-center text-slate-500">No saved searches.</p>}
    </section> : null}
  </main></PortalShell>;
}
