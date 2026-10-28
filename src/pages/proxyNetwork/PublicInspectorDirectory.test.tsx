import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicInspectorProfile } from '../../types/proxyNetwork';
import PublicInspectorDirectory from './PublicInspectorDirectory';

const mocks = vi.hoisted(() => ({ useProxyResource: vi.fn() }));

vi.mock('../../features/proxyNetwork/useProxyResource', () => ({ useProxyResource: mocks.useProxyResource }));
vi.mock('../../components/layout/PublicLayout', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

describe('PublicInspectorDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps rendering profiles with omitted user projections and uses unique fallback keys', () => {
    const inspectors = [
      { _id: undefined, user: undefined, professionalType: 'property_inspector', availabilityStatus: 'available', ratingAverage: null, ratingCount: null, completedJobs: null },
      { _id: 'profile-2', user: null, professionalType: 'surveyor', availabilityStatus: 'busy', ratingAverage: 4.6, ratingCount: 4, completedJobs: 6 },
    ] as unknown as PublicInspectorProfile[];
    mocks.useProxyResource
      .mockReturnValueOnce({ data: { inspectors, total: 2, page: 1, limit: 20 }, loading: false, error: null, reload: vi.fn() })
      .mockReturnValueOnce({ data: [], loading: false, error: null, reload: vi.fn() });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<MemoryRouter initialEntries={['/proxy-inspectors?propertyId=property-1']}><PublicInspectorDirectory /></MemoryRouter>);

    expect(screen.getAllByRole('heading', { name: 'Verified professional' })).toHaveLength(2);
    expect(screen.getByText('Profile details are unavailable.')).toBeInTheDocument();
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain('unique "key" prop');
    consoleError.mockRestore();
  });
});
