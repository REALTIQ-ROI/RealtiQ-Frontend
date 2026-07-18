import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import BenchmarkCard from './BenchmarkCard';
import ROIAssumptionsDisplay from './ROIAssumptionsDisplay';
import ROIResultsCard from './ROIResultsCard';
import {
  roiService,
  type MarketBenchmark,
  type ROIAssumptions,
  type ROICalculationInputs,
  type ROICalculationResults,
} from '../../services/roiService';
import { propertyRouteReference, type Property } from '../../types';
import { formatNaira } from './roiFormatters';

interface ROICalculatorProps {
  property?: Property | null;
  onScenarioSaved?: () => void;
}

type ROIFormErrors = Partial<Record<keyof ROICalculationInputs, string>>;

const currentMonth = new Date().toISOString().slice(0, 7);
const futureMonth = new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toISOString().slice(0, 7);

const defaultInputs: ROICalculationInputs = {
  cost: 0,
  startDate: currentMonth,
  endDate: futureMonth,
  inflation: 0,
  mmf: 0,
  mpr: 0,
  usdNgn: 1,
  entryUsdNgn: 1,
  usInflation: 0,
  usTreasury: 0,
  alpha: 15,
  beta: 0.25,
  targetUsd: 0,
};

const numericFields: Array<keyof ROICalculationInputs> = [
  'cost',
  'inflation',
  'mmf',
  'mpr',
  'usdNgn',
  'entryUsdNgn',
  'usInflation',
  'usTreasury',
  'alpha',
  'beta',
  'targetUsd',
];

const fieldLabels: Record<keyof ROICalculationInputs, string> = {
  cost: 'Property Cost',
  startDate: 'Start Month',
  endDate: 'End Month',
  inflation: 'Inflation',
  mmf: 'MMF',
  mpr: 'MPR',
  usdNgn: 'Current USD/NGN',
  entryUsdNgn: 'Entry USD/NGN',
  usInflation: 'US Inflation',
  usTreasury: 'US Treasury',
  alpha: 'Alpha',
  beta: 'Beta',
  targetUsd: 'Target USD',
};

const buildInputs = (property?: Property | null, assumptions?: ROIAssumptions | null): ROICalculationInputs => {
  const cost = property?.price ?? defaultInputs.cost;
  const usdNgn = assumptions?.usdNgn || defaultInputs.usdNgn;
  return {
    ...defaultInputs,
    cost,
    targetUsd: cost && usdNgn ? Math.round(cost / usdNgn) : 0,
    inflation: assumptions?.inflation ?? defaultInputs.inflation,
    mmf: assumptions?.mmf ?? defaultInputs.mmf,
    mpr: assumptions?.mpr ?? defaultInputs.mpr,
    usdNgn,
    entryUsdNgn: usdNgn,
    usInflation: assumptions?.usInflation ?? defaultInputs.usInflation,
    usTreasury: assumptions?.usTreasury ?? defaultInputs.usTreasury,
    alpha: assumptions?.defaultAlpha ?? defaultInputs.alpha,
    beta: assumptions?.defaultBeta ?? defaultInputs.beta,
  };
};

