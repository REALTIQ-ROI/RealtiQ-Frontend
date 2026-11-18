import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PortalShell from '../../components/phase2/PortalShell';
import { personalisationService } from '../../services/personalisationService';
import type { FavouriteItem, RecentlyViewedItem, SavedSearch, SavedSearchAlerts } from '../../types';
import { ApiRequestError } from '../../lib/axios';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import { savedSearchFiltersToUrl } from '../../utils/savedSearchQuery';
import SavedSearchAlertsFields, { defaultSavedSearchAlerts } from '../../components/property/SavedSearchAlertsFields';
import { withoutUnsupportedSavedSearchFilters } from '../../utils/catalogueQuery';
import ModalPortal from '../../components/ui/ModalPortal';
import { useAuth } from '../../contexts/AuthContext';

type Tab = 'favourites' | 'searches' | 'recent';
interface SearchEditDraft { search: SavedSearch; name: string; alerts: SavedSearchAlerts; conflict: boolean; reviewedLatest: boolean }

export default function Personalisation() {
  const navigate = useNavigate();
  const { activeProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('favourites');
  const [favourites, setFavourites] = useState<FavouriteItem[]>([]);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [recent, setRecent] = useState<RecentlyViewedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingSearch, setDeletingSearch] = useState<string | null>(null);
  const [editingSearch, setEditingSearch] = useState<SearchEditDraft | null>(null);
  const [savingSearch, setSavingSearch] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SavedSearch | null>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const loadSequence = useRef(0);
  const currentProfileId = useRef(activeProfile?.id ?? null);
  currentProfileId.current = activeProfile?.id ?? null;

  const load = useCallback(async () => {
    const request = ++loadSequence.current;
    const profileId = activeProfile?.id ?? null;
    setError('');
    setLoading(true);
    if (!profileId) {
      setFavourites([]); setSearches([]); setRecent([]);
      setError('Select a registered profile to view saved searches and activity.');
      setLoading(false);
      return;
    }
    try {
      const [favouriteResponse, searchResponse, recentResponse] = await Promise.all([
        personalisationService.favourites(),
        personalisationService.searches(),
        personalisationService.recent(),
      ]);
      if (request !== loadSequence.current || profileId !== currentProfileId.current) return;
      setFavourites(favouriteResponse.favourites);
      setSearches(searchResponse.savedSearches);
      setRecent(recentResponse.recentlyViewed);
    } catch (raw) {
      if (request === loadSequence.current && profileId === currentProfileId.current) setError(apiErrorMessage(raw, 'Unable to load saved marketplace activity.'));
    } finally {
      if (request === loadSequence.current && profileId === currentProfileId.current) setLoading(false);
    }
  }, [activeProfile?.id]);

  useEffect(() => {
    setFavourites([]); setSearches([]); setRecent([]);
    setEditingSearch(null); setConfirmDelete(null); setDeletingSearch(null);
    setError('');
    void load();
  }, [load]);

  useEffect(() => {
    if (!confirmDelete) return;
    cancelDeleteRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirmDelete(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmDelete]);

  const propertyRow = (property: FavouriteItem['property'], action?: ReactNode) => (
    <article key={property.publicReference} className="flex justify-between gap-4 rounded-xl border bg-white p-4">
      <div><Link className="font-bold text-primary" to={`/properties/${property.publicReference}`}>{property.title}</Link><p className="text-sm text-slate-500">{property.location}</p></div>
      {action}
    </article>
  );

  const removeFavourite = async (propertyReference: string) => {
    const profileId = currentProfileId.current;
    const previous = favourites;
    setFavourites((items) => items.filter((item) => item.property.publicReference !== propertyReference));
    try { await personalisationService.setFavourite(propertyReference, false); }
    catch (raw) { if (profileId === currentProfileId.current) { setFavourites(previous); toast.error(apiErrorMessage(raw, 'Unable to remove this favourite.')); } }
  };

  const removeRecent = async (propertyReference: string) => {
    const profileId = currentProfileId.current;
    try {
      await personalisationService.removeRecent(propertyReference);
      if (profileId === currentProfileId.current) setRecent((items) => items.filter((item) => item.property.publicReference !== propertyReference));
    } catch (raw) { if (profileId === currentProfileId.current) toast.error(apiErrorMessage(raw, 'Unable to remove this history item.')); }
  };

  const clearRecent = async () => {
    const profileId = currentProfileId.current;
    try {
      await personalisationService.clearRecent();
      if (profileId === currentProfileId.current) setRecent([]);
    } catch (raw) { if (profileId === currentProfileId.current) toast.error(apiErrorMessage(raw, 'Unable to clear this history.')); }
  };

  const removeSearch = async (search: SavedSearch) => {
    const profileId = currentProfileId.current;
    setDeletingSearch(search._id);
    try {
      await personalisationService.deleteSearch(search.publicReference || search._id);
      if (profileId !== currentProfileId.current) return;
      setSearches((items) => items.filter((item) => item._id !== search._id));
      toast.success('Saved search deleted.');
    } catch (raw) { if (profileId === currentProfileId.current) setError(apiErrorMessage(raw, 'Unable to delete this saved search.')); }
    finally { setDeletingSearch(null); }
  };

  const startSearchEdit = (search: SavedSearch) => setEditingSearch({
    search,
    name: search.name,
    alerts: { ...defaultSavedSearchAlerts, ...search.alerts, triggers: { ...defaultSavedSearchAlerts.triggers, ...search.alerts?.triggers }, channels: { ...defaultSavedSearchAlerts.channels, ...search.alerts?.channels } },
    conflict: false,
    reviewedLatest: false,
  });

  const saveSearchSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingSearch || savingSearch || (editingSearch.conflict && !editingSearch.reviewedLatest)) return;
    const profileId = currentProfileId.current;
    setSavingSearch(true);
    try {
      const updated = await personalisationService.updateSearch(editingSearch.search.publicReference || editingSearch.search._id, {
        name: editingSearch.name.trim(),
        filters: withoutUnsupportedSavedSearchFilters(editingSearch.search.filters),
        alerts: editingSearch.alerts,
        expectedConfigurationRevision: editingSearch.search.configurationRevision,
      });
      if (profileId !== currentProfileId.current) return;
      setSearches((items) => items.map((item) => item._id === updated._id ? updated : item));
      setEditingSearch(null);
      toast.success('Saved search settings updated.');
    } catch (raw) {
      if (profileId !== currentProfileId.current) return;
      if (raw instanceof ApiRequestError && raw.code === 'CONFLICT_SAVED_SEARCH_VERSION') {
        try {
          const latest = await personalisationService.getSearch(editingSearch.search.publicReference || editingSearch.search._id);
          setSearches((items) => items.map((item) => item._id === latest._id ? latest : item));
          setEditingSearch({ ...editingSearch, search: latest, conflict: true, reviewedLatest: false });
          setError('This saved search changed elsewhere. The latest server revision is shown below; your edits are preserved for review.');
        } catch (refreshError) { if (profileId === currentProfileId.current) setError(apiErrorMessage(refreshError, 'The saved search changed, but its latest revision could not be loaded.')); }
      } else setError(apiErrorMessage(raw, 'Unable to update this saved search.'));
    } finally { setSavingSearch(false); }
  };

  return <PortalShell><main className="mx-auto max-w-5xl p-4 md:p-8">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="mb-2 text-3xl font-extrabold">Saved marketplace activity</h1><p className="text-slate-500">Manage favourites, saved searches and recent property history from your profile.</p></div><button type="button" onClick={() => void load()} className="rounded-lg border bg-white px-4 py-2 text-sm font-bold text-primary">Refresh</button></div>
    {error ? <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-800">{error}</p> : null}
    <nav aria-label="Personalisation sections" className="mb-6 flex flex-wrap gap-2">{(['favourites', 'searches', 'recent'] as const).map((item) => <button key={item} aria-current={tab === item ? 'page' : undefined} className={`rounded-full px-4 py-2 capitalize ${tab === item ? 'bg-primary text-white' : 'border bg-white'}`} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {loading ? <p role="status" className="py-8 text-center text-sm text-slate-500">Loading saved activity…</p> : null}
    {!loading && tab === 'favourites' ? <section aria-label="Saved properties" className="space-y-3">{favourites.length ? favourites.map(({ property }) => propertyRow(property, <button className="text-red-700 underline" onClick={() => void removeFavourite(property.publicReference)}>Remove</button>)) : <p className="rounded-xl border border-dashed p-8 text-center text-slate-500">No saved properties.</p>}</section> : null}
    {!loading && tab === 'recent' ? <section aria-label="Recently viewed properties"><div className="mb-3 flex justify-end"><button className="underline disabled:opacity-50" disabled={!recent.length} onClick={() => void clearRecent()}>Clear history</button></div><div className="space-y-3">{recent.length ? recent.map(({ property }) => propertyRow(property, <button className="text-red-700 underline" onClick={() => void removeRecent(property.publicReference)}>Remove</button>)) : <p className="rounded-xl border border-dashed p-8 text-center text-slate-500">No recently viewed properties.</p>}</div></section> : null}
    {!loading && tab === 'searches' ? <section aria-label="Saved searches" className="space-y-4">
      <p className="text-sm text-slate-600">Saved-search alerts use server configuration. Delivery cadence or channels can remain paused when provider policy is unavailable.</p>
      {searches.length ? searches.map((search) => <article key={search._id} className="space-y-3 rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">{search.name || 'Saved search'}</h3><p className="text-sm text-slate-500">Revision {search.configurationRevision} · Saved {search.createdAt ? new Date(search.createdAt).toLocaleDateString() : 'date unavailable'}</p></div><div className="flex flex-wrap gap-3"><Link className="font-bold text-primary underline" to={`/properties?${savedSearchFiltersToUrl(search.filters)}`}>Open search</Link><button className="font-bold text-primary underline" onClick={() => navigate(`/properties?${savedSearchFiltersToUrl(search.filters)}`, { state: { savedSearchEdit: { id: search.publicReference || search._id, name: search.name, revision: search.configurationRevision, alerts: search.alerts } } })}>Edit criteria</button><button className="font-bold text-secondary underline" onClick={() => startSearchEdit(search)}>Edit settings</button><button className="text-red-700 underline disabled:opacity-50" disabled={deletingSearch === search._id} onClick={() => setConfirmDelete(search)}>{deletingSearch === search._id ? 'Deleting…' : 'Delete'}</button></div></div>
        {editingSearch?.search._id === search._id ? <form onSubmit={(event) => void saveSearchSettings(event)} className="space-y-3 rounded-lg bg-surface-container-low p-4"><label className="block text-sm font-semibold">Name<input className="mt-1 block w-full rounded border bg-white px-3 py-2" value={editingSearch.name} maxLength={120} onChange={(event) => setEditingSearch({ ...editingSearch, name: event.target.value })} required /></label><SavedSearchAlertsFields value={editingSearch.alerts} onChange={(alerts) => setEditingSearch({ ...editingSearch, alerts })} idPrefix={`saved-search-${search._id}`} />{editingSearch.conflict ? <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><p>Saved search revision {editingSearch.search.configurationRevision} is now current on the server. Your name and alert changes are preserved. Open the latest search criteria to review them before saving.</p><Link className="mt-2 inline-block font-bold underline" to={`/properties?${savedSearchFiltersToUrl(editingSearch.search.filters)}`}>Review latest search criteria</Link><button type="button" className="ml-4 font-bold underline" onClick={() => setEditingSearch({ ...editingSearch, reviewedLatest: true })}>I reviewed the latest version</button></div> : null}<div className="flex flex-wrap items-center justify-end gap-3"><button type="button" onClick={() => setEditingSearch(null)} className="text-sm underline">Cancel</button><button type="submit" disabled={savingSearch || !editingSearch.name.trim() || (editingSearch.conflict && !editingSearch.reviewedLatest)} className="rounded bg-primary px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{savingSearch ? 'Saving…' : 'Save settings'}</button></div></form> : null}
      </article>) : <p className="rounded-xl border border-dashed p-8 text-center text-slate-500">No saved searches.</p>}
    </section> : null}
    {confirmDelete ? <ModalPortal><div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmDelete(null); }}><section role="alertdialog" aria-modal="true" aria-labelledby="delete-search-title" aria-describedby="delete-search-description" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="delete-search-title" className="text-xl font-bold">Delete saved search?</h2><p id="delete-search-description" className="mt-2 text-sm text-slate-600">“{confirmDelete.name || 'Saved search'}” and its alert preferences will be removed from this profile.</p><div className="mt-6 flex justify-end gap-3"><button ref={cancelDeleteRef} type="button" onClick={() => setConfirmDelete(null)} className="rounded-lg border px-4 py-2 font-semibold">Keep search</button><button type="button" disabled={deletingSearch === confirmDelete._id} onClick={() => { const target = confirmDelete; setConfirmDelete(null); void removeSearch(target); }} className="rounded-lg bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-50">{deletingSearch === confirmDelete._id ? 'Deleting…' : 'Delete search'}</button></div></section></div></ModalPortal> : null}
  </main></PortalShell>;
}
