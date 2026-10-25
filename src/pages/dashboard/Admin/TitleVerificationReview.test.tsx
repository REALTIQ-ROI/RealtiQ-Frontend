import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { titleVerificationService } from '../../../services/titleVerificationService';
import type { TitleVerification, TitleVerificationStatus } from '../../../types';
import TitleVerificationReview from './TitleVerificationReview';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../components/title/RegistryAuditDetails', () => ({ default: () => null }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ token: 'admin-token' }) }));
vi.mock('../../../services/documentService', () => ({ documentService: { getDocument: vi.fn() } }));
vi.mock('../../../services/titleVerificationService', () => ({
  titleVerificationService: {
    listTitleVerifications: vi.fn(), getTitleVerification: vi.fn(),
    reviewTitleVerification: vi.fn(), revokeTitleVerification: vi.fn(), requestRegistryExternalAnchor: vi.fn(),
  },
}));

const verification = (status: TitleVerificationStatus): TitleVerification => ({
  verificationId: 'verification-1',
  property: { _id: 'property-1', title: 'Lekki Home' },
  documentType: 'survey_plan',
  status,
  publicVerificationId: status === 'published' ? 'RTQ-TV-2026-000001' : null,
  submittedAt: '2026-07-24T08:00:00.000Z',
});

const renderReview = async (status: TitleVerificationStatus) => {
  const selected = verification(status);
  vi.mocked(titleVerificationService.listTitleVerifications).mockResolvedValue({ verifications: [selected] });
  vi.mocked(titleVerificationService.getTitleVerification).mockResolvedValue({ verification: selected, logs: [] });
  render(<MemoryRouter><TitleVerificationReview /></MemoryRouter>);
  const [row] = await screen.findAllByRole('button', { name: /Lekki Home/ });
  fireEvent.click(row);
  await screen.findByRole('heading', { name: 'Lekki Home' });
};

describe('title verification step-up boundary', () => {
  it('keeps review decisions unavailable while read-only detail loads', async () => {
    await renderReview('pending');
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
    expect(titleVerificationService.reviewTitleVerification).not.toHaveBeenCalled();
  });

  it('keeps revocation and external anchoring unavailable', async () => {
    await renderReview('published');
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Request External Anchor' })).toBeDisabled();
    expect(titleVerificationService.revokeTitleVerification).not.toHaveBeenCalled();
    expect(titleVerificationService.requestRegistryExternalAnchor).not.toHaveBeenCalled();
  });
});