const ROICalculator = ({ property, onScenarioSaved }: ROICalculatorProps) => {
  const [assumptions, setAssumptions] = useState<ROIAssumptions | null>(null);
  const [inputs, setInputs] = useState<ROICalculationInputs>(() => buildInputs(property));
  const [results, setResults] = useState<ROICalculationResults | null>(null);
  const [benchmark, setBenchmark] = useState<MarketBenchmark | null>(null);
  const [errors, setErrors] = useState<ROIFormErrors>({});
  const [loadingAssumptions, setLoadingAssumptions] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadAssumptions = async () => {
      setLoadingAssumptions(true);
      try {
        const nextAssumptions = await roiService.getAssumptions();
        if (!active) return;
        setAssumptions(nextAssumptions);
        setInputs(buildInputs(property, nextAssumptions));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load ROI assumptions.');
      } finally {
        if (active) setLoadingAssumptions(false);
      }
    };
    void loadAssumptions();
    return () => {
      active = false;
    };
  }, [property]);

  const hasResults = useMemo(() => results !== null, [results]);

  const updateNumber = (field: keyof ROICalculationInputs, value: string) => {
    setInputs((current) => ({ ...current, [field]: Number(value) }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setResults(null);
  };

  const updateDate = (field: keyof ROICalculationInputs, value: string) => {
    setInputs((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setResults(null);
  };

  const validate = () => {
    const nextErrors: ROIFormErrors = {};
    numericFields.forEach((field) => {
      const value = Number(inputs[field]);
      if (!Number.isFinite(value)) nextErrors[field] = `${fieldLabels[field]} must be a number.`;
      if (['cost', 'usdNgn', 'entryUsdNgn'].includes(field) && value <= 0) {
        nextErrors[field] = `${fieldLabels[field]} must be greater than zero.`;
      }
      if (field === 'targetUsd' && value < 0) {
        nextErrors[field] = 'Target USD cannot be negative.';
      }
    });
    if (!inputs.startDate) nextErrors.startDate = 'Start month is required.';
    if (!inputs.endDate) nextErrors.endDate = 'End month is required.';
    if (inputs.startDate && inputs.endDate && inputs.endDate <= inputs.startDate) {
      nextErrors.endDate = 'End month must be after start month.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCalculate = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!validate()) return;
    setCalculating(true);
    try {
      const nextResults = await roiService.calculate(inputs);
      setResults(nextResults);
      toast.success('ROI calculation complete.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to calculate ROI.');
    } finally {
      setCalculating(false);
    }
  };

  const handleBenchmark = async () => {
    setLoadingBenchmark(true);
    try {
      const nextBenchmark = await roiService.getMarketBenchmark({
        location: property?.location,
        propertyType: property?.propertyType,
      });
      setBenchmark(nextBenchmark);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load market benchmark.');
    } finally {
      setLoadingBenchmark(false);
    }
  };

  const handleSaveScenario = async () => {
    const propertyReference = propertyRouteReference(property);
    if (!propertyReference) {
      toast.error('Open a property ROI calculator to save this scenario.');
      return;
    }
    if (!validate()) return;

    setSaving(true);
    try {
      await roiService.savePropertyScenario(propertyReference, {
        source: 'property_detail',
        inputs: {
          startDate: inputs.startDate,
          endDate: inputs.endDate,
          alpha: inputs.alpha,
          beta: inputs.beta,
        },
      });
      toast.success('ROI scenario saved.');
      onScenarioSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save ROI scenario.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <ROIAssumptionsDisplay assumptions={assumptions} loading={loadingAssumptions} />

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <Card className="overflow-hidden">
          <div className="bg-primary text-on-primary p-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-on-primary/70 font-bold">Investment Tool</p>
              <h1 className="text-3xl font-extrabold tracking-tight mt-2">ROI Calculator</h1>
              <p className="text-sm text-on-primary/75 mt-2 max-w-2xl">
                Calculate ROI targets from admin-managed market assumptions and currency expectations.
              </p>
            </div>
            {property ? (
              <div className="text-sm text-on-primary/80 md:text-right">
                <p className="font-bold text-on-primary">{property.title}</p>
                <p>{formatNaira(property.price)}</p>
              </div>
            ) : null}
          </div>

          <form className="p-6 space-y-6" onSubmit={(event) => void handleCalculate(event)}>
            <section>
              <h2 className="text-xl font-bold mb-4">Core Inputs</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input id="cost" label="Property Cost" type="number" min="0" step="any" value={inputs.cost} error={errors.cost} onChange={(event) => updateNumber('cost', event.target.value)} />
                <Input id="targetUsd" label="Target USD" type="number" min="0" step="any" value={inputs.targetUsd} error={errors.targetUsd} onChange={(event) => updateNumber('targetUsd', event.target.value)} />
                <Input id="startDate" label="Start Month" type="month" value={inputs.startDate} error={errors.startDate} onChange={(event) => updateDate('startDate', event.target.value)} />
                <Input id="endDate" label="End Month" type="month" value={inputs.endDate} error={errors.endDate} onChange={(event) => updateDate('endDate', event.target.value)} />
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">Assumption Overrides</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {numericFields.filter((field) => !['cost', 'targetUsd'].includes(field)).map((field) => (
                  <Input
                    key={field}
                    id={field}
                    label={fieldLabels[field]}
                    type="number"
                    step="any"
                    min={['usdNgn', 'entryUsdNgn'].includes(field) ? 0 : undefined}
                    value={Number(inputs[field])}
                    error={errors[field]}
                    onChange={(event) => updateNumber(field, event.target.value)}
                  />
                ))}
              </div>
            </section>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={calculating}>
                {calculating ? 'Calculating...' : hasResults ? 'Recalculate ROI' : 'Calculate ROI'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => void handleBenchmark()} disabled={loadingBenchmark}>
                {loadingBenchmark ? 'Loading Benchmark...' : 'Load Benchmark'}
              </Button>
              {property ? (
                <Button type="button" variant="ghost" onClick={() => void handleSaveScenario()} disabled={saving}>
                  {saving ? 'Saving...' : 'Save ROI Scenario'}
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <ROIResultsCard results={results} loading={calculating} />
          <BenchmarkCard benchmark={benchmark} propertyPrice={property?.price ?? inputs.cost} loading={loadingBenchmark} />
        </div>
      </div>
    </div>
  );
};

export default ROICalculator;
