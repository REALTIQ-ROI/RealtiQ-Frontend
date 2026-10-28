import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../lib/axios';
import { titleDocumentService } from '../../services/titleDocumentService';
import { toast } from 'sonner';
import PublicTitleDocuments from './PublicTitleDocuments';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../../contexts/CartContext', () => ({
  useCart: () => ({ addItem: vi.fn(), refreshCart: vi.fn() }),
}));
vi.mock('../../services/titleDocumentService', () => ({
  titleDocumentService: {
    listPublic: vi.fn(),
    accessStatus: vi.fn(),
    openViewer: vi.fn(),
    initializePayment: vi.fn(),
    persistPendingPayment: vi.fn(),
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

describe('PublicTitleDocuments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps an optional title metadata authorization failure contained on a public property page', async () => {
    vi.mocked(titleDocumentService.listPublic).mockRejectedValue(
      new ApiRequestError('Not available.', { status: 401, code: 'AUTH_SESSION_REQUIRED' }),
    );

    render(
      <MemoryRouter>
        <PublicTitleDocuments propertyId="RTQ-PROP-1" />
        <p>Property details remain available</p>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Title-document metadata is not available for this listing.',
    );
    expect(screen.getByText('Property details remain available')).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
