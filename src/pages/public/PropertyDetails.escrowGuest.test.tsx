import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { propertyService } from '../../services/propertyService';
import type { CanonicalFieldDictionary } from '../../services/canonicalFieldService';
import { createCanonicalFieldDictionaryFixture } from '../../test/canonicalFieldDictionaryFixture';
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
const dictionaryMocks = vi.hoisted(() => ({ dictionary: null as CanonicalFieldDictionary | null }));
const authMocks = vi.hoisted(() => ({
  user: null as { role: string } | null,
  isAuthenticated: false,
  activeProfile: null as { id: string; kind: string } | null,
}));
const tourMocks = vi.hoisted(() => ({ getAvailability: vi.fn(), requestTour: vi.fn() }));

vi.mock('../../hooks/useCanonicalFieldDictionary', () => ({ useCanonicalFieldDictionary: () => ({ dictionary: dictionaryMocks.dictionary, loading: false, error: null, refresh: vi.fn() }) }));
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
  useAuth: () => authMocks,
}));
vi.mock('../../services/tourService', () => ({ tourService: tourMocks }));
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
    dictionaryMocks.dictionary = createCanonicalFieldDictionaryFixture();
    authMocks.user = null;
    authMocks.isAuthenticated = false;
    authMocks.activeProfile = null;
    tourMocks.getAvailability.mockReset().mockResolvedValue({ state: 'not_offered', slots: [] });
    tourMocks.requestTour.mockReset();
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

  it('does not expose appointment booking to a guest', () => {
    render(
      <MemoryRouter initialEntries={['/properties/RTQ-PROP-1']}>
        <Routes>
          <Route path="/properties/:id" element={<PropertyDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Sign in with a buyer profile to see current appointment availability for this property.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Appointment type')).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Virtual Paid/ })).not.toBeInTheDocument();
  });

  it('loads viewing availability for the selected buyer profile even if the account role differs', async () => {
    authMocks.user = { role: 'owner' };
    authMocks.isAuthenticated = true;
    authMocks.activeProfile = { id: 'buyer-profile', kind: 'buyer' };

    render(
      <MemoryRouter initialEntries={['/properties/RTQ-PROP-1']}>
        <Routes>
          <Route path="/properties/:id" element={<PropertyDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(tourMocks.getAvailability).toHaveBeenCalledTimes(3));
  });

  it('does not load viewing availability for a non-buyer profile on a buyer account', async () => {
    authMocks.user = { role: 'buyer' };
    authMocks.isAuthenticated = true;
    authMocks.activeProfile = { id: 'owner-profile', kind: 'owner' };

    render(
      <MemoryRouter initialEntries={['/properties/RTQ-PROP-1']}>
        <Routes>
          <Route path="/properties/:id" element={<PropertyDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Select a buyer profile to see current appointment availability for this property.')).toBeInTheDocument();
    expect(tourMocks.getAvailability).not.toHaveBeenCalled();
  });

  it('keeps paid viewing unavailable regardless of the property virtual tour', () => {
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

    expect(screen.queryByRole('option', { name: /Virtual Paid/ })).not.toBeInTheDocument();
    expect(screen.getByText('Sign in with a buyer profile to see current appointment availability for this property.')).toBeInTheDocument();
  });

  it('renders the public property page without inventing an area when no canonical area is returned', () => {
    currentProperty = { ...property, squareFeet: undefined };

    render(
      <MemoryRouter initialEntries={['/properties/RTQ-PROP-1']}>
        <Routes>
          <Route path="/properties/:id" element={<PropertyDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Not provided').length).toBeGreaterThan(0);
    expect(screen.queryByText(/sq ft/i)).not.toBeInTheDocument();
    expect(screen.getByText('List Price')).toBeInTheDocument();
  });

  it('renders amenity keys with dictionary labels and keeps the display-only custom amenity separate', () => {
    currentProperty = {
      ...property,
      amenities: ['boys_quarters', 'swimming_pool'],
      canonicalFields: { otherAmenity: 'Private rooftop garden' },
    };
    render(
      <MemoryRouter initialEntries={['/properties/RTQ-PROP-1']}>
        <Routes><Route path="/properties/:id" element={<PropertyDetails />} /></Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Boys’ Quarters (BQ)')).toBeInTheDocument();
    expect(screen.getByText('Swimming Pool')).toBeInTheDocument();
    expect(screen.getByText('Private rooftop garden')).toBeInTheDocument();
  });
});
