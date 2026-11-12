import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import AdminLayout from '../../../components/layout/AdminLayout';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import LandlordKycProgressTracker from '../../../components/verification/LandlordKycProgressTracker';
import AuthorizedFilePreview from '../../../components/verification/AuthorizedFilePreview';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import ModalPortal from '../../../components/ui/ModalPortal';
import { useAuth } from '../../../contexts/AuthContext';
import { ApiRequestError, type ApiFieldError } from '../../../lib/axios';
import { hasAdminCapability } from '../../../services/adminAccessService';
import { stepUpErrorMessage, useBoundStepUp } from '../../../hooks/useBoundStepUp';
import type { BoundStepUpChallenge } from '../../../hooks/useBoundStepUp';
import { stepUpService } from '../../../services/stepUpService';
import { profileService, type AccountProfileSummary, type ProfileOnboardingDraft } from '../../../services/profileService';
import { verificationCaseService, type ProfileEvidence, type ProfileEvidenceContract, type VerificationCase, type VerificationCaseHistoryPage, type VerificationCasePersonRoute, type VerificationCaseSubmission } from '../../../services/verificationCaseService';
import { buildBoundEvidenceFormData, buildEvidenceStepUpBody, evidenceUploadFieldLimitMessage, formatEvidenceFileSize, formatEvidenceUploadError, isProfileEvidenceAvailable, isProfileEvidenceProcessing, profileEvidenceUploadLimitBytes, sha256File, validateEvidenceUpload, withEvidenceSupportReference, type BoundEvidenceMetadata } from '../../../utils/profileEvidenceUpload';
import { buildLandlordKycProgress } from '../../../utils/landlordKycProgress';
import { availableIndividualEvidence, identityRouteContractIssue, internationalIdentityUnavailable } from '../../../utils/individualKycEvidence';
import { latestProfileEvidence, mergeProfileEvidence, profileEvidenceFor } from '../../../utils/profileEvidenceVersions';
import { declaredVerificationPersonPaths, validateVerificationPersonRoutes } from '../../../utils/verificationCaseSubmission';
import { isUndescribedDeclaredPersonPath, onboardingDraftFieldDisplayValue, onboardingDraftFields, updateOnboardingDraftField } from '../../../utils/onboardingDraftFields';
import { isStaffKycProfile, isSupportedApplicantKycProfile } from '../../../utils/supportedKycProfile';

const formatStatus = (value?: string) => value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Not submitted';
const formatDate = (date?: string | null) => date ? new Date(date).toLocaleString('en-NG') : 'Not recorded';
const statusClass = (state: string) => ['available', 'approved'].includes(state) ? 'text-emerald-700' : ['rejected', 'expired', 'deleted'].includes(state) ? 'text-error' : 'text-amber-800';
const stepUpCodeCanRetryWithSameChallenge = (code?: string) => ['AUTH_FACTOR_CODE_INVALID', 'AUTH_FACTOR_RATE_LIMITED', 'AUTH_CHALLENGE_RATE_LIMITED'].includes(code ?? '');
const boundStepUpFailureCodes = new Set([
  'AUTH_FACTOR_REQUIRED', 'AUTH_CHALLENGE_INVALID', 'AUTH_CHALLENGE_FORBIDDEN', 'AUTH_CHALLENGE_REVOKED',
  'AUTH_FACTOR_CODE_INVALID', 'AUTH_FACTOR_RATE_LIMITED', 'AUTH_CHALLENGE_RATE_LIMITED',
  'AUTH_CHALLENGE_SCOPE_INVALID', 'AUTH_STEP_UP_REQUIRED',
]);
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
const formatDraftFieldName = (field: string) => field.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[._[\]]+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
const evidencePurposeLabel = (purpose: string) => ({ bvn: 'BVN', nin: 'NIN', additional_government_id: 'Additional government ID', proof_of_address: 'Proof of address' } as Record<string, string>)[purpose] ?? formatDraftFieldName(purpose);
type VerificationSection = 'draft' | 'evidence' | 'cases' | 'contract';
type VerificationSectionState<T> = Record<VerificationSection, T>;

const readErrorMessage = (raw: unknown, section: string) => {
  if (raw instanceof ApiRequestError && raw.code === 'FEATURE_IDENTITY_DOCUMENTS_UNCONFIGURED') return 'International KYC submission is unavailable because the accepted international identity document list has not been configured. Please contact support.';
  if (raw instanceof ApiRequestError && !raw.status && /timed out|unable to confirm a response/i.test(raw.message)) {
    return `${section} did not load before the request timed out. This was a read-only request; no KYC submission or change was made. Retry this section.`;
  }
  return raw instanceof Error ? raw.message : `Unable to load ${section.toLowerCase()}.`;
};
const isContactVerificationRequired = (code?: string) => code === 'AUTH_CONTACT_VERIFICATION_REQUIRED';

