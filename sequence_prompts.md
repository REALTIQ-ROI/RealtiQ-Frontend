Yes. That workflow keeps the backend contract authoritative and makes backend and frontend completion visible separately. The prompt filenames below use the **implementation group number**, not a PRD section number. Each backend prompt produces an API document and a self-contained Codex prompt for the frontend.

Run the backend prompt first, then copy its `frontend_contract_XX.md` into the frontend repository and run it there before moving to the next group.

## Group 1 — Scope, launch boundaries and source decisions

**PRD §§1, 2, 23, 25**

```text
# REALTIQ — IMPLEMENTATION GROUP 01: SCOPE AND SOURCE DECISIONS

Work first in the RealtiQ backend repository. Do not infer scope from current code or historical implementation reports.

Read PRD §§1, 2, 23 and 25 in full, the cited Specifications sections, and the Specifications’ source precedence and platform-wide rules. The Specifications govern where they conflict with the PRD.

OBJECTIVE
Create the implementation boundary and decision record for the subsequent groups: what is in launch scope, what is explicitly excluded, and which unresolved source questions affect specific features.

WORK
1. Extract every applicable scope rule, launch/deferred feature, explicit exclusion, and open decision from these sections and cited Specifications.
2. Classify each item as backend, frontend, mixed, or governance/decision.
3. For every unresolved decision, identify the affected feature and the smallest work that can proceed safely without resolving it.
4. Do not invent a policy, data value, provider, endpoint, or user-visible promise.
5. Do not implement a feature or create an endpoint merely to fill this document. This group may correctly have no backend API changes.

DELIVERABLES
Create:
- `docs/section_01_api_docs.md`
- `docs/frontend_contract_01.md`

The API document must state the confirmed scope constraints, sources, launch gates, decisions and explicitly state `NO_API_REQUIRED` wherever no API is required.

The frontend contract must be a self-contained Codex prompt for the frontend repository. It must list applicable UI scope and wording restrictions, excluded features, configuration-gated states, and unresolved decisions. It must not invent or request unsupported APIs.

Include a traceability table with source section/page, requirement, owner (backend/frontend/mixed/governance), backend status, frontend status, acceptance evidence, and open decision. Keep backend and frontend statuses separate.

ACCEPTANCE
Every item in §§1, 2, 23 and 25 and the applicable cited source material is accounted for. Nothing excluded by the source is presented as a launch feature. No ambiguous policy is silently decided.
```

## Group 2 — Identity, access, portal foundations and control plane

**PRD §§3, 4, 12, 18, 21, 26**

```text
# REALTIQ — IMPLEMENTATION GROUP 02: IDENTITY, ACCESS AND PLATFORM FOUNDATIONS

Work in the backend repository first. Inspect the current implementation before changing code and preserve working behavior.

Read PRD §§3, 4, 12, 18, 21 and 26 and their cited Specifications, especially RQS-06 §§2–4 and 19–23, RQS-01 §§18 and 27, and relevant RQS-08 plan/seat and control requirements. The Specifications govern conflicts.

OBJECTIVE
Provide the shared identity, active-profile, authorization, portal and staff-control foundations that the other groups depend on.

SCOPE
Cover the source-defined account classes and profiles; one sign-in with multiple profiles; profile switching and isolation; Guest/Registered/Verified access levels; individual and organization onboarding/verification; membership, teams, roles and seats; session and permission revocation; staff departments and separation of duties; shared portal conventions; Console authority/configuration; notification preferences and service contracts; required security, accessibility, availability and integration-ready identifiers/events/contracts.

IMPLEMENT
- Trace actual mounted APIs and callers. Implement only missing behavior.
- Enforce current session and selected-profile context server-side.
- Preserve organization and staff permission boundaries and separation of duties.
- Establish shared auth, audit, notification, configuration and integration interfaces where required.
- Do not activate connected applications: PRD §26 says they are not launch-connected. Keep unavailable dependencies explicit.
- Do not create role names, permissions, verification rules or policy values absent from the source.

DOCS
Create `docs/section_02_api_docs.md` with exact mounted routes, DTOs, headers, permissions, validation, revocation/state behavior, errors, and request/response examples.

Create `docs/frontend_contract_02.md` as a self-contained frontend Codex prompt covering registration/login, profile selection/switching, workspace shell, roles/permissions, organization and team screens, security/session settings, notifications, admin/staff navigation, loading/restricted states and accessibility. Embed the confirmed API contracts; do not ask the frontend to guess.

Track each requirement separately with backend and frontend status, source reference, acceptance evidence and external gate.

Run focused tests for changed authorization/session/profile behavior. Do not run an unrelated full suite.
```

