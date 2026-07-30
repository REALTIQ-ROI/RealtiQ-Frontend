import { useEffect, useRef } from 'react';

interface ActionConfirmModalProps {
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  tone?: 'primary' | 'danger';
  onClose: () => void;
  onConfirm: () => void;
}

const ActionConfirmModal = ({ title, description, confirmLabel, pending = false, tone = 'primary', onClose, onConfirm }: ActionConfirmModalProps) => {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    confirmRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      openerRef.current?.focus();
    };
  }, [onClose, pending]);

  const confirmClass = tone === 'danger'
    ? 'bg-red-700 text-white'
    : 'bg-primary text-on-primary';

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-confirm-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Confirm action</p>
            <h2 id="action-confirm-title" className="mt-2 text-2xl font-black">{title}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={pending} className="rounded-full p-2 text-secondary hover:bg-surface-container-low disabled:opacity-50" aria-label="Close confirmation modal">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        <p className="mt-4 text-sm text-secondary">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={pending} className="rounded-lg bg-surface-container-high px-5 py-3 text-sm font-bold disabled:opacity-50">Cancel</button>
          <button ref={confirmRef} type="button" onClick={onConfirm} disabled={pending} className={`rounded-lg px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}>{pending ? 'Working...' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default ActionConfirmModal;
