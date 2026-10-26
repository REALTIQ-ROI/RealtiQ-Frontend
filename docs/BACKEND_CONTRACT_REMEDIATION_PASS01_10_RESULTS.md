# Backend Contract Remediation — Frontend Passes 01–10

**Current as of 26 October 2026**  
**Repository:** RealtiQ backend  
**Scope:** the 41 blocker headings in the frontend remediation inventory; backend source and mounted-route handoff only. No frontend files were changed.

## A. Initial inventory and audit method

The frontend inventory reports **41 blockers: P0 6, P1 23, P2 12**. Its actual blocker headings count **P0 6, P1 22, P2 13**. Both totals equal 41; this report uses the priority attached to each actual heading and preserves the discrepancy rather than silently reassigning an ID.

Each listed path was checked against the Express mount in `src/app.js`, the relevant route file, controller, middleware, service and DTO/policy code. “Mounted” below means registered under the app's `/api` prefix in source, not live-probed. The review establishes contract/source behavior; only the tests listed in section E are runtime evidence. No live provider, production database, migration, deployment or external notification was exercised.

### Current disposition counts

| Final status | Count |
|---|---:|
| RESOLVED — IMPLEMENTED AND TESTED | 6 |
| RESOLVED — DOCUMENTATION CORRECTED | 28 |
| ALREADY RESOLVED | 0 |
| BLOCKED — PRODUCT DECISION | 2 |
| BLOCKED — MISSING IMPLEMENTATION SPECIFICATION | 3 |
| BLOCKED — CONFIGURATION | 0 original blockers blocked exclusively by configuration |
| BLOCKED — EXTERNAL PROVIDER | 0 original blockers blocked exclusively by a provider |
| FRONTEND-OWNED | 1 |
| DEFERRED — EXPLICITLY JUSTIFIED | 1 |
| **Total** | **41** |

Configuration/provider activation remains a separate deployment concern even where the contract itself is documented. No internal gap is labeled configuration-only while its implementation is incomplete.

### Primary verified issue classification (one per blocker)

These are the inventory-time classifications; final disposition may differ because a defect can be fixed or a capability safely disabled. Configuration gates are tracked separately and can overlap.

| Classification | Count | Blocker IDs |
|---|---:|---|
| DOCUMENTATION GAP | 10 | B10-01, B07-01, B09-LEGAL-01, B01-01, B01-02, B01-03, B01-04, B01-05, B04-02, B09-03 |
| BACKEND IMPLEMENTATION DEFECT | 3 | B07-02, B06-01, B07-03 |
| INCOMPLETE REQUEST CONTRACT | 14 | B04-01, B05-01, B06-02, B06-03, B07-04, B07-06, B08-01, B09-VER-01, B09-02, B09-05, B09-06, B01-06, B01-08, B02-01 |
| INCOMPLETE RESPONSE CONTRACT | 8 | B05-02, B08-02, B09-04, B01-07, B04-03, B05-03, B09-08, B09-09 |
| MISSING BACKEND CAPABILITY | 1 | B07-05 |
| CONTRACT MISMATCH | 1 | B07-08 |
| MISSING IMPLEMENTATION SPECIFICATION | 2 | B03-02, B09-11 |
| MISSING POLICY DECISION | 1 | B03-03 |
| FRONTEND-OWNED ISSUE | 1 | B09-10 |
| **Total classified once** | **41** | |

## B. Blocker-by-blocker audit and disposition

`Auth` below refers to current Bearer/session and, when applicable, selected-profile revalidation. `Step-up` means the route consumes a one-use request-bound proof; exact method/path/body/file binding is described where relevant. Route names are full mounted `/api` paths.

### P0 — security and financial correctness

