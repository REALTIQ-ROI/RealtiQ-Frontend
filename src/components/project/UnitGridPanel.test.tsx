import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../lib/axios';
import { projectService } from '../../services/projectService';
import UnitGridPanel from './UnitGridPanel';

vi.mock('../../services/projectService', () => ({ projectService: { getUnitGrid: vi.fn(), editUnitGrid: vi.fn(), createUnitGridJob: vi.fn(), getUnitGridJob: vi.fn(), cancelUnitGridJob: vi.fn() } }));
vi.mock('../../services/stepUpService', () => ({ stepUpService: { start: vi.fn(), verify: vi.fn(), undoUnitGridOperation: vi.fn() } }));

const grid = { project: { id: 'p', name: 'Project' }, projectVersion: 8,
  items: [{ _id: 'unit-1', publicReference: 'RTQ-UNIT-1', rawOverrides: { bedrooms: 0 }, effectiveFields: { bedrooms: 0, currency: 'NGN' }, fieldSources: { bedrooms: { sourceLevel: 'unit', state: 'overridden' } }, version: 4, readiness: { publicationState: 'unpublished', problems: false, blockers: [] } }],
  pagination: { page: 1, limit: 25, total: 1, pages: 1 }, filters: {} };

describe('canonical unit grid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectService.getUnitGrid).mockResolvedValue(grid);
    vi.mocked(projectService.editUnitGrid).mockResolvedValue({ operation: { id: 'op', state: 'applied', action: 'field_edit', undoAvailable: false, rowCount: 1, createdAt: '', rows: [] }, projectVersion: 9, replayed: false });
  });

  it('shows explicit zero and provenance and sends current versions for an explicit edit', async () => {
    render(<UnitGridPanel projectId="p" />);
    expect(await screen.findByText(/RTQ-UNIT-1/)).toBeInTheDocument();
    expect(screen.getByText(/Override: 0 \(explicit\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: /RTQ-UNIT-1/ }));
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Grid field value' }), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Apply to selected units' }));
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
    expect(await screen.findByText(/A project or unit version changed/)).toBeInTheDocument();
    vi.mocked(projectService.getUnitGrid).mockRejectedValueOnce(new Error('Refresh failed'));
    await userEvent.click(screen.getByRole('button', { name: 'Refresh versions and review before retrying' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply to selected units' })).toBeDisabled());
    expect(projectService.editUnitGrid).toHaveBeenCalledTimes(1);
  });
});
