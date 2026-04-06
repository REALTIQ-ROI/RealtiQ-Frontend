import { useState } from 'react';
import type { PropertyFilters } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface PropertyFiltersProps {
  onApply: (filters: PropertyFilters) => void;
}

const PropertyFiltersPanel = ({ onApply }: PropertyFiltersProps) => {
  const [search, setSearch] = useState('');

  return (
    <aside className="w-full lg:w-72">
      <div className="sticky top-28 bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4 space-y-4">
        <h3 className="font-headline font-bold text-lg">Filters</h3>
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by location or style" />
        <Button
          fullWidth
          onClick={() => {
            onApply({ search });
          }}
        >
          Apply Filters
        </Button>
      </div>
    </aside>
  );
};

export default PropertyFiltersPanel;