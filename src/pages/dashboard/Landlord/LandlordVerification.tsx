import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { profileService, type AccountProfileSummary } from '../../../services/profileService';
import { verificationCaseService, type ProfileEvidence, type ProfileEvidenceContract, type VerificationCase, type VerificationCaseHistoryPage } from '../../../services/verificationCaseService';

const formatStatus = (value?: string) => value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Not submitted';
const formatDate = (date?: string | null) => date ? new Date(date).toLocaleString('en-NG') : 'Not recorded';
const statusClass = (state: string) => ['clean', 'approved'].includes(state) ? 'text-emerald-700' : ['rejected', 'expired', 'deleted'].includes(state) ? 'text-error' : 'text-amber-800';

const LandlordVerification = () => {
  const { activeProfile } = useAuth();
  const [profile, setProfile] = useState<AccountProfileSummary | null>(null);
  const [contract, setContract] = useState<ProfileEvidenceContract | null>(null);
  const [evidence, setEvidence] = useState<ProfileEvidence[]>([]);
  const [evidenceCursor, setEvidenceCursor] = useState<string | null>(null);
  const [cases, setCases] = useState<VerificationCase[]>([]);
  const [caseCursor, setCaseCursor] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<ProfileEvidence | null>(null);
  const [selectedCase, setSelectedCase] = useState<VerificationCase | null>(null);
  const [history, setHistory] = useState<VerificationCaseHistoryPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<{ url: string; mimeType: string; id: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const withdrawStepUp = useBoundStepUp<VerificationCase>();
  const profileId = activeProfile?.id;

  const load = useCallback(async () => {
    if (!profileId) { setProfile(null); setContract(null); setEvidence([]); setCases([]); setError('Select an authorized profile to view verification.'); return; }
    setLoading(true); setError(null);
    try {
      const [current, evidencePage, casePage, evidenceContract] = await Promise.all([
        profileService.current(profileId),
        verificationCaseService.listEvidence({ limit: 25 }),
        verificationCaseService.listHolderCases({ limit: 25 }),
        verificationCaseService.getEvidenceContract(),
      ]);
      if (current.profile.id !== profileId) throw new Error('The active profile changed while verification data was loading. Refresh this page.');
      setProfile(current.profile);
      setEvidence(evidencePage.evidence);
      setEvidenceCursor(evidencePage.nextCursor);
      setCases(casePage.cases);
      setCaseCursor(casePage.nextCursor);
      setContract(evidenceContract);
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to load verification data.'); }
    finally { setLoading(false); }
  }, [profileId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview.url); }, [filePreview]);

  const cleanEvidenceCount = useMemo(() => evidence.filter((item) => item.state === 'clean').length, [evidence]);

  const loadMoreEvidence = async () => {
    if (!evidenceCursor) return;
    setBusy(true);
    try { const page = await verificationCaseService.listEvidence({ limit: 25, before: evidenceCursor }); setEvidence((current) => [...current, ...page.evidence]); setEvidenceCursor(page.nextCursor); }
    catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to load more evidence.'); }
    finally { setBusy(false); }
  };

  const loadMoreCases = async () => {
    if (!caseCursor) return;
    setBusy(true);
    try { const page = await verificationCaseService.listHolderCases({ limit: 25, before: caseCursor }); setCases((current) => [...current, ...page.cases]); setCaseCursor(page.nextCursor); }
    catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to load more cases.'); }
    finally { setBusy(false); }
  };

  const openEvidence = async (item: ProfileEvidence) => {
    setBusy(true);
    try {
      const detail = await verificationCaseService.getEvidence(item.id);
      setSelectedEvidence(detail);
      if (detail.state !== 'clean') return;
      const blob = await verificationCaseService.getEvidenceContent(item.id);
      setFilePreview({ url: URL.createObjectURL(blob), mimeType: detail.mimeType, id: detail.id });
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to open protected evidence.'); }
    finally { setBusy(false); }
  };

  const openCase = async (item: VerificationCase) => {
    setBusy(true);
    try {
      const [detail, events] = await Promise.all([
        verificationCaseService.getHolderCase(item.id),
        verificationCaseService.holderHistory(item.id),
      ]);
      setSelectedCase(detail);
      setHistory(events);
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to load case details.'); }
    finally { setBusy(false); }
  };

  const beginWithdraw = async () => {
    if (!selectedCase) return;
    const body = { expectedVersion: selectedCase.version, action: 'withdraw' as const };
    await withdrawStepUp.begin({
      method: 'POST', path: `/api/profiles/current/verification-cases/${encodeURIComponent(selectedCase.id)}/state`, body,
      label: `Withdraw verification case ${selectedCase.id}`,
      execute: (challengeId, exactBody) => verificationCaseService.withdrawCase(selectedCase.id, exactBody, challengeId),
    });
  };

  const completeWithdraw = async (code: string) => {
    const result = await withdrawStepUp.complete(code);
    if (!result.ok) return false;
    setSelectedCase(result.value);
    setCases((current) => current.map((item) => item.id === result.value.id ? result.value : item));
    toast.success('Verification case withdrawn.');
    await load();
    return true;
  };

  return (
    <LandlordPortalLayout active="verification" title="Profile Verification">
      <main className="mx-auto max-w-6xl space-y-8 p-8 lg:p-12">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Profile compliance</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-primary">Verification</h1>
            <p className="mt-2 max-w-2xl text-sm text-secondary">Evidence and case records are private to the current selected profile. Review status, history and authorized evidence from here.</p>
          </div>
          <div className="flex gap-2"><Button type="button" variant="secondary" disabled={loading} onClick={() => void load()}>Refresh</Button><Link to="/dashboard/landlord/settings" className="inline-flex items-center rounded-lg bg-surface-container-high px-4 py-2 text-sm font-semibold">Back to Settings</Link></div>
        </header>
        {loading ? <LoadingState label="Loading profile verification..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {profile ? <section className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 lg:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">Current profile</p><h2 className="mt-2 text-2xl font-extrabold">{profile.name}</h2>
          <dl className="mt-6 grid gap-4 text-sm md:grid-cols-4"><div className="rounded-xl bg-white/70 p-4"><dt className="text-xs font-bold uppercase text-secondary">Verification</dt><dd className="mt-2 font-semibold">{formatStatus(profile.verification?.status)}</dd></div><div className="rounded-xl bg-white/70 p-4"><dt className="text-xs font-bold uppercase text-secondary">Profile state</dt><dd className="mt-2 font-semibold">{formatStatus(profile.status)}</dd></div><div className="rounded-xl bg-white/70 p-4"><dt className="text-xs font-bold uppercase text-secondary">Last reviewed</dt><dd className="mt-2 font-semibold">{formatDate(profile.verification?.reviewedAt)}</dd></div><div className="rounded-xl bg-white/70 p-4"><dt className="text-xs font-bold uppercase text-secondary">Clean evidence</dt><dd className="mt-2 font-semibold">{cleanEvidenceCount}</dd></div></dl>
        </section> : null}
        {contract ? <section className="rounded-2xl border border-outline-variant/10 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">Evidence requirements</h2><p className="mt-1 text-sm text-secondary">Current policy version {contract.version} · maximum file size {Math.ceil(contract.maxBytes / 1024 / 1024)} MB · accepted formats {contract.formats.join(', ')}</p></div><span className="text-xs text-secondary">Upload policy: {formatStatus(contract.policies.upload?.state)} · identity policy: {formatStatus(contract.policies.acceptedIdentity?.state)}</span></div>
          <p className="mt-3 text-sm"><strong>Supported purposes:</strong> {contract.purposes.map((purpose) => purpose.replaceAll('_', ' ')).join(' · ')}</p>
          {Object.keys(contract.documentKinds).length ? <p className="mt-2 text-sm"><strong>Configured document kinds:</strong> {Object.entries(contract.documentKinds).map(([purpose, kinds]) => `${purpose.replaceAll('_', ' ')}: ${kinds.map((kind) => kind.replaceAll('_', ' ')).join(', ')}`).join(' · ')}</p> : null}
          {Object.keys(contract.individualRoutes).length ? <p className="mt-2 text-sm"><strong>Individual routes:</strong> {Object.entries(contract.individualRoutes).map(([route, purposes]) => `${route}: ${purposes.map((purpose) => purpose.replaceAll('_', ' ')).join(', ')}`).join(' · ')}</p> : null}
          {contract.acceptedInternationalIds.length ? <p className="mt-2 text-sm"><strong>Accepted configured international IDs:</strong> {contract.acceptedInternationalIds.join(', ')}</p> : null}
          {contract.subjects.personFields.length ? <p className="mt-2 text-sm"><strong>Declared person fields:</strong> {contract.subjects.personFields.join(', ')}</p> : null}
          <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">New evidence uploads remain disabled because the mounted backend runs step-up before multipart parsing, so it cannot bind the uploaded bytes to the challenge. Do not use public property media for identity evidence.</p>
        </section> : null}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Private evidence</h2><p className="mt-1 text-xs text-secondary">Only clean evidence can be opened; the server rechecks authorization.</p></div><Button type="button" variant="secondary" disabled={busy || !evidenceCursor} onClick={() => void loadMoreEvidence()}>Load more</Button></div>
            <div className="mt-4 space-y-2">{evidence.map((item) => <article key={item.id} className="rounded-lg bg-surface-container-low p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{item.purpose.replaceAll('_', ' ')} · {item.documentKind.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-secondary">{item.subject} · Version {item.version} · {Math.ceil(item.size / 1024)} KB · Added {formatDate(item.createdAt)}</p></div><span className={`text-xs font-bold ${statusClass(item.state)}`}>{formatStatus(item.state)}</span></div>{item.errorCode ? <p className="mt-2 text-xs text-error">{item.errorCode}</p> : null}<Button type="button" variant="ghost" disabled={busy || item.state !== 'clean'} onClick={() => void openEvidence(item)}>Open authorized file</Button></article>)}{!evidence.length ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No evidence records returned for this profile.</p> : null}</div>
          </div>
          <div className="rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Verification cases</h2><p className="mt-1 text-xs text-secondary">Case state and history are returned by the current-profile API.</p></div><Button type="button" variant="secondary" disabled={busy || !caseCursor} onClick={() => void loadMoreCases()}>Load more</Button></div>
            <div className="mt-4 space-y-2">{cases.map((item) => <article key={item.id} className="rounded-lg bg-surface-container-low p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold capitalize">{item.kind} · {item.structure}</p><p className="mt-1 text-xs text-secondary">Case {item.id} · Version {item.version} · Draft version {item.draftVersion}</p></div><span className={`text-xs font-bold ${statusClass(item.state)}`}>{formatStatus(item.state)}</span></div><p className="mt-1 text-xs text-secondary">Submitted {formatDate(item.submittedAt)} · Reviewed {formatDate(item.reviewedAt)} · Expires {formatDate(item.expiresAt)}</p><Button type="button" variant="ghost" disabled={busy} onClick={() => void openCase(item)}>Details and history</Button></article>)}{!cases.length ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No verification cases returned for this profile.</p> : null}</div>
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4"><h3 className="font-bold text-amber-950">Submit a verification case</h3><p className="mt-1 text-sm text-amber-900">Submission is withheld because the handoff does not define the response DTO for <code>GET /api/profiles/current/onboarding</code>, including the current draft version and declared person-field paths needed to construct the exact request. Existing clean evidence is not enough to safely infer those fields.</p><Button type="button" className="mt-3" disabled title="Current onboarding draft response contract is incomplete">Case submission unavailable</Button></div>
          </div>
        </section>
        {selectedEvidence ? <section className="rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">Evidence detail</h2><p className="mt-1 text-sm text-secondary">{selectedEvidence.id} · {selectedEvidence.mimeType} · Version {selectedEvidence.version}</p></div><Button type="button" variant="secondary" onClick={() => setSelectedEvidence(null)}>Close details</Button></div><p className="mt-3 text-sm">Purpose {selectedEvidence.purpose} · Subject {selectedEvidence.subject} · State {formatStatus(selectedEvidence.state)} · Scan date {formatDate(selectedEvidence.scannedAt)}</p></section> : null}
        {selectedCase ? <section className="rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">Case detail and history</h2><p className="mt-1 text-sm text-secondary">{selectedCase.kind} · {selectedCase.state} · Version {selectedCase.version}</p></div><Button type="button" variant="secondary" onClick={() => setSelectedCase(null)}>Close case</Button></div><p className="mt-3 text-sm">Rejection codes: {selectedCase.rejectionCodes.length ? selectedCase.rejectionCodes.join(', ') : 'None returned.'}</p><div className="mt-4 space-y-2">{history?.events.map((event) => <div key={event.id} className="rounded-lg bg-surface-container-low p-3 text-sm"><strong>{event.action}</strong><span className="ml-2 text-xs text-secondary">Version {event.version} · {formatDate(event.at)}</span></div>)}{!history?.events.length ? <p className="text-sm text-secondary">No case history events returned.</p> : null}</div>{history?.nextCursor ? <Button type="button" variant="secondary" disabled={busy} className="mt-3" onClick={async () => { setBusy(true); try { const page = await verificationCaseService.holderHistory(selectedCase.id, history.nextCursor ?? undefined); setHistory((current) => current ? { events: [...current.events, ...page.events], nextCursor: page.nextCursor } : page); } catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to load history.'); } finally { setBusy(false); } }}>Load more history</Button> : null}{['submitted', 'under_review'].includes(selectedCase.state) ? <Button type="button" variant="secondary" className="mt-4" disabled={busy || withdrawStepUp.busy || Boolean(withdrawStepUp.challenge)} onClick={() => void beginWithdraw()}>Withdraw case</Button> : null}</section> : null}
        {filePreview ? <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-label="Private evidence viewer" className="flex h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white p-4"><div className="flex items-center justify-between"><h2 className="font-bold">Authorized private evidence · {filePreview.id}</h2><Button type="button" variant="secondary" onClick={() => { URL.revokeObjectURL(filePreview.url); setFilePreview(null); }}>Close viewer</Button></div><div className="mt-3 min-h-0 flex-1">{filePreview.mimeType.startsWith('image/') ? <img src={filePreview.url} alt="Private profile evidence" className="mx-auto h-full max-w-full object-contain" /> : <iframe title="Private evidence document" src={filePreview.url} sandbox="" className="h-full w-full rounded border" />}</div></section></div> : null}
        <StepUpDialog challenge={withdrawStepUp.challenge} busy={withdrawStepUp.busy} error={withdrawStepUp.error} onCancel={withdrawStepUp.cancel} onSubmit={completeWithdraw} />
      </main>
    </LandlordPortalLayout>
  );
};

export default LandlordVerification;
