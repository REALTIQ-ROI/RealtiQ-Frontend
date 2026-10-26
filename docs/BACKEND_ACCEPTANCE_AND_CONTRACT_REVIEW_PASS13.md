# Backend Acceptance and Contract Review — Pass 13

**Date:** 26 October 2026  
**Repository boundary:** frontend repository and locally copied handoff only. No backend repository, backend environment, live API, provider, database, migration or deployment was accessed.

## A. Executive summary

**Initial and final acceptance readiness: PARTIAL.** Chapter 13 is a focused source/document review, not a numbered endpoint-by-endpoint acceptance checklist. Its latest remediation addendum explicitly disclaims exhaustive route documentation and live production/provider acceptance. This pass extracted and audited **37 Chapter 13 source entries**: 6 remediation assertions, 2 final implementation findings, 8 consistency findings, 4 contract-family outcomes and 17 per-chapter documentation coverage entries. It also cross-checked **44 representative exact endpoint patterns** in the frontend and handoff.

Evidence levels are kept separate. The matrix has **44 source-verified endpoint patterns**, of which **35 have a relevant focused mock-test slice** and **9 are source-verified only**. **Zero are live-backend accepted.** A mock test proves only the tested request/response slice; it does not establish the complete user journey or deployed backend behavior.

The pass found no new contract-backed frontend defect requiring a change beyond the Pass 12 map, project-map, FX-state and gazetteer corrections. Those changes remain covered by tests. Major unresolved items are the local handoff’s stated endpoint-template deficit (222 of 411 first-batch registrations lack an exact method/path mention outside the index), initial-login MFA challenge selection, configuration activation, and the explicitly missing/product-dependent DTOs and policies. No handoff contract was guessed to close those gaps.

## B. Chapter 13 requirements inventory

### Passes 01–10 remediation update: six assertions

| ID | Documented requirement / expected behavior | Frontend evidence and status |
|---|---|---|
| C13-A01 | Title/private evidence upload must perform resource authorization, bounded parsing, then one-use step-up bound to exact route, profile, session, file digest and multipart metadata; new property uploads use the scoped route. | `titleDocumentService`, `titleUploadStepUp`, evidence upload helpers and protected-upload UI follow the documented binding. Focused upload/binding tests passed. **SOURCE VERIFIED + MOCK-TESTED; live storage/scanner acceptance pending.** |
| C13-A02 | Property, installment and escrow initialization share durable pending reservations; ambiguous provider results remain reserved; no live Paystack acceptance is implied. | Payment UI preserves scoped references and unknown/pending states and avoids blind retries. No frontend claims provider success from redirect. **SOURCE VERIFIED + MOCK-TESTED; deployment/live acceptance pending.** |
| C13-A03 | Protected payment export uses `POST /api/payments/export.csv`; legacy GET cannot use the documented bound step-up flow. | Admin payment export calls POST with a frozen body and step-up; service/UI test passed. **SOURCE VERIFIED + MOCK-TESTED.** |
| C13-A04 | Saved-search PATCH supports `configurationRevision`/`expectedConfigurationRevision`; import mapping is strict; grid undo expiry is returned only where backed by configured/persisted operation data. | Saved-search UI preserves/reviews revisions; import mapping uses the strict shape; grid uses returned `undoAvailable`/`undoExpiresAt`. Related focused tests passed, but saved-search API conflict submission lacks a dedicated service-level test. **SOURCE VERIFIED; component/utility mock coverage only for tested slices.** |
| C13-A05 | Paid virtual-tour requests fail closed with `503 FEATURE_PAID_TOUR_UNAVAILABLE`; no fixed-price purchase or unsupported payment bridge. | Paid branch is rejected and test verifies no request is sent. **SOURCE VERIFIED + MOCK-TESTED.** |
| C13-A06 | Remediation’s 51 backend tests do not establish frontend or live acceptance; no live provider, migration, notification or activation is claimed. | This report separates source, mock and live evidence. No live calls or external actions occurred. **SOURCE VERIFIED.** |

### Earlier consolidated remediation follow-up: provenance

The earlier 4-bullet follow-up is superseded only where the later update above says so. Its claims were checked against Chapters 06, 07, 19 and 20: property-scoped multipart upload, shared durable payment reservation, escrow/installment route-bound challenge, and remaining tour/ownership/aggregate blockers. These are provenance for A01–A05, not additional independent requirements.

### Final two internal implementation findings: two checks

| ID | Acceptance condition | Result |
|---|---|---|
| C13-B01 | Recommended ranking and Sponsored eligibility are server policy/data decisions; public completeness must not use private KYC fields; missing required signals fall back deterministically with an unavailable notice. | Discovery UI does not calculate ranking or sponsored status; current public DTOs and server notices remain authoritative. **SOURCE VERIFIED.** Console policy activation remains unverified. |
| C13-B02 | Data-rights execution must use per-record classification, current authority/version/retention/legal-hold rechecks and grouped authoritative outcomes; deletion remains policy-gated. | Frontend presents processing/partial/held outcomes without inventing record rows or declaring all records erased. **SOURCE VERIFIED + MOCK-TESTED for request/outcome handling.** No deletion job was executed. |

### Contract-consistency findings: eight checks

