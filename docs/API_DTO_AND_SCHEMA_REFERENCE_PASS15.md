# API DTO and Schema Coverage — Pass 15

**Scope:** Chapter 15 and its explicit cross-references, checked against the frontend source and local Chapters 01–17. This was a source and mocked-contract review only. No backend repository, live API, payment provider, database, or deployment was accessed.

## A. Executive summary

**Initial status: PARTIAL. Final status: PARTIAL.** The frontend already had broad DTO types and endpoint tests, but the review found concrete response-shape gaps: platform wallet code treated an omitted optional revenue aggregate as `0`, payment-status query values were unconstrained strings, proxy evidence rows were keyed as `_id` despite the documented public `id`, saved-search code did not validate the required revision at the response boundary, and escrow-dispute resolution types required a response key the backend may omit and lacked `reused`.

Those frontend-owned defects are corrected. The Chapter 15 text explicitly says it is not a universal schema; consequently there is no source-backed global “all DTOs” count. For traceability, this report enumerates **25 independently described DTO, request, response-envelope, or contract-addition entries** in Chapter 15 (nested shapes are kept within their containing DTO). Of those, **20 have a current frontend consumer: 16 are aligned at source/type/service/UI level, and 4 remain partial**; **5 private-file reconciliation/custody entries have no first-batch UI consumer and are intentionally unused by the user-facing frontend**. These are inventory counts, not backend acceptance counts.

No live backend acceptance is claimed. Remaining contract/specification and deployment dependencies remain open.

## B. Chapter 15 DTO inventory

Status meanings: **COMPLETE** = documented shape maps to the reachable frontend type/service/UI with focused source-level evidence; **PARTIAL** = frontend uses the family but projection or runtime validation remains incomplete; **INTENTIONALLY UNUSED** = operational migration/custody DTO with no in-scope UI consumer.

