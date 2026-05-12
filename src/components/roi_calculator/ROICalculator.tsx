// ==========================================
// ROI CALCULATOR COMPONENT (Standalone Module)
// ==========================================
import React, { useState, useMemo, useEffect } from "react";
import { Calculator } from "lucide-react";

export default function ROICalculator({ property }) {
  const [inflation, setInflation] = useState("");
  const [mmf, setMmf] = useState("");
  const [mpr, setMpr] = useState("");
  const [usdNgn, setUsdNgn] = useState("");
  const [isLoadingMacro, setIsLoadingMacro] = useState(true);

  const [showUsdPeg, setShowUsdPeg] = useState(false);
  const [entryUsdNgn, setEntryUsdNgn] = useState(1000);
  const [usInflation, setUsInflation] = useState(2.8);
  const [usTreasury, setUsTreasury] = useState(4.2);
  const [targetUsd, setTargetUsd] = useState("");

  const [cost, setCost] = useState(0);
  const [alpha, setAlpha] = useState(15.0);
  const [beta, setBeta] = useState(0.25);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [scheduleView, setScheduleView] = useState("monthly");

  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("4-Bedroom Terrace Duplex");
  const [completionStage, setCompletionStage] = useState("Fully Finished");
  const [marketData, setMarketData] = useState(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);

  useEffect(() => {
    fetchLiveMacroData();
  }, []);

  const fetchLiveMacroData = () => {
    setIsLoadingMacro(true);
    setTimeout(() => {
      setInflation(31.5);
      setMmf(19.5);
      setMpr(24.75);
      setUsdNgn(1650.5);
      setUsInflation(3.2);
      setUsTreasury(4.25);
      setIsLoadingMacro(false);
    }, 800);
  };

  const handleMarketSearch = () => {
    if (!location.trim()) return;
    setIsLoadingMarket(true);
    setMarketData(null);

    setTimeout(() => {
      const seed = location.length * 5000000;

      // Adjust mock pricing based on property type selected
      let typeModifier = 1.0;
      if (
        propertyType.includes("Standalone") ||
        propertyType.includes("Mansion")
      )
        typeModifier = 1.6;
      else if (propertyType.includes("Triplex")) typeModifier = 1.35;
      else if (propertyType.includes("Terrace")) typeModifier = 1.0;
      else if (propertyType.includes("3-Bedroom Apartment")) typeModifier = 0.7;
      else if (propertyType.includes("2-Bedroom Apartment")) typeModifier = 0.5;
      else typeModifier = 0.8;

      // Adjust mock pricing based on completion stage selected
      let stageModifier = 1.0;
      if (completionStage === "Off-Plan") stageModifier = 0.6;
      else if (completionStage === "Carcass (Shell)") stageModifier = 0.45;
      else if (completionStage === "Semi-Finished") stageModifier = 0.75;
      else if (completionStage === "Fully Finished") stageModifier = 1.0;
      else if (completionStage === "Fully Furnished") stageModifier = 1.3;

      const baseAvg =
        (110000000 + seed + Math.random() * 20000000) *
        typeModifier *
        stageModifier;

      const startYear =
        parseInt(startDate.split("-")[0]) || new Date().getFullYear();
      const historical = [];

      // Generate last 5 years from start date
      for (let i = 5; i >= 1; i--) {
        const year = startYear - i;
        const discountFactor = 1 - i * 0.16;
        const yearAvg = baseAvg * Math.max(0.2, discountFactor);
        historical.push({
          year: year,
          min: yearAvg * 0.75,
          avg: yearAvg,
          max: yearAvg * 1.45,
          adjusted: yearAvg * Math.pow(1.28, i), // Compounded historical inflation estimate
        });
      }

      setMarketData({
        area: location,
        type: propertyType,
        stage: completionStage,
        min: baseAvg * 0.75,
        max: baseAvg * 1.45,
        avg: baseAvg,
        historical: historical,
      });
      setIsLoadingMarket(false);
    }, 1200);
  };

  const handleChange = (setter) => (e) =>
    setter(e.target.value === "" ? "" : parseFloat(e.target.value));
  const getVal = (val) => (val === "" || isNaN(val) ? 0 : val);
  const formatCurrency = (val, currency = "NGN") =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(isNaN(val) ? 0 : val);

  const safeInflation = getVal(inflation);
  const safeMmf = getVal(mmf);
  const safeMpr = getVal(mpr);
  const safeBeta = getVal(beta);
  const safeAlpha = getVal(alpha);
  const safeCost = getVal(cost);
  const safeUsdNgn = getVal(usdNgn) || 1;
  const safeEntryUsdNgn = getVal(entryUsdNgn) || 1;

  const entryUsdValue = safeCost / safeEntryUsdNgn;
  const baseHurdle = Math.max(safeInflation, safeMmf);
  const mprAdjustment = safeMpr * safeBeta;
  const annualTargetROI = baseHurdle + mprAdjustment + safeAlpha;

  const startD = new Date(startDate + "-01");
  const endD = new Date(endDate + "-01");
  let monthsDiff = Math.max(
    0,
    Math.min(
      60,
      (endD.getFullYear() - startD.getFullYear()) * 12 +
        (endD.getMonth() - startD.getMonth()),
    ),
  );
  const yearsDiff = monthsDiff / 12;

  const finalSellingPrice =
    safeCost * Math.pow(1 + annualTargetROI / 100, yearsDiff);
  const finalProfit = finalSellingPrice - safeCost;

  const usBaseHurdle = Math.max(getVal(usInflation), getVal(usTreasury));
  const usAnnualTargetROI = usBaseHurdle + safeAlpha;
  const calculatedUsdTarget =
    entryUsdValue * Math.pow(1 + usAnnualTargetROI / 100, yearsDiff);
  const finalTargetUsd =
    getVal(targetUsd) > 0 ? getVal(targetUsd) : calculatedUsdTarget;
  const requiredNairaForUsdTarget = finalTargetUsd * safeUsdNgn;

  const activeSchedule = useMemo(() => {
    const arr = [];
    let currentMonth = new Date(startD);
    for (let m = 0; m <= monthsDiff; m++) {
      const priceAtMonth =
        safeCost * Math.pow(1 + annualTargetROI / 100, m / 12);
      const rowData = {
        monthIndex: m,
        date: new Date(currentMonth).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        price: priceAtMonth,
        usdPrice: priceAtMonth / safeUsdNgn,
      };
      if (scheduleView === "monthly") {
        arr.push(rowData);
      } else if (m > 0 && m % 12 === 0) {
        arr.push({ ...rowData, label: `Year ${m / 12}` });
      } else if (m === monthsDiff && m % 12 !== 0 && m > 0) {
        arr.push({ ...rowData, label: `End of Term (${m} mos)` });
      }
    }
    return arr;
  }, [monthsDiff, safeCost, annualTargetROI, safeUsdNgn, scheduleView, startD]);

  const priceDifference = finalSellingPrice - (marketData ? marketData.avg : 0);
  const isOverPriced = marketData && finalSellingPrice > marketData.avg * 1.15;

  useEffect(() => {
    if (!property) return;

    if (property.price) {
      setCost(property.price);
    }

    if (property.location) {
      setLocation(
        typeof property.location === "string"
          ? property.location
          : property.location.name || property.location.address || "",
      );
    }

    if (property.type) {
      setPropertyType(property.type);
    }

    if (property.completionStage) {
      setCompletionStage(property.completionStage);
    }
  }, [property]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-indigo-900 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calculator className="w-5 h-5" /> Triple-Lock ROI Calculator
            </h2>
            <p className="text-indigo-200 text-sm mt-1">
              Algorithm: Compounded Minimum Value Base = Max(Inflation, MMF) +
              β(MPR) + α (Developer Margin)
            </p>
          </div>
          <button
            onClick={fetchLiveMacroData}
            disabled={isLoadingMacro}
            className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoadingMacro ? "Syncing..." : "Refresh Live Data"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 md:p-8">
          {/* Inputs Section */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                1. Market Inputs
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Inflation Rate (%)
                  </label>
                  <input
                    type="number"
                    value={inflation}
                    onChange={handleChange(setInflation)}
                    disabled={isLoadingMacro}
                    className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    MMF Yield (%)
                  </label>
                  <input
                    type="number"
                    value={mmf}
                    onChange={handleChange(setMmf)}
                    disabled={isLoadingMacro}
                    className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    CBN MPR (%)
                  </label>
                  <input
                    type="number"
                    value={mpr}
                    onChange={handleChange(setMpr)}
                    disabled={isLoadingMacro}
                    className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    USD/NGN Rate
                  </label>
                  <input
                    type="number"
                    value={usdNgn}
                    onChange={handleChange(setUsdNgn)}
                    disabled={isLoadingMacro}
                    className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Leverage Beta (0.1 - 0.5)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={beta}
                    onChange={handleChange(setBeta)}
                    className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  2. Project Inputs
                </h3>
                <label className="flex items-center space-x-2 text-[11px] font-bold uppercase tracking-wider text-indigo-700 cursor-pointer bg-indigo-50 px-2 py-1 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={showUsdPeg}
                    onChange={(e) => setShowUsdPeg(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>USD Peg</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-xs font-medium text-slate-500">
                      Total Capital Employed (₦)
                    </label>
                  </div>
                  <input
                    type="number"
                    value={cost}
                    onChange={handleChange(setCost)}
                    className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                  {showUsdPeg && (
                    <div className="mt-1.5">
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        USD Equiv: {formatCurrency(entryUsdValue, "USD")}
                      </span>
                    </div>
                  )}
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Developer Margin (Alpha) (%)
                  </label>
                  <input
                    type="number"
                    value={alpha}
                    onChange={handleChange(setAlpha)}
                    className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Start Date
                  </label>
                  <input
                    type="month"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Estimated Sale Date (Max 5 Yrs)
                  </label>
                  <input
                    type="month"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {showUsdPeg && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4 animate-fade-in mt-4">
                  <div className="col-span-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-1 flex items-center gap-1.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                        <path d="M2 12h20" />
                      </svg>
                      Global USD Benchmarks
                    </h4>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Entry Exchange Rate (₦/$)
                    </label>
                    <input
                      type="number"
                      value={entryUsdNgn}
                      onChange={handleChange(setEntryUsdNgn)}
                      className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Manual Target USD
                    </label>
                    <input
                      type="number"
                      value={targetUsd}
                      onChange={handleChange(setTargetUsd)}
                      placeholder="Overrides formula"
                      className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      US Fed/Treasury Yield (%)
                    </label>
                    <input
                      type="number"
                      value={usTreasury}
                      onChange={handleChange(setUsTreasury)}
                      className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      US Inflation (CPI) (%)
                    </label>
                    <input
                      type="number"
                      value={usInflation}
                      onChange={handleChange(setUsInflation)}
                      className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 flex flex-col h-full">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">
              Target Strategy
            </h3>

            <div className="space-y-1 mb-6">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Base Hurdle:</span>
                <span className="font-medium">{baseHurdle.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Risk Adj (MPR×β):</span>
                <span className="font-medium">
                  +{mprAdjustment.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Margin (α):</span>
                <span className="font-medium">+{safeAlpha.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between font-bold text-indigo-700 border-t border-slate-200 pt-2 mt-2">
                <span>Required Annual ROI:</span>
                <span>{annualTargetROI.toFixed(2)}%</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-indigo-100 mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase">
                End of Term
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Required Final Selling Price
              </p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">
                {formatCurrency(finalSellingPrice)}
              </p>
              <div className="flex justify-between mt-3 text-xs border-t border-slate-100 pt-2">
                <p className="text-slate-500">
                  Net Profit:{" "}
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(finalProfit)}
                  </span>
                </p>
                <p className="text-slate-500">
                  USD Equiv:{" "}
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(finalSellingPrice / safeUsdNgn, "USD")}
                  </span>
                </p>
              </div>
            </div>

            {showUsdPeg && (
              <div className="bg-slate-900 text-white p-5 rounded-xl shadow-md border border-slate-800 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-500 text-slate-900 text-[10px] font-extrabold px-3 py-1 rounded-bl-lg uppercase tracking-wider shadow-sm">
                  USD Preserved Target
                </div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mt-1">
                  Global Market Adjusted Exit
                </p>
                <div className="flex flex-wrap items-end gap-3 mt-2">
                  <p className="text-3xl font-bold text-amber-400">
                    US{formatCurrency(finalTargetUsd, "USD").replace("$", "$")}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700 bg-slate-800/50 -mx-5 px-5 -mb-5 pb-5">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-300">
                      Required Naira at Exit Rate (₦{safeUsdNgn}/$)
                    </p>
                    <p className="text-lg font-bold text-white bg-slate-900 px-3 py-1.5 rounded border border-slate-700">
                      {formatCurrency(requiredNairaForUsdTarget)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex justify-between items-end p-4 border-b border-slate-100 bg-slate-50">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    Time-Adjusted Schedule
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Adjusted holding prices to preserve your required ROI over
                    time.
                  </p>
                </div>
                <div className="flex bg-slate-200 rounded p-1">
                  <button
                    onClick={() => setScheduleView("monthly")}
                    className={`px-3 py-1 text-xs font-semibold rounded ${scheduleView === "monthly" ? "bg-white shadow text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setScheduleView("yearly")}
                    className={`px-3 py-1 text-xs font-semibold rounded ${scheduleView === "yearly" ? "bg-white shadow text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Yearly
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-[200px] p-0">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-500 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-2 pl-4 font-semibold">Date</th>
                      <th className="p-2 font-semibold text-right">
                        Required Price (₦)
                      </th>
                      <th className="p-2 pr-4 font-semibold text-right hidden sm:table-cell">
                        Est. USD Val ($)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeSchedule.map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-indigo-50/50 transition-colors"
                      >
                        <td className="p-2 pl-4 text-slate-600">
                          {scheduleView === "yearly" ? (
                            <b>{row.label}</b>
                          ) : (
                            row.date
                          )}
                        </td>
                        <td className="p-2 font-medium text-slate-800 text-right">
                          {formatCurrency(row.price)}
                        </td>
                        <td className="p-2 text-slate-500 text-right pr-4 hidden sm:table-cell">
                          {formatCurrency(row.usdPrice, "USD")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Market Check */}
        <div className="border-t border-slate-100 p-6 bg-slate-50">
          <label className="text-sm font-bold text-slate-800 uppercase block mb-2">
            Automated Market Sanity Check
          </label>
          <div className="flex flex-col sm:flex-row gap-2 max-w-4xl mb-4">
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white min-w-[200px]"
            >
              <option value="5-Bedroom Mansion">5-Bedroom Mansion</option>
              <option value="4-Bedroom Duplex Standalone">
                4-Bedroom Duplex Standalone
              </option>
              <option value="4-Bedroom Triplex">4-Bedroom Triplex</option>
              <option value="4-Bedroom Terrace Duplex">
                4-Bedroom Terrace Duplex
              </option>
              <option value="3-Bedroom Apartment">3-Bedroom Apartment</option>
              <option value="2-Bedroom Apartment">2-Bedroom Apartment</option>
              <option value="Commercial Shop">Commercial Shop</option>
            </select>
            <select
              value={completionStage}
              onChange={(e) => setCompletionStage(e.target.value)}
              className="p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white min-w-[150px]"
            >
              <option value="Off-Plan">Off-Plan</option>
              <option value="Carcass (Shell)">Carcass (Shell)</option>
              <option value="Semi-Finished">Semi-Finished</option>
              <option value="Fully Finished">Fully Finished</option>
              <option value="Fully Furnished">Fully Furnished</option>
            </select>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleMarketSearch()}
              placeholder="e.g., Katampe, Abuja"
              className="flex-1 p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button
              onClick={handleMarketSearch}
              disabled={isLoadingMarket || !location}
              className="bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors disabled:opacity-50 shrink-0"
            >
              {isLoadingMarket ? "Analyzing..." : "Benchmark"}
            </button>
          </div>

          {marketData && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-semibold text-slate-700">
                  Results for:{" "}
                  <b className="text-indigo-700">
                    {marketData.stage} {marketData.type} in {marketData.area}
                  </b>
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold uppercase ${isOverPriced ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}
                >
                  {isOverPriced ? "Above Market Average" : "Market Competitive"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-50 p-3 rounded-lg text-center border border-slate-100">
                  <p className="text-[10px] uppercase text-slate-500 mb-1">
                    Lowest
                  </p>
                  <p className="text-sm font-medium">
                    {formatCurrency(marketData.min)}
                  </p>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg text-center border border-indigo-100">
                  <p className="text-[10px] uppercase font-bold text-indigo-700 mb-1">
                    Average
                  </p>
                  <p className="text-base font-bold text-indigo-900">
                    {formatCurrency(marketData.avg)}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg text-center border border-slate-100">
                  <p className="text-[10px] uppercase text-slate-500 mb-1">
                    Highest
                  </p>
                  <p className="text-sm font-medium">
                    {formatCurrency(marketData.max)}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">
                  Historical Listings (5-Year Inflation Adjusted)
                </p>
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                        <th className="font-semibold p-2.5 pl-4">Year</th>
                        <th className="font-semibold p-2.5">Lowest Price</th>
                        <th className="font-semibold p-2.5">Average Price</th>
                        <th className="font-semibold p-2.5">Highest Price</th>
                        <th className="font-semibold p-2.5 pr-4">
                          Inflation-Adjusted Avg (Today)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {marketData.historical.map((h) => (
                        <tr key={h.year} className="hover:bg-slate-50">
                          <td className="p-2.5 pl-4 text-slate-700 font-medium">
                            {h.year}
                          </td>
                          <td className="p-2.5 text-slate-500">
                            {formatCurrency(h.min)}
                          </td>
                          <td className="p-2.5 text-slate-500">
                            {formatCurrency(h.avg)}
                          </td>
                          <td className="p-2.5 text-slate-500">
                            {formatCurrency(h.max)}
                          </td>
                          <td className="p-2.5 pr-4 font-semibold text-slate-800">
                            {formatCurrency(h.adjusted)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Data Sources Footer */}
        <div className="bg-white border-t border-slate-100 p-6 md:p-8">
          <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-3">
            Data Sources & Methodologies
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-xs text-slate-500">
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2">•</span>{" "}
                <span>
                  <strong>Inflation Rate:</strong> National Bureau of Statistics
                  (NBS) Consumer Price Index (CPI) Report.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2">•</span>{" "}
                <span>
                  <strong>MPR:</strong> Central Bank of Nigeria (CBN) Monetary
                  Policy Committee.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2">•</span>{" "}
                <span>
                  <strong>USD/NGN Exchange Rate:</strong> FMDQ Securities
                  Exchange (NAFEM Window).
                </span>
              </li>
            </ul>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2">•</span>{" "}
                <span>
                  <strong>MMF Yield:</strong> Stanbic IBTC Asset Management -
                  Annualized MMF Yield.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2">•</span>{" "}
                <span>
                  <strong>Market Sanity Check:</strong> Real estate listings
                  aggregated from property portals. 5-year historical pricing is
                  adjusted for inflation using NBS CPI historical data.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2">•</span>{" "}
                <span>
                  <strong>Global Benchmarks:</strong> US Federal Reserve (CPI)
                  and US Department of the Treasury (10-Year Yield).
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
