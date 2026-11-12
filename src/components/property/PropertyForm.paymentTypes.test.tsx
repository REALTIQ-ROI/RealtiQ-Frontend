import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanonicalFieldDictionary } from '../../services/canonicalFieldService';
import type { CreatePropertyPayload } from '../../services/propertyService';
import type { Property } from '../../types';
import PropertyForm, { type PropertyFormPayload } from './PropertyForm';
import { createCanonicalFieldDictionaryFixture } from '../../test/canonicalFieldDictionaryFixture';

const mocks = vi.hoisted(() => ({ dictionary: null as CanonicalFieldDictionary | null }));
vi.mock('../../hooks/useCanonicalFieldDictionary', () => ({
  useCanonicalFieldDictionary: () => ({ dictionary: mocks.dictionary, loading: false, error: null, refresh: vi.fn() }),
}));
vi.mock('./LocationCascadeFields', () => ({ default: () => <div data-testid="location-cascade" /> }));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('./MediaUploader', () => ({ default: () => <div>Media uploader</div> }));
vi.mock('../../services/documentService', () => ({ documentService: { uploadTitleAsset: vi.fn() } }));

const initialData: CreatePropertyPayload & { status: string } = {
  title: 'Ikoyi Duplex',
  price: 45_000_000,
  location: 'Ikoyi, Lagos',
  propertyType: 'detached_duplex',
  bedrooms: 4,
  bathrooms: 4,
  description: 'A completed duplex.',
  amenities: [],
  media: [{ url: 'https://images.example/home.jpg', public_id: 'home', type: 'image' }],
  category: 'houses',
  completionStage: 'Newly built',
  currency: 'NGN',
  paymentTypes: ['outright'],
  status: 'available',
};

const savedProperty = (payload: PropertyFormPayload): Property => {
  const { publicationAction: _publicationAction, ...fields } = payload;
  return {
    _id: 'prop1',
    ...fields,
    title: fields.title ?? initialData.title!,
    price: fields.price ?? initialData.price!,
    location: fields.location ?? initialData.location!,
    propertyType: fields.propertyType ?? initialData.propertyType!,
    bedrooms: fields.bedrooms ?? 0,
    bathrooms: fields.bathrooms ?? 0,
    description: fields.description ?? initialData.description!,
    paymentTypes: fields.paymentTypes ?? [],
    media: fields.media ?? [],
    status: 'available',
  };
};

describe('PropertyForm payment types', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dictionary = createCanonicalFieldDictionaryFixture();
  });

  it('blocks an empty selection with accessible inline validation', async () => {
    const onSubmit = vi.fn();
    render(<PropertyForm mode="edit" initialData={initialData} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Outright payment/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Property' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Select at least one property payment type');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits combinations as a canonical array', async () => {
    const onSubmit = vi.fn(async (payload: PropertyFormPayload) => savedProperty(payload));
    render(<PropertyForm mode="edit" initialData={initialData} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Installment plan/i }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Escrow available/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Property' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      paymentTypes: ['outright', 'installment', 'escrow'],
    }));
  });

  it('keeps installment optional regardless of the asking price', async () => {
    render(<PropertyForm mode="edit" initialData={{ ...initialData, price: 75_000_000, paymentTypes: ['escrow'] }} onSubmit={vi.fn()} />);
    const installment = screen.getByRole('checkbox', { name: /Installment plan/i });
    expect(installment).not.toBeChecked();
    expect(installment).toBeEnabled();

    const priceInput = screen.getByDisplayValue('75000000');
    await userEvent.clear(priceInput);
    await userEvent.type(priceInput, '40000000');
    expect(installment).not.toBeChecked();
    expect(installment).toBeEnabled();
  });

  it('submits explicit price-on-application without sending the previous numeric asking price', async () => {
    const onSubmit = vi.fn(async (payload: PropertyFormPayload) => { void payload; });
    render(<PropertyForm mode="edit" initialData={{ ...initialData, canonicalFields: { askingPrice: 45_000_000 } }} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Price on application' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Property' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0]?.[0];
    if (!payload) throw new Error('Expected the property form to submit a payload.');
    expect(payload).not.toHaveProperty('price');
    expect(payload.canonicalFields).toMatchObject({ priceOnApplication: true });
    expect(payload.canonicalFieldMutations).toContainEqual({ field: 'askingPrice', operation: 'unset' });
  });

  it('does not force installment at exactly ₦50,000,000', () => {
    render(<PropertyForm mode="edit" initialData={{ ...initialData, price: 50_000_000, paymentTypes: ['escrow'] }} onSubmit={vi.fn()} />);
    const installment = screen.getByRole('checkbox', { name: /Installment plan/i });
    expect(installment).not.toBeChecked();
    expect(installment).toBeEnabled();
  });

  it('preserves canonical catalogue values returned by an owner response', async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(<PropertyForm mode="edit" initialData={{ ...initialData, propertyType: 'house', category: 'land', completionStage: 'Newly built' }} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save Property' }));
    expect(screen.getByRole('option', { name: 'Unavailable option: land' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Unavailable option: house' })).toBeInTheDocument();
    expect(await screen.findByText('Choose a category from the current backend dictionary.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('serializes explicit false and zero as changed canonical paths', async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(<PropertyForm mode="edit" initialData={{ ...initialData, category: 'commercial_buildings', propertyType: 'office_space' }} onSubmit={onSubmit} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Gated estate' }), 'false');
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Commercial frontage in metres' }), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Save Property' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ canonicalFields: expect.objectContaining({ gatedEstate: false, commercialFrontage: 0 }) }));
  });

  it('keeps an existing empty canonical value without inventing a clear operation', async () => {
    const onSubmit = vi.fn(async (payload: PropertyFormPayload) => { void payload; return undefined; });
    render(<PropertyForm mode="edit" initialData={{ ...initialData, canonicalFields: { gatedEstate: false, streetAddress: '' } }} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save Property' }));
    expect(onSubmit).toHaveBeenCalled();
    const submittedFields = onSubmit.mock.calls[0][0].canonicalFields ?? {};
    expect(submittedFields).not.toHaveProperty('gatedEstate');
    expect(submittedFields).not.toHaveProperty('streetAddress');
  });

  it('shows canonical headline/description without rewriting different legacy values on an unrelated edit', async () => {
    const onSubmit = vi.fn(async (payload: PropertyFormPayload) => { void payload; return undefined; });
    render(<PropertyForm mode="edit" initialData={{ ...initialData, title: 'Legacy title', description: 'Legacy description', canonicalFields: { headline: 'Canonical headline', description: 'Canonical description' } }} onSubmit={onSubmit} />);
    expect(screen.getByDisplayValue('Canonical headline')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Canonical description')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save Property' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Legacy title', description: 'Legacy description' }));
    const submittedFields = onSubmit.mock.calls[0][0].canonicalFields ?? {};
    expect(submittedFields).not.toHaveProperty('headline');
    expect(submittedFields).not.toHaveProperty('description');
  });
});
