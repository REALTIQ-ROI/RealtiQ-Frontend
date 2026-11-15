import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import StepUpDialog from '../../components/auth/StepUpDialog';
import PublicLayout from '../../components/layout/PublicLayout';
import BuyerRelationshipTrust from '../../components/trust/BuyerRelationshipTrust';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { documentManagerService, type ManagedDocumentDto } from '../../services/documentManagerService';
import { group07Service, type Group07PartnerCalendar, type Group07PartnerJob } from '../../services/group07Service';
import { tourService, type ViewingAssignee } from '../../services/tourService';
import { messageService } from '../../services/messageService';

const partnerKinds = new Set(['legal_partner', 'engineering_survey_partner', 'inspection_partner', 'valuation_partner', 'buyers_agent', 'sellers_agent']);
const money = (minor: number, currency: string) => new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);
const key = () => `g07_${crypto.randomUUID().replaceAll('-', '')}`;

export default function PartnerWorkspace() {
  const navigate = useNavigate();
  const { activeProfile, user } = useAuth();
  const profileId = activeProfile?.id ?? '';
  const profileKind = activeProfile?.kind ?? '';
  const partnerProfile = partnerKinds.has(profileKind);
  const stepUp = useBoundStepUp<unknown>();
  const profileRef = useRef(profileId); profileRef.current = profileId;
  const [workspace, setWorkspace] = useState<Awaited<ReturnType<typeof group07Service.partnerCurrent>> | null>(null);
  const [calendar, setCalendar] = useState<Group07PartnerCalendar | null>(null);
  const [assignees, setAssignees] = useState<ViewingAssignee[]>([]);
  const [assigneeDirectoryUnavailable, setAssigneeDirectoryUnavailable] = useState(false);
  const [jobs, setJobs] = useState<Group07PartnerJob[]>([]);
  const [earnings, setEarnings] = useState<Awaited<ReturnType<typeof group07Service.partnerEarnings>>['earnings']>([]);
  const [docs, setDocs] = useState<ManagedDocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aboutDraft, setAboutDraft] = useState('');
  const [aboutVersion, setAboutVersion] = useState(0);
  const [availability, setAvailability] = useState<'available' | 'busy' | 'unavailable'>('unavailable');
  const [availabilityVersion, setAvailabilityVersion] = useState(0);
  const [slotStart, setSlotStart] = useState('');
  const [slotEnd, setSlotEnd] = useState('');
  const [newCalendarSlots, setNewCalendarSlots] = useState<Array<{ startsAt: string; endsAt: string; assignedToIdentityId?: string }>>([]);
  const [newSlotAssigneeId, setNewSlotAssigneeId] = useState('');
  const [slotAssignments, setSlotAssignments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [conflictDeclaration, setConflictDeclaration] = useState<'none' | 'declared'>('none');
  const [conflictNote, setConflictNote] = useState('');
  const [reportDocument, setReportDocument] = useState<Record<string, string>>({});
  const [reportSummary, setReportSummary] = useState<Record<string, string>>({});
  const [disputeReason, setDisputeReason] = useState<Record<string, string>>({});
  const [jobCalendarSlot, setJobCalendarSlot] = useState<Record<string, string>>({});
  const [joinLink, setJoinLink] = useState('');
  const [certificateRows, setCertificateRows] = useState<Array<Record<string, unknown>>>([]);
  const [certificateDetails, setCertificateDetails] = useState<Record<string, Record<string, unknown>>>({});

  const load = async () => {
    if (!profileId) { setLoading(false); setError('Select a profile before opening partner services.'); return; }
    const requestProfile = profileId;
    setLoading(true); setError(''); setJoinLink('');
    try {
      const results = await Promise.allSettled([
        group07Service.partnerJobs({ limit: 25 }),
        partnerProfile ? group07Service.partnerCurrent() : Promise.resolve(null),
        partnerProfile ? group07Service.partnerCalendar() : Promise.resolve(null),
        partnerProfile ? group07Service.partnerEarnings() : Promise.resolve(null),
        partnerProfile ? group07Service.partnerCertificates() : Promise.resolve(null),
      ]);
      if (profileRef.current !== requestProfile) return;
      if (results[0].status === 'fulfilled') setJobs(results[0].value.jobs); else setError(results[0].reason instanceof Error ? results[0].reason.message : 'Jobs are unavailable.');
      if (results[1].status === 'fulfilled' && results[1].value) {
        const value = results[1].value;
        setWorkspace(value); setAboutDraft(typeof value.about === 'string' ? value.about : value.about.text); setAboutVersion(typeof value.about === 'string' ? 0 : value.about.version);
        setAvailability((value.availability.status === 'available' || value.availability.status === 'busy') ? value.availability.status : 'unavailable'); setAvailabilityVersion(value.availability.version ?? 0);
      } else if (partnerProfile && results[1].status === 'rejected') setError(results[1].reason instanceof Error ? results[1].reason.message : 'Partner profile is unavailable.');
      if (results[2].status === 'fulfilled') setCalendar(results[2].value); else if (partnerProfile) setCalendar(null);
      if (results[3].status === 'fulfilled' && results[3].value) setEarnings(results[3].value.earnings);
      if (results[4].status === 'fulfilled' && results[4].value) setCertificateRows(results[4].value.certificates);
      if (partnerProfile) {
        try {
          const pages: ViewingAssignee[] = [];
          let after: string | undefined;
          do { const page = await tourService.listViewingAssignees({ limit: 100, ...(after ? { after } : {}) }); pages.push(...page.assignees.filter((assignee) => assignee.assignmentEligible)); after = page.nextCursor ?? undefined; } while (after);
          if (profileRef.current === requestProfile) { setAssignees(pages); setAssigneeDirectoryUnavailable(false); }
        } catch { if (profileRef.current === requestProfile) { setAssignees([]); setAssigneeDirectoryUnavailable(true); } }
        try {
          const page = await documentManagerService.listDocuments({ limit: 100 });
          if (profileRef.current === requestProfile) setDocs(page.items);
        } catch { if (profileRef.current === requestProfile) setDocs([]); }
      }
    } catch (raw) { if (profileRef.current === requestProfile) setError(raw instanceof Error ? raw.message : 'Partner workspace is unavailable.'); }
    finally { if (profileRef.current === requestProfile) setLoading(false); }
  };
  useEffect(() => { setWorkspace(null); setCalendar(null); setJobs([]); setEarnings([]); setCertificateRows([]); setCertificateDetails({}); setDocs([]); setAssignees([]); setSlotAssignments({}); setNewCalendarSlots([]); stepUp.cancel(); void load(); }, [profileId, profileKind]);

  const mutateWithStepUp = async <B extends object>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body: B, label: string, execute: (challengeId: string, exactBody: B) => Promise<unknown>) => {
    await stepUp.begin({ method, path, body, label, execute });
  };
  const completeStepUp = async (code: string) => {
    const result = await stepUp.complete(code);
    if (result.ok) { toast.success('The server confirmed the change.'); await load(); return true; }
    return false;
  };
  const saveAbout = async (event: FormEvent) => {
    event.preventDefault(); if (!workspace || saving) return;
    setSaving(true);
    try { const updated = await group07Service.updatePartnerAbout({ about: aboutDraft, expectedVersion: aboutVersion }); setAboutDraft(updated.text); setAboutVersion(updated.version); toast.success('Profile information saved.'); await load(); }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to save profile information.'); }
    finally { setSaving(false); }
  };
  const saveAvailability = async (event: FormEvent) => {
    event.preventDefault(); if (saving) return; setSaving(true);
    try { const updated = await group07Service.updatePartnerAvailability({ status: availability, expectedVersion: availabilityVersion }); setAvailabilityVersion(updated.version); toast.success('Availability updated.'); await load(); }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to update availability.'); }
    finally { setSaving(false); }
  };
  const addSlot = (event: FormEvent) => {
    event.preventDefault();
    const start = new Date(slotStart); const end = new Date(slotEnd);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start <= new Date() || end <= start) { toast.error('Choose a future start time and an end time after it.'); return; }
    setNewCalendarSlots((current) => [...current, { startsAt: start.toISOString(), endsAt: end.toISOString(), ...(newSlotAssigneeId ? { assignedToIdentityId: newSlotAssigneeId } : {}) }]); setSlotStart(''); setSlotEnd(''); setNewSlotAssigneeId('');
  };
  const saveCalendar = async () => {
    if (saving || !calendar && !newCalendarSlots.length) return;
    setSaving(true);
    try {
      const slots = [
        ...(calendar?.slots ?? []).map((slot) => ({ slotId: slot.slotId, startsAt: slot.startsAt, endsAt: slot.endsAt, assignedToIdentityId: slotAssignments[slot.slotId] === undefined ? slot.assignedToIdentityId ?? null : slotAssignments[slot.slotId] || null })),
        ...newCalendarSlots,
      ];
      const updated = await group07Service.updatePartnerCalendar({ expectedVersion: calendar?.version ?? 0, slots });
      setCalendar(updated); setNewCalendarSlots([]); toast.success('Calendar saved.'); await load();
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to save calendar. Refresh before trying again.'); }
    finally { setSaving(false); }
  };
  const openPartnerJobConversation = async (job: Group07PartnerJob) => {
    try { const conversation = await messageService.startForPartnerJob(job.id); navigate(`/messages/${encodeURIComponent(conversation._id)}`); }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'The private service conversation could not be opened.'); }
  };
  const openCertificate = async (id: string) => {
    try { const detail = await group07Service.partnerCertificate(id); setCertificateDetails((current) => ({ ...current, [id]: detail })); }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'The certificate details are unavailable.'); }
  };
  const partnerStateAction = (job: Group07PartnerJob, action: 'accept' | 'decline' | 'start') => {
    const body = { action, expectedVersion: job.version, ...(action === 'accept' ? { conflictDeclaration, ...(conflictDeclaration === 'declared' && conflictNote.trim() ? { conflictNote: conflictNote.trim() } : {}) } : {}) };
    void mutateWithStepUp('POST', `/api/partners/jobs/${encodeURIComponent(job.id)}/state`, body, `${action} partner service request`, (challenge, exactBody) => group07Service.changePartnerJobState(job.id, exactBody, challenge));
  };
  const schedule = (job: Group07PartnerJob) => {
    const slotId = jobCalendarSlot[job.id];
    if (!calendar || !slotId) { toast.error('Choose a current calendar slot first.'); return; }
    const body = { expectedVersion: job.version, expectedCalendarVersion: calendar.version, slotId };
    void mutateWithStepUp('POST', `/api/partners/jobs/${encodeURIComponent(job.id)}/appointment`, body, 'Schedule the accepted job', (challenge, exactBody) => group07Service.schedulePartnerJob(job.id, exactBody, challenge));
  };
  const startPayment = (job: Group07PartnerJob) => {
    const body = { expectedVersion: job.version, operationKey: key() };
    void mutateWithStepUp('POST', `/api/partners/jobs/${encodeURIComponent(job.id)}/initialize-payment`, body, 'Initialise payment for this service request', async (challenge, exactBody) => {
      const result = await group07Service.initializePartnerJobPayment(job.id, exactBody, challenge);
      if (result.payment?.checkoutUrl && result.payment.state === 'payment_pending') window.location.assign(result.payment.checkoutUrl);
      return result;
    });
  };
  const submitReport = (job: Group07PartnerJob) => {
    const documentId = reportDocument[job.id]; const summary = reportSummary[job.id]?.trim();
    if (!documentId || !summary || !user?.name) { toast.error('Choose an issued report addressed to the client and write a summary.'); return; }
    const body = { documentId, expectedVersion: job.version, summary, typedName: user.name };
    void mutateWithStepUp('POST', `/api/partners/jobs/${encodeURIComponent(job.id)}/report`, body, 'Submit the sealed service report', (challenge, exactBody) => group07Service.submitPartnerJobReport(job.id, exactBody, challenge));
  };
  const decideReport = (job: Group07PartnerJob, decision: 'accepted' | 'rejected', reason: string) => {
    if (!job.report) return;
    if (decision === 'rejected' && !reason.trim()) { toast.error('Give a reason for requesting a correction.'); return; }
    const body = { decision, expectedVersion: job.version, expectedReportVersion: job.report.version, ...(decision === 'rejected' ? { reason: reason.trim() } : {}) };
    void mutateWithStepUp('POST', `/api/partners/jobs/${encodeURIComponent(job.id)}/report/decision`, body, `${decision === 'accepted' ? 'Accept' : 'Request a correction to'} the report`, (challenge, exactBody) => group07Service.decidePartnerJobReport(job.id, exactBody, challenge));
  };
  const openDispute = (job: Group07PartnerJob) => {
    const reason = disputeReason[job.id]?.trim(); if (!reason) { toast.error('Describe the service issue first.'); return; }
    const body = { reason, expectedVersion: job.version, operationKey: key() };
    void mutateWithStepUp('POST', `/api/partners/jobs/${encodeURIComponent(job.id)}/disputes`, body, 'Open a service dispute', (challenge, exactBody) => group07Service.createPartnerJobDispute(job.id, exactBody, challenge));
  };
  const pollPayment = async (job: Group07PartnerJob) => {
    try { await group07Service.partnerJobPayment(job.id); toast.success('Payment status refreshed from the server.'); await load(); }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to refresh payment status.'); }
  };
  const openJoinUrl = async (job: Group07PartnerJob) => {
    if (!job.videoSession?.tourId || !job.videoSession.detailPath) return;
    try {
      const session = await group07Service.videoSession(job.videoSession.tourId);
      if (!session.joinAvailable || !session.joinPath) { toast.error('The video session is not ready to join.'); return; }
      const url = await group07Service.joinVideoSession(job.videoSession.tourId);
      setJoinLink(url);
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to open the participant video session.'); }
  };
  const recipientDocs = (job: Group07PartnerJob) => docs.filter((document) => document.recipientProfileIds.includes(job.clientProfileId) && ['issued', 'signed', 'acknowledged'].includes(document.state) && Boolean(document.contentHash));

  return <PublicLayout><main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-secondary">Partner Network</p><h1 className="mt-2 text-3xl font-black">Partner workspace</h1><p className="mt-2 text-secondary">Profile: {activeProfile?.name ?? 'Not selected'} · {activeProfile?.kind ?? 'profile not selected'}</p></div><div className="flex gap-2"><Link to="/dashboard/community-tools" className="rounded-lg border bg-white px-4 py-2 font-bold">Sharing & Growth</Link><button onClick={() => void load()} className="rounded-lg border bg-white px-4 py-2 font-bold">Refresh</button></div></header>
    {error ? <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-900">{error}</p> : null}
    {loading ? <p role="status">Loading current-profile data…</p> : null}
    {!loading && partnerProfile && workspace ? <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(workspace.attention).map(([name, count]) => <div key={name} className="rounded-xl border bg-white p-4"><p className="text-sm capitalize text-secondary">{name.replaceAll(/([A-Z])/g, ' $1')}</p><strong className="text-3xl">{count}</strong></div>)}</section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Public profile information</h2><form className="mt-4 space-y-3" onSubmit={(event) => void saveAbout(event)}><label htmlFor="partner-about" className="text-sm font-bold">About</label><textarea id="partner-about" maxLength={5000} rows={6} value={aboutDraft} onChange={(event) => setAboutDraft(event.target.value)} className="w-full rounded-lg border p-3"/><p className="text-xs text-secondary">The approved service policy determines the text limit. The server validates it when saved.</p><button disabled={saving} className="rounded-lg bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-50">Save profile information</button></form></section>
        <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Availability</h2><form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(event) => void saveAvailability(event)}><label className="text-sm font-bold">Status<select value={availability} onChange={(event) => setAvailability(event.target.value as typeof availability)} className="mt-1 block rounded-lg border p-3"><option value="available">Available</option><option value="busy">Busy</option><option value="unavailable">Unavailable</option></select></label><button disabled={saving} className="rounded-lg bg-primary px-4 py-3 font-bold text-on-primary">Update availability</button></form><p className="mt-3 text-xs text-secondary">Availability is checked again before assignment and booking.</p></section>
      </div>
      <section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Service catalogue</h2><p className="text-sm text-secondary">Only services returned by the approved backend catalogue are available here.</p></div></div><div className="mt-4 grid gap-4 md:grid-cols-2">{workspace.catalogue.map((catalogueItem) => { const existing = workspace.services.find((service) => service.serviceKey === catalogueItem.serviceKey); return <ServiceEditor key={catalogueItem.serviceKey} label={catalogueItem.label} serviceKey={catalogueItem.serviceKey} paymentTerms={catalogueItem.paymentTerms} existing={existing} saving={saving} onSave={(body) => void mutateWithStepUp('PUT', `/api/partners/current/services/${encodeURIComponent(catalogueItem.serviceKey)}`, body, 'Submit service terms for independent review', (challenge, exactBody) => group07Service.updatePartnerService(catalogueItem.serviceKey, exactBody, challenge))} />; })}</div></section>
        <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Calendar availability</h2><p className="mt-1 text-sm text-secondary">Existing appointments remain listed with their server slot. Booked slot conflicts are checked by the backend.</p>{assigneeDirectoryUnavailable ? <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">Team assignment is unavailable right now. You can still manage unassigned availability.</p> : null}<div className="mt-4 space-y-2">{calendar?.slots.map((slot) => <div key={slot.slotId} className="grid gap-2 rounded-lg bg-surface-container-low p-3 text-sm md:grid-cols-[1fr_16rem]"><span>{new Date(slot.startsAt).toLocaleString('en-GB')} – {new Date(slot.endsAt).toLocaleTimeString('en-GB')}</span><label className="text-xs font-bold">Assigned team member<select aria-label={`Assigned team member for ${new Date(slot.startsAt).toLocaleString('en-GB')}`} value={slotAssignments[slot.slotId] ?? slot.assignedToIdentityId ?? ''} disabled={assigneeDirectoryUnavailable} onChange={(event) => setSlotAssignments((current) => ({ ...current, [slot.slotId]: event.target.value }))} className="mt-1 block w-full rounded border bg-white p-2"><option value="">No team member</option>{slot.assignedToIdentityId && !assignees.some((person) => person.identityId === slot.assignedToIdentityId) ? <option value={slot.assignedToIdentityId}>Current assignment unavailable</option> : null}{assignees.map((person) => <option key={person.identityId} value={person.identityId}>{person.displayName} · {person.role.replaceAll('_', ' ')}</option>)}</select></label></div>)}{newCalendarSlots.map((slot, index) => <div key={`${slot.startsAt}-${index}`} className="rounded-lg border border-dashed p-3 text-sm">New: {new Date(slot.startsAt).toLocaleString('en-GB')} – {new Date(slot.endsAt).toLocaleTimeString('en-GB')} · {assignees.find((person) => person.identityId === slot.assignedToIdentityId)?.displayName ?? 'Unassigned'}</div>)}</div><form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={addSlot}><label className="text-sm font-bold">Starts<input required type="datetime-local" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} className="mt-1 block w-full rounded-lg border p-3"/></label><label className="text-sm font-bold">Ends<input required type="datetime-local" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} className="mt-1 block w-full rounded-lg border p-3"/></label><label className="text-sm font-bold">Assign to team member<select value={newSlotAssigneeId} disabled={assigneeDirectoryUnavailable} onChange={(event) => setNewSlotAssigneeId(event.target.value)} className="mt-1 block w-full rounded-lg border p-3"><option value="">No team member</option>{assignees.map((person) => <option key={person.identityId} value={person.identityId}>{person.displayName} · {person.role.replaceAll('_', ' ')}</option>)}</select></label><button className="self-end rounded-lg border px-4 py-3 font-bold">Add available time</button></form><button disabled={saving || (!calendar && !newCalendarSlots.length)} onClick={() => void saveCalendar()} className="mt-4 rounded-lg bg-primary px-4 py-3 font-bold text-on-primary disabled:opacity-50">Save calendar</button></section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Earnings and payout status</h2><p className="mt-1 text-sm text-secondary">Gross, platform fee, net and settlement values come from the server. Bank details are never shown here.</p><div className="mt-4 space-y-3">{earnings.map((entry) => <article key={entry.jobId} className="grid gap-2 rounded-xl bg-surface-container-low p-4 md:grid-cols-4"><div><p className="text-xs text-secondary">Service</p><strong>{entry.serviceKey.replaceAll('_', ' ')}</strong></div><div><p className="text-xs text-secondary">Gross · Platform fee · Net</p><strong>{money(entry.grossMinor, entry.currency)} · {money(entry.platformFeeMinor, entry.currency)} · {money(entry.netMinor, entry.currency)}</strong></div><div><p className="text-xs text-secondary">Payment / settlement</p><strong className="capitalize">{entry.paymentState} / {entry.settlementState}</strong></div><div><p className="text-xs text-secondary">Confirmed settled</p><strong>{entry.settledAt ? new Date(entry.settledAt).toLocaleDateString('en-GB') : 'Not confirmed'}</strong></div></article>)}{!earnings.length ? <p className="rounded-lg border border-dashed p-5 text-secondary">No earnings have been returned for this profile.</p> : null}</div><h3 className="mt-7 font-bold">Withholding certificates</h3><div className="mt-2 space-y-2">{certificateRows.map((row) => { const id = String(row.id ?? ''); const detail = certificateDetails[id]; const verificationPath = typeof (detail?.verificationPath ?? row.verificationPath) === 'string' ? String(detail?.verificationPath ?? row.verificationPath) : ''; return <div key={id || String(row.certificateNumber)} className="rounded-lg border p-3"><strong>{String(row.certificateNumber ?? 'Certificate')}</strong><p className="text-sm">Withheld {typeof row.withheldMinor === 'number' && typeof row.currency === 'string' ? money(row.withheldMinor, row.currency) : 'amount not returned'} · remitted {typeof row.remittedAt === 'string' ? new Date(row.remittedAt).toLocaleDateString('en-GB') : 'not confirmed'}</p><p className="text-xs text-secondary">This certificate is available only after provider-confirmed settlement. It is a verifiable record, not a downloadable PDF contract.</p>{detail ? <p className="mt-2 text-sm">Issued by {String(detail.issuerName ?? 'issuer not returned')} to {String(detail.recipientName ?? 'recipient not returned')} · {String(detail.rateBasis ?? 'tax basis not returned')}</p> : null}<div className="mt-2 flex gap-3"><button type="button" onClick={() => void openCertificate(id)} className="font-bold text-primary underline">{detail ? 'Refresh certificate details' : 'View certificate details'}</button>{verificationPath.startsWith('/api/partners/withholding-certificates/') ? <a href={verificationPath} target="_blank" rel="noopener noreferrer" className="font-bold text-primary underline">Verify certificate</a> : null}</div></div>; })}{!certificateRows.length ? <p className="text-sm text-secondary">No issued withholding certificates returned.</p> : null}</div></section>
    </> : null}
    <section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-black">Service jobs</h2><p className="text-sm text-secondary">Current job states, report deadlines and payment status are refreshed from the selected profile.</p></div><Link to="/dashboard/documents" className="font-bold text-primary underline">Open Document Manager</Link></div><div className="mt-4 space-y-4">{jobs.map((job) => <JobCard key={job.id} job={job} partnerProfile={partnerProfile} calendar={calendar} userName={user?.name ?? ''} docs={recipientDocs(job)} conflictDeclaration={conflictDeclaration} conflictNote={conflictNote} setConflictDeclaration={setConflictDeclaration} setConflictNote={setConflictNote} reportDocument={reportDocument[job.id] ?? ''} setReportDocument={(value) => setReportDocument((current) => ({ ...current, [job.id]: value }))} reportSummary={reportSummary[job.id] ?? ''} setReportSummary={(value) => setReportSummary((current) => ({ ...current, [job.id]: value }))} disputeReason={disputeReason[job.id] ?? ''} setDisputeReason={(value) => setDisputeReason((current) => ({ ...current, [job.id]: value }))} selectedSlot={jobCalendarSlot[job.id] ?? ''} setSelectedSlot={(value) => setJobCalendarSlot((current) => ({ ...current, [job.id]: value }))} onStateAction={partnerStateAction} onSchedule={schedule} onPayment={() => startPayment(job)} onPollPayment={() => void pollPayment(job)} onReport={() => submitReport(job)} onReportDecision={(decision, reason) => decideReport(job, decision, reason)} onDispute={() => void openDispute(job)} onJoin={() => void openJoinUrl(job)} onMessage={() => void openPartnerJobConversation(job)} busy={stepUp.busy || saving} />)}{!jobs.length && !loading ? <p className="rounded-lg border border-dashed p-5 text-secondary">No current service jobs for this profile.</p> : null}</div></section>
    {joinLink ? <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/70 p-4" role="presentation" onClick={() => setJoinLink('')}><section role="dialog" aria-modal="true" aria-label="Private video session" className="max-w-md rounded-2xl bg-white p-6" onClick={(event) => event.stopPropagation()}><h2 className="text-xl font-black">Video session ready</h2><p className="mt-2 text-sm">This participant link is private and temporary. Do not share it.</p><a href={joinLink} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-lg bg-primary px-4 py-3 font-bold text-on-primary">Join session</a><button onClick={() => setJoinLink('')} className="ml-3 font-bold underline">Close</button></section></div> : null}
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={completeStepUp} />
  </main></PublicLayout>;
}

