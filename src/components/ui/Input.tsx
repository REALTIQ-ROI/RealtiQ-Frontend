import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = ({ label, error, className = '', id, ...props }: InputProps) => {
  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={id} className="block text-on-surface font-label text-xs font-bold uppercase tracking-wider">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        className={`w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-surface-tint/20 ${className}`}
        {...props}
      />
      {error ? <p className="text-error text-xs">{error}</p> : null}
    </div>
  );
};

export default Input;