| ID | Route / mounted | Validation, response, auth and step-up verified | Audit finding, exact action and final status |
|---|---|---|---|
| B10-01 | 411 first-batch HTTP registrations across `src/routes/*`; mounted endpoint index is `docs/frontend-handoff/14-mounted-endpoint-index.md`. | Contracts remain route-specific; every endpoint has its own middleware/controller/serializer. No single auth or response envelope applies to all. | Inventory accurately identified an **exhaustive documentation gap**, not 411 demonstrated runtime defects. Full per-route error/state/retry templates are not safely representable as one bounded remediation without duplicating the authoritative endpoint chapters. Preserved scope counts and explicit limitation; frontend must use only documented operations. **DEFERRED — EXPLICITLY JUSTIFIED.** |
| B07-01 | `/api/escrow` participant routes and `/api/installments` routes; see `src/routes/escrowRoutes.js`, `src/routes/installmentRoutes.js`. | Mounted participant reads/writes use Bearer and current participant/profile authorization; step-up is route-specific. Mutations check role, state, and where applicable version; settlement remains provider-confirmed. Route matrix and request/response variations are now explicit in [07](frontend-handoff/07-payments-ownership-escrow.md). | The implementation was present; the blocker was lack of route-level step-up/body/state documentation. Added exact operation matrix and pending-vs-settled guidance. **RESOLVED — DOCUMENTATION CORRECTED.** |
| B07-02 | `POST /api/tour`; legacy `POST /api/payments/initialize` with `tourId`; cart paid-tour item consumer. All routes are mounted. | Current buyer/profile checks remain in the normal viewing flow. `virtual_paid` now returns `503 FEATURE_PAID_TOUR_UNAVAILABLE` before service persistence or payment; `paymentOption`/`addToCart` are rejected for supported free requests. No step-up challenge can activate the feature. | Confirmed source incompatibility and unsafe fixed-price branch. Removed the fixed-price purchase route path and made all relevant entry points fail closed. Activation still needs an approved product decision for price, scheduling/calendar, live-session and settlement semantics. **BLOCKED — PRODUCT DECISION.** |
| B06-01 | `POST /api/documents/properties/:propertyId/title-upload`, `/api/documents/title-upload`, `/api/documents/title-asset-upload`, `/api/documents/projects/:projectId/registered-survey`, `/api/properties/:propertyId/title-documents`, `/api/title-verifications/:id/verify-document`; route registrations in `documentRoutes.js`, `propertyRoutes.js`, `titleVerificationRoutes.js`. | Bearer and resource authorization run before bounded multipart buffering where route data permits; then one-use step-up is checked against exact method/path, active profile/session, file digest and multipart metadata. Legacy `/api/documents/title-upload` requires matching `X-Property-ID` before buffering. | Confirmed middleware-order/binding defect. Corrected upload chain and compatibility rule; added route/security tests. New integrations should use the property-scoped path. **RESOLVED — IMPLEMENTED AND TESTED.** |
| B07-03 | `POST /api/payments/initialize`; legacy installment and escrow initializers remain mounted. `src/routes/paymentRoutes.js`, `installmentRoutes.js`, `escrowRoutes.js`. | Body is exactly one target: `{propertyId}`, `{installmentId,amount,scheduleItemId?}`, or `{escrowId}` (legacy `tourId` fails closed). Current price/currency/state come from server records. Verified buyer/current profile/KYC/step-up apply. First provider result returns `{redirectUrl,reference}`; escrow adds IDs; ambiguous result returns `503 PAYMENT_INITIALIZATION_OUTCOME_UNKNOWN` or `409 PAYMENT_INITIALIZATION_PENDING` and requires reconciliation. | Confirmed incomplete direct-payment protocol and duplicate-attempt risk. Added durable shared reservation/init path, provider response checks, ambiguity persistence and provider-confirmed release handling. The pending-reservation unique partial index in `src/models/Payment.js` must be deployed before enabling this path in a database. **RESOLVED — IMPLEMENTED AND TESTED.** |
| B09-LEGAL-01 | `GET/POST /api/admin/legal-holds`, `GET /api/admin/legal-holds/:id`, `POST /api/admin/legal-holds/:id/release`; mounted in `src/routes/adminRoutes.js`. | Staff current-context, Compliance/Data Protection department and read-only Internal Audit policy; writes require bound step-up and independent issuer/releaser. Exact target/reason/version bodies and DTO are documented in [09](frontend-handoff/09-admin-console-and-policies.md). | The persisted legal-hold service already enforced the sensitive transitions; the handoff lacked exact contracts. Updated target/release schema and response documentation. **RESOLVED — DOCUMENTATION CORRECTED.** |

### P1 — core workflows

