import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { projectService } from '../../services/projectService';
import { stepUpService } from '../../services/stepUpService';
import UnitGridPanel from './UnitGridPanel';

vi.mock('../../services/projectService', () => ({ projectService: { getUnitGrid: vi.fn(), editUnitGrid: vi.fn(), createUnitGridJob: vi.fn(), getUnitGridJob: vi.fn(), cancelUnitGridJob: vi.fn() } }));
vi.mock('../../services/stepUpService', () => ({ stepUpService: { start: vi.fn(), verify: vi.fn(), undoUnitGridOperation: vi.fn() } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

const grid = { project: { id: 'p', name: 'Project' }, projectVersion: 8,
  items: [{ _id: 'unit-1', publicReference: 'RTQ-UNIT-1', rawOverrides: { bedrooms: 0 }, effectiveFields: { bedrooms: 0, currency: 'NGN' }, fieldSources: { bedrooms: { sourceLevel: 'unit', state: 'overridden' } }, version: 4, readiness: { publicationState: 'unpublished', problems: false, blockers: [] } }],
  pagination: { page: 1, limit: 25, total: 1, pages: 1 }, filters: {} };

describe('canonical unit grid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('activeProfileId', 'profile-1');
    localStorage.setItem('token', 'session-1');
    sessionStorage.clear();
    vi.mocked(useAuth).mockReturnValue({ activeProfile: { id: 'profile-1' }, token: 'session-1' } as ReturnType<typeof useAuth>);
    vi.mocked(projectService.getUnitGrid).mockResolvedValue(grid);
    vi.mocked(projectService.editUnitGrid).mockResolvedValue({ operation: { id: 'op', state: 'applied', action: 'field_edit', undoAvailable: false, rowCount: 1, createdAt: '', rows: [] }, projectVersion: 9, replayed: false });
    vi.mocked(projectService.createUnitGridJob).mockResolvedValue({ id: 'job-1', projectId: 'p', action: 'availability', state: 'queued', operationKey: 'grid_job_12345678', createdAt: '', startedAt: null, completedAt: null, progress: { total: 1, completed: 0, failed: 0, cancelled: 0, remaining: 1 }, cancellationRequested: false, rows: [] });
    vi.mocked(stepUpService.start).mockResolvedValue({ challengeId: 'challenge-1', expiresAt: new Date(Date.now() + 60_000).toISOString(), method: 'totp' });
    vi.mocked(stepUpService.verify).mockResolvedValue(undefined);
    vi.mocked(stepUpService.undoUnitGridOperation).mockResolvedValue({ operation: { state: 'undone' } });
  });

  it('shows explicit zero and provenance and sends current versions for an explicit edit', async () => {
    render(<UnitGridPanel projectId="p" />);
    expect(await screen.findByText(/RTQ-UNIT-1/)).toBeInTheDocument();
    expect(screen.getByText(/Override: 0 \(explicit\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: /RTQ-UNIT-1/ }));
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Grid field value' }), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Apply to selected units' }));
    expect(await screen.findByRole('list', { name: 'Selected units and versions' })).toHaveTextContent('RTQ-UNIT-1 · unit version 4');
    await userEvent.click(await screen.findByRole('button', { name: 'Apply changes' }));
    await waitFor(() => expect(projectService.editUnitGrid).toHaveBeenCalled());
    expect(vi.mocked(projectService.editUnitGrid).mock.calls[0][0]).toBe('p');
    expect(vi.mocked(projectService.editUnitGrid).mock.calls[0][1]).toMatchObject({ expectedProjectVersion: 8,
      rows: [{ unitId: 'unit-1', expectedVersion: 4, canonicalFieldMutations: [{ field: 'bedrooms', operation: 'set', value: 0 }] }] });
  });

  it('sends currency with price sorting and retains supported grid filters', async () => {
    render(<UnitGridPanel projectId="p" />);
    await screen.findByText(/RTQ-UNIT-1/);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Grid currency' }), 'USD');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sort grid' }), 'price_asc');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Grid availability filter' }), 'under_offer');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Problems only' }));
    await waitFor(() => expect(projectService.getUnitGrid).toHaveBeenLastCalledWith('p', expect.objectContaining({
      page: 1, sort: 'price_asc', currency: 'USD', availability: 'under_offer', problemsOnly: true,
    })));
  });

  it('keeps a conflicting edit blocked until fresh grid versions load', async () => {
    vi.mocked(projectService.editUnitGrid).mockRejectedValueOnce(new ApiRequestError('Version changed', { status: 409 }));
    render(<UnitGridPanel projectId="p" />);
    await screen.findByText(/RTQ-UNIT-1/);
    await userEvent.click(screen.getByRole('checkbox', { name: /RTQ-UNIT-1/ }));
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Grid field value' }), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Apply to selected units' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Apply changes' }));
    expect(await screen.findByText(/A project or unit version changed/)).toBeInTheDocument();
    vi.mocked(projectService.getUnitGrid).mockRejectedValueOnce(new Error('Refresh failed'));
    await userEvent.click(screen.getByRole('button', { name: 'Refresh versions and review before retrying' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply to selected units' })).toBeDisabled());
    expect(projectService.editUnitGrid).toHaveBeenCalledTimes(1);
  });

  it('creates a bounded availability job and excludes Sold as an availability target', async () => {
    render(<UnitGridPanel projectId="p" />);
    await screen.findByText(/RTQ-UNIT-1/);
    await userEvent.click(screen.getByRole('checkbox', { name: /RTQ-UNIT-1/ }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Grid job action' }), 'availability');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Target availability' }), 'Under Offer');
    await userEvent.click(screen.getByRole('button', { name: 'Queue selected job' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Queue job' }));
    await waitFor(() => expect(projectService.createUnitGridJob).toHaveBeenCalledWith('p', expect.objectContaining({
      expectedProjectVersion: 8,
      action: 'availability',
      actionOptions: { targetAvailability: 'Under Offer' },
      rows: [{ unitId: 'unit-1', expectedVersion: 4 }],
    })));
    expect(screen.getByRole('combobox', { name: 'Target availability' })).not.toHaveTextContent('Sold');
    await userEvent.click(screen.getByRole('checkbox', { name: /RTQ-UNIT-1/ }));
    expect(await screen.findByText(/active job is retained for refresh recovery/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Queue selected job' })).toBeDisabled();
  });

  it('withholds freshness confirmation while its backend policy is unavailable', async () => {
    render(<UnitGridPanel projectId="p" />);
    await screen.findByText(/RTQ-UNIT-1/);
    expect(screen.queryByRole('option', { name: /Confirm freshness/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Freshness confirmation is unavailable until the backend freshness policy/)).toBeInTheDocument();
  });

  it('edits documented unit occupancy values as canonical fields', async () => {
    render(<UnitGridPanel projectId="p" />);
    await screen.findByText(/RTQ-UNIT-1/);
    await userEvent.click(screen.getByRole('checkbox', { name: /RTQ-UNIT-1/ }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Grid field' }), 'occupancy');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Grid field value' }), 'Vacant possession');
    await userEvent.click(screen.getByRole('button', { name: 'Apply to selected units' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Apply changes' }));
    await waitFor(() => expect(projectService.editUnitGrid).toHaveBeenCalledWith('p', expect.objectContaining({
      expectedProjectVersion: 8,
      rows: [{ unitId: 'unit-1', expectedVersion: 4, canonicalFieldMutations: [{ field: 'occupancy', operation: 'set', value: 'Vacant possession' }] }],
    })));
  });

  it('uses the shared registry for additional canonical unit values and preserves zero', async () => {
    render(<UnitGridPanel projectId="p" />);
    await screen.findByText(/RTQ-UNIT-1/);
    await userEvent.click(screen.getByRole('checkbox', { name: /RTQ-UNIT-1/ }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Grid field' }), 'powderRooms');
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Grid field value' }), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Apply to selected units' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Apply changes' }));
    await waitFor(() => expect(projectService.editUnitGrid).toHaveBeenCalledWith('p', expect.objectContaining({
      rows: [{ unitId: 'unit-1', expectedVersion: 4, canonicalFieldMutations: [{ field: 'powderRooms', operation: 'set', value: 0 }] }],
    })));
  });

  it('allows an explicit false override and blocks a conditionally inapplicable field', async () => {
    render(<UnitGridPanel projectId="p" />);
    await screen.findByText(/RTQ-UNIT-1/);
    await userEvent.click(screen.getByRole('checkbox', { name: /RTQ-UNIT-1/ }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Grid field' }), 'allBedroomsEnSuite');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Grid field value' }), 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Apply to selected units' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Apply changes' }));
    await waitFor(() => expect(projectService.editUnitGrid).toHaveBeenCalledWith('p', expect.objectContaining({
      rows: [{ unitId: 'unit-1', expectedVersion: 4, canonicalFieldMutations: [{ field: 'allBedroomsEnSuite', operation: 'set', value: false }] }],
    })));

    vi.mocked(projectService.editUnitGrid).mockClear();
    await userEvent.click(screen.getByRole('checkbox', { name: /RTQ-UNIT-1/ }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Grid field' }), 'terraceFloors');
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Grid field value' }), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Apply to selected units' }));
    expect(await screen.findByText(/Terrace floors apply only/)).toBeInTheDocument();
    expect(projectService.editUnitGrid).not.toHaveBeenCalled();
  });

  it('binds the exact empty-body undo route before verifying and consuming the challenge', async () => {
    vi.mocked(projectService.editUnitGrid).mockResolvedValueOnce({ operation: { id: 'op-1', state: 'applied', action: 'field_edit', undoAvailable: true, undoExpiresAt: new Date(Date.now() + 60_000).toISOString(), rowCount: 1, createdAt: '', rows: [] }, projectVersion: 9, replayed: false });
    render(<UnitGridPanel projectId="p" />);
    await screen.findByText(/RTQ-UNIT-1/);
    await userEvent.click(screen.getByRole('checkbox', { name: /RTQ-UNIT-1/ }));
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Grid field value' }), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Apply to selected units' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Apply changes' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Undo with authenticator' }));
    expect(stepUpService.start).toHaveBeenCalledWith('POST', '/api/projects/p/unit-grid/operations/op-1/undo', {});
    await userEvent.type(screen.getByRole('textbox', { name: 'Six-digit authenticator code' }), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
    await waitFor(() => expect(stepUpService.verify).toHaveBeenCalledWith('challenge-1', '123456'));
    expect(stepUpService.undoUnitGridOperation).toHaveBeenCalledWith('p', 'op-1', 'challenge-1', {});
  });

  it('disables direct undo when the server reports that its undo window expired', async () => {
    vi.mocked(projectService.editUnitGrid).mockResolvedValueOnce({ operation: { id: 'op-expired', state: 'applied', action: 'field_edit', undoAvailable: true, undoExpiresAt: new Date(Date.now() + 60_000).toISOString(), rowCount: 1, createdAt: '', rows: [] }, projectVersion: 9, replayed: false });
    vi.mocked(stepUpService.undoUnitGridOperation).mockRejectedValueOnce(new ApiRequestError('Undo window expired', { status: 409, code: 'CONFLICT_GRID_UNDO_EXPIRED' }));
    render(<UnitGridPanel projectId="p" />);
    await screen.findByText(/RTQ-UNIT-1/);
    await userEvent.click(screen.getByRole('checkbox', { name: /RTQ-UNIT-1/ }));
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Grid field value' }), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Apply to selected units' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Apply changes' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Undo with authenticator' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Six-digit authenticator code' }), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
    expect(await screen.findByText(/Undo window expired \(CONFLICT_GRID_UNDO_EXPIRED\)/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Undo with authenticator' })).not.toBeInTheDocument();
  });

  it('refreshes a durable job before starting a job-row undo challenge', async () => {
    const jobWithUndo = { id: 'saved-job', projectId: 'p', action: 'field_edit', state: 'completed' as const, operationKey: 'grid_job_12345678', createdAt: '', startedAt: null, completedAt: '', progress: { total: 1, completed: 1, failed: 0, cancelled: 0, remaining: 0 }, cancellationRequested: false, rows: [{ index: 0, unitId: 'unit-1', state: 'completed', attempts: 1, undoAvailable: true, operationId: 'op-job-row' }] };
    sessionStorage.setItem('realtiq:unit-grid-job:p', 'saved-job');
    vi.mocked(projectService.getUnitGridJob).mockResolvedValue(jobWithUndo);
    render(<UnitGridPanel projectId="p" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Check status and undo with authenticator' }));
    await waitFor(() => expect(projectService.getUnitGridJob).toHaveBeenCalledTimes(2));
    expect(stepUpService.start).toHaveBeenCalledWith('POST', '/api/projects/p/unit-grid/operations/op-job-row/undo', {});
  });

  it('reopens the saved durable job after the grid is remounted', async () => {
    sessionStorage.setItem('realtiq:unit-grid-job:p', 'saved-job');
    const savedJob = { id: 'saved-job', projectId: 'p', action: 'availability', state: 'completed' as const, operationKey: 'grid_job_12345678', createdAt: '', startedAt: null, completedAt: '', progress: { total: 1, completed: 1, failed: 0, cancelled: 0, remaining: 0 }, cancellationRequested: false, rows: [] };
    vi.mocked(projectService.getUnitGridJob).mockResolvedValue(savedJob);
    render(<UnitGridPanel projectId="p" />);
    expect(await screen.findByRole('heading', { name: 'Job completed' })).toBeInTheDocument();
    expect(projectService.getUnitGridJob).toHaveBeenCalledWith('p', 'saved-job');
  });
});
