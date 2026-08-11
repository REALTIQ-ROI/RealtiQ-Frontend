import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { projectService } from './projectService';

vi.mock('../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('projectService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists public projects with search and child property filters', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { projects: [], total: 0, page: 1, limit: 20 } });
    await projectService.listProjects({
      search: 'palm',
      projectType: 'estate',
      city: 'Lekki',
      propertyType: 'apartment',
      bedrooms: 3,
      listingType: 'off_plan',
      developmentStatus: 'foundation',
      availableOnly: true,
      page: 1,
      limit: 20,
    });
    expect(api.get).toHaveBeenCalledWith('/projects', {
      params: {
        search: 'palm',
        projectType: 'estate',
        city: 'Lekki',
        propertyType: 'apartment',
        bedrooms: 3,
        listingType: 'off_plan',
        developmentStatus: 'foundation',
        availableOnly: true,
        page: 1,
        limit: 20,
      },
    });
  });

  it('does not send owner id from create project payload', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { project: { _id: 'project-1', name: 'Palm', slug: 'palm', projectType: 'estate', status: 'draft' } } });
    await projectService.createProject({
      name: 'Palm',
      projectType: 'estate',
      description: 'A project',
      state: 'Lagos',
      city: 'Lekki',
      media: [{ url: 'https://example.com/a.jpg', type: 'image', isCover: true }],
    });
    expect(api.post).toHaveBeenCalledWith('/projects', expect.not.objectContaining({ owner: expect.anything(), ownerId: expect.anything() }));
  });

  it('uses admin moderation endpoints', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { project: { _id: 'project-1' } } });
    await projectService.adminUpdateProjectStatus('project-1', { status: 'suspended', isPublished: false });
    expect(api.patch).toHaveBeenCalledWith('/admin/projects/project-1/status', { status: 'suspended', isPublished: false });
    await projectService.adminSetProjectFeatured('project-1', { featured: true });
    expect(api.patch).toHaveBeenCalledWith('/admin/projects/project-1/featured', { featured: true });
  });
});
