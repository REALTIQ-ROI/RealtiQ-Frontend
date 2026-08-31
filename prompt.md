# Backend Prompt: RealtIQ Evidence-Based ROI

## Mission

Implement a production-ready backend ROI foundation for RealtIQ. Inspect the backend repository, API conventions, authentication, models, AVM/property/payment/escrow/lease code, jobs, caches, tests, and documentation before editing. Reuse existing infrastructure and do not modify the frontend.

The backend must collect and normalize evidence, calculate ROI, preserve provenance, and return explainable results. The frontend only renders the response. RealtIQ verified transactions and leases are the eventual primary source of truth; legitimate free sources may supplement limited internal evidence.

## Integrity rules

- Call future results projected ROI, ROI estimate, or ROI scenario. Reserve realized ROI for verified income, expenses, and sale proceeds.
- Never describe projected returns as actual, live, guaranteed, or certified.
- Keep verified sales, verified leases, approved asking prices, user assumptions, official actuals, and forecasts separate.
- Asking prices must never be labelled completed sales.
- Missing evidence returns `status: insufficient_data` with numerical results omitted, never zero.
- AI may explain deterministic results but must not create or modify numeric inputs.
- Every assumption needs provider, source type, effective/recorded/fetched dates, confidence, freshness, and dataset version.
- Calculations must be deterministic, immutable, reproducible, versioned, and auditable.
- Never send protected property, user, payment, lease, title, or transaction data to AI.

## Evidence priority

1. Verified RealtIQ completed sales.
2. Verified RealtIQ leases and collected rent.
3. Approved RealtIQ sale asking prices.
4. Approved RealtIQ rental asking prices.
5. Explicit bounded user assumptions.
6. Official external macroeconomic observations.

Preserve source counts and provenance rather than blending everything into an anonymous average.

## Free providers

Implement typed provider adapters, not HTTP calls inside controllers.

### World Bank v2 API

Use the free, keyless API for Nigeria (`NGA`):

- `FP.CPI.TOTL.ZG`: annual inflation
- `FP.CPI.TOTL`: CPI
- `PA.NUS.FCRF`: official exchange rate
- `FR.INR.LEND`: lending interest rate
- `NY.GDP.MKTP.KD.ZG`: real GDP growth

Example:

```text
https://api.worldbank.org/v2/country/NGA/indicator/FP.CPI.TOTL.ZG?format=json&mrnev=5
```

Validate metadata, nulls, units, and dates. Never assume the first result is current. Cache normalized observations through scheduled ingestion; do not call annual APIs per ROI request.

### NBS and CBN

Create provider interfaces for NBS CPI and CBN exchange/lending rates. Use official machine-readable endpoints only when verified. If no stable API exists, implement admin-controlled CSV/JSON ingestion with schema validation, checksum, preview, deliberate publication, audit trail, and immutable versions. Never scrape HTML. Prefer current validated NBS CPI and disclose World Bank fallback use.

### IMF and OpenStreetMap

IMF DataMapper/SDMX forecasts may be added as `official_forecast`, never actual observations. They cannot determine property appreciation alone.

OSM may provide cached roads, schools, hospitals, markets, transport, banks, commercial centres, amenity density, and major-road distance. Query Overpass only from the backend at low volume with attribution, an identifying User-Agent, timeouts, rate limits, backoff, circuit breaking, and long-lived caching. Never query public OSM per page view. OSM may explain locality/confidence but cannot invent rent, price, or appreciation. Design migration to regional extracts/PostGIS.

## Immutable observations

Add a normalized observation model compatible with AVM snapshots. Include:

- Public observation reference.
- Subject type and property/locality/country public reference.
- Metric, value, unit, and currency.
- Source type and provider/series.
- Effective, recorded, and fetched timestamps.
- Dataset version, confidence, licence, and fallback flag.
- Internal normalized hash and active/superseded/rejected status.

Metrics should cover verified sale price, verified annual rent, asking sale/rent, inflation, lending/exchange rates, vacancy, and operating expenses. Never expose internal IDs, hashes, credentials, raw provider responses, or private participants through safe DTOs.

## Deterministic formulas

Use decimal-safe arithmetic and documented rounding:

