# Configuration Gates and Open Decisions — Pass 12

**Date:** 26 October 2026  
**Repository scope:** frontend source and locally copied handoff only. No backend repository, live API, provider account or deployment configuration was accessed.

## A. Executive summary

**Initial readiness: PARTIAL. Final readiness: PARTIAL.** Chapter 12 defines 16 configuration dependency rows (11 search/ranking/geography, 4 documents/verification/providers, and 1 data-rights execution gate), four numbered source decisions, and nine deployment activation tasks. The frontend did not have an authoritative general capability-status endpoint for most of these. Existing API responses, policy projections and readiness states remain the source of truth.

This pass closed frontend-owned gaps in map-provider selection, canonical project-map response handling, FX-unconfigured price presentation, stale project-map results, and gazetteer-unavailable messaging. It did not activate backend configuration or settle any product decision. Production readiness therefore remains dependent on deployment and live acceptance evidence.

The current row-derived Pass 01–10 reconciliation count is **19 COMPLETE, 14 PARTIAL, 7 BLOCKED, 1 DEFERRED (41 total)**. B02-01 moved to COMPLETE in Pass 11. This corrects the stale 18/15 summaries without changing the Pass 11 verdict.

## B. Chapter 12 coverage

| Chapter 12 requirement | Pass 12 coverage | Status |
|---|---|---|
| Nearby radius and approved maximum | Existing filter preserves criteria and displays server unavailability; frontend does not choose a maximum. | FRONTEND PARTIAL / CONFIGURATION REQUIRED |
| Gazetteer suggestions and breadcrumbs | Exact suggestions DTO and `FEATURE_SEARCH_GAZETTEER_UNCONFIGURED` are handled. The status endpoint response shape is not documented, so no status parser is invented. | SOURCE VERIFIED; status DTO gap remains |
| Boundary, map and project-pin validation | Forms retain user-entered coordinates; server readiness remains authoritative. No client boundary is claimed. | FRONTEND PARTIAL / CONFIGURATION REQUIRED |
| Site-plan markers and master-plan binding | No client-side coordinate/master-plan binding is fabricated. The required approved plan version and stable unit remain server-owned. | BLOCKED — IMPLEMENTATION SPECIFICATION / CONFIGURATION |
| USD and FX comparisons | Original currency is retained; property and project maps display the backend's `fx_unconfigured` state without presenting converted aggregates. | SOURCE VERIFIED / DEPLOYMENT REQUIRED |
| POA and reserve visibility | Public UI uses only the public projection; reserve is not exposed. Publication/filter conflict policy remains server-owned. | SOURCE VERIFIED / CONFIGURATION REQUIRED |
| Physical-property duplicate-size signal | No client matching threshold or merge is implemented. Manual review and server decisions remain authoritative. | SAFE / CONFIGURATION REQUIRED |
| Commute routing | Filter values are validated and preserved; the UI explains provider/configuration dependency. It does not substitute straight-line distance. | FRONTEND PARTIAL / CONFIGURATION REQUIRED |
| Recommended ranking | UI submits the documented sort and displays server results/notices; it does not calculate scores or Sponsored status. | SOURCE VERIFIED / POLICY REQUIRED |
| Daily/weekly alert cadence | Saved-search UI distinguishes server-configured cadence from a guarantee; no schedule is fabricated. | FRONTEND PARTIAL / POLICY REQUIRED |
| Freshness and trust | Only backend evidence-backed values are presented; client scores are not created. Grid freshness confirmation is withheld when policy is unavailable. | SOURCE VERIFIED / POLICY REQUIRED |
| Private document processing | Protected upload/viewer paths use private, scan-gated contracts and unavailable states; no public-storage fallback is added. | FRONTEND SOURCE VERIFIED / DEPLOYMENT REQUIRED |
| KYC/company verification | UI uses server case, policy and staff-review state; absent manual-source policy cannot be replaced by a client decision. | SOURCE VERIFIED / POLICY REQUIRED |
| Paystack and other payment providers | Payment attempts retain references and unknown states; redirects are not proof. Provider activation and the reservation index require deployment acceptance. | FRONTEND SOURCE VERIFIED / DEPLOYMENT REQUIRED |
| Email/SMS/WhatsApp/push delivery | In-app records are separate from external delivery; queued/accepted is not presented as delivered. No push-token contract is guessed. | SOURCE VERIFIED / PROVIDER REQUIRED |
| Destructive privacy execution | Request submission and grouped outcomes are represented; deletion remains pending/partial/held until authoritative completion and legal policy permit it. | SOURCE VERIFIED / LEGAL CONFIGURATION REQUIRED |

