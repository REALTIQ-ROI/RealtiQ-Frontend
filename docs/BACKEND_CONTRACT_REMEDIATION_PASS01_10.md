# Backend contract remediation inventory — Passes 01–10

**Scope:** frontend implementation blockers that remain because an API request/response, policy, authorization, version, or state-transition contract is missing or contradictory. Statuses are based on the latest pass sections in `FIRST_BATCH_FRONTEND_INTEGRATION_TRACKER.md` plus the current handoff; earlier pass rows are historical. A mounted path alone is not a usable contract. The backend repository and live API are unavailable, so this is a source/documentation reconciliation, not runtime acceptance.

## Source/documentation conflicts to resolve

- **Construction milestones:** the source decision in Chapter 12 reports that RQS-02/RQS-03 describe 16 milestones while the named source list contains 15. The dictionary/API source list is authoritative for current accepted values; the frontend does not invent a sixteenth option. This is an unresolved source-document decision (P2), not a frontend validation rule.
- **Historical contract rows:** Chapter 20 corrects earlier Pass 01–03 assumptions about multipart evidence middleware order, runtime dictionary metadata, unit-type routes, and publication-readiness error output. The current chapters 01–03 and 20 take precedence; historical tracker rows remain for audit history.
- **Route-index completeness:** Chapter 14 is a mounted route inventory, not an operation contract. Chapter 13 reports only partial first-batch route templates and selective error/state coverage; this is tracked as B10-01 rather than interpreting unreferenced paths as frontend requirements.

## Chapter 10 state-machine and recovery inventory

These are contract-backed client rules. Route-specific permissions, versions, DTO details, and states are read from the corresponding feature guides and returned DTOs. This table does not add transitions beyond those contracts.

| Entity/workflow | States and allowed transitions established by the handoff | Forbidden client assumptions | Role, step-up and version | Endpoint/body and success handling | Conflict/recovery |
|---|---|---|---|---|---|
| Session/authentication | Active session may become expired or revoked. A login response may require a second factor. | Do not infer that a missing response means authentication failed before the server processed it; do not retry protected writes after a timeout. Do not treat 403 as logout. | Current authenticated actor/session and selected profile. No generic token-refresh route is assumed. | Bootstrap and protected routes use the documented auth/profile endpoints. A 401 triggers protected-state cleanup and reauthentication. | Re-resolve only through documented auth flows; clear private caches and realtime state on 401/session revocation. |
| Profile verification | Returned case states include `submitted`, claimed/review states, `accepted`, `rejected`, `superseded`, and `expired` as returned. Evidence upload/scan is a separate state machine. | Upload or case submission is not approval. Do not infer approval, required checks, or declared-person paths. | Holder uses current selected profile. Staff actions require Trust & Safety authority and separation of duties. Case/evidence versions are used where returned; sensitive actions use bound step-up where documented. | Holder case creation is `POST /api/profiles/current/verification-cases`; staff case operations are under `/api/admin/verification-cases`. Claim/rejection use their endpoint DTOs; approval requires current policy and per-check schema. | On 409 reload case, evidence and policy; preserve form state and require a new review. Unknown or incomplete DTO means keep that action disabled. |
| Listing/project/unit | Draft/incomplete → server readiness evaluation → pending review/published, with only resource-specific paused/archived/sold states returned by the backend. Project publication accepts `save_draft`, `publish_all_ready`, or `publish_selected`. Unit availability/build state has dedicated workflows. | Never flip publication or verification locally; never create Sold through generic availability; readiness blockers are not publication success. | Owner/editor or staff permissions per route; publication uses current project version and JSON-bound step-up. Other expected versions follow each mutation contract. | Project publication: `PATCH /api/projects/:id` with `expectedVersion`, `publicationAction`, and `selectedUnitIds` only for selected publication. Use returned project/publication result. | On 409 reload current resource/readiness and preserve selection/input for user review. No blind retry or fabricated blocker rows. |
| Import | Staged/correctable → queued → processing → completed/partial/failed/cancelled. A 202 means accepted/queued. | Do not treat queued as complete, cancellation as rollback, or an ambiguous confirmation as rejected. Do not retry successful rows or failed rows without the documented reviewed process. | Authorized developer/profile; confirmation/retry uses bound step-up where required. Versions/operation keys follow the exact route contract when supplied. | Project import schema/template/upload/row/detail routes are documented. Confirm and eligible-failure retry return asynchronous state and must be refreshed/polled. Some row-decision/mapping DTOs remain missing. | Preserve staged file/rows; after ambiguous mutation inspect import history/detail first. Show committed rows and partial outcomes; create a new reviewed action only when supported. |
| Durable grid job | `queued` → `processing` ↔ retry/deferred → completed/partial/failed/cancelled. Undo is a separate, version-checked operation and may be time-bounded. | Do not treat 202 as all-row success; cancellation is not undo; generic undo does not apply to irreversible publication/Sold changes. | Project/unit versions and operation key are required by documented job schema; step-up for protected undo. Server policy enforces row limits. | Create/poll/cancel use project unit-grid job routes. Consume durable job and row results, not an optimistic local completion. | Poll with bounded backoff and stop at terminal state. On conflicts refresh failed rows and require review/new operation key. Undo only when server supplies eligibility/operation identity and current versions. |
| Saved search/alerts | Search preferences may move through scheduled/matching/queued/sent/failed/retry/suppressed states as returned. | Do not infer alert delivery from a saved-search record or notification preference; do not create duplicates after uncertain POST. | Authenticated owner/profile. Cadence/provider gates are server policy. | Saved search CRUD under `/api/personalisation/searches`; notification preference routes are separate. Canonical create/update DTO is not complete in the handoff. | Preserve URL criteria. Reopen/edit only when returned canonical query representation is defined; do not locally synthesize missing filters. |
| Document/evidence | Staged/uploaded → scanning/quarantined → accepted/rejected/review → current/replaced/revoked, as returned by the document/evidence contract. | Never fall back to public storage URLs for private content; upload is not verification; do not assume replacement retains an old access grant. | Current profile/authorized staff scope. Profile-evidence upload binds actual bytes and multipart metadata to a one-use TOTP challenge. Other upload routes need their own exact protocol. | Profile evidence upload/list/content/retry/removal use Chapter 19/20 routes and response state. Private viewing uses the protected content endpoint. | Use returned version/scan state, refresh on conflict, revoke temporary object URLs. If exact file-byte challenge is absent for a route, keep submission disabled. |
| Data-rights request/execution | `submitted` → review → queued → processing → completed/partially_blocked/failed, or waiting_for_policy/rejected/withdrawn. Outcomes are grouped by the current execution DTO. | Request acceptance is not deletion completion. Do not fabricate per-record IDs or claim records were erased when preserved/blocked/held. | Applicant request writes use bound step-up where documented; staff decisions require current authority and independence. | Applicant request/history/execution/export routes and staff execution reads are documented. Some withdrawal/consent/staff decision bodies remain unspecified. | Poll only supported execution IDs, boundedly; show grouped outcome/reason and legal holds. Retry/deletion proceeds only through server-authorized state. |
| Payment/checkout/escrow/ownership | Checkout may be pending, `outcome_unknown`, paid/allocation-processing, completed/partially-failed/failed; payment may be verified/settled or failed/reversed/review. Escrow release/dispute and ownership allocation are distinct server state machines. | Provider redirect is not payment proof. Do not retry ambiguous initialization or infer ownership, allocation, payout, refund, escrow release, or title from local UI state. | Buyer profile for checkout; finance/department/separation controls and TOTP for documented protected staff finance actions. Expected versions where supplied. | `POST /api/cart/checkout/initialize` is bound to `{}`; verification/read routes determine status. Admin escrow decision/recovery use documented DTOs and may return 202. | Preserve checkout/reference; inspect status and verify through documented reads. 202 remains pending. No blind POST on timeout/502/unknown. |
| In-app notification/messaging | Notification read/archive and conversation/message states follow returned DTOs; realtime events are hints and REST remains authoritative. | Do not infer external delivery, message acknowledgement, read receipt, or another profile’s access from a socket event alone. | Active profile/session bound to API and realtime connection. | Documented notification and messaging routes plus documented Socket.IO event contracts. | Reauthenticate/re-subscribe after profile/session changes, ignore stale epochs, reconcile REST history after reconnect. |

