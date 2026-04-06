import { useState, type FormEvent } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import type { RegisterPayload } from '../../types';

interface RegisterFormProps {
  defaultRole?: RegisterPayload['role'];
  hideRoleSelector?: boolean;
  onSuccess?: () => void;
}

const RegisterForm = ({ defaultRole = 'buyer', hideRoleSelector = false, onSuccess }: RegisterFormProps) => {
  const { register, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RegisterPayload['role']>(defaultRole);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await register({ name, email, password, role });
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to register. Please try again.';
      setError(message);
    }
  };

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <Input id="name" label="Full Name" value={name} onChange={(event) => setName(event.target.value)} required />
      <Input id="email" label="Email Address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Input
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      {!hideRoleSelector ? (
        <div className="space-y-2">
          <label htmlFor="role" className="block text-on-surface font-label text-xs font-bold uppercase tracking-wider">
            Role
          </label>
          <select
            id="role"
            className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3"
            value={role}
            onChange={(event) => setRole(event.target.value as RegisterPayload['role'])}
          >
            <option value="buyer">Buyer</option>
            <option value="landlord">Landlord</option>
          </select>
        </div>
      ) : null}
      {error ? <p className="text-error text-sm">{error}</p> : null}
      <Button type="submit" fullWidth disabled={isLoading}>
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
};

export default RegisterForm;