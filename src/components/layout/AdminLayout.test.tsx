import { fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminLayout from './AdminLayout';

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock('../../contexts/AuthContext', () => ({ useAuth: useAuthMock }));
vi.mock('../../hooks/useHasScrolled', () => ({ default: () => false }));
vi.mock('../admin/AdminGlobalSearch', () => ({ default: () => <div data-testid="admin-global-search" /> }));

describe('AdminLayout profile controls', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      user: { name: 'Platform Admin', role: 'admin' },
      logout: vi.fn(),
    });
  });

  it('does not show profile switching or profile creation in the admin console', () => {
    render(<MemoryRouter><AdminLayout><div>Admin dashboard</div></AdminLayout></MemoryRouter>);

    expect(screen.getByText('Admin dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('admin-global-search')).toBeInTheDocument();
    expect(screen.queryByLabelText('Active profile')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create profile' })).not.toBeInTheDocument();
  });
});

describe('AdminLayout sidebar navigation', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows one Settings link above Logout and no New Listing link', () => {
    render(<MemoryRouter><AdminLayout><div>Admin dashboard</div></AdminLayout></MemoryRouter>);

    const settingsLinks = screen.getAllByRole('link', { name: 'Settings' });
    expect(settingsLinks).toHaveLength(1);
    expect(settingsLinks[0]).toHaveAttribute('href', '/dashboard/admin/settings');
    expect(screen.getByRole('link', { name: /Policies/ })).toHaveAttribute('href', '/dashboard/admin/policies');
    expect(screen.queryByRole('link', { name: 'New Listing' })).not.toBeInTheDocument();
  });

  it('preserves its scroll position when navigating to another admin screen', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const top = this.tagName === 'ASIDE' ? 0 : this.getAttribute('aria-current') === 'page' ? 100 : 0;
      const height = this.tagName === 'ASIDE' ? 1000 : 40;
      return { x: 0, y: top, top, left: 0, right: 256, bottom: top + height, width: 256, height, toJSON: () => ({}) } as DOMRect;
    });

    const DashboardRoute = () => <AdminLayout><Link to="/dashboard/admin/manage-payments">Open Payments</Link></AdminLayout>;
    const PaymentsRoute = () => <AdminLayout><p>Payments content</p></AdminLayout>;
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard/admin']}>
        <Routes>
          <Route path="/dashboard/admin" element={<DashboardRoute />} />
          <Route path="/dashboard/admin/manage-payments" element={<PaymentsRoute />} />
        </Routes>
      </MemoryRouter>,
    );

    const originalSidebar = container.querySelector('aside');
    expect(originalSidebar).not.toBeNull();
    if (!originalSidebar) throw new Error('Admin sidebar was not rendered.');
    originalSidebar.scrollTop = 180;
    fireEvent.scroll(originalSidebar);
    fireEvent.click(screen.getByRole('link', { name: 'Open Payments' }));

    expect(await screen.findByText('Payments content')).toBeInTheDocument();
    const nextSidebar = container.querySelector('aside');
    expect(nextSidebar).not.toBe(originalSidebar);
    expect(nextSidebar?.scrollTop).toBe(180);
    expect(container.querySelector('aside a[aria-current="page"]')).toHaveAttribute('href', '/dashboard/admin/manage-payments');
  });

  it('scrolls an active admin tab into view when it is outside the sidebar viewport', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const top = this.tagName === 'ASIDE' ? 0 : this.getAttribute('aria-current') === 'page' ? 1000 : 0;
      const height = this.tagName === 'ASIDE' ? 400 : 40;
      return { x: 0, y: top, top, left: 0, right: 256, bottom: top + height, width: 256, height, toJSON: () => ({}) } as DOMRect;
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard/admin/manage-payments']}>
        <AdminLayout><p>Payments content</p></AdminLayout>
      </MemoryRouter>,
    );

    expect(container.querySelector('aside')?.scrollTop).toBeGreaterThan(0);
  });
});