| ID | Chapter 13 finding | Frontend acceptance result |
|---|---|---|
| C13-C01 | Legacy `/api/verification` user-ID/raw-KYC path conflicts with supported profile verification-case workflow and returns `409 CONFLICT_KYC_PROFILE_WORKFLOW_REQUIRED`. | Frontend uses current-profile case and staff queue flows; does not wire legacy raw-KYC mutation. **SOURCE VERIFIED.** |
| C13-C02 | `/api/documents/title-upload` is deprecated compatibility behavior; missing matching header can return `410 DOCUMENT_UPLOAD_ROUTE_DEPRECATED`; property-scoped upload is preferred. | New property upload uses `/api/documents/properties/:propertyId/title-upload`; no new call uses the deprecated route. **SOURCE VERIFIED + MOCK-TESTED.** |
| C13-C03 | The document router is mounted under singular and plural prefixes; new integrations should use plural. | New frontend service uses plural `/api/documents`; aliases are not treated as separate product features. **SOURCE VERIFIED.** |
| C13-C04 | Search failures for required configured data return 503/422 rather than widening the query. | Map/list state preserves criteria and surfaces error codes; location suggestions explain gazetteer unavailability without selecting a fake ID. **SOURCE VERIFIED + MOCK-TESTED.** |
| C13-C05 | Multipart step-up is file-byte and metadata bound, not interchangeable with JSON-bound TOTP. | Dedicated digest/multipart binding utilities are used; changing file/fields requires a new challenge. **SOURCE VERIFIED + MOCK-TESTED.** |
| C13-C06 | Tour list/update envelopes are bare; `cancelled` is not a supported update transition; paid-tour amount is not a pre-booking DTO field. | Tour service accepts bare list/DTO; UI offers only documented statuses and does not show a cancellation or fixed-price purchase path. **SOURCE VERIFIED + MOCK-TESTED.** |
| C13-C07 | Shared errors include `{message,code}` and validation `{code:"VALIDATION_FAILED",errors}`; `X-Request-ID` is available. | Shared Axios normalization preserves code, nested field errors, request ID and retry-after; focused tests passed. **SOURCE VERIFIED + MOCK-TESTED.** |
| C13-C08 | A mounted route does not prove first-batch product scope. | UI is limited to documented workflows; unclear/operational/callback routes were not promoted to product controls. **SOURCE VERIFIED.** |

### Four contract-family outcomes

| ID | Family | Expected frontend behavior | Status |
|---|---|---|---|
| C13-D01 | Tour cancellation and paid/live tour | No unsupported cancel route or fixed-price payment; ordinary supported tour requests remain separate; paid/live remains unavailable. | **SOURCE VERIFIED + MOCK-TESTED; paid/live BLOCKED BY PRODUCT/SPEC.** |
| C13-D02 | Admin finance reconciliation | Use documented wallet/transaction and escrow dispute/recovery DTOs; do not call ledger revenue bank settlement; provider state remains authoritative. | **SOURCE VERIFIED + MOCK-TESTED for wallet and selected service flows; provider acceptance pending.** |
| C13-D03 | Private-file custody/reconciliation | Use only documented scoped staff controls; provider locators are not public URLs; storage movement stays gated. | **CONTRACT DOCUMENTED; no general first-batch end-user migration screen; deployment acceptance pending.** |
| C13-D04 | Proxy inspection | Follow route-specific roles, states and step-up; do not infer cancellation, price policy or payout settlement. | **SOURCE VERIFIED + MOCK-TESTED for sampled create/payment/dispute operations; full provider/storage acceptance pending.** |

### Handoff documentation coverage: 17 file entries

Each file row below is a Chapter 13 documentation-coverage requirement, not a claim that the frontend should implement every route. Where the local handoff lacks an endpoint contract, the frontend remains blocked rather than inventing a DTO.

