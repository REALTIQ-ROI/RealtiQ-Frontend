import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PropertyForm from './PropertyForm';
import type { CreatePropertyPayload } from '../../services/propertyService';
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('./MediaUploader', () => ({ default: () => <div>Media uploader</div> }));
vi.mock('../../services/documentService', () => ({ documentService: { uploadTitleAsset: vi.fn() } }));
vi.mock('../../services/projectService', () => ({ projectService: { listMyProjects: vi.fn().mockResolvedValue({ projects: [] }) } }));
const initial: CreatePropertyPayload & { status: string } = { title: 'Terrace', price: 45000000, paymentTypes: ['outright'], location: 'Lekki', propertyType: 'house', bedrooms: 3, bathrooms: 3, squareFeet: 2000, description: 'Completed built property.', media: [{ url: 'image', public_id: '1', type: 'image' }], category: 'residential', completionStage: 'finished', currency: 'NGN', status: 'available', structuredFacts: { verification: { status: 'admin_verified', source: 'admin' } } };
describe('PropertyForm structured facts', () => {
  it('round-trips square feet independently and forces seller assertion provenance', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ _id: 'p1' });
    render(<PropertyForm mode={'edit'} initialData={initial} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/Building area/), '185.8');
    await userEvent.click(screen.getByRole('button', { name: 'Save Property' }));
    expect(screen.queryAllByRole('alert').map((node) => node.textContent)).toEqual([]);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ squareFeet: 2000, structuredFacts: expect.objectContaining({ areas: expect.objectContaining({ buildingSquareMetres: 185.8 }), verification: { status: 'seller_asserted', source: 'seller' } }) })));
  });
});
