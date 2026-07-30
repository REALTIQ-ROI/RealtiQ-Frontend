import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminKycMediaViewer from './AdminKycMediaViewer';

describe('Admin KYC media viewer', () => {
  const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:secure-pdf-preview');
  const revokeObjectURL = vi.fn<(url: string) => void>();

  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  it('renders images inline and closes accessibly', async () => {
    const onClose = vi.fn();
    render(<AdminKycMediaViewer title="Identity document" url="https://example.test/id" mimeType="image/jpeg" onClose={onClose} />);
    expect(screen.getByRole('img', { name: 'Identity document' })).toHaveAttribute('src', 'https://example.test/id');
    await userEvent.click(screen.getByRole('button', { name: 'Close document viewer' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('fetches raw PDFs, corrects the Blob MIME type, previews them in-app, and revokes the URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['pdf bytes'], { type: 'application/octet-stream' })),
    }));
    const { unmount } = render(<AdminKycMediaViewer title="Professional licence" url="https://example.test/licence.pdf?token=short" mimeType="application/pdf" onClose={() => undefined} />);

    expect(screen.getByText('Loading secure PDF preview…')).toBeInTheDocument();
    expect(await screen.findByTitle('Professional licence')).toHaveAttribute('src', 'blob:secure-pdf-preview');
    expect(fetch).toHaveBeenCalledWith('https://example.test/licence.pdf?token=short', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect((createObjectURL.mock.calls[0][0] as Blob).type).toBe('application/pdf');

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:secure-pdf-preview');
  });

  it('shows retry and direct-download fallback when a signed PDF cannot be fetched', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, blob: vi.fn() })
      .mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(new Blob(['pdf'], { type: 'application/pdf' })) });
    vi.stubGlobal('fetch', fetchMock);
    render(<AdminKycMediaViewer title="Professional licence" url="https://example.test/licence.pdf" mimeType="application/pdf" onClose={() => undefined} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('signed URL may have expired');
    expect(screen.getByRole('link', { name: 'Download file' })).toHaveAttribute('href', 'https://example.test/licence.pdf');
    await userEvent.click(screen.getByRole('button', { name: 'Retry preview' }));
    expect(await screen.findByTitle('Professional licence')).toHaveAttribute('src', 'blob:secure-pdf-preview');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps DOCX URLs out of third-party viewers and provides a file action', () => {
    render(<AdminKycMediaViewer title="Professional CV" url="https://example.test/cv.docx?token=short" mimeType="application/vnd.openxmlformats-officedocument.wordprocessingml.document" onClose={() => undefined} />);
    expect(screen.getByRole('heading', { name: 'Word document' })).toBeInTheDocument();
    expect(screen.queryByTitle(/Microsoft Office viewer/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download file' })).toHaveAttribute('href', 'https://example.test/cv.docx?token=short');
  });

  it('shows an unsupported-file state without trying to fetch it', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<AdminKycMediaViewer title="Archive" url="https://example.test/file.zip" mimeType="application/zip" onClose={() => undefined} />);
    expect(screen.getByRole('heading', { name: 'Preview unavailable' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Open file' })).toBeInTheDocument());
  });
});
