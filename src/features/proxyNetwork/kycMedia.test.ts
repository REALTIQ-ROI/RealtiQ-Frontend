import { describe, expect, it } from 'vitest';
import { getKycMediaKind } from './kycMedia';

describe('KYC media detection', () => {
  it('prefers MIME types and falls back to signed URL paths', () => {
    expect(getKycMediaKind('image/webp', 'https://media.test/no-extension')).toBe('image');
    expect(getKycMediaKind('application/pdf', 'https://media.test/raw?id=1')).toBe('pdf');
    expect(getKycMediaKind('', 'https://media.test/id-document.pdf?token=signed')).toBe('pdf');
    expect(getKycMediaKind('', 'https://media.test/photo.png?token=signed')).toBe('image');
    expect(getKycMediaKind('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'https://media.test/raw')).toBe('word');
    expect(getKycMediaKind('application/zip', 'https://media.test/file.zip')).toBe('unsupported');
  });
});
