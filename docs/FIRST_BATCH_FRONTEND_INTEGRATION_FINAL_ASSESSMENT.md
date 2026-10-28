# First-Batch Frontend Integration — Final Assessment

**Date:** 26 October 2026
**Repository:** `realtiq-frontend` only
**Overall verdict: PARTIAL — source integration is substantially covered; production acceptance is not established.**

## Executive assessment

All 17 numbered passes now have an evidence-backed record. The frontend exposes and source-connects the supported first-batch journeys, with typed services, protected mutations, authoritative pending/partial states, and focused mock tests across the reviewed modules. The final pass closed a response-branch coverage gap and a mutation-draft recovery defect in the adjacent proxy-inspection workflow.

This is not production acceptance. No backend source, live API, deployment configuration, external provider, real payment, private customer file, destructive privacy operation or production identity was accessed. **No workflow has live-backend acceptance evidence.**

## Pass-by-pass readiness

Historical pass verdicts are preserved. “PARTIAL” means at least one supported journey is connected while a contract, policy, configuration, deployment, test-environment or live-acceptance dependency remains.

| Pass | Area | Historical/current pass verdict | Final evidence and major remaining boundary |
|---:|---|---|---|
| 01 | Authentication, accounts, profiles and organizations | PARTIAL | Registration/session/profile switching and documented identity operations are source-wired. Initial-login MFA response, organization plan/bank schemas, mandate/staff signatory read contracts and some profile flows remain. |
| 02 | Properties, projects, unit types and units | PARTIAL | Property/project CRUD paths, nested type lifecycle, unit grid, association and supported publication paths are connected. Complete effective field projections and live readiness/authorization acceptance remain. |
| 03 | Canonical field dictionary | PARTIAL | The 156-field review and supported runtime-aware subset remain documented. The full field dictionary DTO, per-media access semantics and construction milestone decision are unresolved; no all-fields-complete claim is made. |
| 04 | Search, maps and discovery | PARTIAL | Canonical list/map search, location suggestions and revision-aware saved searches are connected. Alert policy, provider/configuration and some ranking/aggregate decisions remain. |
| 05 | Imports, grids and bulk operations | PARTIAL | Supported upload/mapping/job lifecycle, bulk grid, row results, cancellation and returned undo eligibility are connected. Explicit row-decision/confirmation bodies remain incomplete. |
| 06 | Documents, media and verification | PARTIAL | Supported private evidence/title paths and holder/staff slices are connected. Listing-verification preflight, complete approval policy, private storage/scanning and broader custody UI remain. |
| 07 | Payments, ownership and escrow | PARTIAL | Checkout/payment references, bound step-up, unknown outcomes and supported escrow recovery are source-wired. Ownership history/transfer specification, provider/index deployment and some legacy mutations remain. |
| 08 | Privacy, notifications and realtime | PARTIAL | Profile-scoped notification, messaging, socket and grouped privacy paths are connected. Staff decision/correction/consent variants and external delivery provider contracts remain. |
| 09 | Admin console and policies | PARTIAL | Documented read and protected-action subsets are reachable. Verification/review queues, policy revision schemas, and some staff/account/organization decisions remain blocked. |
| 10 | API errors and state machines | PARTIAL | Shared error normalization, auth distinction, retry safety and major module state handling are source-tested. Route-specific exhaustive errors and shared conflict comparison remain partial/deferred. |
| 11 | Frontend integration checklist | PARTIAL | 62 checklist items: 39 COMPLETE, 21 PARTIAL, 1 BLOCKED—SPECIFICATION, 1 BLOCKED—CONFIGURATION. Supported connection gaps were fixed; multi-step workflows still inherit contract/configuration gates. |
| 12 | Configuration gates and open decisions | PARTIAL | 16 configuration rows, 4 numbered decisions and 9 deployment activation tasks were reviewed. Client capability handling is conservative; no deployment setting or product policy is asserted active. |
| 13 | Backend acceptance and contract review | PARTIAL | 37 Chapter 13 source entries and 44 representative endpoint patterns were reviewed; initial report had mock evidence for 35/44. No live endpoint acceptance was claimed. |
| 14 | Mounted endpoint index | PARTIAL | Chapter 14 table: 595 method/path rows (summary says 594); 412 first-batch rows (summary says 411); 337 frontend normalized patterns map to 336 distinct rows, zero unmatched; 287/412 rows have direct call evidence. This is route matching, not full DTO coverage. |
| 15 | API DTO and schema reference | PARTIAL | 25 entries: 16 COMPLETE, 4 PARTIAL, 5 intentionally unused operational entries; 20 have frontend consumers. Full route DTO coverage is outside this selective chapter. |
| 16 | API response variation matrix | PARTIAL historically | 45 response rows / 44 path patterns plus 3 additions. Pass 17 added branch assertions for all 11 former partial consumer rows: current bounded result is 28 consumer rows with focused tests and 17 internal rows without first-batch UI. Historical Pass 16 verdict remains PARTIAL; the matrix is not exhaustive. |
| 17 | End-to-end frontend workflows and final handoff | PARTIAL | 19 Chapter 17 workflows: 1 complete in its documented non-paid viewing scope, 17 partial end-to-end, 1 internal custody workflow without first-batch UI. Zero live-accepted workflows. |