function ServiceEditor({ label, serviceKey, paymentTerms, existing, saving, onSave }: { label: string; serviceKey: string; paymentTerms: string[]; existing?: { currency: string; rateMinor: number; turnaroundHours: number; paymentTerm: string; version: number; state: string }; saving: boolean; onSave: (body: { currency: 'NGN' | 'USD'; rateMinor: number; turnaroundHours: number; paymentTerm: string; expectedVersion: number }) => void }) {
  const [currency, setCurrency] = useState<'NGN' | 'USD'>(existing?.currency === 'USD' ? 'USD' : 'NGN');
  const [rate, setRate] = useState(existing ? String(existing.rateMinor / 100) : '');
  const [hours, setHours] = useState(existing ? String(existing.turnaroundHours) : '');
  const [term, setTerm] = useState(existing?.paymentTerm ?? paymentTerms[0] ?? '');
  return <form className="rounded-xl border p-4" onSubmit={(event) => { event.preventDefault(); const rateNumber = Number(rate); const hourNumber = Number(hours); if (!Number.isSafeInteger(Math.round(rateNumber * 100)) || rateNumber <= 0 || !Number.isInteger(hourNumber) || hourNumber < 1 || !paymentTerms.includes(term)) return; onSave({ currency, rateMinor: Math.round(rateNumber * 100), turnaroundHours: hourNumber, paymentTerm: term, expectedVersion: existing?.version ?? 0 }); }}><h3 className="font-bold">{label}</h3><p className="text-xs text-secondary">{serviceKey} · {existing?.state ?? 'Not yet submitted'}</p><div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs font-bold">Rate<input required min="0.01" step="0.01" type="number" value={rate} onChange={(event) => setRate(event.target.value)} className="mt-1 w-full rounded border p-2"/></label><label className="text-xs font-bold">Currency<select value={currency} onChange={(event) => setCurrency(event.target.value as 'NGN' | 'USD')} className="mt-1 w-full rounded border p-2"><option>NGN</option><option>USD</option></select></label><label className="text-xs font-bold">Turnaround (hours)<input required min="1" step="1" type="number" value={hours} onChange={(event) => setHours(event.target.value)} className="mt-1 w-full rounded border p-2"/></label><label className="text-xs font-bold">Payment term<select required value={term} onChange={(event) => setTerm(event.target.value)} className="mt-1 w-full rounded border p-2">{paymentTerms.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></label></div><button disabled={saving || !paymentTerms.length} className="mt-3 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-on-primary disabled:opacity-50">Submit terms for review</button></form>;
}