const LandlordVerification = () => {
  const { activeProfile, adminAccess, token, user } = useAuth();
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
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFromRequirement, setUploadFromRequirement] = useState(false);
  const [evidenceVersionConflict, setEvidenceVersionConflict] = useState<{ purpose: string; subject: string; latest: ProfileEvidence | null; refreshError?: boolean } | null>(null);
  const [evidenceToRemove, setEvidenceToRemove] = useState<ProfileEvidence | null>(null);
  const [personRoutes, setPersonRoutes] = useState<Record<string, { route: 'nigerian' | 'international' | ''; country: string }>>({});
  const [identityRoute, setIdentityRoute] = useState<'nigerian' | 'international' | ''>('');
  const [identityCountry, setIdentityCountry] = useState('');
  const [identityEvidence, setIdentityEvidence] = useState<Record<string, string>>({});
  const [caseSubmissionError, setCaseSubmissionError] = useState<string | null>(null);
  const [caseSubmissionFieldErrors, setCaseSubmissionFieldErrors] = useState<ApiFieldError[]>([]);
  const [contactVerificationRequired, setContactVerificationRequired] = useState(false);
  const caseOperationKeyRef = useRef<{ signature: string; key: string } | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{ challenge: BoundStepUpChallenge; file: File; metadata: BoundEvidenceMetadata; digest: string; profileId: string; token: string } | null>(null);
  const [pendingEvidenceAction, setPendingEvidenceAction] = useState<{ id: string; action: 'retry' | 'delete' } | null>(null);
  const operationKeyRef = useRef<{ signature: string; key: string } | null>(null);
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null);
  const withdrawStepUp = useBoundStepUp<VerificationCase>();
  const cancelWithdrawStepUp = withdrawStepUp.cancel;
  const createCaseStepUp = useBoundStepUp<VerificationCase>();
  const cancelCreateCaseStepUp = createCaseStepUp.cancel;
  const saveDraftStepUp = useBoundStepUp<ProfileOnboardingDraft>();
  const cancelSaveDraftStepUp = saveDraftStepUp.cancel;
  const evidenceStepUp = useBoundStepUp<ProfileEvidence>();
  const cancelEvidenceStepUp = evidenceStepUp.cancel;
  const profileId = activeProfile?.id;
  const profileScope = `${profileId ?? ''}:${token ?? ''}`;
  const previousProfileScope = useRef(profileScope);
  const currentProfileIdRef = useRef(profileId);
  const currentProfileScopeRef = useRef(profileScope);
  const activeProfileRef = useRef(activeProfile);
  const loadRequestRef = useRef(0);
  const sectionRequestRef = useRef<VerificationSectionState<number>>({ draft: 0, evidence: 0, cases: 0, contract: 0 });
  currentProfileIdRef.current = profileId;
  currentProfileScopeRef.current = profileScope;
  activeProfileRef.current = activeProfile;

  const clearSensitiveKycState = useCallback((message?: string) => {
    loadRequestRef.current += 1;
    sectionRequestRef.current = {
      draft: sectionRequestRef.current.draft + 1,
      evidence: sectionRequestRef.current.evidence + 1,
      cases: sectionRequestRef.current.cases + 1,
      contract: sectionRequestRef.current.contract + 1,
    };
    setFilePreview((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
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
    setPendingUpload(null);
    setPendingEvidenceAction(null);
    setUploadFile(null);
    setUploadPurpose('');
    setUploadSubject('');
    setUploadDocumentKind('');
    setUploadPreviousEvidenceId('');
    setUploadError(null);
    setUploadBusy(false);
    setUploadDialogOpen(false);
    setUploadFromRequirement(false);
    setEvidenceVersionConflict(null);
    setEvidenceToRemove(null);
    setBusy(false);
    setLoading(false);
    setSectionLoading({ draft: false, evidence: false, cases: false, contract: false });
    setSectionErrors({ draft: null, evidence: null, cases: null, contract: null });
    setCaseSubmissionError(null); setCaseSubmissionFieldErrors([]);
    setPersonRoutes({});
    setIdentityRoute('');
    setIdentityCountry('');
    setIdentityEvidence({});
    setContactVerificationRequired(false);
    operationKeyRef.current = null;
    caseOperationKeyRef.current = null;
    cancelWithdrawStepUp();
    cancelCreateCaseStepUp();
    cancelSaveDraftStepUp();
    cancelEvidenceStepUp();
    if (message) setError(message);
  }, [cancelCreateCaseStepUp, cancelEvidenceStepUp, cancelSaveDraftStepUp, cancelWithdrawStepUp]);

  const handleKycAuthorizationError = useCallback((raw: unknown, section: VerificationSection, label?: string) => {
    if (raw instanceof ApiRequestError && (raw.status === 401 || raw.status === 403)) {
      clearSensitiveKycState(`${raw.message} Verification information was cleared. Confirm the selected profile and access, then refresh.`);
      return true;
    }
    const sectionLabel = label ?? ({ draft: 'Profile setup draft', evidence: 'Private evidence', cases: 'Verification cases', contract: 'Evidence requirements' }[section]);
    setSectionErrors((current) => ({ ...current, [section]: readErrorMessage(raw, sectionLabel) }));
    return false;
  }, [clearSensitiveKycState]);

  const handleKycMutationGate = useCallback((code?: string) => {
    if (isContactVerificationRequired(code)) {
      setContactVerificationRequired(true);
      return false;
    }
    if (['AUTH_REQUIRED', 'AUTH_SESSION_REVOKED', 'AUTH_PROFILE_FORBIDDEN', 'PERMISSION_REQUIRED', 'PERMISSION_PROFILE_REQUIRED', 'PERMISSION_PROFILE_FORBIDDEN'].includes(code ?? '')) {
      clearSensitiveKycState('Your session or selected-profile access is no longer valid. Verification information was cleared; sign in again or select an authorized profile.');
      return true;
    }
    return false;
  }, [clearSensitiveKycState]);

  useEffect(() => {
    if (previousProfileScope.current !== profileScope) {
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
      setFilePreview((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return null;
      });
      setBusy(false);
      setLoading(false);
      setUploadPreviousEvidenceId('');
      setError(null);
      setSectionLoading({ draft: false, evidence: false, cases: false, contract: false });
      setSectionErrors({ draft: null, evidence: null, cases: null, contract: null });
      setCaseSubmissionError(null); setCaseSubmissionFieldErrors([]);
      setContactVerificationRequired(false);
      setUploadFile(null);
      setUploadPurpose('');
      setUploadSubject('');
      setUploadDocumentKind('');
      setUploadDialogOpen(false);
      setUploadFromRequirement(false);
      setEvidenceVersionConflict(null);
      setEvidenceToRemove(null);
      setPersonRoutes({});
      setIdentityRoute('');
      setIdentityCountry('');
      setIdentityEvidence({});
      caseOperationKeyRef.current = null;
      cancelCreateCaseStepUp();
      cancelSaveDraftStepUp();
      cancelWithdrawStepUp();
      cancelEvidenceStepUp();
      setUploadError('The active profile or session changed. Verification data and security challenges were cleared. Select a file again for this profile.');
      previousProfileScope.current = profileScope;
    }
  }, [profileScope, profileId, cancelCreateCaseStepUp, cancelEvidenceStepUp, cancelSaveDraftStepUp, cancelWithdrawStepUp]);

  const load = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    const requestedProfileId = profileId;
    const requestedProfileScope = profileScope;
    const requestedProfile = activeProfileRef.current;
    if (!requestedProfileId) {
      clearSensitiveKycState();
      setSectionLoading({ draft: false, evidence: false, cases: false, contract: false });
      setSectionErrors({ draft: null, evidence: null, cases: null, contract: null });
      setError('Select an authorized profile to view verification.');
      return;
    }

    if (requestedProfile && !isSupportedApplicantKycProfile(requestedProfile.kind, requestedProfile.structure)) {
      cancelCreateCaseStepUp();
      cancelSaveDraftStepUp();
      cancelWithdrawStepUp();
      cancelEvidenceStepUp();
      operationKeyRef.current = null;
      caseOperationKeyRef.current = null;
      setProfile(requestedProfile);
      setOnboardingDraft(null);
      setDraftValuesText('');
      setContract(null);
      setEvidence([]);
      setEvidenceCursor(null);
      setCases([]);
      setCaseCursor(null);
      setSelectedEvidence(null);
      setSelectedCase(null);
      setHistory(null);
      setPendingUpload(null);
      setPendingEvidenceAction(null);
      setUploadFile(null);
      setContactVerificationRequired(false);
      setFilePreview((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return null;
      });
      setLoadedProfileId(requestedProfileId);
      setLoading(false);
      setError(null);
      setSectionLoading({ draft: false, evidence: false, cases: false, contract: false });
      setSectionErrors({ draft: null, evidence: null, cases: null, contract: null });
      return;
    }

    const isCurrentRequest = () => requestId === loadRequestRef.current && currentProfileIdRef.current === requestedProfileId && currentProfileScopeRef.current === requestedProfileScope;
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
        if (requestedProfile && (current.profile.kind !== requestedProfile.kind || current.profile.structure !== requestedProfile.structure)) {
          clearSensitiveKycState('The server profile type does not match the selected profile. Verification data was cleared; refresh your profile list before continuing.');
          return;
        }
        setProfile(current.profile);
        setLoadedProfileId(requestedProfileId);
      })
      .catch((raw: unknown) => {
        if (!isCurrentRequest()) return;
        if (raw instanceof ApiRequestError && (raw.status === 401 || raw.status === 403)) clearSensitiveKycState(`${raw.message} Verification information was cleared. Confirm the selected profile and access, then refresh.`);
        else setError(readErrorMessage(raw, 'Profile details'));
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
        if (requestedProfile && (draft.kind !== requestedProfile.kind || draft.structure !== requestedProfile.structure)) {
          setSectionError('draft', 'The onboarding draft type does not match the selected profile. Refresh before editing or submitting.');
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
      .catch((raw: unknown) => {
        if (isCurrentRequest()) handleKycAuthorizationError(raw, 'draft');
      })
      .finally(() => markSectionLoading('draft', false));

    const evidenceRequest = verificationCaseService.listAllEvidence(() => isSectionRequestCurrent('evidence'))
      .then((records) => {
        if (!isSectionRequestCurrent('evidence')) return;
        setEvidence(profileEvidenceFor(records, requestedProfileId));
        setEvidenceCursor(null);
        setLoadedProfileId(requestedProfileId);
        setSectionError('evidence', null);
      })
      .catch((raw: unknown) => {
        if (isCurrentRequest()) handleKycAuthorizationError(raw, 'evidence');
      })
      .finally(() => markSectionLoading('evidence', false));

    const casesRequest = verificationCaseService.listHolderCases({ limit: 25 })
      .then((page) => {
        if (!isSectionRequestCurrent('cases')) return;
        setCases(page.cases);
        setCaseCursor(page.nextCursor);
        setLoadedProfileId(requestedProfileId);
        setSectionError('cases', null);
      })
      .catch((raw: unknown) => {
        if (isCurrentRequest()) handleKycAuthorizationError(raw, 'cases');
      })
      .finally(() => markSectionLoading('cases', false));

    const contractRequest = verificationCaseService.getEvidenceContract()
      .then((evidenceContract) => {
        if (!isSectionRequestCurrent('contract')) return;
        setContract(evidenceContract);
        setLoadedProfileId(requestedProfileId);
        setSectionError('contract', null);
      })
      .catch((raw: unknown) => {
        if (isCurrentRequest()) handleKycAuthorizationError(raw, 'contract');
      })
      .finally(() => markSectionLoading('contract', false));

    void Promise.allSettled([profileRequest, draftRequest, evidenceRequest, casesRequest, contractRequest]);
  }, [cancelCreateCaseStepUp, cancelEvidenceStepUp, cancelSaveDraftStepUp, cancelWithdrawStepUp, clearSensitiveKycState, handleKycAuthorizationError, profileId, profileScope]);

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
        const records = await verificationCaseService.listAllEvidence(isCurrentRequest);
        if (!isCurrentRequest()) return;
        setEvidence(profileEvidenceFor(records, requestedProfileId)); setEvidenceCursor(null);
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
      if (isCurrentRequest()) handleKycAuthorizationError(raw, section);
    } finally {
      if (isCurrentRequest()) setSectionLoading((current) => ({ ...current, [section]: false }));
    }
  }, [handleKycAuthorizationError, profileId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview.url); }, [filePreview]);

  const availableEvidenceCount = useMemo(() => evidence.filter((item) => isProfileEvidenceAvailable(item.state)).length, [evidence]);
  const missingDraftFields = useMemo(() => draftMissingFields(onboardingDraft?.readiness), [onboardingDraft?.readiness]);
  const kycProgress = useMemo(() => buildLandlordKycProgress({
    verificationStatus: profile?.verification?.status,
    cases,
    availableEvidenceCount,
    hasOnboardingDraft: Boolean(onboardingDraft),
    intakeMissingCount: missingDraftFields.length,
    intakeMissingFields: missingDraftFields.map(formatDraftFieldName),
  }), [availableEvidenceCount, cases, missingDraftFields, onboardingDraft, profile?.verification?.status]);
  const profileDataCurrent = Boolean(profileId && loadedProfileId === profileId);
  const pendingEvidenceIds = useMemo(() => evidence.filter((item) => isProfileEvidenceProcessing(item.state)).map((item) => item.id).join(','), [evidence]);

  useEffect(() => {
    if (!profileId) return;
    setIdentityEvidence((current) => {
      let changed = false;
      const next = { ...current };
      Object.entries(current).forEach(([purpose, evidenceId]) => {
        const latest = latestProfileEvidence(evidence, profileId, purpose, 'self');
        if (!latest || latest.id !== evidenceId || latest.state !== 'available') {
          delete next[purpose];
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [evidence, profileId]);

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
    try { const page = await verificationCaseService.listEvidence({ limit: 100, before: evidenceCursor }); if (currentProfileIdRef.current !== requestedProfileId) return; setEvidence((current) => mergeProfileEvidence(current, profileEvidenceFor(page.evidence, requestedProfileId ?? ''))); setEvidenceCursor(page.nextCursor); }
    catch (raw) { if (currentProfileIdRef.current === requestedProfileId) handleKycAuthorizationError(raw, 'evidence', 'More private evidence'); }
    finally { if (currentProfileIdRef.current === requestedProfileId) setBusy(false); }
  };

  const loadMoreCases = async () => {
    if (!caseCursor) return;
    const requestedProfileId = profileId;
    setBusy(true);
    setSectionErrors((current) => ({ ...current, cases: null }));
    try { const page = await verificationCaseService.listHolderCases({ limit: 25, before: caseCursor }); if (currentProfileIdRef.current !== requestedProfileId) return; setCases((current) => [...current, ...page.cases]); setCaseCursor(page.nextCursor); }
    catch (raw) { if (currentProfileIdRef.current === requestedProfileId) handleKycAuthorizationError(raw, 'cases', 'More verification cases'); }
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
    } catch (raw) {
      if (currentProfileIdRef.current === requestedProfileId) {
        if (raw instanceof ApiRequestError && (raw.status === 401 || raw.status === 403)) handleKycAuthorizationError(raw, 'evidence', 'Private evidence file');
        else setError(readErrorMessage(raw, 'Private evidence file'));
      }
    }
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
    } catch (raw) {
      if (currentProfileIdRef.current === requestedProfileId) {
        if (raw instanceof ApiRequestError && (raw.status === 401 || raw.status === 403)) handleKycAuthorizationError(raw, 'cases', 'Verification case details');
        else setError(readErrorMessage(raw, 'Verification case details'));
      }
    }
    finally { if (currentProfileIdRef.current === requestedProfileId) setBusy(false); }
  };

  const beginEvidenceAction = async (item: ProfileEvidence, action: 'retry' | 'delete') => {
    if (action === 'retry' && item.state !== 'retry') return;
    if (action === 'delete' && ['deleting', 'privacy_deleting', 'deleted'].includes(item.state)) return;
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
      if (handleKycMutationGate(result.code)) return false;
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
      if (handleKycMutationGate(result.code)) return false;
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
    const documentKind = uploadDocumentKind || (allowedKinds.length ? '' : undefined);
    const signature = [uploadFile.name, uploadFile.size, uploadFile.type, uploadFile.lastModified, uploadPurpose, uploadSubject, documentKind ?? '', uploadPreviousEvidenceId].join('|');
    const operationKey = operationKeyRef.current?.signature === signature ? operationKeyRef.current.key : crypto.randomUUID();
    operationKeyRef.current = { signature, key: operationKey };
    const metadata: BoundEvidenceMetadata = {
      purpose: uploadPurpose,
      subject: uploadSubject,
      operationKey,
      ...(documentKind ? { documentKind } : {}),
      ...(uploadPreviousEvidenceId ? { previousEvidenceId: uploadPreviousEvidenceId } : {}),
    };
    const profileLabel = activeProfile
      ? `${activeProfile.name} (${activeProfile.kind}${activeProfile.structure ? ` · ${activeProfile.structure}` : ''})`
      : 'Selected profile';
    const fieldLimitMessage = evidenceUploadFieldLimitMessage(metadata, profileLabel);
    if (fieldLimitMessage) { setUploadError(fieldLimitMessage); return; }
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
      if (created.profileId !== pending.profileId || created.purpose !== pending.metadata.purpose || created.subject !== pending.metadata.subject) {
        setPendingUpload(null);
        setUploadError('The server response did not match the selected profile and evidence details. Refresh the evidence list before continuing.');
        try {
          const records = await verificationCaseService.listAllEvidence(() => currentProfileScopeRef.current === `${pending.profileId}:${pending.token}`);
          if (currentProfileIdRef.current === pending.profileId && currentProfileScopeRef.current === `${pending.profileId}:${pending.token}`) setEvidence(profileEvidenceFor(records, pending.profileId));
        } catch { /* Keep the safe contract mismatch visible for manual refresh. */ }
        return false;
      }
      setEvidence((current) => mergeProfileEvidence(current, [created]));
      if (created.subject === 'self') {
        setIdentityEvidence((current) => {
          const next = { ...current };
          delete next[created.purpose];
          if (created.state === 'available') next[created.purpose] = created.id;
          return next;
        });
      }
      setUploadFile(null);
      setUploadPurpose('');
      setUploadSubject('');
      setUploadDocumentKind('');
      setUploadPreviousEvidenceId('');
      setUploadError(null);
      if (uploadFileInputRef.current) uploadFileInputRef.current.value = '';
      operationKeyRef.current = null;
      setUploadDialogOpen(false);
      setUploadFromRequirement(false);
      toast.success(created.state === 'available'
        ? 'Private evidence uploaded successfully and is available for selection. KYC approval is a separate step.'
        : `Private evidence upload accepted. Current file state: ${formatStatus(created.state)}. KYC approval is a separate step.`);
      await load();
      return true;
    } catch (raw) {
      if (currentProfileIdRef.current !== pending.profileId) return false;
      const codeValue = raw instanceof ApiRequestError ? raw.code : undefined;
      if (handleKycMutationGate(codeValue)) return false;
      if (raw instanceof ApiRequestError && (raw.status === 401 || raw.status === 403) && codeValue !== 'AUTH_CONTACT_VERIFICATION_REQUIRED' && !boundStepUpFailureCodes.has(codeValue ?? '')) {
        clearSensitiveKycState(`${raw.message} Verification information was cleared. Confirm the selected profile and access, then refresh.`);
        return false;
      }
      if (codeValue && boundStepUpFailureCodes.has(codeValue)) {
        if (!stepUpCodeCanRetryWithSameChallenge(codeValue)) setPendingUpload(null);
        const message = codeValue === 'AUTH_STEP_UP_REQUIRED'
          ? 'Security confirmation did not match this exact file and its details. Start a fresh authenticator challenge for the selected file.'
          : stepUpErrorMessage(raw);
        setUploadError(withEvidenceSupportReference(message, raw));
      } else if (codeValue === 'CONFLICT_EVIDENCE_VERSION') {
        setPendingUpload(null);
        operationKeyRef.current = null;
        try {
          const expectedScope = `${pending.profileId}:${pending.token}`;
          const records = await verificationCaseService.listAllEvidence(() => currentProfileIdRef.current === pending.profileId && currentProfileScopeRef.current === expectedScope);
          if (currentProfileIdRef.current !== pending.profileId) return false;
          setEvidence(profileEvidenceFor(records, pending.profileId));
          setEvidenceCursor(null);
          const latest = latestProfileEvidence(records, pending.profileId, pending.metadata.purpose, pending.metadata.subject);
          setUploadPreviousEvidenceId(latest?.id ?? '');
          setEvidenceVersionConflict({ purpose: pending.metadata.purpose, subject: pending.metadata.subject, latest });
          setUploadError(withEvidenceSupportReference('Evidence history changed before the upload. Review the latest record and confirm it before starting a new upload challenge.', raw));
        } catch {
          setEvidenceVersionConflict({ purpose: pending.metadata.purpose, subject: pending.metadata.subject, latest: null, refreshError: true });
          setUploadError(withEvidenceSupportReference('The evidence history changed, but the current version could not be refreshed. Retry the evidence list before replacing this file.', raw));
        }
      } else if (codeValue === 'CONFLICT_EVIDENCE_OPERATION') {
        setPendingUpload(null);
        operationKeyRef.current = null;
        setUploadError(formatEvidenceUploadError(raw, contract));
      } else if (codeValue === 'CONFLICT_EVIDENCE_STATE') {
        setPendingUpload(null);
        try {
          const expectedScope = `${pending.profileId}:${pending.token}`;
          const records = await verificationCaseService.listAllEvidence(() => currentProfileIdRef.current === pending.profileId && currentProfileScopeRef.current === expectedScope);
          if (currentProfileIdRef.current !== pending.profileId) return false;
          setEvidence(profileEvidenceFor(records, pending.profileId));
          setEvidenceCursor(null);
        } catch { /* Keep the state conflict visible and allow a manual evidence refresh. */ }
        setUploadError(formatEvidenceUploadError(raw, contract));
      } else if (codeValue === 'CONFLICT_ONBOARDING_VERSION') {
        setPendingUpload(null);
        setUploadError(withEvidenceSupportReference(raw instanceof ApiRequestError ? raw.message : 'The profile draft changed. Review the latest draft before continuing.', raw));
        await refreshDraftAfterConflict(pending.profileId, 'The onboarding draft changed while evidence was being uploaded. Review the latest saved draft before continuing.');
      } else {
        setPendingUpload(null);
        if (raw instanceof ApiRequestError && raw.status === 409) {
          try {
            const expectedScope = `${pending.profileId}:${pending.token}`;
            const records = await verificationCaseService.listAllEvidence(() => currentProfileIdRef.current === pending.profileId && currentProfileScopeRef.current === expectedScope);
            if (currentProfileIdRef.current === pending.profileId) { setEvidence(profileEvidenceFor(records, pending.profileId)); setEvidenceCursor(null); }
          } catch { /* Preserve the original safe error and allow a manual refresh. */ }
        }
        setUploadError(raw instanceof ApiRequestError && (raw.code || raw.status)
          ? formatEvidenceUploadError(raw, contract)
          : withEvidenceSupportReference('The upload result could not be confirmed. Retry only with the same file and details; the same operation key will be reused.', raw));
      }
      return false;
    } finally { setUploadBusy(false); }
  };

  const openUploadDialog = (purpose = '') => {
    setUploadFromRequirement(Boolean(purpose));
    setUploadPurpose(purpose);
    setUploadSubject(purpose ? 'self' : '');
    setUploadDocumentKind(purpose && contract?.documentKinds[purpose]?.length === 1 ? contract.documentKinds[purpose][0] : '');
    setUploadPreviousEvidenceId(purpose && profileId
      ? latestProfileEvidence(evidence, profileId, purpose, 'self')?.id ?? ''
      : '');
    setUploadFile(null);
    setUploadError(null);
    setEvidenceVersionConflict(null);
    setPendingUpload(null);
    operationKeyRef.current = null;
    if (uploadFileInputRef.current) uploadFileInputRef.current.value = '';
    setUploadDialogOpen(true);
  };

  const retryEvidenceConflictRefresh = async () => {
    const conflict = evidenceVersionConflict;
    const requestedProfileId = profileId;
    const requestedScope = profileScope;
    if (!conflict || !requestedProfileId) return;
    setSectionLoading((current) => ({ ...current, evidence: true }));
    try {
      const records = await verificationCaseService.listAllEvidence(() => currentProfileScopeRef.current === requestedScope);
      if (currentProfileIdRef.current !== requestedProfileId || currentProfileScopeRef.current !== requestedScope) return;
      const latest = latestProfileEvidence(records, requestedProfileId, conflict.purpose, conflict.subject);
      setEvidence(profileEvidenceFor(records, requestedProfileId));
      setEvidenceCursor(null);
      setUploadPreviousEvidenceId(latest?.id ?? '');
      setEvidenceVersionConflict({ ...conflict, latest, refreshError: false });
      setUploadError('Evidence history refreshed. Review and confirm the current version before starting a new upload challenge.');
    } catch {
      if (currentProfileScopeRef.current === requestedScope) setUploadError('Evidence history still could not be refreshed. Retry the evidence list before replacing this file.');
    } finally {
      if (currentProfileScopeRef.current === requestedScope) setSectionLoading((current) => ({ ...current, evidence: false }));
    }
  };

  const declaredPersonPaths = useMemo(
    () => onboardingDraft ? declaredVerificationPersonPaths(onboardingDraft.values) : [],
    [onboardingDraft],
  );

  const parsedDraftValues = useMemo(() => parseDraftValues(draftValuesText), [draftValuesText]);
  const draftValuesDirty = Boolean(onboardingDraft && (
    !parsedDraftValues.values || JSON.stringify(parsedDraftValues.values) !== JSON.stringify(onboardingDraft.values)
  ));
  const profileDetailsReady = Boolean(onboardingDraft && !draftValuesDirty && !missingDraftFields.length && !draftSavePending);
  const latestUploadEvidence = useMemo(
    () => profileId && uploadPurpose && uploadSubject ? latestProfileEvidence(evidence, profileId, uploadPurpose, uploadSubject) : null,
    [evidence, profileId, uploadPurpose, uploadSubject],
  );
  const draftFields = useMemo(
    () => onboardingDraftFields(parsedDraftValues.values ?? onboardingDraft?.values ?? {}, missingDraftFields),
    [missingDraftFields, onboardingDraft?.values, parsedDraftValues.values],
  );
  const undescribedPersonFields = useMemo(() => missingDraftFields.filter((path) => isUndescribedDeclaredPersonPath(path, onboardingDraft?.values ?? {})), [missingDraftFields, onboardingDraft?.values]);
  const protectedCaseSubmissionLocked = createCaseStepUp.busy || Boolean(createCaseStepUp.challenge);
  const internationalSubmissionError = identityRoute
    ? identityRouteContractIssue(contract, identityRoute)
    : Object.values(personRoutes).some((person) => person.route === 'international')
      ? internationalIdentityUnavailable(contract)
      : null;
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
      if (handleKycMutationGate(result.code)) return false;
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
    setCaseSubmissionFieldErrors([]);
    if (internationalSubmissionError) { setCaseSubmissionError(internationalSubmissionError); return; }
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
    if (isIndividual && identityRoute) {
      const routeIssue = identityRouteContractIssue(contract, identityRoute);
      if (routeIssue) { setCaseSubmissionError(routeIssue); return; }
    }
    if (isIndividual && !requiredIdentityPurposes.length) { setCaseSubmissionError('The identity evidence requirements are unavailable. Refresh the requirements before submitting.'); return; }
    if (isIndividual && !/^[A-Z]{2}$/.test(identityCountry.trim().toUpperCase())) { setCaseSubmissionError('Enter a two-letter identity country code.'); return; }
    if (isIndividual && identityRoute === 'nigerian' && identityCountry.trim().toUpperCase() !== 'NG') { setCaseSubmissionError('The Nigerian identity route requires country NG.'); return; }
    const identityItems = requiredIdentityPurposes.map((purpose) => ({ purpose, evidenceId: identityEvidence[purpose] ?? '' }));
    const missingIdentityPurposes = identityItems.filter((item) => !availableIndividualEvidence(evidence, profileId, item.purpose).some((record) => record.id === item.evidenceId));
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
    setCaseSubmissionError(null); setCaseSubmissionFieldErrors([]);
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
      if (handleKycMutationGate(result.code)) return false;
      setCaseSubmissionFieldErrors(result.fieldErrors ?? []);
      if (!stepUpCodeCanRetryWithSameChallenge(result.code)) {
        setCaseSubmissionError(result.code === 'FEATURE_IDENTITY_DOCUMENTS_UNCONFIGURED'
          ? 'International KYC submission is unavailable because the accepted international identity document list has not been configured. Please contact support.'
          : result.error ?? 'The verification submission could not be confirmed. Review the latest case and draft status before retrying.');
        if (currentProfileIdRef.current === requestedProfileId) {
          if (result.code === 'CONFLICT_ONBOARDING_VERSION' && requestedProfileId) {
            await refreshDraftAfterConflict(requestedProfileId, 'The onboarding draft changed before submission. Review the latest saved version; the case was not submitted against a stale draft.');
          }
          await retrySection('cases');
        }
      }
      return false;
    }
    if (currentProfileIdRef.current !== requestedProfileId) return false;
    caseOperationKeyRef.current = null;
    setCaseSubmissionError(null); setCaseSubmissionFieldErrors([]);
    setCases((current) => [result.value, ...current.filter((item) => item.id !== result.value.id)]);
    toast.success('Verification case submitted. Its status remains pending until an authorized reviewer decides it.');
    await load();
    await openCase(result.value);
    return true;
  };

  const selectedProfileKind = profile?.kind ?? activeProfile?.kind;
  const selectedProfileStructure = profile?.structure ?? activeProfile?.structure;
  const supportedApplicantProfile = Boolean(selectedProfileKind && selectedProfileStructure && isSupportedApplicantKycProfile(selectedProfileKind, selectedProfileStructure));
  const isStaffProfile = isStaffKycProfile(selectedProfileKind ?? '');
  const canOpenStaffReview = Boolean(
    adminAccess?.profileId === profileId &&
    hasAdminCapability(adminAccess, 'verification.read'),
  );
  const settingsPath = selectedProfileKind === 'owner'
    ? '/dashboard/landlord/settings'
    : selectedProfileKind === 'buyer'
      ? '/dashboard/buyer/profile-settings'
      : user?.role === 'proxy_inspector'
        ? '/account/security'
        : '/dashboard/buyer/profile-settings';

  if (profileDataCurrent && profile && !supportedApplicantProfile) {
    const unsupportedContent = <main className="mx-auto max-w-4xl space-y-6 p-6 sm:p-8 lg:p-12">
      <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Profile compliance</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-primary">KYC &amp; verification</h1></header>
      <section className="rounded-2xl border border-outline-variant/10 bg-white p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-secondary">Selected profile</p>
        <h2 className="mt-2 text-2xl font-extrabold">{profile.name}</h2>
        <p className="mt-2 text-sm text-secondary">{formatStatus(profile.kind)} · {formatStatus(profile.structure)}</p>
        {isStaffProfile ? <>
          <p className="mt-5 text-sm">Staff profiles do not submit applicant KYC. Authorized reviewers use the Admin Console review queue.</p>
          {canOpenStaffReview ? <Link className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary" to="/dashboard/admin/kyc">Open KYC review</Link> : <p role="status" className="mt-4 text-sm text-secondary">This staff profile has no current KYC review capability.</p>}
        </> : <p role="status" className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-950">An applicant KYC form is not available for this profile type. Use a profile type and structure supported by the verification service; no applicant data was requested or submitted.</p>}
      </section>
    </main>;
    if (isStaffProfile && user?.role === 'admin') return <AdminLayout>{unsupportedContent}</AdminLayout>;
    if (profile.kind === 'owner') return <LandlordPortalLayout active="verification" title="KYC & Verification">{unsupportedContent}</LandlordPortalLayout>;
    return <BuyerPortalLayout pageTitle="KYC & Verification" pageSubtitle="KYC applies to the selected profile type." pageEyebrow={`${formatStatus(profile.kind)} · ${formatStatus(profile.structure)}`}>{unsupportedContent}</BuyerPortalLayout>;
  }

  const pageContent = (
      <main className="mx-auto max-w-6xl space-y-8 p-6 sm:p-8 lg:p-12">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Profile compliance</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">KYC &amp; verification</h1>
            <p className="mt-2 max-w-2xl text-sm text-secondary">This flow applies to the selected {formatStatus(selectedProfileKind)} · {formatStatus(selectedProfileStructure)} profile. Save your details, add required private evidence, submit for review, and track the decision here.</p>
          </div>
          <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={loading || draftValuesDirty || draftSavePending} onClick={() => void load()}>Refresh</Button><Link to={settingsPath} className="inline-flex items-center rounded-lg bg-surface-container-high px-4 py-2 text-sm font-semibold">Account settings</Link></div>
        </header>
        {contactVerificationRequired ? <section role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><h2 className="font-bold">Verify your email and phone to continue</h2><p className="mt-1">The server requires both contact methods to be verified before this KYC action can proceed. No KYC change was completed.</p><Link className="mt-3 inline-flex font-semibold underline" to={settingsPath}>Open account security settings</Link></section> : null}
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
        {profileDataCurrent ? <section aria-label="Prepare KYC application" className="rounded-2xl border border-outline-variant/10 bg-white p-4 sm:p-6">
            <div id="kyc-case-submission" className="mt-5 scroll-mt-6 rounded-lg border border-outline-variant/10 bg-surface-container-low p-4">
              <h2 className="text-xl font-extrabold">Prepare your KYC application</h2>
              <p className="mt-1 text-sm text-secondary">Start with your profile details and save them with your authenticator. Then choose your identity route, upload each required document here, and submit for review.</p>
              {!onboardingDraft ? sectionErrors.draft ? <div role="alert" className="mt-2 text-sm text-error"><p>{sectionErrors.draft}</p><Button type="button" variant="secondary" className="mt-2" disabled={sectionLoading.draft} onClick={() => void retrySection('draft')}>Retry profile draft</Button></div> : <p role="status" className="mt-2 text-sm text-amber-900">{sectionLoading.draft ? 'Loading profile…' : 'Profile details are unavailable. Refresh before submission.'}</p> : null}
              {onboardingDraft ? <div id="kyc-profile-draft" tabIndex={-1} className="mt-3 scroll-mt-6 rounded-lg bg-white p-3">
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
                {undescribedPersonFields.length ? <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">The draft requires declared-person details for {undescribedPersonFields.map(formatDraftFieldName).join(', ')}, but the frontend handoff does not define the person-row fields needed to add them. Refresh the draft or contact support; verification submission will remain blocked until these required fields are complete.</p> : null}
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
              <div className="mt-6 border-t border-outline-variant/20 pt-4"><h3 className="font-bold">2. Add your identity documents</h3><p className="mt-1 text-sm text-secondary">Choose your identity route. Each required document has its own upload button; after upload it is selected here automatically when available.</p>{!profileDetailsReady ? <p role="status" className="mt-2 text-sm font-semibold text-amber-900">Complete and save your profile details above to continue.</p> : null}</div>
              {declaredPersonPaths.map((path) => <div key={path} className="mt-3 grid gap-3 rounded-lg bg-white p-3 sm:grid-cols-2">
                <p className="break-all text-sm font-semibold sm:col-span-2">Declared person: <code>{path}</code></p>
                <label className="text-xs font-bold">Identity route<select disabled={protectedCaseSubmissionLocked} className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={personRoutes[path]?.route ?? ''} onChange={(event) => setPersonRoutes((current) => ({ ...current, [path]: { route: event.target.value as 'nigerian' | 'international' | '', country: current[path]?.country ?? '' } }))}><option value="">Choose route</option><option value="nigerian">Nigerian</option><option value="international">International</option></select></label>
                <label className="text-xs font-bold">Country code<input disabled={protectedCaseSubmissionLocked} className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal uppercase" maxLength={2} value={personRoutes[path]?.country ?? ''} onChange={(event) => setPersonRoutes((current) => ({ ...current, [path]: { route: current[path]?.route ?? '', country: event.target.value.toUpperCase() } }))} placeholder="NG" /></label>
              </div>)}
              {onboardingDraft?.structure === 'individual' ? <div className="mt-3 grid gap-3 rounded-lg bg-white p-3 sm:grid-cols-2">
                <label className="text-xs font-bold">Individual identity route<select disabled={protectedCaseSubmissionLocked || !profileDetailsReady} className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={identityRoute} onChange={(event) => { setIdentityRoute(event.target.value as 'nigerian' | 'international' | ''); setIdentityEvidence({}); }}><option value="">Choose configured route</option>{(['nigerian', 'international'] as const).filter((route) => Object.prototype.hasOwnProperty.call(contract?.individualRoutes ?? {}, route)).map((route) => <option key={route} value={route}>{route === 'nigerian' ? 'Nigerian' : 'International'}</option>)}</select></label>
                <label className="text-xs font-bold">Identity country<input disabled={protectedCaseSubmissionLocked || !profileDetailsReady} className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal uppercase" maxLength={2} value={identityCountry} onChange={(event) => setIdentityCountry(event.target.value.toUpperCase())} placeholder="NG" /></label>
                {(identityRoute ? contract?.individualRoutes[identityRoute] ?? [] : []).map((purpose) => {
                  const latestPurposeEvidence = profileId ? latestProfileEvidence(evidence, profileId, purpose, 'self') : null;
                  const availablePurposeEvidence = availableIndividualEvidence(evidence, profileId ?? '', purpose);

                  if (availablePurposeEvidence.length) {
                    return <label key={purpose} className="text-xs font-bold">Evidence for {purpose.replaceAll('_', ' ')}<select disabled={protectedCaseSubmissionLocked} className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={identityEvidence[purpose] ?? ''} onChange={(event) => setIdentityEvidence((current) => ({ ...current, [purpose]: event.target.value }))}><option value="">Choose available private evidence</option>{availablePurposeEvidence.map((item) => <option key={item.id} value={item.id}>{item.documentKind.replaceAll('_', ' ')} · v{item.version} · {item.id}</option>)}</select></label>;
                  }

                  const purposeLabel = evidencePurposeLabel(purpose);
                  const latestState = latestPurposeEvidence?.state;
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
                    <p className="font-semibold">{purposeLabel} evidence required</p>
                    <p className="mt-1">{unavailableMessage}</p>
                    {sectionErrors.evidence ? <Button type="button" variant="secondary" className="mt-2" disabled={sectionLoading.evidence} onClick={() => void retrySection('evidence')}>Retry private evidence</Button> : null}
                    {!sectionErrors.evidence && evidenceCursor ? <Button type="button" variant="secondary" className="mt-2" disabled={busy || sectionLoading.evidence} onClick={() => void loadMoreEvidence()}>Load older evidence</Button> : null}
                    {!sectionLoading.evidence && !sectionErrors.evidence && !latestState ? <Button type="button" variant="secondary" className="mt-2" disabled={!profileDetailsReady} onClick={() => openUploadDialog(purpose)}>Upload {purposeLabel} evidence</Button> : null}
                    {latestState ? <div className="mt-2 flex flex-wrap items-center gap-3"><a className="font-semibold underline" href="#kyc-case-list">View evidence status</a>{!['validating', 'activation_pending', 'deleting', 'privacy_deleting'].includes(latestState) ? <Button type="button" variant="secondary" disabled={!profileDetailsReady} onClick={() => openUploadDialog(purpose)}>Upload a new version</Button> : null}</div> : null}
                  </div>;
                })}
                {contract?.policies.acceptedIdentity?.state !== 'configured' ? <p role="status" className="text-sm text-amber-900 sm:col-span-2">Identity verification policy is {formatStatus(contract?.policies.acceptedIdentity?.state)}. The server will not accept identity evidence until its policy is configured.</p> : null}
              </div> : null}
              {internationalSubmissionError ? <p role="status" className="mt-3 text-sm text-amber-900">{internationalSubmissionError}</p> : null}
              {caseSubmissionFieldErrors.length ? <ul role="alert" className="mt-3 list-disc pl-5 text-sm text-error">{caseSubmissionFieldErrors.map((item, index) => <li key={`${item.path ?? 'field'}-${index}`}>{item.path ? `${formatDraftFieldName(item.path)}: ` : ''}{item.msg ?? 'Check this value.'}</li>)}</ul> : null}
              {caseSubmissionError || createCaseStepUp.error ? <p role="alert" className="mt-3 text-sm text-error">{caseSubmissionError ?? createCaseStepUp.error}</p> : null}
              <div className="mt-5 border-t border-outline-variant/20 pt-4"><h3 className="font-bold">3. Submit for review</h3><p className="mt-1 text-sm text-secondary">Your saved profile and selected documents are sent for a separate KYC decision.</p>
              {draftValuesDirty ? <p role="status" className="mt-2 text-sm text-amber-900">Save the changes above with your authenticator before submitting.</p> : null}
              <Button type="button" className="mt-3" disabled={Boolean(internationalSubmissionError) || !onboardingDraft || busy || draftValuesDirty || missingDraftFields.length > 0 || draftSavePending || saveDraftStepUp.busy || Boolean(saveDraftStepUp.challenge) || Boolean(draftConflict && !draftConflictReviewed) || createCaseStepUp.busy || Boolean(createCaseStepUp.challenge) || (onboardingDraft.structure === 'individual' && contract?.policies.acceptedIdentity?.state !== 'configured')} onClick={() => void beginCaseSubmission()}>{createCaseStepUp.busy ? 'Preparing secure submission…' : 'Submit saved draft for verification'}</Button></div>
            </div>
        </section> : null}
        {profileDataCurrent && uploadDialogOpen ? <ModalPortal><div className="fixed inset-0 z-[1900] flex items-center justify-center bg-black/60 p-3 sm:p-6"><section id="kyc-evidence-upload" role="dialog" aria-modal="true" aria-labelledby="kyc-upload-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"><div className="mb-4 flex items-center justify-between gap-3"><h2 id="kyc-upload-title" className="text-xl font-extrabold">Upload private evidence</h2><Button type="button" variant="secondary" disabled={uploadBusy} onClick={() => { setUploadDialogOpen(false); setPendingUpload(null); }}>Close</Button></div>
          {contract ? <>
          <p className="text-sm text-secondary">Accepted formats: {contract.formats.join(', ')} · maximum {Math.ceil(Math.min(contract.maxBytes, 50 * 1024 * 1024) / 1024 / 1024)} MB</p>
          {uploadPurpose === 'residence_national_id' && (internationalIdentityUnavailable(contract) || !contract.documentKinds.residence_national_id?.length) ? <p role="status" className="mt-2 text-sm text-amber-900">{internationalIdentityUnavailable(contract) ?? 'Accepted residence national ID document kinds are unavailable. Contact support before uploading this evidence.'}</p> : null}
          {contract.subjects.personFields.length ? <p className="mt-2 text-sm"><strong>Declared person fields:</strong> {contract.subjects.personFields.join(', ')}</p> : null}
          <div className="mt-4 rounded-lg border border-outline-variant/10 bg-surface-container-low p-4">
            <p className="text-sm text-secondary">Choose the file type and select your document. You will confirm this upload with your authenticator. An uploaded file is reviewed separately for KYC.</p>
            {contract.policies.upload?.state !== 'configured' ? <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">The evidence upload policy is {formatStatus(contract.policies.upload?.state)}. Submission is unavailable until the backend policy is configured.</p> : <div className="mt-3 grid gap-3 md:grid-cols-2">
              {uploadFromRequirement ? <p className="text-sm font-semibold md:col-span-2">Document: {evidencePurposeLabel(uploadPurpose)} · For you</p> : <>
                <label className="text-xs font-bold">Purpose<select className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={uploadPurpose} onChange={(event) => { const purpose = event.target.value; setUploadPurpose(purpose); setUploadDocumentKind(''); setUploadPreviousEvidenceId(profileId && uploadSubject ? latestProfileEvidence(evidence, profileId, purpose, uploadSubject)?.id ?? '' : ''); setPendingUpload(null); setEvidenceVersionConflict(null); operationKeyRef.current = null; }}><option value="">Choose purpose</option>{contract.purposes.map((purpose) => <option key={purpose} value={purpose}>{purpose.replaceAll('_', ' ')}</option>)}</select></label>
                <label className="text-xs font-bold">Subject<select className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={uploadSubject} onChange={(event) => { const subject = event.target.value; setUploadSubject(subject); setUploadPreviousEvidenceId(profileId && uploadPurpose ? latestProfileEvidence(evidence, profileId, uploadPurpose, subject)?.id ?? '' : ''); setPendingUpload(null); setEvidenceVersionConflict(null); operationKeyRef.current = null; }}><option value="">Choose subject</option>{[...contract.subjects.fixed, ...contract.subjects.personFields].map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
              </>}
              {(!uploadFromRequirement || (contract.documentKinds[uploadPurpose]?.length ?? 0) > 1) ? <label className="text-xs font-bold">Document kind<select className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={uploadDocumentKind || (contract.documentKinds[uploadPurpose]?.length || uploadPurpose === 'residence_national_id' ? '' : uploadPurpose)} onChange={(event) => { const selectedKind = event.target.value; setUploadDocumentKind(selectedKind === uploadPurpose && !contract.documentKinds[uploadPurpose]?.length ? '' : selectedKind); setPendingUpload(null); operationKeyRef.current = null; }}><option value={contract.documentKinds[uploadPurpose]?.length || uploadPurpose === 'residence_national_id' ? '' : uploadPurpose}>{contract.documentKinds[uploadPurpose]?.length ? 'Choose document kind' : uploadPurpose === 'residence_national_id' ? 'Document choices unavailable' : `Use documented default: ${uploadPurpose || 'purpose'}`}</option>{(contract.documentKinds[uploadPurpose] ?? []).map((kind) => <option key={kind} value={kind}>{kind.replaceAll('_', ' ')}</option>)}</select></label> : null}
              <label className="text-xs font-bold">File<input ref={uploadFileInputRef} type="file" accept={contract.formats.join(',')} className="mt-1 block w-full text-sm font-normal" onChange={(event) => { const file = event.target.files?.[0] ?? null; setUploadFile(file); setPendingUpload(null); operationKeyRef.current = null; setUploadError(file && file.size > profileEvidenceUploadLimitBytes(contract) ? `This file is too large. Choose a file no larger than ${formatEvidenceFileSize(profileEvidenceUploadLimitBytes(contract))}.` : null); }} /><span className="mt-1 block font-normal text-secondary">Maximum {formatEvidenceFileSize(profileEvidenceUploadLimitBytes(contract))}</span></label>
              <div className="rounded-lg bg-white p-3 text-sm md:col-span-2">{latestUploadEvidence ? <><p className="font-semibold">Replacing the latest evidence record · Version {latestUploadEvidence.version}</p><p className="mt-1 text-secondary">Current file state: {formatStatus(latestUploadEvidence.state)}. The uploaded file will be checked separately for KYC.</p></> : <p className="text-secondary">No evidence history exists for this purpose and subject. This will be a first upload.</p>}</div>
              <div className="md:col-span-2">{evidenceVersionConflict ? <div role="alert" className="mb-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{evidenceVersionConflict.refreshError ? <><p>The evidence history changed, but the latest version could not be confirmed. Do not retry the upload until the current list has loaded.</p><Button type="button" variant="secondary" className="mt-2" disabled={sectionLoading.evidence} onClick={() => void retryEvidenceConflictRefresh()}>{sectionLoading.evidence ? 'Refreshing evidence…' : 'Retry evidence refresh'}</Button></> : <><p>The evidence history changed. {evidenceVersionConflict.latest ? `The latest record is version ${evidenceVersionConflict.latest.version} (${formatStatus(evidenceVersionConflict.latest.state)}).` : 'No matching current record was returned.'} Confirm the current history before starting a new upload challenge.</p><Button type="button" variant="secondary" className="mt-2" onClick={() => { setUploadPreviousEvidenceId(evidenceVersionConflict.latest?.id ?? ''); setEvidenceVersionConflict(null); operationKeyRef.current = null; setUploadError('Current evidence history confirmed. Start a fresh authenticator challenge to continue.'); }}>Confirm current version</Button></>}</div> : null}<Button type="button" disabled={uploadBusy || Boolean(pendingUpload) || Boolean(evidenceVersionConflict) || !uploadFile || !uploadPurpose || !uploadSubject || !profileId || (uploadPurpose === 'residence_national_id' && Boolean(internationalIdentityUnavailable(contract) || !contract.documentKinds.residence_national_id?.length))} onClick={() => void beginEvidenceUpload()}>{uploadBusy ? 'Preparing secure upload…' : 'Continue with authenticator'}</Button>{uploadError ? <p role="alert" className="mt-2 text-sm text-error">{uploadError}</p> : null}</div>
            </div>}
          </div>
          </> : <div className="rounded-lg border border-outline-variant/10 bg-surface-container-low p-4"><h2 className="text-xl font-extrabold">Evidence requirements</h2>{sectionErrors.contract ? <p role="alert" className="mt-2 text-sm text-error">{sectionErrors.contract}</p> : <p role="status" className="mt-2 text-sm text-secondary">{sectionLoading.contract ? 'Loading evidence requirements…' : 'Evidence requirements are unavailable.'}</p>}<Button type="button" variant="secondary" className="mt-3" disabled={sectionLoading.contract} onClick={() => void retrySection('contract')}>Retry requirements</Button></div>}
        </section></div></ModalPortal> : null}
        {profileDataCurrent ? <section id="kyc-case-list" className="scroll-mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Private evidence</h2><p className="mt-1 text-xs text-secondary">Only evidence in the current Available state can be opened; the server rechecks authorization. File-content validation and removal states refresh automatically for a bounded period.</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={!profileDetailsReady || !contract || contract.policies.upload?.state !== 'configured'} onClick={() => openUploadDialog()}>Upload a document</Button><Button type="button" variant="secondary" disabled={busy || !evidenceCursor} onClick={() => void loadMoreEvidence()}>Load more</Button></div></div>
            {sectionErrors.evidence ? <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-error"><p>{sectionErrors.evidence}</p><Button type="button" variant="secondary" className="mt-2" disabled={sectionLoading.evidence} onClick={() => void retrySection('evidence')}>Retry evidence</Button></div> : null}
            {sectionLoading.evidence && !evidence.length ? <LoadingState label="Loading private evidence…" /> : null}
            <div className="mt-4 space-y-2">{evidence.map((item) => <article key={item.id} className="rounded-lg bg-surface-container-low p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{item.purpose.replaceAll('_', ' ')} · {item.documentKind.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-secondary">{item.subject} · Version {item.version} · {Math.ceil(item.size / 1024)} KB · Added {formatDate(item.createdAt)}</p>{item.previousEvidenceId ? <p className="mt-1 break-all text-xs text-secondary">Replaces evidence version {item.previousEvidenceId}</p> : null}</div><span className={`text-xs font-bold ${statusClass(item.state)}`}>{formatStatus(item.state)}</span></div>{item.contentValidatedAt ? <p className="mt-1 text-xs text-secondary">Content validated {formatDate(item.contentValidatedAt)}</p> : null}{item.errorCode ? <p className="mt-2 text-xs text-error">{item.errorCode}</p> : null}<div className="mt-2 flex flex-wrap gap-2"><Button type="button" variant="ghost" disabled={busy || !isProfileEvidenceAvailable(item.state)} onClick={() => void openEvidence(item)}>Open authorized file</Button>{item.state === 'retry' ? <Button type="button" variant="secondary" disabled={busy || evidenceStepUp.busy || Boolean(evidenceStepUp.challenge)} onClick={() => void beginEvidenceAction(item, 'retry')}>Retry content validation with authenticator</Button> : null}{!['deleting', 'privacy_deleting', 'deleted'].includes(item.state) ? <Button type="button" variant="secondary" disabled={busy || evidenceStepUp.busy || Boolean(evidenceStepUp.challenge)} onClick={() => setEvidenceToRemove(item)}>Request removal</Button> : null}{item.state === 'deleting' || item.state === 'privacy_deleting' ? <span role="status" className="self-center text-xs text-secondary">Removal is processing.</span> : null}</div></article>)}{!evidence.length && !sectionLoading.evidence && !sectionErrors.evidence ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No evidence records returned for this profile.</p> : null}</div>
          </div>
          <div className="rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Verification cases</h2><p className="mt-1 text-xs text-secondary">Case state and history are returned by the current-profile API.</p></div><Button type="button" variant="secondary" disabled={busy || !caseCursor} onClick={() => void loadMoreCases()}>Load more</Button></div>
            {sectionErrors.cases ? <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-error"><p>{sectionErrors.cases}</p><Button type="button" variant="secondary" className="mt-2" disabled={sectionLoading.cases} onClick={() => void retrySection('cases')}>Retry cases</Button></div> : null}
            {sectionLoading.cases && !cases.length ? <LoadingState label="Loading verification cases…" /> : null}
            <div className="mt-4 space-y-2">{cases.map((item) => <article key={item.id} className="rounded-lg bg-surface-container-low p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold capitalize">{item.kind} · {item.structure}</p><p className="mt-1 text-xs text-secondary">Case {item.id} · Version {item.version} · Draft version {item.draftVersion}</p></div><span className={`text-xs font-bold ${statusClass(item.state)}`}>{formatStatus(item.state)}</span></div><p className="mt-1 text-xs text-secondary">Submitted {formatDate(item.submittedAt)} · Reviewed {formatDate(item.reviewedAt)} · Expires {formatDate(item.expiresAt)}</p><Button type="button" variant="ghost" disabled={busy} onClick={() => void openCase(item)}>Details and history</Button></article>)}{!cases.length && !sectionLoading.cases && !sectionErrors.cases ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No verification cases returned for this profile.</p> : null}</div>

          </div>
        </section> : null}
        {profileDataCurrent && selectedEvidence ? <section className="rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">Evidence detail</h2><p className="mt-1 text-sm text-secondary">{selectedEvidence.id} · {selectedEvidence.mimeType} · Version {selectedEvidence.version}</p></div><Button type="button" variant="secondary" onClick={() => setSelectedEvidence(null)}>Close details</Button></div><p className="mt-3 text-sm">Purpose {selectedEvidence.purpose} · Subject {selectedEvidence.subject} · State {formatStatus(selectedEvidence.state)}{selectedEvidence.contentValidatedAt ? ` · Content validated ${formatDate(selectedEvidence.contentValidatedAt)}` : ''}{selectedEvidence.previousEvidenceId ? ` · Previous evidence ${selectedEvidence.previousEvidenceId}` : ''}</p><p className="mt-2 text-xs text-secondary">Content validation checks supported file format, structure, size and content hash. It does not detect malware or approve identity, KYC or title.</p></section> : null}
        {profileDataCurrent && selectedCase ? <section className="rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">Case detail and history</h2><p className="mt-1 text-sm text-secondary">{selectedCase.kind} · {selectedCase.state} · Version {selectedCase.version}</p></div><Button type="button" variant="secondary" onClick={() => setSelectedCase(null)}>Close case</Button></div><p className="mt-3 text-sm">Rejection codes: {selectedCase.rejectionCodes.length ? selectedCase.rejectionCodes.join(', ') : 'None returned.'}</p><div className="mt-4 space-y-2">{history?.events.map((event) => <div key={event.id} className="rounded-lg bg-surface-container-low p-3 text-sm"><strong>{event.action}</strong><span className="ml-2 text-xs text-secondary">Version {event.version} · {formatDate(event.at)}</span></div>)}{!history?.events.length ? <p className="text-sm text-secondary">No case history events returned.</p> : null}</div>{history?.nextCursor ? <Button type="button" variant="secondary" disabled={busy} className="mt-3" onClick={async () => { const requestedProfileId = profileId; setBusy(true); try { const page = await verificationCaseService.holderHistory(selectedCase.id, history.nextCursor ?? undefined); if (currentProfileIdRef.current === requestedProfileId) setHistory((current) => current ? { events: [...current.events, ...page.events], nextCursor: page.nextCursor } : page); } catch (raw) { if (currentProfileIdRef.current === requestedProfileId) setError(readErrorMessage(raw, 'Verification case history')); } finally { if (currentProfileIdRef.current === requestedProfileId) setBusy(false); } }}>Load more history</Button> : null}{['submitted', 'under_review'].includes(selectedCase.state) ? <Button type="button" variant="secondary" className="mt-4" disabled={busy || withdrawStepUp.busy || Boolean(withdrawStepUp.challenge)} onClick={() => void beginWithdraw()}>Withdraw case</Button> : null}</section> : null}
        {profileDataCurrent && evidenceToRemove ? <ModalPortal><div className="fixed inset-0 z-[1900] flex items-center justify-center bg-black/60 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="remove-evidence-title" aria-describedby="remove-evidence-description" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="remove-evidence-title" className="text-xl font-bold">Remove this document?</h2><p id="remove-evidence-description" className="mt-3 text-sm text-secondary">The server may refuse removal if this document is part of a draft, submitted case, or signatory record.</p><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEvidenceToRemove(null)}>Keep document</Button><Button type="button" onClick={() => { const item = evidenceToRemove; setEvidenceToRemove(null); void beginEvidenceAction(item, 'delete'); }}>Request removal</Button></div></section></div></ModalPortal> : null}
        {profileDataCurrent && filePreview ? <ModalPortal><div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-label="Private evidence viewer" className="flex h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white p-4"><div className="flex items-center justify-between"><h2 className="font-bold">Authorized private evidence · {filePreview.id}</h2><Button type="button" variant="secondary" onClick={() => { URL.revokeObjectURL(filePreview.url); setFilePreview(null); }}>Close viewer</Button></div><div className="mt-3 min-h-0 flex-1"><AuthorizedFilePreview url={filePreview.url} mimeType={filePreview.mimeType} alt="Private profile evidence" /></div></section></div></ModalPortal> : null}
        <StepUpDialog challenge={profileDataCurrent ? withdrawStepUp.challenge : null} busy={withdrawStepUp.busy} error={withdrawStepUp.error} onCancel={withdrawStepUp.cancel} onSubmit={completeWithdraw} />
        <StepUpDialog challenge={profileDataCurrent ? createCaseStepUp.challenge : null} busy={createCaseStepUp.busy} error={createCaseStepUp.error || caseSubmissionError} onCancel={() => { createCaseStepUp.cancel(); setCaseSubmissionError(null); setCaseSubmissionFieldErrors([]); }} onSubmit={completeCaseSubmission} />
        <StepUpDialog challenge={profileDataCurrent ? saveDraftStepUp.challenge : null} busy={saveDraftStepUp.busy} error={saveDraftStepUp.error || draftSaveError} onCancel={() => { saveDraftStepUp.cancel(); setDraftSavePending(false); setDraftSaveError(null); }} onSubmit={completeDraftSave} />
        <StepUpDialog challenge={profileDataCurrent ? evidenceStepUp.challenge : null} busy={evidenceStepUp.busy} error={evidenceStepUp.error} onCancel={() => { evidenceStepUp.cancel(); setPendingEvidenceAction(null); }} onSubmit={completeEvidenceAction} />
        <StepUpDialog challenge={profileDataCurrent && pendingUpload && pendingUpload.profileId === profileId ? pendingUpload.challenge : null} busy={uploadBusy} error={uploadError} onCancel={() => { setPendingUpload(null); setUploadError(null); }} onSubmit={completeEvidenceUpload} />
      </main>
  );
  if ((profile?.kind ?? activeProfile?.kind) === 'owner') return <LandlordPortalLayout active="verification" title="KYC & Verification">{pageContent}</LandlordPortalLayout>;
  if (isStaffProfile && user?.role === 'admin') return <AdminLayout>{pageContent}</AdminLayout>;
  return <BuyerPortalLayout pageTitle="KYC & Verification" pageSubtitle="Complete and track verification for your selected RealtiQ profile." pageEyebrow={`${formatStatus(selectedProfileKind)} · ${formatStatus(selectedProfileStructure)}`}>{pageContent}</BuyerPortalLayout>;
};

export default LandlordVerification;
