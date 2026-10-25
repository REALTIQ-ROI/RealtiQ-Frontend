import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { projectService } from '../../../services/projectService';
import type { ProjectDetail } from '../../../types';
import AdminProjectDetails from './ProjectDetails';

vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../components/project/ProjectMediaGallery', () => ({ default: () => null }));
vi.mock('../../../components/property/PropertyCard', () => ({ default: () => null }));
vi.mock('../../../services/projectService', () => ({
  projectService: {
    adminGetProject: vi.fn(),
    getProjectProperties: vi.fn(),
  },
}));

describe('staff project detail', () => {
  it('shows an unpublished staff project without requiring public child inventory', async () => {
    vi.mocked(projectService.adminGetProject).mockResolvedValue({
      project: {
        _id: 'project-1',
        name: 'Draft Estate',
        status: 'draft',
        projectType: 'estate',
        isPublished: false,
        description: 'An unpublished project',
      } as ProjectDetail,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/projects/project-1']}>
        <Routes>
          <Route path="/dashboard/admin/projects/:id" element={<AdminProjectDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Draft Estate' })).toBeInTheDocument();
    expect(screen.getByText('No publicly visible units returned for this project.')).toBeInTheDocument();
    expect(projectService.getProjectProperties).not.toHaveBeenCalled();
  });
});