## Reconciled blocker totals

The detailed remediation table contains **41 rows**, re-counted as **19 COMPLETE, 14 PARTIAL, 7 BLOCKED, and 1 DEFERRED**. The older 18/15 summary is historical. Pass 17's proxy testing does not alter the blocker classifications. See [the blocker register](FIRST_BATCH_FRONTEND_REMAINING_BLOCKERS.md) and [the 41-row post-remediation reconciliation](FRONTEND_RECONCILIATION_POST_BACKEND_REMEDIATION.md).

## Evidence classification

| Evidence level | Final statement |
|---|---|
| Contract documented locally | Feature chapters, mounted endpoint index, DTO/variation references and Chapter 17 playbooks were used; known contradictions remain explicit. |
| Source verified | Relevant route → service → component integration was inspected and corrected where supported. Pass 14 reports 337 normalized frontend method/path patterns with no unmatched mounted method/path row. |
| Mock tested | Focused API/service/component branches were exercised. Pass 17 tests all 11 response rows previously lacking assertions; exact commands and counts are in the Pass 17 workflow report and tracker. |
| Live accepted | **0.** No live backend/provider acceptance was performed. |

## Major source-level functionality

Across the existing pass reports, the frontend has connected the supported account/profile flows; property/project/unit editing; runtime-authorized canonical field subset; canonical list/map search and saved-search revisions; import staging and durable grid jobs; protected evidence/title access; holder/staff verification subsets; payment reservation/reconciliation and protected export; grouped privacy requests; profile-scoped messaging/realtime; and documented administrative review/finance subsets. Pass 17 did not rebuild those areas; it fixed proxy mutation draft recovery and narrowed missing-report handling to the exact documented 404.

## Remaining frontend-owned work

- Pass 10 still records a **partial app-wide stale-request/cancellation audit** and no universal conflict compare/review UI. Existing route/module abort controls, profile invalidation, realtime epochs and bounded polling remain. This is frontend follow-up and is not mislabeled as a backend contract blocker.
- The alternate email verification contract is documented but the UI still uses the existing token flow (`B01-06`); only documented alternatives should be connected.
- Route-specific recovery and response work remains outside the representative Chapter 16 matrix (`B10-01` is explicitly deferred documentation scope). The 11 Pass 16 assertion gaps are closed for the listed branches, not every route variation.
- The accounts-followed search filter is connected, but the mounted follow-list create/read/delete route DTOs are absent from the local feature contract. No follow-management controls or result counts were guessed (`C04-01`).
- Browser-level e2e automation is not configured in this repository; no browser tool was added. Mocked component/service evidence must be supplemented in staging.

## Contract, product, configuration and deployment dependencies