| ID | Source file | Coverage accepted / remaining contract gap | Frontend disposition |
|---|---|---|---|
| C13-E01 | `01-auth-accounts-profiles.md` | Shared auth/profile rules exist; per-route variations and full organization/seat/mandate/signatory DTOs remain incomplete. | Initial-login MFA response remains blocked; supported auth/profile paths continue. |
| C13-E02 | `02-properties-projects-units.md` | Main lifecycle/readiness contracts exist; not every mounted CRUD route has full errors, versions and alternate lifecycle examples. | Use exact supported root/nested routes; unprovided transitions stay disabled. |
| C13-E03 | `03-canonical-field-dictionary.md` | 156 field rows exist; type-specific serialization/lifecycle examples still need cross-links. | Runtime metadata gates controls; source presence alone is not accepted as end-to-end integration. |
| C13-E04 | `04-search-maps-discovery.md` | Query controls/sorts and key wire names exist; all endpoint envelopes/branches are not exhaustive. | Canonical URL and DTO handling tested; unsupported criteria are not locally widened. |
| C13-E05 | `05-imports-grids-bulk-operations.md` | Selected workflows are specified; all multipart, row outcome, job and retry/cancel variations are not endpoint exhaustive. | Mapping/jobs/undo use documented shapes; row-decision gaps remain isolated. |
| C13-E06 | `06-documents-media-verification.md` | Upload/security overview and custody operations exist; not every ordinary document lifecycle route has full DTO examples. | Byte-bound protected flows only; private access remains backend-authorized. |
| C13-E07 | `07-payments-ownership-escrow.md` | Tour/proxy contracts are detailed; payment/cart/ownership/payout/escrow endpoint templates remain uneven. | Durable reference and unknown-outcome safeguards stay in place; transfer/history remain blocked. |
| C13-E08 | `08-privacy-notifications-realtime.md` | Data-rights, notification and realtime overview exists; not every worker/per-record variation is fully represented. | Grouped execution and delivery receipt states only; no fabricated records/delivery. |
| C13-E09 | `09-admin-console-and-policies.md` | Selected verification/finance/custody detail exists; all staff routes lack complete endpoint templates. | Exact documented actions work; missing policy/decision schemas remain disabled. |
| C13-E10 | `10-api-errors-and-state-machines.md` | Shared errors and selected transitions exist; route-specific retry/transition coverage is not exhaustive. | Shared normalization plus endpoint recovery; no blanket retry. |
| C13-E11 | `11-frontend-integration-checklist.md` | Checklist exists, but it is not fully mapped to endpoint-specific response/error branches. | Pass 11 remains PARTIAL; its historical verdict is retained. |
| C13-E12 | `12-configuration-gates-and-open-decisions.md` | Gates are identified but not all mapped to exact runtime configured/disabled response variants. | Pass 12 matrix preserves these gaps; no capability endpoint is fabricated. |
| C13-E13 | `13-backend-acceptance-and-contract-review.md` | Focused acceptance update exists; it does not constitute exhaustive runtime acceptance. | This Pass 13 report adds frontend and test evidence without changing the copied handoff. |
| C13-E14 | `14-mounted-endpoint-index.md` | 594 registrations and classifications exist; 59 unclear registrations lack scope confirmation. | A mount alone does not create a frontend feature. |
| C13-E15 | `15-api-dto-and-schema-reference.md` | Selected finance/custody/proxy/tour DTOs exist; many first-batch route DTOs remain absent. | Only contract-backed routes are submitted. |
| C13-E16 | `16-api-response-variation-matrix.md` | 45 selected family rows exist; this is not an exhaustive 411-route variation matrix. | Supported variants are tested selectively; no universal envelope assumption. |
| C13-E17 | `17-end-to-end-frontend-workflows.md` | 19 aggregate workflows exist; every initiation/correction/retry/review path is not individually traced. | Connected journeys are source-reviewed; incomplete steps remain PARTIAL/BLOCKED. |

Chapter 13’s static inventory says **594 mounted registrations**, **411 first-batch registrations** (332 end-user, 79 staff), **189/411 exact path mentions** in feature documents, and **222/411 first-batch paths without an exact method/path mention outside the endpoint index**. It also counts 45 selective response-matrix rows, 44 unique path patterns in that matrix, 5 representative successful response bodies, 6 fenced HTTP blocks, 8 fenced JSON examples and 18 handoff Markdown files. These measurements demonstrate the contract-documentation boundary; they are not counts of frontend-accepted routes.

## C. Endpoint contract acceptance matrix

Level key: **L1** documented only; **L2** frontend source inspected and aligned; **L3** a focused mock test exercised the listed contract slice; **L4** authorized live backend acceptance. No L4 was performed. For L3 rows, the test evidence is scoped to the tested request/response branch, not the whole state machine. The 44 entries below are representative exact endpoint patterns reviewed for this pass, not an assertion that all 411 first-batch endpoints have full contracts.

