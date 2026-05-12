import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import type { ROIScenario, ScenarioProperty } from '../../services/roiService';
import { formatDate, formatMonth, formatNaira, formatPercent } from './roiFormatters';

interface ScenarioListProps {
  scenarios: ROIScenario[];
  loading?: boolean;
  showProperty?: boolean;
}

const resolveResults = (scenario: ROIScenario) => scenario.results ?? scenario.result ?? null;

const resolveProperty = (scenario: ROIScenario): ScenarioProperty | null => {
  const property = scenario.property ?? scenario.propertyId;
  return property && typeof property !== 'string' ? property : null;
};

const ScenarioList = ({ scenarios, loading = false, showProperty = false }: ScenarioListProps) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="p-5 h-28 bg-surface-container-low animate-pulse">
            <span className="sr-only">Loading scenario</span>
          </Card>
        ))}
      </div>
    );
  }

  if (!scenarios.length) {
    return (
      <Card className="p-6 text-center">
        <span className="material-symbols-outlined text-4xl text-secondary">folder_open</span>
        <h2 className="text-xl font-bold mt-2">No ROI scenarios yet</h2>
        <p className="text-sm text-secondary mt-1">Saved scenario results will appear here.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {scenarios.map((scenario) => {
        const results = resolveResults(scenario);
        const property = resolveProperty(scenario);
        const roi = scenario.inputs.cost && results?.finalProfit
          ? (results.finalProfit / scenario.inputs.cost) * 100
          : null;

        return (
          <details
            key={scenario._id}
            className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-5 open:shadow-sm"
          >
            <summary className="cursor-pointer list-none">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {showProperty && property?.media?.[0]?.url ? (
                    <img className="h-14 w-16 rounded-lg object-cover" src={property.media[0].url} alt={property.title} />
                  ) : null}
                  <div>
                    <p className="font-bold">{showProperty ? property?.title ?? 'Property scenario' : 'Saved scenario'}</p>
                    <p className="text-xs text-secondary">
                      {formatDate(scenario.createdAt)} · {formatMonth(scenario.inputs.startDate)} to {formatMonth(scenario.inputs.endDate)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <span><span className="text-secondary">Sale:</span> <strong>{formatNaira(results?.finalSellingPrice)}</strong></span>
                  <span><span className="text-secondary">Profit:</span> <strong>{formatNaira(results?.finalProfit)}</strong></span>
                  <span><span className="text-secondary">ROI:</span> <strong>{roi === null ? 'N/A' : formatPercent(roi, 1)}</strong></span>
                  {showProperty && property?._id ? (
                    <Link className="text-primary font-bold hover:underline" to={`/properties/${property._id}`}>Open property</Link>
                  ) : (
                    <span><span className="text-secondary">Alpha:</span> <strong>{scenario.inputs.alpha ?? 'N/A'}</strong></span>
                  )}
                </div>
              </div>
            </summary>

            <div className="mt-5 pt-4 border-t border-outline-variant/10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <p><span className="text-secondary">Cost:</span> <strong>{formatNaira(scenario.inputs.cost)}</strong></p>
              <p><span className="text-secondary">Target USD:</span> <strong>${Number(scenario.inputs.targetUsd ?? 0).toLocaleString()}</strong></p>
              <p><span className="text-secondary">USD/NGN:</span> <strong>{Number(scenario.inputs.usdNgn ?? 0).toLocaleString()}</strong></p>
              <p><span className="text-secondary">Entry FX:</span> <strong>{Number(scenario.inputs.entryUsdNgn ?? 0).toLocaleString()}</strong></p>
              <p><span className="text-secondary">Inflation:</span> <strong>{formatPercent(scenario.inputs.inflation, 2)}</strong></p>
              <p><span className="text-secondary">MPR:</span> <strong>{formatPercent(scenario.inputs.mpr, 2)}</strong></p>
              <p><span className="text-secondary">Beta:</span> <strong>{scenario.inputs.beta ?? 'N/A'}</strong></p>
              <p><span className="text-secondary">Source:</span> <strong>{scenario.source ?? 'N/A'}</strong></p>
            </div>
          </details>
        );
      })}
    </div>
  );
};

export default ScenarioList;