function JobCard({ job, partnerProfile, calendar, userName, docs, conflictDeclaration, conflictNote, setConflictDeclaration, setConflictNote, reportDocument, setReportDocument, reportSummary, setReportSummary, disputeReason, setDisputeReason, selectedSlot, setSelectedSlot, onStateAction, onSchedule, onPayment, onPollPayment, onReport, onReportDecision, onDispute, onJoin, onMessage, busy }: { job: Group07PartnerJob; partnerProfile: boolean; calendar: Group07PartnerCalendar | null; userName: string; docs: ManagedDocumentDto[]; conflictDeclaration: 'none' | 'declared'; conflictNote: string; setConflictDeclaration: (value: 'none' | 'declared') => void; setConflictNote: (value: string) => void; reportDocument: string; setReportDocument: (value: string) => void; reportSummary: string; setReportSummary: (value: string) => void; disputeReason: string; setDisputeReason: (value: string) => void; selectedSlot: string; setSelectedSlot: (value: string) => void; onStateAction: (job: Group07PartnerJob, action: 'accept' | 'decline' | 'start') => void; onSchedule: (job: Group07PartnerJob) => void; onPayment: () => void; onPollPayment: () => void; onReport: () => void; onReportDecision: (decision: 'accepted' | 'rejected', reason: string) => void; onDispute: () => void; onJoin: () => void; onMessage: () => void; busy: boolean }) {
  return <article className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black capitalize">{job.serviceKey.replaceAll('_', ' ')}</h3><p className="mt-1 text-sm text-secondary">{job.kind.replaceAll('_', ' ')} · {job.paymentState.replaceAll('_', ' ')} · version {job.version}</p></div><span className="rounded-full bg-surface-container-low px-3 py-1 text-sm font-bold capitalize">{job.state.replaceAll('_', ' ')}</span></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><p>Rate: {money(job.rateMinor, job.currency)}</p><p>Payment term: {job.paymentTerm.replaceAll('_', ' ')}</p><p>Due now: {money(job.dueNowMinor, job.currency)}</p></div>{job.reportAcceptanceDueAt ? <p className="mt-2 text-sm">Report review deadline: {new Date(job.reportAcceptanceDueAt).toLocaleString('en-GB')}</p> : null}{job.state === 'report_review_required' ? <p className="mt-2 rounded bg-amber-50 p-3 text-sm">This report needs staff intervention. Do not initiate another report until the current case is resolved.</p> : null}{job.activeDisputeId ? <p className="mt-2 rounded bg-amber-50 p-3 text-sm">A service dispute is active; payment and report acceptance actions remain paused.</p> : null}
    {partnerProfile && job.state === 'offered' ? <div className="mt-4 rounded-lg bg-surface-container-low p-3"><label className="text-sm font-bold">Conflict declaration<select className="ml-2 rounded border p-2" value={conflictDeclaration} onChange={(event) => setConflictDeclaration(event.target.value as 'none' | 'declared')}><option value="none">No conflict</option><option value="declared">Conflict to declare</option></select></label>{conflictDeclaration === 'declared' ? <textarea maxLength={1000} value={conflictNote} onChange={(event) => setConflictNote(event.target.value)} placeholder="Describe the conflict" className="mt-2 w-full rounded border p-2"/> : null}<div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => onStateAction(job, 'accept')} className="rounded bg-primary px-3 py-2 font-bold text-on-primary">Accept request</button><button disabled={busy} onClick={() => onStateAction(job, 'decline')} className="rounded border px-3 py-2 font-bold">Decline</button></div></div> : null}
    {partnerProfile && job.state === 'accepted' ? <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"><label className="text-sm font-bold">Book a current slot<select className="mt-1 block w-full rounded border p-2" value={selectedSlot} onChange={(event) => setSelectedSlot(event.target.value)}><option value="">Choose available time</option>{calendar?.slots.map((slot) => <option key={slot.slotId} value={slot.slotId}>{new Date(slot.startsAt).toLocaleString('en-GB')} – {new Date(slot.endsAt).toLocaleTimeString('en-GB')}</option>)}</select></label><button disabled={busy || !selectedSlot} onClick={() => onSchedule(job)} className="self-end rounded-lg bg-primary px-4 py-2 font-bold text-on-primary">Schedule</button></div> : null}
    {job.appointment ? <p className="mt-3 rounded bg-surface-container-low p-3 text-sm">Appointment: {new Date(job.appointment.startsAt).toLocaleString('en-GB')} – {new Date(job.appointment.endsAt).toLocaleTimeString('en-GB')}</p> : null}
    {partnerProfile && job.state === 'accepted' ? <button disabled={busy} onClick={() => onStateAction(job, 'start')} className="mt-3 rounded-lg border px-4 py-2 font-bold">Start service</button> : null}
    {job.paymentState === 'awaiting_payment' || job.paymentState === 'not_due' ? !partnerProfile && job.dueNowMinor > 0 ? <button disabled={busy || Boolean(job.activeDisputeId)} onClick={onPayment} className="mt-3 rounded-lg bg-primary px-4 py-2 font-bold text-on-primary">Continue to payment</button> : null : null}
    {job.paymentState === 'payment_pending' || job.paymentState === 'reconciliation_required' || job.paymentState === 'held' ? <div className="mt-3"><p className="text-sm">Payment status: {job.paymentState.replaceAll('_', ' ')}. Check the same job/reference; do not start another payment.</p><button onClick={onPollPayment} className="mt-2 rounded border px-3 py-2 font-bold">Refresh payment status</button>{job.payment?.checkoutUrl && job.payment.state === 'payment_pending' ? <a href={job.payment.checkoutUrl} className="ml-3 font-bold text-primary underline">Open existing payment</a> : null}</div> : null}
    {partnerProfile && ['in_progress', 'report_rejected'].includes(job.state) ? <div className="mt-4 rounded-lg bg-surface-container-low p-3"><p className="text-sm">Submit a current sealed report through Document Manager, then select it here.</p>{docs.length ? <label className="mt-2 block text-sm font-bold">Issued report document<select className="mt-1 block w-full rounded border p-2" value={reportDocument} onChange={(event) => setReportDocument(event.target.value)}><option value="">Choose document title</option>{docs.map((document) => <option key={document.id} value={document.id}>{document.title} · {document.documentType.replaceAll('_', ' ')}</option>)}</select></label> : <p className="mt-2 text-sm">No issued document addressed to this client was returned. <Link to="/dashboard/documents" className="font-bold underline">Open Document Manager</Link></p>}<label className="mt-2 block text-sm font-bold">Report summary<textarea required value={reportSummary} onChange={(event) => setReportSummary(event.target.value)} maxLength={5000} className="mt-1 w-full rounded border p-2"/></label><button disabled={busy || !reportDocument || !reportSummary.trim() || !userName} onClick={onReport} className="mt-2 rounded bg-primary px-3 py-2 font-bold text-on-primary">Submit report with authenticator</button></div> : null}
    {!partnerProfile && job.report?.state === 'submitted' ? <div className="mt-4 rounded-lg bg-surface-container-low p-3"><p className="text-sm">Review the issued report in Document Manager before deciding.</p><label className="mt-2 block text-sm font-bold">Reason if requesting a correction<textarea value={disputeReason} onChange={(event) => setDisputeReason(event.target.value)} maxLength={2000} className="mt-1 w-full rounded border p-2"/></label><div className="mt-2 flex gap-2"><button disabled={busy || Boolean(job.activeDisputeId)} onClick={() => onReportDecision('accepted', '')} className="rounded-lg bg-primary px-3 py-2 font-bold text-on-primary">Accept report</button><button disabled={busy || Boolean(job.activeDisputeId) || !disputeReason.trim()} onClick={() => onReportDecision('rejected', disputeReason)} className="rounded-lg border px-3 py-2 font-bold">Request correction</button></div></div> : null}
    {job.videoSession && job.videoSession.tourId && (!partnerProfile || job.state === 'in_progress') ? <button onClick={onJoin} className="mt-3 rounded-lg border px-3 py-2 font-bold">Check video session and join if ready</button> : null}
    {job.partnerProfileId && !['awaiting_assignment', 'cancelled'].includes(job.state) ? <button type="button" onClick={onMessage} className="mt-3 rounded-lg border px-3 py-2 font-bold">Open private service conversation</button> : null}
    {!partnerProfile && !job.activeDisputeId && !['completed', 'cancelled'].includes(job.state) ? <div className="mt-4 border-t pt-3"><label className="text-sm font-bold">Open a service dispute<textarea value={disputeReason} onChange={(event) => setDisputeReason(event.target.value)} maxLength={2000} className="mt-1 w-full rounded border p-2" placeholder="Describe the issue"/></label><button disabled={busy || !disputeReason.trim()} onClick={onDispute} className="mt-2 rounded border px-3 py-2 font-bold">Submit dispute</button></div> : null}
    {partnerProfile && job.state === 'completed' && job.paymentState === 'settled' && !job.activeDisputeId ? <BuyerRelationshipTrust buyerProfileId={job.clientProfileId} sourceKind="partner_job" sourceId={job.id} eligibleSource /> : null}
  </article>;
}