## Open backend-dependent blockers

Each item is deduplicated across passes while retaining all affected chapters. “Mounted” refers to the current mounted endpoint index and handoff references, not a live route probe. Frontend work that is possible without the missing contract remains active and is listed separately under follow-up.

### P0 — security or financial correctness

#### B10-01 — Route-specific error/state/retry coverage is not exhaustive

- **Original chapters / journey / roles:** Passes 01–10; all authenticated, public and staff journeys.
- **Existing endpoint(s) / mounted:** Chapter 14 lists 594 registrations; 411 are first-batch end-user/staff registrations. Yes, listed/mounted.
- **Missing contract:** Chapter 13 reports exact method/path references for 189/411 first-batch routes outside the route index, 222 paths lacking feature-document coverage, and only 45 selective response-matrix rows. Chapter 10 does not provide exhaustive per-route status/code, retryability, transition, and success-variation tables.
- **Issue type:** Documentation gap, not proof that each route is defective.
- **Impact:** Frontend cannot safely infer request replay, field errors, state transitions, authorization, or recovery for an undocumented mutation; financial and privacy errors are highest risk.
- **Backend remediation:** Add one contract template per in-scope route covering auth/profile/role, request, response, empty/alternate states, errors, concurrency, idempotency/replay, retry and recovery; explicitly classify out-of-scope/operational routes.
- **Frontend follow-up:** Continue only routes with sufficient contracts; keep unsafe controls unavailable; reconcile this matrix whenever route-level docs land.
- **Acceptance criteria:** Every required Pass 01–10 operation links to an exact contract and state/recovery behavior; no endpoint is enabled based solely on its mounted path.
- **Priority / status:** P0 / OPEN documentation gap.

#### B07-01 — Participant escrow mutation and step-up requirements are not route-specific

- **Original chapters / journey / roles:** Pass 07 (also Pass 09 for staff finance); buyer, seller/developer, inspector/participant.
- **Existing endpoint(s) / mounted:** Chapter 14 escrow, refund-conversation, installment and payout routes; yes, route families are mounted.
- **Missing contract:** The handoff says step-up applies “where mounted” but does not map which participant mutations require it or provide complete route-level body/response variants and all state transitions.
- **Issue type:** Documentation gap for mounted operations.
- **Impact:** Incorrect replay/authentication handling could duplicate or misstate financial changes.
- **Backend remediation:** Publish per-route DTOs, step-up requirement/binding, versions, role and state preconditions, provider-pending/partial branches, and idempotency behavior.
- **Frontend follow-up:** Keep existing documented reads; enable each mutation only after its route contract is complete; refresh server escrow/payment state after response.
- **Acceptance criteria:** Each participant mutation can be bound and tested against exact method/path/body/profile and reports pending/final state without optimistic settlement.
- **Priority / status:** P0 / OPEN contract documentation.

#### B07-02 — Paid/live tour purchase is internally incompatible with the source flow

- **Original chapters / journey / roles:** Pass 07; buyer and seller-run live-tour participants.
- **Existing endpoint(s) / mounted:** `POST /api/tour` paid branch is mounted; cancellation is not mounted and is not applicable to first batch.
- **Missing contract:** Current route hard-codes ₦5,000 and initializes Paystack; source flow requires launch-free seller-run live video and later policy-controlled seller/partner terms, quote, calendar and session contracts. No source-compatible pricing/session contract exists. No cancel transition is supported.
- **Issue type:** Backend implementation/product capability mismatch, not a frontend DTO-only gap.
- **Impact:** Enabling it could mischarge users and create an unsupported paid/live state.
- **Backend remediation:** Replace/retire fixed-price flow with the source-approved quote, scheduling, provider/session and payment state machine, or explicitly keep paid tours out of scope. Do not add unsupported cancellation without an approved product/state contract.
- **Frontend follow-up:** Keep paid/live CTA disabled; continue ordinary free viewing requests/status only; do not offer cancellation.
- **Acceptance criteria:** A source-compliant quote/session/payment contract and tested response/state transitions exist before any paid/live purchase UI is enabled.
- **Priority / status:** P0 / OPEN capability mismatch; cancellation NOT APPLICABLE.

#### B06-01 — Title-file multipart routes lack exact file-byte step-up binding

- **Original chapters / journey / roles:** Pass 06; property/project owner and title-verification staff.
- **Existing endpoint(s) / mounted:** `POST /api/documents/properties/:propertyId/title-upload`, `POST /api/documents/title-asset-upload`, `POST /api/properties/:propertyId/title-documents`, `POST /api/documents/projects/:projectId/registered-survey`; routes are listed/mounted.
- **Missing contract:** Chapter 19/20 specify byte-bound multipart step-up only for profile evidence. Title upload middleware order, digest field, bound metadata, protected challenge path and upload response binding are not defined for these routes.
- **Issue type:** Security contract gap.
- **Impact:** A JSON-only challenge cannot safely bind uploaded private/legal evidence bytes.
- **Backend remediation:** Define and enforce preflight → bounded parser → exact byte digest verification → step-up consumption → upload service for each title route, with file and metadata constraints.
- **Frontend follow-up:** Keep the title-file submission disabled with current user progress retained; do not reuse the profile-evidence protocol without explicit route coverage.
- **Acceptance criteria:** Backend contract names exact multipart parts, digest algorithm/field, request binding, limits, session/profile rules, errors and returned state; focused frontend test proves byte/metadata changes invalidate proof.
- **Priority / status:** P0 / OPEN security contract.

