import { useEffect, useRef, useState, type FormEvent } from 'react';

interface ActionTextModalProps {
  title: string;
  description: string;
  label: string;
  confirmLabel: string;
  pending?: boolean;
  requiredMessage: string;
  tone?: 'primary' | 'danger';
  onClose: () => void;
  onSubmit: (value: string) => void;
}

const ActionTextModal = ({ title, description, label, confirmLabel, pending = false, requiredMessage, tone = 'primary', onClose, onSubmit }: ActionTextModalProps) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    textareaRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      openerRef.current?.focus();
    };
  }, [onClose, pending]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError(requiredMessage);
      textareaRef.current?.focus();
      return;
    }
    setError('');
    onSubmit(trimmed);
  };

  const confirmClass = tone === 'danger'
    ? 'bg-red-700 text-white'
    : 'bg-primary text-on-primary';

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-text-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <form onSubmit={(event) => void submit(event)} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Action details</p>
            <h2 id="action-text-title" className="mt-2 text-2xl font-black">{title}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={pending} className="rounded-full p-2 text-secondary hover:bg-surface-container-low disabled:opacity-50" aria-label="Close action modal">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        <p className="mt-4 text-sm text-secondary">{description}</p>
        <label htmlFor="action-text-value" className="mt-6 block text-sm font-bold">
          {label}
          <textarea
            ref={textareaRef}
            id="action-text-value"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby="action-text-error"
            className="mt-2 min-h-32 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        {error ? <p id="action-text-error" role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : <span id="action-text-error" />}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={pending} className="rounded-lg bg-surface-container-high px-5 py-3 text-sm font-bold disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={pending} className={`rounded-lg px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}>{pending ? 'Working...' : confirmLabel}</button>
        </div>
      </form>
    </div>
  );
};

export default ActionTextModal;
