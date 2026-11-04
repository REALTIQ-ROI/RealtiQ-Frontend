import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AuthorizedFilePreview from './AuthorizedFilePreview';

describe('AuthorizedFilePreview', () => {
  it('uses Chrome’s native PDF viewer without a sandbox that blocks PDF rendering', () => {
    render(<AuthorizedFilePreview url="blob:authorized-pdf" mimeType="application/pdf" alt="Authorized evidence PDF" />);
    const frame = screen.getByTitle('Authorized evidence PDF');
    expect(frame).toHaveAttribute('src', 'blob:authorized-pdf');
    expect(frame).not.toHaveAttribute('sandbox');
  });

  it('renders authorized images inline', () => {
    render(<AuthorizedFilePreview url="blob:authorized-image" mimeType="image/jpeg" alt="Authorized evidence image" />);
    expect(screen.getByRole('img', { name: 'Authorized evidence image' })).toHaveAttribute('src', 'blob:authorized-image');
  });

  it('does not embed unsupported private document types', () => {
    render(<AuthorizedFilePreview url="blob:authorized-doc" mimeType="application/msword" alt="Authorized Word document" />);
    expect(screen.getByRole('status')).toHaveTextContent('This file type cannot be previewed in the browser.');
    expect(screen.getByRole('link', { name: 'Download authorized file' })).toHaveAttribute('href', 'blob:authorized-doc');
    expect(screen.queryByTitle('Authorized Word document')).not.toBeInTheDocument();
  });
});