| ID | DTO/schema and direction | Endpoint | Shape, constraints, nullability, enums | Frontend trace and final status |
|---|---|---|---|---|
| D15-01 | `TourDTO`, response | `GET /api/tour`, `PATCH /api/tour/:id` | `id,type,mode,scheduledAt,status,version,createdAt,updatedAt,property`; buyer projection may include `notes`; property can be `null`. Stored/read status includes `cancelled`, but PATCH accepts only `pending|approved|rejected|completed`. | `Tour` in `src/types/index.ts` → `tourService` → Tours and property-detail UI → `src/services/tourService.test.ts`. **COMPLETE.** |
| D15-02 | Tour create request and wrapper | `POST /api/tour` | Supported body carries property reference, `type`, `mode`, scheduled time, optional notes; successful shape is `{tour}`. `virtual_paid` is rejected before persistence. | `TourRequestPayload` / `TourRequestResponse` → `tourService.requestTour` → Tours/property detail → tour service tests. Paid option is excluded and guarded. **COMPLETE.** |
| D15-03 | Tour list response and pagination headers | `GET /api/tour` | Bare `TourDTO[]`; count/page/page-count come from `X-Result-Count`, `X-Page`, `X-Page-Count`; empty is `[]` with zero totals. | `tourService.getTours` unwraps bare array and header pagination → Tours dashboard → tour service test. **COMPLETE.** |
| D15-04 | Tour status update request and response | `PATCH /api/tour/:id` | `{status,expectedVersion?}`; response is bare updated `TourDTO`, not `{tour}`; status excludes `cancelled`. | `UpdateTourStatusPayload` requires a version and excludes cancelled → UI sends current version → tour service test. **COMPLETE.** |
| D15-05 | `WalletSummary`, response | `GET /api/admin/wallet` | Bare summary; required financial totals and breakdown values; `breakdown.proxyInspectionRevenue` may be omitted. `availableRevenue` is ledger net, not bank settlement. | `WalletSummary` → `parseWalletSummary` → Admin Wallet; omitted aggregate now renders “Not reported,” while explicit zero remains zero → service/page tests. **COMPLETE.** |
| D15-06 | Platform transaction row | `GET /api/admin/wallet/transactions` | Allowlisted `{id,type,direction,amount,paymentReference,status,createdAt,updatedAt,propertyReference?}`. Populated identities/provider payloads/private locators are omitted. | `WalletTransaction` plus runtime field/enum validation → Admin Wallet → admin service tests. **COMPLETE.** |
| D15-07 | Platform transaction list envelope | `GET /api/admin/wallet/transactions` | `{transactions,total,page,limit}`; separate optional property reference on a row. | `WalletTransactionsResponse`, boundary parser and pagination UI → focused service/page tests. **COMPLETE.** |
| D15-08 | Safe escrow dispute row | Admin dispute list/detail | `{id,reason,description,status,preDisputeStatus,resolution,openedAt,resolvedAt,createdAt,updatedAt}`; description and resolution may be `null`; contact text is removed. | `SafeEscrowDispute` → admin escrow dispute list/detail → focused escrow service test. **COMPLETE.** |
| D15-09 | Admin escrow dispute detail | `GET /api/admin/escrow-disputes/:disputeId` | `{dispute,escrow,milestones:{all,satisfied,outstanding},financialState:{paymentStatus,refund,sellerPayout},history,logs,availableActions}`; refund/payout may be `null`; actions are advisory booleans, not authorization. | `AdminEscrowDisputeDetail` preserves unknown nested records instead of inventing fields; UI still refreshes and server checks actions → escrow service test. **COMPLETE.** |
| D15-10 | Admin dispute resolution partial result | `PATCH /api/admin/escrow-disputes/:disputeId/resolve` | Applicable keys may include `escrow`, `dispute`, `refund`, `payout`, `pending`, `reused`, `reconciliationRequired`; 202 remains pending. | `ResolveEscrowDisputeResponse` now makes resource results optional and includes `reused`; service preserves HTTP status, UI refreshes authoritative detail → escrow service test. **COMPLETE.** |
| D15-11 | Private-file reconciliation record | Staff operational reconciliation routes | `id,sourceKind,sourceId,state,version,codes,memberCount,mode,processing,attempts,migrationId`; nullable migration ID. | No user-facing frontend service or route. This is a custody/migration operation, not an applicant document workflow. **INTENTIONALLY UNUSED.** |
| D15-12 | Private-file reconciliation status extension | Staff operational reconciliation status | Adds integrity result, history entries with actor/profile/action/version/codes/time, and `nextCursor`. | No first-batch UI consumer; no new migration console inferred. **INTENTIONALLY UNUSED.** |
| D15-13 | Private-file discovery dry-run | Staff operational reconciliation discovery | Dry-run flags, source/inventory version, eligibility, canonical source, codes, redacted member summaries; not a public document DTO. | No first-batch UI consumer. **INTENTIONALLY UNUSED.** |
| D15-14 | Legacy private-file DTO | Legacy private-file operations | Explicit allowlist includes replacement/amendment/custody state, version/source version, purpose/access mode, migration/evidence IDs and nullable error/mapping fields. | No first-batch UI consumer. **INTENTIONALLY UNUSED.** |
| D15-15 | Custody-movement DTO | Legacy custody movement operations | Exactly `{id,fileId,state,version,attempts,errorCode,completedAt}`; error and completion may be `null`; storage secrets and reviewer identity omitted. | No first-batch UI consumer. **INTENTIONALLY UNUSED.** |
| D15-16 | Proxy-inspection raw request/create projection | `POST /api/proxy-inspections` and request-list/mutation routes | Raw model projection varies; IDs serialize as strings, optional stored values can be omitted, `metadata`/`__v` may be present. No common normalized projection. | `ProxyInspectionRequest` is reused across create/list/mutation/detail projections. UI needs `_id`; response-specific projection typing/runtime validation is not yet separated. **PARTIAL.** |
| D15-17 | Proxy-inspection detail envelope | `GET /api/proxy-inspections/:id` and inspector task detail | `{request,serviceEscrow,report,evidence,dispute}` with endpoint-dependent populated references. No `expectedVersion` on proxy mutations. | `ProxyInspectionDetail` and service parser validate the envelope/evidence array but do not validate every nested projection. **PARTIAL.** |
| D15-18 | Proxy-inspection report | `GET/PUT/PATCH /api/proxy-inspections/:id/report` | Report includes section/defect/observation/comment/recommendation/declaration/signature fields and optional metadata/timestamps; condition and recommendation enums are documented. | `ProxyInspectionReport` now includes optional metadata/timestamps, but report response normalization and full enum/runtime validation are not comprehensive. **PARTIAL.** |
| D15-19 | Proxy evidence list item | `GET /api/proxy-inspections/:id/evidence` | `{id,type,category,mimeType,fileSize,caption,uploadedAt,accessUrl}`; access URL is a signed private URL and must not be persisted/shared across profiles. Types/categories come from the evidence model. | `ProxyEvidence` now keys by `id`; `parseProxyEvidenceList` validates identity and delivery metadata; UI refresh and React key use `id`; tests cover the row. **COMPLETE.** |
| D15-20 | Proxy-inspection dispute model | `POST /api/proxy-inspections/:id/dispute` and detail | Model projection includes request/escrow/raiser/reason/description/status/resolution/notes/resolver/timestamps; states and resolution enums are documented. | `ProxyInspectionDispute` now represents optional update timestamp; detail uses the projection. Status runtime validation and endpoint-specific response tests remain limited. **PARTIAL.** |
| D15-21 | Saved-search DTO and wrappers | `GET/POST /api/personalisation/searches`, `GET/PATCH/DELETE /:id` | DTO includes `_id,publicReference,profileId?,name,filters,alerts?,configurationRevision,createdAt,updatedAt`; create/detail/update wrap `{savedSearch}`, list wraps `{savedSearches,pagination}`. Filters are normalized query objects; alerts have documented cadence/channel/trigger options. | `SavedSearch` and `SavedSearchAlerts` → `personalisationService`/Listings/Personalisation; new runtime parser rejects missing/invalid revision or identity and tests wrappers/revision. **COMPLETE.** |
| D15-22 | Saved-search update precondition | `PATCH /api/personalisation/searches/:id` | Optional non-negative integer `expectedConfigurationRevision`; conflict is `409 CONFLICT_SAVED_SEARCH_VERSION`. Criteria/alert changes advance revision; display-name-only edits do not. | `SavedSearchUpdateInput` carries revision; UI retains latest criteria and requires review after conflict → service test. **COMPLETE.** |
| D15-23 | Protected payment CSV request | `POST /api/payments/export.csv` | JSON `{limit?: integer}` in 1–2,000, default 2,000. One-use challenge binds method/path/profile/session/body. | `paymentService.exportPaymentsCsv` sends the exact POST body/header and now rejects out-of-range limits before request; Admin Payments UI supplies 2,000. **COMPLETE.** |
| D15-24 | Protected CSV stream response | `POST /api/payments/export.csv` | Private CSV body; `X-Export-Row-Count`, `X-Total-Count`, private/no-store response headers. Legacy GET is not compatible with current challenge protocol. | Service requests `responseType:'blob'`; UI downloads the returned Blob after bound step-up. Existing service test covers request/body/header; no live export performed. **COMPLETE.** |
| D15-25 | Unit-grid undo metadata | `GET /api/projects/:projectId/unit-grid/jobs/:jobId` and operation response | `undoAvailable` is server-authored; `undoExpiresAt` is optional and appears only when derivable. Client must not calculate eligibility from local time. | `UnitGridOperation`/`UnitGridJob` preserve both fields; Unit Grid gates on server flag/time and refreshes before undo → focused component tests. **COMPLETE.** |