| ID | Route / mounted | Validation, response, auth and step-up verified | Audit finding, exact action and final status |
|---|---|---|---|
| B01-01 | `POST /api/auth/login/second-factor`; mounted in `src/routes/authRoutes.js`. | Exact `{challengeId,code}`, login challenge/account-version binding, expiry and attempt behavior documented in [01](frontend-handoff/01-auth-accounts-profiles.md). Login challenge is not a profile step-up token. | Source already validates the concrete factor DTO; handbook now states exact request/result and failure codes. **RESOLVED — DOCUMENTATION CORRECTED.** |
| B01-02 | `GET/PATCH /api/profiles/current/onboarding`; `POST /api/profiles/current/verification-cases`. | Current profile and `team.manage`; draft PATCH is versioned and step-up protected. Read returns draft `version`, `values`, `readiness`, and field metadata; case submit uses `expectedDraftVersion` and declared `people[].path` values from the draft. | Existing draft/case implementation supplied the authoritative data. Documented draft/version/people relationship and case prerequisites in [01](frontend-handoff/01-auth-accounts-profiles.md). **RESOLVED — DOCUMENTATION CORRECTED.** |
| B01-03 | `/api/profiles/current/members`, `/roles`, `/invitations`, `/mandates`, `/signatories`; profile invitation claim/accept and staff signatory review routes. | Organization routes require current profile permissions and step-up on authority changes; grant values are bounded by `src/constants/profilePermissions.js`; signatory/mandate actions are versioned and independent review is enforced. Safe member, role, mandate, invitation and signatory DTOs are now documented in [01](frontend-handoff/01-auth-accounts-profiles.md). | Routes and authority services existed; generic handoff wording was insufficient. Added exact request fields, returned fields, supported role/permission vocabulary, state gates and revocation notes. **RESOLVED — DOCUMENTATION CORRECTED.** |
| B01-04 | `/api/profiles/current/seat-plans`, `/seats`, `/seat-purchases`, `/seat-purchases/:purchaseId`, audit/cancel/reconcile/renew; payout setup routes. | Current organization administrator/signatory and step-up; plans come from approved Console policy. Payment callbacks activate entitlements; provider ambiguity stays pending. Payout DTO omits full account number and requires current payout policy/provider plus verified legal identity. | Added exact seat and payout DTO/body/state/configuration contracts in [01](frontend-handoff/01-auth-accounts-profiles.md). An unconfigured plan/payout policy remains a safe unavailable state, not a guessed plan. **RESOLVED — DOCUMENTATION CORRECTED.** |
| B01-05 | `PATCH /api/profiles/current/privacy`; mounted profile route. | Exact body `{visibility:"private"|"public",followable:boolean,expectedVersion}`; current profile `team.manage` and one-use step-up; returns safe `{profile}`. Buyers remain private. | Contract existed in source; updated preference/consent boundary and response details in [01](frontend-handoff/01-auth-accounts-profiles.md). **RESOLVED — DOCUMENTATION CORRECTED.** |
| B04-01 | `GET/POST /api/personalisation/searches`, `GET/PATCH/DELETE /api/personalisation/searches/:id`. | Bearer, Registered and current-profile permission; owner scoped. Create/update accept supported legacy filters or canonical-v1; returned normalized `filters` are round-trip source. DTO includes `configurationRevision`; optional PATCH `expectedConfigurationRevision` rejects stale changes. | Added revision persistence/conditional update behavior and DTO test; the canonical request contract is in [04](frontend-handoff/04-search-maps-discovery.md). **RESOLVED — IMPLEMENTED AND TESTED.** |
| B04-02 | `GET /api/locations/suggestions`; mounted in `src/routes/locationRoutes.js`. | Public query is `level=state|lga|area|estate`, `q` 2–80 chars, optional prior-level `parentId`, `limit` 1–20 (default 10). Response is `{suggestions:[{id,level,name,parentId,breadcrumbs,publishedStockCount}],revision}`; this endpoint does not return coordinates. Missing active gazetteer is 503. See [04](frontend-handoff/04-search-maps-discovery.md). | Added exact request/result, hierarchy, stock filter and unavailable behavior; no client-generated location IDs/coordinates. **RESOLVED — DOCUMENTATION CORRECTED.** |
| B05-01 | `PATCH /api/projects/:projectId/property-imports/:importId/mapping`; row correction/confirm routes. | Current project editor/profile authorization; mapping accepts the bounded `mappings` list of `{columnNumber,field}` and rejects unsupported envelope/row keys. Explicit update/new-type decisions are versioned and step-up protected. | Added strict mapping body validation plus focused test, and documented preview/decision routes in [05](frontend-handoff/05-imports-grids-bulk-operations.md). **RESOLVED — IMPLEMENTED AND TESTED.** |
| B05-02 | Import `POST .../:importId/confirm`, `POST .../retry-failed`, `PATCH .../cancel`; mounted in `src/routes/projectRoutes.js`. | Project-scoped authorization is rechecked; submit/retry are step-up protected; async job and staged-row states are server-authored. Current contract and partial/cancel behavior are detailed in [05](frontend-handoff/05-imports-grids-bulk-operations.md). | The existing job system was not rewritten. Added/clarified the 202/terminal and partial-row result handling, cancellation race and recovery contract. **RESOLVED — DOCUMENTATION CORRECTED.** |
| B06-02 | `POST /api/profiles/current/verification-cases`; staff `POST /api/admin/verification-cases/:id/decision` and company-case counterpart. | Holder submits current draft/evidence snapshot; staff requires claimed case, current Trust & Safety context, step-up, independent review and current expected version. Source value is constrained by active approved `company_verification.manualSources`; supported validator atoms are `original_document|official_registry|approved_provider`, subject to policy narrowing. | Documented exact case DTO, `requiredChecks`, source/evidence binding, expiry/applicability and rejection reasons in [09](frontend-handoff/09-admin-console-and-policies.md). Current approved policy remains required to act. **RESOLVED — DOCUMENTATION CORRECTED.** |
| B06-03 | `GET/POST /api/properties/:id/listing-verification`, evidence list/upload routes; staff queue/decision under `/api/admin/listing-verifications`. | Current owner/profile eligibility; evidence upload authorizes before bounded multipart parsing and consumes file-bound step-up. Submission accepts `{expectedPropertyVersion,evidenceDocumentIds}` and validates current clean evidence, listing state and active approved policy. | Added owner evidence purpose/metadata, upload, submission and response DTO in [06](frontend-handoff/06-documents-media-verification.md). **RESOLVED — DOCUMENTATION CORRECTED.** |
| B07-04 | `PATCH /api/admin/payments/:id/cancel`; mounted in `src/routes/adminRoutes.js`. | Current Finance department, active staff context, step-up; body `{reason?:string}`; success `{message,payment,alreadyCanceled}`; no refund is implied. | Exact request, response, authorization and state effects added to [07](frontend-handoff/07-payments-ownership-escrow.md). **RESOLVED — DOCUMENTATION CORRECTED.** |
| B07-05 | `GET /api/ownerships/my` and resource owner detail are mounted; no evidenced ownership transfer/history or seller-sales aggregate route with the requested semantics. | Existing ownership read is current profile/participant scoped. No source-backed request DTO, transfer transition, complete history or global aggregate response exists to document. | Do not invent a transfer endpoint or derive platform totals from paginated records. Need an authoritative API/state specification identifying allowed transfer actors, evidence, state/version transitions and aggregate scope. **BLOCKED — MISSING IMPLEMENTATION SPECIFICATION.** |
| B07-06 | `POST /api/admin/cart-checkouts/:checkoutId/retry-allocations`; mounted. | Current Admin + Finance, active staff/profile and step-up; empty JSON body; service retries only eligible paid checkout allocation rows and rechecks current authority. It returns serialized checkout/row states and is idempotent against persisted allocation identity. | Added exact body, response and retry behavior to [07](frontend-handoff/07-payments-ownership-escrow.md). **RESOLVED — DOCUMENTATION CORRECTED.** |
| B08-01 | Applicant `/api/profiles/current/data-protection-requests` and `/withdraw`; staff `/api/admin/data-protection-requests/:id/decision`; mounted in profile/admin routes. | Current requester/profile; create/withdraw are step-up protected and version/idempotency checked. Staff uses Compliance/Data Protection with separation of duties, claim and expected version. Correction field-specific schemas are source-validated. | Documented withdrawal DTO and supported specialized correction value shapes in [08](frontend-handoff/08-privacy-notifications-realtime.md). **RESOLVED — DOCUMENTATION CORRECTED.** |
| B08-02 | `GET /api/profiles/current/data-protection-requests/:id/execution` and admin execution equivalent; mounted. | Requester or authorized independent staff; response uses grouped, record-free outcomes with counts and reason/action codes, not private third-party record IDs. Export status/download is profile-bound and private. | Documented actual grouped result rather than inventing one result row per underlying record in [08](frontend-handoff/08-privacy-notifications-realtime.md). **RESOLVED — DOCUMENTATION CORRECTED.** |
| B09-VER-01 | `POST /api/admin/company-verification-cases/:id/decision`; mounted in admin routes. | Current staff/Trust & Safety/Company Verification authority, claimed case, step-up, version and separation-of-duties. Decision body and response share the verified-case source/evidence contract. | Added `manualSources`, required-check, evidence, reason and version requirements in [09](frontend-handoff/09-admin-console-and-policies.md). Unconfigured/expired policy remains unavailable. **RESOLVED — DOCUMENTATION CORRECTED.** |
| B09-02 | `PATCH /api/users/:id` and staff access state routes; mounted legacy/profile routes. | Self/admin scopes differ; current staff department/resource permission and step-up apply to staff state changes; `expectedAuthVersion` fences the target identity and sensitive actions require executive authority as documented. | Added accepted fields, status enum and version semantics in [01](frontend-handoff/01-auth-accounts-profiles.md). **RESOLVED — DOCUMENTATION CORRECTED.** |
| B09-03 | `GET/POST /api/admin/staff-access-changes`, `POST /api/admin/staff-access-changes/:id/decision`; mounted. | Current Executive staff context; both mutations require step-up. Prepare body `{targetIdentityId,departments}`; decision body `{decision:"approved"|"rejected",expectedVersion}`. Safe DTO is `{id,targetIdentityId,departments,state,preparedBy,reviewedBy?,reviewedAt?,version}`. Independent reviewer and target auth-version checks apply; approval revokes target sessions. | Added the actual route DTO, enum list, current authority, separation and revocation behavior in [09](frontend-handoff/09-admin-console-and-policies.md). A generic capability snapshot remains a separate frontend-owned convenience. **RESOLVED — DOCUMENTATION CORRECTED.** |
| B09-04 | Admin duplicate-property, distress-sale and listing-verification queues/decision routes; mounted in `src/routes/adminRoutes.js`. | Staff role is not enough; current required department, assigned case/state, expected version, step-up and independent review are checked. Evidence reads use protected service paths. | Added exact queue/decision DTOs and state restrictions in [09](frontend-handoff/09-admin-console-and-policies.md). **RESOLVED — DOCUMENTATION CORRECTED.** |
| B09-05 | Trust appeal queue/decision and user trust recompute routes; mounted under `/api/trust/v1/admin`. | Current Trust & Safety authority, step-up for mutations, review state and audit; recompute accepts no client score/body and returns server trust DTO. | Documented supported appeal/recompute requests and response semantics in [09](frontend-handoff/09-admin-console-and-policies.md). **RESOLVED — DOCUMENTATION CORRECTED.** |
| B09-06 | Admin policy revision and gazetteer revision read/create/decision routes; mounted. | Current admin staff/departments; mutations require step-up, revision/version fencing and independent approval. External gazetteer data is not fabricated. | Added revision DTO and decision contract to [09](frontend-handoff/09-admin-console-and-policies.md); actual activation still depends on approved data/policy. **RESOLVED — DOCUMENTATION CORRECTED.** |

