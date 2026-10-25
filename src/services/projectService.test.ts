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

  it('sends the changed project body and current version with an optional bound challenge', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { project: { _id: 'project-1', version: 9 } } });
    const body = { expectedVersion: 8, canonicalFieldMutations: [{ field: 'shortDescription', operation: 'set' as const, value: '' }], description: 'Updated' };
    await projectService.updateProject('project-1', body, 'challenge-1');
    expect(api.patch).toHaveBeenCalledWith('/projects/project-1', body, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
  });

  it('uses admin moderation endpoints', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { project: { _id: 'project-1' } } });
    await projectService.adminUpdateProjectStatus('project-1', { status: 'suspended' }, 'challenge-1');
    expect(api.patch).toHaveBeenCalledWith('/admin/projects/project-1/status', { status: 'suspended' }, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
    await projectService.adminSetProjectFeatured('project-1', { featured: true }, 'challenge-2');
    expect(api.patch).toHaveBeenCalledWith('/admin/projects/project-1/featured', { featured: true }, { headers: { 'X-Step-Up-Challenge': 'challenge-2' } });
  });

  it('uses only the nested unit-type routes and exact versioned DTOs', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { projectVersion: 8, unitTypes: [] } });
    await projectService.listUnitTypes('project-1');
    expect(api.get).toHaveBeenCalledWith('/projects/project-1/unit-types');
    vi.mocked(api.post).mockResolvedValue({ data: { unitType: { id: 'type-1', version: 0 }, projectVersion: 8 } });
    const createBody = { expectedVersion: 8, canonicalFields: { unitTypeName: 'Garden flat', category: 'houses', propertyType: 'flat', unitTypeQuantity: 2 } };
    await projectService.createUnitType('project-1', createBody);
    expect(api.post).toHaveBeenCalledWith('/projects/project-1/unit-types', createBody, undefined);
    vi.mocked(api.patch).mockResolvedValue({ data: { unitType: { id: 'type-1', version: 1 }, impact: {}, projectVersion: 9 } });
    const patchBody = { expectedVersion: 8, expectedTypeVersion: 0, canonicalFieldMutations: [{ field: 'bedrooms', operation: 'set', value: 2 }] };
    await projectService.updateUnitType('project-1', 'type-1', patchBody, 'step-up');
    expect(api.patch).toHaveBeenCalledWith('/projects/project-1/unit-types/type-1', patchBody, { headers: { 'X-Step-Up-Challenge': 'step-up' } });
  });

  it('preserves raw, effective and source-level unit-type fields from the documented list DTO', async () => {
    const response = { projectVersion: 9, unitTypes: [{ id: 'type-1', version: 2, projectVersion: 9,
      canonicalFields: { unitTypeName: 'Garden flat' }, effectiveFields: { bedrooms: 2, currency: 'NGN' },
      fieldSources: { bedrooms: { sourceLevel: 'unit_type', state: 'explicit' }, currency: { sourceLevel: 'project', state: 'inherited' } }, media: [] }] };
    vi.mocked(api.get).mockResolvedValue({ data: response });
    const result = await projectService.listUnitTypes('project-1');
    expect(result).toEqual(response);
    expect(api.get).toHaveBeenCalledWith('/projects/project-1/unit-types');
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
