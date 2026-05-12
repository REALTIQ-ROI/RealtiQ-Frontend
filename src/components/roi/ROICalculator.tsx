import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Button from "../ui/Button";
import Card from "../ui/Card";
import {
  roiService,
  type MarketBenchmark,
  type ROIAssumptions,
  type ROIScenarioPayload,
} from "../../services/roiService";
import type { Property } from "../../types";
import {
  calculateROI,
  estimateDefaultRent,
  type ROICalculationInput,
  type ROICalculationResult,
} from "../../utils/roiCalculator";

interface ROIProperty extends Property {
  completionStage?: string;
  category?: string;
  currency?: string;
}

interface ROICalculatorProps {
  property?: ROIProperty | null;
}

interface ROIFormState {
  purchasePrice: number;
  annualRent: number;
  operatingExpenses: number;
  appreciationRate: number;
  holdingPeriodYears: number;
  downPaymentPercent: number;
  closingCosts: number;
  location: string;
  propertyType: string;
  completionStage: string;
  category: string;
  currency: string;
}

const defaultAssumptions: ROIAssumptions = {
  inflationRate: 0,
  rentalYieldPercent: 0,
  appreciationRate: 0,
  operatingExpensePercent: 0,
  closingCostPercent: 0,
  downPaymentPercent: 100,
  holdingPeriodYears: 5,
  currency: "NGN",
};

