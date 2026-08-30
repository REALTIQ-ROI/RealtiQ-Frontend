import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DocumentMatchUpload from './DocumentMatchUpload';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('DocumentMatchUpload', () => {
  it('renders uploaded and registered hashes for a match', async () => {
    const onVerify = vi.fn().mockResolvedValue({
      matches: true,
      uploadedDocumentHash: 'abc123',
      registeredDocumentHash: 'abc123',
    });
    render(<DocumentMatchUpload onVerify={onVerify} registeredHash="abc123" />);

    await userEvent.upload(screen.getByLabelText(/upload comparison file/i), new File(['same'], 'title.pdf', { type: 'application/pdf' }));
    await userEvent.click(screen.getByRole('button', { name: /check document match/i }));

    await waitFor(() => expect(screen.getByText(/file matches/i)).toBeInTheDocument());
    expect(screen.getAllByText('abc123')).toHaveLength(2);
  });

  it('rejects unsupported file types before submit', () => {
    render(<DocumentMatchUpload onVerify={vi.fn()} registeredHash="registered" />);

    fireEvent.change(screen.getByLabelText(/upload comparison file/i), {
      target: { files: [new File(['txt'], 'notes.txt', { type: 'text/plain' })] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/pdf, jpeg, png, or webp/i);
  });

  it('renders no-match states', async () => {
    const onVerify = vi.fn().mockResolvedValue({
      matches: false,
      uploadedDocumentHash: 'other',
      registeredDocumentHash: 'registered',
      message: 'The uploaded file does not match the title document reviewed and registered by RealtIQ.',
    });
    render(<DocumentMatchUpload onVerify={onVerify} registeredHash="registered" />);

    await userEvent.upload(screen.getByLabelText(/upload comparison file/i), new File(['other'], 'title.png', { type: 'image/png' }));
    await userEvent.click(screen.getByRole('button', { name: /check document match/i }));

    await waitFor(() => expect(screen.getByText(/file does not match/i)).toBeInTheDocument());
    expect(screen.getByText('other')).toBeInTheDocument();
    expect(screen.getByText('registered')).toBeInTheDocument();
  });
});
