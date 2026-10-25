import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreatePropertyPayload } from '../../services/propertyService';
import type { Property } from '../../types';
import PropertyForm from './PropertyForm';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('./MediaUploader', () => ({ default: () => <div>Media uploader</div> }));
vi.mock('../../services/documentService', () => ({ documentService: { uploadTitleAsset: vi.fn() } }));

const initialData: CreatePropertyPayload & { status: string } = {
  title: 'Ikoyi Duplex',
  price: 45_000_000,
  location: 'Ikoyi, Lagos',
  propertyType: 'house',
  bedrooms: 4,
  bathrooms: 4,
  squareFeet: 3000,
  description: 'A completed duplex.',
  amenities: [],
  media: [{ url: 'https://images.example/home.jpg', public_id: 'home', type: 'image' }],
  category: 'residential',
  completionStage: 'finished',
  currency: 'NGN',
  paymentTypes: ['outright'],
  status: 'available',
};

const savedProperty = (payload: CreatePropertyPayload): Property => ({
  _id: 'prop1',
  ...payload,
  squareFeet: payload.squareFeet ?? 0,
  bedrooms: payload.bedrooms ?? 0,
  bathrooms: payload.bathrooms ?? 0,
  status: 'available',
});

describe('PropertyForm payment types', () => {
  beforeEach(() => vi.clearAllMocks());

  it('blocks an empty selection with accessible inline validation', async () => {
    const onSubmit = vi.fn();
    render(<PropertyForm mode="edit" initialData={initialData} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Outright payment/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Property' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Select at least one property payment type');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits combinations as a canonical array', async () => {
    const onSubmit = vi.fn(async (payload: CreatePropertyPayload) => savedProperty(payload));
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

  it('does not force installment at exactly ₦50,000,000', () => {
    render(<PropertyForm mode="edit" initialData={{ ...initialData, price: 50_000_000, paymentTypes: ['escrow'] }} onSubmit={vi.fn()} />);
    const installment = screen.getByRole('checkbox', { name: /Installment plan/i });
    expect(installment).not.toBeChecked();
    expect(installment).toBeEnabled();
  });

  it('preserves canonical catalogue values returned by an owner response', async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(<PropertyForm mode="edit" initialData={{ ...initialData, propertyType: 'Terraced House', category: 'land', completionStage: 'Newly built' }} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save Property' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ propertyType: 'Terraced House', category: 'land', completionStage: 'Newly built' }));
  });

  it('serializes explicit false and zero as changed canonical paths', async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(<PropertyForm mode="edit" initialData={{ ...initialData, category: 'commercial', propertyType: 'commercial' }} onSubmit={onSubmit} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Gated estate' }), 'false');
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Commercial frontage in metres' }), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Save Property' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ canonicalFields: { gatedEstate: false, commercialFrontage: 0 } }));
  });

  it('keeps an existing empty canonical value without inventing a clear operation', async () => {
    const onSubmit = vi.fn(async (payload: CreatePropertyPayload) => { void payload; return undefined; });
    render(<PropertyForm mode="edit" initialData={{ ...initialData, canonicalFields: { gatedEstate: false, streetAddress: '' } }} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save Property' }));
    expect(onSubmit).toHaveBeenCalled();
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('canonicalFields');
  });
});