**Inventory arithmetic:** 25 detailed entries = 16 COMPLETE + 4 PARTIAL + 5 INTENTIONALLY UNUSED. Twenty entries have in-scope frontend consumers (16 complete, 4 partial). This excludes the nine family-reference rows below: those rows point to other chapters and are not complete schemas in Chapter 15.

### Chapter 15’s nine family references

| Family reference | Frontend coverage and current boundary |
|---|---|
| Account/profile/membership/seat/signatory | Separate endpoint projections and existing account/profile types. Holder onboarding and supported invitations/membership paths are connected; MFA challenge selection, seat item schema, mandate actions and staff signatory queue projection remain blocked. |
| Property/project/type/unit/effective values | Canonical serializers and `canonicalFieldRegistry`; supported forms/grids use typed canonical fields. Do not equate canonical input with public detail projection. Unit-type CRUD gaps and product decisions remain as previously tracked. |
| Search/map/facets/groups | Canonical URL/query types and map-specific response types; map/list result DTOs are intentionally distinct. Gazetteer status response remains unspecified. |
| Import/grid jobs and rows | Import-session/job and unit-grid types/services preserve row outcomes, versions, server state and undo metadata. Row decision/correction body remains unspecified. |
| Protected documents/viewer | Protected title/evidence DTOs and authenticated viewer routes are separated from public media. Listing-verification and some staff/custody contracts remain incomplete. |
| Cart/payment/checkout/ownership | Distinct attempt, payment, escrow and ownership types/services; no provider redirect is treated as proof. Ownership history/transfer schema remains unresolved. |
| Privacy request/export/record result | Request/execution types display grouped outcomes without fabricating record-level success; staff decision fields and some consent-history schema remain unresolved. |
| Notification/realtime | Profile-scoped notification/event types and REST reconciliation are implemented where documented; delivery is not claimed from record creation alone. |
| Admin review | Queue-specific types are used; Chapter 15 explicitly states there is no shared admin-review DTO. Dashboard metric definitions remain incomplete. |

