import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { PublicInspectorProfile } from '../../types/proxyNetwork';
import ProxyInspectorCard from './ProxyInspectorCard';

describe('ProxyInspectorCard', () => {
  it('renders safely when the public response omits linked-user identity and optional metrics', () => {
    const inspector = {
      _id: 'profile-1',
      user: undefined,
      professionalType: 'property_inspector',
      availabilityStatus: 'available',
      ratingAverage: null,
      ratingCount: null,
      completedJobs: null,
    } as unknown as PublicInspectorProfile;

    render(<MemoryRouter><ProxyInspectorCard inspector={inspector} propertyId="property-1" /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Verified professional' })).toBeInTheDocument();
    expect(screen.getByText('Not rated')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View profile' })).toHaveAttribute('href', '/proxy-inspectors/profile-1?propertyId=property-1');
  });

  it('does not navigate with a missing profile identifier', () => {
    const inspector = {
      _id: undefined,
      user: null,
      professionalType: 'property_inspector',
      availabilityStatus: 'available',
      ratingAverage: 0,
      ratingCount: 0,
      completedJobs: 0,
    } as unknown as PublicInspectorProfile;

    render(<MemoryRouter><ProxyInspectorCard inspector={inspector} /></MemoryRouter>);

    expect(screen.getByText('Profile details are unavailable.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View profile' })).not.toBeInTheDocument();
  });
});
