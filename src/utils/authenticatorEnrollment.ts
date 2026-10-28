const isEmailAddress = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/** Extract only an email account label; never surface an account or profile ID as the label. */
export const getAuthenticatorAccountEmail = (provisioningUri: string, authenticatedEmail?: string): string => {
  try {
    const uri = new URL(provisioningUri);
    if (uri.protocol === 'otpauth:') {
      const label = decodeURIComponent(uri.pathname.replace(/^\/+/, ''));
      const separator = label.indexOf(':');
      const candidate = (separator >= 0 ? label.slice(separator + 1) : label).trim();
      if (isEmailAddress(candidate)) return candidate;
    }
  } catch {
    // Fall back to authenticated account state for an absent or malformed URI label.
  }

  const accountEmail = authenticatedEmail?.trim() ?? '';
  return isEmailAddress(accountEmail) ? accountEmail : 'your account';
};
