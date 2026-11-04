import { verificationDecisionSources, type VerificationCaseCheck, type VerificationDecisionSource } from './verificationCaseService';

export { verificationDecisionSources };

export interface VerificationDecisionCheckDraft {
  source?: string;
  reference?: string;
  expiresAt?: string;
  applicability?: 'required' | 'not_applicable';
  jurisdictionStateId?: string;
  issuerName?: string;
}

export const isEvidenceDecisionCheck = (field: string): boolean => field.toLowerCase().startsWith('evidence.');

export const isScumlDecisionCheck = (field: string): boolean => /scuml/i.test(field);

export const verificationSourcesForCheck = (field: string): readonly VerificationDecisionSource[] => {
  const normalized = field.toLowerCase();
  const isRegistrationOrProfessionalEvidence = isEvidenceDecisionCheck(field)
    && (normalized.includes('registration') || normalized.includes('professional'));
  return isRegistrationOrProfessionalEvidence
    ? ['official_registry', 'approved_provider']
    : verificationDecisionSources;
};

export const buildVerificationDecisionCheck = (
  field: string,
  draft: VerificationDecisionCheckDraft,
  now = Date.now(),
): { check?: VerificationCaseCheck; error?: string } => {
  const allowedSources = verificationSourcesForCheck(field);
  if (!draft.source || !allowedSources.includes(draft.source as VerificationDecisionSource)) {
    return { error: `Choose a supported source for ${field}.` };
  }
  const reference = draft.reference?.trim();
  if (!reference) return { error: `Enter the private supporting reference for ${field}.` };

  const check: VerificationCaseCheck = {
    field,
    source: draft.source as VerificationDecisionSource,
    reference,
  };

  if (isEvidenceDecisionCheck(field) && draft.expiresAt?.trim()) {
    const expiry = new Date(draft.expiresAt);
    if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= now) {
      return { error: `Enter a future expiry date from the document for ${field}.` };
    }
    check.expiresAt = expiry.toISOString();
  }

  if (isScumlDecisionCheck(field)) {
    if (draft.applicability !== 'required' && draft.applicability !== 'not_applicable') {
      return { error: `Choose the SCUML applicability for ${field}.` };
    }
    check.applicability = draft.applicability;
  }
  if (draft.jurisdictionStateId?.trim()) check.jurisdictionStateId = draft.jurisdictionStateId.trim();
  if (draft.issuerName?.trim()) check.issuerName = draft.issuerName.trim();

  return { check };
};
