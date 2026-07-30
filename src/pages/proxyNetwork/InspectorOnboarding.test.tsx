import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../contexts/AuthContext';
import { proxyNetworkService } from '../../services/proxyNetworkService';
import { userService } from '../../services/userService';
import InspectorOnboarding from './InspectorOnboarding';

vi.mock('../../services/userService', () => ({
  userService: {
    fetchUserById: vi.fn(),
  },
}));

vi.mock('../../services/proxyNetworkService', () => ({
  proxyNetworkService: {
    getPublicInspector: vi.fn(),
    submitKyc: vi.fn(),
  },
}));

describe('Property Agent KYC onboarding', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
    vi.mocked(userService.fetchUserById).mockImplementation(async () => JSON.parse(localStorage.getItem('user') || 'null'));
    vi.mocked(proxyNetworkService.getPublicInspector).mockResolvedValue({
      _id: 'profile-1',
      user: { _id: 'agent-1', name: 'Ada Agent' },
      professionalType: 'civil_engineer',
      availabilityStatus: 'available',
      verificationStatus: undefined,
      ratingAverage: 0,
      ratingCount: 0,
      completedJobs: 0,
      createdAt: new Date().toISOString(),
    });
  });

  it.each(['not submitted', 'not_submitted'])('shows the secure KYC form for backend status "%s"', (status) => {
    localStorage.setItem('user', JSON.stringify({
      _id: 'agent-1',
      name: 'Ada Agent',
      email: 'ada@example.com',
      role: 'proxy_inspector',
      emailVerified: true,
      kyc: { status },
    }));

    render(
      <MemoryRouter>
        <AuthProvider>
          <InspectorOnboarding />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Secure KYC submission' })).toBeInTheDocument();
    expect(screen.getByLabelText('Full legal name')).toBeInTheDocument();
    expect(screen.getByLabelText('Identity document (required image)')).toBeInTheDocument();
  });

  it('shows approved when the public profile has been approved even if the stored KYC status is stale', async () => {
    localStorage.setItem('user', JSON.stringify({
      _id: 'agent-1',
      name: 'Ada Agent',
      email: 'ada@example.com',
      role: 'proxy_inspector',
      emailVerified: true,
      kyc: { status: 'under_review' },
    }));
    vi.mocked(proxyNetworkService.getPublicInspector).mockResolvedValueOnce({
      _id: 'profile-1',
      user: { _id: 'agent-1', name: 'Ada Agent' },
      professionalType: 'civil_engineer',
      availabilityStatus: 'available',
      verificationStatus: 'approved',
      ratingAverage: 0,
      ratingCount: 0,
      completedJobs: 0,
      createdAt: new Date().toISOString(),
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <InspectorOnboarding />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'approved' })).toBeInTheDocument();
    expect(screen.getByText(/Your professional profile is approved/i)).toBeInTheDocument();
  });
});