```text
grossRentalYield = annualExpectedRent / totalAcquisitionCost * 100

netOperatingIncome = annualExpectedRent - vacancyAllowance - maintenance
  - serviceCharge - managementFees - insurance - propertyTaxes

netRentalYield = netOperatingIncome / totalAcquisitionCost * 100

projectedTotalROI = (projectedNetRentalIncome + projectedResaleProceeds
  - totalAcquisitionCost - sellingExpenses) / totalAcquisitionCost * 100

realAnnualisedROI = ((1 + nominalAnnualisedROI) / (1 + inflationRate) - 1) * 100
```

Reject zero divisors, non-finite values, future `asOf`, negative acquisition cost, invalid periods, and nonsensical rates. Document ratios versus percentage points.

Do not derive appreciation from CPI, GDP, OSM, or an LLM. It requires suitable historical property/locality evidence or an explicit user assumption. Without appreciation evidence, return rental-yield-only results or insufficient data according to a versioned policy.

Return conservative, base, and optimistic scenarios only when every input is traceable. Never manufacture optimistic values to promote listings.

## API

Follow existing route/auth/error/DTO/cache conventions. Unless the repository requires another base:

```text
POST /api/roi/v1/estimates
GET  /api/roi/v1/estimates/:roiPublicReference
GET  /api/roi/v1/properties/:propertyPublicReference/estimates?page=1&limit=20&asOf=<ISO>
```

Create requests require a stable `Idempotency-Key`. The same caller, normalized input, and key returns the same immutable snapshot. A deliberate new request requires a new key.

The create body contains propertyReference, optional asOf, projectionPeriodYears, purpose, and optional bounded overrides for annual rent, operating expenses, vacancy, and appreciation. Overrides are attributed to the caller and returned as `user_assumption`; they never overwrite observations.

Completed responses return `{ roi }` containing public references, status, as-of time, currency, period, gross/net yield, nominal/annualised/real ROI where supported, scenarios, assumptions, source mix, sources, factors, every warning/limitation, algorithm version, policy version, and dataset versions.

Insufficient responses use HTTP 200, `status: insufficient_data`, and `results: null`. Historical requests without an immutable observation at `asOf` return 422 rather than falling back to current facts. Use the established `{ message }` error shape and handle 400, 401, 403, 404, 409, 422, and 429.

Require authentication to create estimates. Follow the AVM requester/property-owner/admin authorization model. Limit property history to owners/admins unless existing policy explicitly permits otherwise. Use public references in routes and responses.

## Resilience and security

- Validate provider responses with the existing schema library.
- Retry only transient failures with bounded exponential backoff and jitter.
- Cache normalized observations, preserve freshness, and never label stale data current.
- Add idempotent jobs with checksums, versioning, duplicate detection, atomic publication, failure isolation, audit, manual retry, and stale-data alerts.
- Keep credentials server-side and out of logs.
- Prevent SSRF using fixed HTTPS origins, redirect restrictions, response-size limits, and validated paths/query parameters.
- Never accept external URLs from clients.
- Sanitize provider errors and rate-limit estimate/provider-admin endpoints.

## Tests and completion

Add unit, contract, integration, authorization, and job tests covering:

- Every formula and rounding rule.
- Completed, rental-yield-only, and insufficient results.
- No fabricated zero/estimate when evidence is absent.
- Every source label, asking-only warnings, priority, and disclosed fallbacks.
- Immutable historical behavior and stable idempotency.
- Deterministic scenarios and negative real returns.
- Malformed/null provider data, timeouts, 429/5xx, circuit breaking, stale-cache recovery, and atomic dataset publication.
- SSRF/response-size protection, authorization, public references, and safe DTOs.
- Regressions across AVM, properties, ownership, leases, payments, escrow, trust, title verification, authentication, and jobs.

Use contract-faithful fixtures and do not mock away failures, freshness, provenance, insufficient evidence, idempotency, or authorization. Update API docs, schemas, environment examples, attribution/licensing, scheduler operations, freshness and algorithm policy, and limitations. Run formatting, lint, type checks, focused/full tests, security checks, and production build; report exact results and blockers.

Complete only when the backend owns every calculation, every assumption is traceable, asking prices never appear as sales, missing evidence never produces a fake number, free sources add context without pretending to supply Nigerian transactions, RealtIQ verified data has highest priority, and results are immutable, authorized, reproducible, versioned, and explainable. Leave no scraping, fabricated data, hidden fallback, TODO, placeholder, skipped test, or undocumented breaking change.

