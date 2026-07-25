import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Property } from '../../types';
import PropertyDetails from './PropertyDetails';

const property: Property = {
  _id: 'property-1',
  publicReference: 'RTQ-PROP-1',
  title: 'Escrow Home',
  price: 45_000_000,
  paymentTypes: ['escrow'],
  currency: 'NGN',
  location: 'Lekki, Lagos',
  propertyType: 'house',
  bedrooms: 4,
  bathrooms: 4,
  squareFeet: 3000,
  description: 'An approved property offered through escrow.',
  media: [],
  status: 'available',
  approvalStatus: 'approved',
  owner: { _id: 'landlord-1', name: 'Ada Landlord' },
};

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }));
vi.mock('../../components/layout/PublicLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../components/forms/InquiryForm', () => ({ default: () => null }));
vi.mock('../../components/property/PropertyGallery', () => ({ default: () => null }));
vi.mock('../../components/property/PropertyMeta', () => ({ default: () => null }));
vi.mock('../../components/title/PublicTitleDocuments', () => ({ default: () => null }));
vi.mock('../../components/title/TitleVerificationBadge', () => ({ default: () => null }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));
vi.mock('../../contexts/PropertiesContext', () => ({
  useProperties: () => ({
    buyProperty: vi.fn(),
    refreshProperties: vi.fn(),
  }),
}));
vi.mock('../../hooks/useAsync', () => ({
  useAsync: (_operation: unknown, executeImmediately: boolean) => executeImmediately
    ? { data: property, loading: false, error: null, execute: vi.fn() }
    : { data: null, loading: false, error: null, execute: vi.fn() },
}));

const LoginDestination = () => {
  const location = useLocation();
  const state = location.state as { redirectTo?: string } | null;
  return <p>Buyer login destination: {state?.redirectTo}</p>;
};

describe('public property escrow action for guests', () => {
  it('shows a buyer login CTA and preserves the escrow creation destination', async () => {
    render(
      <MemoryRouter initialEntries={['/properties/RTQ-PROP-1']}>
        <Routes>
          <Route path="/properties/:id" element={<PropertyDetails />} />
          <Route path="/login-to-purchase" element={<LoginDestination />} />
        </Routes>
      </MemoryRouter>,
    );

    const loginButton = await screen.findByRole('button', { name: 'Login to Create Payment Escrow' });
    expect(screen.queryByRole('button', { name: 'Create Escrow Payment' })).not.toBeInTheDocument();

    await userEvent.click(loginButton);

    expect(await screen.findByText(
      'Buyer login destination: /dashboard/buyer/escrows/create/RTQ-PROP-1',
    )).toBeInTheDocument();
  });
});