| # | Endpoint | Frontend service / UI | Request and response alignment | Auth / step-up / error or state handling | Evidence / outstanding |
|---:|---|---|---|---|---|
| 1 | `POST /api/auth/login` | auth service / Login | Sends documented credentials; initializes returned session/profile state. | Bearer is established from response. Initial MFA challenge discriminator remains undocumented; no guessed second-factor prompt. | **L2**; initial challenge response blocks complete acceptance. |
| 2 | `POST /api/auth/login/second-factor` | auth service / Login recovery | `{challengeId,code}`; consumes returned account/session response. | Auth recovery only; code is not logged. | **L3** `authService.test.ts`; trigger contract remains blocked. |
| 3 | `POST /api/auth/logout` | auth service/AuthContext / account menu | Authenticated logout; response is not treated as profile data. | Clears session/profile caches and realtime state. | **L2**; live session revocation not tested. |
| 4 | `POST /api/auth/step-up` | `stepUpService` + `useBoundStepUp` / protected controls | Exact method/path/frozen JSON body; challenge DTO requires TOTP and expiry. | Active profile/session bound; no query in path; no persistent proof. | **L3** `stepUpService.test.ts`, `useBoundStepUp.test.ts`. |
| 5 | `POST /api/auth/step-up/:id/verify` | `stepUpService` + dialog | `{code}` only; verified proof is consumed by exact protected request. | Invalid/expired/rate-limited/session/profile mismatch prevents reuse/replay. | **L3** focused step-up tests. |
| 6 | `POST /api/profiles/current/onboarding/evidence` | verification service/upload helper / profile verification | Multipart `file` and exact policy metadata plus byte digest binding. | Current profile, TOTP; exact fields/file bytes; policy revision and scan response authoritative. | **L3** `profileEvidenceUpload.test.ts`; no live scan/storage. |
| 7 | `POST /api/profiles/current/verification-cases` | verification service / Landlord Verification | Current draft version, declared-person paths, evidence IDs and operation key. | Active profile; bound JSON TOTP; server case state is authoritative. | **L3** `verificationCaseService.test.ts`; no live case. |
| 8 | `POST /api/documents/properties/:propertyId/title-upload` | title document service / Title Verification | Single bounded file and supported metadata; returns document/verification/risk/next action DTO. | Resource authorization before bounded read; byte+metadata-bound one-use TOTP. | **L3** title-upload service/digest tests; scanner/provider acceptance pending. |
| 9 | `PATCH /api/properties/:id` | property service / Add/Edit Property | Changed fields, expected version and documented canonical mutations; property response normalized. | Owner/profile authorization; bound step-up where specified; conflict refresh keeps draft. | **L2**; property PATCH current response not in this focused mock set. |
| 10 | `PATCH /api/properties/:id/project` | property/project service / property editor association | Attach/move body includes project ID, optional project-unit and current property version. | Owner authorization and exact path/body TOTP; Sold/history rules server-side. | **L3** association service/UI tests. |
| 11 | `DELETE /api/properties/:id/project` | property service / property editor association | Versioned detach body; consumes returned property state. | Bound exact path/body; 409 refreshes before review. | **L3** association service/UI tests. |
| 12 | `PATCH /api/projects/:id` | project service / project management/publication | Uses `expectedVersion`, `publicationAction`, and selected IDs only when required. | Owner/staff authorization; publication bound step-up; readiness/error refresh preserves selection. | **L3** `projectService.test.ts`; no live readiness response. |
| 13 | `GET /api/properties/map` | property service / Listings map | Canonical query includes `queryVersion=canonical-v1`, complete bounds and shared filters; property/cluster DTO is normalized. | Public read; unavailable 503/422 is not widened to an unfiltered search. | **L2**; map marker utility tests are separate from live map contract. |
| 14 | `GET /api/projects/map` | project service / Projects Map | Canonical filters/bounds; page/limit removed for map; canonical counts, price state and nullable bounds validated. | Public projection; malformed response goes to safe list recovery, stale pins are hidden. | **L3** `projectService.test.ts`, `projectFormatters.test.ts`. |
| 15 | `GET /api/locations/suggestions` | location service / location inputs | `level,q,parentId?,limit`; `{suggestions,revision}` response. | Public; 503 `FEATURE_SEARCH_GAZETTEER_UNCONFIGURED` is explicitly shown, no fake ID. | **L3** `locationService.test.ts`, `axios.test.ts`; status route DTO remains unspecified. |
| 16 | `PATCH /api/personalisation/searches/:id` | personalisation service / Personalisation + Listings | Sends supported fields and `expectedConfigurationRevision`; consumes `{savedSearch}`. | Current profile; 409 revision conflict is presented for review, not overwritten automatically. | **L2** `savedSearchQuery.test.ts` covers criteria serialization, not API conflict transport. |
| 17 | `POST /api/projects/:projectId/property-imports` | project service / Project Property Imports | Multipart upload; accepted/ambiguous result is tracked by import ID. | Authorized project profile; ambiguous submission is checked before any resubmit. | **L3** import-page recovery tests. |
| 18 | `PATCH /api/projects/:projectId/property-imports/:importId/mapping` | project service / import mapping | Strict `{mappings:[{columnNumber,field}]}` body and refreshed session. | Project authorization; server mapping validation remains authoritative. | **L3** import mapping page/utility tests. |
| 19 | `PATCH /api/projects/:projectId/property-imports/:importId/rows/:rowNumber` | project service / row correction | Sends documented editable row data and receives refreshed session/outcomes. | Project authorization; row-decision/confirm DTO gaps are not guessed. | **L3** import correction/page tests; unsupported confirm decisions remain blocked. |
| 20 | `GET /api/projects/:projectId/unit-grid` | project service / Unit Grid | Paged query returns project/unit versions, raw overrides, effective fields, provenance and readiness. | Project authorization/profile; conflict path reloads server rows. | **L3** grid service/component tests. |
| 21 | `POST /api/projects/:projectId/unit-grid/bulk` | project service / Unit Grid | Operation key, project version and selected unit versions with canonical mutations. | Authorized project profile; 409 preserves changes for review. | **L3** grid tests; no live mutation. |
| 22 | `POST /api/projects/:projectId/unit-grid/jobs` | project service / Unit Grid | Durable operation key, action/actionOptions, project and row versions. | Authorized project profile; 202/queued remains pending. | **L3** `projectService.gridJobs.test.ts`, `UnitGridPanel.test.tsx`. |
| 23 | `GET /api/projects/:projectId/unit-grid/jobs/:jobId` | project service / Unit Grid job recovery | `{job}` with progress and row outcomes. | Project authorization; polling stops at terminal state and refreshes after remount. | **L3** grid job/component tests. |
| 24 | `POST /api/projects/:projectId/unit-grid/jobs/:jobId/cancel` | project service / Unit Grid | Documented no-body cooperative cancellation; returns updated job. | Project authorization; cancellation request is not undo/completion. | **L3** grid job tests. |
| 25 | `POST /api/projects/:projectId/unit-grid/operations/:operationId/undo` | step-up service / Unit Grid | Exact empty JSON body and operation route; eligibility uses server `undoAvailable`/`undoExpiresAt`. | Bound TOTP, project/unit versions; expired/ineligible rows disabled or rejected. | **L3** grid and step-up tests. |
| 26 | `POST /api/cart/checkout/initialize` | checkout service / Buyer Service Cart | Exact `{}` body; uses returned pending/checkout/payment references and provider URL. | Buyer profile + JSON-bound TOTP; no duplicate initialization on refresh/timeout/unknown. | **L2** in this test set; unknown/pending UI is source-reviewed, live provider absent. |
| 27 | `POST /api/payments/initialize` | payment service / property, installment and escrow actions | Documented resource body; preserves durable reference and pending state. | Authorized buyer/resource profile + bound TOTP; ambiguous outcome is not retried. | **L3** `paymentService.test.ts`. |
| 28 | `GET /api/payments/verify/:reference` | payment service / return and payment detail | Uses encoded reference; backend verification DTO controls status. | Auth/profile access; provider redirect is not proof. | **L3** payment recovery/UI service tests. |
| 29 | `POST /api/payments/export.csv` | payment service / Admin Payments | Protected POST body and CSV blob response. | Finance authorization + JSON-bound TOTP; no legacy GET substitution. | **L3** payment service tests. |
| 30 | `PATCH /api/admin/payments/:id/cancel` | payment service / admin payment list/detail | Supported bounded reason body; response contains authoritative payment and already-cancelled state. | Finance permission + bound TOTP; cancellation never labeled a refund. | **L3** Admin Payments UI/service tests. |
| 31 | `POST /api/profiles/current/data-protection-requests` | data-protection service / Privacy settings | Exact request type/scopes/correction fields/operation key/version; `{request}` response. | Current non-staff profile, permission and bound step-up; accepted does not mean executed. | **L3** `dataProtectionService.test.ts`. |
| 32 | `GET /api/profiles/current/data-protection-requests/:id/execution` | data-protection service / request detail | Job state and grouped per-record outcomes; no fabricated record IDs. | Current profile; bounded poll and terminal-state stop. | **L2** source/UI reviewed; focused service test did not exercise this read. |
| 33 | `GET /api/admin/data-protection-requests/:id/execution` | data-protection service / staff execution detail | Same safe grouped execution projection under staff scope. | Authorized staff; grouped counts only. | **L2** source-reviewed; no live staff permission check. |
| 34 | `POST /api/admin/verification-cases/:id/decision` | verification service / staff case detail | Required checks and policy sources; decision body uses current case version. | Staff assignment/separation of duties + bound TOTP; backend policy/evidence conflicts remain authoritative. | **L3** verification service tests; policy activation/live decision not tested. |
| 35 | `POST /api/admin/notification-deliveries/:deliveryId/reconcile` | admin notification delivery service / reconciliation | Exact outcome/evidence reference/observed timestamp/provider ID shape. | Technical staff, not Internal Audit, + TOTP; attestation is not provider proof. | **L3** service tests. |
| 36 | `PATCH /api/trust/v1/admin/appeals/:id` | trust service / Trust Appeals | Versioned documented decision DTO and reason. | Admin permissions + bound TOTP; refreshes authoritative decision. | **L3** `phase45Services.test.ts`. |
| 37 | `POST /api/tour` | tour service / property viewing | Uses only supported non-paid request DTO and returned booking state. | Authenticated eligible profile; paid/live branch is not sent. | **L2** source-reviewed; mock service suite covered paid branch rejection, not successful create. |
| 38 | `GET /api/tour` | tour service / viewing history | Consumes bare paged list rather than assumed wrapper. | Auth/profile scoped as backend permits. | **L3** `tourService.test.ts`. |
| 39 | `PATCH /api/tour/:id` | tour service / viewing management | Sends supported `pending|approved|rejected|completed` and expected version; no cancel transition. | Participant authorization; server state is authoritative. | **L3** `tourService.test.ts`. |
| 40 | `GET /api/admin/wallet` | admin service / Admin Wallet | Uses authoritative wallet summary projection. | Staff finance read permission; do not rename ledger amount as settled bank funds. | **L3** `adminService.test.ts`; no provider settlement acceptance. |
| 41 | `GET /api/admin/wallet/transactions` | admin service / Admin Wallet | Uses documented filter and paginated transaction DTO. | Staff finance read permission; no aggregate from page slices. | **L3** `adminService.test.ts`. |
| 42 | `POST /api/proxy-inspections` | proxy service / buyer inspection request | Exact property/inspector/services request; raw request response is preserved. | Buyer role and inspector eligibility; duplicate returns existing request reference. | **L3** proxy service/create UI tests. |
| 43 | `POST /api/proxy-inspections/:id/initialize-payment` | proxy service / inspection payment | Empty body; provider reference/pricing response retained; idempotent pending response handled. | Buyer, verified access and bound TOTP; provider configuration required. | **L3** proxy service tests; no live payment. |
| 44 | `PATCH /api/admin/proxy-inspections/:id/resolve-dispute` | proxy service / Admin Proxy Workspace | Documented resolution/notes body and returned service state. | Authorized staff + bound TOTP; no local payout/refund success inference. | **L3** proxy service tests; provider settlement unverified. |