The four numbered source decisions and nine activation tasks are itemized below. The Chapter 12 instruction to read deployment values from `src/config/firstBatchPolicies.js` does not match this frontend tree: that file is absent. The handoff's reference to `.env.example` is present, but it contains only a placeholder public Mapbox token and commented style example; it does not establish deployed backend policy values.

## C. Configuration readiness matrix

“Authoritative status source” below means the endpoint or server projection documented for that feature. It does not assert that deployment configuration is active. Chapter 12 documents no general capability endpoint for these gates.

| ID | Feature / affected roles | Dependency and endpoint surface | Current frontend behavior and authoritative status | Safe unavailable behavior / final status | Remaining action / evidence |
|---|---|---|---|---|---|
| G12-01 | Nearby search; visitors and buyers | Approved `SEARCH_NEARBY_MAX_RADIUS_KM`; `GET /api/properties/map/nearby` | Filter requires complete center/radius and preserves query; the server response/error is authoritative. No status endpoint. | Preserve criteria and show returned unavailable state; do not choose a radius maximum. **FRONTEND PARTIAL; CONFIGURATION REQUIRED.** | Backend operator approves maximum and live acceptance verifies configured/unconfigured responses. |
| G12-02 | Gazetteer suggestions; public users and property/project editors | Approved revision/source/resolution policy; `GET /api/locations/suggestions`, `GET /api/locations/gazetteer/status`, `GET /api/locations/:id` | Suggestions use the documented `{suggestions,revision}` DTO. The input now reports `FEATURE_SEARCH_GAZETTEER_UNCONFIGURED` explicitly. The status route's response DTO is not specified. | Do not synthesize IDs/coordinates or persist unresolved text as canonical location. **SOURCE VERIFIED; STATUS DTO GAP.** | Document the status DTO and activate a licensed approved gazetteer. Focused error test passes. |
| G12-03 | Boundary/map/project pins; owners, landlords, developers, staff reviewers | Approved boundary GeoJSON and SHA-256, pin/unresolved-location policies; property/project write and readiness routes | Forms preserve coordinates; server validation/readiness and published map DTOs are authoritative. No frontend boundary confirmation is claimed. | Keep unresolved values in draft/review state and show returned blockers. **FRONTEND PARTIAL; CONFIGURATION REQUIRED.** | Approve source/policy and verify boundary validation against deployment data. |
| G12-04 | Site-plan markers; developers and authorized reviewers | Coordinate mode/range, out-of-bounds policy, approved master-plan version and stable unit; document/media and project/unit contracts | No guessed master-plan association or marker coordinate semantics are sent. Existing property/project pin inputs do not prove a site-plan marker is committed. | Keep unsupported marker commit unavailable; preserve draft. **BLOCKED — IMPLEMENTATION SPECIFICATION / CONFIGURATION.** | Specify marker DTO, stable-unit/master-plan association and policy; approve source/version. |
| G12-05 | Currency filters, aggregates and financial screens; public users, buyers, staff | Approved FX provider, enabled flag, rate-age/missing-rate policy and currencies; `GET /api/properties/map`, `GET /api/projects/map`, catalogue/search responses | Original amount/currency is retained. Property map already surfaces FX state; project map now validates and renders the canonical aggregate state and hides aggregate values on `fx_unconfigured`. | Never convert in browser; show original values or unavailable aggregate state. **SOURCE VERIFIED; DEPLOYMENT REQUIRED.** | Approve rate source/freshness policy and test configured, stale-rate and missing-rate server responses. |
| G12-06 | POA and reserve; public discovery, owners, staff | Versioned POA publication/filter/sort and reserve conflict policy; property create/update, catalogue/map, staff review | Public views use public DTOs and do not expose reserve. UI does not decide server-side POA eligibility. | Show public POA only when returned; never show reserve or infer publishability. **SOURCE VERIFIED; POLICY REQUIRED.** | Approve policy and live-check public/owner/staff projections and conflict responses. |
| G12-07 | Duplicate property size signal; owners and moderation staff | Approved numeric tolerance is intentionally empty; property duplicate/admin review routes | No local percentage threshold, geographic identity or automatic merge exists. | Keep size signal disabled; use manual review from server result only. **SAFE; CONFIGURATION REQUIRED.** | Approve an exact threshold and policy before any signal is enabled; auto-merge stays disabled. |
| G12-08 | Commute filters; visitors and buyers | Mapbox token/profile/destination limit and provider approval; canonical property search/map query (`commuteFrom`, `commuteMinutes`) | Filter validates coordinate tuple/time choice, preserves URL state, and identifies the provider dependency. No route-time estimate is computed locally. | Surface server unavailable response; do not substitute straight-line distance. **FRONTEND PARTIAL; CONFIGURATION REQUIRED.** | Approve routing use and limits; verify `FEATURE_*` response and configured behavior. |
| G12-09 | Recommended ordering and Sponsored labels; visitors, buyers, advertisers/staff | Approved versioned Console weights, completeness criteria, placement records and eligible advertiser; canonical property/project discovery | Backend ordering/notices are used; UI does not calculate completeness or grant Sponsored state. Featured editorial status remains distinct. | Respect server fallback/`RECOMMENDED_SIGNAL_UNAVAILABLE`; do not locally rerank. **SOURCE VERIFIED; POLICY REQUIRED.** | Approve policies and placement records; validate deterministic fallback in deployment. |
| G12-10 | Saved-search daily/weekly alerts; buyers | Approved versioned `saved_search_cadence`; `GET/POST /api/personalisation/searches`, `GET/PATCH/DELETE /api/personalisation/searches/:id`, notifications | Saved criteria and `configurationRevision` are persisted with conflict review. UI warns that cadence/channels may remain paused; no delivery time is promised. | Keep search save/reopen distinct from confirmed alert delivery. **FRONTEND PARTIAL; POLICY/PROVIDER REQUIRED.** | Approve cadence policy and verify worker behavior; expose delivery state only from documented response. |
| G12-11 | Freshness/trust signals; public users, staff, developers | Current evidence and approved Console policies/cadence; property/project discovery, verification and grid confirmation routes | Only returned evidence-backed states are displayed; grid freshness confirmation is withheld absent policy. | No client score or unsupported trust badge. **SOURCE VERIFIED; POLICY REQUIRED.** | Approve evidence definitions/cadence and validate server response. |
| G12-12 | Private documents/evidence; applicants, owners, staff | Encrypted private storage/keyrings, adapter, scanner, inspection and protected renderer; documented `/api/documents/...`, evidence and title routes | Protected byte-bound uploads/viewer requests are used; scan/quarantine/unavailable state remains backend-authoritative. No public URL fallback. | Quarantine/unavailable on missing storage/scanner; never expose original private bytes publicly. **SOURCE VERIFIED; DEPLOYMENT REQUIRED.** | Configure storage, keys, scanning and renderer resources; test authorization and quarantine in deployment. |
| G12-13 | KYC and organization verification; holders, organizations and staff | Approved verification policies/provider and authorized independent review; `/api/profiles/current/...`, holder/staff verification routes | Evidence/case state comes from server. Approval is gated by policy and required checks; uploads are not treated as approval. | Preserve pending/unavailable state; no client-set verified status. **SOURCE VERIFIED; POLICY/PROVIDER REQUIRED.** | Publish complete policies, provider status and reviewer permissions; acceptance-test each case type. |
| G12-14 | Payments, escrow, refunds; buyers, developers, finance staff | Paystack/Monnify credentials, callbacks/webhooks, approved seat/publication plans; `/api/cart/checkout/initialize`, `/api/payments/initialize`, installment/escrow routes, verify/status reads | Durable references and unknown outcomes are preserved; no blind retry, redirect-as-proof or client ownership inference. Provider errors remain actionable. | Keep unresolved attempts pending/reconciliation-required; no replacement attempt until supported status review. **SOURCE VERIFIED; DEPLOYMENT REQUIRED.** | Configure providers/webhooks and approved plans; verify payment-attempt uniqueness index is deployed and reconciled. |
| G12-15 | External notifications; users and staff | Postmark, Termii, WhatsApp/push provider credentials and receipts; `/api/notifications`, delivery history/reconciliation routes | In-app records work independently. Delivery UI distinguishes queued/accepted from sent/receipt-backed; provider callbacks are not called from browser. | Do not claim external delivery; keep pending/failed state from API. **SOURCE VERIFIED; PROVIDER REQUIRED.** | Activate channels and receipt processing; acceptance-test provider receipts and reconciliation. |
| G12-16 | Destructive privacy execution; profiles and authorized privacy staff | Approved retention schedule, legal-hold enforcement and execution flag/worker; profile data-protection request and staff execution routes | Requests can be submitted/reviewed/prepared; grouped outcomes, held/preserved/blocked states and timestamps are server-driven. | Never promise total erasure; execution remains held/disabled absent approved policy and no applicable legal hold. **SOURCE VERIFIED; LEGAL CONFIGURATION REQUIRED.** | Legal owner approves retention schedule; operations enables execution only after deployment checks and verifies legal holds. |

