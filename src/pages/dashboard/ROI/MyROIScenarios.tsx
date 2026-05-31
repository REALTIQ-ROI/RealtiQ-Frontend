import { useMemo, useState } from 'react';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import ScenarioList from '../../../components/roi/ScenarioList';
import { useAsync } from '../../../hooks/useAsync';
import { roiService, type ROIScenario } from '../../../services/roiService';

type SortMode = 'newest' | 'profit' | 'roi';

const scenarioProfit = (scenario: ROIScenario) => scenario.results?.finalProfit ?? scenario.result?.finalProfit ?? 0;
const scenarioRoi = (scenario: ROIScenario) => {
  const profit = scenarioProfit(scenario);
  const cost = scenario.inputs.cost ?? 0;
  return cost > 0 ? profit / cost : 0;
};

const MyROIScenarios = () => {
  const { data, loading, error, execute } = useAsync(() => roiService.getMyScenarios(), true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');

  const scenarios = useMemo(() => {
    const filtered = (data ?? []).filter((scenario) => {
      const property = scenario.property ?? scenario.propertyId;
      const title = property && typeof property !== 'string' ? property.title : '';
      return title.toLowerCase().includes(query.toLowerCase());
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'profit') return scenarioProfit(b) - scenarioProfit(a);
      if (sort === 'roi') return scenarioRoi(b) - scenarioRoi(a);
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });
  }, [data, query, sort]);

  return (
    <BuyerPortalLayout
      pageEyebrow="Investment Analysis"
      pageTitle="My ROI Scenarios"
      pageSubtitle="Saved ROI calculations across your properties."
    >
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-secondary font-bold">Investment Analysis</p>
            <h1 className="text-3xl font-extrabold">My ROI Scenarios</h1>
            <p className="text-sm text-secondary mt-1">Saved ROI calculations across your properties.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void execute()} disabled={loading}>
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
          <Input
            label="Filter by property"
            value={query}
            placeholder="Search property title"
            onChange={(event) => setQuery(event.target.value)}
          />
          <label className="space-y-2">
            <span className="block text-on-surface font-label text-xs font-bold uppercase tracking-wider">Sort</span>
            <select
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-surface-tint/20"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
            >
              <option value="newest">Newest</option>
              <option value="profit">Highest profit</option>
              <option value="roi">Highest ROI</option>
            </select>
          </label>
        </div>

        {error ? (
          <div className="rounded-lg bg-red-50 text-error p-4 text-sm">
            Unable to load ROI scenarios. Please try again.
          </div>
        ) : null}

        <ScenarioList scenarios={scenarios} loading={loading} showProperty />
      </section>
    </BuyerPortalLayout>
  );
};

export default MyROIScenarios;
