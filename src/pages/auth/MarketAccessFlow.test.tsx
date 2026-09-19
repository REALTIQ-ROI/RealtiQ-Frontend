import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { MARKET_ACCESS_PATH, marketAuthPath, marketDestination } from '../../hooks/useMarketAccessIntent';
import Register from './Register';
import Login from './Login';
import VerifyEmail from './VerifyEmail';
import RegistrationSuccess from './RegistrationSuccess';
import Home from '../public/Home';
import ProtectedRoute from '../../routes/ProtectedRoute';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../services/authService', () => ({ authService: { verifyEmail: vi.fn() } }));
vi.mock('../../contexts/PropertiesContext', () => ({ useProperties: () => ({ properties: [], loading: false }) }));
vi.mock('../../components/layout/PublicLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../components/property/MediaPreview', () => ({ default: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const register = vi.fn();
const login = vi.fn();
const storageKey = 'realtiq.marketAccessIntent';
const Location = () => { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}</output>; };

function setup(entry: string) {
  return render(<MemoryRouter initialEntries={[entry]}>
    <Location />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registration-success" element={<RegistrationSuccess />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/dashboard/buyer" element={<p>Buyer dashboard</p>} />
      <Route path={MARKET_ACCESS_PATH} element={<p>Market payment destination</p>} />
      <Route element={<ProtectedRoute />}><Route path="/analytics/property-market" element={<p>Analytics</p>} /></Route>
    </Routes>
  </MemoryRouter>);
}

async function submitRegistration() {
  await userEvent.type(screen.getByLabelText('Full Name'), 'Market Buyer');
  await userEvent.type(screen.getByLabelText('Email Address'), 'buyer@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'Secure1!');
  await userEvent.click(screen.getByRole('button', { name: /Create Account & Continue/ }));
}

describe('public market analysis purchase flow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    register.mockResolvedValue({ user: { role: 'buyer' } });
    login.mockResolvedValue({ role: 'buyer' });
    vi.mocked(useAuth).mockReturnValue({ register, login, logout: vi.fn(), isAuthenticated: false, user: null, isLoading: false } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(authService.verifyEmail).mockResolvedValue({ message: 'Verified' });
  });

  it('advertises paid analysis publicly and carries its destination between signup and login', async () => {
    setup('/');
    await userEvent.click(screen.getByRole('link', { name: 'Sign Up for Market Analysis' }));
    expect(screen.getByTestId('location')).toHaveTextContent(marketAuthPath('/register', MARKET_ACCESS_PATH));
    await userEvent.click(screen.getByRole('link', { name: 'Sign In' }));
    expect(screen.getByTestId('location')).toHaveTextContent(marketAuthPath('/login', MARKET_ACCESS_PATH));
    await userEvent.click(screen.getByRole('link', { name: 'Create one' }));
    await submitRegistration();
    expect(await screen.findByRole('heading', { name: 'Check Your Email' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Login' })).toHaveAttribute('href', marketAuthPath('/login', MARKET_ACCESS_PATH));
    expect(localStorage.getItem(storageKey)).toContain(MARKET_ACCESS_PATH);
  });

  it('returns an immediately authenticated signup directly to payment', async () => {
    register.mockResolvedValue({ user: { role: 'buyer' }, token: 'session' });
    setup(marketAuthPath('/register', MARKET_ACCESS_PATH));
    await submitRegistration();
    expect(await screen.findByText('Market payment destination')).toBeInTheDocument();
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it('restores intent from a verification email opened without redirect parameters and continues after login', async () => {
    localStorage.setItem(storageKey, JSON.stringify({ destination: MARKET_ACCESS_PATH, createdAt: Date.now() }));
    setup('/verify-email?token=verification-token');
    await screen.findByRole('heading', { name: 'Email Verified' });
    await userEvent.click(screen.getByRole('link', { name: 'Proceed to Login' }));
    await userEvent.type(screen.getByLabelText('Email Address'), 'buyer@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Secure1!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByText('Market payment destination')).toBeInTheDocument();
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it('sends signed in homepage visitors directly to access', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true, user: { role: 'buyer' } } as ReturnType<typeof useAuth>);
    setup('/');
    await userEvent.click(screen.getByRole('link', { name: 'Explore Market Analysis' }));
    expect(screen.getByText('Market payment destination')).toBeInTheDocument();
  });

  it('preserves a protected market URL including its query and hash', () => {
    setup('/analytics/property-market?area=lagos#trends');
    expect(screen.getByTestId('location')).toHaveTextContent(marketAuthPath('/register', '/analytics/property-market?area=lagos#trends'));
  });

  it('ignores expired saved intents for a normal login', () => {
    localStorage.setItem(storageKey, JSON.stringify({ destination: MARKET_ACCESS_PATH, createdAt: Date.now() - 25 * 60 * 60 * 1000 }));
    setup('/login');
    expect(screen.getByRole('link', { name: 'Create one' })).toHaveAttribute('href', '/register');
  });

  it.each(['https://evil.example', '//evil.example', '/analytics/property-market/../../login', '/analytics/property-market\\evil', '/dashboard/admin'])('rejects an unrelated or unsafe destination: %s', (value) => {
    expect(marketDestination(value)).toBeNull();
  });
});
