import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import ProxyInspectorCard from '../../components/proxyNetwork/ProxyInspectorCard';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import { PROFESSIONAL_TYPES } from '../../features/proxyNetwork/config';
import { useProxyResource } from '../../features/proxyNetwork/useProxyResource';
import { proxyNetworkService } from '../../services/proxyNetworkService';
import type { AvailabilityStatus, ProfessionalType, PublicInspectorFilters } from '../../types/proxyNetwork';

const PublicInspectorDirectory = () => {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const filters = useMemo<PublicInspectorFilters>(() => ({
    state: params.get('state') || undefined, city: params.get('city') || undefined,
    serviceArea: params.get('serviceArea') || undefined, specialty: params.get('specialty') || undefined,
    professionalType: (params.get('professionalType') || undefined) as ProfessionalType | undefined,
    minimumRating: params.get('minimumRating') ? Number(params.get('minimumRating')) : undefined,
    availability: (params.get('availability') || undefined) as AvailabilityStatus | undefined,
    search: params.get('search') || undefined,
    latitude: params.get('latitude') ? Number(params.get('latitude')) : undefined,
    longitude: params.get('longitude') ? Number(params.get('longitude')) : undefined,
    radius: params.get('radius') ? Number(params.get('radius')) : undefined,
    page: Number(params.get('page') || 1), limit: Number(params.get('limit') || 20),
  }), [params]);
  const resource = useProxyResource((signal) => proxyNetworkService.listPublicInspectors(filters, signal), [JSON.stringify(filters)]);
  const facets = useProxyResource((signal) => proxyNetworkService.listPublicInspectorFacetProfiles(signal), []);
  const facetOptions = useMemo(() => {
    const profiles = facets.data ?? [];
    const states = [...new Set(profiles.map((profile) => profile.location?.state?.trim()).filter((value): value is string => Boolean(value)))].sort();
    const inState = filters.state
      ? profiles.filter((profile) => profile.location?.state === filters.state)
      : profiles;
    const cities = [...new Set(inState.map((profile) => profile.location?.city?.trim()).filter((value): value is string => Boolean(value)))].sort();
    const inCity = filters.city
      ? inState.filter((profile) => profile.location?.city === filters.city)
      : inState;
    const serviceAreas = [...new Set(inCity.flatMap((profile) => profile.serviceAreas ?? []).map((value) => value.trim()).filter(Boolean))].sort();
    const inServiceArea = filters.serviceArea
      ? inCity.filter((profile) => profile.serviceAreas?.includes(filters.serviceArea!))
      : inCity;
    const specialties = [...new Set(inServiceArea.flatMap((profile) => profile.specialties ?? []).map((value) => value.trim()).filter(Boolean))].sort();
    return { states, cities, serviceAreas, specialties };
  }, [facets.data, filters.city, filters.serviceArea, filters.state]);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key);
    if (key === 'state') {
      next.delete('city'); next.delete('serviceArea'); next.delete('specialty');
    } else if (key === 'city') {
      next.delete('serviceArea'); next.delete('specialty');
    } else if (key === 'serviceArea') {
      next.delete('specialty');
    }
    if (key !== 'page') next.set('page', '1'); setParams(next);
  };
  const locate = () => navigator.geolocation?.getCurrentPosition(
    ({ coords }) => { const next = new URLSearchParams(params); next.set('latitude', String(coords.latitude)); next.set('longitude', String(coords.longitude)); next.set('radius', next.get('radius') || '50'); next.set('page', '1'); setParams(next); },
    () => { /* manual fields remain available */ },
  );
  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-secondary">Independent professional network</p><h1 className="mt-2 text-4xl font-black">Find a RealtiQ Verified Property Agent</h1><p className="mt-3 max-w-3xl text-secondary">Hire a RealtiQ Verified Property Agent to record a walkthrough, photograph the property, and prepare an observational condition report. These agents are independent third parties, not RealtiQ employees.</p></div>
          <Link to="/proxy-inspectors/register" className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary">Join as a professional</Link>
        </div>
        <form className="mt-8 grid gap-3 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4" onSubmit={(event) => { event.preventDefault(); update('search', search.trim()); }}>
          <label className="text-xs font-bold">Search<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, title, specialty" className="mt-2 w-full rounded-lg bg-surface-container-low px-3 py-3 text-sm" /></label>
          <label className="text-xs font-bold">State<select value={params.get('state') ?? ''} onChange={(e) => update('state', e.target.value)} disabled={facets.loading} className="mt-2 w-full rounded-lg bg-surface-container-low px-3 py-3 text-sm disabled:opacity-60"><option value="">{facets.loading ? 'Loading states…' : 'All states'}</option>{facetOptions.states.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="text-xs font-bold">City<select value={params.get('city') ?? ''} onChange={(e) => update('city', e.target.value)} disabled={facets.loading || facetOptions.cities.length === 0} className="mt-2 w-full rounded-lg bg-surface-container-low px-3 py-3 text-sm disabled:opacity-60"><option value="">All cities</option>{facetOptions.cities.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="text-xs font-bold">Service area<select value={params.get('serviceArea') ?? ''} onChange={(e) => update('serviceArea', e.target.value)} disabled={facets.loading || facetOptions.serviceAreas.length === 0} className="mt-2 w-full rounded-lg bg-surface-container-low px-3 py-3 text-sm disabled:opacity-60"><option value="">All service areas</option>{facetOptions.serviceAreas.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="text-xs font-bold">Professional type<select value={params.get('professionalType') ?? ''} onChange={(e) => update('professionalType', e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-3 py-3 text-sm"><option value="">All professions</option>{PROFESSIONAL_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="text-xs font-bold">Specialty<select value={params.get('specialty') ?? ''} onChange={(e) => update('specialty', e.target.value)} disabled={facets.loading || facetOptions.specialties.length === 0} className="mt-2 w-full rounded-lg bg-surface-container-low px-3 py-3 text-sm disabled:opacity-60"><option value="">All specialties</option>{facetOptions.specialties.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="text-xs font-bold">Minimum rating<select value={params.get('minimumRating') ?? ''} onChange={(e) => update('minimumRating', e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-3 py-3 text-sm"><option value="">Any rating</option><option value="3">3+</option><option value="4">4+</option><option value="5">5</option></select></label>
          <label className="text-xs font-bold">Availability<select value={params.get('availability') ?? ''} onChange={(e) => update('availability', e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-3 py-3 text-sm"><option value="">Any</option><option value="available">Available</option><option value="busy">Busy</option><option value="unavailable">Unavailable</option></select></label>
          <button className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary" type="submit">Apply search</button>
          <button className="rounded-lg bg-surface-container-high px-4 py-3 text-sm font-bold" type="button" onClick={locate}>Use my location</button>
        </form>
        {facets.error ? <p role="status" className="mt-3 text-sm text-error">Filter options could not be refreshed. <button type="button" className="font-bold underline" onClick={() => void facets.reload()}>Retry</button></p> : null}
        {resource.loading ? <LoadingState label="Finding verified inspectors…" /> : null}
        {resource.error ? <ErrorState message={resource.error.message} onRetry={() => void resource.reload()} /> : null}
        {resource.data?.inspectors.length === 0 ? <div className="py-16 text-center"><h2 className="text-xl font-bold">No inspectors found</h2><p className="mt-2 text-secondary">Try a broader location or fewer filters.</p></div> : null}
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{resource.data?.inspectors.map((item) => <ProxyInspectorCard key={item._id} inspector={item} propertyId={params.get('propertyId') || undefined} />)}</div>
        {resource.data ? <nav aria-label="Inspector pages" className="mt-8 flex items-center justify-between"><p className="text-sm text-secondary">Page {resource.data.page} · {resource.data.total} professionals</p><div className="flex gap-2"><button disabled={resource.data.page <= 1} onClick={() => update('page', String(resource.data!.page - 1))} className="rounded-lg bg-white px-4 py-2 disabled:opacity-40">Previous</button><button disabled={resource.data.page * resource.data.limit >= resource.data.total} onClick={() => update('page', String(resource.data!.page + 1))} className="rounded-lg bg-white px-4 py-2 disabled:opacity-40">Next</button></div></nav> : null}
      </section>
    </PublicLayout>
  );
};
export default PublicInspectorDirectory;