## Group 3 — Shared property vocabulary

**PRD §5**

```text
# REALTIQ — IMPLEMENTATION GROUP 03: SHARED PROPERTY VOCABULARY

Work in the backend repository first. Read PRD §5 and the cited Specifications, including RQS-03 §§2–3 and 6, RQS-02 §§2, 4, 6 and 9, RQS-04 field sections, and the relevant RQS-01/RQS-05 references.

OBJECTIVE
Establish the authoritative shared vocabulary used by listing and project forms, imports, search, comparison and public displays.

SCOPE
Account for the source-defined property categories/types, build stages and milestones, measurement semantics, amenities, architectural styles, title-document vocabulary, occupancy, location hierarchy and price vocabulary. Preserve the source rules for exclusions, nullability, labels and unit semantics.

IMPLEMENT
1. Inspect existing taxonomies, option-list endpoints, schemas and consumers.
2. Reuse the existing canonical source of truth. Do not create competing enums or dictionaries.
3. Correct missing or inconsistent representations and expose only metadata needed by supported clients.
4. Preserve source-defined behavior such as m²-only areas, POA, NGN/USD listing currency, private reserve price, occupancy values and commercial room nullability.
5. Keep externally supplied gazetteer, boundary, map and FX data gated when unavailable; do not fabricate identifiers or values.

DOCS
Create `docs/section_03_api_docs.md` documenting actual vocabulary/option-list APIs, exact enums and DTOs, supported entity levels, validation, unavailable states and examples. If a value is consumed only inside another API, document that contract; do not invent a standalone endpoint.

Create `docs/frontend_contract_03.md` as a complete frontend Codex prompt for selectors, cascading fields, measurement and currency controls, conditional display, help text and unavailable options. Include all source-defined values and the confirmed API contracts.

Track source vocabulary items individually. Separate backend support from frontend display completion. Run focused checks for changed taxonomy/validation behavior.
```

## Group 4 — Revenue, plans and payment foundations

**PRD §20**

```text
# REALTIQ — IMPLEMENTATION GROUP 04: REVENUE AND PAYMENT FOUNDATIONS

Work in the backend repository first. Read PRD §20 and the full cited RQS-08 material, including fee products, fee schedule, payment routes, plans/seats, transaction fees, verification fees, partner fees, promotion, invoices/refunds, reporting, tax and revenue-protection controls. Also read related RQS-06 and RQS-01 references.

OBJECTIVE
Implement the shared pricing, fee, billing and payment-routing foundations used by later groups.

IMPLEMENT
- Reconcile fee product IDs, streams, payer rules, bases, currencies, versions, effective dates, caps/minimums, VAT and on/off state with the source.
- Preserve payment routing: Moniepoint for property/service payments and splits; Paystack only for plans, subscriptions, promotion and REALTIQ fee invoices, as specified.
- Implement or complete plan catalogue, seat billing, renewal/lapse behavior, pricing quotes, fee lines, receipts/invoices, refunds/credits and audit/reconciliation connections where required.
- Enforce idempotency, immutable locked terms, payment-provider reconciliation, no stored balances except the expressly specified campaign budget, and separation of duties.
- Do not invent fee amounts, VAT status, tax rates, provider credentials, plans or approval thresholds. Keep unapproved settings safely unavailable.
- Do not initiate real payments or alter production data.

DOCS
Create `docs/section_04_api_docs.md` with every actual mounted billing/payment/configuration endpoint in scope, exact request/response DTOs, permissions, step-up, idempotency, versions, errors, transitions and provider-gated behavior.

Create `docs/frontend_contract_04.md` as a self-contained frontend Codex prompt for plan/billing, seats, fee quotes, invoices, payment status, refunds and unavailable states. Include exact contracts and realistic examples derived from code; never use fake prices as real values.

Track each RQS-08 requirement separately with backend and frontend status. Add focused tests for changed fee calculations, routing, idempotency or state behavior.
```

## Group 5 — Listing, project, unit and lifecycle workflows

**PRD §§7, 8, 13**

