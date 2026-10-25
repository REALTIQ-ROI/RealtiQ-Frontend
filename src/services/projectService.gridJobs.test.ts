import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { projectService } from './projectService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

describe('unit-grid job reads and cancellation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the project-scoped job route and preserves the safe job DTO', async () => {
    const job = { status: 'partial', rows: [{ status: 'conflict', code: 'CONFLICT_LISTING_VERSION' }] };
    vi.mocked(api.get).mockResolvedValue({ data: { job } });
    expect(await projectService.getUnitGridJob('project 1', 'job/1')).toBe(job);
    expect(api.get).toHaveBeenCalledWith('/projects/project%201/unit-grid/jobs/job%2F1');
  });

  it('uses the documented no-body cooperative cancel action', async () => {
    const job = { status: 'cancelled' };
    vi.mocked(api.post).mockResolvedValue({ data: { job } });
    expect(await projectService.cancelUnitGridJob('project 1', 'job/1')).toBe(job);
    expect(api.post).toHaveBeenCalledWith('/projects/project%201/unit-grid/jobs/job%2F1/cancel');
  });

  it('reads the versioned grid with bounded pagination', async () => {
    const grid = { project: { id: 'p', name: 'Project' }, projectVersion: 8, items: [], pagination: { page: 2, limit: 25, total: 30, pages: 2 }, filters: {} };
    vi.mocked(api.get).mockResolvedValue({ data: grid });
    expect(await projectService.getUnitGrid('p', { page: 2, limit: 25, sort: 'newest' })).toBe(grid);
    expect(api.get).toHaveBeenCalledWith('/projects/p/unit-grid', { params: { page: 2, limit: 25, sort: 'newest' } });
  });

  it('submits the exact bounded mutation and job bodies', async () => {
    const direct = { operationKey: 'grid_12345678', expectedProjectVersion: 8, rows: [{ unitId: 'u', expectedVersion: 4, canonicalFieldMutations: [{ field: 'bedrooms', operation: 'set' as const, value: 0 }] }] };
    vi.mocked(api.post).mockResolvedValueOnce({ data: { operation: { id: 'o' }, projectVersion: 9, replayed: false } }).mockResolvedValueOnce({ data: { job: { id: 'j', state: 'queued' } } });
    await projectService.editUnitGrid('p', direct);
    expect(api.post).toHaveBeenCalledWith('/projects/p/unit-grid/bulk', direct);
    const job = { operationKey: 'job_12345678', expectedProjectVersion: 9, action: 'availability' as const, actionOptions: { targetAvailability: 'Under Offer' }, rows: [{ unitId: 'u', expectedVersion: 5 }] };
    await projectService.createUnitGridJob('p', job);
    expect(api.post).toHaveBeenCalledWith('/projects/p/unit-grid/jobs', job);
  });

  it('sends project publication with the bound challenge header', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { project: { _id: 'p', isPublished: true, publication: { published: true, publishedUnitCount: 1, blockedUnitCount: 0, blockedUnits: [] } } } });
    const body = { expectedVersion: 8, publicationAction: 'publish_all_ready' as const };
    const result = await projectService.publishProject('p', body, 'challenge');
    expect(api.patch).toHaveBeenCalledWith('/projects/p', body, { headers: { 'X-Step-Up-Challenge': 'challenge' } });
    expect(result.project.publication?.publishedUnitCount).toBe(1);
  });
});
