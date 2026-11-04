import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import LandlordKycProgressTracker from '../../../components/verification/LandlordKycProgressTracker';
import AuthorizedFilePreview from '../../../components/verification/AuthorizedFilePreview';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { ApiRequestError, type ApiFieldError } from '../../../lib/axios';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import type { BoundStepUpChallenge } from '../../../hooks/useBoundStepUp';
import { stepUpService } from '../../../services/stepUpService';
import { profileService, type AccountProfileSummary, type ProfileOnboardingDraft } from '../../../services/profileService';
import { verificationCaseService, type ProfileEvidence, type ProfileEvidenceContract, type VerificationCase, type VerificationCaseHistoryPage, type VerificationCasePersonRoute, type VerificationCaseSubmission } from '../../../services/verificationCaseService';
import { buildBoundEvidenceFormData, buildEvidenceStepUpBody, isProfileEvidenceAvailable, isProfileEvidenceProcessing, sha256File, validateEvidenceUpload, type BoundEvidenceMetadata } from '../../../utils/profileEvidenceUpload';
import { buildLandlordKycProgress } from '../../../utils/landlordKycProgress';
import { declaredVerificationPersonPaths, validateVerificationPersonRoutes } from '../../../utils/verificationCaseSubmission';
import { onboardingDraftFieldDisplayValue, onboardingDraftFields, updateOnboardingDraftField } from '../../../utils/onboardingDraftFields';

const formatStatus = (value?: string) => value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Not submitted';
const formatDate = (date?: string | null) => date ? new Date(date).toLocaleString('en-NG') : 'Not recorded';
const statusClass = (state: string) => ['available', 'approved'].includes(state) ? 'text-emerald-700' : ['rejected', 'expired', 'deleted'].includes(state) ? 'text-error' : 'text-amber-800';
const stepUpCodeCanRetryWithSameChallenge = (code?: string) => ['AUTH_FACTOR_CODE_INVALID', 'AUTH_FACTOR_RATE_LIMITED', 'AUTH_CHALLENGE_RATE_LIMITED'].includes(code ?? '');
const serializeDraftValues = (values: Record<string, unknown>) => JSON.stringify(values, null, 2);
const parseDraftValues = (text: string): { values?: Record<string, unknown>; error?: string } => {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { error: 'Draft values must be a JSON object.' };
    return { values: parsed as Record<string, unknown> };
  } catch {
    return { error: 'Fix the JSON syntax before saving the profile draft.' };
  }
};
const draftMissingFields = (readiness: unknown): string[] => {
  if (!readiness || typeof readiness !== 'object' || Array.isArray(readiness)) return [];
  const missing = (readiness as Record<string, unknown>).intakeMissing;
  return Array.isArray(missing) ? missing.filter((item): item is string => typeof item === 'string') : [];
};
const formatDraftFieldName = (field: string) => field.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[._[\]]+/g, ' ').trim();
type VerificationSection = 'draft' | 'evidence' | 'cases' | 'contract';
type VerificationSectionState<T> = Record<VerificationSection, T>;

const readErrorMessage = (raw: unknown, section: string) => {
  if (raw instanceof ApiRequestError && !raw.status && /timed out|unable to confirm a response/i.test(raw.message)) {
    return `${section} did not load before the request timed out. This was a read-only request; no KYC submission or change was made. Retry this section.`;
  }
  return raw instanceof Error ? raw.message : `Unable to load ${section.toLowerCase()}.`;
};

