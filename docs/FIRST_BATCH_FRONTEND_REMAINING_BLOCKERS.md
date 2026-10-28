# First-Batch Frontend Integration — Remaining Blockers

**Date:** 26 October 2026
**Scope:** unresolved items after Pass 17, derived from the 41-row post-remediation reconciliation, Chapter 12 and Pass 13 acceptance gates. No backend repository or deployment was inspected.

## Reconciled 41-item status

The detailed source table contains 41 blocker IDs: **19 COMPLETE, 14 PARTIAL, 7 BLOCKED, 1 DEFERRED**. Completed rows remain visible in the historical reconciliation. This document lists the 22 rows that still carry a dependency; Pass 17 did not reclassify them.

## Detailed blocker dispositions

The 41-row reconciliation remains the historical source for the original issue and backend remediation result. The table below adds current affected workflow, frontend evidence, accountable owner class, required next action and a verifiable closure criterion. Priority uses the established P0 security/financial, P1 core journey, P2 supporting, P3 deferred/product convention.

| ID / current status | Affected workflow and UI | Relevant frontend evidence/files | Missing requirement → owner action | Priority / owner | Acceptance criterion |
|---|---|---|---|---|---|
| B07-01 — PARTIAL | WF17-13/17, buyer/developer escrow and installments | `src/services/escrowService.ts`, `src/pages/dashboard/Escrow/EscrowDetails.tsx`, `src/pages/dashboard/Installments.tsx` | Legacy participant operation-specific bodies, step-up/state variants → publish exact per-route contracts; connect only the supported operations. | P0 — backend contract + finance | Each mutation submits the specified profile/version/step-up data; pending/settled outcomes are distinct in focused and authorized staging tests. |
| B06-01 — PARTIAL | WF17-03/05/12, owner title/evidence and operational title files | `src/utils/titleUploadStepUp.ts`, `src/services/documentService.ts`, `src/pages/dashboard/Landlord/LandlordTitleVerifications.tsx` | Broader title asset/survey/custody flows and private storage/scanning → specify authorized UI scope and verify storage/scanner deployment. | P0 — frontend + backend/operations | Exact bytes/metadata are challenge-bound; changed file cannot reuse challenge; scan/private access tested; no public URL fallback. |
| B01-01 — PARTIAL | WF17-01, login | `src/services/authService.ts`, `src/contexts/AuthContext.tsx`, `src/pages/auth/*` | `POST /api/auth/login` challenge discriminator/response missing → backend documents exact trigger, fields and failure variants; frontend then adds challenge UI. | P0 — backend contract + frontend | Login challenge and ordinary login branches have exact DTO tests; session/profile isolation remains intact. |
| B01-03 — PARTIAL | WF17-02/04, organization Team and signatory | `src/services/organizationManagementService.ts`, `src/pages/dashboard/OrganizationManagement.tsx`, `src/components/profile/AccountSecuritySettings.tsx` | Custom role/mandate lifecycle and signatory queue/detail read route → backend defines queue/target/version/read and decision DTOs. | P1 — backend contract + organization | Admin can open the correct signatory case, review authoritative data, submit permitted decision and see refreshed audit/state. |
| B05-01 — PARTIAL | WF17-08, developer Imports | `src/utils/projectImportMapping.ts`, `src/pages/dashboard/Landlord/ProjectPropertyImports.tsx` | Exact row correction and existing-unit/new-type confirmation bodies missing → backend documents full request, response and retry semantics. | P1 — backend contract + frontend | Corrected row is revalidated without duplicate successful rows; existing-unit/type decision is reviewed, submitted once and reflected in final job results. |
| B06-02 — PARTIAL | WF17-03/16, holder submission and staff KYC | `src/pages/dashboard/Landlord/LandlordVerification.tsx`, `src/pages/dashboard/Admin/KycManagement.tsx`, `src/services/verificationCaseService.ts` | Staff approval policy/check sources may be absent → policy owner publishes approved per-check allowed sources; frontend keeps approval gated when unavailable. | P0 — verification policy + backend | Only policy-eligible independent staff can approve; each required check has accepted source; history shows authoritative decision. |
| B08-01 — PARTIAL | WF17-14, privacy requests | `src/services/dataProtectionService.ts`, `src/components/profile/DataProtectionRequests.tsx` | Additional correction values, general consent/history DTO, staff decision/version fields missing → backend documents schemas/actions and policy scope. | P1 — backend contract + privacy | Supported request types serialize exact fields/version; staff review can be completed from authoritative queue/detail/history; partial execution remains accurate. |
| B09-VER-01 — PARTIAL | WF17-03/16, company verification | `src/pages/dashboard/Admin/KycManagement.tsx`, `src/services/verificationCaseService.ts` | Approved `company_verification.manualSources` policy and independent-review prerequisites → policy owner activates/versions it. | P0 — policy/configuration + operations | Approval control is available only for the current allowed source on every required check and server confirms final state. |
| B09-02 — PARTIAL | WF17-01/16, staff account state | `src/pages/dashboard/Admin/ManageUsers.tsx`, `src/services/userService.ts` | Staff projection may omit target `authVersion` → backend supplies version consistently or specifies non-versioned operation. | P0 — backend DTO | Stale account mutation conflicts safely; no profile version is substituted; current account state is refreshed after decision. |
| B09-04 — PARTIAL | WF17-05/16, property moderation | `src/pages/dashboard/Admin/*Property*` and project review routes (see Pass 09/11) | Duplicate/distress/listing-review queues/details/actions incomplete → backend documents query, evidence, decision, version and response schemas. | P1 — backend contract | Authorized reviewer opens the correct case, sees allowed evidence, submits reason/version and gets authoritative refreshed state. |
| B09-05 — PARTIAL | WF17-16, trust appeals | `src/services/trustService.ts`, `src/pages/dashboard/Admin/TrustAppeals.tsx` | Bodyless trust recompute cannot be bound to JSON step-up → backend specifies a bound request representation or approved alternative. | P0 — backend security contract | Recompute cannot run without exact one-use proof; result/status is authoritative and audited. |
| B09-06 — PARTIAL | WF17-16, platform policy and gazetteer | `src/services/adminPolicyService.ts`, `src/pages/dashboard/Admin/KycManagement.tsx` | Policy-specific schema/revision/decision and gazetteer projections incomplete → backend publishes per-policy mutation/read schemas and versions. | P1 — backend/product policy | UI edits only typed approved policy; approval/version conflicts and history match contract; no arbitrary JSON setting. |
| B01-06 — PARTIAL | WF17-01, account identity verification | `src/services/authService.ts`, `src/components/profile/AccountSecuritySettings.tsx` | Alternate email event/history variants and phone provider policy → frontend connects only exact documented email operation; operations confirms Termii/provider state. | P2 — frontend + configuration | Email verification method follows exact DTO; phone delivery is shown active only with provider-backed status and returned event history. |
| B09-08 — PARTIAL | WF17-16, admin virtual-tour settings | `src/components/virtualTour/AdminVirtualTourSettings.tsx`, `src/services/virtualTourService.ts` | No admin settings GET for initial revision or complete history → backend documents read/version/history, frontend adds revision-aware UI. | P2 — backend contract | First write carries authoritative expected revision; later history shows server versions; stale writes require review. |
| B07-02 — BLOCKED / PRODUCT | WF17-11, paid/live tour subflow | `src/services/tourService.ts`, `src/pages/dashboard/Buyer/ServiceCart.tsx` | Paid price, schedule/live-session and settlement model absent → product/finance owners decide and backend supplies compatible purchase contract. | P3 — product + finance/backend | Do not enable until complete purchase contract and sandbox acceptance; `FEATURE_PAID_TOUR_UNAVAILABLE` stays fail-closed. |
| B01-04 — BLOCKED / DTO | WF17-04, seat plans and payout bank selection | Organization Team/settings; no plan/bank selector exposed | `plans[]` item schema and bank-directory route/DTO missing → backend supplies plan projection and directory contract; operations enables approved provider/policy. | P1 — backend DTO + configuration | User can compare only authoritative plans/banks, submit exact body and reload persisted result; provider unavailable state is explicit. |
| B06-03 — BLOCKED / SPECIFICATION | WF17-05/12, listing verification | No listing-verification upload/submission control | Preflight route/body/response, route MIME/size limits and requirements/evidence composition missing → backend supplies full specification before UI is enabled. | P1 — backend specification | Preflight authorizes exact file class/size and fields; upload and decision refresh status without implying approval. |
| B07-05 — BLOCKED / SPECIFICATION | WF17-13/17, buyer ownership and developer sales | `src/services/ownershipService.ts` and existing buyer ownership pages | Ownership history/transfer states, authorized detail projection and aggregate scope missing → product/legal/backend define semantics and projection. | P0 — product/legal/backend | Server-authoritative ownership detail/history/transfer and sales figures have explicit authorization, version and terminal-state tests; no payment inference. |
| B03-02 — BLOCKED / SPECIFICATION | WF17-05/06/12, media entitlement | `src/utils/canonicalFieldRegistry.ts`, canonical editor sources | Per-item public/private mutation, inheritance and read projection absent → backend/product specify, then frontend implements runtime-authorized controls. | P1 — backend/product | Owner sees effective/source access; only allowed override/reset mutation is sent; public view cannot expose private media. |
| B03-03 — BLOCKED / PRODUCT | WF17-06, construction-stage form/grid | Canonical registry and field coverage matrix | 15 named versus 16 stated milestone count → product/backend select canonical value set. | P2 — product | Correct dictionary/DTO and labels agree; valid values round-trip; no speculative enum item. |
| B09-11 — BLOCKED / SPECIFICATION | WF17-16/17, admin dashboard | Existing Admin Dashboard; only documented aggregates are displayed | Metric names/scope/windows/authoritative aggregate DTO missing → backend/product define. | P2 — backend/product | Each card is backed by a documented aggregate with scope/time window; no paginated-slice total. |
| B10-01 — DEFERRED | Cross-pass error/retry behavior | `src/lib/axios.ts`, endpoint-specific service/error tests | Handoff has no universal error envelope or retry rule → continue per-endpoint contract review; deferred as stated. | P2 — deferred specification | Each actionable route has endpoint-specific documented response/retry semantics; no unsafe global retry or fictional code. |

