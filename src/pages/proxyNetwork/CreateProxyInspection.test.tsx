import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { proxyNetworkService } from '../../services/proxyNetworkService';
import CreateProxyInspection from './CreateProxyInspection';

vi.mock('../../components/layout/BuyerPortalLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock('../../contexts/PropertiesContext', () => ({
  useProperties: () => ({
    properties: [
      {
        _id: 'property-1',
        title: 'Lekki duplex',
        price: 1000000,
        location: 'Lekki',
        propertyType: 'house',
        bedrooms: 4,
        bathrooms: 4,
        description: 'Approved property',
        squareFeet: 500,
        paymentTypes: ['outright'],
        media: [],
        status: 'available',
        approvalStatus: 'approved',
        publicReference: 'RTQ-PROP-1',
      },
    ],
  }),
}));

vi.mock('../../services/proxyNetworkService', () => ({
  proxyNetworkService: {
    getPublicInspector: vi.fn(),
    listRequests: vi.fn(),
    createRequest: vi.fn(),
  },
}));

describe('Create Property Agent inspection request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(proxyNetworkService.getPublicInspector).mockResolvedValue({
      _id: 'profile-1',
      user: { _id: 'agent-user-1', name: 'Ada Okafor' },
      professionalType: 'civil_engineer',
      availabilityStatus: 'available',
      ratingAverage: 0,
      ratingCount: 0,
      completedJobs: 0,
      createdAt: '2026-08-01T00:00:00.000Z',
    });
    vi.mocked(proxyNetworkService.listRequests).mockResolvedValue({
      requests: [],
      total: 0,
      page: 1,
      limit: 5,
    });
    vi.mocked(proxyNetworkService.createRequest).mockResolvedValue({
      _id: 'request-1',
      property: 'property-1',
      buyer: 'buyer-1',
      inspector: 'agent-user-1',
      inspectorProfile: 'profile-1',
      requestedServices: ['photos'],
      status: 'requested',
      buyerPriceConfirmed: false,
      inspectorPriceConfirmed: false,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    });
  });

  it('shows the selected Property Agent name without exposing an editable inspector id field', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[{
        pathname: '/buyer/proxy-inspections/new',
        search: '?propertyId=property-1&inspectorId=agent-user-1',
        state: { inspectorName: 'Ada Okafor' },
      }]}>
        <Routes>
          <Route path="/buyer/proxy-inspections/new" element={<CreateProxyInspection />} />
          <Route path="/buyer/proxy-inspections/request-1" element={<p>Created</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Ada Okafor')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Inspector user ID/i)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('agent-user-1')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Review request' }));
    expect(proxyNetworkService.listRequests).toHaveBeenCalledWith(expect.objectContaining({
      property: 'property-1',
      inspector: 'agent-user-1',
    }));
    expect(screen.getByText('Selected Property Agent')).toBeInTheDocument();
    expect(screen.getByText('Ada Okafor')).toBeInTheDocument();
    expect(screen.queryByText('agent-user-1')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Send private request' }));
    expect(proxyNetworkService.createRequest).toHaveBeenCalledWith(expect.objectContaining({
      propertyId: 'property-1',
      inspectorId: 'agent-user-1',
    }));
  });

  it('blocks duplicate requests for the same property and Property Agent', async () => {
    const user = userEvent.setup();
    vi.mocked(proxyNetworkService.listRequests).mockResolvedValue({
      requests: [{
        _id: 'request-existing',
        property: 'property-1',
        buyer: 'buyer-1',
        inspector: 'agent-user-1',
        inspectorProfile: 'profile-1',
        requestedServices: ['photos'],
        status: 'requested',
        buyerPriceConfirmed: false,
        inspectorPriceConfirmed: false,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      }],
      total: 1,
      page: 1,
      limit: 5,
    });

    render(
      <MemoryRouter initialEntries={[{
        pathname: '/buyer/proxy-inspections/new',
        search: '?propertyId=property-1&inspectorId=agent-user-1',
        state: { inspectorName: 'Ada Okafor' },
      }]}>
        <Routes>
          <Route path="/buyer/proxy-inspections/new" element={<CreateProxyInspection />} />
          <Route path="/buyer/proxy-inspections/request-existing" element={<p>Existing request</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Review request' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('You already have a Property Agent inspection request for this property with this Property Agent.');
    expect(screen.getByRole('link', { name: 'Open existing request.' })).toHaveAttribute('href', '/buyer/proxy-inspections/request-existing');
    expect(proxyNetworkService.createRequest).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Review request' })).not.toBeInTheDocument();
  });
});
