import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import AdminLayout from '../../components/layout/AdminLayout';
import BuyerPortalLayout from '../../components/layout/BuyerPortalLayout';
import LandlordPortalLayout from '../../components/layout/LandlordPortalLayout';
import SellerViewingCalendar from '../../components/tour/SellerViewingCalendar';
import StepUpDialog from '../../components/auth/StepUpDialog';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../lib/axios';
import { tourService } from '../../services/tourService';
import type { Tour, TourStatus, TourVideoSession } from '../../types';

const statusClasses: Record<TourStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-slate-100 text-slate-800',
  cancelled: 'bg-slate-100 text-slate-800',
};
const toLabel = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not scheduled';

const LiveGuidedTourActions = ({ tour, canManage }: { tour: Tour; canManage: boolean }) => {
  const { activeProfile } = useAuth();
  const profileId = activeProfile?.id ?? '';
  const generation = useRef(0);
  const [session, setSession] = useState<TourVideoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const stepUp = useBoundStepUp<TourVideoSession>();

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError('');
    try {
      const response = await tourService.getVideoSession(tour.id);
      if (current === generation.current && activeProfile?.id === profileId) setSession(response);
    } catch (raw) {
      if (current === generation.current && activeProfile?.id === profileId) setError(raw instanceof Error ? raw.message : 'Live video status is unavailable.');
    } finally { if (current === generation.current) setLoading(false); }
  }, [activeProfile?.id, profileId, tour.id]);

  useEffect(() => { setSession(null); void refresh(); return () => { generation.current += 1; }; }, [profileId, refresh]);
  useEffect(() => {
    if (!session || !['queued', 'processing'].includes(session.state)) return;
    const timer = window.setTimeout(() => void refresh(), 5000);
    return () => window.clearTimeout(timer);
  }, [refresh, session]);

  const openJoinLink = async () => {
    if (busy || !session || session.state !== 'ready' || session.joinAvailable !== true || !session.joinPath || tour.status !== 'approved') return;
    const newTab = window.open('about:blank', '_blank');
    if (!newTab) { toast.error('Allow a new tab to open the secure live-tour link.'); return; }
    newTab.opener = null;
    setBusy(true);
    try {
      const url = await tourService.getJoinUrl(tour.id, session.joinPath);
      newTab.location.replace(url);
    } catch (raw) {
      newTab.close();
      toast.error(raw instanceof Error ? raw.message : 'A current live-tour link is unavailable.');
    } finally { setBusy(false); }
  };

  const beginReconcile = async () => {
    if (!meetingId.trim() || !session || busy || stepUp.challenge || stepUp.busy) return;
    const body = { meetingId: meetingId.trim(), expectedVersion: tour.version };
    const started = await stepUp.begin({
      method: 'POST', path: `/api/tour/${encodeURIComponent(tour.id)}/video-session/reconcile`, body,
      label: 'Confirm the existing Zoom meeting for this viewing',
      execute: (challengeId, exactBody) => tourService.reconcileVideoSession(tour.id, exactBody, challengeId),
    });
    if (!started) toast.error(stepUp.error ?? 'Authenticator confirmation could not start.');
  };

  const completeStepUp = async (code: string): Promise<boolean> => {
    const result = await stepUp.complete(code);
    if (!result.ok) { setError(result.error ?? 'The meeting reconciliation was not confirmed.'); return false; }
    setSession(result.value); setMeetingId(''); toast.success('The existing meeting was confirmed by the server.'); return true;
  };

  if (loading) return <p role="status" className="text-xs text-secondary">Checking live-video setup…</p>;
  return <div className="space-y-2 rounded-lg bg-surface-container-low p-3">
    <p className="text-sm font-semibold">Live guided video</p>
    {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
    {session ? <p role="status" className="text-sm text-secondary">Video status: {toLabel(session.state)}{session.lastErrorCode ? ` · ${toLabel(session.lastErrorCode)}` : ''}{session.readiness ? ` · Readiness: ${toLabel(session.readiness.state)}${session.readiness.reasonCode ? ` (${toLabel(session.readiness.reasonCode)})` : ''}` : ''}</p> : null}
    {session && ['queued', 'processing'].includes(session.state) ? <p className="text-xs text-secondary">The meeting is being prepared. This page checks the server again automatically.</p> : null}
    {session?.state === 'ready' && tour.status === 'approved' && session.joinAvailable === true && session.joinPath ? <Button type="button" disabled={busy} onClick={() => void openJoinLink()}>{busy ? 'Opening…' : 'Join live guided tour'}</Button> : null}
    {session?.state === 'ready' && (!session.joinAvailable || !session.joinPath) ? <p role="status" className="text-xs text-secondary">The participant join link is not currently available. Refresh the session status before joining.</p> : null}
    {session?.state === 'reconciliation_required' && canManage ? <div className="space-y-2"><p className="text-xs text-secondary">If Zoom created the meeting but the result was unclear, enter the actual meeting ID after finding the meeting with this REALTIQ tour reference. Do not guess or create another meeting.</p><label className="block text-xs font-semibold">Existing Zoom meeting ID<input inputMode="numeric" value={meetingId} onChange={(event) => setMeetingId(event.target.value)} className="mt-1 block w-full rounded border px-3 py-2" /></label><Button type="button" variant="secondary" disabled={!meetingId.trim() || busy || stepUp.busy} onClick={() => void beginReconcile()}>Reconcile existing meeting</Button></div> : null}
    {session?.state === 'ready' && tour.status !== 'approved' ? <p className="text-xs text-secondary">The seller must approve this booking before either participant can join.</p> : null}
    <Button type="button" variant="secondary" disabled={busy || stepUp.busy} onClick={() => void refresh()}>Refresh video status</Button>
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={completeStepUp} />
  </div>;
};