## Additional frontend-owned follow-up outside the 41 rows

| ID / status | Affected workflow | Files / action | Acceptance criterion |
|---|---|---|---|
| F10-01 — PARTIAL | Cross-pass stale request/profile/logout handling and version conflict review | `src/lib/axios.ts`, route/module resource hooks, profile/realtime contexts. Finish targeted stale-response/cancellation review and improve per-module review UX where it materially blocks recovery. | Route/profile/logout changes invalidate old requests; stale response/event cannot repopulate private state; conflict retains intended draft and requires review; no broad automatic mutation retry. |
| C04-01 — BLOCKED BY LOCAL CONTRACT GAP | WF17-10, accounts-followed search and follow-list management | Chapter 14 mounts `GET/POST/DELETE /api/personalisation/following`; Chapter 04 documents only the `fromAccountsIFollow` search filter and provides no following list/mutation DTO. No follow-management service/UI is added until request/response and visibility rules are documented. | Backend publishes exact list/create/delete DTOs and authorization/response counts; frontend then connects manage-follow UI and synchronizes returned membership/counts without inventing profile data. |

F10-01 is frontend-owned and C04-01 is a contract gap. Neither is counted in the 41-row remediation reconciliation. Source-specific gaps should be split into separate follow-ups only when a reproducible case is identified.

