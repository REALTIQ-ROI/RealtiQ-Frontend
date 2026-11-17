import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectCard, ProjectDetail, Property } from '../../types';
import ProjectProperties from './ProjectProperties';

const mocks = vi.hoisted(() => ({
  getProject: vi.fn(),
  getProjectProperties: vi.fn(),
}));

vi.mock('../../services/projectService', () => ({
  projectService: {
    getProject: mocks.getProject,
    getProjectProperties: mocks.getProjectProperties,
  },
}));
vi.mock('../../services/inquiryService', () => ({ inquiryService: { createInquiry: vi.fn() } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ activeProfile: null, isAuthenticated: false }) }));
vi.mock('../../hooks/useCanonicalFieldDictionary', () => ({ useCanonicalFieldDictionary: () => ({ dictionary: null }) }));
vi.mock('../../components/layout/PublicLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('../../components/property/PropertyCard', () => ({ default: ({ property }: { property: Property }) => <article>{property.title}</article> }));
vi.mock('../../components/compare/CompareToggle', () => ({ default: () => <button type="button">Compare</button> }));
vi.mock('../../components/property/PropertyFiltersPanel', () => ({ default: () => <div /> }));
vi.mock('../../components/property/ActiveCatalogueFilters', () => ({ default: () => <div /> }));
vi.mock('../../components/property/CatalogueResultInsights', () => ({ default: () => <div /> }));
vi.mock('../../components/ui/LoadingState', () => ({ default: () => <div>Loading</div> }));
vi.mock('../../components/ui/ErrorState', () => ({ default: ({ message }: { message: string }) => <div role="alert">{message}</div> }));
vi.mock('../../components/ui/ModalPortal', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const projectCard: ProjectCard = {
  _id: 'project-1', name: 'Harbour View', slug: 'harbour-view', projectType: 'estate', status: 'ongoing',
  isPublished: true, virtualTourProviderOverride: null, location: { state: 'Lagos' }, totalUnits: 2,
  availableUnits: 2, isFeatured: false,
};
const unit = (id: string, title: string, unitTypeName: string): Property => ({
  _id: id, title, publicReference: `RTQ-${id}`, price: 25000000, currency: 'NGN', location: 'Lagos',
  propertyType: 'two_bedroom_flat', bedrooms: 2, bathrooms: 2, description: '', paymentTypes: [], media: [],
  status: 'available', canonicalEffectiveFields: { unitTypeName },
});

const renderPage = () => render(
  <MemoryRouter initialEntries={['/projects/harbour-view/properties']}>
    <Routes><Route path="/projects/:slug/properties" element={<ProjectProperties />} /></Routes>
  </MemoryRouter>,
);

describe('public project unit display', () => {
  beforeEach(() => {
    mocks.getProject.mockReset();
    mocks.getProjectProperties.mockReset();
    mocks.getProjectProperties.mockResolvedValue({
      project: projectCard,
      properties: [unit('u1', 'Apartment 1', 'Two-bedroom apartments'), unit('u2', 'Apartment 2', 'Two-bedroom apartments')],
      total: 2, page: 1, limit: 20,
    });
    mocks.getProject.mockResolvedValue({ project: { ...projectCard, canonicalFields: { unitDisplayMode: 'grouped_by_unit_type' } } as ProjectDetail });
  });

  it('uses the developer layout and offers cards, list and table presentations', async () => {
    renderPage();

    expect(await screen.findByText(/Developer’s unit display preference: Grouped by unit type/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Two-bedroom apartments' })).toBeInTheDocument();
    expect(screen.getAllByText(/Apartment [12]/)).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Table' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Two-bedroom apartments')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Compare' })).toHaveLength(2);
  });

  it('keeps units visible individually if the public detail omits a recognized layout', async () => {
    mocks.getProject.mockResolvedValue({ project: { ...projectCard, canonicalFields: { unitDisplayMode: 'unrecognized' } } as ProjectDetail });
    renderPage();

    expect(await screen.findByRole('status')).toHaveTextContent('developer-selected unit layout was not returned');
    await waitFor(() => expect(screen.getAllByText(/Apartment [12]/)).toHaveLength(2));
  });
});