#### B07-03 — Direct property payment initialization request is unspecified

- **Original chapters / journey / roles:** Pass 07; buyer purchase of an outright property.
- **Existing endpoint(s) / mounted:** `POST /api/payments/initialize` is listed/mounted; supported cart checkout is separate.
- **Missing contract:** Exact request DTO, eligible resource identity, pricing source, idempotency/reservation behavior, response and recovery state are not documented.
- **Issue type:** Documentation gap for a mounted financial operation.
- **Impact:** A guessed body could charge the wrong amount/resource or create duplicate attempts.
- **Backend remediation:** Specify eligibility, authoritative amount/currency, exact DTO, step-up/idempotency, provider outcomes, status lookup and ownership/allocation relationship.
- **Frontend follow-up:** Keep direct property payment withheld; use only documented cart checkout; never infer ownership from a redirect.
- **Acceptance criteria:** Contract supports a single safe attempt and reconciliation of ambiguous provider outcome before retry.
- **Priority / status:** P0 / OPEN.

#### B09-LEGAL-01 — Legal-hold target and release contracts are incomplete

- **Original chapters / journey / roles:** Pass 09; Compliance/Legal staff, data subjects affected by retention.
- **Existing endpoint(s) / mounted:** `GET /api/admin/legal-holds[/:id]`, `POST /api/admin/legal-holds`, `POST /api/admin/legal-holds/:id/release`; listed/mounted.
- **Missing contract:** Target-reference schema, list/detail projections, version fields, create/release bodies and independent authorization response are not specified.
- **Issue type:** Documentation gap for sensitive admin capability.
- **Impact:** Incorrect hold scope or release may violate retention and legal safeguards.
- **Backend remediation:** Define target scope, allowed reasons, version/idempotency, step-up and independent-review rules, response/history and errors.
- **Frontend follow-up:** Keep create/release controls unavailable; continue displaying returned applicant execution hold counts only.
- **Acceptance criteria:** Independent reviewer, scope, version and retained-record effects are explicit and enforceable.
- **Priority / status:** P0 / OPEN.

### P1 — core workflow completion

#### B01-01 — Login second-factor completion body is missing

- **Original chapters / journey / roles:** Pass 01; account holder login.
- **Existing endpoint(s) / mounted:** `POST /api/auth/login/second-factor`; listed/mounted.
- **Missing contract:** Exact accepted factor-code request field and success/error DTO for completion.
- **Issue type:** Documentation gap.
- **Impact:** Guessing could weaken login-factor verification or leak authentication codes.
- **Backend remediation:** Document accepted factor, request schema, challenge/session binding, expiry, attempt/rate limits and response variants.
- **Frontend follow-up:** Preserve the safe “additional verification required” state; do not submit a guessed field.
- **Acceptance criteria:** Login challenge can be completed and restored only using the documented factor/session contract.
- **Priority / status:** P1 / OPEN.

#### B01-02 — Profile onboarding draft schema blocks holder case creation

- **Original chapters / journey / roles:** Pass 01 and Pass 06; individual/company/cooperative profile holder.
- **Existing endpoint(s) / mounted:** `GET/PATCH /api/profiles/current/onboarding`; `POST /api/profiles/current/verification-cases`; listed/mounted.
- **Missing contract:** Current onboarding GET/PATCH response schema, authoritative draft version (`expectedDraftVersion`), declared people entries and exact `people[].path` values required by case submission.
- **Issue type:** Documentation gap.
- **Impact:** Case cannot be safely submitted without guessing identity/person references; partial progress would strand the holder.
- **Backend remediation:** Define draft DTO, version semantics, allowed values/paths, save errors and case-submission relationship.
- **Frontend follow-up:** Keep case submission disabled, preserve entered onboarding/evidence progress, and continue case/evidence reads and withdrawal where supported.
- **Acceptance criteria:** Holder can save a draft, reload the authoritative version/people paths, submit the exact case DTO and track its returned state.
- **Priority / status:** P1 / OPEN.

#### B01-03 — Organization membership, invitation, role and mandate DTOs are incomplete

- **Original chapters / journey / roles:** Pass 01/Pass 09; organization owner/admin, invited member and staff reviewer.
- **Existing endpoint(s) / mounted:** Current-profile members, roles, invitations and mandates; invitation claim/accept; admin signatory review. Route families are listed/mounted.
- **Missing contract:** Roster/list/detail DTOs; exact grant/role/permission vocabulary and assignment shape; invitation claim/accept result and token handling; mandate actions; signatory/history/staff-review projections and versions.
- **Issue type:** Documentation gap across mounted organization operations.
- **Impact:** Could grant unauthorized organization access, mishandle opaque invite tokens, or misrepresent legal authority.
- **Backend remediation:** Publish route-specific DTOs, accepted enums, seat/grant checks, expected versions, step-up and reviewer separation rules.
- **Frontend follow-up:** Preserve basic buyer profile registration and signatory submission where exact contracts exist; do not expose roster/role/invitation/mandate or staff review controls lacking DTOs.
- **Acceptance criteria:** An organization can issue/accept/revoke an invite, inspect membership/authority and review signatory state using server-returned permissions and versions.
- **Priority / status:** P1 / OPEN.

#### B01-04 — Seat plan, purchase and organization payout setup lifecycle is incomplete

- **Original chapters / journey / roles:** Pass 01 and Pass 07; organization buyer/developer and authorized finance representative.
- **Existing endpoint(s) / mounted:** Current-profile seat plans/seats/purchases and payout setup/history routes; listed/mounted.
- **Missing contract:** Plan/seat/membership item DTOs, purchase detail/state lifecycle, payout setup request/response/provider state and exact version/step-up rules.
- **Issue type:** Documentation gap for billing/organization workflow.
- **Impact:** Frontend cannot safely infer entitlements, seats, billing success or payout readiness.
- **Backend remediation:** Define catalog, purchase/seat association, payment states, payout lifecycle, authorization and errors.
- **Frontend follow-up:** Do not enable plan purchase or payout mutations; do not infer entitlement from payment; keep unrelated profile functionality available.
- **Acceptance criteria:** A selected authorized organization can review a configured plan, purchase/allocate seats, and track payout setup from returned states only.
- **Priority / status:** P1 / OPEN.

#### B01-05 — Onboarding profile privacy mutation/consent schema is missing

- **Original chapters / journey / roles:** Pass 01 and Pass 08; profile holder.
- **Existing endpoint(s) / mounted:** `PATCH /api/profiles/current/privacy`; listed/mounted.
- **Missing contract:** Accepted preference keys, value semantics, response, consent history and step-up/version requirements.
- **Issue type:** Documentation gap.
- **Impact:** A local toggle could falsely represent persisted consent or disclosure state.
- **Backend remediation:** Publish exact privacy preference DTO and consent history/projection, update semantics and step-up requirements.
- **Frontend follow-up:** Do not persist unsourced local privacy toggles; keep notification delivery preference UI separate.
- **Acceptance criteria:** User can reload and see the exact server-persisted preferences and consent history.
- **Priority / status:** P1 / OPEN.