```text
# REALTIQ — IMPLEMENTATION GROUP 05: PROPERTY AND PROJECT SUPPLY

Work in the backend repository first. Read PRD §§7, 8 and 13 and the cited Specifications: RQS-04 A–M, RQS-02 §§2–10, RQS-06 §§5 and 8–10, RQS-01 §§5, 18 and 19, and RQS-05 §13.

OBJECTIVE
Complete the seller-side lifecycle for individual listings and developer projects, types and units using the shared vocabulary and payment foundations.

IMPLEMENT
- Trace the actual create, draft, update, readiness, submit, review, publish, pause, withdraw, archive and availability paths.
- Implement source-defined fields and conditional validation, preserving false, zero, null and unset semantics.
- Implement project → type → unit inheritance, effective values, explicit overrides/reset behavior and the unit-level search value.
- Connect project/type/unit creation, media references, pricing, payment terms, title declarations, ownership and publication gates.
- Implement property-register identity, duplicate review, seller authority, sold-property relisting, unit identity/uniqueness and source-defined conflict behavior.
- Implement source-defined statuses, freshness, price history and transitions. Never expose reserve or actual sale price to public consumers.
- Keep the developer-confirmed type-creation flow and existing compatibility routes where supported.
- Do not invent matching tolerances, fields, enums or readiness rules.

DOCS
Create `docs/section_05_api_docs.md` with exact mounted property/project/type/unit APIs, DTOs, field applicability, authorization, versions, validation, readiness blockers, state transitions, imports/grid touchpoints and errors.

Create `docs/frontend_contract_05.md` as a self-contained frontend Codex prompt for property and project forms, drafts, effective values, overrides, readiness, publication, ownership, price history and conflict recovery. Include exact API examples and UI requirements from the cited sources.

Account for each applicable canonical field and lifecycle stage individually or by shared, explicitly identified root cause. Track backend and frontend completion separately. Add focused tests for changed persistence, authorization, inheritance or state transitions.
```

## Group 6 — Media, documents, access and viewings

**PRD §14**

```text
# REALTIQ — IMPLEMENTATION GROUP 06: MEDIA, DOCUMENTS AND VIEWINGS

Work in the backend repository first. Read PRD §14 and the cited Specifications, especially RQS-06 §§11–14, RQS-01 §§1, 19, 20 and 25, and the media fields in RQS-02/RQS-04.

OBJECTIVE
Complete media association, document custody/access, document-manager and viewing capabilities that listing, project, transaction and partner workflows use.

IMPLEMENT
- Inspect mounted upload, metadata, access-grant, viewer, download/render, replacement, revocation, document-manager and viewing routes.
- Apply source-defined Free/Paid/On request/Private policies and supported file/media types.
- Keep private storage URLs hidden; require current authorization, entitlement, custody and safe document state before content is served.
- Preserve scanning/quarantine behavior only if required by the governing source; do not add undocumented dependencies.
- Implement watermarked/logged protected viewing, document versions, requests and approvals, where required.
- Implement viewing options, calendar availability, booking assignment and notifications.
- Connect document facts to verification and escrow evidence without inventing policy.
- Fail closed for missing private storage/provider configuration; preserve explicit safe unavailable responses.

DOCS
Create `docs/section_06_api_docs.md` with exact mounted endpoints, multipart fields, headers, grants, roles, versions, content types, response headers, errors, access states and examples.

Create `docs/frontend_contract_06.md` as a complete frontend Codex prompt for media managers, document vault/request flows, protected viewers, upload progress/errors and viewing/calendar screens. Embed only confirmed API contracts and specify when bytes may be requested.

Track each access level and workflow separately. Add focused tests for changed privacy, authorization, file custody and viewing behavior.
```

## Group 7 — Trust, partners and public profiles

**PRD §§15, 17, 19**

