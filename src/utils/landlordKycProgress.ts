import type { VerificationCase } from '../services/verificationCaseService';

export type LandlordKycStepState = 'complete' | 'current' | 'waiting' | 'needs_action' | 'upcoming';

export interface LandlordKycStep {
  id: 'profile' | 'evidence' | 'submission' | 'review';
  label: string;
  state: LandlordKycStepState;
  detail: string;
}

export interface LandlordKycProgress {
  approved: boolean;
  percent: number;
  completedSteps: number;
  summary: string;
  nextAction: string;
  steps: LandlordKycStep[];
}

interface LandlordKycProgressInput {
  verificationStatus?: string | null;
  cases: readonly Pick<VerificationCase, 'id' | 'state' | 'submittedAt'>[];
  availableEvidenceCount: number;
  hasOnboardingDraft: boolean;
}

const submittedCaseStates = new Set(['submitted', 'under_review', 'approved', 'rejected', 'withdrawn', 'superseded', 'expired']);
type ProgressCase = LandlordKycProgressInput['cases'][number];

const latestSubmittedCase = (cases: readonly ProgressCase[]): ProgressCase | undefined => cases.reduce<ProgressCase | undefined>((latest, candidate) => {
  if (!latest) return candidate;
  const latestTime = latest.submittedAt ? Date.parse(latest.submittedAt) : Number.NaN;
  const candidateTime = candidate.submittedAt ? Date.parse(candidate.submittedAt) : Number.NaN;
  return Number.isFinite(candidateTime) && (!Number.isFinite(latestTime) || candidateTime > latestTime) ? candidate : latest;
}, undefined);

export const buildLandlordKycProgress = ({
  verificationStatus,
  cases,
  availableEvidenceCount,
  hasOnboardingDraft,
}: LandlordKycProgressInput): LandlordKycProgress => {
  const latestCase = latestSubmittedCase(cases);
  const caseState = latestCase?.state?.toLowerCase() ?? '';
  const approved = verificationStatus?.toLowerCase() === 'approved' || caseState === 'approved';
  const caseSubmitted = Boolean(latestCase && submittedCaseStates.has(caseState));
  const profileStepComplete = hasOnboardingDraft || caseSubmitted || approved;
  const evidenceStepComplete = caseSubmitted || approved || (profileStepComplete && availableEvidenceCount > 0);
  const submissionStepComplete = caseSubmitted || approved;

  const steps: LandlordKycStep[] = [
    {
      id: 'profile',
      label: 'Review profile details',
      state: profileStepComplete ? 'complete' : 'current',
      detail: caseSubmitted
        ? 'The server accepted the profile draft for KYC review.'
        : hasOnboardingDraft
          ? 'The current profile setup draft is loaded. The server checks required details when you submit the case.'
          : 'Load and review the current profile setup draft before moving to evidence.',
    },
    {
      id: 'evidence',
      label: 'Add private evidence',
      state: evidenceStepComplete ? 'complete' : profileStepComplete ? 'current' : 'upcoming',
      detail: caseSubmitted
        ? 'The submitted case contains the evidence accepted for review.'
        : profileStepComplete
          ? availableEvidenceCount > 0
            ? `${availableEvidenceCount} available file${availableEvidenceCount === 1 ? '' : 's'} loaded. The server checks route-specific evidence requirements when you submit.`
            : 'Upload the private evidence required for your profile and identity route.'
          : `${availableEvidenceCount} available file${availableEvidenceCount === 1 ? '' : 's'} exist, but this step follows profile review.`,
    },
    {
      id: 'submission',
      label: 'Submit KYC for review',
      state: submissionStepComplete ? 'complete' : evidenceStepComplete ? 'current' : 'upcoming',
      detail: caseSubmitted
        ? `Case ${latestCase?.id} was submitted. Its server status is ${latestCase?.state.replaceAll('_', ' ')}.`
        : evidenceStepComplete
          ? 'Choose the required identity route and evidence, then submit with your authenticator.'
          : 'This step opens after profile review and private evidence are complete.',
    },
    {
      id: 'review',
      label: 'Reviewer decision',
      state: approved ? 'complete' : caseState === 'submitted' || caseState === 'under_review'
        ? 'waiting'
        : caseState === 'rejected' || caseState === 'withdrawn' || caseState === 'superseded' || caseState === 'expired'
          ? 'needs_action'
          : 'upcoming',
      detail: approved
        ? 'KYC approval is confirmed by the current server status.'
        : caseState === 'submitted' || caseState === 'under_review'
          ? 'Your case is waiting for an authorized reviewer.'
          : caseState === 'rejected'
            ? 'Review the decision and rejection codes before taking the next allowed step.'
            : caseState === 'withdrawn' || caseState === 'superseded' || caseState === 'expired'
              ? `The latest case is ${caseState}. Review its history before submitting again, if allowed.`
              : 'A reviewer decision appears here after a case is submitted.',
    },
  ];

  const completedSteps = approved
    ? steps.length
    : Number(profileStepComplete) + Number(evidenceStepComplete) + Number(submissionStepComplete);
  let summary: string;
  let nextAction: string;

  if (approved) {
    summary = 'Your KYC has been approved. This status comes from the current profile or case response.';
    nextAction = 'No further KYC action is required unless the server later changes your verification status.';
  } else if (caseState === 'submitted' || caseState === 'under_review') {
    summary = `Your KYC case is ${caseState.replaceAll('_', ' ')}. The reviewer decision is not complete yet.`;
    nextAction = 'Wait for the authorized review, or open the case details and history for the latest status.';
  } else if (caseState === 'rejected') {
    summary = 'The latest KYC case was rejected. KYC is not approved.';
    nextAction = 'Open the case details and history, review the returned rejection codes, and correct the required items before taking another allowed step.';
  } else if (caseSubmitted) {
    summary = `The latest KYC case is ${latestCase?.state.replaceAll('_', ' ')}. KYC is not confirmed as approved.`;
    nextAction = 'Open the case details and history to see the authoritative status and next permitted action.';
  } else if (latestCase) {
    summary = `The latest KYC case returned an unrecognized status: ${latestCase.state.replaceAll('_', ' ')}. KYC is not confirmed as approved.`;
    nextAction = 'Refresh the case list, then review its authoritative status and history before taking another action.';
  } else if (!hasOnboardingDraft) {
    summary = 'The onboarding draft is unavailable, so KYC readiness cannot be assessed yet.';
    nextAction = 'Refresh this page to reload the current profile draft before submitting KYC.';
  } else {
    summary = availableEvidenceCount > 0
      ? `KYC has not been submitted. Profile review is complete and ${availableEvidenceCount} available evidence file${availableEvidenceCount === 1 ? ' is' : 's are'} ready to review.`
      : 'KYC has not been submitted. Profile review is complete; add private evidence to continue.';
    nextAction = evidenceStepComplete
      ? 'Choose the applicable identity route, select the evidence required by the server, and submit a verification case.'
      : 'Add the private evidence required for your profile and identity route before submitting the case.';
  }

  return {
    approved,
    percent: Math.round((completedSteps / steps.length) * 100),
    completedSteps,
    summary,
    nextAction,
    steps,
  };
};
