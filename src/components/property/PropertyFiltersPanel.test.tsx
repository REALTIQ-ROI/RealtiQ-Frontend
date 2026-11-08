import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CanonicalFieldDictionary } from '../../services/canonicalFieldService';
import PropertyFiltersPanel from './PropertyFiltersPanel';

const dictionary = {
  version: 3,
  categories: [],
  propertyTypes: [],
  fields: [
    { key: 'availability', kind: 'enum', dataType: 'enum', allowedValues: ['Available', 'Under Offer', 'Sold', 'Not released'] },
    { key: 'advertiserType', kind: 'enum', dataType: 'enum', allowedValues: ['Owner', 'Agency', 'Developer'] },
    { key: 'unitFeatures', kind: 'amenity_key_list', dataType: 'amenity_key_list', searchable: true, searchUse: 'public filter', visibility: 'public', allowedValues: ['pool', 'lift'] },
  ],
  catalogues: {
    availabilityValues: [
      { key: 'available', label: 'Available' },
      { key: 'under_offer', label: 'Under Offer' },
      { key: 'sold', label: 'Sold' },
      { key: 'not_released', label: 'Not released' },
    ],
    advertiserTypes: [
      { key: 'owner', label: 'Owner' },
      { key: 'agency', label: 'Agency' },
      { key: 'developer', label: 'Developer' },
    ],
    amenities: [
      { key: 'pool', label: 'Swimming Pool', group: 'Leisure', priority: true },
      { key: 'lift', label: 'Passenger Elevator / Lift', group: 'Interior', priority: false },
    ],
    amenityGroups: [{ label: 'Leisure', entries: [{ key: 'pool', label: 'Swimming Pool', priority: true }, { key: 'lift', label: 'Passenger Elevator / Lift', priority: false }] }],
  },
  configuration: {},
} as unknown as CanonicalFieldDictionary;

vi.mock('../../hooks/useCanonicalFieldDictionary', () => ({
  useCanonicalFieldDictionary: () => ({ dictionary, error: null, refresh: vi.fn() }),
}));

vi.mock('./LocationCascadeFields', () => ({ default: () => <div /> }));

describe('PropertyFiltersPanel dictionary-backed vocabulary', () => {
  it('uses accepted availability and advertiser values and excludes non-public availability', () => {
    const onApply = vi.fn();
    render(<PropertyFiltersPanel onApply={onApply} />);
    fireEvent.click(screen.getByRole('button', { name: /more filters/i }));

    const availability = screen.getByRole('combobox', { name: 'Availability' });
    expect(Array.from((availability as HTMLSelectElement).options).map((option) => option.textContent)).toEqual([
      'Any availability', 'Available', 'Under Offer', 'Sold',
    ]);
    expect(screen.queryByRole('option', { name: 'Not released' })).not.toBeInTheDocument();

    const advertiser = screen.getByRole('combobox', { name: 'Listed by' });
    expect(Array.from((advertiser as HTMLSelectElement).options).map((option) => option.textContent)).toEqual([
      'Any advertiser', 'Owner', 'Agency', 'Developer',
    ]);
  });

  it('submits the exact accepted dictionary values for selected filters', () => {
    const onApply = vi.fn();
    render(<PropertyFiltersPanel onApply={onApply} />);
    fireEvent.click(screen.getByRole('button', { name: /more filters/i }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Availability' }), { target: { value: 'Under Offer' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Listed by' }), { target: { value: 'Agency' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ status: 'Under Offer', advertiserType: 'Agency' }));
  });

  it('renders grouped amenity filters from the dictionary and submits every selected feature', () => {
    const onApply = vi.fn();
    render(<PropertyFiltersPanel onApply={onApply} />);
    fireEvent.click(screen.getByRole('button', { name: /more filters/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Swimming Pool/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Passenger Elevator \/ Lift/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ unitFeatures: ['pool', 'lift'] }));
  });
});
