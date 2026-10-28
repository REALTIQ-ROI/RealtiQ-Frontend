import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { staffAccessChangeService } from '../../../services/staffAccessChangeService';
import StaffAccessChanges from './StaffAccessChanges';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  prepare: vi.fn(),
  decide: vi.fn(),
}));

vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../hooks/useBoundStepUp', () => ({
  useBoundStepUp: () => ({
    busy: false,
    challenge: null,
    error: null,
    begin: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
  }),
}));
vi.mock('../../../services/staffAccessChangeService', () => ({
  staffDepartments: ['executive', 'finance'],
  staffAccessChangeService: {
    list: mocks.list,
    prepare: mocks.prepare,
    decide: mocks.decide,
  },
}));

describe('StaffAccessChanges page response handling', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders changes normalized from the endpoint response', async () => {
    mocks.list.mockResolvedValue([{ id: 'change-1', targetIdentityId: 'target-1', departments: ['finance'], state: 'pending', preparedBy: 'staff-1', version: 1 }]);

    render(<MemoryRouter><StaffAccessChanges /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Staff access changes' })).toBeInTheDocument();
    expect(await screen.findByText('target-1')).toBeInTheDocument();
    expect(screen.queryByText(/endpoint returned an unsupported response/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Prepare access change' })).toBeInTheDocument();
    expect(staffAccessChangeService.list).toHaveBeenCalledOnce();
  });
});