const LandlordVerification = () => {
  const { activeProfile, token } = useAuth();
  const [profile, setProfile] = useState<AccountProfileSummary | null>(null);
  const [onboardingDraft, setOnboardingDraft] = useState<ProfileOnboardingDraft | null>(null);
  const [draftValuesText, setDraftValuesText] = useState('');
  const [draftSavePending, setDraftSavePending] = useState(false);
  const [draftSaveError, setDraftSaveError] = useState<string | null>(null);
  const [draftSaveFieldErrors, setDraftSaveFieldErrors] = useState<ApiFieldError[]>([]);
  const [draftConflict, setDraftConflict] = useState<{ latest: ProfileOnboardingDraft; message: string } | null>(null);
  const [draftConflictReviewed, setDraftConflictReviewed] = useState(false);
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
  const [sectionLoading, setSectionLoading] = useState<VerificationSectionState<boolean>>({ draft: false, evidence: false, cases: false, contract: false });
  const [sectionErrors, setSectionErrors] = useState<VerificationSectionState<string | null>>({ draft: null, evidence: null, cases: null, contract: null });
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
  const saveDraftStepUp = useBoundStepUp<ProfileOnboardingDraft>();
  const cancelSaveDraftStepUp = saveDraftStepUp.cancel;
  const evidenceStepUp = useBoundStepUp<ProfileEvidence>();
  const profileId = activeProfile?.id;
  const previousProfileId = useRef(profileId);
  const currentProfileIdRef = useRef(profileId);
  const loadRequestRef = useRef(0);
  const sectionRequestRef = useRef<VerificationSectionState<number>>({ draft: 0, evidence: 0, cases: 0, contract: 0 });
  currentProfileIdRef.current = profileId;

  useEffect(() => {
    if (previousProfileId.current !== profileId) {
      loadRequestRef.current += 1;
      sectionRequestRef.current = {
        draft: sectionRequestRef.current.draft + 1,
        evidence: sectionRequestRef.current.evidence + 1,
        cases: sectionRequestRef.current.cases + 1,
        contract: sectionRequestRef.current.contract + 1,
      };
      setPendingUpload(null);
      setPendingEvidenceAction(null);
      operationKeyRef.current = null;
      setProfile(null);
      setOnboardingDraft(null);
      setDraftValuesText('');
      setDraftSavePending(false);
      setDraftSaveError(null);
      setDraftSaveFieldErrors([]);
      setDraftConflict(null);
      setDraftConflictReviewed(false);
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
      setSectionLoading({ draft: false, evidence: false, cases: false, contract: false });
      setSectionErrors({ draft: null, evidence: null, cases: null, contract: null });
      setCaseSubmissionError(null);
      setPersonRoutes({});
      setIdentityRoute('');
      setIdentityCountry('');
      setIdentityEvidence({});
      caseOperationKeyRef.current = null;
      cancelCreateCaseStepUp();
      cancelSaveDraftStepUp();
      setUploadError('The active profile changed. Pending verification data and security challenges were cleared; the selected file remains available for a new challenge.');
      previousProfileId.current = profileId;
    }
  }, [profileId, cancelCreateCaseStepUp, cancelSaveDraftStepUp]);

  useEffect(() => {
    if (!contract) return;
    setUploadPurpose((current) => contract.purposes.includes(current) ? current : contract.purposes[0] ?? '');
    setUploadSubject((current) => contract.subjects.fixed.includes(current) || contract.subjects.personFields.includes(current) ? current : contract.subjects.fixed[0] ?? contract.subjects.personFields[0] ?? '');
  }, [contract]);

  const load = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    const requestedProfileId = profileId;
    if (!requestedProfileId) {
      setProfile(null); setLoadedProfileId(null); setContract(null); setEvidence([]); setCases([]); setLoading(false);
      setSectionLoading({ draft: false, evidence: false, cases: false, contract: false });
      setSectionErrors({ draft: null, evidence: null, cases: null, contract: null });
      setError('Select an authorized profile to view verification.');
      return;
    }

    const isCurrentRequest = () => requestId === loadRequestRef.current && currentProfileIdRef.current === requestedProfileId;
    const sectionGenerations = { ...sectionRequestRef.current };
    const isSectionRequestCurrent = (section: VerificationSection) => isCurrentRequest() && sectionRequestRef.current[section] === sectionGenerations[section];
    const markSectionLoading = (section: VerificationSection, value: boolean) => {
      if (isSectionRequestCurrent(section)) setSectionLoading((current) => ({ ...current, [section]: value }));
    };
    const setSectionError = (section: VerificationSection, message: string | null) => {
      if (isSectionRequestCurrent(section)) setSectionErrors((current) => ({ ...current, [section]: message }));
    };

    setLoading(true);
    setError(null);
    setSectionErrors({ draft: null, evidence: null, cases: null, contract: null });
    setSectionLoading({ draft: true, evidence: true, cases: true, contract: true });

    // Each request is profile-scoped and read-only. Apply its result independently so one
    // slow endpoint cannot discard successful data from the other verification sections.
    const profileRequest = profileService.current(requestedProfileId)
      .then((current) => {
        if (!isCurrentRequest()) return;
        if (current.profile.id !== requestedProfileId) {
          setError('The active profile changed while verification data was loading. Refresh this page.');
          return;
        }
        setProfile(current.profile);
        setLoadedProfileId(requestedProfileId);
      })
      .catch((raw: unknown) => {
        if (isCurrentRequest()) setError(readErrorMessage(raw, 'Profile details'));
      })
      .finally(() => {
        if (isCurrentRequest()) setLoading(false);
      });

    const draftRequest = profileService.getOnboarding(requestedProfileId)
      .then((draft) => {
        if (!isSectionRequestCurrent('draft')) return;
        if (draft.profileId !== requestedProfileId) {
          setSectionError('draft', 'The onboarding draft belongs to a different profile. Select the correct profile and refresh.');
          return;
        }
        setOnboardingDraft(draft);
        setDraftValuesText(serializeDraftValues(draft.values));
        setDraftConflict(null);
        setDraftConflictReviewed(false);
        setDraftSaveError(null);
        setDraftSaveFieldErrors([]);
        setLoadedProfileId(requestedProfileId);
        setSectionError('draft', null);
      })
      .catch((raw: unknown) => setSectionError('draft', readErrorMessage(raw, 'Profile setup draft')))
      .finally(() => markSectionLoading('draft', false));

    const evidenceRequest = verificationCaseService.listEvidence({ limit: 25 })
      .then((page) => {
        if (!isSectionRequestCurrent('evidence')) return;
        setEvidence(page.evidence);
        setEvidenceCursor(page.nextCursor);
        setLoadedProfileId(requestedProfileId);
        setSectionError('evidence', null);
      })
      .catch((raw: unknown) => setSectionError('evidence', readErrorMessage(raw, 'Private evidence')))
      .finally(() => markSectionLoading('evidence', false));

    const casesRequest = verificationCaseService.listHolderCases({ limit: 25 })
      .then((page) => {
        if (!isSectionRequestCurrent('cases')) return;
        setCases(page.cases);
        setCaseCursor(page.nextCursor);
        setLoadedProfileId(requestedProfileId);
        setSectionError('cases', null);
      })
      .catch((raw: unknown) => setSectionError('cases', readErrorMessage(raw, 'Verification cases')))
      .finally(() => markSectionLoading('cases', false));

    const contractRequest = verificationCaseService.getEvidenceContract()
      .then((evidenceContract) => {
        if (!isSectionRequestCurrent('contract')) return;
        setContract(evidenceContract);
        setLoadedProfileId(requestedProfileId);
        setSectionError('contract', null);
      })
      .catch((raw: unknown) => setSectionError('contract', readErrorMessage(raw, 'Evidence requirements')))
      .finally(() => markSectionLoading('contract', false));

    void Promise.allSettled([profileRequest, draftRequest, evidenceRequest, casesRequest, contractRequest]);
  }, [profileId]);

  const retrySection = useCallback(async (section: VerificationSection) => {
    const requestedProfileId = profileId;
    if (!requestedProfileId) return;
    const requestId = loadRequestRef.current;
    const generation = ++sectionRequestRef.current[section];
    const isCurrentRequest = () => requestId === loadRequestRef.current && currentProfileIdRef.current === requestedProfileId && sectionRequestRef.current[section] === generation;
    setSectionLoading((current) => ({ ...current, [section]: true }));
    setSectionErrors((current) => ({ ...current, [section]: null }));
    try {
      if (section === 'draft') {
        const draft = await profileService.getOnboarding(requestedProfileId);
        if (!isCurrentRequest()) return;
        if (draft.profileId !== requestedProfileId) throw new Error('The onboarding draft belongs to a different profile. Select the correct profile and refresh.');
        setOnboardingDraft(draft);
        setDraftValuesText(serializeDraftValues(draft.values));
        setDraftConflict(null);
        setDraftConflictReviewed(false);
        setDraftSaveError(null);
        setDraftSaveFieldErrors([]);
      } else if (section === 'evidence') {
        const page = await verificationCaseService.listEvidence({ limit: 25 });
        if (!isCurrentRequest()) return;
        setEvidence(page.evidence); setEvidenceCursor(page.nextCursor);
      } else if (section === 'cases') {
        const page = await verificationCaseService.listHolderCases({ limit: 25 });
        if (!isCurrentRequest()) return;
        setCases(page.cases); setCaseCursor(page.nextCursor);
      } else {
        const evidenceContract = await verificationCaseService.getEvidenceContract();
        if (!isCurrentRequest()) return;
        setContract(evidenceContract);
      }
      setLoadedProfileId(requestedProfileId);
    } catch (raw) {
      if (isCurrentRequest()) setSectionErrors((current) => ({ ...current, [section]: readErrorMessage(raw, section === 'draft' ? 'Profile setup draft' : section === 'evidence' ? 'Private evidence' : section === 'cases' ? 'Verification cases' : 'Evidence requirements') }));
    } finally {
      if (isCurrentRequest()) setSectionLoading((current) => ({ ...current, [section]: false }));
    }
  }, [profileId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview.url); }, [filePreview]);

  const availableEvidenceCount = useMemo(() => evidence.filter((item) => isProfileEvidenceAvailable(item.state)).length, [evidence]);
  const kycProgress = useMemo(() => buildLandlordKycProgress({
    verificationStatus: profile?.verification?.status,
    cases,
    availableEvidenceCount,
    hasOnboardingDraft: Boolean(onboardingDraft),
  }), [availableEvidenceCount, cases, onboardingDraft, profile?.verification?.status]);
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
    setSectionErrors((current) => ({ ...current, evidence: null }));
    try { const page = await verificationCaseService.listEvidence({ limit: 25, before: evidenceCursor }); if (currentProfileIdRef.current !== requestedProfileId) return; setEvidence((current) => [...current, ...page.evidence]); setEvidenceCursor(page.nextCursor); }
    catch (raw) { if (currentProfileIdRef.current === requestedProfileId) setSectionErrors((current) => ({ ...current, evidence: readErrorMessage(raw, 'More private evidence') })); }
    finally { if (currentProfileIdRef.current === requestedProfileId) setBusy(false); }
  };

  const loadMoreCases = async () => {
    if (!caseCursor) return;
    const requestedProfileId = profileId;
    setBusy(true);
    setSectionErrors((current) => ({ ...current, cases: null }));
    try { const page = await verificationCaseService.listHolderCases({ limit: 25, before: caseCursor }); if (currentProfileIdRef.current !== requestedProfileId) return; setCases((current) => [...current, ...page.cases]); setCaseCursor(page.nextCursor); }
    catch (raw) { if (currentProfileIdRef.current === requestedProfileId) setSectionErrors((current) => ({ ...current, cases: readErrorMessage(raw, 'More verification cases') })); }
    finally { if (currentProfileIdRef.current === requestedProfileId) setBusy(false); }
  };

  const openEvidence = async (item: ProfileEvidence) => {
    const requestedProfileId = profileId;
    setBusy(true);
    try {
      const detail = await verificationCaseService.getEvidence(item.id);
      if (currentProfileIdRef.current !== requestedProfileId) return;
      setSelectedEvidence(detail);
      if (!isProfileEvidenceAvailable(detail.state)) return;
      const blob = await verificationCaseService.getEvidenceContent(item.id);
      if (currentProfileIdRef.current !== requestedProfileId) return;
      setFilePreview({ url: URL.createObjectURL(blob), mimeType: detail.mimeType, id: detail.id });
    } catch (raw) { if (currentProfileIdRef.current === requestedProfileId) setError(readErrorMessage(raw, 'Private evidence file')); }
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
    } catch (raw) { if (currentProfileIdRef.current === requestedProfileId) setError(readErrorMessage(raw, 'Verification case details')); }
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
      label: action === 'retry' ? `Retry evidence content validation ${item.id}` : `Remove profile evidence ${item.id}`,
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
    toast.success(action === 'retry'
      ? `File content validation was requested. Current evidence state: ${formatStatus(result.value.state)}. This does not mean KYC is approved.`
      : 'Evidence removal was queued. Its current state remains visible until processing completes.');
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
      toast.success(`Evidence upload accepted. Current file state: ${formatStatus(created.state)}. File validation status is separate from KYC approval.`);
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

  const parsedDraftValues = useMemo(() => parseDraftValues(draftValuesText), [draftValuesText]);
  const draftValuesDirty = Boolean(onboardingDraft && (
    !parsedDraftValues.values || JSON.stringify(parsedDraftValues.values) !== JSON.stringify(onboardingDraft.values)
  ));
  const missingDraftFields = useMemo(() => draftMissingFields(onboardingDraft?.readiness), [onboardingDraft?.readiness]);
  const draftFields = useMemo(
    () => onboardingDraftFields(parsedDraftValues.values ?? onboardingDraft?.values ?? {}, missingDraftFields),
    [missingDraftFields, onboardingDraft?.values, parsedDraftValues.values],
  );
  const protectedCaseSubmissionLocked = createCaseStepUp.busy || Boolean(createCaseStepUp.challenge);
  const draftEditorLocked = draftSavePending || saveDraftStepUp.busy || Boolean(saveDraftStepUp.challenge) || protectedCaseSubmissionLocked;

  const refreshDraftAfterConflict = async (requestedProfileId: string, message: string) => {
    setSectionLoading((current) => ({ ...current, draft: true }));
    setSectionErrors((current) => ({ ...current, draft: null }));
    try {
      const latest = await profileService.getOnboarding(requestedProfileId);
      if (currentProfileIdRef.current !== requestedProfileId) return;
      if (latest.profileId !== requestedProfileId) throw new Error('The latest draft belongs to a different profile. Refresh after selecting the intended profile.');
      setOnboardingDraft(latest);
      setDraftConflict({ latest, message });
      setDraftConflictReviewed(false);
      setSectionErrors((current) => ({ ...current, draft: null }));
    } catch (raw) {
      if (currentProfileIdRef.current === requestedProfileId) {
        setDraftSaveError(`${message} The latest draft could not be loaded: ${readErrorMessage(raw, 'Profile setup draft')}`);
        setSectionErrors((current) => ({ ...current, draft: readErrorMessage(raw, 'Profile setup draft') }));
      }
    } finally {
      if (currentProfileIdRef.current === requestedProfileId) setSectionLoading((current) => ({ ...current, draft: false }));
    }
  };

  const useLatestDraft = () => {
    if (!draftConflict) return;
    setDraftValuesText(serializeDraftValues(draftConflict.latest.values));
    setDraftConflict(null);
    setDraftConflictReviewed(false);
    setDraftSaveError(null);
    setDraftSaveFieldErrors([]);
  };

  const keepDraftEditsAfterReview = () => {
    setDraftConflictReviewed(true);
    setDraftSaveError(null);
  };

  const updateDraftField = (path: string, value: string | number | boolean | null) => {
    if (!parsedDraftValues.values) return;
    try {
      setDraftValuesText(serializeDraftValues(updateOnboardingDraftField(parsedDraftValues.values, path, value)));
      setDraftSaveError(null);
      setDraftSaveFieldErrors([]);
      if (draftConflict) setDraftConflictReviewed(false);
    } catch (raw) {
      setDraftSaveError(raw instanceof Error ? raw.message : 'This profile field could not be updated. Refresh the draft and try again.');
    }
  };

  const beginDraftSave = async () => {
    if (!profileId || !onboardingDraft || draftSavePending || saveDraftStepUp.busy || saveDraftStepUp.challenge) return;
    if (draftConflict && !draftConflictReviewed) {
      setDraftSaveError('Review the latest saved draft before saving your edits.');
      return;
    }
    const parsed = parseDraftValues(draftValuesText);
    if (parsed.error || !parsed.values) {
      setDraftSaveError(parsed.error ?? 'Enter profile draft values as a JSON object.');
      setDraftSaveFieldErrors([]);
      return;
    }
    const requestedProfileId = profileId;
    const body = { expectedVersion: onboardingDraft.version, values: parsed.values };
    setDraftSavePending(true);
    setDraftSaveError(null);
    setDraftSaveFieldErrors([]);
    const started = await saveDraftStepUp.begin({
      method: 'PATCH',
      path: '/api/profiles/current/onboarding',
      body,
      label: 'Save profile details for KYC',
      execute: (challengeId, exactBody) => profileService.updateOnboarding(exactBody, challengeId, requestedProfileId),
    });
    if (!started) setDraftSavePending(false);
  };

  const completeDraftSave = async (code: string): Promise<boolean> => {
    const requestedProfileId = profileId;
    if (!requestedProfileId) return false;
    const result = await saveDraftStepUp.complete(code);
    if (!result.ok) {
      setDraftSaveError(result.error ?? 'The draft could not be saved. Your edits are still here.');
      setDraftSaveFieldErrors(result.fieldErrors ?? []);
      if (stepUpCodeCanRetryWithSameChallenge(result.code)) return false;
      setDraftSavePending(false);
      if (result.code === 'CONFLICT_ONBOARDING_VERSION') {
        await refreshDraftAfterConflict(requestedProfileId, 'The draft changed elsewhere. Review the latest saved version before continuing.');
      } else if (!result.code && /timed out|unable to confirm a response|may have been processed/i.test(result.error ?? '')) {
        await refreshDraftAfterConflict(requestedProfileId, 'The save result could not be confirmed. Review the latest saved version before trying again.');
      }
      return false;
    }
    if (currentProfileIdRef.current !== requestedProfileId || result.value.profileId !== requestedProfileId) return false;
    setOnboardingDraft(result.value);
    setDraftValuesText(serializeDraftValues(result.value.values));
    setDraftSavePending(false);
    setDraftSaveError(null);
    setDraftSaveFieldErrors([]);
    setDraftConflict(null);
    setDraftConflictReviewed(false);
    setSectionErrors((current) => ({ ...current, draft: null }));
    toast.success('Profile draft saved. Review its readiness before submitting for verification.');
    return true;
  };

  const beginCaseSubmission = async () => {
    if (!profileId || !onboardingDraft || !contract || busy || createCaseStepUp.busy || createCaseStepUp.challenge) return;
    if (draftSavePending || saveDraftStepUp.busy || saveDraftStepUp.challenge) {
      setCaseSubmissionError('Wait for the profile draft save to finish before submitting for verification.');
      return;
    }
    if (draftValuesDirty) {
      setCaseSubmissionError('Save your profile edits before submitting for verification.');
      return;
    }
    if (draftConflict && !draftConflictReviewed) {
      setCaseSubmissionError('Review the latest saved profile draft before submitting again.');
      return;
    }
    if (missingDraftFields.length) {
      setCaseSubmissionError(`Complete the required profile fields before submitting: ${missingDraftFields.map(formatDraftFieldName).join(', ')}.`);
      return;
    }
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
    const missingIdentityPurposes = identityItems.filter((item) => !item.evidenceId || !evidence.some((record) => record.id === item.evidenceId && record.purpose === item.purpose && isProfileEvidenceAvailable(record.state)));
    if (missingIdentityPurposes.length) {
      const missingLabels = missingIdentityPurposes.map((item) => item.purpose.replaceAll('_', ' ')).join(', ');
      setCaseSubmissionError(`Available private evidence is required for each configured identity purpose before submitting: ${missingLabels}.`);
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
    if (draftSavePending || draftValuesDirty || !onboardingDraft || draftConflict && !draftConflictReviewed) {
      cancelCreateCaseStepUp();
      setCaseSubmissionError('The profile draft changed or is not saved. Review and save it before starting a new verification submission.');
      return false;
    }
    const result = await createCaseStepUp.complete(code);
    if (!result.ok) {
      if (!stepUpCodeCanRetryWithSameChallenge(result.code)) {
        setCaseSubmissionError(result.error ?? 'The verification submission could not be confirmed. Review the latest case and draft status before retrying.');
        if (currentProfileIdRef.current === requestedProfileId) {
          if (result.code === 'CONFLICT_ONBOARDING_VERSION') {
            await refreshDraftAfterConflict(requestedProfileId, 'The onboarding draft changed before submission. Review the latest saved version; the case was not submitted against a stale draft.');
          }
          await retrySection('cases');
        }
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
          <div className="flex gap-2"><Button type="button" variant="secondary" disabled={loading || draftValuesDirty || draftSavePending} onClick={() => void load()}>Refresh</Button><Link to="/dashboard/landlord/settings" className="inline-flex items-center rounded-lg bg-surface-container-high px-4 py-2 text-sm font-semibold">Back to Settings</Link></div>
        </header>
        {loading ? <LoadingState label="Loading profile verification..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!profileDataCurrent && profileId && !loading && !error ? <LoadingState label="Refreshing data for the selected profile..." /> : null}
        {profileDataCurrent && profile ? <section className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 lg:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">Current profile</p><h2 className="mt-2 text-2xl font-extrabold">{profile.name}</h2>
          <dl className="mt-6 grid gap-4 text-sm md:grid-cols-4"><div className="rounded-xl bg-white/70 p-4"><dt className="text-xs font-bold uppercase text-secondary">Verification</dt><dd className="mt-2 font-semibold">{formatStatus(profile.verification?.status)}</dd></div><div className="rounded-xl bg-white/70 p-4"><dt className="text-xs font-bold uppercase text-secondary">Profile state</dt><dd className="mt-2 font-semibold">{formatStatus(profile.status)}</dd></div><div className="rounded-xl bg-white/70 p-4"><dt className="text-xs font-bold uppercase text-secondary">Last reviewed</dt><dd className="mt-2 font-semibold">{formatDate(profile.verification?.reviewedAt)}</dd></div><div className="rounded-xl bg-white/70 p-4"><dt className="text-xs font-bold uppercase text-secondary">Available evidence</dt><dd className="mt-2 font-semibold">{sectionLoading.evidence ? 'Loading…' : sectionErrors.evidence ? 'Unavailable' : availableEvidenceCount}</dd></div></dl>
        </section> : null}
        {profileDataCurrent && profile ? <>
          <LandlordKycProgressTracker progress={kycProgress} />
          {sectionLoading.draft || sectionLoading.evidence || sectionLoading.cases || sectionErrors.draft || sectionErrors.evidence || sectionErrors.cases ? <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Some KYC data is still loading or unavailable. The progress tracker may be incomplete until you retry the affected section.</p> : null}
        </> : null}
        {profileDataCurrent ? <section id="kyc-evidence-upload" aria-label="KYC evidence requirements and upload" className="scroll-mt-6 rounded-2xl border border-outline-variant/10 bg-white p-6">
          {contract ? <>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">Evidence requirements</h2><p className="mt-1 text-sm text-secondary">Current policy version {contract.version} · maximum file size {Math.ceil(contract.maxBytes / 1024 / 1024)} MB · accepted formats {contract.formats.join(', ')}</p></div><span className="text-xs text-secondary">Upload policy: {formatStatus(contract.policies.upload?.state)} · identity policy: {formatStatus(contract.policies.acceptedIdentity?.state)}</span></div>
          {contract.acceptedInternationalIds.length ? <p className="mt-2 text-sm"><strong>Accepted configured international IDs:</strong> {contract.acceptedInternationalIds.join(', ')}</p> : null}
          {contract.subjects.personFields.length ? <p className="mt-2 text-sm"><strong>Declared person fields:</strong> {contract.subjects.personFields.join(', ')}</p> : null}
          <div className="mt-4 rounded-lg border border-outline-variant/10 bg-surface-container-low p-4">
            <h3 className="font-bold">Upload private evidence</h3>
            <p className="mt-1 text-xs text-secondary">The selected file bytes and upload metadata are bound to a one-use authenticator challenge. The server validates supported format/signature, structure, size and content hash, then reports the current private-file state. These checks do not detect malware or approve identity, KYC or title.</p>
            {contract.policies.upload?.state !== 'configured' ? <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">The evidence upload policy is {formatStatus(contract.policies.upload?.state)}. Submission is unavailable until the backend policy is configured.</p> : <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-xs font-bold">Purpose<select className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={uploadPurpose} onChange={(event) => { setUploadPurpose(event.target.value); setUploadDocumentKind(''); setUploadPreviousEvidenceId(''); setPendingUpload(null); operationKeyRef.current = null; }}><option value="">Choose purpose</option>{contract.purposes.map((purpose) => <option key={purpose} value={purpose}>{purpose.replaceAll('_', ' ')}</option>)}</select></label>
              <label className="text-xs font-bold">Subject<select className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={uploadSubject} onChange={(event) => { setUploadSubject(event.target.value); setUploadPreviousEvidenceId(''); setPendingUpload(null); operationKeyRef.current = null; }}><option value="">Choose subject</option>{[...contract.subjects.fixed, ...contract.subjects.personFields].map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
              <label className="text-xs font-bold">Document kind<select className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={uploadDocumentKind || (contract.documentKinds[uploadPurpose]?.length ? '' : uploadPurpose)} onChange={(event) => { setUploadDocumentKind(event.target.value); setPendingUpload(null); operationKeyRef.current = null; }}><option value={contract.documentKinds[uploadPurpose]?.length ? '' : uploadPurpose}>{contract.documentKinds[uploadPurpose]?.length ? 'Choose document kind' : `Use documented default: ${uploadPurpose || 'purpose'}`}</option>{(contract.documentKinds[uploadPurpose] ?? []).map((kind) => <option key={kind} value={kind}>{kind.replaceAll('_', ' ')}</option>)}</select></label>
              <label className="text-xs font-bold">File<input type="file" accept={contract.formats.join(',')} className="mt-1 block w-full text-sm font-normal" onChange={(event) => { setUploadFile(event.target.files?.[0] ?? null); setPendingUpload(null); operationKeyRef.current = null; setUploadError(null); }} /><span className="mt-1 block font-normal text-secondary">Maximum {Math.ceil(Math.min(contract.maxBytes, 50 * 1024 * 1024) / 1024 / 1024)} MB</span></label>
              <label className="text-xs font-bold">Replace existing evidence version (optional)<select className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={uploadPreviousEvidenceId} onChange={(event) => { setUploadPreviousEvidenceId(event.target.value); setPendingUpload(null); operationKeyRef.current = null; }}><option value="">Submit as a new evidence record</option>{evidence.filter((item) => item.purpose === uploadPurpose && item.subject === uploadSubject && !['deleted', 'deleting', 'privacy_deleting'].includes(item.state)).map((item) => <option key={item.id} value={item.id}>{formatStatus(item.state)} · v{item.version} · {item.id}</option>)}</select><span className="mt-1 block font-normal text-secondary">The server verifies that the selected record is the current version for this purpose and subject.</span></label>
              <div className="md:col-span-2"><Button type="button" disabled={uploadBusy || Boolean(pendingUpload) || !uploadFile || !uploadPurpose || !uploadSubject || !profileId} onClick={() => void beginEvidenceUpload()}>{uploadBusy ? 'Preparing secure upload…' : 'Continue with authenticator'}</Button>{uploadError ? <p role="alert" className="mt-2 text-sm text-error">{uploadError}</p> : null}</div>
            </div>}
          </div>
          </> : <div className="rounded-lg border border-outline-variant/10 bg-surface-container-low p-4"><h2 className="text-xl font-extrabold">Evidence requirements</h2>{sectionErrors.contract ? <p role="alert" className="mt-2 text-sm text-error">{sectionErrors.contract}</p> : <p role="status" className="mt-2 text-sm text-secondary">{sectionLoading.contract ? 'Loading evidence requirements…' : 'Evidence requirements are unavailable.'}</p>}<Button type="button" variant="secondary" className="mt-3" disabled={sectionLoading.contract} onClick={() => void retrySection('contract')}>Retry requirements</Button></div>}
        </section> : null}
        {profileDataCurrent ? <section id="kyc-case-list" className="scroll-mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Private evidence</h2><p className="mt-1 text-xs text-secondary">Only evidence in the current Available state can be opened; the server rechecks authorization. File-content validation and removal states refresh automatically for a bounded period.</p></div><Button type="button" variant="secondary" disabled={busy || !evidenceCursor} onClick={() => void loadMoreEvidence()}>Load more</Button></div>
            {sectionErrors.evidence ? <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-error"><p>{sectionErrors.evidence}</p><Button type="button" variant="secondary" className="mt-2" disabled={sectionLoading.evidence} onClick={() => void retrySection('evidence')}>Retry evidence</Button></div> : null}
            {sectionLoading.evidence && !evidence.length ? <LoadingState label="Loading private evidence…" /> : null}
            <div className="mt-4 space-y-2">{evidence.map((item) => <article key={item.id} className="rounded-lg bg-surface-container-low p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{item.purpose.replaceAll('_', ' ')} · {item.documentKind.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-secondary">{item.subject} · Version {item.version} · {Math.ceil(item.size / 1024)} KB · Added {formatDate(item.createdAt)}</p>{item.previousEvidenceId ? <p className="mt-1 break-all text-xs text-secondary">Replaces evidence version {item.previousEvidenceId}</p> : null}</div><span className={`text-xs font-bold ${statusClass(item.state)}`}>{formatStatus(item.state)}</span></div>{item.contentValidatedAt ? <p className="mt-1 text-xs text-secondary">Content validated {formatDate(item.contentValidatedAt)}</p> : null}{item.errorCode ? <p className="mt-2 text-xs text-error">{item.errorCode}</p> : null}<div className="mt-2 flex flex-wrap gap-2"><Button type="button" variant="ghost" disabled={busy || !isProfileEvidenceAvailable(item.state)} onClick={() => void openEvidence(item)}>Open authorized file</Button>{item.state === 'retry' ? <Button type="button" variant="secondary" disabled={busy || evidenceStepUp.busy || Boolean(evidenceStepUp.challenge)} onClick={() => void beginEvidenceAction(item, 'retry')}>Retry content validation with authenticator</Button> : null}{!['deleting', 'privacy_deleting', 'deleted'].includes(item.state) ? <Button type="button" variant="secondary" disabled={busy || evidenceStepUp.busy || Boolean(evidenceStepUp.challenge)} onClick={() => void beginEvidenceAction(item, 'delete')}>Request removal</Button> : null}{item.state === 'deleting' || item.state === 'privacy_deleting' ? <span role="status" className="self-center text-xs text-secondary">Removal is processing.</span> : null}</div></article>)}{!evidence.length && !sectionLoading.evidence && !sectionErrors.evidence ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No evidence records returned for this profile.</p> : null}</div>
          </div>
          <div className="rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Verification cases</h2><p className="mt-1 text-xs text-secondary">Case state and history are returned by the current-profile API.</p></div><Button type="button" variant="secondary" disabled={busy || !caseCursor} onClick={() => void loadMoreCases()}>Load more</Button></div>
            {sectionErrors.cases ? <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-error"><p>{sectionErrors.cases}</p><Button type="button" variant="secondary" className="mt-2" disabled={sectionLoading.cases} onClick={() => void retrySection('cases')}>Retry cases</Button></div> : null}
            {sectionLoading.cases && !cases.length ? <LoadingState label="Loading verification cases…" /> : null}
            <div className="mt-4 space-y-2">{cases.map((item) => <article key={item.id} className="rounded-lg bg-surface-container-low p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold capitalize">{item.kind} · {item.structure}</p><p className="mt-1 text-xs text-secondary">Case {item.id} · Version {item.version} · Draft version {item.draftVersion}</p></div><span className={`text-xs font-bold ${statusClass(item.state)}`}>{formatStatus(item.state)}</span></div><p className="mt-1 text-xs text-secondary">Submitted {formatDate(item.submittedAt)} · Reviewed {formatDate(item.reviewedAt)} · Expires {formatDate(item.expiresAt)}</p><Button type="button" variant="ghost" disabled={busy} onClick={() => void openCase(item)}>Details and history</Button></article>)}{!cases.length && !sectionLoading.cases && !sectionErrors.cases ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No verification cases returned for this profile.</p> : null}</div>
            <div id="kyc-case-submission" className="mt-5 scroll-mt-6 rounded-lg border border-outline-variant/10 bg-surface-container-low p-4">
              <h3 className="font-bold">Submit a verification case</h3>
              <p className="mt-1 text-sm text-secondary">Complete your profile and required evidence before submitting for KYC review.</p>
              {!onboardingDraft ? sectionErrors.draft ? <div role="alert" className="mt-2 text-sm text-error"><p>{sectionErrors.draft}</p><Button type="button" variant="secondary" className="mt-2" disabled={sectionLoading.draft} onClick={() => void retrySection('draft')}>Retry profile draft</Button></div> : <p role="status" className="mt-2 text-sm text-amber-900">{sectionLoading.draft ? 'Loading profile…' : 'Profile details are unavailable. Refresh before submission.'}</p> : null}
              {onboardingDraft ? <div className="mt-3 rounded-lg bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-semibold">Profile draft</h4>
                  <p role="status" className={draftValuesDirty || missingDraftFields.length ? 'text-sm font-semibold text-amber-800' : 'text-sm font-semibold text-emerald-700'}>
                    {draftSavePending ? 'Saving draft…' : draftValuesDirty ? 'Unsaved changes' : missingDraftFields.length ? `Saved · version ${onboardingDraft.version} · required fields remain` : `Saved · version ${onboardingDraft.version}`}
                  </p>
                </div>
                {missingDraftFields.length ? <p className="mt-2 text-sm text-amber-900"><strong>Still required:</strong> {missingDraftFields.map(formatDraftFieldName).join(', ')}.</p> : null}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {draftFields.map((field) => {
                    const fieldError = draftSaveFieldErrors.find((item) => item.path === field.path || item.path === `values.${field.path}`);
                    if (field.inputType === 'checkbox') {
                      return <div key={field.path} className="rounded-lg border border-outline-variant/20 p-3">
                        <label className="flex items-center gap-2 text-sm font-semibold"><input aria-label={field.label} type="checkbox" checked={field.value === true} disabled={draftEditorLocked} onChange={(event) => updateDraftField(field.path, event.target.checked)} />{field.label}{field.required ? <span className="text-error">Required</span> : null}</label>
                        {fieldError ? <p role="alert" className="mt-2 text-xs text-error">{fieldError.msg ?? 'Check this value.'}</p> : null}
                      </div>;
                    }
                    return <label key={field.path} className="block text-xs font-bold">{field.label}{field.required ? <span className="ml-1 text-error">Required</span> : null}
                      <input aria-label={field.label} type={field.inputType} step={field.inputType === 'number' ? 'any' : undefined} className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={field.value === null || field.value === undefined ? '' : String(field.value)} disabled={draftEditorLocked} aria-required={field.required} aria-invalid={Boolean(fieldError)} onChange={(event) => {
                        const nextValue = field.inputType === 'number'
                          ? event.target.value === '' ? null : Number(event.target.value)
                          : event.target.value === '' ? null : event.target.value;
                        updateDraftField(field.path, nextValue);
                      }} />
                      {fieldError ? <span role="alert" className="mt-1 block text-xs text-error">{fieldError.msg ?? 'Check this value.'}</span> : null}
                    </label>;
                  })}
                  {!draftFields.length ? <p className="text-sm text-secondary sm:col-span-2">No profile fields are currently marked as missing or returned with editable values.</p> : null}
                </div>
                <p className="mt-2 text-xs text-secondary">Enter your profile details below. These values are saved to your private onboarding draft; verification review is a separate step.</p>
                {draftConflict ? <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                  <p>{draftConflict.message} The latest saved draft is version {draftConflict.latest.version}. Review it before continuing.</p>
                  <details className="mt-2"><summary className="cursor-pointer font-semibold">Review latest saved profile values</summary><dl className="mt-2 grid gap-2 rounded bg-white p-3 text-xs sm:grid-cols-2">{onboardingDraftFields(draftConflict.latest.values).map((field) => <div key={field.path}><dt className="font-semibold">{field.label}</dt><dd className="break-words">{onboardingDraftFieldDisplayValue(field.value)}</dd></div>)}{!onboardingDraftFields(draftConflict.latest.values).length ? <p>No profile values were returned.</p> : null}</dl></details>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={useLatestDraft}>Use latest saved draft</Button>
                    <Button type="button" variant="secondary" onClick={keepDraftEditsAfterReview}>Keep my edits after review</Button>
                  </div>
                  {draftConflictReviewed ? <p role="status" className="mt-2">Latest server values reviewed. Save your edits to continue.</p> : null}
                </div> : null}
                {draftSaveError || saveDraftStepUp.error ? <p role="alert" className="mt-2 text-sm text-error">{draftSaveError ?? saveDraftStepUp.error}</p> : null}
                {draftSaveFieldErrors.length ? <ul role="alert" className="mt-2 list-disc pl-5 text-sm text-error">{draftSaveFieldErrors.map((item, index) => <li key={`${item.path ?? 'field'}-${index}`}>{item.path ? `${item.path}: ` : ''}{item.msg ?? 'Invalid value.'}</li>)}</ul> : null}
                <Button type="button" variant="secondary" className="mt-3" disabled={!draftValuesDirty || !parsedDraftValues.values || draftSavePending || saveDraftStepUp.busy || Boolean(saveDraftStepUp.challenge) || Boolean(draftConflict && !draftConflictReviewed)} onClick={() => void beginDraftSave()}>
                  {draftSavePending || saveDraftStepUp.busy ? 'Preparing secure save…' : 'Save draft with authenticator'}
                </Button>
              </div> : null}
              {declaredPersonPaths.map((path) => <div key={path} className="mt-3 grid gap-3 rounded-lg bg-white p-3 sm:grid-cols-2">
                <p className="break-all text-sm font-semibold sm:col-span-2">Declared person: <code>{path}</code></p>
                <label className="text-xs font-bold">Identity route<select disabled={protectedCaseSubmissionLocked} className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={personRoutes[path]?.route ?? ''} onChange={(event) => setPersonRoutes((current) => ({ ...current, [path]: { route: event.target.value as 'nigerian' | 'international' | '', country: current[path]?.country ?? '' } }))}><option value="">Choose route</option><option value="nigerian">Nigerian</option><option value="international">International</option></select></label>
                <label className="text-xs font-bold">Country code<input disabled={protectedCaseSubmissionLocked} className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal uppercase" maxLength={2} value={personRoutes[path]?.country ?? ''} onChange={(event) => setPersonRoutes((current) => ({ ...current, [path]: { route: current[path]?.route ?? '', country: event.target.value.toUpperCase() } }))} placeholder="NG" /></label>
              </div>)}
              {onboardingDraft?.structure === 'individual' ? <div className="mt-3 grid gap-3 rounded-lg bg-white p-3 sm:grid-cols-2">
                <label className="text-xs font-bold">Individual identity route<select disabled={protectedCaseSubmissionLocked} className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={identityRoute} onChange={(event) => { setIdentityRoute(event.target.value as 'nigerian' | 'international' | ''); setIdentityEvidence({}); }}><option value="">Choose configured route</option>{(['nigerian', 'international'] as const).filter((route) => Object.prototype.hasOwnProperty.call(contract?.individualRoutes ?? {}, route)).map((route) => <option key={route} value={route}>{route === 'nigerian' ? 'Nigerian' : 'International'}</option>)}</select></label>
                <label className="text-xs font-bold">Identity country<input disabled={protectedCaseSubmissionLocked} className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal uppercase" maxLength={2} value={identityCountry} onChange={(event) => setIdentityCountry(event.target.value.toUpperCase())} placeholder="NG" /></label>
                {(identityRoute ? contract?.individualRoutes[identityRoute] ?? [] : []).map((purpose) => {
                  const purposeEvidence = evidence.filter((item) => item.purpose === purpose);
                  const availablePurposeEvidence = purposeEvidence.filter((item) => isProfileEvidenceAvailable(item.state));

                  if (availablePurposeEvidence.length) {
                    return <label key={purpose} className="text-xs font-bold">Evidence for {purpose.replaceAll('_', ' ')}<select disabled={protectedCaseSubmissionLocked} className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={identityEvidence[purpose] ?? ''} onChange={(event) => setIdentityEvidence((current) => ({ ...current, [purpose]: event.target.value }))}><option value="">Choose available private evidence</option>{availablePurposeEvidence.map((item) => <option key={item.id} value={item.id}>{item.documentKind.replaceAll('_', ' ')} · v{item.version} · {item.id}</option>)}</select></label>;
                  }

                  const purposeLabel = purpose.replaceAll('_', ' ');
                  const latestState = purposeEvidence[0]?.state;
                  const unavailableMessage = sectionLoading.evidence
                    ? `Checking available ${purposeLabel} evidence…`
                    : sectionErrors.evidence
                      ? `Could not confirm ${purposeLabel} evidence. Retry the private evidence list before continuing.`
                      : latestState
                        ? `Your ${purposeLabel} evidence is ${formatStatus(latestState).toLowerCase()}, so it cannot be selected yet.`
                      : evidenceCursor
                        ? `No available ${purposeLabel} evidence appears in the loaded records. Check older evidence or upload it to continue.`
                        : `No available ${purposeLabel} evidence has been uploaded. Upload it to continue.`;

                  return <div key={purpose} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="status">
                    <p className="font-semibold">{purposeLabel.replace(/\b\w/g, (letter) => letter.toUpperCase())} evidence required</p>
                    <p className="mt-1">{unavailableMessage}</p>
                    {sectionErrors.evidence ? <Button type="button" variant="secondary" className="mt-2" disabled={sectionLoading.evidence} onClick={() => void retrySection('evidence')}>Retry private evidence</Button> : null}
                    {!sectionErrors.evidence && evidenceCursor ? <Button type="button" variant="secondary" className="mt-2" disabled={busy || sectionLoading.evidence} onClick={() => void loadMoreEvidence()}>Load older evidence</Button> : null}
                    {!sectionLoading.evidence && !sectionErrors.evidence && !latestState ? <a className="mt-2 inline-flex font-semibold underline" href="#kyc-evidence-upload">Upload {purposeLabel} evidence</a> : null}
                    {latestState ? <a className="mt-2 inline-flex font-semibold underline" href="#kyc-case-list">View evidence status</a> : null}
                  </div>;
                })}
                {contract?.policies.acceptedIdentity?.state !== 'configured' ? <p role="status" className="text-sm text-amber-900 sm:col-span-2">Identity verification policy is {formatStatus(contract?.policies.acceptedIdentity?.state)}. The server will not accept identity evidence until its policy is configured.</p> : null}
              </div> : null}
              {caseSubmissionError || createCaseStepUp.error ? <p role="alert" className="mt-3 text-sm text-error">{caseSubmissionError ?? createCaseStepUp.error}</p> : null}
              <Button type="button" className="mt-3" disabled={!onboardingDraft || busy || draftValuesDirty || missingDraftFields.length > 0 || draftSavePending || saveDraftStepUp.busy || Boolean(saveDraftStepUp.challenge) || Boolean(draftConflict && !draftConflictReviewed) || createCaseStepUp.busy || Boolean(createCaseStepUp.challenge) || (onboardingDraft.structure === 'individual' && contract?.policies.acceptedIdentity?.state !== 'configured')} onClick={() => void beginCaseSubmission()}>{createCaseStepUp.busy ? 'Preparing secure submission…' : 'Submit saved draft for verification'}</Button>
            </div>
          </div>
        </section> : null}
        {profileDataCurrent && selectedEvidence ? <section className="rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">Evidence detail</h2><p className="mt-1 text-sm text-secondary">{selectedEvidence.id} · {selectedEvidence.mimeType} · Version {selectedEvidence.version}</p></div><Button type="button" variant="secondary" onClick={() => setSelectedEvidence(null)}>Close details</Button></div><p className="mt-3 text-sm">Purpose {selectedEvidence.purpose} · Subject {selectedEvidence.subject} · State {formatStatus(selectedEvidence.state)}{selectedEvidence.contentValidatedAt ? ` · Content validated ${formatDate(selectedEvidence.contentValidatedAt)}` : ''}{selectedEvidence.previousEvidenceId ? ` · Previous evidence ${selectedEvidence.previousEvidenceId}` : ''}</p><p className="mt-2 text-xs text-secondary">Content validation checks supported file format, structure, size and content hash. It does not detect malware or approve identity, KYC or title.</p></section> : null}
        {profileDataCurrent && selectedCase ? <section className="rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">Case detail and history</h2><p className="mt-1 text-sm text-secondary">{selectedCase.kind} · {selectedCase.state} · Version {selectedCase.version}</p></div><Button type="button" variant="secondary" onClick={() => setSelectedCase(null)}>Close case</Button></div><p className="mt-3 text-sm">Rejection codes: {selectedCase.rejectionCodes.length ? selectedCase.rejectionCodes.join(', ') : 'None returned.'}</p><div className="mt-4 space-y-2">{history?.events.map((event) => <div key={event.id} className="rounded-lg bg-surface-container-low p-3 text-sm"><strong>{event.action}</strong><span className="ml-2 text-xs text-secondary">Version {event.version} · {formatDate(event.at)}</span></div>)}{!history?.events.length ? <p className="text-sm text-secondary">No case history events returned.</p> : null}</div>{history?.nextCursor ? <Button type="button" variant="secondary" disabled={busy} className="mt-3" onClick={async () => { const requestedProfileId = profileId; setBusy(true); try { const page = await verificationCaseService.holderHistory(selectedCase.id, history.nextCursor ?? undefined); if (currentProfileIdRef.current === requestedProfileId) setHistory((current) => current ? { events: [...current.events, ...page.events], nextCursor: page.nextCursor } : page); } catch (raw) { if (currentProfileIdRef.current === requestedProfileId) setError(readErrorMessage(raw, 'Verification case history')); } finally { if (currentProfileIdRef.current === requestedProfileId) setBusy(false); } }}>Load more history</Button> : null}{['submitted', 'under_review'].includes(selectedCase.state) ? <Button type="button" variant="secondary" className="mt-4" disabled={busy || withdrawStepUp.busy || Boolean(withdrawStepUp.challenge)} onClick={() => void beginWithdraw()}>Withdraw case</Button> : null}</section> : null}
        {profileDataCurrent && filePreview ? <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-label="Private evidence viewer" className="flex h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white p-4"><div className="flex items-center justify-between"><h2 className="font-bold">Authorized private evidence · {filePreview.id}</h2><Button type="button" variant="secondary" onClick={() => { URL.revokeObjectURL(filePreview.url); setFilePreview(null); }}>Close viewer</Button></div><div className="mt-3 min-h-0 flex-1"><AuthorizedFilePreview url={filePreview.url} mimeType={filePreview.mimeType} alt="Private profile evidence" /></div></section></div> : null}
        <StepUpDialog challenge={profileDataCurrent ? withdrawStepUp.challenge : null} busy={withdrawStepUp.busy} error={withdrawStepUp.error} onCancel={withdrawStepUp.cancel} onSubmit={completeWithdraw} />
        <StepUpDialog challenge={profileDataCurrent ? createCaseStepUp.challenge : null} busy={createCaseStepUp.busy} error={createCaseStepUp.error || caseSubmissionError} onCancel={() => { createCaseStepUp.cancel(); setCaseSubmissionError(null); }} onSubmit={completeCaseSubmission} />
        <StepUpDialog challenge={profileDataCurrent ? saveDraftStepUp.challenge : null} busy={saveDraftStepUp.busy} error={saveDraftStepUp.error || draftSaveError} onCancel={() => { saveDraftStepUp.cancel(); setDraftSavePending(false); setDraftSaveError(null); }} onSubmit={completeDraftSave} />
        <StepUpDialog challenge={profileDataCurrent ? evidenceStepUp.challenge : null} busy={evidenceStepUp.busy} error={evidenceStepUp.error} onCancel={() => { evidenceStepUp.cancel(); setPendingEvidenceAction(null); }} onSubmit={completeEvidenceAction} />
        <StepUpDialog challenge={profileDataCurrent && pendingUpload && pendingUpload.profileId === profileId ? pendingUpload.challenge : null} busy={uploadBusy} error={uploadError} onCancel={() => { setPendingUpload(null); setUploadError(null); }} onSubmit={completeEvidenceUpload} />
      </main>
    </LandlordPortalLayout>
  );
};

export default LandlordVerification;
