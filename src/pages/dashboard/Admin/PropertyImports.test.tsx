import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { projectService } from '../../../services/projectService';
import type { ProjectImportSession } from '../../../types';
import AdminPropertyImports from './PropertyImports';

vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../services/projectService', () => ({ projectService: { listAdminPropertyImports: vi.fn(), getAdminPropertyImport: vi.fn() } }));

describe('staff property import inspection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('displays the server-returned row validation details on the authorized read screen', async () => {
    vi.mocked(projectService.getAdminPropertyImport).mockResolvedValue({
      importSessionId: 'import-1', project: { id: 'project-1', name: 'Project' }, status: 'failed',
      summary: { totalRows: 1, validRows: 0, invalidRows: 1, removedRows: 0, importedRows: 0, failedRows: 1 },
      rows: [{ rowNumber: 4, status: 'failed', data: { title: 'Unit A' }, errors: [{ field: 'unitIdentifier', code: 'DUPLICATE', message: 'Duplicate project-unit identifier.' }], warnings: [] }],
    } as ProjectImportSession);
    render(<MemoryRouter initialEntries={['/dashboard/admin/property-imports/import-1']}>
      <Routes><Route path="/dashboard/admin/property-imports/:importId" element={<AdminPropertyImports />} /></Routes>
    </MemoryRouter>);

    await userEvent.click(await screen.findByText('Inspect row messages'));
    expect(await screen.findByText(/unitIdentifier \(DUPLICATE\): Duplicate project-unit identifier/)).toBeInTheDocument();
  });
});