## D. Product decision register

Chapter 12 has four numbered source decisions. Four additional product/specification topics are carried forward from Passes 01–11 because Chapter 12 and the local reconciliation identify them as unresolved. No decision is made in this pass.

| ID | Decision required | Affected functionality / documented behavior | Owner / consequence / frontend behavior |
|---|---|---|---|
| D12-01 | Resolve the stated 16 construction milestones versus 15 named values. | Canonical construction-stage enum; API dictionary remains authoritative for accepted values. | Source owner/product. Extra value remains unavailable; no enum invented. |
| D12-02 | Approve an exact numeric property-size duplicate tolerance. | Duplicate signal defaults empty; manual review; automatic merge disabled. | Product/data policy owner. Threshold matching remains disabled. |
| D12-03 | Approve versioned recommendation weights, completeness criteria and Sponsored placement policy. | Server may fall back deterministically and return unavailable signal; Featured is editorial. | Product/Console policy owner. Client does not rank or mark Sponsored. |
| D12-04 | Approve nearby radius, alert cadence, site-plan semantics, gazetteer/boundary licensing, FX source/fallback and verification/freshness thresholds. | Each remains server-configured; missing required signals fail closed or defer. | Relevant product, legal and operations owners. UI reflects server state and preserves drafts/search. |
| X12-01 | Define paid/live tour product and payment model. | Paid virtual tours return `503 FEATURE_PAID_TOUR_UNAVAILABLE`; supported non-paid tour paths remain separate. | Product/finance/backend owners. Paid/live purchase CTA remains disabled; no generic checkout workaround. |
| X12-02 | Specify ownership transfer/history and developer sales aggregate definitions. | No transfer or ownership history semantics are inferred from payments. | Product/legal/backend owners. Show only documented ownership and payment projections. |
| X12-03 | Specify per-media-item access/entitlement semantics and mutations. | Existing media categories do not define item-level entitlement recipients/version behavior. | Product/security/backend owners. No speculative per-item access editor. |
| X12-04 | Specify missing administrative dashboard metric names, scopes, windows and DTOs. | Existing dashboard uses authoritative documented aggregates only. | Admin/product/backend owners. No totals derived from paginated lists. |

