import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthenticatorEnrollmentQrCode from './AuthenticatorEnrollmentQrCode';

describe('AuthenticatorEnrollmentQrCode', () => {
  it('renders a local QR image from the provisioning URI without displaying the secret text', () => {
    const provisioningUri = 'otpauth://totp/RealtiQ:admin?secret=JBSWY3DPEHPK3PXP&issuer=RealtiQ';
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
      <AuthenticatorEnrollmentQrCode provisioningUri="otpauth://totp/RealtiQ:admin?secret=FIRSTSECRET&issuer=RealtiQ" />,
    );
    const firstMatrix = container.querySelector('path')?.getAttribute('d');

    rerender(
      <AuthenticatorEnrollmentQrCode provisioningUri="otpauth://totp/RealtiQ:admin?secret=SECONDSECRET&issuer=RealtiQ" />,
    );

    expect(container.querySelector('path')?.getAttribute('d')).not.toBe(firstMatrix);
  });
});