const Tours = () => {
  const { user, activeProfile, adminAccess } = useAuth();
  const [page, setPage] = useState(1);
  const [tours, setTours] = useState<Tour[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, Exclude<TourStatus, 'cancelled'>>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const profilePermissions = Array.isArray(activeProfile?.permissions) ? activeProfile.permissions : [];
  const canManage = profilePermissions.includes('viewing.manage');
  const staffCanRead = adminAccess?.capabilities.includes('support.read') || adminAccess?.capabilities.includes('support.manage');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await tourService.getTours({ page, limit: 25 });
      setTours(result.tours); setPageCount(result.pageCount);
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Viewings could not be loaded.'); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); }, [load]);

  const updateStatus = async (tour: Tour) => {
    const status = statusUpdates[tour.id];
    if (!status || status === tour.status || updatingId) return;
    setUpdatingId(tour.id);
    try {
      const updated = await tourService.updateTour(tour.id, { status, expectedVersion: tour.version });
      setTours((current) => current.map((item) => item.id === updated.id ? updated : item));
      toast.success(`Viewing updated: ${toLabel(updated.status)}.`);
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.status === 409) { toast.error('This viewing changed on the server. The latest list is loaded; review it before updating again.'); await load(); }
      else toast.error(raw instanceof Error ? raw.message : 'The viewing could not be updated.');
    } finally { setUpdatingId(null); }
  };

  const content = <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
    {canManage ? <SellerViewingCalendar /> : null}
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-secondary">Current server bookings</p><h2 className="text-2xl font-black">Property viewings</h2></div><Button type="button" variant="secondary" onClick={() => void load()}>Refresh</Button></div>
      {loading ? <LoadingState label="Loading property viewings…" /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && tours.length === 0 ? <Card className="p-8 text-center text-sm text-secondary">No viewings are available for this profile.</Card> : null}
      {!loading && !error ? tours.map((tour) => <Card key={tour.id} className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{tour.property?.title ?? tour.property?.publicReference ?? 'Property viewing'}</h3><p className="text-sm text-secondary">{toLabel(tour.type)} · {toLabel(tour.mode)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses[tour.status]}`}>{toLabel(tour.status)}</span></div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-secondary">Viewing time</dt><dd className="font-semibold">{formatDate(tour.startsAt ?? tour.scheduledAt)}{tour.endsAt ? ` – ${new Intl.DateTimeFormat('en-GB', { timeStyle: 'short' }).format(new Date(tour.endsAt))}` : ''}</dd></div><div><dt className="text-xs text-secondary">Location</dt><dd className="font-semibold">{tour.property?.location ?? 'Not provided'}</dd></div></dl>
        {tour.notes ? <p className="text-sm">{tour.notes}</p> : null}
        {canManage && ['pending', 'approved'].includes(tour.status) ? <div className="flex flex-wrap items-center gap-2"><label className="text-sm font-semibold">Update status<select aria-label={`Status for ${tour.property?.title ?? 'viewing'}`} className="ml-2 rounded border px-3 py-2" value={statusUpdates[tour.id] ?? tour.status as Exclude<TourStatus, 'cancelled'>} onChange={(event) => setStatusUpdates((current) => ({ ...current, [tour.id]: event.target.value as Exclude<TourStatus, 'cancelled'> }))}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="completed">Completed</option></select></label><Button type="button" variant="secondary" disabled={updatingId === tour.id || (statusUpdates[tour.id] ?? tour.status) === tour.status} onClick={() => void updateStatus(tour)}>{updatingId === tour.id ? 'Updating…' : 'Save status'}</Button></div> : null}
        {tour.type === 'live_guided_video_tour' ? <LiveGuidedTourActions tour={tour} canManage={canManage} /> : null}
      </Card>) : null}
      {pageCount > 1 ? <nav aria-label="Viewing pages" className="flex items-center justify-end gap-3 text-sm"><Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button><span>Page {page} of {pageCount}</span><Button type="button" variant="secondary" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</Button></nav> : null}
    </section>
  </div>;

  if (['owner', 'developer', 'agency', 'sellers_agent'].includes(activeProfile?.kind ?? '')) return <LandlordPortalLayout active="tours" title="Property Viewings">{content}</LandlordPortalLayout>;
  if (user?.role === 'admin') return <AdminLayout>{staffCanRead ? content : <div className="p-8" role="status">Viewing records are not available to the selected staff profile.</div>}</AdminLayout>;
  if (activeProfile?.kind === 'buyer') return <BuyerPortalLayout pageEyebrow="Buyer Portal" pageTitle="Property Viewings" pageSubtitle="Review your viewing requests and join confirmed live guided tours.">{content}</BuyerPortalLayout>;
  return <main className="min-h-screen bg-surface p-8" role="status">Select a buyer or seller profile to manage its property viewings.</main>;
};

export default Tours;