- **Backend contract/specification:** exact first-login MFA discriminator; organization seat-plan/bank directory, mandate and signatory reads; import row confirmation/correction bodies; listing verification preflight/policy; staff privacy decisions; account `authVersion`; duplicate/distress/listing review projections; trust recompute step-up representation; per-policy revision schemas; ownership detail/history/transfer; media entitlement; dashboard metric definitions; virtual-tour admin initial revision/history; accounts-followed management DTOs for mounted personalisation routes.
- **Product decisions:** paid/live tours; ownership transfer/history/sales aggregate rules; construction milestone count; duplicate-size tolerance; ranking/Sponsored policy; nearby radius/cadence/site-plan and FX/freshness policy details.
- **Configuration:** active verification/manual-source policy, providers, private storage/scanner/renderer, gazetteer/boundaries, FX/routing/ranking/alerts and notification delivery, legal retention and execution policy.
- **Deployment:** payment-attempt unique index and existing-row reconciliation, other required indexes/migrations, provider callbacks/webhooks/receipts, storage/scanner/worker health. All nine Chapter 12 activation tasks remain unverified.

The exact blocker IDs, affected flows/files, owner action and acceptance criteria are listed in [the remaining blocker register](FIRST_BATCH_FRONTEND_REMAINING_BLOCKERS.md). The **19/14/7/1** reconciliation covers the original 41 rows only; the list above separately identifies frontend/configuration/staging follow-up rather than double-counting it.

## Security and financial findings

- The selected profile and backend authorization remain authoritative; 403 is not treated as logout. Profile-scoped caches/subscriptions and private viewers are cleaned by the existing cross-pass integration. Pass 17 added no permission inference.
- Bound step-up retains exact method/path/body/profile/session binding; file uploads remain byte-bound. No challenge replay or generic retry was introduced.
- Payment/provider redirects are not success; `outcome_unknown` retains references and uses supported reconciliation. No new attempt, real payment, refund, escrow release, ownership or verification state was created.
- Public/private projections remain separated. The operational custody workflow is not exposed as a public or first-batch owner route.

## Readiness and recommended next actions

| Readiness layer | Result | Evidence / next gate |
|---|---|---|
| Source integration | **PARTIAL, largely source-wired** | 19 Chapter 17 journeys mapped; all 11 former Pass 16 branch gaps now have focused tests. Resolve frontend follow-up and the listed contract gates. |
| Mock-tested | **PARTIAL** | Focused tests pass under the bundled runtime. Tests do not prove deployed authorization, persistence, provider settlement or cross-role delivery. |
| Staging acceptance | **NOT YET ACCEPTED** | Execute the lettered stages in [the acceptance plan](FIRST_BATCH_STAGING_ACCEPTANCE_PLAN.md) only after environment/configuration/security/finance/privacy prerequisites are evidenced. All scenarios are not run. |
| Production | **NOT READY / NOT CLAIMED** | Requires approved decisions, all relevant deployment evidence, successful authorized staging acceptance, monitoring and release-owner signoff. |

Recommended next actions: resolve P0/P1 contract and security blockers first; provide evidence for the nine deployment tasks; obtain product decisions without client guesses; then run Stage A/B before reversible and protected scenarios. Financial and destructive privacy scenarios remain held until their explicit gates are satisfied.

## Final readiness gates

The source can proceed to authorized staged acceptance only after the exact operational prerequisites are confirmed. Production readiness is blocked by unresolved contract/product work, provider and storage configuration, approved policies, deployment migrations/indexes and staged security/financial acceptance. No client-only feature flag substitutes for server-owned capability status.

See:

- [Pass 17 workflow coverage](END_TO_END_FRONTEND_WORKFLOWS_PASS17.md)
- [Remaining blocker register](FIRST_BATCH_FRONTEND_REMAINING_BLOCKERS.md)
- [Staging acceptance plan](FIRST_BATCH_STAGING_ACCEPTANCE_PLAN.md)
- [Configuration gates and decisions](CONFIGURATION_GATES_AND_OPEN_DECISIONS_PASS12.md)
- [Mounted endpoint coverage](MOUNTED_ENDPOINT_INDEX_PASS14.md)
- [DTO coverage](API_DTO_AND_SCHEMA_REFERENCE_PASS15.md)
- [Response variation coverage](API_RESPONSE_VARIATION_MATRIX_PASS16.md)

The complete integration process is **PARTIAL**, not COMPLETE: local source and mocked behavior do not establish live authorization, data isolation, provider settlement, deployment readiness or operational safety.
