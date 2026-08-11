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

  it('uploads project property imports as multipart file field', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { importSessionId: 'import-1', project: { id: 'project-1' }, status: 'ready', summary: {}, rows: [] } });
    const file = new File(['title,price,propertyType'], 'units.csv', { type: 'text/csv' });
    await projectService.uploadProjectPropertyImport('project-1', file);
    expect(api.post).toHaveBeenCalledWith('/projects/project-1/property-imports', expect.any(FormData));
    const formData = vi.mocked(api.post).mock.calls[0][1] as FormData;
    expect(formData.get('file')).toBe(file);
  });

  it('downloads project import template as a blob', async () => {
    const blob = new Blob(['title,price,propertyType'], { type: 'text/csv' });
    vi.mocked(api.get).mockResolvedValue({ data: blob });
    await expect(projectService.downloadProjectPropertyImportTemplate('project-1')).resolves.toBe(blob);
    expect(api.get).toHaveBeenCalledWith('/projects/project-1/property-imports/template', { responseType: 'blob' });
  });

  it('edits import rows and strips empty import list params', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { importSessionId: 'import-1', project: { id: 'project-1' }, status: 'ready', summary: {}, rows: [] } });
    vi.mocked(api.get).mockResolvedValue({ data: { imports: [], total: 0, page: 1, limit: 20 } });
    await projectService.editProjectPropertyImportRow('project-1', 'import-1', 2, { title: 'Unit A', price: 1000 });
    expect(api.patch).toHaveBeenCalledWith('/projects/project-1/property-imports/import-1/rows/2', { title: 'Unit A', price: 1000 });
    await projectService.listProjectPropertyImports('project-1', { page: 1, limit: undefined });
    expect(api.get).toHaveBeenCalledWith('/projects/project-1/property-imports', { params: { page: 1 } });
  });
});