---

# Backend Prompt: Admin Global Record Search

## Mission

Implement a production-ready, administrator-only global search API for the RealtIQ admin dashboard. The frontend top bar labelled **Search admin records** needs one safe, fast endpoint that searches authorized administrative record types without downloading every collection to the browser.

Before editing, inspect and reuse the backend's existing Express app, Bearer JWT authentication, admin-role middleware, route registration, controllers/services/repositories, public-reference helpers, MongoDB/Mongoose models and indexes, pagination conventions, DTOs, validation, errors, rate limits, auditing, and tests. Search every relevant admin list/detail endpoint and model before selecting fields and routes. Do not create parallel infrastructure, expose raw documents, modify the frontend, or change unrelated APIs.

## Endpoint and validation

```http
GET /api/admin/search?q=<query>&page=1&limit=20&type=<optional-type>
Authorization: Bearer <admin-jwt>
```

- Use the existing `/api` base, JWT middleware, admin check, and `{ "message": "..." }` errors.
- Return 401 for missing/invalid/expired authentication and 403 for authenticated non-admins.
- Search is read-only, never public, and never cached/shared across users.
- `q` is required after trimming, with 2–100 visible characters. Normalize repeated whitespace for matching.
- Reject arrays, objects, controls, null bytes, malformed encoding, Mongo operators, and client regexes.
- `page` defaults to 1 and is an integer >= 1. `limit` defaults to 20 and is 1–50.
- `type` is optional and must be an allow-listed supported discriminator.
- Return 400 for invalid parameters and 429 with standard rate-limit headers when limited.

Never accept client-controlled model/collection names, projections, sorts, pipelines, routes, or field names. Escape search text if regex is used; prevent NoSQL injection and ReDoS.

## Record types

Support existing admin-managed domains with real screens and safe DTOs: `user`, `landlord`, `property`, `project`, `inquiry`, `payment`, `cart_checkout`, `escrow`, `installment`, `title_verification`, `proxy_inspector`, `proxy_inspection`, and `virtual_tour`. Add other discovered types only when they have a stable admin destination and safe projection. Do not invent types or routes.

The optional `type` searches only that type. Define whether landlords are role-filtered users or separate results, and suppress duplicates so one landlord is not returned as both `user` and `landlord` in an unfiltered search.

## Safe searchable fields

Use an explicit server-side allow-list per type:

- Users/landlords: name, normalized email/phone, safe public account reference, role, verification status.
- Properties/projects: public reference, slug, title/name, location, approval/publication status, and owner name/email only where current admin DTOs permit it.
- Inquiries: public reference, subject/status, property reference/title, authorized participant name/email.
- Payments/checkouts: safe public/provider reference already exposed to admins, status, payer, property reference/title.
- Escrows/installments: public reference, status, property reference/title, authorized participants.
- Title verifications: public verification reference, property reference/title, document type/status—never protected content or URLs.
- Proxy records: safe profile/request reference, inspector name, service area, status, property reference/title.
- Virtual tours: property reference/title and tour/provider status—never provider secrets or embed tokens.

Rank exact public-reference and normalized-email matches highest, then exact phone/name/title, prefixes, and safe partial matches. Use normalized phone data. Do not claim fuzzy matching unless implemented and tested.

Never search or return passwords, reset/verification tokens, JWTs, refresh tokens, identity numbers, raw KYC media, bank/payout/card data, webhook secrets, private messages, protected documents, internal hashes, idempotency keys, unrestricted metadata, raw provider responses, or source documents.

## Response contract

```json
{
  "results": [
    {
      "type": "property",
      "reference": "RTQ-PROP-00000001",
      "title": "Three-bedroom apartment in Lekki",
      "subtitle": "Lekki, Lagos",
      "status": "approved",
      "route": "/dashboard/admin/property-details/RTQ-PROP-00000001",
      "matchedField": "publicReference",
      "matchedText": "RTQ-PROP-00000001",
      "updatedAt": "2026-08-31T12:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1 }
}
```