## E. Backend contract gaps

- `GET /api/locations/gazetteer/status` is listed as a public active-directory status route, but the local contract does not provide its response DTO. The frontend therefore handles the documented suggestions 503 instead of guessing a status parser.
- Chapter 12 references `src/config/firstBatchPolicies.js`, which is absent from the frontend checkout. It is not replaced with a speculative client configuration layer; deployment-owned policy values cannot be verified here.
- The local handoff does not expose generic capability-status endpoints for FX, nearby maximum, routing approval, ranking/cadence activation, scanner/storage health, payment-provider activation or destructive-retention enablement. Endpoint-specific outcomes and documented policy projections are used where available.
- Site-plan marker semantics require a master-plan version and stable unit but do not define enough frontend marker DTO/association behavior to implement a committed marker workflow.
- Existing documented DTO gaps from earlier passes remain tracked separately: initial-login MFA challenge response, selected organization roster/invitation/seat/signatory projections, parts of listing verification and staff decision schemas, ownership history/transfer, media entitlement and dashboard aggregates. Pass 12 does not close these contract/specification blockers.

## F. Deployment dependencies

The nine Chapter 12 activation tasks remain open until verified by deployment evidence:

1. Approved private storage, encryption keys, scanner and protected renderer resources.
2. Approved/licensed gazetteer and boundary data; Mapbox activation only after licensing/data-handling approval.
3. Approved FX source, rates and freshness policy.
4. Approved Console ranking, completeness, sponsored placement, alert cadence, trust and freshness policies.
5. Approved nearby radius and duplicate-size tolerance.
6. Verified seat/publication plans, Paystack credentials and webhook; verify payment-attempt uniqueness index deployment and reconciliation as a separate payment acceptance dependency.
7. Notification providers and verified delivery receipts.
8. Legal approval of retention schedule before deletion execution.
9. Required indexes, migrations and existing-record reconciliation through deployment procedures.

