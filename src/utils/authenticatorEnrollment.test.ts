import { describe, expect, it } from 'vitest';
import { getAuthenticatorAccountEmail } from './authenticatorEnrollment';

describe('getAuthenticatorAccountEmail', () => {
  it('uses the decoded email label from the backend provisioning URI', () => {
    expect(getAuthenticatorAccountEmail(
      'otpauth://totp/REALTIQ:buyer%2Btest%40example.test?secret=PRIVATE&issuer=REALTIQ&algorithm=SHA1&digits=6&period=30',
      'different@example.test',
    )).toBe('buyer+test@example.test');
  });

  it('uses the authenticated account email when the URI label contains an old account ID', () => {
    expect(getAuthenticatorAccountEmail(
      'otpauth://totp/REALTIQ:660000000000000000000002?secret=PRIVATE&issuer=REALTIQ',
      'admin@example.test',
    )).toBe('admin@example.test');
  });

  it('never presents an identifier as an email label when no account email is available', () => {
    expect(getAuthenticatorAccountEmail(
      'otpauth://totp/REALTIQ:660000000000000000000002?secret=PRIVATE&issuer=REALTIQ',
    )).toBe('your account');
  });
});