#### B04-01 — Canonical saved-search create/update DTO is incomplete

- **Original chapters / journey / roles:** Pass 04; authenticated buyer/profile.
- **Existing endpoint(s) / mounted:** `GET/POST /api/personalisation/searches`, `GET/PATCH/DELETE /api/personalisation/searches/:id`; listed/mounted.
- **Missing contract:** Full canonical query representation and create/update DTO for criteria, bounds, sort, defaults/timezone, channels/triggers and returned query object.
- **Issue type:** Documentation gap.
- **Impact:** Existing legacy filters would drop criteria or create alerts with broader searches.
- **Backend remediation:** Define canonical saved-search DTO, normalization/round-trip rules, duplicate semantics and alert state/cadence fields.
- **Frontend follow-up:** Continue server-backed list/delete and favorites/recent; keep save/edit/reopen unavailable rather than serializing only a subset.
- **Acceptance criteria:** Save → list → reopen round-trips repeated/zero/false/unknown-supported criteria without broadening results.
- **Priority / status:** P1 / OPEN.

#### B04-02 — Location suggestion request/response DTO is missing

- **Original chapters / journey / roles:** Pass 04; public visitor and authenticated search user.
- **Existing endpoint(s) / mounted:** `GET /api/locations/suggestions`; listed/mounted.
- **Missing contract:** Query parameter names, supported location levels, response identifiers/labels/hierarchy and empty/error behavior.
- **Issue type:** Documentation gap.
- **Impact:** Guessing IDs or persisting unresolved names could change geographic search scope.
- **Backend remediation:** Document query and suggestion DTO, approved source/revision and unavailable-state codes.
- **Frontend follow-up:** Preserve typed search criteria and current errors; do not create fake autocomplete IDs.
- **Acceptance criteria:** Selected suggestions persist canonical IDs and preserve hierarchical constraints; unconfigured provider returns an explicit unavailable state.
- **Priority / status:** P1 / OPEN.

#### B05-01 — Import mapping and explicit row-decision DTOs are missing

- **Original chapters / journey / roles:** Pass 05; authorized project developer.
- **Existing endpoint(s) / mounted:** `PATCH /api/projects/:projectId/property-imports/:importId/mapping`; row `confirm-update` and `confirm-new-type` routes; listed/mounted.
- **Missing contract:** Mapping request/response DTO; mapping validation result; row-decision bodies; current project/unit versions; result states and errors.
- **Issue type:** Documentation gap.
- **Impact:** Incorrect mapping or confirmation can create/overwrite wrong units or types.
- **Backend remediation:** Define exact mapping allowlist, versions, preview/result shapes, idempotency, duplicate handling and row outcomes.
- **Frontend follow-up:** Keep the mapping editor and explicit decision CTAs withheld; preserve schema, staged rows and safe correction functionality.
- **Acceptance criteria:** User can map/preview, review changed rows, confirm selected decisions with expected versions, and reopen authoritative results.
- **Priority / status:** P1 / OPEN.

#### B05-02 — Import submit/retry/cancel result variations need a complete contract

- **Original chapters / journey / roles:** Pass 05; authorized project developer.
- **Existing endpoint(s) / mounted:** Import `confirm`, `retry-failed`, and `cancel` routes; listed/mounted and partially integrated.
- **Missing contract:** Full asynchronous 202 job/result DTO, failed-row retryability matrix, cancellation race/partial-commit response variants and route-specific operation-key placement/error variations.
- **Issue type:** Documentation gap for otherwise partially implemented operations.
- **Impact:** Ambiguous outcomes can duplicate imports or incorrectly report committed rows as cancelled.
- **Backend remediation:** Document exact 202/terminal DTOs, row result identities, retry eligibility, idempotency/replay and cooperative-cancel races.
- **Frontend follow-up:** Preserve explicit ambiguous-outcome recovery and server status reads; keep completion/retry claims bounded to returned state.
- **Acceptance criteria:** A client can recover after timeout by reading the original import and determine accepted/partial/terminal state without blind resubmission.
- **Priority / status:** P1 / OPEN contract detail; existing import controls remain PARTIAL.

#### B06-02 — Holder verification-case creation and staff approval policy remain incomplete

- **Original chapters / journey / roles:** Pass 01, Pass 06 and Pass 09; holder and Trust & Safety reviewer.
- **Existing endpoint(s) / mounted:** Holder `POST /api/profiles/current/verification-cases`; staff `POST /api/admin/verification-cases/:id/decision`; listed/mounted.
- **Missing contract:** Holder draft prerequisites are B01-02. For approval, current `company_verification.manualSources` policy DTO and per-check schema (including source, applicability, jurisdiction, expiry/non-expiring and evidence-version binding) are missing.
- **Issue type:** Documentation/policy contract gap.
- **Impact:** Guessing evidence checks or approving from unsupported sources could create false verification.
- **Backend remediation:** Publish the current policy DTO, exact required-check schema, approval body/version fields, source allowlist and separation rules.
- **Frontend follow-up:** Continue queue/detail/history/claim/document-unreadable rejection; keep case submission/approval disabled until exact prerequisites arrive.
- **Acceptance criteria:** Every required check is rendered and validated against current policy/evidence version; server-returned decision/history drives status.
- **Priority / status:** P1 / OPEN.

#### B06-03 — Owner listing-verification evidence and submission DTOs are incomplete

- **Original chapters / journey / roles:** Pass 02 and Pass 06; property owner submitting listing evidence for later review.
- **Existing endpoint(s) / mounted:** `GET /api/properties/:id/listing-verification`, listing-evidence read/upload, and listing-verification submit routes; listed/mounted.
- **Missing contract:** Complete evidence metadata/permissions, submission request/response, file-bound step-up, allowed evidence states and relevant error/version schemas.
- **Issue type:** Documentation gap for a sensitive verification submission.
- **Impact:** Could expose private evidence or submit an unbound/incorrect listing verification record.
- **Backend remediation:** Publish owner submission/evidence DTOs and the file-bound challenge sequence; keep the separate staff decision contract in B09-04.
- **Frontend follow-up:** Preserve existing property reads/review journeys; do not conflate title verification with listing verification or expose unsupported submission controls.
- **Acceptance criteria:** Owner can submit authorized evidence with exact file binding and read the returned case state; no invented readiness rows.
- **Priority / status:** P1 / OPEN.

#### B07-04 — Staff payment cancellation DTO is incomplete

