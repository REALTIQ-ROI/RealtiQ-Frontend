import { Link } from "react-router-dom";
import type { AvmValuation } from "../../types/phase45";
const money = (value: number | undefined, currency: string) =>
  value === undefined
    ? "Unavailable"
    : new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value);
const ValuationResult = ({ valuation }: { valuation: AvmValuation }) => (
  <article
    className={
      "space-y-5 rounded-2xl border border-outline-variant/10 bg-white p-6"
    }
    aria-labelledby={"valuation-result-title"}
  >
    <header>
      <p
        className={"text-xs font-bold uppercase tracking-widest text-secondary"}
      >
        {valuation.publicReference}
      </p>
      <h2 id={"valuation-result-title"} className={"mt-2 text-2xl font-black"}>
        {valuation.status === "completed"
          ? "Automated value estimate"
          : "Insufficient evidence"}
      </h2>
      <p className={"mt-1 text-sm text-secondary"}>
        As of {new Date(valuation.asOf).toLocaleString("en-NG")} · Confidence:{" "}
        <strong className={"capitalize"}>{valuation.confidence}</strong>
        {valuation.confidenceScore !== undefined
          ? ` (${Math.round(valuation.confidenceScore * 100)}%)`
          : ""}
      </p>
    </header>
    {valuation.status === "completed" ? (
      <div className={"rounded-xl bg-primary p-5 text-on-primary"}>
        <p className={"text-sm"}>Estimated value</p>
        <p className={"mt-1 text-3xl font-black"}>
          {money(valuation.estimate, valuation.currency)}
        </p>
        <p className={"mt-2 text-sm"}>
          Conservative range: {money(valuation.range?.low, valuation.currency)}{" "}
          – {money(valuation.range?.high, valuation.currency)}
        </p>
      </div>
    ) : (
      <div className={"rounded-xl bg-surface-container-low p-5"}>
        <p className={"font-bold"}>No estimate or range is shown.</p>
        <p className={"mt-1 text-sm text-secondary"}>
          The available evidence did not meet the minimum comparable threshold.
        </p>
      </div>
    )}
    <section>
      <h3 className={"font-black"}>Evidence source</h3>
      <div className={"mt-2 grid gap-3 sm:grid-cols-3"}>
        <div className={"rounded-lg bg-surface-container-low p-3"}>
          <strong>{valuation.comparableCount ?? 0}</strong>
          <p className={"text-xs text-secondary"}>eligible comparables</p>
        </div>
        <div className={"rounded-lg bg-surface-container-low p-3"}>
          <strong>{valuation.sourceMix?.approvedAsking ?? 0}</strong>
          <p className={"text-xs text-secondary"}>Asking price</p>
        </div>
        <div className={"rounded-lg bg-surface-container-low p-3"}>
          <strong>{valuation.sourceMix?.verifiedSales ?? 0}</strong>
          <p className={"text-xs text-secondary"}>Verified sale</p>
        </div>
      </div>
      {(valuation.sourceMix?.approvedAsking ?? 0) > 0 &&
      (valuation.sourceMix?.verifiedSales ?? 0) === 0 ? (
        <p className={"mt-2 text-sm font-semibold text-amber-800"}>
          This estimate is based on approved asking prices and does not include
          verified completed sales.
        </p>
      ) : null}
    </section>
    {valuation.comparables?.length ? (
      <section>
        <h3 className={"font-black"}>Comparable properties</h3>
        <div className={"mt-2 overflow-x-auto"}>
          <table className={"w-full text-left text-sm"}>
            <thead>
              <tr>
                <th className={"p-2"}>Reference</th>
                <th className={"p-2"}>Source</th>
                <th className={"p-2"}>Effective date</th>
                <th className={"p-2"}>Adjusted price</th>
                <th className={"p-2"}>Distance</th>
              </tr>
            </thead>
            <tbody>
              {valuation.comparables.map((row, index) => (
                <tr
                  key={row.publicReference ?? row.observation ?? index}
                  className={"border-t"}
                >
                  <td className={"p-2"}>
                    {row.publicReference ? (
                      <Link
                        className={"font-bold text-primary underline"}
                        to={`/properties/${row.publicReference}`}
                      >
                        {row.publicReference}
                      </Link>
                    ) : (
                      "Reference unavailable"
                    )}
                  </td>
                  <td className={"p-2 font-semibold"}>
                    {row.sourceType === "approved_asking"
                      ? "Asking price"
                      : "Verified sale"}
                  </td>
                  <td className={"p-2"}>
                    {row.effectiveAt
                      ? new Date(row.effectiveAt).toLocaleString("en-NG")
                      : "Not supplied"}
                  </td>
                  <td className={"p-2"}>
                    {money(row.adjustedPrice, valuation.currency)}
                  </td>
                  <td className={"p-2"}>
                    {row.distanceKm === undefined
                      ? "Unknown"
                      : `${row.distanceKm.toFixed(1)} km`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    ) : null}
    {valuation.factors?.length ? (
      <section>
        <h3 className={"font-black"}>Explainable factors</h3>
        <ul className={"mt-2 space-y-2"}>
          {valuation.factors.map((factor) => (
            <li
              key={factor.code}
              className={"rounded-lg bg-surface-container-low p-3"}
            >
              <strong>{factor.label}</strong>{" "}
              <span className={"text-xs uppercase text-secondary"}>
                ({factor.direction})
              </span>
              {factor.explanation ? (
                <p className={"mt-1 text-sm text-secondary"}>
                  {factor.explanation}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    ) : null}
    {valuation.warnings?.length ? (
      <section>
        <h3 className={"font-black"}>Warnings</h3>
        <ul className={"mt-2 list-disc space-y-1 pl-5 text-sm"}>
          {valuation.warnings.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    ) : null}
    {valuation.limitations?.length ? (
      <section>
        <h3 className={"font-black"}>Limitations</h3>
        <ul className={"mt-2 list-disc space-y-1 pl-5 text-sm text-secondary"}>
          {valuation.limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    ) : null}
    <footer className={"text-xs text-secondary"}>
      Algorithm: {valuation.algorithmVersion || "Not supplied"} · Policy:{" "}
      {valuation.policyVersion || "Not supplied"} · Data:{" "}
      {Object.entries(valuation.sourceDatasetVersions ?? {})
        .map(([key, version]) => `${key} ${version}`)
        .join(", ") || "Not supplied"}
    </footer>
  </article>
);
export default ValuationResult;