### P2 — supporting workflows

| ID | Route / mounted | Validation, response, auth and step-up verified | Audit finding, exact action and final status |
|---|---|---|---|
| B01-06 | `POST /api/auth/verify-email`, resend, phone challenge/history/detail/verify/cancel routes; mounted. | Email body `{token}`; phone sends use persisted destination and idempotency key; verify body `{code}`; rate/expiry behavior and safe event DTO are documented. | Exact alternate method and history-row contracts added to [01](frontend-handoff/01-auth-accounts-profiles.md). **RESOLVED — DOCUMENTATION CORRECTED.** |
| B01-07 | `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:id`, `/others`; mounted. | Bearer, own active sessions only; session DTO is `{id,createdAt,expiresAt,current}`, revoke returns count, not-found code documented. | Added exact row and revocation behavior in [01](frontend-handoff/01-auth-accounts-profiles.md). **RESOLVED — DOCUMENTATION CORRECTED.** |
| B01-08 | `POST /api/profiles`; mounted under authenticated/Registered profile router. | Body `{kind,structure,name,operationKey}`; server allowlist forbids `staff` and restricts developer structure; no arbitrary permissions accepted. Returns `{profile}` safe DTO. | Documented current allowed creation variants, idempotency and next eligibility boundary in [01](frontend-handoff/01-auth-accounts-profiles.md). **RESOLVED — DOCUMENTATION CORRECTED.** |
| B04-03 | `GET /api/projects/map?queryVersion=canonical-v1`; mounted. | Public canonical query; returns `{mode:"projects",bounds,total,projects,facets,diagnostics,normalization}`. Project marker has coordinates or null and matching-only counts/price fields; no cluster-expansion token exists. | Clarified actual project markers vs property-map clusters and currency-state semantics in [04](frontend-handoff/04-search-maps-discovery.md). **RESOLVED — DOCUMENTATION CORRECTED.** |
| B02-01 | `PATCH/DELETE /api/properties/:id/project`; mounted. | Current owner/editor profile, listing edit, owner-signatory, exact expected version and step-up; PATCH uses `projectId`/optional `projectUnit`, DELETE detaches. Returns safe property/version; stale and duplicate unit conflicts documented. | Added exact association mutation contract in [02](frontend-handoff/02-properties-projects-units.md). **RESOLVED — DOCUMENTATION CORRECTED.** |
| B03-02 | Canonical dictionary includes `mediaAccessLevel`; media upload/association routes exist, but no source-backed per-item entitlement mutation contract is established. | Current private document grants are document/version scoped. The media dictionary enum alone does not define how an associated media asset gets a grant, price, recipient or public-release transition. | Creating a generic route or inferring Paid/On request/Private semantics risks leakage. Need product/spec clarification for item binding and entitlement semantics. Until then use existing public-safe media and protected-document routes only. **BLOCKED — MISSING IMPLEMENTATION SPECIFICATION.** |
| B05-03 | `GET /api/projects/:projectId/unit-grid/jobs/:jobId`; mounted. | Current project read authority; each row reports server `undoAvailable`; undo endpoint rechecks actor, version and sale history. Configured time windows derive from operation timestamp. | Added `undoExpiresAt` when derivable; absent timestamp/window yields no fabricated expiry. Added focused DTO test and documented server-authoritative behavior in [05](frontend-handoff/05-imports-grids-bulk-operations.md). **RESOLVED — IMPLEMENTED AND TESTED.** |
| B03-03 | Canonical dictionary/search milestone fields; mounted shared contracts. | Runtime only accepts the source-named list; no extra milestone value is fabricated. | Source states 16 while enumerating 15. No safe backend choice for the missing value/count. **BLOCKED — PRODUCT DECISION.** |
| B09-10 | No dedicated capability-projection endpoint is mounted; current account/profile and resource-scoped staff routes are mounted. | Server rechecks department/resource authority on the operation. Role labels alone are not grants. | A UI capability snapshot is an optional frontend affordance, not a backend authorization defect. Do not invent permissions; render conservative UI and handle 403. **FRONTEND-OWNED.** |
| B09-11 | `GET /api/admin/stats`; mounted. | Existing aggregate response contains only metrics actually computed by its controller/service; pagination slices are not global totals. | No source contract defines the requested complete metric set, scope or windows. Do not add speculative totals. **BLOCKED — MISSING IMPLEMENTATION SPECIFICATION.** |
| B09-08 | Admin virtual-tour settings, provider health/list/detail/history routes; mounted. | Admin auth; settings mutation is step-up protected, provider list is allowlisted; provider readiness/configuration remains server-reported. | Added current provider, settings/history DTOs and activation boundary in [09](frontend-handoff/09-admin-console-and-policies.md). **RESOLVED — DOCUMENTATION CORRECTED.** |
| B09-09 | Admin notification-delivery list/reconcile and user delivery-history routes; mounted. | Technical staff read, current Technical writer plus step-up; safe payload excludes recipient/provider private content; reconciliation body is evidence/version bound. | Added exact filters, response and attestation semantics in [09](frontend-handoff/09-admin-console-and-policies.md). Provider credentials/receipts remain an activation dependency. **RESOLVED — DOCUMENTATION CORRECTED.** |
| B07-08 | Legacy `GET /api/payments/export.csv` and new `POST /api/payments/export.csv`; both mounted in `paymentRoutes.js`. | POST accepts JSON `{limit?:integer 1..2000}`, current payment-read scope and one-use step-up bound to POST/path/profile/body. CSV response has export counts and no-store; GET cannot obtain a supported bound challenge. | Added the POST contract and kept GET only for compatibility; test confirms body filters are accepted through the bound POST route. **RESOLVED — IMPLEMENTED AND TESTED.** |