| ID | Pass / area | Current classification | Exact remaining dependency |
|---|---|---|---|
| B07-01 | 07 — participant escrow | PARTIAL | Some legacy participant mutation request DTOs and operation-specific states remain outside connected paths; live provider acceptance is not verified. |
| B06-01 | 06 — title/evidence | PARTIAL | Broader title-asset, registered-survey and staff/operator custody UI is not connected; private storage/scanning is a deployment gate. Ambiguous uploads remain non-retryable until status is resolved. |
| B01-01 | 01 — login MFA | PARTIAL | `POST /api/auth/login` lacks the exact first-login MFA challenge discriminator/response needed to render the challenge branch. Do not guess it. |
| B01-03 | 01 — organization authority | PARTIAL | Custom roles and mandates remain incomplete; staff signatory review has a mutation route but no queue/detail read route. |
| B05-01 | 05 — imports | PARTIAL | Exact correction and explicit existing-unit/new-unit-type confirmation bodies are not fully documented. Keep those submissions unavailable. |
| B06-02 | 06 — verification decisions | PARTIAL | Staff approval requires a complete active `company_verification.manualSources` policy and check-specific source rules; absence must continue to disable approval. |
| B08-01 | 08 — privacy request variants | PARTIAL | Additional correction fields, general consent/history DTO, and staff decision request/version fields remain unspecified. |
| B09-VER-01 | 09 — company verification | PARTIAL | Approval remains unavailable absent an approved policy enumerating an allowed source for each required check and independent reviewer conditions. |
| B09-02 | 09 — account administration | PARTIAL | Account status mutation needs the target account's `authVersion`; profile version is not a substitute. |
| B09-04 | 09 — property review | PARTIAL | Duplicate, distress and listing-review queues/detail/action projections are incomplete for connecting every reviewer action. |
| B09-05 | 09 — trust appeals | PARTIAL | Trust recompute's bodyless route lacks a documented representation for bound JSON step-up; do not bypass binding. |
| B09-06 | 09 — policies/gazetteer | PARTIAL | Per-policy schemas, complete revision/decision projections and gazetteer entry/status revisions are not one reusable editable contract. No arbitrary JSON editor. |
| B01-06 | 01 — alternate email/phone | PARTIAL | Email verification UI still uses the existing token path; event history and provider configuration do not establish every alternate method or phone delivery. |
| B09-08 | 09 — virtual-tour settings | PARTIAL | Admin settings lack an initial revision read and complete history UI; protected writes can only use a version returned by an earlier response. |
| B07-02 | 07 — paid/live tours | BLOCKED — PRODUCT DECISION | Product must define price, scheduling/live-session and settlement semantics. `FEATURE_PAID_TOUR_UNAVAILABLE` remains a capability stop, not a transient retry. |
| B01-04 | 01 — seat/payout plans | BLOCKED — LOCAL DTO GAP | Seat-plan `plans[]` item schema and bank-directory read/DTO are absent; provider/policy activation is separate. |
| B06-03 | 06 — listing verification | BLOCKED — LOCAL CONTRACT GAP | No preflight endpoint/body/response; route-specific MIME/size policy and requirements/verification fields for safe evidence selection are missing. |
| B07-05 | 07 — ownership/sales | BLOCKED — MISSING SPECIFICATION | Ownership history/transfer state machine, authorized detail projection and developer sales aggregate scope are not specified. |
| B03-02 | 03 — media entitlement | BLOCKED — MISSING SPECIFICATION | Per-media-item public/private mutation, inheritance and read projection semantics are absent. |
| B03-03 | 03 — construction milestone | BLOCKED — PRODUCT DECISION | Resolve 15 listed values versus 16 stated milestones before accepting another enum value. |
| B09-11 | 09 — admin metrics | BLOCKED — MISSING SPECIFICATION | Define metric names, scope, time windows and authoritative aggregate DTO before adding cards or totals. |
| B10-01 | 10 — route-specific error/retry contracts | DEFERRED | The handoff expressly does not define one universal envelope/retry policy. Continue endpoint-specific review; do not fabricate a generic rule. |

