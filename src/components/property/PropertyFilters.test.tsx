import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanonicalFieldDictionary } from '../../services/canonicalFieldService';
import { createCanonicalFieldDictionaryFixture } from '../../test/canonicalFieldDictionaryFixture';
import PropertyFilters from './PropertyFilters';

const mocks = vi.hoisted(() => ({ dictionary: null as CanonicalFieldDictionary | null }));
vi.mock('../../hooks/useCanonicalFieldDictionary', () => ({
  useCanonicalFieldDictionary: () => ({ dictionary: mocks.dictionary, loading: false, error: null, refresh: vi.fn() }),
}));

describe('legacy property filter component vocabulary', () => {
  beforeEach(() => { mocks.dictionary = createCanonicalFieldDictionaryFixture(); });

  it('uses dictionary categories, category-scoped types, build stages and availability', async () => {
    const onApply = vi.fn();
    render(<PropertyFilters onApply={onApply} />);

    const typeSelect = screen.getByRole('combobox', { name: 'Property Type' });
    expect(typeSelect).toBeDisabled();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'houses');
    expect(screen.getByRole('option', { name: 'Detached Duplex' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Office Space' })).not.toBeInTheDocument();
    await userEvent.selectOptions(typeSelect, 'detached_duplex');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Completion Stage' }), 'Newly built');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Available');
    expect(screen.queryByRole('option', { name: 'Not released' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      category: 'houses', propertyType: 'detached_duplex', completionStage: 'Newly built', status: 'Available',
    }));
  });
});
