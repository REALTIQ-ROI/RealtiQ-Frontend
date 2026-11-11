import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicInspectorProfile } from '../../types/proxyNetwork';
import PublicInspectorProfilePage from './PublicInspectorProfile';

const mocks = vi.hoisted(() => ({ useProxyResource: vi.fn(), useAuth: vi.fn() }));

vi.mock('../../features/proxyNetwork/useProxyResource', () => ({ useProxyResource: mocks.useProxyResource }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../components/layout/PublicLayout', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

describe('PublicInspectorProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: null });
  });

  it('renders safely when the public detail response omits linked user identity', () => {
    const profile = {
      _id: 'profile-1',
      user: null,
      professionalType: 'property_inspector',
      availabilityStatus: 'available',
      ratingAverage: null,
      ratingCount: null,
      completedJobs: null,
    } as unknown as PublicInspectorProfile;
    mocks.useProxyResource.mockReturnValue({ data: profile, loading: false, error: null, reload: vi.fn() });

    render(
      <MemoryRouter initialEntries={['/proxy-inspectors/profile-1?propertyId=property-1']}>
        <Routes><Route path="/proxy-inspectors/:profileId" element={<PublicInspectorProfilePage />} /></Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Inspection Partner' })).toBeInTheDocument();
    expect(screen.getByText(/Not rated/)).toBeInTheDocument();
    expect(screen.getByText('Inspection requests are unavailable for this profile right now.')).toBeInTheDocument();
  });

  it('does not display private identity details or document routes from unexpected response fields', () => {
    const profile = {
      _id: 'profile-1',
      user: {
        _id: 'account-1', name: 'Example Inspector',
        kyc: {
          fullLegalName: 'Confidential Legal Name',
          nationalId: 'PRIVATE-NATIONAL-ID',
          privateDocuments: { idDocument: { contentAccess: { path: '/api/private/secret-document' } } },
        },
      },
      professionalType: 'property_inspector',
      availabilityStatus: 'available',
      ratingAverage: null,
      ratingCount: null,
      completedJobs: null,
    } as unknown as PublicInspectorProfile;
    mocks.useProxyResource.mockReturnValue({ data: profile, loading: false, error: null, reload: vi.fn() });

    const { container } = render(
      <MemoryRouter initialEntries={['/proxy-inspectors/profile-1']}>
        <Routes><Route path="/proxy-inspectors/:profileId" element={<PublicInspectorProfilePage />} /></Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Example Inspector' })).toBeInTheDocument();
    expect(container).not.toHaveTextContent('Confidential Legal Name');
    expect(container).not.toHaveTextContent('PRIVATE-NATIONAL-ID');
    expect(container).not.toHaveTextContent('/api/private/secret-document');
  });
});