## D. State-machine acceptance

- **Authentication and step-up:** session state is profile-scoped; step-up binds exact method, literal queryless path, immutable body, active profile and session, expires and is one-use. Expired/changed inputs require a fresh challenge. Initial login still lacks a documented response shape that triggers second-factor UI.
- **Property/project publication:** drafts and edits use returned versions; project publication uses `save_draft`, `publish_all_ready` or `publish_selected`; server readiness and conflicts remain authoritative. No unsupported Sold transition or guessed archive behavior was introduced.
- **Imports and grid:** staging, mapping, queued jobs, progress, partial row outcomes, cancellation and undo remain distinct. `undoAvailable`/`undoExpiresAt` are server-provided. Unknown import acceptance is status-checked, never blindly resubmitted.
- **Verification and documents:** upload, scan, case submission and approval are separate states. Staff decision uses required checks/policy source and current version. Byte-bound uploads are not replayed after input changes.
- **Payments/ownership:** pending and `outcome_unknown` remain unresolved until server verification/reconciliation. Redirect is not payment proof; payment is not ownership. Cancellation is not refund. No duplicate initialization or real transaction was attempted.
- **Privacy/notifications:** request acceptance does not mean deletion; grouped outcomes and legal holds remain visible. Notification creation/queue acceptance does not prove external delivery. Realtime is reconciled against REST.
- **Tour/proxy:** paid tour fails with a product-unavailable code and is not a retryable provider outage. No tour cancellation transition is presented. Proxy request/payment/dispute states use returned server DTOs and do not claim settlement from request acceptance.