### Final-status arithmetic

- Code implemented and tested: B06-01, B07-03, B04-01, B05-01, B05-03, B07-08 = **6**.
- Documentation corrected: B07-01, B09-LEGAL-01, B01-01/02/03/04/05/06/07/08, B04-02, B05-02, B06-02/03, B07-04/06, B08-01/02, B09-VER-01, B09-02/03/04/05/06/08/09, B02-01, B04-03 = **28**.
- Product decision: B07-02, B03-03 = **2**.
- Missing implementation specification: B07-05, B03-02, B09-11 = **3**.
- Frontend-owned: B09-10 = **1**.
- Explicitly deferred exhaustive route documentation: B10-01 = **1**.

## C. Backend implementation changes

### Payment initialization and export

- Added `src/services/directPaymentInitializationService.js` to reserve a stable server-side attempt per payable resource and to validate the provider's returned reference, amount, currency and secure URL.
- Routed property, installment and escrow initialization through the shared durable reservation path. Legacy installment/escrow paths remain mounted and use the same pending-attempt semantics. Provider ambiguity is recorded as reconciliation-required; a second attempt is not started while outcome is unknown.
- Added the partial unique pending initialization-lock index to `src/models/Payment.js`. **Deployment prerequisite:** roll out the index and reconcile pre-existing pending rows before enabling concurrent writes in production.
- Added `POST /api/payments/export.csv`; the old GET route remains registered but cannot satisfy supported method-bound step-up. Export reads step-up-bound JSON filters and applies private projections.

