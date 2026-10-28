export const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60_000;

export const normalizeVerificationEmail = (email: string) => email.trim().toLowerCase();