## E. Security acceptance

Source review confirms the existing authenticated Axios client sends the bearer and current `X-Profile-ID`; 401 cleanup is distinct from 403 permission denial. Profile changes clear scoped state and realtime connections. Step-up challenge proof is not persisted and is invalidated on profile/session/input changes. Private title/evidence flows use protected routes and byte-bound multipart helpers. Private content is not converted to a persistent public URL. Staff actions require documented role/department checks and server authority; the UI does not grant permissions from role labels.

**Open security acceptance:** no live multi-profile isolation, revoked-session, staff separation-of-duties, protected storage/scanner, or provider-webhook authorization test ran. The initial login MFA discriminator remains a contract blocker. No server secret was added or exposed by this pass.

## F. Financial acceptance

- Cart/property/installment/escrow initialization uses backend-calculated values, durable attempt references and bound requests where documented.
- Timeout/provider ambiguity does not trigger automatic retry; a pending reservation is preserved for status reconciliation.
- Provider return parameters do not establish payment success; backend verification does.
- Ownership remains visible only from the authoritative ownership projection.
- Admin payment cancellation remains separate from refunds.
- CSV export uses protected POST with TOTP; no legacy GET export is used.
- Payment-attempt uniqueness index deployment and reconciliation remain unverified. No payment, refund, payout, escrow release or provider call was performed.

## G. Contract discrepancies and documentation boundaries

| Finding | Source files / sections | Conflict or incomplete definition | Affected frontend / risk | Recommended clarification |
|---|---|---|---|---|
| Legacy verification route | Chapter 13 “Contract consistency findings”; Chapters 01, 06, 14 | Old `/api/verification` raw-KYC mutation remains mounted but rejects with `409`; current profile case routes are the supported flow. | Auth/profile verification; using legacy route loses workflow and may send wrong identity shape. | Keep legacy route marked compatibility/rejected; publish complete response errors for current case paths. |
| Deprecated title-upload path | Chapters 13 and 06; endpoint index 14 | Body/compatibility upload requires matching `X-Property-ID`; new path-scoped upload is preferred. | Title upload; risk of `410` and wrong resource authorization if legacy path reused. | Preserve route-specific status and examples; current frontend already uses plural path-scoped route. |
| Singular/plural document prefix | Chapters 13, 06 and 14 | Same document router mounted as `/api/document` and `/api/documents`; this is an alias, not necessarily a feature conflict. | Any future private-document integration could accidentally target an untested prefix. | Use plural in new frontend code and mark alias scope explicitly. |
| Search configuration failures | Chapters 13, 04, 10 and 16 | Older descriptions may imply fallback; current contract returns 503/422 and forbids query broadening. | Listings/maps/location. | Ensure feature-guide examples always show fail-closed error branch. |
| Multipart versus JSON step-up | Chapters 13, 06, 19 and 20 | Generic JSON-bound TOTP does not represent byte digest and multipart metadata. | Evidence/title upload; challenge replay or wrong file binding risk. | Keep upload-specific binding samples authoritative and separate. |
| Tour legacy prose superseded | Chapter 13 latest update vs earlier Chapter 13 “Four contract-family outcomes” prose and legacy examples in 07/15 | Earlier text describes a fixed `TOUR_PRICE=5000` Paystack path; latest update states that branch has been removed and paid tour now fails closed with `503 FEATURE_PAID_TOUR_UNAVAILABLE`. | Tour UI; stale text could re-enable unsafe payment. | Latest 26 Oct remediation update controls; synchronize older tour prose in future handoff revision. |
| Tour states/envelopes | Chapter 13 consistency finding; Chapters 07, 15 and 16 | `cancelled` can be filtered/modelled but no supported update/cancel route; list and update envelopes are bare. Older envelope wording differs. | Tour list/update; fabricated cancel or wrapper parsing would misstate state. | Keep current bare response and allowed transition list in all DTO references. |
| Shared error DTO | Chapters 13, 10 and 16 | `{message,code}` and validation `{code,errors}` are distinct response variants; not one universal envelope. | All forms and capability recovery. | Keep both variants in examples and request ID/Retry-After behavior. |
| Endpoint index vs completeness | Chapters 13 and 14; feature guides 01–17 | Index covers 594 mounts, while exact methods/paths appear for only 189/411 first-batch registrations outside the index. A mount does not prove product scope. | Application-wide acceptance; 222 entries cannot be fully request/response accepted from docs alone. | Publish per-first-batch-route templates and resolve the 59 unclear-scope registrations. |

