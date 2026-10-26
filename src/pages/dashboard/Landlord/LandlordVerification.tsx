import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { ApiRequestError } from '../../../lib/axios';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import type { BoundStepUpChallenge } from '../../../hooks/useBoundStepUp';
import { stepUpService } from '../../../services/stepUpService';
import { profileService, type AccountProfileSummary, type ProfileOnboardingDraft } from '../../../services/profileService';
import { verificationCaseService, type ProfileEvidence, type ProfileEvidenceContract, type VerificationCase, type VerificationCaseHistoryPage, type VerificationCasePersonRoute, type VerificationCaseSubmission } from '../../../services/verificationCaseService';
import { buildBoundEvidenceFormData, buildEvidenceStepUpBody, isProfileEvidenceProcessing, sha256File, validateEvidenceUpload, type BoundEvidenceMetadata } from '../../../utils/profileEvidenceUpload';
import { declaredVerificationPersonPaths, validateVerificationPersonRoutes } from '../../../utils/verificationCaseSubmission';

const formatStatus = (value?: string) => value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Not submitted';
const formatDate = (date?: string | null) => date ? new Date(date).toLocaleString('en-NG') : 'Not recorded';
const statusClass = (state: string) => ['clean', 'approved'].includes(state) ? 'text-emerald-700' : ['rejected', 'expired', 'deleted'].includes(state) ? 'text-error' : 'text-amber-800';