## C. Frontend type coverage

The source has endpoint/family-specific types rather than a universal response envelope. `Tour`, `WalletSummary`, `WalletTransaction`, `SavedSearch`, `UnitGridOperation/UnitGridJob`, `SafeEscrowDispute`, `AdminEscrowDisputeDetail`, `ResolveEscrowDisputeResponse`, and proxy-network types were reviewed against Chapters 15–16 and their feature chapters.

Corrections made in this pass:

- Optional `proxyInspectionRevenue` remains optional across `WalletSummary` parsing and presentation; omitted is “Not reported,” and numeric zero remains zero.
- Proxy evidence uses public DTO `id`, not stored-model `_id`, while preserving signed `accessUrl` as private delivery data.
- Escrow dispute resolution allows all documented partial-response variants, including `reused`, rather than requiring `escrow` on every result.
- Proxy request/report types preserve optional raw-model metadata/version fields where documented.
- Wallet payment-status filters now use the documented enum independently of ledger row status.

Several type families remain broad by design where the backend returns endpoint-dependent populated models or omits nested element schemas. `unknown` is retained for undocumented history/log/escrow summaries instead of fabricating a shape.

## D. Request DTO coverage

- Tour create, list and status update use the documented body and response branches. The PATCH type requires `expectedVersion`; a `cancelled` model/read state cannot be sent as an update.
- Saved-search updates carry `expectedConfigurationRevision`; runtime response parsing now requires a non-negative integer revision before UI code can use it for another write.
- Payment CSV uses only `POST /api/payments/export.csv`; body is frozen by the existing bound step-up hook, includes `limit:2000` from the Admin Payments UI, and service-level validation enforces the documented 1–2,000 integer range without mutating the bound body.
- Proxy inspection creation uses the documented property/inspector/services fields and optional requirements/date. The backend returns a raw model projection; that response remains separate from the populated detail envelope in this report.
- Admin escrow dispute resolution remains bound to the exact JSON payload and challenge. Its response is not optimistically converted into a final escrow/refund/payout state.
- Private-file reconciliation and custody request bodies are not implemented because their operational flows have no in-scope frontend consumer; no body is guessed.

## E. Response DTO coverage