Chapter 13 also states the security/payment remediation is based on backend source/tests. This frontend pass can verify only the copied claim and frontend contract alignment; it cannot reproduce or independently validate the backend tests, migrations or source behavior.

## H. Frontend implementation changes

No additional application code was needed after Pass 12’s verified corrections. The current reviewed changes remain:

- `src/config/maps.ts` and `src/config/maps.test.ts`: use the existing Leaflet renderer when the optional public Mapbox token is absent.
- `src/services/projectService.ts`, `src/services/projectService.test.ts`, `src/pages/public/ProjectsMap.tsx`, `src/utils/projectFormatters.ts` and `src/utils/projectFormatters.test.ts`: enforce the canonical project-map response, present FX-unconfigured aggregates honestly, and prevent stale project pins.
- `src/services/locationService.ts`, `src/services/locationService.test.ts`, `src/components/property/LocationSuggestionInput.tsx`, `src/pages/public/Listings.tsx` and `src/lib/axios.test.ts`: preserve and display the gazetteer unavailable code.

The tracker and reconciliation summaries are updated to the row-derived **19/14/7/1** counts. The Pass 11 report has a dated follow-up note for the later map changes; the historical Pass 11 verdict remains PARTIAL. No copied backend handoff file was changed.

## I. Remaining blockers

| Classification | Remaining items |
|---|---|
| Frontend-owned | No additional supported defect was found in the targeted acceptance review. A dedicated saved-search API conflict transport test and some route-level state tests would improve regression coverage, but they do not authorize a contract change. |
| Backend contract / missing specification | Initial login MFA challenge discriminator; gazetteer-status response DTO; import explicit row-decision bodies; parts of staff privacy/listing verification decisions; ownership history/transfer; per-media item entitlement; incomplete endpoint DTOs across the 222 unmentioned paths; site-plan marker binding; unresolved admin aggregates. |
| Product decision | Paid/live tour model; 15-versus-16 construction milestone discrepancy; exact duplicate-size tolerance; ranking/placement choices where product policy must approve them. |
| Configuration | Gazetteer/boundary, FX, nearby maximum, routing, ranking, cadence/trust/freshness, private storage/scanner/renderer, verification policy, Paystack/Monnify/payout plans, notification providers and legal retention/deletion execution. |
| Deployment | Payment-attempt uniqueness index, migrations/index rollout and existing-record reconciliation; provider callbacks/webhooks/receipts; storage/scanner and worker health. No deployment evidence was available. |
| Live acceptance | Every protected mutation, provider return, concurrency/replay boundary, private file access, profile isolation and terminal/partial state requires an authorized staging acceptance run. None was run. |

## J. Test evidence

### Successful checks

- Focused Vitest: **30 files, 137 tests passed** across four focused runs. Covered auth/step-up, profile evidence, title upload, property/project association, project/map DTO, location unavailable handling, import mapping and recovery, grid jobs/undo, payment initiation/export/cancellation/unknown outcomes, privacy service, verification decisions, notification delivery reconciliation, trust appeals, tours, admin wallet and proxy inspection.
- TypeScript no-emit: `node <bundled-node> node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false` — **exit 0**.
- Edited-file ESLint: `node <bundled-node> node_modules/eslint/bin/eslint.js --max-warnings 0 <12 changed TS/TSX files>` — **exit 0, zero warnings**.
- Final `git diff --check` — **exit 0**, line-ending notices only.

### Failed or stopped invocation

- `npm test -- --pool=forks --maxWorkers=1 <25 focused paths>` using the system Node failed before Vitest discovery with Windows `EPERM` resolving `C:\Users\DELL` (exit 1; zero tests executed).
- The same 25-file command using the bundled Node showed no discovery/progress for over 20 seconds and was interrupted (exit 1; no test results reported from that run). Smaller bundled-runtime runs then completed successfully: 5 files/34 tests, 9/31, 7/38, 6/19 and 3/15. Totals above exclude the failed/stopped invocation.
- No full suite, production build, live backend, payment, provider, storage, destructive privacy or administrative operation was executed.

## K. Live backend acceptance plan

All scenarios require an authorized dedicated staging environment, synthetic accounts/data and explicit approval from the relevant environment owner. **Read-only scenarios must run first.** Never use production customer data, real payment credentials or irreversible production writes. Each scenario has a cleanup step; backend/provider logs and request IDs must be retained with secrets redacted.

