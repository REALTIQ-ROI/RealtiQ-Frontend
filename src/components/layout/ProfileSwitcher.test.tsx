import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileSwitcher from './ProfileSwitcher';

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock('../../contexts/AuthContext', () => ({ useAuth: useAuthMock }));
vi.mock('../../services/profileService', () => ({
  profileService: { create: vi.fn() },
}));

const profile = (id: string, name: string, kind = 'buyer') => ({
  id,
  name,
  kind,
  structure: 'individual',
  status: 'active',
  verification: { status: 'not_submitted' },
});

describe('ProfileSwitcher navigation UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const activeProfile = profile('profile-1', 'Buyer account');
    useAuthMock.mockReturnValue({
      user: { role: 'buyer' },
      profiles: [activeProfile],
      activeProfile,
      switchProfile: vi.fn(),
      refreshProfiles: vi.fn(),
    });
  });

  it('keeps internal profile metadata out of the top bar and collapses profile creation', async () => {
    const user = userEvent.setup();
    render(<ProfileSwitcher />);

    expect(screen.getByText('Buyer account')).toBeInTheDocument();
    expect(screen.queryByText('staff · individual · active · not_submitted')).not.toBeInTheDocument();
    expect(screen.getByText('Profiles start private and unverified. Creating one does not grant verification or extra permissions.')).not.toBeVisible();
    expect(screen.getByRole('button', { name: 'Create profile' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create profile' }));
    expect(screen.getByText('Profiles start private and unverified. Creating one does not grant verification or extra permissions.')).toBeInTheDocument();
    expect(screen.getByLabelText('Profile name')).toBeInTheDocument();
  });

  it('shows profile names without backend status codes in the profile selector', () => {
    const activeProfile = profile('profile-1', 'Buyer account');
    useAuthMock.mockReturnValue({
      user: { role: 'buyer' },
      profiles: [activeProfile, profile('profile-2', 'Alternate buyer')],
      activeProfile,
      switchProfile: vi.fn(),
      refreshProfiles: vi.fn(),
    });
    render(<ProfileSwitcher />);

    const selector = screen.getByLabelText('Active profile');
    expect(selector).toHaveValue('profile-1');
    expect(screen.getByRole('option', { name: 'Alternate buyer' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Buyer account' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /active|not_submitted/i })).not.toBeInTheDocument();
  });

  it('does not allow admin accounts to create profiles and keeps profile switching available', () => {
    const activeProfile = profile('profile-1', 'Platform Admin', 'staff');
    useAuthMock.mockReturnValue({
      user: { role: 'admin' },
      profiles: [activeProfile, profile('profile-2', 'Buyer account')],
      activeProfile,
      switchProfile: vi.fn(),
      refreshProfiles: vi.fn(),
    });

    render(<ProfileSwitcher />);

    expect(screen.getByLabelText('Active profile')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create profile' })).not.toBeInTheDocument();
    expect(screen.queryByText('Profile type')).not.toBeInTheDocument();
  });

  it('does not allow profile creation from the admin layout even if another profile is active', () => {
    const activeProfile = profile('profile-1', 'Buyer account');
    useAuthMock.mockReturnValue({
      user: { role: 'buyer' },
      profiles: [activeProfile, profile('profile-2', 'Owner account', 'owner')],
      activeProfile,
      switchProfile: vi.fn(),
      refreshProfiles: vi.fn(),
    });

    render(<ProfileSwitcher allowCreate={false} />);

    expect(screen.getByLabelText('Active profile')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create profile' })).not.toBeInTheDocument();
  });

  it('does not expose profile creation while a staff profile is active', () => {
    const activeProfile = profile('profile-1', 'Platform Admin', 'staff');
    useAuthMock.mockReturnValue({
      user: { role: 'buyer' },
      profiles: [activeProfile],
      activeProfile,
      switchProfile: vi.fn(),
      refreshProfiles: vi.fn(),
    });

    render(<ProfileSwitcher />);

    expect(screen.queryByRole('button', { name: 'Create profile' })).not.toBeInTheDocument();
  });
});
