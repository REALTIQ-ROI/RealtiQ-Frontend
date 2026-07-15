import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TitleRegistrySnapshots from './TitleRegistrySnapshots';
import { titleVerificationService } from '../../services/titleVerificationService';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('../../components/layout/PublicLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../../services/titleVerificationService', () => ({
  titleVerificationService: {
    getRegistrySnapshot: vi.fn(),
    getRegistrySnapshotManifest: vi.fn(),
  },
}));

const service = vi.mocked(titleVerificationService);

describe('TitleRegistrySnapshots', () => {
  it('renders snapshot proof and manifest records on demand', async () => {
    service.getRegistrySnapshot.mockResolvedValue({
      snapshotDate: '2026-07-15',
      firstSequenceNumber: 1,
      lastSequenceNumber: 12,
      recordCount: 12,
      snapshotHash: 'snapshot_hash',
      previousSnapshotHash: 'previous_hash',
      signatureStatus: 'signed',
      signingKeyId: 'realtiq-registry-v1',
      generatedAt: '2026-07-16T01:00:00.000Z',
    });
    service.getRegistrySnapshotManifest.mockResolvedValue({
      snapshotDate: '2026-07-15',
      snapshotHash: 'snapshot_hash',
      records: [{ publicVerificationId: 'RTQ-TV-2026-000001', sequenceNumber: 1, recordHash: 'record_hash' }],
    });

    render(<TitleRegistrySnapshots />);

    const input = screen.getByLabelText(/snapshot date/i);
    await userEvent.clear(input);
    await userEvent.type(input, '2026-07-15');
    await userEvent.click(screen.getByRole('button', { name: /load snapshot/i }));

    expect(await screen.findByText('snapshot_hash')).toBeInTheDocument();
    expect(screen.getByText('previous_hash')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /load manifest/i }));
    expect(await screen.findByText('RTQ-TV-2026-000001')).toBeInTheDocument();
    expect(screen.getByText('record_hash')).toBeInTheDocument();
  });
});