| ID / class | Feature, role and prerequisites | Request/response and state/error acceptance | Security, risk, cleanup and readiness |
|---|---|---|---|
| LA-01 Read-only | Login/session restoration and profile isolation; synthetic account with two authorized profiles; staging auth configuration. | Login returns documented account/session projection; switch changes `X-Profile-ID`; 401 clears session; 403 does not log out; revoked session fails on next request. Initial-MFA branch waits on documented challenge response. | No protected write. Remove synthetic account after logs retained. **Ready except MFA branch; staging needed.** |
| LA-02 Read-only | Public property/project maps and gazetteer; approved test bounds, one visible listing/project, configured and unconfigured test deployments. | Assert canonical query version, complete bounds, property pin/cluster or project counts/FX state; gazetteer success DTO or 503 code; invalid bounds returns documented error; criteria are not dropped. | Public DTO only; no private data. No map coordinates persisted. **Ready if both config variants exist.** |
| LA-03 Reversible nonfinancial | Saved-search revision; synthetic buyer profile/search. | Create/read/PATCH with observed revision; concurrent stale revision returns `409 CONFLICT_SAVED_SEARCH_VERSION`; UI preserves edits for review. | Scoped synthetic data; delete test saved search. **Ready.** |
| LA-04 Reversible nonfinancial | Property/project association and publication; verified synthetic owner/developer, draft property/project and ready/unready units. | Attach/move/detach uses current version; stale version conflicts; publication uses exact action and server readiness blockers; refresh returns authoritative state. | Protected TOTP and audit. Keep listing unpublished after test, detach/delete only through documented cleanup. **Requires authorized staff/owner test data.** |
| LA-05 Reversible nonfinancial | Import and durable grid jobs; synthetic project, template rows, units. | Upload/map/preview/confirm returns job ID; 202 remains queued; polling reaches exact terminal/partial state; row errors match server; cancel/undo follow returned eligibility and expiry. | Mutates staged/import data; use disposable project and remove via documented lifecycle. No blind retry. **Ready in isolated staging.** |
| LA-06 Protected mutation | TOTP-bound upload; synthetic profile/property, disposable PDF/image, current evidence/title policy and clean scanner. | Challenge method/path/body/profile/session/digest match; changed file invalidates proof; protected response, scan state and refresh are authoritative; replay fails. | Private bytes; restrict staff access; delete only via approved cleanup, preserve audit. **Requires private storage/scanner configuration.** |
| LA-07 Protected mutation | Holder/staff verification; synthetic case/evidence, approved manual sources, two eligible reviewers. | Claim/version then required checks and decision; duplicate reviewer/separation-of-duty and stale version return documented errors; case history reflects decision. | Sensitive KYC evidence; TOTP, least privilege, audit; purge synthetic data only under test retention policy. **Requires policy and staff configuration.** |
| LA-08 Financial | Checkout/payment reservation; synthetic buyer and sandbox provider/amounts, provider webhook, index deployment evidence. | Initialize once; preserve reference; provider pending/unknown remains reserved; verify returns pending/completed/failed/reconciliation state; second initialization respects reservation; allocation state follows server. | No real money; sandbox only. Clean sandbox attempt after confirming terminal status. **Blocked until sandbox and unique-index deployment are verified.** |
| LA-09 Financial | Protected payment CSV/cancel, admin finance role, synthetic transactions. | POST export requires bound challenge and returns no-store CSV; cancellation returns authoritative payment state and never a refund state. | TOTP/audit, synthetic records, secure file cleanup. **Ready in staging; not production-tested.** |
| LA-10 External provider | Paystack/Monnify/webhook and proxy inspection payment, provider sandbox plus approved fee policy. | Redirect alone remains pending; signed provider receipt/verify controls state; unknown outcome does not create a second attempt; provider mismatch fails closed. | External side effects, sandbox only, no customer data; reconcile/cancel sandbox attempt as documented. **Blocked pending provider activation and approved plan/fee policy.** |
| LA-11 Read-only / protected | Notification delivery and realtime; synthetic profile/channel with receipt-capable sandbox. | Queued/accepted is not delivered; only verified receipt updates status; reconnect restores REST state and current profile; stale event does not cross profile. | No real recipients; clear test devices/subscriptions. **Requires channel provider/receipt configuration for delivery branch.** |
| LA-12 Destructive | Privacy deletion; synthetic isolated profile, approved retention policy, enabled worker and no legal hold, explicit legal/operations approval. | Request/decision/execution DTOs show policy holds and grouped outcomes; completed only after authoritative per-item outcomes; legal hold prevents deletion. | Irreversible even in staging; dedicated disposable tenant and documented backup/restore; verify audit and cleanup. **Not ready until legal approval and execution configuration.** |

## L. Readiness for Pass 14

Source-level endpoint behavior is ready for a staged backend acceptance cycle for contracts represented in the local handoff and in the 44-row matrix. Focused mock tests cover 35 matrix rows and related security/error slices. The frontend is not production/deployment accepted. The 222 undocumented first-batch route paths, Chapter 13’s four family boundaries, configuration gates, product decisions and live provider/storage dependencies remain open. **Pass 13 verdict: PARTIAL.**