- **Original chapters / journey / roles:** Pass 07 and Pass 09; finance staff cancelling a payment.
- **Existing endpoint(s) / mounted:** `PATCH /api/admin/payments/:id/cancel`; listed/mounted.
- **Missing contract:** Cancellation reason/body/version/result and route-specific idempotency/reconciliation behavior.
- **Issue type:** Documentation gap.
- **Impact:** Could misstate cancellation or apply it to stale/wrong financial state.
- **Backend remediation:** Define exact request/response, permission/version rules, allowed payment states and reconciliation result.
- **Frontend follow-up:** Keep cancellation disabled; retain safe payment/checkout reads and server verification. Export is tracked by B07-08 and allocation retry by B07-06.
- **Acceptance criteria:** Cancellation is explicitly versioned, authorized, idempotent/reconcilable and returns the authoritative payment state.
- **Priority / status:** P1 / OPEN.

#### B07-05 — Ownership detail/history/transfer and developer sales aggregate DTOs are incomplete

- **Original chapters / journey / roles:** Pass 07; buyer owner and authorized developer.
- **Existing endpoint(s) / mounted:** `GET /api/ownerships/my`, authorized payment listing; list paths are mounted/documented.
- **Missing contract:** Stable ownership detail/history/transfer/title projection and complete authorized developer sales/allocation aggregate; current payment list is not an authoritative aggregate.
- **Issue type:** Documentation gap/capability boundary.
- **Impact:** A client must not infer legal title, unit allocation or revenue totals from a payment page or partial list.
- **Backend remediation:** Define ownership detail/history/transfer DTOs, document links and aggregate pagination/authorization semantics.
- **Frontend follow-up:** Continue showing only server rows with `owned` status and clearly scoped payment-record counts; do not infer transfer/title/revenue.
- **Acceptance criteria:** Buyer can open authorized ownership details/documents/history, and developer totals come from an authoritative aggregate.
- **Priority / status:** P1 / OPEN.

#### B07-06 — Staff checkout allocation retry body and idempotency are unspecified

- **Original chapters / journey / roles:** Pass 07 and Pass 09; authorized staff.
- **Existing endpoint(s) / mounted:** `POST /api/admin/cart-checkouts/:checkoutId/retry-allocations`; listed/mounted.
- **Missing contract:** Bound JSON body, expected checkout/item version, idempotency behavior and response/partial outcome state.
- **Issue type:** Documentation gap.
- **Impact:** Duplicate allocation or incorrectly repaired service fulfillment.
- **Backend remediation:** Define exact protected body, step-up binding, retryable item rules, operation identity and status response.
- **Frontend follow-up:** Keep retry disabled; continue list/detail inspection and show current item failures.
- **Acceptance criteria:** The same operation can be safely reconciled after timeout, with no duplicate allocation and per-item server results.
- **Priority / status:** P1 / OPEN.

#### B08-01 — Applicant privacy withdrawal/correction and staff decision DTOs are incomplete

- **Original chapters / journey / roles:** Pass 08/Pass 09; profile holder and privacy staff.
- **Existing endpoint(s) / mounted:** Applicant withdraw and privacy mutation/request routes; staff data-protection list/detail/history/decision/notice-reconcile routes; listed/mounted.
- **Missing contract:** Withdrawal version/body, correction value schema, full profile consent/preference schema (also B01-05), staff queue/detail/action DTOs, independence/version fields and notice reconciliation body/result.
- **Issue type:** Documentation gap.
- **Impact:** Incorrectly withdrawing, modifying, deciding or notifying on a legal data-rights request could cause privacy or legal harm.
- **Backend remediation:** Publish separate DTOs and state/version/step-up contracts for correction, withdrawal, staff decisions and completion notice reconciliation.
- **Frontend follow-up:** Keep request history/execution/grouped outcomes and documented access/deletion creation; do not expose unsafe mutation controls or fabricate individual records.
- **Acceptance criteria:** Request state, grouped outcomes, staff decision and completion notice can be refreshed from authoritative responses with audit-visible versions.
- **Priority / status:** P1 / OPEN.

#### B08-02 — Privacy execution is grouped and export status fields are not defined

- **Original chapters / journey / roles:** Pass 08; profile holder tracking access/deletion execution.
- **Existing endpoint(s) / mounted:** `GET /api/profiles/current/data-protection-requests/:id/execution` and protected export download; listed/mounted.
- **Missing contract:** Execution returns grouped outcomes by record kind/category/state/reason/action and does not include individual record identifiers or dates; the conditional export object’s status DTO is not defined.
- **Issue type:** Deliberate response projection limitation plus documentation gap for export status.
- **Impact:** Frontend cannot safely claim which individual record was deleted or that an export is ready/downloadable based only on an object being present.
- **Backend remediation:** If record-level display is a product requirement, define an authorized privacy-safe per-record outcome projection. Document export readiness, expiry, downloadability and terminal states without exposing unnecessary identifiers.
- **Frontend follow-up:** Keep grouped outcomes and retention/legal-hold counts; do not fabricate individual rows or infer export status. Continue to use the protected download endpoint’s actual response.
- **Acceptance criteria:** Each displayed outcome is server-supplied at the documented granularity; an export is offered only when the server confirms its authorized state.
- **Priority / status:** P2 / OPEN data-detail capability; grouped execution UI remains usable.

#### B09-VER-01 — Staff organization/company verification decisions remain unspecified

- **Original chapters / journey / roles:** Pass 01, Pass 06 and Pass 09; Legal & Verification staff and organization holder.
- **Existing endpoint(s) / mounted:** Admin company-verification claim/decision, profile-signatory review and profile-type review routes; listed/mounted.
- **Missing contract:** Queue/detail/history projections, action/result DTOs, expected versions, source/check requirements and reviewer separation data.
- **Issue type:** Documentation gap.
- **Impact:** Staff could approve company authority or profile type without documented evidence or independent review.
- **Backend remediation:** Specify each queue/detail/decision schema and current policy/source requirements.
- **Frontend follow-up:** Continue available holder signatory submission only; no parallel admin decision UI.
- **Acceptance criteria:** Staff decisions validate all server-required evidence/policy checks and refresh independent history.
- **Priority / status:** P1 / OPEN.

#### B09-02 — Staff account status fields/version contract is incomplete

- **Original chapters / journey / roles:** Pass 01 and Pass 09; Executive/resource-authorized staff.
- **Existing endpoint(s) / mounted:** `PATCH /api/users/:id` staff account status workflow; route family is listed/mounted.
- **Missing contract:** Staff projection does not define `authVersion`/status fields needed for version-bound status mutation; exact status transition/body/history fields are incomplete.
- **Issue type:** Documentation gap.
- **Impact:** Account suspension/reactivation could be applied to stale or unintended auth state.
- **Backend remediation:** Define allowed account-state transitions, expected authorization version, required reason, response and audit fields.
- **Frontend follow-up:** Keep account status controls unavailable; preserve documented identity edits and deletion transition.
- **Acceptance criteria:** User detail exposes current version/status and action returns authoritative state/history; self/unauthorized actions are denied.
- **Priority / status:** P1 / OPEN.

