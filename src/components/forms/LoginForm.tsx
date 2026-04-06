import { useState, type FormEvent } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';

interface LoginFormProps {
  role?: UserRole;
  initialEmail?: string;
  initialPassword?: string;
  onSuccess?: () => void;
}

const LoginForm = ({ role, initialEmail = '', initialPassword = '', onSuccess }: LoginFormProps) => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await login({ email, password, role });
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to login. Please check your details.';
      setError(message);
    }
  };

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <Input id="email" label="Email Address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Input
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      {error ? <p className="text-error text-sm">{error}</p> : null}
      <Button type="submit" fullWidth disabled={isLoading}>
        {isLoading ? 'Signing In...' : 'Sign In'}
      </Button>
    </form>
  );
};

export default LoginForm;