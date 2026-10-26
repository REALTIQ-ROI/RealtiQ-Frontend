import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../../lib/axios';
import ProjectPropertyImports from './ProjectPropertyImports';

const mocks = vi.hoisted(() => ({
  manage: vi.fn(), schema: vi.fn(), imports: vi.fn(), session: vi.fn(), template: vi.fn(), confirm: vi.fn(), retry: vi.fn(),
  stepUpStart: vi.fn(), stepUpVerify: vi.fn(), upload: vi.fn(),
}));

vi.mock('../../../services/projectService', () => ({ projectService: {
  getProjectManage: mocks.manage,
  getProjectPropertyImportSchema: mocks.schema,
  listProjectPropertyImports: mocks.imports,
  getProjectPropertyImport: mocks.session,
  downloadProjectPropertyImportTemplate: mocks.template,
  confirmProjectPropertyImport: mocks.confirm,
  retryFailedProjectPropertyImportRows: mocks.retry,
  uploadProjectPropertyImport: mocks.upload,
  editProjectPropertyImportRow: vi.fn(),
  removeProjectPropertyImportRow: vi.fn(),
  restoreProjectPropertyImportRow: vi.fn(),
  cancelProjectPropertyImport: vi.fn(),
} }));
vi.mock('../../../services/stepUpService', () => ({ stepUpService: { start: mocks.stepUpStart, verify: mocks.stepUpVerify } }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ activeProfile: { id: 'profile-1' }, token: 'session-1' }) }));
vi.mock('../../../components/layout/LandlordPortalLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const readySession = {
  importSessionId: 'import-1', project: { id: 'project-1', name: 'Project' }, status: 'ready' as const,
  originalFileName: 'units.csv', summary: { totalRows: 1, validRows: 1, invalidRows: 0, removedRows: 0, importedRows: 0, failedRows: 0 },
  rows: [{ rowNumber: 1, status: 'valid' as const, data: { title: 'Unit A', price: 0 }, errors: [], warnings: [] }],
};

describe('project property import flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('activeProfileId', 'profile-1');
    localStorage.setItem('token', 'session-1');
    mocks.manage.mockResolvedValue({ project: { _id: 'project-1', name: 'Project' } });
    mocks.schema.mockResolvedValue({ limits: { maxRows: 1000, maxFileMB: 5, expiryHours: 24 }, requiredFields: ['title'], delimiter: '|', fields: [{ name: 'title', required: true }, { name: 'price', required: false }], unsupportedFields: [] });
    mocks.imports.mockResolvedValue({ imports: [], total: 0, page: 1, limit: 20 });
    mocks.session.mockResolvedValue(readySession);
    mocks.stepUpStart.mockResolvedValue({ challengeId: 'challenge-1', expiresAt: new Date(Date.now() + 60_000).toISOString(), method: 'totp' });
    mocks.stepUpVerify.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue({ ...readySession, status: 'queued' });
  });

  it('initiates step-up for the exact confirm path and reports the accepted import as queued', async () => {
    render(<MemoryRouter initialEntries={['/dashboard/landlord/projects/project-1/imports/import-1']}>
      <Routes><Route path="/dashboard/landlord/projects/:id/imports/:importId" element={<ProjectPropertyImports />} /></Routes>
    </MemoryRouter>);

    await userEvent.click(await screen.findByRole('button', { name: 'Import Properties' }));
    expect(mocks.stepUpStart).toHaveBeenCalledWith('POST', '/api/projects/project-1/property-imports/import-1/confirm', {});
    await userEvent.type(screen.getByRole('textbox', { name: 'Six-digit authenticator code' }), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith('project-1', 'import-1', {}, 'challenge-1'));
    expect(await screen.findByText(/This import is queued/i)).toBeInTheDocument();
  });

  it('shows an explicit zero price in the staged preview', async () => {
    render(<MemoryRouter initialEntries={['/dashboard/landlord/projects/project-1/imports/import-1']}>
      <Routes><Route path="/dashboard/landlord/projects/:id/imports/:importId" element={<ProjectPropertyImports />} /></Routes>
    </MemoryRouter>);
    await screen.findByText('Unit A');
    const previewRow = screen.getByRole('row', { name: /Unit A/ });
    expect(within(previewRow).getByText('0')).toBeInTheDocument();
  });

  it('pages through the documented project import history', async () => {
    mocks.imports.mockResolvedValueOnce({ imports: [], total: 25, page: 1, limit: 20 })
      .mockResolvedValueOnce({ imports: [], total: 25, page: 2, limit: 20 });
    render(<MemoryRouter initialEntries={['/dashboard/landlord/projects/project-1/imports']}>
      <Routes><Route path="/dashboard/landlord/projects/:id/imports" element={<ProjectPropertyImports />} /></Routes>
    </MemoryRouter>);
    expect(await screen.findByText('Page 1 of 2 · 25 imports')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next history' }));
    await waitFor(() => expect(mocks.imports).toHaveBeenLastCalledWith('project-1', { page: 2, limit: 20 }));
    expect(screen.getByText('Page 2 of 2 · 25 imports')).toBeInTheDocument();
  });

  it('does not blindly retry a file after an ambiguous staging failure', async () => {
    mocks.upload.mockRejectedValueOnce(new ApiRequestError('Unable to connect. Check your internet connection.'));
    render(<MemoryRouter initialEntries={['/dashboard/landlord/projects/project-1/imports']}>
      <Routes><Route path="/dashboard/landlord/projects/:id/imports" element={<ProjectPropertyImports />} /></Routes>
    </MemoryRouter>);
    const file = new File(['title\nUnit A'], 'units.csv', { type: 'text/csv' });
    await userEvent.upload(await screen.findByLabelText('Select CSV/XLSX'), file);
    expect(await screen.findByRole('button', { name: 'Check import history' })).toBeInTheDocument();
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Check import history' }));
    expect(await screen.findByRole('button', { name: 'I reviewed history — stage this file again' })).toBeInTheDocument();
    expect(mocks.upload).toHaveBeenCalledTimes(1);
  });

  it('requires a status check before an ambiguous import submission can be retried', async () => {
    mocks.confirm.mockRejectedValueOnce(new ApiRequestError('The import response is uncertain.'));
    render(<MemoryRouter initialEntries={['/dashboard/landlord/projects/project-1/imports/import-1']}>
      <Routes><Route path="/dashboard/landlord/projects/:id/imports/:importId" element={<ProjectPropertyImports />} /></Routes>
    </MemoryRouter>);
    await userEvent.click(await screen.findByRole('button', { name: 'Import Properties' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Six-digit authenticator code' }), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
    expect(await screen.findByText(/import submission response was ambiguous/)).toBeInTheDocument();
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Check current import state' }));
    expect(await screen.findByRole('button', { name: 'I reviewed the state — start a new secure attempt' })).toBeInTheDocument();
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
  });
});
