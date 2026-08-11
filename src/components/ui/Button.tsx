import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-primary text-on-primary hover:opacity-90',
  secondary: 'bg-surface-container-high text-on-surface hover:bg-surface-variant',
  ghost: 'bg-transparent text-on-surface hover:bg-surface-container-low',
};

const Button = ({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  loading = false,
  loadingLabel,
  disabled,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-label font-semibold text-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="material-symbols-outlined animate-spin text-base" aria-hidden="true">progress_activity</span>
          {loadingLabel ?? children}
        </>
      ) : children}
    </button>
  );
};

export default Button;