- Tour service consumes the bare list and reads pagination headers, unwraps `{tour}` only for create, and consumes the bare DTO for PATCH.
- Wallet summary and transaction responses now receive boundary validation for the documented required numeric fields, row keys, enums and pagination metadata. Optional fields remain optional; malformed server payloads surface as actionable unsupported-format errors.
- Escrow detail/action values preserve nullable records and partial provider outcomes; every resolution refreshes detail from the server.
- Proxy detail parsing requires its documented evidence array and validates every evidence row’s public identity and access metadata. Other nested projections remain endpoint-specific and are not normalized into fabricated common fields.
- Saved-search wrappers are unwrapped only after runtime validation of the revision-bearing DTO.
- CSV responses remain binary Blobs and are not parsed as JSON; private export count headers are supported by the documented API and UI does not claim unreturned totals.

## F. Runtime validation

New validators:

- `parseWalletSummary` validates required amounts/counts and conditionally validates the optional revenue amount.
- `parseWalletTransactionsResponse` validates the exact row projection, row enums and envelope pagination.
- `parseProxyEvidenceList` validates `id`, type/category strings, private access URL and optional metadata; detail routes use it.
- `parseSavedSearch` validates identity, filters object, timestamps and non-negative integer `configurationRevision`; list/detail/create/update service paths use the parser.
- Payment export service rejects invalid limits before issuing the protected request.

Existing API normalization, bound step-up, job-state checks, conflict recovery, and profile cleanup were source-reviewed but not rewritten in this pass. The added parsers do not replace backend validation or authorize access.

## G. Canonical field coverage

This pass did not change the canonical registry or field classifications. The current 156-field matrix remains in [CANONICAL_FIELD_COVERAGE_PASS03.md](CANONICAL_FIELD_COVERAGE_PASS03.md). Types/forms use the existing registry and endpoint serializers; this pass does not assert all fields are editable or infer provenance when no DTO supplies it.

Unresolved schema/product boundaries remain `mediaAccessLevel` item entitlement semantics and the construction milestone 15-vs-16 discrepancy. Both remain blocked; no enum/count was changed.

## H. Protected-operation schemas

- Payment CSV: POST/path/profile/session/body-bound one-use challenge, immutable `{limit}` payload, Blob response.
- Escrow dispute resolution: JSON action/reason bound to the route and challenge; 202 and partial provider outcomes remain pending until REST refresh.
- Title/evidence byte-bound upload and other protected route payloads were rechecked against earlier passes; this pass made no changes to those implementations.
- Saved-search `expectedConfigurationRevision` is a concurrency token, not a step-up token. A 409 retains the user’s draft and requires review.
- Grid undo requires server-returned `undoAvailable`; optional `undoExpiresAt` is displayed/gated only when valid. The client does not fabricate eligibility from a local timer.

## I. Financial schema safety

The platform wallet is an internal ledger projection. `availableRevenue` is not a bank-settled amount. `paymentStatus` query values (`pending|paid|failed|canceled`) are not the wallet transaction row status values (`pending|completed|reversed|refunded`); the frontend now keeps these types separate. Payment initiation, provider verification, escrow reconciliation and ownership authority remain on their existing server-backed paths. No real payment/export/refund was run.

Ownership history/transfer and sales aggregate definitions remain unresolved product/specification blockers. The frontend does not derive ownership from a payment redirect or compute global totals from partial pages.

## J. Cross-document schema consistency

- Chapter 15 and Chapter 16 agree on the current tour envelopes: POST `{tour}`, GET bare array with headers, PATCH bare DTO. Earlier wrapper examples are explicitly stale; frontend matches the corrected source-backed behavior.
- Tour read/model `cancelled` versus PATCH’s narrower enum is a deliberate operation-specific distinction, not an inconsistency in the frontend.
- Wallet transaction `status` and `paymentStatus` filter enums have different vocabularies by design; they are no longer conflated.
- Chapter 15 explicitly warns that no generic success envelope applies. The frontend retains endpoint-specific unwrap logic rather than introducing `{success,data}` normalization.
- Chapter 15’s nine family references direct readers to feature chapters; they do not define complete per-route schemas. The unresolved MFA, seat/bank/mandate/signatory, import-row, listing verification, staff privacy, ownership, media-entitlement, milestone, dashboard-metric and gazetteer-status contracts therefore remain open.
- No new contradiction was found that permits choosing a missing request or response shape. The `/api/admin/stats` endpoint is mounted, but its requested complete metric set/scope is still not specified.