```text
# REALTIQ — IMPLEMENTATION GROUP 07: TRUST, PARTNERS AND PUBLIC PROFILES

Work in the backend repository first. Read PRD §§15, 17 and 19 and their cited Specifications, especially RQS-06 §§2, 3, 9, 16–19 and RQS-07 §§1–7. Also read RQS-01 §27 and the relevant RQS-08 partner/promotion-fee requirements.

OBJECTIVE
Complete the trust/reputation model, third-party Partner Portal and public profile contracts that let users evaluate sellers and professionals and use on-platform services.

IMPLEMENT
- Implement role/profile-specific trust inputs, visibility rules, tiers, minimum evidence, ratings thresholds, appeals, suspension/blacklist behavior and public-safe projections.
- Implement partner roles, specialties, credentials/expiry, service areas, availability, rates, approved payment terms, conflict declarations, job matching, assignments and report workflows.
- Implement profile-specific public page DTOs and directory search using actual authorized data.
- Implement source-defined social, follow, report and post/promotion behavior where applicable. Enforce contact/link rules and moderation boundaries.
- Use genuine approved records for verification, ratings and Sponsored placement. Never infer these from payment or client-supplied flags.
- Keep policy values configurable and gated when approval is required. Transaction-derived trust components may need integration with Group 9.

DOCS
Create `docs/section_07_api_docs.md` with exact public, signed-in and staff routes, DTOs, permissions, state changes, expiry rules, pagination, errors and examples.

Create `docs/frontend_contract_07.md` as a self-contained frontend Codex prompt for trust pages, provider directory, partner onboarding/workspace, public profiles, follow/report/social surfaces and role-based service availability.

Track every source feature with separate backend/frontend status; state which trust fields depend on later transaction history. Add focused tests for privacy, authorization, eligibility and state transitions.
```

## Group 8 — Search and discovery

**PRD §6**

```text
# REALTIQ — IMPLEMENTATION GROUP 08: SEARCH AND DISCOVERY

Work in the backend repository first. Read PRD §6 and the full cited RQS-03 §§1–7, plus the relevant RQS-02 §6, RQS-04 field mappings, RQS-05 criteria, and RQS-06 trust/promotion references.

OBJECTIVE
Complete the source-defined search, map, location, sorting, facets and alert-matching behavior against the canonical catalogue.

IMPLEMENT
- Enumerate and assess every source-defined filter/control atom and all 12 sorts individually. Do not mark a parameter supported just because the API accepts it.
- Ensure query parsing, canonical semantics, property/project/unit matching, map/nearby behavior, facets, counts, saved searches and alert matching use consistent criteria.
- Enforce source-defined OR/AND behavior, defaults, URL/query restoration, status and POA rules, currency/FX treatment, project matching-unit behavior and zero-result diagnostics.
- Integrate the authoritative trust, freshness, verification and Sponsored signals from Groups 4 and 7. Featured must not affect ranking or bypass filters.
- Keep unavailable geographic, FX, commute or policy inputs explicitly gated; never fabricate data.
- Preserve performance architecture and cache invalidation requirements without running benchmarks in this task.

DOCS
Create `docs/section_08_api_docs.md` with exact mounted catalogue/map/nearby/location/suggestion/saved-search/alert endpoints, query names, enums, pagination, response DTOs, errors, defaults and examples.

Create `docs/frontend_contract_08.md` as a self-contained frontend Codex prompt for search bars/drawers, map/list synchronization, filters, sort controls, facets, URL state, saved searches, alert settings and unavailable states. Include every source atom and its exact confirmed backend parameter.

Track every filter and sort independently with backend/frontend status. Add focused tests for materially changed query semantics.
```

## Group 9 — Negotiation, checkout, escrow and finance

**PRD §§10, 16**

```text
# REALTIQ — IMPLEMENTATION GROUP 09: TRANSACTIONS AND FINANCE

Work in the backend repository first. Read PRD §§10 and 16 and the cited Specifications, especially RQS-01 §§12–17, RQS-06 §§5, 10, 15 and 19, and RQS-08 §§4–13 and 16.

OBJECTIVE
Complete end-to-end buyer/seller transaction execution and the financial records and views derived from it.

IMPLEMENT
- Connect enquiry, multi-unit selection, negotiation, tracked proposals, accepted/locked terms and immutable terms history.
- Enforce availability and transaction-stage transitions; no payment before Terms Agreed; correct per-unit allocations and receipts.
- Connect checkout to Group 4 payment routing, current price/currency, idempotency and provider reconciliation. Never treat payment success as ownership or legal transfer.
- Implement escrow rooms, condition-specific visibility, evidence, appointed-agent scope, objections, disputes, release/reversal authorization and source-required separation of duties.
- Implement instalments, payment schedules, refunds, ownership/handover links and status changes only as specified.
- Build Finance projections from authoritative ledger/payment records: money in/out, escrow, receivables, payouts, reconciliation, fees and exports. Respect Finance/Executive permissions.
- Preserve fail-closed provider behavior. Do not initiate real payments or fabricate transactions.

DOCS
Create `docs/section_09_api_docs.md` documenting actual mounted endpoints, roles, step-up binding, versions, idempotency, DTOs, transitions, errors, retry/reconciliation behavior and end-to-end examples.

Create `docs/frontend_contract_09.md` as a self-contained frontend Codex prompt for buyer, seller, agent, partner and staff transaction/finance journeys, including polling, pending/failed states, disputes, escrow and recovery.

Track each workflow transition and acceptance criterion separately. Add focused tests for changed financial, permission, idempotency and state-machine behavior.
```

