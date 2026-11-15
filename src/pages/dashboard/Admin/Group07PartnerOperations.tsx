import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import { useAuth } from '../../../contexts/AuthContext';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { hasAdminCapability } from '../../../services/adminAccessService';
import { group07Service, type Group07PartnerJob, type Group07PartnerService } from '../../../services/group07Service';

type Tab = 'services' | 'jobs' | 'disputes';
type Dispute = Record<string, unknown> & { id?: string; jobId?: string; state?: string; version?: number; reason?: string };
type DisputeImpact = Record<string, unknown> & { version?: number; defaultPenaltyPoints?: number; adjustedPenaltyPoints?: number | null };

export default function Group07PartnerOperations() {
  const { adminAccess } = useAuth();
  const stepUp = useBoundStepUp<unknown>();
  const [tab, setTab] = useState<Tab>('services');
  const [services, setServices] = useState<Group07PartnerService[]>([]);
  const [jobs, setJobs] = useState<Group07PartnerJob[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [jobState, setJobState] = useState('awaiting_assignment');
  const [disputeState, setDisputeState] = useState('open');
  const [offering, setOffering] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [impacts, setImpacts] = useState<Record<string, DisputeImpact>>({});
  const [impactDrafts, setImpactDrafts] = useState<Record<string, { penaltyPoints: string; reason: string }>>({});

  const load = async () => {
    setLoading(true); setError('');
    try {
      if (tab === 'services') {
        const result = await group07Service.adminPartnerServices();
        setServices(result.services);
      } else if (tab === 'jobs') {
        const result = await Promise.all([group07Service.adminPartnerJobs(jobState), group07Service.adminPartnerServices()]);
        setJobs(result[0].jobs); setServices(result[1].services);
      } else {
        const result = await group07Service.adminPartnerDisputes(disputeState);
        setDisputes(result.disputes as Dispute[]);
      }
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Partner operations are unavailable.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [tab, jobState, disputeState]);

  const begin = async <B extends object>(path: string, body: B, label: string, execute: (challenge: string, exactBody: B) => Promise<unknown>) => {
    setNotice('');
    const started = await stepUp.begin({ method: 'POST', path, body, label, execute });
    if (!started) setNotice(stepUp.getError() ?? 'The protected action could not start. Refresh the current record before retrying.');
  };
  const complete = async (code: string) => {
    const result = await stepUp.complete(code);
    if (result.ok) { setNotice('The server recorded the action. Current queue state has been refreshed.'); await load(); return true; }
    setNotice(result.error ?? 'The action was not confirmed. Refresh before trying again.');
    await load();
    return false;
  };

  const decideService = (service: Group07PartnerService, decision: 'approved' | 'rejected') => {
    const reason = reasons[service.id]?.trim() ?? '';
    if (!reason) { setNotice('Enter a reason for the service decision.'); return; }
    const body = { decision, expectedVersion: service.version, reason };
    void begin(`/api/admin/partner-services/${encodeURIComponent(service.id)}/review`, body, 'Review a partner service offering', (challenge, exactBody) => group07Service.reviewPartnerService(service.id, exactBody, challenge));
  };

  const assignJob = (job: Group07PartnerJob) => {
    const offeringId = offering[job.id];
    if (!offeringId) { setNotice('Choose an approved offering for this service before assigning the request.'); return; }
    const body = { offeringId, expectedVersion: job.version };
    void begin(`/api/admin/partner-jobs/${encodeURIComponent(job.id)}/assign`, body, 'Assign a partner service request', (challenge, exactBody) => group07Service.assignAdminPartnerJob(job.id, exactBody, challenge));
  };

  const reviewReport = (job: Group07PartnerJob, decision: 'accepted' | 'rejected') => {
    if (!job.report) return;
    const reason = reasons[job.id]?.trim() ?? '';
    if (!reason) { setNotice('Enter the report review reason required for staff review.'); return; }
    const body = { decision, expectedVersion: job.version, expectedReportVersion: job.report.version, reason };
    void begin(`/api/admin/partner-jobs/${encodeURIComponent(job.id)}/report/review`, body, 'Review a partner report', (challenge, exactBody) => group07Service.reviewAdminPartnerJobReport(job.id, exactBody, challenge));
  };

  const decideDispute = async (dispute: Dispute, decision: 'pay' | 'redo' | 'refund') => {
    if (typeof dispute.id !== 'string' || typeof dispute.jobId !== 'string' || typeof dispute.version !== 'number') return;
    const reason = reasons[dispute.id]?.trim() ?? '';
    if (!reason) { setNotice('Enter the reason for the dispute decision.'); return; }
    setNotice('');
    try {
      const job = await group07Service.adminPartnerJob(dispute.jobId);
      const body = { decision, expectedVersion: dispute.version, expectedJobVersion: job.version, reason };
      await begin(`/api/admin/partner-job-disputes/${encodeURIComponent(dispute.id)}/decision`, body, 'Decide a partner service dispute', (challenge, exactBody) => group07Service.decideAdminPartnerDispute(dispute.id!, exactBody, challenge));
    } catch (raw) { setNotice(raw instanceof Error ? raw.message : 'The current job and dispute state could not be loaded. Refresh before deciding.'); }
  };

  const loadImpact = async (dispute: Dispute) => {
    if (!dispute.id) return;
    try {
      const impact = await group07Service.profileDisputeImpact('partner_job', dispute.id) as DisputeImpact;
      setImpacts((current) => ({ ...current, [dispute.id!]: impact }));
      setImpactDrafts((current) => ({ ...current, [dispute.id!]: { penaltyPoints: String(impact.adjustedPenaltyPoints ?? impact.defaultPenaltyPoints ?? ''), reason: current[dispute.id!]?.reason ?? '' } }));
    } catch (raw) { setNotice(raw instanceof Error ? raw.message : 'Trust impact is unavailable for this dispute.'); }
  };
  const updateImpact = async (dispute: Dispute) => {
    if (!dispute.id) return;
    const impact = impacts[dispute.id]; const draft = impactDrafts[dispute.id];
    if (!impact || typeof impact.version !== 'number' || !draft) return;
    const penaltyPoints = Number(draft.penaltyPoints); const reason = draft.reason.trim();
    if (!Number.isInteger(penaltyPoints) || penaltyPoints < 0 || penaltyPoints > 100 || !reason) { setNotice('Enter a whole-number penalty from 0 to 100 and a private reason.'); return; }
    const body = { expectedVersion: impact.version, penaltyPoints, reason };
    const path = `/api/trust/v1/admin/disputes/partner_job/${encodeURIComponent(dispute.id)}/impact`;
    const started = await stepUp.begin({ method: 'PATCH', path, body, label: 'Adjust trust impact for an upheld partner dispute', execute: (challenge, exactBody) => group07Service.updateProfileDisputeImpact('partner_job', dispute.id!, exactBody, challenge) });
    if (!started) setNotice(stepUp.getError() ?? 'The impact adjustment could not start. Refresh the dispute before retrying.');
  };

  const canWrite = Boolean(adminAccess && !adminAccess.readOnly && hasAdminCapability(adminAccess, 'network.manage'));
  return <AdminLayout><main className="space-y-6 p-4 sm:p-8"><header><p className="text-xs font-bold uppercase tracking-widest text-secondary">Third-Party Network</p><h1 className="mt-2 text-3xl font-black">Partner operations</h1><p className="mt-2 text-sm text-secondary">Service review, assignment, report review and dispute decisions use current server versions and independent reviewer checks.</p></header>
    <nav aria-label="Partner operations" className="flex flex-wrap gap-2">{(['services', 'jobs', 'disputes'] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} aria-current={tab === item ? 'page' : undefined} className={`rounded-lg px-4 py-2 font-bold capitalize ${tab === item ? 'bg-primary text-on-primary' : 'border bg-white'}`}>{item === 'services' ? 'Service approvals' : item === 'jobs' ? 'Assignment and reports' : 'Disputes'}</button>)}</nav>
    {tab === 'jobs' ? <label className="block max-w-sm text-sm font-bold">Queue<select className="mt-1 block w-full rounded border bg-white p-3" value={jobState} onChange={(event) => setJobState(event.target.value)}><option value="awaiting_assignment">Awaiting assignment</option><option value="report_rejected">Report rejected</option><option value="report_review_required">Report review required</option></select></label> : null}
    {tab === 'disputes' ? <label className="block max-w-sm text-sm font-bold">Dispute state<select className="mt-1 block w-full rounded border bg-white p-3" value={disputeState} onChange={(event) => setDisputeState(event.target.value)}>{['open', 'under_review', 'redo_required', 'pay_approved', 'refund_required', 'resolved'].map((state) => <option key={state} value={state}>{state.replaceAll('_', ' ')}</option>)}</select></label> : null}
    <button type="button" className="rounded-lg border bg-white px-4 py-2 font-bold" onClick={() => void load()} disabled={loading}>Refresh queue</button>
    {loading ? <p role="status">Loading partner operations…</p> : null}{error ? <p role="alert" className="rounded-lg bg-red-50 p-3">{error} <button className="font-bold underline" onClick={() => void load()}>Retry</button></p> : null}{notice ? <p role="status" className="rounded-lg bg-surface-container-low p-3">{notice}</p> : null}
    {!canWrite ? <p className="rounded-lg bg-amber-50 p-3 text-sm">This staff profile is read-only or does not have the current network-management capability. The server remains authoritative.</p> : null}
    {tab === 'services' ? <section className="space-y-3">{services.filter((service) => service.state === 'pending_review').map((service) => <article key={service.id} className="rounded-xl border bg-white p-4"><h2 className="font-bold">{service.label}</h2><p className="text-sm text-secondary">{service.kind.replaceAll('_', ' ')} · {service.serviceKey.replaceAll('_', ' ')} · {service.currency} {service.rateMinor} · {service.paymentTerm.replaceAll('_', ' ')}</p><label className="mt-3 block text-sm font-bold">Decision reason<textarea value={reasons[service.id] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [service.id]: event.target.value }))} className="mt-1 w-full rounded border p-2" /></label><div className="mt-3 flex gap-2"><button disabled={!canWrite || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => decideService(service, 'approved')} className="rounded bg-primary px-3 py-2 font-bold text-on-primary disabled:opacity-50">Approve service</button><button disabled={!canWrite || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => decideService(service, 'rejected')} className="rounded border px-3 py-2 font-bold disabled:opacity-50">Reject service</button></div></article>)}{!services.some((service) => service.state === 'pending_review') ? <p className="rounded-xl border border-dashed bg-white p-6 text-secondary">No partner services await review.</p> : null}</section> : null}
    {tab === 'jobs' ? <section className="space-y-3">{jobs.map((job) => <article key={job.id} className="rounded-xl border bg-white p-4"><h2 className="font-bold capitalize">{job.serviceKey.replaceAll('_', ' ')} · {job.state.replaceAll('_', ' ')}</h2><p className="mt-1 text-sm text-secondary">{job.kind.replaceAll('_', ' ')} · current job version {job.version}</p>{job.state === 'awaiting_assignment' ? <><label className="mt-3 block text-sm font-bold">Approved service offering<select className="mt-1 block w-full rounded border p-2" value={offering[job.id] ?? ''} onChange={(event) => setOffering((current) => ({ ...current, [job.id]: event.target.value }))}><option value="">Choose offering</option>{services.filter((service) => service.kind === job.kind && service.serviceKey === job.serviceKey && service.state === 'approved' && service.bookable).map((service) => <option key={service.id} value={service.id}>{service.label} · {service.currency} {service.rateMinor}</option>)}</select></label><button disabled={!canWrite || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => assignJob(job)} className="mt-3 rounded bg-primary px-3 py-2 font-bold text-on-primary disabled:opacity-50">Assign request</button></> : null}{job.state === 'report_review_required' && job.report ? <><label className="mt-3 block text-sm font-bold">Staff review reason<textarea value={reasons[job.id] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [job.id]: event.target.value }))} className="mt-1 w-full rounded border p-2" /></label><div className="mt-3 flex gap-2"><button disabled={!canWrite || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => reviewReport(job, 'accepted')} className="rounded bg-primary px-3 py-2 font-bold text-on-primary disabled:opacity-50">Accept report</button><button disabled={!canWrite || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => reviewReport(job, 'rejected')} className="rounded border px-3 py-2 font-bold disabled:opacity-50">Reject report</button></div></> : null}</article>)}{!jobs.length ? <p className="rounded-xl border border-dashed bg-white p-6 text-secondary">No partner jobs match this queue.</p> : null}</section> : null}
    {tab === 'disputes' ? <section className="space-y-3">{disputes.map((dispute, index) => <article key={String(dispute.id ?? index)} className="rounded-xl border bg-white p-4"><h2 className="font-bold">Partner service dispute · {String(dispute.state ?? disputeState).replaceAll('_', ' ')}</h2>{typeof dispute.reason === 'string' ? <p className="mt-2 text-sm">{dispute.reason}</p> : null}<label className="mt-3 block text-sm font-bold">Decision reason<textarea value={reasons[String(dispute.id ?? index)] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [String(dispute.id ?? index)]: event.target.value }))} className="mt-1 w-full rounded border p-2" /></label><div className="mt-3 flex flex-wrap gap-2">{(['pay', 'redo', 'refund'] as const).map((decision) => <button key={decision} disabled={!canWrite || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void decideDispute(dispute, decision)} className="rounded border px-3 py-2 font-bold capitalize disabled:opacity-50">{decision === 'pay' ? 'Approve payment/release hold' : decision === 'redo' ? 'Request report correction' : 'Require refund'}</button>)}</div><p className="mt-2 text-xs text-secondary">A refund decision keeps the hold until Finance completes and reconciles the separate provider refund. It does not transfer funds.</p></article>)}{!disputes.length ? <p className="rounded-xl border border-dashed bg-white p-6 text-secondary">No partner disputes match this state.</p> : null}</section> : null}
    {tab === 'disputes' ? <section className="space-y-3"><h2 className="text-xl font-black">Trust impact for upheld cases</h2>{disputes.filter((dispute) => dispute.id && dispute.upheldAgainstPartner === true).map((dispute) => { const id = dispute.id!; const impact = impacts[id]; const draft = impactDrafts[id]; return <article key={`impact-${id}`} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Case trust impact</h3><p className="text-xs text-secondary">This adjustment affects only the trust penalty for the upheld case. It does not change the financial decision.</p></div><button type="button" onClick={() => void loadImpact(dispute)} className="font-bold text-primary underline">{impact ? 'Refresh impact' : 'Load impact'}</button></div>{impact && draft ? <div className="mt-3 grid gap-3 sm:grid-cols-2"><p className="sm:col-span-2 text-sm">Policy default: {String(impact.defaultPenaltyPoints ?? 'not returned')} · case override: {String(impact.adjustedPenaltyPoints ?? 'none')} · version {String(impact.version ?? 'not returned')}</p><label className="text-sm font-bold">Penalty points<input type="number" min={0} max={100} step={1} value={draft.penaltyPoints} onChange={(event) => setImpactDrafts((current) => ({ ...current, [id]: { ...draft, penaltyPoints: event.target.value } }))} className="mt-1 block w-full rounded border p-2" /></label><label className="text-sm font-bold">Private reason<textarea maxLength={2000} value={draft.reason} onChange={(event) => setImpactDrafts((current) => ({ ...current, [id]: { ...draft, reason: event.target.value } }))} className="mt-1 block w-full rounded border p-2" /></label><button type="button" disabled={!canWrite || stepUp.busy || Boolean(stepUp.challenge) || !draft.reason.trim()} onClick={() => void updateImpact(dispute)} className="rounded bg-primary px-3 py-2 font-bold text-on-primary disabled:opacity-50">Adjust case impact with authenticator</button></div> : null}</article>; })}{!disputes.some((dispute) => dispute.upheldAgainstPartner === true) ? <p className="rounded-xl border border-dashed bg-white p-4 text-sm text-secondary">No currently upheld partner disputes in this queue have trust-impact adjustments available.</p> : null}</section> : null}
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={complete} />
  </main></AdminLayout>;
}
