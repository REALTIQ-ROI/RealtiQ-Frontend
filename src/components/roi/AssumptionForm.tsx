import { useState, type FormEvent } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import type { ROIAssumptions } from '../../services/roiService';

interface AssumptionFormProps {
  initialValue: ROIAssumptions | null;
  saving?: boolean;
  onSubmit: (payload: ROIAssumptions) => Promise<void>;
}

type AssumptionErrors = Partial<Record<keyof ROIAssumptions, string>>;

const numericFields: Array<keyof ROIAssumptions> = [
  'inflation',
  'mmf',
  'mpr',
  'usdNgn',
  'usInflation',
  'usTreasury',
  'defaultAlpha',
  'defaultBeta',
];

const fieldLabels: Record<keyof ROIAssumptions, string> = {
  _id: 'ID',
  inflation: 'Inflation',
  mmf: 'MMF',
  mpr: 'MPR',
  usdNgn: 'USD/NGN',
  usInflation: 'US Inflation',
  usTreasury: 'US Treasury',
  defaultAlpha: 'Default Alpha',
  defaultBeta: 'Default Beta',
  effectiveDate: 'Effective Date',
};

const fallback: ROIAssumptions = {
  inflation: 0,
  mmf: 0,
  mpr: 0,
  usdNgn: 1,
  usInflation: 0,
  usTreasury: 0,
  defaultAlpha: 15,
  defaultBeta: 0.25,
  effectiveDate: new Date().toISOString().slice(0, 10),
};

const normalizeDate = (value?: string) => (value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10));

const AssumptionForm = ({ initialValue, saving = false, onSubmit }: AssumptionFormProps) => {
  const [form, setForm] = useState<ROIAssumptions>({
    ...fallback,
    ...initialValue,
    effectiveDate: normalizeDate(initialValue?.effectiveDate),
  });
  const [errors, setErrors] = useState<AssumptionErrors>({});

  const updateNumber = (field: keyof ROIAssumptions, value: string) => {
    setForm((current) => ({ ...current, [field]: Number(value) }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const nextErrors: AssumptionErrors = {};
    numericFields.forEach((field) => {
      const value = Number(form[field]);
      if (!Number.isFinite(value)) {
        nextErrors[field] = `${fieldLabels[field]} must be a number.`;
      }
      if (field === 'usdNgn' && value <= 0) {
        nextErrors[field] = 'USD/NGN must be greater than zero.';
      }
    });
    if (!form.effectiveDate) {
      nextErrors.effectiveDate = 'Effective date is required.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  return (
    <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {numericFields.map((field) => (
          <Input
            key={field}
            id={field}
            label={fieldLabels[field]}
            type="number"
            step="any"
            min={field === 'usdNgn' ? 0 : undefined}
            value={Number(form[field])}
            error={errors[field]}
            onChange={(event) => updateNumber(field, event.target.value)}
          />
        ))}
        <Input
          id="effectiveDate"
          label="Effective Date"
          type="date"
          value={normalizeDate(form.effectiveDate)}
          error={errors.effectiveDate}
          onChange={(event) => setForm((current) => ({ ...current, effectiveDate: event.target.value }))}
        />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save Assumptions'}
      </Button>
    </form>
  );
};

export default AssumptionForm;