#### B09-03 — Staff RBAC/access-change DTOs and permission-scope contract are absent

- **Original chapters / journey / roles:** Pass 09; authorized staff administrator and independent reviewer.
- **Existing endpoint(s) / mounted:** `GET/POST /api/admin/staff-access-changes`, `POST /api/admin/staff-access-changes/:id/decision`; listed/mounted.
- **Missing contract:** Permission vocabulary/scope DTO, request fields, queue/detail, decision body, version/audit response and separation-of-duties projection.
- **Issue type:** Documentation gap.
- **Impact:** A frontend-only role model could grant privilege beyond the actor’s scope.
- **Backend remediation:** Document grantable permission scopes, immutable review lifecycle, actor separation, versions and audit result.
- **Frontend follow-up:** Keep role/permission mutations withheld; use only backend permission data for navigation.
- **Acceptance criteria:** Every grant is scope-limited, independently approved and visible from server-returned audit history.
- **Priority / status:** P1 / OPEN.

#### B09-04 — Property moderation, duplicate and distress staff DTOs are incomplete

- **Original chapters / journey / roles:** Pass 02 and Pass 09; property reviewer, accuracy reviewer and authorized staff.
- **Existing endpoint(s) / mounted:** Admin duplicate matches/evidence/decision, distress assessments/evidence/decision, listing accuracy reports/resolve and property moderation routes; listed/mounted. Owner listing-verification evidence/submission is tracked separately in B06-03.
- **Missing contract:** Queue filters/page, evidence projection, exact decisions/reasons, versions, permitted transitions, step-up and success/error schemas.
- **Issue type:** Documentation gap.
- **Impact:** Could publish, suppress or classify listings without current evidence or review authority.
- **Backend remediation:** Define each operation’s DTO, transition table, role, version and evidence access contract.
- **Frontend follow-up:** Keep existing documented property review reads/actions only; no direct Sold or unsupported staff archive.
- **Acceptance criteria:** Staff decision is versioned, authorized and reflected from refreshed resource/history; no invented readiness rows.
- **Priority / status:** P1 / OPEN.

#### B09-05 — Trust appeal resolution/recompute DTOs are missing

- **Original chapters / journey / roles:** Pass 09; Trust & Safety staff.
- **Existing endpoint(s) / mounted:** `PATCH /api/trust/v1/admin/appeals/:id`, `POST /api/trust/v1/admin/users/:userId/recompute`; listed/mounted.
- **Missing contract:** Action/reason body, bound path/body/version, trust policy revision and returned score/history schema.
- **Issue type:** Documentation gap.
- **Impact:** Could fabricate trust outcomes or mutate scoring outside approved policy.
- **Backend remediation:** Specify approved policy revision input, action enum/body, permission/step-up, response and audit history.
- **Frontend follow-up:** Keep queue reads; keep resolution/recompute disabled.
- **Acceptance criteria:** Decisions are policy-versioned, auditable and shown only from server recomputation response.
- **Priority / status:** P1 / OPEN.

#### B09-06 — Versioned policy revision and gazetteer mutation DTOs are missing

- **Original chapters / journey / roles:** Pass 04, Pass 09 and Pass 12; policy administrator and independent approver.
- **Existing endpoint(s) / mounted:** `/api/admin/policies/:key[/history]`, revision create/decision routes and `/api/admin/gazetteer/*`; listed/mounted.
- **Missing contract:** Revision payload, policy schema, revision/history DTO, approval/activation body, expected version and gazetteer entry/validation DTOs.
- **Issue type:** Documentation gap; active policy approval may also be configuration-gated.
- **Impact:** A UI toggle must not silently activate authoritative platform configuration or bypass two-person approval.
- **Backend remediation:** Provide schemas, version semantics, activation state, audit and conflict errors for each policy type.
- **Frontend follow-up:** Keep policy editing disabled; show only documented configuration availability.
- **Acceptance criteria:** Draft → independent review → activation is server-versioned and visible after refresh; frontend cannot locally activate policy.
- **Priority / status:** P1 / OPEN.

### P2 — supporting functionality

#### B01-06 — Email/phone verification alternate operations and event history DTOs are incomplete

- **Original chapters / journey / roles:** Pass 01; account holder.
- **Existing endpoint(s) / mounted:** `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`, phone-verification history/detail routes; listed/mounted.
- **Missing contract:** Alternate POST verification/resend request bodies and phone history event-row schema.
- **Issue type:** Documentation gap.
- **Impact:** Account verification remains harder to recover; no safe event timeline can be rendered.
- **Backend remediation:** Specify exact request/response and token/rate behavior plus phone event DTO.
- **Frontend follow-up:** Keep documented GET token path and phone status/send/verify/cancel/count flows; do not guess alternate body fields.
- **Acceptance criteria:** Account holder can request/complete supported verification and inspect returned event history without exposing account existence.
- **Priority / status:** P2 / OPEN.

#### B01-07 — Session list item DTO blocks per-device revocation

- **Original chapters / journey / roles:** Pass 01; account holder.
- **Existing endpoint(s) / mounted:** `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:id`; listed/mounted. `DELETE /api/auth/sessions/others` is integrated.
- **Missing contract:** Session row identifier/display fields, status/expiry, revoke result and history projection.
- **Issue type:** Documentation gap.
- **Impact:** Cannot accurately identify a session for selective revocation.
- **Backend remediation:** Define safe session list/detail fields and revocation response.
- **Frontend follow-up:** Keep “revoke other sessions” where supported; no invented device rows/per-session control.
- **Acceptance criteria:** User can distinguish and revoke the intended session while current-session behavior is clear.
- **Priority / status:** P2 / OPEN.

#### B01-08 — Standalone profile creation variants are unspecified

- **Original chapters / journey / roles:** Pass 01; account holder creating an additional authorized profile.
- **Existing endpoint(s) / mounted:** `POST /api/profiles`; listed/mounted. Buyer profile creation during registration has a separate supported body.
- **Missing contract:** Exact allowed profile types/creation variants, request and response DTOs, permission assignment rules, and next onboarding state.
- **Issue type:** Documentation gap.
- **Impact:** A guessed profile type or permission set could create unauthorized access or strand onboarding.
- **Backend remediation:** Publish accepted creation variants and returned profile/permission/onboarding fields without implying access grants.
- **Frontend follow-up:** Keep documented registration-time buyer profiles; do not add a generic profile creation form from route presence alone.
- **Acceptance criteria:** User can create only an allowed profile variant, sees returned status/permissions, and reaches the correct next supported onboarding step.
- **Priority / status:** P1 / OPEN.

#### B04-03 — Project-map cluster response DTO is incomplete

