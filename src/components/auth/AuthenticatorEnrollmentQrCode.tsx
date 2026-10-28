import { QRCodeSVG } from 'qrcode.react';

interface AuthenticatorEnrollmentQrCodeProps {
  provisioningUri: string;
}

const AuthenticatorEnrollmentQrCode = ({ provisioningUri }: AuthenticatorEnrollmentQrCodeProps) => (
  <div role="img" aria-label="Authenticator setup QR code" className="inline-flex rounded-xl bg-white p-3 shadow-sm">
    <QRCodeSVG
      value={provisioningUri}
      size={224}
      level="M"
      aria-hidden="true"
      className="h-auto w-full max-w-56"
    />
  </div>
);

export default AuthenticatorEnrollmentQrCode;
