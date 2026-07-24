import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { titleDocumentService } from '../../services/titleDocumentService';
import type { ViewerSession } from '../../types';
import ProtectedTitleViewer from './ProtectedTitleViewer';

vi.mock('../../components/layout/PublicLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../services/titleDocumentService', () => ({
  titleDocumentService: { fetchViewerContent: vi.fn() },
}));

const session: ViewerSession = {
  sessionToken: 'not-rendered-or-persisted',
  contentUrl: '/api/title-document-viewer/token/content',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  watermark: {
    heading: 'REALTIQ VERIFIED DOCUMENT',
    viewer: 'If***@example.com',
    access: 'RTQ-DOC-PAY-1',
    property: 'RTQ-PROP-1',
    timestamp: '2026-07-23T12:00:00.000Z',
  },
  controls: { download: false, print: false },
};

describe('ProtectedTitleViewer', () => {
  const createObjectURL = vi.fn(() => 'blob:protected-content');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    vi.mocked(titleDocumentService.fetchViewerContent).mockResolvedValue({
      blob: new Blob(['image'], { type: 'image/png' }),
      contentType: 'image/png',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders protected blob content and every server-provided watermark field without download or print actions', async () => {
    const view = render(
      <MemoryRouter initialEntries={[{ pathname: '/protected-title-viewer', state: { session, documentId: 'doc1', propertyId: 'prop1' } }]}>
        <Routes><Route path="/protected-title-viewer" element={<ProtectedTitleViewer />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByAltText('Protected title document')).toHaveAttribute('src', 'blob:protected-content');
    expect(screen.getAllByText(/REALTIQ VERIFIED DOCUMENT.*If\*\*\*@example.com.*RTQ-DOC-PAY-1.*RTQ-PROP-1.*2026-07-23/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /download|print/i })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(session.sessionToken);
    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:protected-content');
  });

  it('does not create a new session after a refresh loses in-memory navigation state', () => {
    render(
      <MemoryRouter initialEntries={['/protected-title-viewer']}>
        <Routes><Route path="/protected-title-viewer" element={<ProtectedTitleViewer />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/No active viewer session/i)).toBeInTheDocument();
    expect(titleDocumentService.fetchViewerContent).not.toHaveBeenCalled();
  });
});