### Private file binding and tour safety

- Title-file routes authorize before bounded Multer buffering where possible, then consume a one-use challenge bound to actual file bytes and metadata. The legacy property ID in the multipart body is cross-checked against `X-Property-ID`; absent header returns a migration/deprecation response before buffering.
- `virtual_paid` now fails closed before booking/payment persistence in the viewing, cart and direct-payment paths. The hard-coded tour price path was removed. Unsupported `paymentOption` and `addToCart` request keys no longer appear as accepted fields.

### Saved searches, imports and undo metadata

- Saved-search DTOs expose `configurationRevision`; PATCH supports an optional `expectedConfigurationRevision`, reports `409 CONFLICT_SAVED_SEARCH_VERSION` for stale edits and increments the revision on criteria/alert changes.
- Column-mapping input is constrained to the supported mapping envelope and rejects unknown keys before import-service access.
- Grid job row DTOs include `undoExpiresAt` only when both configured window and persisted source operation time permit a truthful timestamp; server `undoAvailable` stays authoritative.

## D. Contract changes and frontend reconciliation

1. **Title evidence:** use `POST /api/documents/properties/:propertyId/title-upload` for new work. Legacy body-property upload requires matching `X-Property-ID`. Complete route-specific preflight and step-up challenge for each multipart request; any changed bytes or metadata need a new challenge.
2. **Payment initialization:** send exactly one server resource identifier. Do not submit a client price/currency for property or escrow checkout. Reconcile a pending/unknown reference before trying again. A redirected browser is not proof of payment or ownership.
3. **Payment export:** switch clients to `POST /api/payments/export.csv` with JSON body and `X-Step-Up-Challenge`; do not attempt GET challenge workarounds.
4. **Saved searches:** persist and return the server's canonical query object; preserve `configurationRevision` and send it as `expectedConfigurationRevision` on edits. On 409, reload and merge rather than overwrite.
5. **Grid undo:** show Undo only from fresh server `undoAvailable`; use server `undoExpiresAt` when supplied. Do not compute eligibility solely from a client clock.
6. **Import mapping:** send only `{mappings:[{columnNumber,field}]}` in the exact validated shape; retain the authoritative import/job response after timeout and do not create a new import to guess whether submission succeeded.
7. **Paid tours:** do not present `virtual_paid` purchase UI or retry it as a free request. Render the safe unavailable state until a source-approved pricing/calendar/session/settlement contract exists.
8. **Unspecified capabilities:** do not add media-entitlement editing, ownership transfers/history or unapproved dashboard metrics from route assumptions. The three missing-spec issues and milestone decision remain blocked.