## K. Frontend corrections

- Wallet DTO parsers and documented payment-status type: `src/services/adminService.ts`.
- Wallet optional aggregate, enum select and validation tests: `src/pages/dashboard/Admin/AdminWallet.tsx`, `src/pages/dashboard/Admin/AdminWallet.test.tsx`, `src/services/adminService.test.ts`.
- Optional server-supplied admin aggregates no longer appear as fabricated zeroes: `src/pages/dashboard/Admin/AdminDashboard.tsx` and its test. This does not resolve the missing complete dashboard metric specification.
- Proxy evidence DTO identity and runtime parser: `src/types/proxyNetwork.ts`, `src/services/proxyNetworkService.ts`, `src/components/proxyNetwork/ProxyWorkspace.tsx`.
- Escrow partial resolution and proxy raw-model DTO optional fields: `src/types/escrow.ts`, `src/types/proxyNetwork.ts`.
- Saved-search revision parser and request/response test: `src/services/personalisationService.ts`, `src/services/personalisationService.test.ts`.
- Payment-export request range validation: `src/services/paymentService.ts`, `src/services/paymentService.test.ts`.

## L. Test coverage

Focused suites added or updated for wallet parsing/optional zero, proxy evidence identity/validation, escrow partial 202 resolution, saved-search revision/envelope parsing, payment export range, wallet rendering, dashboard optional metrics, and proxy evidence UI rendering. Existing tour and unit-grid suites cover the corrected tour envelopes and server-authored undo metadata.

Executed `npx vitest --config vitest.pass15.config.mjs --configLoader native [11 focused test files] --reporter=dot` with a temporary jsdom config (`src/test/setup.ts`), then removed the temporary config. **11 files / 62 assertions passed.** Vitest’s process exit code was **1** because startup emitted Windows `EPERM` while resolving `C:\Users\DELL` and `MISSING DEPENDENCY jsdom`; no assertion failed. Therefore assertions executed and passed, but the overall test runner did not exit successfully. TypeScript no-emit exited 0, edited-file ESLint exited 0 with zero warnings, and `git diff --check` exited 0 (line-ending notices only). No test is presented as live backend acceptance.

## M. Remaining blockers

### Missing backend contract or implementation specification

- Initial-login MFA challenge discriminator/response.
- Organization seat-plan item schema, payout bank-directory DTO, mandate action body and staff signatory queue projection.
- Import row correction/decision request/response.
- Listing-verification preflight/upload requirement and staff decision schema.
- Staff privacy decision fields and complete consent-history DTO.
- Ownership history and transfer rules/DTOs.
- Per-media item entitlement schema.
- Complete admin metric definitions/scope; `/api/admin/stats` does not specify the requested dashboard DTO.
- Gazetteer operational status response DTO.

### Product/specification decisions

- Paid/live virtual tour purchase model; remains disabled, with `503 FEATURE_PAID_TOUR_UNAVAILABLE` treated as capability unavailability.
- Construction milestone count/value discrepancy.
- Ownership transfer/history/legal semantics.
- Sales aggregate definitions and media-item entitlement semantics.

### Configuration/deployment/live acceptance

- Payment provider activation and payment-attempt uniqueness-index deployment evidence.
- Evidence storage/scanning/private delivery and verification policy activation.
- Gazetteer dataset, FX and notification-provider policy/credentials.
- Backend/provider acceptance for protected exports, uploads, payment reconciliation and escrow outcomes.

These are dependencies, not frontend DTOs to guess. The private-file reconciliation/custody group is intentionally not exposed as a user-facing workflow in this pass.

## N. Readiness for Pass 16

Pass 16 can review response branches using the corrected finite DTO map. Prioritize Tour bare-array/header pagination, saved-search revision conflicts, escrow resolution 200/202 partial bodies, payment unknown/provider outcomes, CSV stream/error behavior, proxy evidence private URL handling, and optional versus nullable fields. The endpoint-specific nature of Chapter 15 must remain explicit; zero live acceptance is established.