- Use stable allow-listed `type` and `matchedField` values.
- `reference` uses a public reference wherever one exists; never display Mongo IDs as references.
- Titles/subtitles/statuses are short truthful summaries.
- Build `route` from a static server-side allow-list and verify it resolves to a real authenticated frontend screen. Never echo a client route.
- Prefer public references in routes. If a legacy detail screen still requires an internal ID, expose it only in `route` and document the gap.
- `matchedText` is a short safe fragment that reveals no otherwise omitted data.
- Dates remain ISO strings. Omit unavailable optionals. Never return unrestricted `metadata` or source records.
- No matches is HTTP 200 with `results: []` and `{ page, limit, total: 0, pages: 0 }`, not 404.

## Ranking, pagination, and performance

Apply deterministic global ranking: exact public reference; exact normalized email/phone; exact title/name; prefix; other partial; newer `updatedAt`; then stable type/reference. Pagination applies to the combined result set, not independently per collection. Totals/pages must be accurate. Do not load all matches into application memory.

If efficient cross-collection pagination is not possible, implement a versioned denormalized admin-search index containing only safe projections. Support idempotent upsert/delete synchronization plus a restartable, batched, observable backfill/rebuild. Never silently return incomplete combined pages.

Inspect existing indexes before adding justified exact/text/prefix indexes. Avoid unanchored case-insensitive scans. Never use `$where`, server-side JavaScript, or client-driven aggregation. Apply database projections, bounded execution time, batched joins, and no N+1 queries. Add conservative admin-specific rate limiting.

If caching is used, key by authenticated admin, normalized query, type, page, and limit with a short TTL. Exclude deleted records unless current admin behavior supports them. Document freshness and reliably synchronize create/update/delete; retry and reconcile index failures without breaking authoritative writes unless existing transaction policy requires it.

## Logging and security

Do not log raw queries/results because they may contain emails, phones, or references. Log only approved operational metadata such as admin audit identity, latency, status, safe type counts, and a policy-approved non-reversible query fingerprint. Never send searches to analytics, AI, or third parties. Sanitize errors; expose no stack traces, model names, queries, or raw documents. Apply existing CORS/security headers, explicit DTO mappers, bounds, monitoring, and enumeration protection.

## Architecture

Follow existing layering:

```text
adminSearch.route
  -> existing auth + admin-role middleware
  -> query validation
  -> adminSearch.controller
  -> adminSearch.service/repository
  -> per-type safe DTO mappers and static route builders
```

Keep controllers thin. Centralize type configuration, allow-lists, ranking, DTOs, and routes. Reuse domain authorization/status helpers. Do not dynamically select models from client input or use unsafe broad casts.

## Tests

Add contract-faithful unit, integration, authorization, security, and regression tests for:

- Exact endpoint/wrapper, Bearer authentication, admin-only access, expired JWT, and every non-admin role.
- Query boundaries 1/2/100/101, whitespace, controls, arrays/objects, malformed encoding, Mongo operators, regex/ReDoS input, and large pages.
- Page/limit defaults and bounds, invalid type, and every supported type filter.
- Exact reference/email/phone/name/title, prefix, partial, case-insensitive, and no-result searches.
- Deterministic global ranking/ties, duplicate suppression, combined pagination, totals, and pages.
- Exact DTO and valid route for every type; public references instead of Mongo IDs where supported.
- Serialized JSON contains none of the forbidden sensitive fields.
- Soft/hard deletion, create/update/delete propagation, retries/reconciliation, and idempotent backfill.
- Rate limiting/headers, database timeout/failure, sanitized 500s, and existing admin/auth regressions.

Use cross-type fixtures with similar names/references to prove global ranking. Do not mock away authorization, validation, projections, ranking, DTO mapping, or synchronization failures.

## Documentation, handoff, and completion

Document authentication, parameters, supported types/searchable fields, ranking, pagination, schema, errors, rate limits, indexes/search-index design, backfill, freshness, monitoring, rollback, and every internal-ID route compatibility gap. Give the frontend the final exact contract and explicitly report deviations so it never guesses.

Run formatting, lint, type checking, focused/full tests, security checks, and production build/start validation; report exact commands/results.

Complete only when an authenticated admin can search all supported types through one indexed, bounded endpoint with accurate global ranking/pagination; every result routes to a real admin screen; sensitive data cannot escape; non-admin access is denied; lifecycle synchronization is reliable; existing APIs remain compatible; documentation/handoff are complete; and no TODOs, placeholders, skipped tests, fabricated routes, unsafe dynamic queries, or fake production values remain.