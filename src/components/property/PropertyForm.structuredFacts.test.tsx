import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanonicalFieldDictionary } from '../../services/canonicalFieldService';
import { createCanonicalFieldDictionaryFixture } from '../../test/canonicalFieldDictionaryFixture';
import PropertyForm from './PropertyForm';
const mocks = vi.hoisted(() => ({ dictionary: null as CanonicalFieldDictionary | null }));
vi.mock('../../hooks/useCanonicalFieldDictionary', () => ({
  useCanonicalFieldDictionary: () => ({ dictionary: mocks.dictionary, loading: false, error: null, refresh: vi.fn() }),
}));
vi.mock('./LocationCascadeFields', () => ({ default: () => <div data-testid="location-cascade" /> }));
import type { CreatePropertyPayload } from '../../services/propertyService';
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('./MediaUploader', () => ({ default: () => <div>Media uploader</div> }));
vi.mock('../../services/documentService', () => ({ documentService: { uploadTitleAsset: vi.fn() } }));
vi.mock('../../services/projectService', () => ({ projectService: { listMyProjects: vi.fn().mockResolvedValue({ projects: [] }) } }));
const initial: CreatePropertyPayload & { status: string } = { title: 'Terrace', price: 45000000, paymentTypes: ['outright'], location: 'Lekki', propertyType: 'terraced_house', bedrooms: 3, bathrooms: 3, squareFeet: 2000, description: 'Completed built property.', media: [{ url: 'image', public_id: '1', type: 'image' }], category: 'houses', completionStage: 'Newly built', currency: 'NGN', status: 'available', structuredFacts: { verification: { status: 'admin_verified', source: 'admin' } } };
describe('PropertyForm structured facts', () => {
  beforeEach(() => { mocks.dictionary = createCanonicalFieldDictionaryFixture(); });
  it('does not resend untouched seller facts during an unrelated edit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PropertyForm mode="edit" initialData={initial} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save Property' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('structuredFacts');
  });

  it('keeps seller-entered area in square metres and does not submit a square-feet value', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ _id: 'p1' });
    render(<PropertyForm mode={'edit'} initialData={initial} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Internal floor area (m²)'), '185.8');
    await userEvent.click(screen.getByRole('button', { name: 'Save Property' }));
    expect(screen.queryAllByRole('alert').map((node) => node.textContent)).toEqual([]);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ canonicalFields: expect.objectContaining({ internalFloorArea: 185.8 }) })));
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('squareFeet');
  });
});
