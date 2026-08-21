import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { propertyService } from '../../services/propertyService';
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
  virtualTour: {
    available: true,
    resolvedProvider: 'realsee',
    preferredProvider: 'realsee',
    fallbackUsed: false,
    providers: {
      realsee: { configured: true, available: true, enabled: true, status: 'ready' },
      matterport: { configured: false, available: false, enabled: false, status: 'not_configured' },
    },
    capabilities: { panorama: true, model3D: true, floorPlan: false, measurements: false, roomLabels: false, guidedTour: false, tags: false },
  },
};

let currentProperty = property;

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
    ? { data: currentProperty, loading: false, error: null, execute: vi.fn() }
    : { data: null, loading: false, error: null, execute: vi.fn() },
}));

const LoginDestination = () => {
  const location = useLocation();
  const state = location.state as { redirectTo?: string } | null;
  return <p>Buyer login destination: {state?.redirectTo}</p>;
};

describe('public property escrow action for guests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    currentProperty = property;
  });

  it('uses mobile-safe Nearby Properties cards and full-width touch actions', async () => {
    currentProperty = { ...property, coordinates: { lat: 6.447, lng: 3.473 } };
    vi.spyOn(propertyService, 'getNearbyProperties').mockResolvedValue([
      { _id: 'nearby-1', publicReference: 'RTQ-PROP-2', title: 'Nearby Apartment With A Long Property Name', coordinates: { lat: 6.448, lng: 3.474 }, paymentTypes: [] },
    ]);

    render(
      <MemoryRouter initialEntries={['/properties/RTQ-PROP-1']}>
        <Routes>
          <Route path="/properties/:id" element={<PropertyDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    const detailsLink = await screen.findByRole('link', { name: /View details/i });
    expect(detailsLink.closest('article')).toHaveClass('min-w-0');
    expect(detailsLink).toHaveClass('w-full', 'sm:w-auto');
    expect(screen.getByRole('button', { name: 'Open in Map' })).toHaveClass('w-full', 'sm:w-auto');
  });
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

  it('forces and locks virtual mode while the paid virtual tour type is selected', async () => {
    render(
      <MemoryRouter initialEntries={['/properties/RTQ-PROP-1']}>
        <Routes>
          <Route path="/properties/:id" element={<PropertyDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    const tourType = screen.getByLabelText('Tour Type');
    const tourMode = screen.getByLabelText('Mode');
    expect(tourMode).toHaveValue('physical');
    expect(tourMode).toBeEnabled();

    await userEvent.selectOptions(tourType, 'virtual_paid');
    expect(tourMode).toHaveValue('virtual');
    expect(tourMode).toBeDisabled();
    expect(screen.getByText('Virtual mode is required for this tour type.')).toBeInTheDocument();

    await userEvent.selectOptions(tourType, 'open_house');
    expect(tourMode).toBeEnabled();
  });

  it('prevents selecting a paid virtual tour when the Property has no available virtual tour', () => {
    currentProperty = {
      ...property,
      virtualTour: {
        ...property.virtualTour!,
        available: false,
        resolvedProvider: null,
        capabilities: { panorama: false, model3D: false, floorPlan: false, measurements: false, roomLabels: false, guidedTour: false, tags: false },
      },
    };

    render(
      <MemoryRouter initialEntries={['/properties/RTQ-PROP-1']}>
        <Routes>
          <Route path="/properties/:id" element={<PropertyDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('option', { name: 'Virtual Paid (Unavailable)' })).toBeDisabled();
    expect(screen.getByText('This property does not currently have a virtual tour available.')).toBeInTheDocument();
  });
});
