import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import PortalShell from '../../components/phase2/PortalShell';
import { personalisationService } from '../../services/personalisationService';
import type { FavouriteItem, RecentlyViewedItem, SavedSearch } from '../../types';

type Tab = 'favourites' | 'searches' | 'recent';

export default function Personalisation() {
  const [tab, setTab] = useState<Tab>('favourites');
  const [favourites, setFavourites] = useState<FavouriteItem[]>([]);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [recent, setRecent] = useState<RecentlyViewedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingSearch, setDeletingSearch] = useState<string | null>(null);

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

  return <PortalShell><main className="mx-auto max-w-5xl p-4 md:p-8">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="mb-2 text-3xl font-extrabold">Saved marketplace activity</h1><p className="text-slate-500">Manage favourites, saved searches and recent property history from your profile.</p></div><button type="button" onClick={() => void load()} className="rounded-lg border bg-white px-4 py-2 text-sm font-bold text-primary">Refresh</button></div>
    {error ? <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-800">{error}</p> : null}
    <nav aria-label="Personalisation sections" className="mb-6 flex flex-wrap gap-2">{(['favourites', 'searches', 'recent'] as const).map((item) => <button key={item} aria-current={tab === item ? 'page' : undefined} className={`rounded-full px-4 py-2 capitalize ${tab === item ? 'bg-primary text-white' : 'border bg-white'}`} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {loading ? <p role="status" className="py-8 text-center text-sm text-slate-500">Loading saved activity…</p> : null}
    {!loading && tab === 'favourites' ? <section aria-label="Saved properties" className="space-y-3">{favourites.length ? favourites.map(({ property }) => propertyRow(property, <button className="text-red-700 underline" onClick={() => void removeFavourite(property.publicReference)}>Remove</button>)) : <p className="rounded-xl border border-dashed p-8 text-center text-slate-500">No saved properties.</p>}</section> : null}
    {!loading && tab === 'recent' ? <section aria-label="Recently viewed properties"><div className="mb-3 flex justify-end"><button className="underline disabled:opacity-50" disabled={!recent.length} onClick={() => void personalisationService.clearRecent().then(() => setRecent([])).catch((raw: Error) => toast.error(raw.message))}>Clear history</button></div><div className="space-y-3">{recent.length ? recent.map(({ property }) => propertyRow(property, <button className="text-red-700 underline" onClick={() => void removeRecent(property.publicReference)}>Remove</button>)) : <p className="rounded-xl border border-dashed p-8 text-center text-slate-500">No recently viewed properties.</p>}</div></section> : null}
    {!loading && tab === 'searches' ? <section aria-label="Saved searches" className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <h2 className="font-bold">Canonical search saving is unavailable</h2>
        <p className="mt-1">The handoff documents the saved-search routes and persisted criteria, but does not specify the complete create/update request and response DTO. The earlier form sent a legacy filter shape, so it has been removed until a safe canonical request can be formed.</p>
        <p className="mt-2">You can still review and delete saved searches already on your profile. Delivery preferences for saved-search notifications are managed in <Link className="font-bold underline" to="/dashboard/notifications">Notifications</Link>.</p>
      </div>
      {searches.length ? searches.map((search) => <article key={search._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4"><div><h3 className="font-bold">{search.name || 'Saved search'}</h3><p className="text-sm text-slate-500">Saved on {search.createdAt ? new Date(search.createdAt).toLocaleDateString() : 'date unavailable'}</p></div><button className="text-red-700 underline disabled:opacity-50" disabled={deletingSearch === search._id} onClick={() => void removeSearch(search)}>{deletingSearch === search._id ? 'Deleting…' : 'Delete'}</button></article>) : <p className="rounded-xl border border-dashed p-8 text-center text-slate-500">No saved searches.</p>}
    </section> : null}
  </main></PortalShell>;
}
