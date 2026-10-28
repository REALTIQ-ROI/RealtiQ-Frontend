import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthenticatorEnrollmentQrCode from './AuthenticatorEnrollmentQrCode';

describe('AuthenticatorEnrollmentQrCode', () => {
  it('renders a local QR image from the provisioning URI without displaying the secret text', () => {
    const provisioningUri = 'otpauth://totp/REALTIQ:buyer%40example.test?secret=JBSWY3DPEHPK3PXP&issuer=REALTIQ&algorithm=SHA1&digits=6&period=30';
    const { container } = render(<AuthenticatorEnrollmentQrCode provisioningUri={provisioningUri} />);

    const qrCode = container.querySelector('svg');
    expect(screen.getByRole('img', { name: 'Authenticator setup QR code' })).toBeInTheDocument();
    expect(qrCode?.tagName.toLowerCase()).toBe('svg');
    expect(qrCode?.querySelector('path')).not.toBeNull();
    expect(container).not.toHaveTextContent(provisioningUri);
    expect(container).not.toHaveTextContent('JBSWY3DPEHPK3PXP');
  });

  it('encodes a changed provisioning URI into a changed QR matrix', () => {
    const { container, rerender } = render(
      <AuthenticatorEnrollmentQrCode provisioningUri="otpauth://totp/REALTIQ:buyer%40example.test?secret=FIRSTSECRET&issuer=REALTIQ" />,
    );
    const firstMatrix = container.querySelector('svg')?.innerHTML;

    rerender(
      <AuthenticatorEnrollmentQrCode provisioningUri="otpauth://totp/REALTIQ:buyer%40example.test?secret=SECONDSECRET&issuer=REALTIQ" />,
    );

    expect(container.querySelector('svg')?.innerHTML).not.toBe(firstMatrix);
  });
});
