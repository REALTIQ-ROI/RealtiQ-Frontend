import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TitleVerificationRegistry from './TitleVerificationRegistry';
import { titleVerificationService } from '../../services/titleVerificationService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../../components/layout/PublicLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../../services/titleVerificationService', () => ({
  titleVerificationService: {
    getPublicRegistryRecord: vi.fn(),
    getRegistryIntegrity: vi.fn(),
    getRegistryPublicKey: vi.fn(),
    verifyRegistryDocument: vi.fn(),
  },
}));

const service = vi.mocked(titleVerificationService);

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/title-verification/RTQ-TV-2026-000001']}>
      <Routes>
        <Route path="/title-verification/:publicVerificationId" element={<TitleVerificationRegistry />} />
      </Routes>
    </MemoryRouter>,
  );

describe('TitleVerificationRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    service.getPublicRegistryRecord.mockResolvedValue({
      record: {
        publicVerificationId: 'RTQ-TV-2026-000001',
        publicVerificationUrl: 'https://realtiq.com.ng/title-verification/RTQ-TV-2026-000001',
        registryStatus: 'active',
        property: { title: '3 Bedroom Flat in Lekki', location: 'Lekki, Lagos' },
        documentType: 'certificate_of_occupancy',
        documentHash: 'document_hash',
        hashAlgorithm: 'SHA-256',
        legalReviewStatus: 'approved',
        sequenceNumber: 1,
        previousRecordHash: null,
        recordHash: 'record_hash',
        signatureStatus: 'signed',
        signatureAlgorithm: 'RSA-SHA256',
        signingKeyId: 'realtiq-registry-v1',
        approvedAt: '2026-07-15T10:00:00.000Z',
        publishedAt: '2026-07-15T10:02:00.000Z',
        externalAnchor: { status: 'not_requested' },
        disclaimer: 'This record confirms RealtiQ legal review and document integrity. It is not independent government proof of ownership.',
      },
    });
    service.getRegistryIntegrity.mockResolvedValue({
      publicVerificationId: 'RTQ-TV-2026-000001',
      recordHashValid: true,
      signatureValid: false,
      previousRecordLinkValid: true,
      registryStatus: 'active',
      externalAnchorStatus: 'not_requested',
    });
    service.getRegistryPublicKey.mockResolvedValue({
      keyId: 'realtiq-registry-v1',
      algorithm: 'RSA-SHA256',
      publicKey: '-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----',
      configured: true,
    });
  });

  it('renders buyer-facing registry fields and hides technical audit details', async () => {
    renderPage();

    expect(await screen.findAllByText('RTQ-TV-2026-000001')).not.toHaveLength(0);
    expect(screen.getByText('3 Bedroom Flat in Lekki')).toBeInTheDocument();
    expect(screen.getByText('Certificate of Occupancy')).toBeInTheDocument();
    expect(screen.getByText('https://realtiq.com.ng/title-verification/RTQ-TV-2026-000001')).toBeInTheDocument();
    expect(screen.queryByText('document_hash')).not.toBeInTheDocument();
    expect(screen.queryByText('record_hash')).not.toBeInTheDocument();
    expect(screen.queryByText(/previous link/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/signature validation failed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cloudinary/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/kyc/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/private key/i)).not.toBeInTheDocument();
  });

  it('copies the public verification ID', async () => {
    renderPage();

    await screen.findAllByText('RTQ-TV-2026-000001');
    await userEvent.click(screen.getAllByRole('button', { name: /copy/i })[0]);

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('RTQ-TV-2026-000001'));
  });
});
