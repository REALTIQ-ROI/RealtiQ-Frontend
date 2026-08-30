import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { authService, type RecoveryRole } from '../../services/authService';

const COOLDOWN_SECONDS = 60;

const getInitialRole = (value: string | null): RecoveryRole => (value === 'landlord' ? 'landlord' : 'buyer');

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [role, setRole] = useState<RecoveryRole>(getInitialRole(searchParams.get('role')));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const emailError = useMemo(() => {
    if (!email) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? null : 'Enter a valid email address.';
  }, [email]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (cooldown > 0 || isLoading) return;

    setIsLoading(true);
    try {
      const response = await authService.forgotPassword({ email: trimmedEmail, role });
      setSuccess(response.message || 'If this account exists, password reset instructions have been sent.');
      setCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset instructions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the account email and role associated with your RealtIQ access."
      footerText="Remember your password?"
      footerLinkLabel="Sign in"
      footerLinkTo="/login"
    >
      <form className="space-y-5" onSubmit={(event) => void onSubmit(event)}>
        <Input
          id="email"
          label="Email Address"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
            setSuccess(null);
          }}
          error={emailError ?? undefined}
          required
        />

        <div className="space-y-2">
          <label className="block text-on-surface font-label text-xs font-bold uppercase tracking-wider" htmlFor="role">
            Account Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(event) => setRole(event.target.value as RecoveryRole)}
            className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-surface-tint/20"
          >
            <option value="buyer">Buyer</option>
            <option value="landlord">Landlord</option>
          </select>
        </div>

        {error ? <p className="text-error text-sm">{error}</p> : null}
        {success ? <p className="text-emerald-700 text-sm">{success}</p> : null}

        <Button type="submit" fullWidth disabled={isLoading || cooldown > 0 || Boolean(emailError)}>
          {isLoading ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Send Reset Link'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-secondary">
        <Link to="/auth/landlord/login" className="font-semibold text-primary hover:underline">
          Landlord portal
        </Link>
      </p>
    </AuthLayout>
  );
};

export default ForgotPassword;