const LandlordVerification = () => {
  const { activeProfile, token } = useAuth();
  const [profile, setProfile] = useState<AccountProfileSummary | null>(null);
  const [onboardingDraft, setOnboardingDraft] = useState<ProfileOnboardingDraft | null>(null);
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(null);
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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPurpose, setUploadPurpose] = useState('');
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadDocumentKind, setUploadDocumentKind] = useState('');
  const [uploadPreviousEvidenceId, setUploadPreviousEvidenceId] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [personRoutes, setPersonRoutes] = useState<Record<string, { route: 'nigerian' | 'international' | ''; country: string }>>({});
  const [identityRoute, setIdentityRoute] = useState<'nigerian' | 'international' | ''>('');
  const [identityCountry, setIdentityCountry] = useState('');
  const [identityEvidence, setIdentityEvidence] = useState<Record<string, string>>({});
  const [caseSubmissionError, setCaseSubmissionError] = useState<string | null>(null);
  const caseOperationKeyRef = useRef<{ signature: string; key: string } | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{ challenge: BoundStepUpChallenge; file: File; metadata: BoundEvidenceMetadata; digest: string; profileId: string; token: string } | null>(null);
  const [pendingEvidenceAction, setPendingEvidenceAction] = useState<{ id: string; action: 'retry' | 'delete' } | null>(null);
  const operationKeyRef = useRef<{ signature: string; key: string } | null>(null);
  const withdrawStepUp = useBoundStepUp<VerificationCase>();
  const createCaseStepUp = useBoundStepUp<VerificationCase>();
  const cancelCreateCaseStepUp = createCaseStepUp.cancel;
  const evidenceStepUp = useBoundStepUp<ProfileEvidence>();
  const profileId = activeProfile?.id;
  const previousProfileId = useRef(profileId);
  const currentProfileIdRef = useRef(profileId);
  const loadRequestRef = useRef(0);
  currentProfileIdRef.current = profileId;

  useEffect(() => {
    if (previousProfileId.current !== profileId) {
      loadRequestRef.current += 1;
      setPendingUpload(null);
      setPendingEvidenceAction(null);
      operationKeyRef.current = null;
      setProfile(null);
      setOnboardingDraft(null);
      setLoadedProfileId(null);
      setContract(null);
      setEvidence([]);
      setEvidenceCursor(null);
      setCases([]);
      setCaseCursor(null);
      setSelectedEvidence(null);
      setSelectedCase(null);
      setHistory(null);
      setFilePreview(null);
      setBusy(false);
      setLoading(false);
      setUploadPreviousEvidenceId('');
      setError(null);
      setCaseSubmissionError(null);
      setPersonRoutes({});
      setIdentityRoute('');
      setIdentityCountry('');
      setIdentityEvidence({});
      caseOperationKeyRef.current = null;
      cancelCreateCaseStepUp();
      setUploadError('The active profile changed. Pending verification data and security challenges were cleared; the selected file remains available for a new challenge.');
      previousProfileId.current = profileId;
    }
  }, [profileId, cancelCreateCaseStepUp]);

  useEffect(() => {
    if (!contract) return;
    setUploadPurpose((current) => contract.purposes.includes(current) ? current : contract.purposes[0] ?? '');
    setUploadSubject((current) => contract.subjects.fixed.includes(current) || contract.subjects.personFields.includes(current) ? current : contract.subjects.fixed[0] ?? contract.subjects.personFields[0] ?? '');
  }, [contract]);

  const load = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    const requestedProfileId = profileId;
    if (!requestedProfileId) { setProfile(null); setLoadedProfileId(null); setContract(null); setEvidence([]); setCases([]); setLoading(false); setError('Select an authorized profile to view verification.'); return; }
    setLoading(true); setError(null);
    try {
      const [current, draft, evidencePage, casePage, evidenceContract] = await Promise.all([
        profileService.current(profileId),
        profileService.getOnboarding(),
        verificationCaseService.listEvidence({ limit: 25 }),
        verificationCaseService.listHolderCases({ limit: 25 }),
        verificationCaseService.getEvidenceContract(),
      ]);
      if (requestId !== loadRequestRef.current || currentProfileIdRef.current !== requestedProfileId) return;
      if (current.profile.id !== requestedProfileId) throw new Error('The active profile changed while verification data was loading. Refresh this page.');
      if (draft.profileId !== requestedProfileId) throw new Error('The onboarding draft belongs to a different profile. Refresh after selecting the correct profile.');
      setProfile(current.profile);
      setOnboardingDraft(draft);
      setLoadedProfileId(requestedProfileId);
      setEvidence(evidencePage.evidence);
      setEvidenceCursor(evidencePage.nextCursor);
      setCases(casePage.cases);
      setCaseCursor(casePage.nextCursor);
      setContract(evidenceContract);
    } catch (raw) { if (requestId === loadRequestRef.current && currentProfileIdRef.current === requestedProfileId) setError(raw instanceof Error ? raw.message : 'Unable to load verification data.'); }
    finally { if (requestId === loadRequestRef.current) setLoading(false); }
  }, [profileId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview.url); }, [filePreview]);

  const cleanEvidenceCount = useMemo(() => evidence.filter((item) => item.state === 'clean').length, [evidence]);
  const profileDataCurrent = Boolean(profileId && loadedProfileId === profileId);
  const pendingEvidenceIds = useMemo(() => evidence.filter((item) => isProfileEvidenceProcessing(item.state)).map((item) => item.id).join(','), [evidence]);

  useEffect(() => {
    if (!profileId || !pendingEvidenceIds) return;
    const ids = pendingEvidenceIds.split(',');
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      attempts += 1;
      const records = await Promise.all(ids.map(async (id) => {
        try { return await verificationCaseService.getEvidence(id); }
        catch { return null; }
      }));
      if (cancelled || currentProfileIdRef.current !== profileId) return;
      const updated = new Map(records.filter((item): item is ProfileEvidence => Boolean(item)).map((item) => [item.id, item]));
      setEvidence((current) => current.map((item) => updated.get(item.id) ?? item));
      if (attempts < 6 && records.some((item) => item === null || isProfileEvidenceProcessing(item.state))) {
        timer = setTimeout(() => void poll(), 4000);
      }
    };
    timer = setTimeout(() => void poll(), 2500);
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [pendingEvidenceIds, profileId]);

  const loadMoreEvidence = async () => {
    if (!evidenceCursor) return;
    const requestedProfileId = profileId;
    setBusy(true);
    try { const page = await verificationCaseService.listEvidence({ limit: 25, before: evidenceCursor }); if (currentProfileIdRef.current !== requestedProfileId) return; setEvidence((current) => [...current, ...page.evidence]); setEvidenceCursor(page.nextCursor); }
    catch (raw) { if (currentProfileIdRef.current === requestedProfileId) setError(raw instanceof Error ? raw.message : 'Unable to load more evidence.'); }
    finally { if (currentProfileIdRef.current === requestedProfileId) setBusy(false); }
  };

  const loadMoreCases = async () => {
    if (!caseCursor) return;
    const requestedProfileId = profileId;
    setBusy(true);
    try { const page = await verificationCaseService.listHolderCases({ limit: 25, before: caseCursor }); if (currentProfileIdRef.current !== requestedProfileId) return; setCases((current) => [...current, ...page.cases]); setCaseCursor(page.nextCursor); }
    catch (raw) { if (currentProfileIdRef.current === requestedProfileId) setError(raw instanceof Error ? raw.message : 'Unable to load more cases.'); }
    finally { if (currentProfileIdRef.current === requestedProfileId) setBusy(false); }
  };

  const openEvidence = async (item: ProfileEvidence) => {
    const requestedProfileId = profileId;
    setBusy(true);
    try {
      const detail = await verificationCaseService.getEvidence(item.id);
      if (currentProfileIdRef.current !== requestedProfileId) return;
      setSelectedEvidence(detail);
      if (detail.state !== 'clean') return;
      const blob = await verificationCaseService.getEvidenceContent(item.id);
      if (currentProfileIdRef.current !== requestedProfileId) return;
      setFilePreview({ url: URL.createObjectURL(blob), mimeType: detail.mimeType, id: detail.id });
    } catch (raw) { if (currentProfileIdRef.current === requestedProfileId) setError(raw instanceof Error ? raw.message : 'Unable to open protected evidence.'); }
    finally { if (currentProfileIdRef.current === requestedProfileId) setBusy(false); }
  };

  const openCase = async (item: VerificationCase) => {
    const requestedProfileId = profileId;
    setBusy(true);
    try {
      const [detail, events] = await Promise.all([
        verificationCaseService.getHolderCase(item.id),
        verificationCaseService.holderHistory(item.id),
      ]);
      if (currentProfileIdRef.current !== requestedProfileId) return;
      setSelectedCase(detail);
      setHistory(events);
    } catch (raw) { if (currentProfileIdRef.current === requestedProfileId) setError(raw instanceof Error ? raw.message : 'Unable to load case details.'); }
    finally { if (currentProfileIdRef.current === requestedProfileId) setBusy(false); }
  };

  const beginEvidenceAction = async (item: ProfileEvidence, action: 'retry' | 'delete') => {
    if (action === 'retry' && item.state !== 'retry') return;
    if (action === 'delete' && ['deleting', 'privacy_deleting', 'deleted'].includes(item.state)) return;
    if (action === 'delete' && !window.confirm('Request removal of this evidence? The server will reject removal when it is still referenced by an onboarding draft, submitted case or signatory record.')) return;
    const body = { expectedVersion: item.version };
    const path = `/api/profiles/current/onboarding/evidence/${encodeURIComponent(item.id)}${action === 'retry' ? '/retry' : ''}`;
    setPendingEvidenceAction({ id: item.id, action });
    const started = await evidenceStepUp.begin({
      method: action === 'retry' ? 'POST' : 'DELETE',
      path,
      body,
      label: action === 'retry' ? `Retry evidence scan ${item.id}` : `Remove profile evidence ${item.id}`,
      execute: (challengeId, exactBody) => action === 'retry'
        ? verificationCaseService.retryEvidence(item.id, exactBody, challengeId)
        : verificationCaseService.deleteEvidence(item.id, exactBody, challengeId),
    });
    if (!started) setPendingEvidenceAction(null);
  };

  const completeEvidenceAction = async (code: string) => {
    const requestedProfileId = profileId;
    const action = pendingEvidenceAction?.action;
    const result = await evidenceStepUp.complete(code);
    if (!result.ok) {
      if (!evidenceStepUp.challenge) {
        setPendingEvidenceAction(null);
        toast.error(result.error ?? 'The evidence operation could not be completed. Refresh the evidence list before trying again.');
      }
      return false;
    }
    if (currentProfileIdRef.current !== requestedProfileId) { setPendingEvidenceAction(null); return false; }
    setEvidence((current) => current.map((item) => item.id === result.value.id ? result.value : item));
    setSelectedEvidence((current) => current?.id === result.value.id ? result.value : current);
    setPendingEvidenceAction(null);
    toast.success(action === 'retry' ? 'Evidence scan retry was queued. The existing file remains subject to scan review.' : 'Evidence removal was queued. Its current state remains visible until processing completes.');
    await load();
    return true;
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
    const requestedProfileId = profileId;
    const result = await withdrawStepUp.complete(code);
    if (!result.ok) {
      if (!withdrawStepUp.challenge) toast.error(result.error ?? 'The verification case could not be withdrawn. Refresh its status before trying again.');
      return false;
    }
    if (currentProfileIdRef.current !== requestedProfileId) return false;
    setSelectedCase(result.value);
    setCases((current) => current.map((item) => item.id === result.value.id ? result.value : item));
    toast.success('Verification case withdrawn.');
    await load();
    return true;
  };

  const beginEvidenceUpload = async () => {
    if (!profileId || !token || !contract || !uploadFile || uploadBusy || pendingUpload) return;
    const allowedKinds = contract.documentKinds[uploadPurpose] ?? [];
    const documentKind = uploadDocumentKind || (allowedKinds.length ? '' : uploadPurpose);
    const signature = [uploadFile.name, uploadFile.size, uploadFile.type, uploadFile.lastModified, uploadPurpose, uploadSubject, documentKind, uploadPreviousEvidenceId].join('|');
    const operationKey = operationKeyRef.current?.signature === signature ? operationKeyRef.current.key : crypto.randomUUID();
    operationKeyRef.current = { signature, key: operationKey };
    const metadata: BoundEvidenceMetadata = {
      purpose: uploadPurpose,
      subject: uploadSubject,
      documentKind,
      operationKey,
      ...(uploadPreviousEvidenceId ? { previousEvidenceId: uploadPreviousEvidenceId } : {}),
    };
    const invalid = validateEvidenceUpload(uploadFile, metadata, contract);
    if (invalid) { setUploadError(invalid); return; }
    setUploadBusy(true); setUploadError(null);
    try {
      const digest = await sha256File(uploadFile);
      const body = buildEvidenceStepUpBody(metadata, digest);
      const started = await stepUpService.start('POST', '/api/profiles/current/onboarding/evidence', body);
      if (started.method !== 'totp') throw new Error('Only authenticator-code verification is supported for this evidence upload.');
      if (!Number.isFinite(Date.parse(started.expiresAt)) || Date.parse(started.expiresAt) <= Date.now()) throw new Error('The server returned an expired evidence challenge. Start again.');
      if (activeProfile?.id !== profileId || localStorage.getItem('activeProfileId') !== profileId || token !== localStorage.getItem('token')) throw new Error('The selected profile or signed-in session changed. Start the upload again.');
      setPendingUpload({ challenge: { ...started, label: 'Upload private profile evidence' }, file: uploadFile, metadata, digest, profileId, token });
    } catch (raw) { setUploadError(raw instanceof Error ? raw.message : 'Unable to start the protected evidence upload.'); }
    finally { setUploadBusy(false); }
  };

  const completeEvidenceUpload = async (code: string): Promise<boolean> => {
    const pending = pendingUpload;
    if (!pending || uploadBusy) return false;
    if (Date.parse(pending.challenge.expiresAt) <= Date.now()) { setPendingUpload(null); setUploadError('The evidence security challenge expired. Start a new challenge with the selected file.'); return false; }
    if (pending.profileId !== activeProfile?.id || pending.profileId !== localStorage.getItem('activeProfileId') || pending.token !== token || pending.token !== localStorage.getItem('token')) {
      setPendingUpload(null); setUploadError('The selected profile or signed-in session changed. Start the upload again.'); return false;
    }
    if (!/^\d{6}$/.test(code)) { setUploadError('Enter the six-digit authenticator code.'); return false; }
    setUploadBusy(true); setUploadError(null);
    try {
      await stepUpService.verify(pending.challenge.challengeId, code);
      if (Date.parse(pending.challenge.expiresAt) <= Date.now() || pending.profileId !== activeProfile?.id || pending.profileId !== localStorage.getItem('activeProfileId') || pending.token !== token || pending.token !== localStorage.getItem('token')) {
        setPendingUpload(null); setUploadError('The verified challenge expired or its profile/session changed. Start a fresh upload challenge.'); return false;
      }
      // The proof is one-use; clear it before the multipart request can fail ambiguously.
      setPendingUpload(null);
      const form = buildBoundEvidenceFormData(pending.file, pending.metadata, pending.digest);
      const created = await verificationCaseService.uploadEvidence(form, pending.challenge.challengeId);
      if (currentProfileIdRef.current !== pending.profileId) return false;
      setEvidence((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setUploadFile(null); setUploadDocumentKind(''); operationKeyRef.current = null;
      toast.success('Evidence upload accepted. The file is quarantined while the configured scan completes.');
      await load();
      return true;
    } catch (raw) {
      if (currentProfileIdRef.current !== pending.profileId) return false;
      const codeValue = raw instanceof ApiRequestError ? raw.code : undefined;
      if (codeValue === 'AUTH_FACTOR_CODE_INVALID' || codeValue === 'AUTH_FACTOR_RATE_LIMITED') {
        setUploadError(raw instanceof Error ? raw.message : 'Authenticator verification was not accepted.');
      } else {
        setPendingUpload(null);
        if (raw instanceof ApiRequestError && raw.status === 409) {
          try { setContract(await verificationCaseService.getEvidenceContract()); } catch { /* Preserve the original conflict and require a manual refresh. */ }
        }
        setUploadError(raw instanceof ApiRequestError && raw.code
          ? `${raw.message} (${raw.code}). Evidence status was refreshed; review the list before another upload attempt.`
          : 'The upload result could not be confirmed. Evidence status was refreshed; review the list before another upload attempt.');
        await load();
      }
      return false;
    } finally { setUploadBusy(false); }
  };

  const declaredPersonPaths = useMemo(
    () => onboardingDraft ? declaredVerificationPersonPaths(onboardingDraft.values) : [],
    [onboardingDraft],
  );

  const beginCaseSubmission = async () => {
    if (!profileId || !onboardingDraft || !contract || busy || createCaseStepUp.busy || createCaseStepUp.challenge) return;
    if (declaredPersonPaths.some((path) => !personRoutes[path]?.route || !personRoutes[path]?.country.trim())) {
      setCaseSubmissionError('Choose an identity route and country for every person declared in the current onboarding draft.');
      return;
    }
    const people: VerificationCasePersonRoute[] = declaredPersonPaths.map((path) => ({
      path,
      route: personRoutes[path]?.route as 'nigerian' | 'international',
      country: (personRoutes[path]?.country ?? '').trim().toUpperCase(),
    }));
    const peopleError = validateVerificationPersonRoutes(people);
    if (peopleError) { setCaseSubmissionError(peopleError); return; }

    const isIndividual = onboardingDraft.structure === 'individual';
    const requiredIdentityPurposes = isIndividual && identityRoute
      ? contract.individualRoutes[identityRoute] ?? []
      : [];
    if (isIndividual && !identityRoute) { setCaseSubmissionError('Choose the identity route required for this individual profile.'); return; }
    if (isIndividual && !/^[A-Z]{2}$/.test(identityCountry.trim().toUpperCase())) { setCaseSubmissionError('Enter a two-letter identity country code.'); return; }
    if (isIndividual && identityRoute === 'nigerian' && identityCountry.trim().toUpperCase() !== 'NG') { setCaseSubmissionError('The Nigerian identity route requires country NG.'); return; }
    const identityItems = requiredIdentityPurposes.map((purpose) => ({ purpose, evidenceId: identityEvidence[purpose] ?? '' }));
    if (identityItems.some((item) => !item.evidenceId || !evidence.some((record) => record.id === item.evidenceId && record.purpose === item.purpose && record.state === 'clean'))) {
      setCaseSubmissionError('Select current clean private evidence for every identity purpose required by the configured policy.');
      return;
    }

    const bodyWithoutKey = {
      expectedDraftVersion: onboardingDraft.version,
      people,
      ...(isIndividual ? {
        identityRoute: identityRoute as 'nigerian' | 'international',
        identityCountry: identityCountry.trim().toUpperCase(),
        ...(identityItems.length ? { identityEvidence: identityItems } : {}),
      } : {}),
    };
    const signature = JSON.stringify(bodyWithoutKey);
    const operationKey = caseOperationKeyRef.current?.signature === signature
      ? caseOperationKeyRef.current.key
      : `verification_case_${crypto.randomUUID()}`;
    caseOperationKeyRef.current = { signature, key: operationKey };
    const body: VerificationCaseSubmission = { ...bodyWithoutKey, operationKey };
    setCaseSubmissionError(null);
    await createCaseStepUp.begin({
      method: 'POST',
      path: '/api/profiles/current/verification-cases',
      body,
      label: 'Submit the current profile verification draft',
      execute: (challengeId, exactBody) => verificationCaseService.createHolderCase(exactBody, challengeId),
    });
  };

  const completeCaseSubmission = async (code: string): Promise<boolean> => {
    const requestedProfileId = profileId;
    const result = await createCaseStepUp.complete(code);
    if (!result.ok) {
      if (!createCaseStepUp.challenge) {
        setCaseSubmissionError(result.error ?? 'The verification submission result could not be confirmed. Refresh the case list before attempting another submission.');
        if (currentProfileIdRef.current === requestedProfileId) await load();
      }
      return false;
    }
    if (currentProfileIdRef.current !== requestedProfileId) return false;
    caseOperationKeyRef.current = null;
    setCaseSubmissionError(null);
    setCases((current) => [result.value, ...current.filter((item) => item.id !== result.value.id)]);
    toast.success('Verification case submitted. Its status remains pending until an authorized reviewer decides it.');
    await load();
    await openCase(result.value);
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
        {!profileDataCurrent && profileId && !loading && !error ? <LoadingState label="Refreshing data for the selected profile..." /> : null}
        {profileDataCurrent && profile ? <section className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 lg:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">Current profile</p><h2 className="mt-2 text-2xl font-extrabold">{profile.name}</h2>
          <dl className="mt-6 grid gap-4 text-sm md:grid-cols-4"><div className="rounded-xl bg-white/70 p-4"><dt className="text-xs font-bold uppercase text-secondary">Verification</dt><dd className="mt-2 font-semibold">{formatStatus(profile.verification?.status)}</dd></div><div className="rounded-xl bg-white/70 p-4"><dt className="text-xs font-bold uppercase text-secondary">Profile state</dt><dd className="mt-2 font-semibold">{formatStatus(profile.status)}</dd></div><div className="rounded-xl bg-white/70 p-4"><dt className="text-xs font-bold uppercase text-secondary">Last reviewed</dt><dd className="mt-2 font-semibold">{formatDate(profile.verification?.reviewedAt)}</dd></div><div className="rounded-xl bg-white/70 p-4"><dt className="text-xs font-bold uppercase text-secondary">Clean evidence</dt><dd className="mt-2 font-semibold">{cleanEvidenceCount}</dd></div></dl>
        </section> : null}
        {profileDataCurrent && contract ? <section className="rounded-2xl border border-outline-variant/10 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">Evidence requirements</h2><p className="mt-1 text-sm text-secondary">Current policy version {contract.version} · maximum file size {Math.ceil(contract.maxBytes / 1024 / 1024)} MB · accepted formats {contract.formats.join(', ')}</p></div><span className="text-xs text-secondary">Upload policy: {formatStatus(contract.policies.upload?.state)} · identity policy: {formatStatus(contract.policies.acceptedIdentity?.state)}</span></div>
          <p className="mt-3 text-sm"><strong>Supported purposes:</strong> {contract.purposes.map((purpose) => purpose.replaceAll('_', ' ')).join(' · ')}</p>
          {Object.keys(contract.documentKinds).length ? <p className="mt-2 text-sm"><strong>Configured document kinds:</strong> {Object.entries(contract.documentKinds).map(([purpose, kinds]) => `${purpose.replaceAll('_', ' ')}: ${kinds.map((kind) => kind.replaceAll('_', ' ')).join(', ')}`).join(' · ')}</p> : null}
          {Object.keys(contract.individualRoutes).length ? <p className="mt-2 text-sm"><strong>Individual routes:</strong> {Object.entries(contract.individualRoutes).map(([route, purposes]) => `${route}: ${purposes.map((purpose) => purpose.replaceAll('_', ' ')).join(', ')}`).join(' · ')}</p> : null}
          {contract.acceptedInternationalIds.length ? <p className="mt-2 text-sm"><strong>Accepted configured international IDs:</strong> {contract.acceptedInternationalIds.join(', ')}</p> : null}
          {contract.subjects.personFields.length ? <p className="mt-2 text-sm"><strong>Declared person fields:</strong> {contract.subjects.personFields.join(', ')}</p> : null}
          <div className="mt-4 rounded-lg border border-outline-variant/10 bg-surface-container-low p-4">
            <h3 className="font-bold">Upload private evidence</h3>
            <p className="mt-1 text-xs text-secondary">The actual file bytes are SHA-256 hashed and bound with every upload metadata field to a one-use authenticator challenge. The private upload begins in quarantine while scanning runs.</p>
            {contract.policies.upload?.state !== 'configured' ? <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">The evidence upload policy is {formatStatus(contract.policies.upload?.state)}. Submission is unavailable until the backend policy is configured.</p> : <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-xs font-bold">Purpose<select className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={uploadPurpose} onChange={(event) => { setUploadPurpose(event.target.value); setUploadDocumentKind(''); setUploadPreviousEvidenceId(''); setPendingUpload(null); operationKeyRef.current = null; }}><option value="">Choose purpose</option>{contract.purposes.map((purpose) => <option key={purpose} value={purpose}>{purpose.replaceAll('_', ' ')}</option>)}</select></label>
              <label className="text-xs font-bold">Subject<select className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={uploadSubject} onChange={(event) => { setUploadSubject(event.target.value); setUploadPreviousEvidenceId(''); setPendingUpload(null); operationKeyRef.current = null; }}><option value="">Choose subject</option>{[...contract.subjects.fixed, ...contract.subjects.personFields].map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
              <label className="text-xs font-bold">Document kind<select className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={uploadDocumentKind || (contract.documentKinds[uploadPurpose]?.length ? '' : uploadPurpose)} onChange={(event) => { setUploadDocumentKind(event.target.value); setPendingUpload(null); operationKeyRef.current = null; }}><option value={contract.documentKinds[uploadPurpose]?.length ? '' : uploadPurpose}>{contract.documentKinds[uploadPurpose]?.length ? 'Choose document kind' : `Use documented default: ${uploadPurpose || 'purpose'}`}</option>{(contract.documentKinds[uploadPurpose] ?? []).map((kind) => <option key={kind} value={kind}>{kind.replaceAll('_', ' ')}</option>)}</select></label>
              <label className="text-xs font-bold">File<input type="file" accept={contract.formats.join(',')} className="mt-1 block w-full text-sm font-normal" onChange={(event) => { setUploadFile(event.target.files?.[0] ?? null); setPendingUpload(null); operationKeyRef.current = null; setUploadError(null); }} /><span className="mt-1 block font-normal text-secondary">Maximum {Math.ceil(Math.min(contract.maxBytes, 50 * 1024 * 1024) / 1024 / 1024)} MB</span></label>
              <label className="text-xs font-bold">Replace existing evidence version (optional)<select className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={uploadPreviousEvidenceId} onChange={(event) => { setUploadPreviousEvidenceId(event.target.value); setPendingUpload(null); operationKeyRef.current = null; }}><option value="">Submit as a new evidence record</option>{evidence.filter((item) => item.purpose === uploadPurpose && item.subject === uploadSubject && !['deleted', 'deleting', 'privacy_deleting'].includes(item.state)).map((item) => <option key={item.id} value={item.id}>{formatStatus(item.state)} · v{item.version} · {item.id}</option>)}</select><span className="mt-1 block font-normal text-secondary">The server verifies that the selected record is the current version for this purpose and subject.</span></label>
              <div className="md:col-span-2"><Button type="button" disabled={uploadBusy || Boolean(pendingUpload) || !uploadFile || !uploadPurpose || !uploadSubject || !profileId} onClick={() => void beginEvidenceUpload()}>{uploadBusy ? 'Preparing secure upload…' : 'Continue with authenticator'}</Button>{uploadError ? <p role="alert" className="mt-2 text-sm text-error">{uploadError}</p> : null}</div>
            </div>}
          </div>
        </section> : null}
        {profileDataCurrent ? <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Private evidence</h2><p className="mt-1 text-xs text-secondary">Only clean evidence can be opened; the server rechecks authorization. Pending scan/removal states refresh automatically for a bounded period.</p></div><Button type="button" variant="secondary" disabled={busy || !evidenceCursor} onClick={() => void loadMoreEvidence()}>Load more</Button></div>
            <div className="mt-4 space-y-2">{evidence.map((item) => <article key={item.id} className="rounded-lg bg-surface-container-low p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{item.purpose.replaceAll('_', ' ')} · {item.documentKind.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-secondary">{item.subject} · Version {item.version} · {Math.ceil(item.size / 1024)} KB · Added {formatDate(item.createdAt)}</p>{item.previousEvidenceId ? <p className="mt-1 break-all text-xs text-secondary">Replaces evidence version {item.previousEvidenceId}</p> : null}</div><span className={`text-xs font-bold ${statusClass(item.state)}`}>{formatStatus(item.state)}</span></div>{item.errorCode ? <p className="mt-2 text-xs text-error">{item.errorCode}</p> : null}<div className="mt-2 flex flex-wrap gap-2"><Button type="button" variant="ghost" disabled={busy || item.state !== 'clean'} onClick={() => void openEvidence(item)}>Open authorized file</Button>{item.state === 'retry' ? <Button type="button" variant="secondary" disabled={busy || evidenceStepUp.busy || Boolean(evidenceStepUp.challenge)} onClick={() => void beginEvidenceAction(item, 'retry')}>Retry scan with authenticator</Button> : null}{!['deleting', 'privacy_deleting', 'deleted'].includes(item.state) ? <Button type="button" variant="secondary" disabled={busy || evidenceStepUp.busy || Boolean(evidenceStepUp.challenge)} onClick={() => void beginEvidenceAction(item, 'delete')}>Request removal</Button> : null}{item.state === 'deleting' || item.state === 'privacy_deleting' ? <span role="status" className="self-center text-xs text-secondary">Removal is processing.</span> : null}</div></article>)}{!evidence.length ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No evidence records returned for this profile.</p> : null}</div>
          </div>
          <div className="rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Verification cases</h2><p className="mt-1 text-xs text-secondary">Case state and history are returned by the current-profile API.</p></div><Button type="button" variant="secondary" disabled={busy || !caseCursor} onClick={() => void loadMoreCases()}>Load more</Button></div>
            <div className="mt-4 space-y-2">{cases.map((item) => <article key={item.id} className="rounded-lg bg-surface-container-low p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold capitalize">{item.kind} · {item.structure}</p><p className="mt-1 text-xs text-secondary">Case {item.id} · Version {item.version} · Draft version {item.draftVersion}</p></div><span className={`text-xs font-bold ${statusClass(item.state)}`}>{formatStatus(item.state)}</span></div><p className="mt-1 text-xs text-secondary">Submitted {formatDate(item.submittedAt)} · Reviewed {formatDate(item.reviewedAt)} · Expires {formatDate(item.expiresAt)}</p><Button type="button" variant="ghost" disabled={busy} onClick={() => void openCase(item)}>Details and history</Button></article>)}{!cases.length ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No verification cases returned for this profile.</p> : null}</div>
            <div className="mt-5 rounded-lg border border-outline-variant/10 bg-surface-container-low p-4">
              <h3 className="font-bold">Submit a verification case</h3>
              <p className="mt-1 text-sm text-secondary">Submission uses onboarding draft version {onboardingDraft?.version ?? 'unavailable'} and the exact declared-person paths returned in the current draft. The server checks draft completeness, evidence, identity policy and profile eligibility.</p>
              {onboardingDraft ? <p className="mt-1 text-xs text-secondary">Draft updated {formatDate(onboardingDraft.updatedAt)} · readiness returned by server: {JSON.stringify(onboardingDraft.readiness)}</p> : <p role="status" className="mt-2 text-sm text-amber-900">The current onboarding draft could not be loaded. Refresh before submission.</p>}
              {declaredPersonPaths.map((path) => <div key={path} className="mt-3 grid gap-3 rounded-lg bg-white p-3 sm:grid-cols-2">
                <p className="break-all text-sm font-semibold sm:col-span-2">Declared person: <code>{path}</code></p>
                <label className="text-xs font-bold">Identity route<select className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={personRoutes[path]?.route ?? ''} onChange={(event) => setPersonRoutes((current) => ({ ...current, [path]: { route: event.target.value as 'nigerian' | 'international' | '', country: current[path]?.country ?? '' } }))}><option value="">Choose route</option><option value="nigerian">Nigerian</option><option value="international">International</option></select></label>
                <label className="text-xs font-bold">Country code<input className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal uppercase" maxLength={2} value={personRoutes[path]?.country ?? ''} onChange={(event) => setPersonRoutes((current) => ({ ...current, [path]: { route: current[path]?.route ?? '', country: event.target.value.toUpperCase() } }))} placeholder="NG" /></label>
              </div>)}
              {onboardingDraft?.structure === 'individual' ? <div className="mt-3 grid gap-3 rounded-lg bg-white p-3 sm:grid-cols-2">
                <label className="text-xs font-bold">Individual identity route<select className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={identityRoute} onChange={(event) => { setIdentityRoute(event.target.value as 'nigerian' | 'international' | ''); setIdentityEvidence({}); }}><option value="">Choose configured route</option>{(['nigerian', 'international'] as const).filter((route) => Object.prototype.hasOwnProperty.call(contract?.individualRoutes ?? {}, route)).map((route) => <option key={route} value={route}>{route === 'nigerian' ? 'Nigerian' : 'International'}</option>)}</select></label>
                <label className="text-xs font-bold">Identity country<input className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal uppercase" maxLength={2} value={identityCountry} onChange={(event) => setIdentityCountry(event.target.value.toUpperCase())} placeholder="NG" /></label>
                {(identityRoute ? contract?.individualRoutes[identityRoute] ?? [] : []).map((purpose) => <label key={purpose} className="text-xs font-bold">Evidence for {purpose.replaceAll('_', ' ')}<select className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={identityEvidence[purpose] ?? ''} onChange={(event) => setIdentityEvidence((current) => ({ ...current, [purpose]: event.target.value }))}><option value="">Choose clean private evidence</option>{evidence.filter((item) => item.purpose === purpose && item.state === 'clean').map((item) => <option key={item.id} value={item.id}>{item.documentKind.replaceAll('_', ' ')} · v{item.version} · {item.id}</option>)}</select></label>)}
                {contract?.policies.acceptedIdentity?.state !== 'configured' ? <p role="status" className="text-sm text-amber-900 sm:col-span-2">Identity verification policy is {formatStatus(contract?.policies.acceptedIdentity?.state)}. The server will not accept identity evidence until its policy is configured.</p> : null}
              </div> : null}
              {caseSubmissionError || createCaseStepUp.error ? <p role="alert" className="mt-3 text-sm text-error">{caseSubmissionError ?? createCaseStepUp.error}</p> : null}
              <Button type="button" className="mt-3" disabled={!onboardingDraft || busy || createCaseStepUp.busy || Boolean(createCaseStepUp.challenge) || (onboardingDraft.structure === 'individual' && contract?.policies.acceptedIdentity?.state !== 'configured')} onClick={() => void beginCaseSubmission()}>{createCaseStepUp.busy ? 'Preparing secure submission…' : 'Submit current draft with authenticator'}</Button>
            </div>
          </div>
        </section> : null}
        {profileDataCurrent && selectedEvidence ? <section className="rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">Evidence detail</h2><p className="mt-1 text-sm text-secondary">{selectedEvidence.id} · {selectedEvidence.mimeType} · Version {selectedEvidence.version}</p></div><Button type="button" variant="secondary" onClick={() => setSelectedEvidence(null)}>Close details</Button></div><p className="mt-3 text-sm">Purpose {selectedEvidence.purpose} · Subject {selectedEvidence.subject} · State {formatStatus(selectedEvidence.state)} · Scan date {formatDate(selectedEvidence.scannedAt)}{selectedEvidence.previousEvidenceId ? ` · Previous evidence ${selectedEvidence.previousEvidenceId}` : ''}</p></section> : null}
        {profileDataCurrent && selectedCase ? <section className="rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">Case detail and history</h2><p className="mt-1 text-sm text-secondary">{selectedCase.kind} · {selectedCase.state} · Version {selectedCase.version}</p></div><Button type="button" variant="secondary" onClick={() => setSelectedCase(null)}>Close case</Button></div><p className="mt-3 text-sm">Rejection codes: {selectedCase.rejectionCodes.length ? selectedCase.rejectionCodes.join(', ') : 'None returned.'}</p><div className="mt-4 space-y-2">{history?.events.map((event) => <div key={event.id} className="rounded-lg bg-surface-container-low p-3 text-sm"><strong>{event.action}</strong><span className="ml-2 text-xs text-secondary">Version {event.version} · {formatDate(event.at)}</span></div>)}{!history?.events.length ? <p className="text-sm text-secondary">No case history events returned.</p> : null}</div>{history?.nextCursor ? <Button type="button" variant="secondary" disabled={busy} className="mt-3" onClick={async () => { const requestedProfileId = profileId; setBusy(true); try { const page = await verificationCaseService.holderHistory(selectedCase.id, history.nextCursor ?? undefined); if (currentProfileIdRef.current === requestedProfileId) setHistory((current) => current ? { events: [...current.events, ...page.events], nextCursor: page.nextCursor } : page); } catch (raw) { if (currentProfileIdRef.current === requestedProfileId) setError(raw instanceof Error ? raw.message : 'Unable to load history.'); } finally { if (currentProfileIdRef.current === requestedProfileId) setBusy(false); } }}>Load more history</Button> : null}{['submitted', 'under_review'].includes(selectedCase.state) ? <Button type="button" variant="secondary" className="mt-4" disabled={busy || withdrawStepUp.busy || Boolean(withdrawStepUp.challenge)} onClick={() => void beginWithdraw()}>Withdraw case</Button> : null}</section> : null}
        {profileDataCurrent && filePreview ? <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-label="Private evidence viewer" className="flex h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white p-4"><div className="flex items-center justify-between"><h2 className="font-bold">Authorized private evidence · {filePreview.id}</h2><Button type="button" variant="secondary" onClick={() => { URL.revokeObjectURL(filePreview.url); setFilePreview(null); }}>Close viewer</Button></div><div className="mt-3 min-h-0 flex-1">{filePreview.mimeType.startsWith('image/') ? <img src={filePreview.url} alt="Private profile evidence" className="mx-auto h-full max-w-full object-contain" /> : <iframe title="Private evidence document" src={filePreview.url} sandbox="" className="h-full w-full rounded border" />}</div></section></div> : null}
        <StepUpDialog challenge={profileDataCurrent ? withdrawStepUp.challenge : null} busy={withdrawStepUp.busy} error={withdrawStepUp.error} onCancel={withdrawStepUp.cancel} onSubmit={completeWithdraw} />
        <StepUpDialog challenge={profileDataCurrent ? createCaseStepUp.challenge : null} busy={createCaseStepUp.busy} error={createCaseStepUp.error || caseSubmissionError} onCancel={() => { createCaseStepUp.cancel(); setCaseSubmissionError(null); }} onSubmit={completeCaseSubmission} />
        <StepUpDialog challenge={profileDataCurrent ? evidenceStepUp.challenge : null} busy={evidenceStepUp.busy} error={evidenceStepUp.error} onCancel={() => { evidenceStepUp.cancel(); setPendingEvidenceAction(null); }} onSubmit={completeEvidenceAction} />
        <StepUpDialog challenge={profileDataCurrent && pendingUpload && pendingUpload.profileId === profileId ? pendingUpload.challenge : null} busy={uploadBusy} error={uploadError} onCancel={() => { setPendingUpload(null); setUploadError(null); }} onSubmit={completeEvidenceUpload} />
      </main>
    </LandlordPortalLayout>
  );
};

export default LandlordVerification;
