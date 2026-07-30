import { useEffect, useRef, useState, type FormEvent } from 'react';

interface AgentApprovalModalProps {
  agentName: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: (notes: string) => Promise<string | null>;
}

const AgentApprovalModal = ({ agentName, pending, onClose, onSubmit }: AgentApprovalModalProps) => {
  const [notes, setNotes] = useState('');
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = notes.trim();
    if (!trimmed) {
      setError('Approval notes are required.');
      textareaRef.current?.focus();
      return;
    }
    setError('');
    const requestError = await onSubmit(trimmed);
    if (requestError) setError(requestError);
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-approval-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <form onSubmit={(event) => void submit(event)} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Verification decision</p>
            <h2 id="agent-approval-title" className="mt-2 text-2xl font-black">Approve Property Agent</h2>
          </div>
          <button type="button" onClick={onClose} disabled={pending} className="rounded-full p-2 text-secondary hover:bg-surface-container-low disabled:opacity-50" aria-label="Close approval modal">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        <p className="mt-4 text-sm text-secondary">
          Approving <strong className="text-on-surface">{agentName}</strong> marks the profile approved and searchable. The verified badge appears only after the server confirms this action.
        </p>
        <label htmlFor="agent-approval-notes" className="mt-6 block text-sm font-bold">
          Approval notes
          <textarea
            ref={textareaRef}
            id="agent-approval-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            aria-describedby="agent-approval-help agent-approval-error"
            aria-invalid={Boolean(error)}
            className="mt-2 min-h-32 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Summarize the identity and professional checks completed."
          />
        </label>
        <p id="agent-approval-help" className="mt-2 text-xs text-secondary">Required.</p>
        {error ? <p id="agent-approval-error" role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : <span id="agent-approval-error" />}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={pending} className="rounded-lg bg-surface-container-high px-5 py-3 text-sm font-bold disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={pending} className="rounded-lg bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{pending ? 'Approving…' : 'Approve Property Agent'}</button>
        </div>
      </form>
    </div>
  );
};

export default AgentApprovalModal;
