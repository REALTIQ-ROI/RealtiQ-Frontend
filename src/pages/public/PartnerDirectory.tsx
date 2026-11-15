import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import LocationSuggestionInput from '../../components/property/LocationSuggestionInput';
import type { LocationSuggestion } from '../../services/locationService';
import { locationSuggestionFailureMessage } from '../../services/locationService';
import { group07Service, type Group07PartnerService } from '../../services/group07Service';
import { useAuth } from '../../contexts/AuthContext';

type DirectoryPartner = Awaited<ReturnType<typeof group07Service.partnerDirectory>>['partners'][number];
const money = (minor: number, currency: string) => new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);

export default function PartnerDirectory() {
  const { activeProfile, isAuthenticated } = useAuth();
  const profileRef = useRef(activeProfile?.id ?? ''); profileRef.current = activeProfile?.id ?? '';
  const [partners, setPartners] = useState<DirectoryPartner[]>([]);
  const [directoryState, setDirectoryState] = useState<'ready' | 'unavailable' | 'loading'>('loading');
  const [unavailableCode, setUnavailableCode] = useState('');
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [serviceKey, setServiceKey] = useState('');
  const [includeNew, setIncludeNew] = useState(true);
  const [stateQuery, setStateQuery] = useState('');
  const [selectedState, setSelectedState] = useState<LocationSuggestion | null>(null);
  const [cityId, setCityId] = useState('');
  const [cityOptions, setCityOptions] = useState<Array<{ cityId: string; name: string }>>([]);
  const [cityState, setCityState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const [cityError, setCityError] = useState('');
  const [cityRetry, setCityRetry] = useState(0);
  const [matchServiceId, setMatchServiceId] = useState('');
  const [matchStateText, setMatchStateText] = useState('');
  const [matchState, setMatchState] = useState<LocationSuggestion | null>(null);
  const [matchPoint, setMatchPoint] = useState<[number, number] | null>(null);
  const [matchBody, setMatchBody] = useState<Parameters<typeof group07Service.createPartnerJob>[0] | null>(null);
  const [matchError, setMatchError] = useState('');
  const [matchBusy, setMatchBusy] = useState(false);
  const [matchRequested, setMatchRequested] = useState(false);

  useEffect(() => { setMatchServiceId(''); setMatchState(null); setMatchStateText(''); setMatchPoint(null); setMatchBody(null); setMatchError(''); setMatchRequested(false); }, [activeProfile?.id]);

  const load = async (reset = true) => {
    setDirectoryState('loading'); setError('');
    try {
      const result = await group07Service.partnerDirectory({
        limit: 25,
        ...(q.trim() ? { q: q.trim() } : {}),
        ...(kind ? { kind } : {}),
        ...(serviceKey ? { serviceKey } : {}),
        includeNew,
        ...(selectedState ? { stateId: selectedState.id } : {}),
        ...(cityId ? { cityId } : {}),
        ...(!reset && nextCursor ? { after: nextCursor } : {}),
      });
      setDirectoryState(result.state);
      setUnavailableCode(result.code ?? '');
      setPartners((current) => reset ? result.partners : [...current, ...result.partners]);
      setNextCursor(result.nextCursor);
    } catch (raw) {
      setDirectoryState('ready'); setError(raw instanceof Error ? raw.message : 'Unable to load the partner directory.');
    }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    setCityId(''); setCityOptions([]); setCityError('');
    if (!selectedState) { setCityState('idle'); return; }
    let current = true; setCityState('loading');
    const pages: Array<{ cityId: string; name: string }> = [];
    const read = async (after?: string | null) => {
      const page = await group07Service.partnerCities(selectedState.id, after);
      pages.push(...page.cities.map(({ cityId: id, name }) => ({ cityId: id, name })));
      if (page.nextCursor) await read(page.nextCursor);
    };
    void read().then(() => { if (current) { setCityOptions(pages); setCityState('ready'); } }).catch((raw) => {
      if (current) { setCityState('unavailable'); if (raw instanceof Error && raw.message) setCityError(locationSuggestionFailureMessage(raw)); }
    });
    return () => { current = false; };
  }, [selectedState?.id, cityRetry]);
  const kinds = useMemo(() => [...new Set(partners.map((partner) => partner.kind))].sort(), [partners]);
  const services = useMemo(() => [...new Set(partners.map((partner) => partner.service.serviceKey))].sort(), [partners]);
  const submitFilters = (event: FormEvent) => { event.preventDefault(); setNextCursor(null); void load(true); };

  return <PublicLayout><main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-8">
    <header><p className="text-xs font-bold uppercase tracking-[.18em] text-secondary">Partner Network</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Find a verified professional</h1><p className="mt-2 max-w-3xl text-secondary">Compare approved services, rates, payment terms and availability before requesting a service.</p></header>
    <form className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={submitFilters}>
      <label className="text-sm font-bold">Search partners<input className="mt-1 w-full rounded-lg border p-3 font-normal" type="search" value={q} onChange={(e) => setQ(e.target.value)} maxLength={120} /></label>
      <label className="flex items-center gap-2 self-end rounded-lg border p-3 text-sm font-semibold"><input type="checkbox" checked={includeNew} onChange={(event) => setIncludeNew(event.target.checked)} />Include New to REALTIQ</label>
      <label className="text-sm font-bold">Partner type<select className="mt-1 w-full rounded-lg border p-3 font-normal" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">All available types</option>{kinds.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select></label>
      <label className="text-sm font-bold">Service<select className="mt-1 w-full rounded-lg border p-3 font-normal" value={serviceKey} onChange={(e) => setServiceKey(e.target.value)}><option value="">All available services</option>{services.map((option) => <option key={option} value={option}>{partners.find((partner) => partner.service.serviceKey === option)?.service.label ?? option}</option>)}</select></label>
      <div><span className="text-sm font-bold">State</span><LocationSuggestionInput label="State" level="state" value={stateQuery} onChange={(value) => { setStateQuery(value); setSelectedState(null); }} onSelect={(selected) => { setSelectedState(selected); setStateQuery(selected.name); }}/></div>
      <label className="text-sm font-bold">City<select className="mt-1 w-full rounded-lg border p-3 font-normal" value={cityId} disabled={!selectedState || cityState !== 'ready'} onChange={(event) => setCityId(event.target.value)}><option value="">All approved cities</option>{cityOptions.map((city) => <option key={city.cityId} value={city.cityId}>{city.name}</option>)}</select>{cityState === 'loading' ? <span role="status" className="mt-1 block text-xs font-normal">Loading approved cities…</span> : null}{cityState === 'unavailable' ? <span role="status" className="mt-1 block text-xs font-normal">{cityError || 'City filtering is unavailable; state filtering remains available.'} <button type="button" onClick={() => setCityRetry((value) => value + 1)} className="font-bold underline">Retry</button></span> : null}</label>
      <button className="self-end rounded-lg bg-primary px-5 py-3 font-bold text-on-primary" type="submit">Search</button>
    </form>
    {directoryState === 'loading' ? <p role="status">Loading approved services…</p> : null}
    {error ? <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-900">{error}<button className="ml-3 font-bold underline" onClick={() => void load()}>Retry</button></div> : null}
    {directoryState === 'unavailable' ? <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-5"><h2 className="font-bold">Partner services are not available yet</h2><p className="mt-1 text-sm">The approved service catalogue is unavailable right now. Try again later.</p>{unavailableCode ? <span className="sr-only">{unavailableCode}</span> : null}<button className="mt-3 font-bold underline" onClick={() => void load()}>Check again</button></div> : null}
    {isAuthenticated && activeProfile?.kind === 'buyer' && directoryState === 'ready' && partners.some((partner) => partner.service.bookable) ? <section className="rounded-2xl border bg-white p-5"><div><h2 className="text-xl font-black">Find a matching professional</h2><p className="mt-1 max-w-3xl text-sm text-secondary">Choose a currently bookable service and state, then allow your browser to provide a one-time location point for matching. Coordinates are sent only with this request and are not shown or saved in this form.</p></div>{matchRequested ? <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3">Your matching request was accepted by the server. Track its current state in your Partner Workspace.</p> : <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); void requestAutomaticMatch(); }}><label className="text-sm font-bold">Service<select required value={matchServiceId} onChange={(event) => { setMatchServiceId(event.target.value); setMatchBody(null); setMatchError(''); }} className="mt-1 block w-full rounded-lg border p-3"><option value="">Choose a bookable service</option>{partners.filter((partner) => partner.service.bookable).map((partner) => <option key={`${partner.profileId}:${partner.service.id}`} value={partner.service.id}>{partner.service.label} · {partner.roleLabel}</option>)}</select></label><div><span className="text-sm font-bold">Your current state</span><LocationSuggestionInput label="State" level="state" value={matchStateText} onChange={(value) => { setMatchStateText(value); setMatchState(null); setMatchBody(null); }} onSelect={(value) => { setMatchState(value); setMatchStateText(value.name); setMatchBody(null); }} className="w-full rounded-lg border p-3" /></div><div className="flex flex-col justify-end gap-2"><p role="status" className="text-xs text-secondary">{matchPoint ? 'Browser location is ready for matching.' : 'Browser location has not been requested.'}</p><button disabled={matchBusy || !matchServiceId || !matchState} className="rounded-lg bg-primary px-4 py-3 font-bold text-on-primary disabled:opacity-50">{matchBusy ? 'Requesting match…' : matchBody && matchError ? 'Retry same request' : 'Request a match'}</button></div>{matchError ? <p role="alert" className="md:col-span-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">{matchError}</p> : null}<p className="md:col-span-3 text-xs text-secondary">If browser location is unavailable, buyer-choice requests remain available from an individual professional card.</p></form>}</section> : null}
    {directoryState === 'ready' && !error ? <section aria-label="Approved partner services" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {partners.map((partner) => <PartnerCard key={`${partner.profileId}:${partner.service.id}`} partner={partner} canRequest={Boolean(isAuthenticated && activeProfile?.kind === 'buyer')} />)}
      {!partners.length ? <p className="col-span-full rounded-xl border border-dashed p-8 text-center text-secondary">No approved services match those filters.</p> : null}
    </section> : null}
    {nextCursor ? <button type="button" disabled={directoryState === 'loading'} className="rounded-lg border bg-white px-5 py-3 font-bold disabled:opacity-60" onClick={() => void load(false)}>Load more partners</button> : null}
  </main></PublicLayout>;

  async function requestAutomaticMatch() {
    if (matchBusy || !matchState || !matchServiceId) return;
    const requestProfileId = activeProfile?.id;
    const selected = partners.find((partner) => partner.service.id === matchServiceId && partner.service.bookable);
    if (!selected) { setMatchError('This service is no longer available in the current directory. Refresh the directory before requesting.'); setMatchBody(null); return; }
    const createRequest = async (point: [number, number]) => {
      if (!requestProfileId || profileRef.current !== requestProfileId) { setMatchBusy(false); setMatchError('The selected profile changed. Review this request again before continuing.'); return; }
      const same = matchBody && matchBody.serviceKey === selected.service.serviceKey && matchBody.kind === selected.kind && matchBody.clientStateId === matchState.id;
      const body = same ? matchBody : { kind: selected.kind, serviceKey: selected.service.serviceKey, assignmentMethod: 'automatic' as const, clientStateId: matchState.id, clientPoint: point, operationKey: `partner_${crypto.randomUUID().replaceAll('-', '')}` };
      setMatchBody(body); setMatchBusy(true); setMatchError('');
      try { await group07Service.createPartnerJob(body); setMatchRequested(true); }
      catch (raw) { setMatchError(raw instanceof Error ? raw.message : 'The matching request could not be confirmed. Retry only while the service, state and selected profile are unchanged.'); }
      finally { setMatchBusy(false); }
    };
    if (matchBody?.clientPoint && matchBody.serviceKey === selected.service.serviceKey && matchBody.kind === selected.kind && matchBody.clientStateId === matchState.id) { await createRequest(matchBody.clientPoint); return; }
    if (!navigator.geolocation) { setMatchError('This browser cannot provide a secure current-location point. Use buyer choice from a professional card instead.'); return; }
    setMatchBusy(true); setMatchError('');
    navigator.geolocation.getCurrentPosition((position) => { if (!requestProfileId || profileRef.current !== requestProfileId) { setMatchBusy(false); setMatchError('The selected profile changed. Review this request again before continuing.'); return; } const point: [number, number] = [position.coords.longitude, position.coords.latitude]; setMatchPoint(point); void createRequest(point); }, (reason) => { setMatchBusy(false); setMatchError(reason.code === reason.PERMISSION_DENIED ? 'Allow location access to request an automatic match, or use buyer choice from a professional card.' : 'Current location could not be read. Try again or use buyer choice from a professional card.'); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  }
}

function PartnerCard({ partner, canRequest }: { partner: DirectoryPartner; canRequest: boolean }) {
  const { activeProfile } = useAuth();
  const service: Group07PartnerService = partner.service;
  const [requestOpen, setRequestOpen] = useState(false);
  const [stateText, setStateText] = useState('');
  const [clientState, setClientState] = useState<LocationSuggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requested, setRequested] = useState(false);
  const [requestBody, setRequestBody] = useState<Parameters<typeof group07Service.createPartnerJob>[0] | null>(null);
  useEffect(() => { setRequestOpen(false); setClientState(null); setStateText(''); setRequested(false); setRequestBody(null); setRequestError(''); }, [activeProfile?.id]);
  const submitRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (!clientState || busy || !canRequest || activeProfile?.kind === 'admin') return;
    const exactBody = requestBody && requestBody.clientStateId === clientState.id && requestBody.offeringId === service.id
      ? requestBody
      : { kind: partner.kind, serviceKey: service.serviceKey, assignmentMethod: 'buyer_choice' as const, offeringId: service.id, clientStateId: clientState.id, operationKey: `partner_${crypto.randomUUID().replaceAll('-', '')}` };
    setRequestBody(exactBody);
    setBusy(true); setRequestError('');
    try { await group07Service.createPartnerJob(exactBody); setRequested(true); setRequestOpen(false); }
    catch (raw) { setRequestError(raw instanceof Error ? raw.message : 'The service request could not be confirmed. Retry only if the selected profile and request are unchanged.'); }
    finally { setBusy(false); }
  };
  return <article className="flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm">
    <div className="flex items-start gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-surface-container-low text-lg font-black text-primary">{partner.name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><Link className="font-black text-primary hover:underline" to={`/partners/${encodeURIComponent(partner.profileId)}`}>{partner.name}</Link><p className="text-sm text-secondary">{partner.roleLabel}</p></div></div>
    <div className="mt-4 flex flex-wrap gap-2">{partner.verified ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">Verified</span> : null}{partner.trust?.state === 'new' ? <span className="rounded-full bg-surface-container-low px-2 py-1 text-xs font-bold">New to REALTIQ — building history</span> : partner.trust?.tier ? <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold capitalize">{partner.trust.tier} trust tier</span> : null}{partner.rating?.average !== null && partner.rating?.average !== undefined ? <span className="rounded-full bg-surface-container-low px-2 py-1 text-xs font-bold">{partner.rating.average.toFixed(1)} · {partner.rating.qualifyingReviewCount} reviews</span> : null}</div>
    <div className="mt-5 border-t pt-4"><h2 className="font-bold">{service.label}</h2><p className="mt-1 text-sm">{money(service.rateMinor, service.currency)} · {service.turnaroundHours} hour turnaround</p><p className="mt-1 text-sm text-secondary">Payment term: {service.paymentTerm.replaceAll('_', ' ')}</p>{service.observational ? <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs">Observational visit, not a technical inspection.</p> : null}{service.serviceAreas?.length ? <p className="mt-2 text-sm text-secondary">{service.serviceAreas.map((area) => area.name).join(', ')}</p> : null}</div>
    {!service.bookable ? <p className="mt-4 rounded-lg bg-surface-container-low p-3 text-sm">This service cannot be booked right now.</p> : null}
    {canRequest && service.bookable && service.serviceKey !== 'live_guided_video_tour' ? <div className="mt-4">{requested ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm">Your service request was created. Open your Partner Workspace to track it.</p> : <button type="button" onClick={() => setRequestOpen((open) => !open)} className="rounded-lg bg-primary px-4 py-2 font-bold text-on-primary">Request this service</button>}{requestOpen ? <form onSubmit={(event) => void submitRequest(event)} className="mt-3 space-y-3 rounded-lg border p-3"><p className="text-sm">Choose your current state so the service request can be matched. The server checks your profile eligibility and the provider’s service areas.</p><LocationSuggestionInput label="Your state" level="state" value={stateText} onChange={(value) => { setStateText(value); setClientState(null); setRequestBody(null); }} onSelect={(value) => { setClientState(value); setStateText(value.name); setRequestBody(null); }} className="w-full rounded-lg border p-3" />{requestError ? <p role="alert" className="text-sm text-red-800">{requestError}</p> : null}<div className="flex flex-wrap gap-2"><button disabled={busy || !clientState} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-on-primary disabled:opacity-50">{busy ? 'Requesting…' : requestBody && requestError ? 'Retry same request' : 'Send service request'}</button><button type="button" disabled={busy} onClick={() => { setRequestOpen(false); setRequestBody(null); setRequestError(''); }} className="rounded-lg border px-3 py-2 text-sm font-bold">Cancel</button></div><p className="text-xs text-secondary">For a live guided video tour, choose the service from a property page so the current property can be attached.</p></form> : null}</div> : null}
    <Link className="mt-auto inline-flex pt-5 font-bold text-primary hover:underline" to={`/partners/${encodeURIComponent(partner.profileId)}`}>View professional and service <span aria-hidden="true">→</span></Link>
  </article>;
}
