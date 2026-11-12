import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../contexts/AuthContext';
import { documentManagerService } from '../../services/documentManagerService';
import DocumentManager from './DocumentManager';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../hooks/useBoundStepUp', () => ({ useBoundStepUp: () => ({ challenge: null, busy: false, error: null, begin: vi.fn(), complete: vi.fn(), cancel: vi.fn() }) }));
vi.mock('../../components/layout/BuyerPortalLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../../components/layout/LandlordPortalLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../../services/documentManagerService', () => ({ documentManagerService: {
  listDocuments: vi.fn(), listTemplates: vi.fn(), getDocument: vi.fn(), getHistory: vi.fn(),
  getReadiness: vi.fn(),
  createDocument: vi.fn(), createTemplate: vi.fn(), updateDocument: vi.fn(), updateTemplate: vi.fn(),
  submit: vi.fn(), approve: vi.fn(), issue: vi.fn(), sign: vi.fn(), acknowledge: vi.fn(), archive: vi.fn(), getContent: vi.fn(),
} }));

const profile = { id: 'profile-1', name: 'Buyer profile', kind: 'buyer', structure: 'individual', status: 'active', version: 1, permissions: ['document.read', 'document.issue'] };

describe('Document Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ user: { _id: 'user-1', name: 'Buyer', email: 'buyer@example.com', role: 'buyer' }, activeProfile: profile, profiles: [profile], adminAccess: null } as ReturnType<typeof useAuth>);
    vi.mocked(documentManagerService.listDocuments).mockResolvedValue({ items: [], nextCursor: null });
    vi.mocked(documentManagerService.listTemplates).mockResolvedValue({ items: [], nextCursor: null });
    vi.mocked(documentManagerService.getReadiness).mockResolvedValue({ authority: { state: 'authorized', signatory: { state: 'not_required' } }, qrSigning: { state: 'configured' }, verificationOrigin: { state: 'configured' }, privateEnvelope: { state: 'configured' }, privateStorage: { state: 'configured' }, maxIssuedBytes: 5242880, issuance: { state: 'ready', usableNow: true, reasonCodes: [] } });
    vi.mocked(documentManagerService.createDocument).mockResolvedValue({ id: 'doc-1', issuerProfileId: 'profile-1', recipientProfileIds: [], title: 'Offer letter', documentType: 'offer', state: 'draft', version: 0, requiresWetInk: false, createdAt: '', updatedAt: '', body: 'Draft terms' });
    vi.mocked(documentManagerService.getDocument).mockResolvedValue({ id: 'doc-1', issuerProfileId: 'profile-1', recipientProfileIds: [], title: 'Offer letter', documentType: 'offer', state: 'draft', version: 0, requiresWetInk: false, createdAt: '', updatedAt: '', body: 'Draft terms' });
    vi.mocked(documentManagerService.getHistory).mockResolvedValue({ events: [], views: [], nextCursor: null });
  });

  it('creates a draft from accessible form fields and does not mark it issued', async () => {
    render(<DocumentManager />);
    await screen.findByText(/No documents are available/);
    fireEvent.change(screen.getByLabelText('Document title'), { target: { value: 'Offer letter' } });
    fireEvent.change(screen.getByLabelText('Document type'), { target: { value: 'offer' } });
    fireEvent.change(screen.getByLabelText('Document body'), { target: { value: 'Draft terms' } });
    await userEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    await waitFor(() => expect(documentManagerService.createDocument).toHaveBeenCalledWith({ title: 'Offer letter', documentType: 'offer', body: 'Draft terms', requiresWetInk: false }));
    expect(await screen.findByText(/Draft · Version 0/)).toBeInTheDocument();
    expect(screen.queryByText(/sealed PDF/i)).not.toBeInTheDocument();
  });

  it('creates amendments as new drafts linked to the issued source document', async () => {
    const issued = { id: 'document-private-id', issuerProfileId: 'profile-1', recipientProfileIds: [], title: 'Signed offer', documentType: 'offer', state: 'issued', version: 2, requiresWetInk: false, createdAt: '', updatedAt: '', body: 'Original offer terms' };
    vi.mocked(documentManagerService.listDocuments).mockResolvedValue({ items: [issued], nextCursor: null });
    vi.mocked(documentManagerService.getDocument).mockResolvedValue(issued);
    vi.mocked(documentManagerService.createDocument).mockResolvedValue({ ...issued, id: 'amendment-draft', title: 'Amendment: Signed offer', state: 'draft', version: 0, previousDocumentId: issued.id });

    render(<DocumentManager />);
    await userEvent.click(await screen.findByRole('button', { name: /Signed offer/ }));
    await screen.findByText(/Issued · Version 2/);
    await userEvent.click(screen.getByRole('button', { name: 'Create amendment draft' }));
    expect(screen.getByText(/This draft will be linked as an amendment/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Document body')).toHaveValue('Original offer terms');
    await userEvent.click(screen.getByRole('button', { name: 'Create draft' }));

    await waitFor(() => expect(documentManagerService.createDocument).toHaveBeenCalledWith({
      title: 'Amendment: Signed offer',
      documentType: 'offer',
      body: 'Original offer terms',
      previousDocumentId: 'document-private-id',
      requiresWetInk: false,
    }));
  });

  it('renders placeholders as ordinary inputs when creating from a template', async () => {
    vi.mocked(documentManagerService.listTemplates).mockResolvedValue({ items: [{ id: 'template-1', issuerProfileId: 'profile-1', title: 'Letter', documentType: 'letter', body: 'Dear {{recipientName}}, amount {{amount}}', requiresWetInk: false, state: 'active', version: 1, createdAt: '', updatedAt: '' }], nextCursor: null });
    render(<DocumentManager />);
    await screen.findByRole('option', { name: 'Letter · letter' });
    await userEvent.selectOptions(screen.getByLabelText('Start from an active template'), 'template-1');
    await userEvent.type(screen.getByLabelText('Recipient Name'), 'Ada');
    await userEvent.type(screen.getByLabelText('Amount'), '500');
    await userEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    await waitFor(() => expect(documentManagerService.createDocument).toHaveBeenCalledWith({ templateId: 'template-1', mergeValues: { recipientName: 'Ada', amount: '500' }, requiresWetInk: false }));
  });

  it('clears document selection when the active profile changes', async () => {
    const doc = { id: 'doc-1', issuerProfileId: 'profile-1', recipientProfileIds: [], title: 'Private record', documentType: 'letter', state: 'draft', version: 0, requiresWetInk: false, createdAt: '', updatedAt: '' };
    vi.mocked(documentManagerService.listDocuments).mockResolvedValue({ items: [doc], nextCursor: null });
    vi.mocked(documentManagerService.getDocument).mockResolvedValue(doc);
    vi.mocked(documentManagerService.getHistory).mockResolvedValue({ events: [], views: [], nextCursor: null });
    const view = render(<DocumentManager />);
    await userEvent.click(await screen.findByRole('button', { name: /Private record/ }));
    await screen.findByText(/Draft · Version 0/);
    vi.mocked(useAuth).mockReturnValue({ user: { _id: 'user-1', name: 'Buyer', email: 'buyer@example.com', role: 'buyer' }, activeProfile: { ...profile, id: 'profile-2', name: 'Second profile' }, profiles: [profile], adminAccess: null } as ReturnType<typeof useAuth>);
    vi.mocked(documentManagerService.listDocuments).mockResolvedValue({ items: [], nextCursor: null });
    view.rerender(<DocumentManager />);
    await waitFor(() => expect(screen.getByText(/Choose a document to review/)).toBeInTheDocument());
    expect(screen.queryByText('Private record')).not.toBeInTheDocument();
  });

  it('does not request issuer-only history for a recipient profile', async () => {
    const recipientProfile = { ...profile, id: 'recipient-1', name: 'Recipient profile', permissions: ['document.read'] };
    vi.mocked(useAuth).mockReturnValue({ user: { _id: 'recipient-user', name: 'Buyer', email: 'buyer@example.com', role: 'buyer' }, activeProfile: recipientProfile, profiles: [recipientProfile], adminAccess: null } as ReturnType<typeof useAuth>);
    const issued = { id: 'doc-2', issuerProfileId: 'issuer-1', recipientProfileIds: ['recipient-1'], title: 'Issued offer', documentType: 'offer', state: 'issued', version: 1, requiresWetInk: false, createdAt: '', updatedAt: '', reference: 'RTQ-DOC-123' };
    vi.mocked(documentManagerService.listDocuments).mockResolvedValue({ items: [issued], nextCursor: null });
    vi.mocked(documentManagerService.getDocument).mockResolvedValue(issued);
    render(<DocumentManager />);
    await userEvent.click(await screen.findByRole('button', { name: /Issued offer/ }));
    await screen.findByText(/Issued · Version 1/);
    expect(documentManagerService.getHistory).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'View sealed PDF' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Issue sealed document/ })).not.toBeInTheDocument();
  });

  it('shows only the selected recipient response and suppresses duplicate acknowledgment', async () => {
    const recipientProfile = { ...profile, id: 'recipient-1', name: 'Recipient profile', permissions: ['document.read'] };
    vi.mocked(useAuth).mockReturnValue({ user: { _id: 'recipient-user', name: 'Buyer', email: 'buyer@example.com', role: 'buyer' }, activeProfile: recipientProfile, profiles: [recipientProfile], adminAccess: null } as ReturnType<typeof useAuth>);
    const issued = { id: 'doc-ack', issuerProfileId: 'issuer-1', recipientProfileIds: ['recipient-1'], title: 'Acknowledgment sample', documentType: 'notice', state: 'issued', version: 4, requiresWetInk: false, createdAt: '', updatedAt: '', myResponse: { profileId: 'recipient-1', state: 'acknowledged', acknowledged: true, signed: false, respondedAt: '2026-11-12T10:00:00Z' }, recipientResponses: undefined };
    vi.mocked(documentManagerService.listDocuments).mockResolvedValue({ items: [issued], nextCursor: null });
    vi.mocked(documentManagerService.getDocument).mockResolvedValue(issued);
    render(<DocumentManager />);
    await userEvent.click(await screen.findByRole('button', { name: /Acknowledgment sample/ }));
    expect(await screen.findByText(/Your response: Acknowledged/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acknowledge receipt' })).not.toBeInTheDocument();
    expect(screen.getByText(/Acknowledgment is not a typed signature/)).toBeInTheDocument();
  });

  it('uses selected-profile permission instead of the account role to expose the workspace', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { _id: 'staff-user', name: 'Staff', email: 'staff@example.com', role: 'admin' }, activeProfile: profile, profiles: [profile], adminAccess: null } as ReturnType<typeof useAuth>);
    vi.mocked(documentManagerService.listDocuments).mockResolvedValue({ items: [], nextCursor: null });
    render(<DocumentManager />);
    expect(await screen.findByText('Document Manager')).toBeInTheDocument();
    expect(screen.queryByText(/access is available to profiles that the backend authorizes/i)).not.toBeInTheDocument();
  });
});