- **Original chapters / journey / roles:** Pass 04; public visitor.
- **Existing endpoint(s) / mounted:** `GET /api/projects/map?queryVersion=canonical-v1`; listed/mounted.
- **Missing contract:** Exact project marker/cluster DTO, cluster identity/count/coordinates and any expand semantics. The frontend accepts the documented `projects` projection and otherwise shows unavailable, not zero results.
- **Issue type:** Documentation gap.
- **Impact:** Treating clusters as projects or interpreting missing fields as empty results would misstate the map.
- **Backend remediation:** Publish exact marker/cluster envelope and empty/error variations.
- **Frontend follow-up:** Preserve canonical URL criteria/bounds and keep unsupported cluster response in unavailable state.
- **Acceptance criteria:** Both map renderers consume a normalized documented project marker/cluster response without deriving results from a catalogue page.
- **Priority / status:** P2 / OPEN.

#### B02-01 — Property/project association mutation request details are incomplete

- **Original chapters / journey / roles:** Pass 02; authorized property owner/editor linking or unlinking a property and project.
- **Existing endpoint(s) / mounted:** `PATCH|DELETE /api/properties/:id/project`; listed/mounted.
- **Missing contract:** Exact PATCH/DELETE body, expected-version placement, response envelope, association clear semantics and conflict/error variations.
- **Issue type:** Documentation gap for a versioned resource mutation.
- **Impact:** Incorrect association or unlinking could remove a unit from the intended project or bypass current project permissions.
- **Backend remediation:** Define the exact mutation DTOs, owner/project permission checks, step-up binding and returned association/version state.
- **Frontend follow-up:** Keep project preselection on unit creation and existing reads; do not offer an edit association control until the body is complete.
- **Acceptance criteria:** Owner can link/unlink an authorized record with version/step-up protection and refreshed project/unit association.
- **Priority / status:** P2 / OPEN.

#### B03-02 — Per-item canonical media-access mutation semantics are incomplete

- **Original chapters / journey / roles:** Pass 02 and Pass 03; property/project owner/editor and public viewer.
- **Existing endpoint(s) / mounted:** Runtime field dictionary `GET /api/properties/field-dictionary` and property/project media mutation routes; listed/mounted.
- **Missing contract:** Exact `mediaAccessLevel` per-item target, operation/body, whether it belongs to generic canonical mutation or media association DTO, and response/effective visibility behavior for each media item.
- **Issue type:** Documentation gap at a specialized media/canonical boundary.
- **Impact:** Could expose private survey/title/technical media as public or show a public media entitlement that was not granted.
- **Backend remediation:** Define the per-item media access mutation and public/private projection/update behavior; keep private bytes on protected document routes.
- **Frontend follow-up:** Continue using public-safe upload/association fields and protected document viewers; do not submit an invented per-item entitlement.
- **Acceptance criteria:** A user can change only an authorized media access level, and public projections expose only released safe media after server confirmation.
- **Priority / status:** P1 / OPEN.

#### B05-03 — Durable-job undo expiry timestamp is absent from row DTO

- **Original chapters / journey / roles:** Pass 05; authorized project developer reviewing a completed bulk operation.
- **Existing endpoint(s) / mounted:** `GET /api/projects/:projectId/unit-grid/jobs/:jobId`; listed/mounted. Undo eligibility is server-reported.
- **Missing contract:** A row-level undo expiry timestamp/window is not exposed, although current job rows can return `undoAvailable` and the undo route enforces current version/sold-history constraints.
- **Issue type:** Response DTO limitation; the current safe action is still server-authoritative.
- **Impact:** Frontend cannot show an expiry countdown. It must not infer a longer eligibility window than the server grants.
- **Backend remediation:** If user-visible expiry is required, include a server-authored `undoExpiresAt` per eligible row or explicitly document that `undoAvailable` is the only valid affordance.
- **Frontend follow-up:** Refresh job before undo, show the current server boolean, and handle 409/expired rejection without optimistic rollback.
- **Acceptance criteria:** UI cannot enable undo from local time alone and can accurately explain expiry using server data when supplied.
- **Priority / status:** P2 / OPEN response detail; current server check remains authoritative.

#### B03-03 — Canonical construction-milestone catalogue count conflicts with source list

- **Original chapters / journey / roles:** Pass 03 and Pass 04; developers entering project milestones and search users filtering by milestone.
- **Existing endpoint(s) / mounted:** `GET /api/properties/field-dictionary` and canonical property/project search; listed/mounted.
- **Missing contract/source decision:** RQS-02/RQS-03 state 16 milestones, but only 15 names are enumerated. No authoritative sixteenth value or corrected count is provided.
- **Issue type:** Source/documentation conflict, not an API implementation defect.
- **Impact:** Invented enum options could be rejected by API or make search inconsistent with stored values.
- **Backend remediation:** Resolve the source count/name discrepancy and publish the accepted enum list consistently in the dictionary and search contract.
- **Frontend follow-up:** Use only the current server/source list; preserve unknown returned values for display where safe; do not invent a filter option.
- **Acceptance criteria:** Source and runtime dictionary agree on the complete accepted milestone set and count.
- **Priority / status:** P2 / OPEN source decision.

#### B09-10 — Admin capability/department permission projection is not a complete UI contract

- **Original chapters / journey / roles:** Pass 09; staff users across departments.
- **Existing endpoint(s) / mounted:** Authenticated account/profile and admin route families; route families are listed/mounted.
- **Missing contract:** A complete permission/capability DTO for safe page/action visibility and its refresh/version semantics. Current admin screens use the account-role guard and rely on server 403 for resource/department authority.
- **Issue type:** Documentation gap; backend authorization remains authoritative.
- **Impact:** Frontend may show irrelevant controls, although it does not grant server authority.
- **Backend remediation:** Publish a current-profile capability snapshot with department/resource/action permissions and refresh rules, or specify that the UI should remain role-only and rely on per-resource checks.
- **Frontend follow-up:** Do not invent permission names; retain server error handling and avoid presenting unavailable actions as completed.
- **Acceptance criteria:** Navigation and controls can be derived from a server-returned scoped permission projection without caching across profile switches.
- **Priority / status:** P2 / OPEN.

#### B09-11 — Admin aggregate dashboard DTO does not define all queue/overview metrics

- **Original chapters / journey / roles:** Pass 09; authorized staff dashboard.
- **Existing endpoint(s) / mounted:** `GET /api/admin/stats`; listed/mounted, current frontend uses documented aggregate fields.
- **Missing contract:** Complete stats DTO, time-window/filter semantics, authoritative moderation/verification/job queue aggregates and total definitions.
- **Issue type:** Documentation gap/optional aggregate capability.
- **Impact:** Calculating totals from a paginated list would misstate platform-wide counts.
- **Backend remediation:** Define supported aggregate metrics and filters or document that unavailable metrics should be omitted.
- **Frontend follow-up:** Keep existing cards scoped to returned aggregates and link them to existing workspaces; do not present page-slice counts as global totals.
- **Acceptance criteria:** Every dashboard total has an authoritative server aggregate and documented scope/time window.
- **Priority / status:** P2 / OPEN; existing dashboard remains PARTIAL.

