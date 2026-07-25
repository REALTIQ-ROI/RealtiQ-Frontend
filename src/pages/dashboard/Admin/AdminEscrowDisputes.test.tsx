import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { escrowService } from '../../../services/escrowService';
import AdminEscrowDisputes from './AdminEscrowDisputes';

vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../services/escrowService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../services/escrowService')>();
  return { ...original, escrowService: { ...original.escrowService, listAdminDisputes: vi.fn() } };
});

describe('AdminEscrowDisputes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(escrowService.listAdminDisputes).mockResolvedValue({
      items: [],
      pagination: { page: 2, limit: 20, total: 0, pages: 1 },
    });
  });

  it('maps server-side pagination, status, and search filters to the API', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/escrow-disputes?page=2&status=open&search=lekki']}>
        <Routes><Route path="/dashboard/admin/escrow-disputes" element={<AdminEscrowDisputes />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('No disputes found')).toBeInTheDocument();
    await waitFor(() => expect(escrowService.listAdminDisputes).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
      status: 'open',
      search: 'lekki',
    }));
  });
});
