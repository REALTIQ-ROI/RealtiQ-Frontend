import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { authService } from '../../services/authService';

const getPasswordError = (password: string) => {
  if (!password) return 'Enter a new password.';
  if (password.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Add at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Add at least one lowercase letter.';
  if (!/\d/.test(password)) return 'Add at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Add at least one symbol.';
  return null;
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const params = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const token = params.token ?? searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(token ? null : 'This password reset link is missing a token.');
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const passwordError = useMemo(() => getPasswordError(password), [password]);
  const confirmError = confirmPassword && password !== confirmPassword ? 'Passwords do not match.' : null;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError('This password reset link is missing a token.');
      return;
    }
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.resetPassword({ token, password });
      setSuccess(response.message || 'Password reset successfully. Redirecting to login...');
      window.setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired reset token.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create new password"
      subtitle="Choose a strong password for your RealtIQ account."
      footerText="Already reset it?"
      footerLinkLabel="Sign in"
      footerLinkTo="/login"
    >
      <form className="space-y-5" onSubmit={(event) => void onSubmit(event)}>
        <Input
          id="password"
          label="New Password"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError(null);
          }}
          error={passwordError ?? undefined}
          required
        />
        <Input
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setError(null);
          }}
          error={confirmError ?? undefined}
          required
        />

        {error ? <p className="text-error text-sm">{error}</p> : null}
        {success ? <p className="text-emerald-700 text-sm">{success}</p> : null}

        <Button
          type="submit"
          fullWidth
          disabled={isLoading || !token || !confirmPassword || Boolean(passwordError) || Boolean(confirmError)}
        >
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-secondary">
        Need a new link?{' '}
        <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
          Request password reset
        </Link>
      </p>
    </AuthLayout>
  );
};

export default ResetPassword;