## Group 10 — Comparison and project purchase journey

**PRD §§11, 9**

```text
# REALTIQ — IMPLEMENTATION GROUP 10: COMPARE AND PROJECT PURCHASE EXPERIENCE

Work in the backend repository first. Read PRD §§11 and 9 and their cited Specifications: RQS-05 §§2–17, RQS-01 §§1–10 and 12–27, plus RQS-02 §6 and relevant RQS-06 project-page/profile/document references.

OBJECTIVE
Connect the completed search, listing, project, document, partner and transaction capabilities into the buyer-facing comparison and project purchase journeys.

IMPLEMENT
- For Compare, implement the source-defined 2–4 property set, category restrictions, confirmed suggestions, comparison DTO, objective markers, FX display, duplicate grouping, sold-comparable access gate and in-place status/price updates.
- Keep seller list price distinct from private reserve and actual sale price. Sold comparables use last asking price, never sale price.
- For project pages, connect all applicable project/unit page data, matching-unit counts, availability, build progress, handover dates, title/trust disclosures, reviews/questions, FAQs, media/site plans, viewing, documents, multi-unit enquiry and purchase actions.
- Ensure project cards and counts derive from published eligible units and match source-defined consistency rules.
- Connect actions to Group 9 workflows; do not add placeholder purchase endpoints.
- Preserve source-defined wording, privacy and accessibility requirements.

DOCS
Create `docs/section_10_api_docs.md` with exact mounted compare/project endpoints and DTOs, permissions, queries, pagination, state variations, errors and complete request/response examples.

Create `docs/frontend_contract_10.md` as a self-contained frontend Codex prompt for comparison tray/set/page, project page, unit cards, progress, media, reviews, enquiries and purchase entry points. Include confirmed APIs and UI state flows.

Track backend and frontend completion separately against every applicable RQS-01 and RQS-05 acceptance condition. Add focused tests for changed aggregation, privacy and state consistency.
```

## Group 11 — Dependencies, acceptance and completion tracking

**PRD §§22, 24**

```text
# REALTIQ — IMPLEMENTATION GROUP 11: FIRST-BATCH ACCEPTANCE AND READINESS

Work in the backend repository first. Read PRD §§22 and 24 and each cited Specifications dependency/completion section: RQS-01 §25–26, RQS-02 §10, RQS-03 §7, RQS-04 M, RQS-05 §17, RQS-06 §§22–23, RQS-07 §7 and RQS-08 §§14–16.

OBJECTIVE
Reconcile the first-batch acceptance criteria against the backend and frontend completion records created by Groups 1–10. This is a targeted acceptance closure, not an invitation to repeat broad audits or rewrite working features.

WORK
1. Check each source acceptance criterion against concrete backend evidence and frontend evidence separately.
2. Identify any criterion whose workflow still lacks a connection between groups.
3. Implement only a specific, source-backed internal gap needed for acceptance. Do not reopen unrelated completed work.
4. Record provider credentials, approved policy values, legal checks, datasets, migrations/index rollouts and operational prerequisites as external gates. Never mark them as internal implementation gaps or invent their values.
5. Ensure each §22 prerequisite is assigned to its stated owner/category and the affected capability’s behavior while gated is documented.

DOCS
Create:
- `docs/section_11_api_docs.md` — final API/dependency status for affected acceptance workflows; clearly state when no API is required.
- `docs/frontend_contract_11.md` — a self-contained Codex prompt for frontend acceptance fixes, if any; otherwise state that no frontend change is required and explain why.
- `docs/first_batch_completion_tracker.md` — one traceable matrix with separate Backend and Frontend status, source acceptance criterion, evidence, dependency and final outcome.

Do not claim completion based on documentation or tests alone. Run only focused checks for any code changed in this group. The final tracker must distinguish COMPLETE, PARTIAL and externally gated work and must not conceal unresolved criteria.
```

Each prompt uses the same 11-group order and asks the backend Codex to generate contracts from **actual mounted code after implementation**, rather than assume routes or response shapes. The frontend prompts are intended to be run only after the corresponding backend contract is confirmed.