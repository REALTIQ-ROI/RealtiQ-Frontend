import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../../services/authService';
import RegistrationSuccess from './RegistrationSuccess';

vi.mock('../../services/authService', () => ({ authService: { resendVerificationEmail: vi.fn() } }));

describe('RegistrationSuccess', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a resend control with the initial cooldown using only ephemeral registration route state', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/registration-success', state: { email: ' Person@Example.com ', verificationRequestedAt: Date.now() } }]}>
        <Routes><Route path="/registration-success" element={<RegistrationSuccess />} /></Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Check Your Email' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/Resend available in (59|60) seconds/);
    expect(authService.resendVerificationEmail).not.toHaveBeenCalled();
    expect(screen.queryByText(/Person@Example.com/i)).not.toBeInTheDocument();
  });
});
