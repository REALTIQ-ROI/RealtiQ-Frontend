import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectCard as ProjectCardType } from '../../types';
import ProjectCard from './ProjectCard';

vi.mock('../../hooks/useCanonicalFieldDictionary', () => ({
  useCanonicalFieldDictionary: () => ({ dictionary: null, loading: false, error: null, refresh: vi.fn() }),
}));

const project = (overrides: Partial<ProjectCardType> = {}): ProjectCardType => ({
  _id: 'project-1',
  name: 'Lakeview Residences',
  slug: 'lakeview-residences',
  projectType: 'estate',
  status: 'ongoing',
  isPublished: true,
  virtualTourProviderOverride: null,
  location: { state: 'Lagos' },
  totalUnits: 12,
  availableUnits: 8,
  isFeatured: false,
  ...overrides,
});

const renderCard = (card: ProjectCardType, requirePublishedToView = false) => render(
  <MemoryRouter>
    <ProjectCard project={card} requirePublishedToView={requirePublishedToView} />
  </MemoryRouter>,
);

describe('ProjectCard visibility', () => {
  it('keeps internal project states off public discovery cards', () => {
    renderCard(project({ status: 'suspended', isPublished: false }));

    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByText(/suspended|unpublished/i)).not.toBeInTheDocument();
  });

  it('keeps project status labels out of buyer cards while retaining public project data', () => {
    renderCard(project({ status: 'ongoing', developer: { name: 'Harbour Homes' } }));

    expect(screen.getByText('Lakeview Residences')).toBeInTheDocument();
    expect(screen.queryByText('Ongoing')).not.toBeInTheDocument();
    expect(screen.queryByText(/unpublished/i)).not.toBeInTheDocument();
    expect(screen.getByText('Developer project')).toBeInTheDocument();
    expect(screen.getByText('Harbour Homes')).toBeInTheDocument();
  });

  it('retains publication status detail in the seller project workspace', () => {
    renderCard(project({ status: 'draft', isPublished: false }), true);

    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Unpublished')).toBeInTheDocument();
  });
});