No frontend source was modified. The backend chapters updated for integration are listed in section G.

## E. Tests and verification

Executed after the final code change:

```text
node --require ./test/support/isolation.cjs --test test/firstBatchContractRemediation.test.js test/firstBatchSecurityRun1.test.js
```

Result: **51 passed, 0 failed, 0 skipped** (Node test runner; isolated test support enabled). This targeted set covers title upload preflight/file-byte binding, step-up replay/profile/session binding, protected payment initialization ambiguity and resource locks, saved-search revision, mapping validation, undo expiry and the existing first-batch security regressions. It does not make a live Paystack, Monnify, storage, notification or provider call.

`git diff --check` was run after edits and passed. No full regression suite, build, benchmark, production migration, database rollout, live payment, deployment or external-provider acceptance was performed.

## F. Configuration, provider and policy limitations

These do not hide internal implementation gaps in the six coded remediations, but still gate live use:

| Dependency | Affected behavior | While unavailable |
|---|---|---|
| Paystack credentials/webhook verification | Property/installment/escrow and seat checkout | Returns provider-unavailable or remains pending for reconciliation; never activate payment/ownership/entitlement from a browser callback. |
| Approved seat plan and payout split Console policies; Monnify credentials | Seat purchase and payout setup | Plan list is unconfigured; payout setup rejects before persisting account data; no entitlement/readiness is fabricated. |
| Approved `company_verification.manualSources` and verification policy revisions | Company evidence approval | Staff UI may display current policy; approval remains unavailable when policy is absent/expired. |
| Private storage, scanning and protected rendering | Title/verification documents | Quarantined/private bytes remain unavailable; no public storage URL fallback. |
| Notification provider credentials/receipts and approved cadence | External/email/SMS/push delivery | Durable in-app/job state remains authoritative; queued does not mean delivered. |
| FX, gazetteer, location/routing and nearby-radius policies | Search/map/location/commute comparisons | Preserve original values and criteria; show safe unavailable/not-resolved response. |