const propertyTypeOptions = [
  "house",
  "apartment",
  "land",
  "commercial",
  "villa",
  "penthouse",
  "estate",
];
const completionStageOptions = [
  "completed",
  "off-plan",
  "shell",
  "semi-finished",
  "fully-finished",
  "furnished",
];
const categoryOptions = ["sale"];

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const formatPercent = (value: number) =>
  `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;

const toInput = (state: ROIFormState): ROICalculationInput => ({
  purchasePrice: state.purchasePrice,
  annualRent: state.annualRent,
  operatingExpenses: state.operatingExpenses,
  appreciationRate: state.appreciationRate,
  holdingPeriodYears: state.holdingPeriodYears,
  downPaymentPercent: state.downPaymentPercent,
  closingCosts: state.closingCosts,
  currency: state.currency,
});

const ROICalculator = ({ property }: ROICalculatorProps) => {
  const [assumptions, setAssumptions] =
    useState<ROIAssumptions>(defaultAssumptions);
  const [form, setForm] = useState<ROIFormState>({
    purchasePrice: property?.price ?? 0,
    annualRent: 0,
    operatingExpenses: 0,
    appreciationRate: 0,
    holdingPeriodYears: 5,
    downPaymentPercent: 100,
    closingCosts: 0,
    location: property?.location ?? "",
    propertyType: property?.propertyType ?? "house",
    completionStage: property?.completionStage ?? "completed",
    category: property?.category ?? "sale",
    currency: property?.currency ?? "NGN",
  });
  const [result, setResult] = useState<ROICalculationResult | null>(null);
  const [benchmark, setBenchmark] = useState<MarketBenchmark | null>(null);
  const [loadingAssumptions, setLoadingAssumptions] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAssumptions = async () => {
      setLoadingAssumptions(true);
      try {
        const nextAssumptions = await roiService.getAssumptions();
        if (!isMounted) return;
        setAssumptions(nextAssumptions);
        setForm((current) => {
          const purchasePrice = property?.price ?? current.purchasePrice;
          const annualRent =
            current.annualRent ||
            estimateDefaultRent(
              purchasePrice,
              nextAssumptions.rentalYieldPercent,
            );
          return {
            ...current,
            purchasePrice,
            annualRent,
            operatingExpenses:
              current.operatingExpenses ||
              Math.round(
                annualRent * (nextAssumptions.operatingExpensePercent / 100),
              ),
            appreciationRate:
              current.appreciationRate || nextAssumptions.appreciationRate,
            holdingPeriodYears:
              current.holdingPeriodYears || nextAssumptions.holdingPeriodYears,
            downPaymentPercent:
              current.downPaymentPercent || nextAssumptions.downPaymentPercent,
            closingCosts:
              current.closingCosts ||
              Math.round(
                purchasePrice * (nextAssumptions.closingCostPercent / 100),
              ),
            currency:
              property?.currency ??
              nextAssumptions.currency ??
              current.currency,
          };
        });
      } catch {
        toast.error("Unable to load ROI assumptions from the server.");
      } finally {
        if (isMounted) {
          setLoadingAssumptions(false);
        }
      }
    };

    void loadAssumptions();

    return () => {
      isMounted = false;
    };
  }, [property]);

  useEffect(() => {
    if (!property) return;

    setForm((current) => ({
      ...current,
      purchasePrice: property.price ?? current.purchasePrice,
      location: property.location ?? current.location,
      propertyType: property.propertyType ?? current.propertyType,
      completionStage: property.completionStage ?? current.completionStage,
      category: property.category ?? current.category,
      currency: property.currency ?? current.currency,
    }));
  }, [property]);

  const localResult = useMemo(() => calculateROI(toInput(form)), [form]);

  const updateField = (field: keyof ROIFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: [
        "location",
        "propertyType",
        "completionStage",
        "category",
        "currency",
      ].includes(field)
        ? value
        : Number(value),
    }));
  };

  const handleCalculate = async () => {
    setCalculating(true);
    const payload: ROIScenarioPayload = {
      ...toInput(form),
      propertyId: property?._id,
      propertyTitle: property?.title,
      location: form.location,
      propertyType: form.propertyType,
      completionStage: form.completionStage,
      category: form.category,
      benchmark,
    };

    try {
      const serverResult = await roiService.calculate(payload);
      setResult(serverResult);
    } catch {
      setResult(localResult);
      toast.error("Server ROI calculation failed. Showing the local estimate.");
    } finally {
      setCalculating(false);
    }
  };

  const handleBenchmark = async () => {
    setLoadingBenchmark(true);
    try {
      const nextBenchmark = await roiService.getMarketBenchmark({
        location: form.location,
        propertyType: form.propertyType,
        completionStage: form.completionStage,
        category: form.category,
        currency: form.currency,
      });
      setBenchmark(nextBenchmark);
      if (nextBenchmark.averageRent) {
        setForm((current) => ({
          ...current,
          annualRent: Math.round(
            nextBenchmark.averageRent ?? current.annualRent,
          ),
        }));
      }
      if (nextBenchmark.appreciationRate) {
        setForm((current) => ({
          ...current,
          appreciationRate:
            nextBenchmark.appreciationRate ?? current.appreciationRate,
        }));
      }
    } catch {
      toast.error("Unable to load market benchmark from the server.");
    } finally {
      setLoadingBenchmark(false);
    }
  };

  const handleSaveScenario = async () => {
    if (!property?._id) {
      toast.error("Open this calculator from a property to save a scenario.");
      return;
    }

    const activeResult = result ?? localResult;
    setSaving(true);
    try {
      await roiService.savePropertyScenario(property._id, {
        ...toInput(form),
        propertyId: property._id,
        propertyTitle: property.title,
        location: form.location,
        propertyType: form.propertyType,
        completionStage: form.completionStage,
        category: form.category,
        benchmark,
        result: activeResult,
      });
      toast.success("ROI scenario saved.");
    } catch {
      toast.error("Unable to save ROI scenario.");
    } finally {
      setSaving(false);
    }
  };

  const activeResult = result ?? localResult;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-primary text-on-primary p-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-on-primary/70 font-bold">
              Investment Tool
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight mt-2">
              ROI Calculator
            </h1>
            <p className="text-sm text-on-primary/75 mt-2 max-w-2xl">
              Analyze rental yield, resale upside, and total return using live
              assumptions and market benchmarks.
            </p>
          </div>
          {property ? (
            <div className="text-sm text-on-primary/80 md:text-right">
              <p className="font-bold text-on-primary">{property.title}</p>
              <p>{property.location}</p>
            </div>
          ) : null}
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Property Inputs</h2>
                {loadingAssumptions ? (
                  <span className="text-xs text-secondary">
                    Loading assumptions...
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2 text-sm font-semibold">
                  Purchase Cost
                  <input
                    className="w-full bg-surface-container-low rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                    type="number"
                    min="0"
                    value={form.purchasePrice}
                    onChange={(event) =>
                      updateField("purchasePrice", event.target.value)
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Annual Rent
                  <input
                    className="w-full bg-surface-container-low rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                    type="number"
                    min="0"
                    value={form.annualRent}
                    onChange={(event) =>
                      updateField("annualRent", event.target.value)
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Operating Expenses
                  <input
                    className="w-full bg-surface-container-low rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                    type="number"
                    min="0"
                    value={form.operatingExpenses}
                    onChange={(event) =>
                      updateField("operatingExpenses", event.target.value)
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Closing Costs
                  <input
                    className="w-full bg-surface-container-low rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                    type="number"
                    min="0"
                    value={form.closingCosts}
                    onChange={(event) =>
                      updateField("closingCosts", event.target.value)
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Appreciation Rate
                  <input
                    className="w-full bg-surface-container-low rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.appreciationRate}
                    onChange={(event) =>
                      updateField("appreciationRate", event.target.value)
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Holding Period
                  <input
                    className="w-full bg-surface-container-low rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                    type="number"
                    min="1"
                    value={form.holdingPeriodYears}
                    onChange={(event) =>
                      updateField("holdingPeriodYears", event.target.value)
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Down Payment %
                  <input
                    className="w-full bg-surface-container-low rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                    type="number"
                    min="0"
                    max="100"
                    value={form.downPaymentPercent}
                    onChange={(event) =>
                      updateField("downPaymentPercent", event.target.value)
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Currency
                  <select
                    className="w-full bg-surface-container-low rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                    value={form.currency}
                    onChange={(event) =>
                      updateField("currency", event.target.value)
                    }
                  >
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">Market Context</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2 text-sm font-semibold">
                  Location
                  <input
                    className="w-full bg-surface-container-low rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                    value={form.location}
                    onChange={(event) =>
                      updateField("location", event.target.value)
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Property Type
                  <select
                    className="w-full bg-surface-container-low rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 capitalize"
                    value={form.propertyType}
                    onChange={(event) =>
                      updateField("propertyType", event.target.value)
                    }
                  >
                    {propertyTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Completion Stage
                  <select
                    className="w-full bg-surface-container-low rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 capitalize"
                    value={form.completionStage}
                    onChange={(event) =>
                      updateField("completionStage", event.target.value)
                    }
                  >
                    {completionStageOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Category
                  <select
                    className="w-full bg-surface-container-low rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 capitalize"
                    value={form.category}
                    onChange={(event) =>
                      updateField("category", event.target.value)
                    }
                  >
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => void handleBenchmark()}
                  disabled={loadingBenchmark}
                >
                  {loadingBenchmark
                    ? "Loading Benchmark..."
                    : "Load Market Benchmark"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleCalculate()}
                  disabled={calculating}
                >
                  {calculating ? "Calculating..." : "Analyze ROI"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void handleSaveScenario()}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Scenario"}
                </Button>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <div className="bg-surface-container-low rounded-xl p-5">
              <p className="text-xs text-secondary uppercase tracking-widest font-bold mb-2">
                Annualized ROI
              </p>
              <p className="text-4xl font-black text-primary">
                {formatPercent(activeResult.annualizedROI)}
              </p>
              <p className="text-xs text-secondary mt-2">
                Gross yield: {formatPercent(activeResult.grossYield)}
              </p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-secondary">Total Investment</span>
                <strong>
                  {formatCurrency(activeResult.totalInvestment, form.currency)}
                </strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-secondary">Net Annual Income</span>
                <strong>
                  {formatCurrency(activeResult.netAnnualIncome, form.currency)}
                </strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-secondary">Projected Sale</span>
                <strong>
                  {formatCurrency(
                    activeResult.projectedSalePrice,
                    form.currency,
                  )}
                </strong>
              </div>
              <div className="flex justify-between gap-4 pt-3 border-t border-outline-variant/20">
                <span className="text-secondary">Total Profit</span>
                <strong>
                  {formatCurrency(activeResult.totalProfit, form.currency)}
                </strong>
              </div>
            </div>
            {benchmark ? (
              <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-5 space-y-2 text-sm">
                <p className="text-xs text-secondary uppercase tracking-widest font-bold">
                  Market Benchmark
                </p>
                <p className="font-bold">{benchmark.location}</p>
                <p className="text-secondary">
                  Average price:{" "}
                  {formatCurrency(
                    benchmark.averagePrice,
                    benchmark.currency || form.currency,
                  )}
                </p>
                {benchmark.rentalYieldPercent ? (
                  <p className="text-secondary">
                    Yield: {formatPercent(benchmark.rentalYieldPercent)}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-5 text-xs text-secondary leading-relaxed">
              Assumptions are loaded from the ROI API. Local math is used only
              as a fallback when the calculation endpoint is unavailable.
              {assumptions.inflationRate
                ? ` Current inflation assumption: ${formatPercent(assumptions.inflationRate)}.`
                : ""}
            </div>
          </aside>
        </div>
      </Card>
    </div>
  );
};

export default ROICalculator;