No deployment task was executed or verified during this pass. The frontend cannot inspect backend environment variables, indexes, migrations, provider credentials or worker state.

## G. Frontend changes

- `src/config/maps.ts`: selects the existing Leaflet renderer when the existing Mapbox token is blank; retains Mapbox when configured. No new environment variable or provider was introduced.
- `src/pages/public/ProjectsMap.tsx`: validates/consumes canonical project-map contract state, does not fabricate missing counts, hides unconfigured FX aggregates, gives list-view recovery for map-provider errors, and prevents stale query results/pins from appearing during a newer request.
- `src/services/projectService.ts`: validates canonical project-map counts, price aggregate state, currency and nullable bounds before returning data.
- `src/utils/projectFormatters.ts`: renders an explicit FX-unconfigured state without presenting invalid aggregate prices.
- `src/services/locationService.ts` and `src/components/property/LocationSuggestionInput.tsx`: preserve the gazetteer feature-unavailable code and show a specific safe message.
- `src/pages/public/Listings.tsx`: preserves the canonical map API error code in the visible error state.
- Tests added/updated: `src/config/maps.test.ts`, `src/utils/projectFormatters.test.ts`, `src/services/projectService.test.ts`, `src/services/locationService.test.ts`, and `src/lib/axios.test.ts`.

No backend policy values, product decisions or provider credentials were added to the frontend. No private secret value was printed. Source inspection found only the expected public `VITE_*` settings (`VITE_API_BASE_URL`, `VITE_REALTIME_URL`, `VITE_MAPBOX_ACCESS_TOKEN`, and optional style); `.env.example` contains a placeholder token. No root `.env`, `.env.local`, `.env.production` or `.env.development` file was present during this check. A client-visible Mapbox token must still be restricted and used only after licensing/data-handling approval.

## H. Test results

- Focused Vitest: **5 files, 34 tests passed; exit 0**. This includes map provider selection, project-map DTO/FX behavior, location unavailable messaging and API error preservation.
- TypeScript no-emit: **passed; exit 0** (`tsc -p tsconfig.app.json --noEmit --pretty false`).
- Edited-file ESLint: **passed; exit 0, zero warnings** for the 12 changed TypeScript/TSX files using `--max-warnings 0`.
- `git diff --check`: **passed; exit 0**. Git emitted working-copy LF-to-CRLF normalization notices only.
- No full suite, production build, live backend request, provider call, payment, document upload or deployment acceptance was run.

## I. Readiness for Pass 13

Source-level gate handling is ready for backend acceptance review. The canonical project-map/FX response, gazetteer unavailable state and safe Mapbox/Leaflet selection now have focused source tests. Pass 13 must obtain evidence for the nine deployment tasks and exercise provider/configured/unconfigured responses against the deployed backend. Unresolved contract and product/specification decisions remain open. **Pass 12 verdict: PARTIAL.**