No dummy provider credentials or business values were added. No setting was changed to activate an external service.

## G. Files changed

### Backend source and tests

- `src/controllers/escrowController.js`
- `src/controllers/installmentController.js`
- `src/controllers/paymentController.js`
- `src/controllers/propertyImportController.js`
- `src/controllers/tourController.js`
- `src/middleware/uploadMiddleware.js`
- `src/models/Payment.js`
- `src/routes/documentRoutes.js`
- `src/routes/paymentRoutes.js`
- `src/routes/propertyRoutes.js`
- `src/routes/titleVerificationRoutes.js`
- `src/services/cartItemService.js`
- `src/services/directPaymentInitializationService.js` (new)
- `src/services/personalisationService.js`
- `src/services/profileTourService.js`
- `src/services/projectUnitGridJobService.js`
- `src/services/propertyImportService.js`
- `test/firstBatchContractRemediation.test.js`
- `test/firstBatchSecurityRun1.test.js`

### Backend-owned handoff/docs

- `API_DOCS.md`
- `docs/frontend-handoff/01-auth-accounts-profiles.md`
- `docs/frontend-handoff/02-properties-projects-units.md`
- `docs/frontend-handoff/04-search-maps-discovery.md`
- `docs/frontend-handoff/05-imports-grids-bulk-operations.md`
- `docs/frontend-handoff/06-documents-media-verification.md`
- `docs/frontend-handoff/07-payments-ownership-escrow.md`
- `docs/frontend-handoff/08-privacy-notifications-realtime.md`
- `docs/frontend-handoff/09-admin-console-and-policies.md`
- `docs/frontend-handoff/10-api-errors-and-state-machines.md`
- `docs/frontend-handoff/13-backend-acceptance-and-contract-review.md`
- `docs/frontend-handoff/14-mounted-endpoint-index.md`
- `docs/frontend-handoff/15-api-dto-and-schema-reference.md`
- `docs/frontend-handoff/16-api-response-variation-matrix.md`
- `docs/frontend-handoff/17-end-to-end-frontend-workflows.md`
- `docs/frontend-handoff/19-frontend-blocking-contracts.md`
- `docs/frontend-handoff/README.md`
- `docs/BACKEND_CONTRACT_REMEDIATION_PASS01_10_RESULTS.md`

## H. Remaining blockers and final verdict

### Remaining backend-owned implementation

No additional implementation was added for features whose source contract is missing. The four remaining non-documentation outcomes are:

- **B07-02 — product decision:** paid/live tours need approved pricing, scheduling/calendar, session-provider and settlement rules. The unsafe fixed-price implementation is disabled.
- **B03-03 — product/source decision:** the specification says 16 construction milestones but names 15; no sixteenth value was invented.
- **B07-05 — missing implementation specification:** define whether ownership transfer/history and developer aggregate APIs are first-batch operations, their actors, evidence, states and aggregate scope before adding routes.
- **B03-02 — missing implementation specification:** define per-media-item entitlement target, mutation, recipient/version binding and public release semantics before implementation.
- **B09-11 — missing implementation specification:** define exact global dashboard metrics, filters/windows and total semantics before adding aggregates.

B10-01 remains an explicitly bounded documentation deferral: the general handoff now explains that 411 first-batch registrations are not all fully described endpoint-by-endpoint. It is not marked implemented, and must be addressed if exhaustive route-template coverage is a release acceptance criterion.

### Final verdict

**PARTIAL.** Six safe backend changes are implemented and focused-tested; 27 existing contracts were made more specific in backend documentation. The unsafe fixed-price tour path is closed, but its source-defined replacement cannot be guessed. Three capabilities require missing authoritative implementation specifications, two are frontend-owned concerns, and exhaustive per-route documentation remains deferred. The backend work here does not authorize live provider activation or production index rollout.