## Additional cross-pass and operational gates

These are configuration, deployment or acceptance dependencies rather than extra entries in the 41-row contract inventory.

### Product and specification decisions

- Paid/live virtual-tour model, settlement and scheduling (`B07-02`; Chapter 12 X12-01).
- Ownership transfer/history semantics and developer sales aggregate definitions (`B07-05`; X12-02).
- Construction milestones: 15 named values versus 16 stated (D12-01 / B03-03).
- Numeric duplicate-size tolerance (D12-02).
- Versioned recommendation weights, completeness criteria and Sponsored policy (D12-03).
- Nearby radius, cadence, site-plan semantics, gazetteer/boundary licensing, FX source/fallback and verification/freshness thresholds (D12-04).
- Per-media access/entitlement semantics and complete administrative dashboard metrics (B03-02 / B09-11).

No decision was selected by the frontend.

### Chapter 12 deployment activation tasks

All nine remain **unverified** because no deployment evidence was available:

1. Approved private storage, encryption keys, scanner and protected renderer resources.
2. Approved/licensed gazetteer and boundary data; Mapbox activation only after licensing/data-handling approval.
3. Approved FX source, rates and freshness policy.
4. Approved Console ranking, completeness, sponsored placement, alert cadence, trust and freshness policies.
5. Approved nearby radius and duplicate-size tolerance.
6. Verified seat/publication plans, Paystack credentials and webhook; payment-attempt uniqueness index deployment and pending-row reconciliation.
7. Notification providers and verified delivery receipts.
8. Legal approval of retention schedule before deletion execution.
9. Required indexes, migrations and existing-record reconciliation through deployment procedures.

Chapter 12's payment unique-index requirement is specifically a production concurrency dependency. No database or migration was inspected.

## Pass 17 scope findings

- The new tests close the focused-assertion gap for 11 Chapter 16 consumer rows but do not establish live response acceptance.
- One failed mutation now leaves typed message/evidence/dispute input intact; only the exact report-not-found 404 is treated as an absent report.
- The Chapter 17 private-file custody workflow remains intentionally without a first-batch user-facing UI; a separate approved operations-console scope is required.
- Proxy inspection is adjacent functionality; Chapter 17 conditions inclusion on approved-release scope. Provider activation and approved fee policy are not evidenced.

## Required disposition

Backend/product/configuration owners should resolve the exact row above. Frontend follow-up should occur only against a complete local contract or approved deployment state. Until then, keep affected controls disabled or show the documented unavailable/pending state; do not infer success, permission, delivery, ownership, verification or settlement.