#### B09-08 — Virtual-tour settings mutation and history DTO are incomplete

- **Original chapters / journey / roles:** Pass 02 and Pass 09; authorized admin.
- **Existing endpoint(s) / mounted:** `PATCH /api/admin/settings/virtual-tours`, provider health and list/detail/history routes; listed/mounted.
- **Missing contract:** Complete settings mutation body/response and history DTO. Provider health/read remains integrated.
- **Issue type:** Documentation gap plus provider activation dependency.
- **Impact:** Local settings must not be represented as active provider configuration.
- **Backend remediation:** Document schema, allowed providers, versions, history and configuration states.
- **Frontend follow-up:** Keep only documented read/health views; show provider configuration errors without activation claims.
- **Acceptance criteria:** Admin can read and review server configuration and history before any contract-backed mutation; provider readiness is authoritative.
- **Priority / status:** P2 / OPEN.

#### B09-09 — Notification delivery inspection/reconciliation DTOs are incomplete

- **Original chapters / journey / roles:** Pass 08 and Pass 09; notification operations staff.
- **Existing endpoint(s) / mounted:** `GET /api/admin/notification-deliveries`, `POST /api/admin/notification-deliveries/:deliveryId/reconcile`, user device registration/removal and delivery-history routes; listed/mounted.
- **Missing contract:** Queue filters/projection, delivery/history DTO, reconciliation request/result and browser token acquisition contract.
- **Issue type:** Documentation gap; external delivery also configuration-gated.
- **Impact:** A preference or queued dispatch could be misrepresented as external delivery.
- **Backend remediation:** Specify staff read/reconciliation DTOs, delivery receipts and supported device token issuance/provider behavior.
- **Frontend follow-up:** Keep in-app notification behavior and provider-unavailable messaging; no device/delivery controls appear operational.
- **Acceptance criteria:** Delivery state and provider receipt are server-authored and distinguish queued, sent, failed and reconciled where supported.
- **Priority / status:** P2 / OPEN contract; provider activation separately gated.

#### B07-08 — Payment export requires a documented protected GET/POST protocol

- **Original chapters / journey / roles:** Pass 07; authorized buyer/staff finance user.
- **Existing endpoint(s) / mounted:** `GET /api/payments/export.csv`; listed/mounted.
- **Missing contract:** Exact query/scope/file response and compatible step-up exchange. Current JSON-bound challenge contract accepts only POST/PUT/PATCH/DELETE and binds a JSON body.
- **Issue type:** Contract/protocol mismatch.
- **Impact:** Unsupported GET step-up cannot be safely simulated, and export scope may leak financial data.
- **Backend remediation:** Provide a documented authorized export initiation (preferably versioned/POST if step-up is required), filter/selection semantics, response/download and audit behavior.
- **Frontend follow-up:** Keep export control disabled; do not bypass TOTP or bind an invented GET body.
- **Acceptance criteria:** Export scope is explicit, authorized and step-up protected using a supported exact binding.
- **Priority / status:** P2 / OPEN.

## Configuration gates — not backend contract blockers

These capabilities have documented safe unavailable behavior; activation, data, policy approval, or provider operation is outstanding. They are not missing DTOs and should not be called backend-contract defects.

| Gate | Affected journey | Current safe frontend behavior / required external action | Priority / status |
|---|---|---|---|
| Gazetteer, boundary, location resolution and project-pin data | Search, map, location/onboarding and project pins | Preserve user criteria; show unavailable/needs-resolution state; approve and load authoritative data/policies. | P2 / BLOCKED BY CONFIGURATION |
| FX provider/rates and approved currency freshness policy | Currency comparison, map aggregates and price filters | Preserve original currency; do not convert or render unconfigured aggregates; activate approved FX provider/rates. | P2 / BLOCKED BY CONFIGURATION |
| Nearby radius, routing/commute provider | Nearby/commute search | Preserve selections and show unavailable; approve maximum radius/provider/licensing. | P2 / BLOCKED BY CONFIGURATION |
| Paystack credentials, callbacks/webhooks and plans | Cart checkout, proxy payment, seat/publication plans | Keep pending/reconciliation state; never claim provider success; configure and validate provider/webhooks/plans. | P0 / BLOCKED BY CONFIGURATION |
| Private storage encryption, scanning, signing and protected renderer | Evidence/title/private-document access | Keep private content quarantined/unavailable; do not use public URLs; activate approved storage/scanner/renderer. | P0 / BLOCKED BY CONFIGURATION |
| Retention approval and deletion execution flag | Privacy deletion execution | Show waiting/partial/held counts; do not promise deletion; obtain legal retention approval and enable authorized worker. | P0 / BLOCKED BY CONFIGURATION |
| Approved freshness confirmation and ranking/sponsored policies | Grid freshness job, Recommended ranking, sponsored placement | Withhold gated actions or render server fallback/notice; approve versioned Console policies. | P2 / BLOCKED BY CONFIGURATION |
| Email/SMS/WhatsApp/push provider receipts and alert cadence | External notifications and saved-search alerts | Persist only documented preferences; do not promise delivery/cadence; configure provider and approved cadence policy. | P2 / BLOCKED BY CONFIGURATION |
| Title registry and proxy partner pricing/session providers | Title external anchoring and proxy partner payment | Show unavailable/pending; do not claim anchor/payment completion; configure approved provider and pricing/session policy. | P1 / BLOCKED BY CONFIGURATION |

## Frontend-owned work that is not a backend blocker

- Canonical property/project field-specific UX, public projection coverage, search controls/facets, and residual unit-grid presentation are tracked as frontend `PARTIAL` work in Passes 02–04/Pass 03 field coverage. Runtime metadata now defines target/operation eligibility; the remaining gaps must not be mislabeled as missing API contracts.
- Operational private-file migration/custody screens are `NOT STARTED` frontend work. Chapters 06, 15 and 16 now document their routes; actual storage movement remains configuration-gated. Do not count absence of the operator UI as an undocumented backend contract.
- Chapter 05 import row validation polish, additional dynamic row-correction controls, and job recovery after closing a tab remain frontend implementation gaps where documented APIs exist. A per-row undo expiry timestamp is not returned; the current server `undoAvailable` flag remains the only safe action gate (B05-03). Do not invent a job-history endpoint.
- Chapter 09 platform overview completeness remains partial where no authoritative aggregate exists. Do not calculate platform totals from paginated slices.

## Pass 10 implementation follow-up

The shared Axios client now normalizes both documented error envelopes, preserves only documented stable fields plus `X-Request-ID` and `Retry-After`, retains nested validation paths, keeps 403 separate from session expiry, distinguishes cancellation from network failure, and warns that a timed-out/unconfirmed mutation may already have been processed. It does not automatically retry any operation. Step-up rate-limit guidance honors the server’s `Retry-After` value. Focused test results are recorded in Pass 10 of the integration tracker.
