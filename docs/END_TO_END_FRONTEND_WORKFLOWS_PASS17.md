# End-to-End Frontend Workflows — Pass 17

**Date:** 26 October 2026
**Scope:** Chapter 17 workflow playbooks, source-level UI/API trace, focused mock tests and current cross-pass blockers. Frontend repository and locally copied handoff only. No backend source, live API, payment provider, private production document or deployment was accessed.

## Executive summary

Chapter 17's **19 workflows** were traced to the relevant routes, services, contracts and evidence reports. At the frontend source boundary, **one workflow is complete for its explicitly supported request-viewing scope**, **17 remain partial end-to-end**, **zero complete user-facing journeys are wholly blocked at their entry point**, and **one internal private-file custody workflow intentionally has no first-batch user-facing screen**. Several steps inside the partial journeys remain contract-, policy-, product- or deployment-blocked. Partial means that supported steps are connected but those dependencies prevent declaring the whole journey complete. This is not a claim that all listed source behavior was tested against a live backend.

The Pass 16 response-branch test gap was addressed during this pass: all 11 previously partial matrix rows now have focused mock assertions. A report loader was also extracted so only the documented “inspection report not found” 404 becomes an absent draft, and failed proxy mutations now preserve message, evidence and dispute drafts. The precise verification results are below.

### Initial coverage before Pass 17 edits

The initial source audit found the same 19 Chapter 17 workflows with existing route/service integration from Passes 01–16: one was complete for its documented supported scope, 17 were partially connected end-to-end, and the private-file custody workflow had no first-batch user-facing route. The 11 Chapter 16 response rows listed below were source-traced but lacked dedicated branch assertions. Two frontend-owned defects were confirmed in the adjacent proxy workflow: failed mutations could be reported as successful to draft-clearing callbacks, and report-read errors were all treated as an absent draft. The final scope classification remains 1 / 17 / 1 because the fixes address recovery and evidence, not the independent product/contract/deployment gates.

Stable workflow IDs are `WF17-01` through `WF17-19`, corresponding in order to the numbered Chapter 17 inventory below.

Evidence labels used here:

- **Documented:** contract or workflow exists in the local handoff.
- **Source verified:** route, service and consumer were inspected in this checkout.
- **Mock tested:** a local focused test exercises the stated branch.
- **Live accepted:** an authorized deployed backend acceptance run. **None was performed.**

## Workflow coverage

| # | Chapter 17 workflow | Roles and frontend entry | Route/API trace | Current source-level result and remaining dependency |
|---:|---|---|---|---|
| 1 | Register, sign in, initialize account | Visitor/user; `/register`, `/login`, profile switcher, `/dashboard` | Registration/login, account initialization, account profiles, `/api/profiles/current` | **PARTIAL.** Session/profile path is connected and protected state is cleared on 401. The initial-login MFA discriminator/response from `POST /api/auth/login` remains unspecified; no challenge branch is guessed. |
| 2 | Switch profile and organization workspace | Multi-profile user/organization admin; profile switcher, Organization Team, Account Security | Current-account/profile reads, selected-profile requests, roster/invitation/permission reads | **PARTIAL.** Current profile is reloaded and profile-scoped state is invalidated. Custom role/mandate lifecycle and staff signatory queue/read projection remain incomplete; seat-plan schema is separately blocked. |
| 3 | Individual verification and evidence | Holder and authorized staff; Landlord → Verification, Admin → KYC | Current-profile case, evidence policy/upload/content and case read/history/claim/decision routes | **PARTIAL.** Supported byte-bound uploads and holder case submission/status are connected. Staff approval remains policy/check-source gated; evidence storage/scanning is a deployment gate. Upload does not imply approval. |
| 4 | Organization onboarding, seats and signatories | Organization admin/signatory/staff; organization profile, Team and Account Security | Organization profile, roster/invites, applicant signatory and documented case routes | **PARTIAL.** Roster/invitation/applicant-signatory slices are connected. Plan item DTO/bank directory, mandate lifecycle and a staff signatory queue/detail route are not sufficiently specified. |
| 5 | Seller creates and publishes a standalone property | Owner/editor; `/dashboard/landlord/add-property`, edit/detail, My Properties | Field dictionary, property create/changed-only update, media, readiness and documented publish/archive routes | **PARTIAL.** Draft/edit/media/readiness and supported publication paths exist. Full public/effective field projection, some verification/readiness policies and live authorization acceptance remain. Server readiness is authoritative. |
| 6 | Developer creates project, types and units | Developer; `/dashboard/landlord/projects/new`, project manage/editor, Add Property | Project CRUD, nested project unit-type CRUD/list/impact, project-scoped unit creation, unit grid | **PARTIAL.** Supported project → type → unit management is connected. Canonical coverage is intentionally a supported subset; unresolved construction-stage count and per-media entitlement semantics remain. No unsupported generic type archive/detail route is assumed. |
| 7 | Edit price and availability | Owner/developer; property detail and project unit grid | Versioned price/availability mutations, history/readiness and ownership state reads | **PARTIAL.** Supported versioned operations preserve explicit currency/POA and use server response; Sold is not a client availability target. Ownership/transfer semantics and live conflict acceptance remain dependencies. |
| 8 | CSV/XLSX import | Authorized developer; project → Imports | Import upload/session/preview/mapping/confirmation/job/poll/cancel/retry endpoints | **PARTIAL.** Strict documented mapping, staged preview, durable job status, partial outcomes, cancellation and supported retry are connected. Exact explicit existing-unit/new-type confirmation and row-decision bodies remain blocked; no ambiguous submission is blindly repeated. |
| 9 | Unit grid, bulk mutation and undo | Developer/editor; Project Manage → Unit Grid | Paginated grid, bulk job, status/cancel and operation undo routes | **PARTIAL.** Versioned selected-row jobs, row outcomes, bounded polling, cancellation and returned `undoAvailable`/`undoExpiresAt` are connected. Live job/expiry behavior and policies are not accepted; unknown outcomes are status-checked. |
| 10 | Search, map, saved search and alerts | Visitor/buyer; `/properties`, project map and saved-search controls | Canonical catalogue/map/facets/location and personalisation search routes plus notifications | **PARTIAL.** URL state, list/map reads, suggestions and revision-aware saved search are connected. Ranking, alert cadence/provider delivery, routing/FX and some configuration states remain server-policy/deployment dependent; missing values are not converted to zero. |
| 11 | Request a viewing | Buyer/owner; property detail and buyer Tours | `POST /api/tour`, `GET /api/tour`, `PATCH /api/tour/:id` | **COMPLETE within documented non-paid request/list/status scope.** Conflict and bare-array/header paging are handled. No slot-calendar or cancellation route is invented. `virtual_paid` remains unavailable with `503 FEATURE_PAID_TOUR_UNAVAILABLE`; this does not make the supported request flow unavailable. |
| 12 | Protected document access | Buyer/owner/authorized staff; document controls on relevant detail/settings pages | Document metadata/access request/viewer-session and protected viewer-content routes | **PARTIAL.** Protected content stays on authenticated, profile-scoped viewer routes; arbitrary storage URLs are rejected. Storage, scanner, renderer and document entitlement deployment/policy gates remain. |
| 13 | Cart, checkout, payment and ownership | Buyer; Property Details, Service Cart, payments/ownership areas | Cart validation, `/api/cart/checkout/initialize`, payment verification/status/history, ownership projections | **PARTIAL.** Bound step-up, frozen request body, durable attempt references, provider return verification and `outcome_unknown` recovery are source wired. Unique-index deployment/provider sandbox and ownership detail/history/transfer specification remain; redirect is not proof and payment is not ownership. |
| 14 | Privacy data access/correction/deletion | Profile holder and authorized privacy staff; privacy settings/history | Profile-scoped data-protection request, status/execution/history and documented staff routes | **PARTIAL.** Supported request submission/history and grouped outcomes are represented. Staff decision/reconciliation request/version fields, correction variants, retention/legal-hold policy and execution worker remain dependencies. Accepted request is not completed deletion. |
| 15 | Notifications and sockets | Authenticated profile; notification center and `/messages/:conversationId` | Notification list/preferences/actions; documented Socket.IO connection/events; REST history/reconciliation | **PARTIAL.** Profile-scoped REST/realtime reconciliation and cleanup are wired. External email/SMS/push receipt and device-token acquisition remain provider/contract gates; socket activity is not fabricated as delivery/read receipt. |
| 16 | Staff verification, moderation and policy | Authorized staff; `/dashboard/admin/*`, KYC, title review and moderation | Department queues, claims, evidence viewer, protected decisions and policy routes where specified | **PARTIAL.** Supported claim/rejection/moderation/review paths use versions, step-up and refresh where documented. Company approval policy, duplicate/distress/listing-review DTOs, some policy revisions and signatory decisions remain blocked. |
| 17 | Finance reconciliation | Finance-authorized staff; Admin Wallet, Escrow Disputes, payment detail | `/api/admin/wallet`, `/wallet/transactions`, escrow dispute list/detail/resolve/refund recovery | **PARTIAL.** Optional aggregates remain absent, explicit zero is preserved, server-provided `availableActions` and 202 pending states are respected. Provider settlement, production authority and payment-attempt index deployment are not verified. |
| 18 | Private-file custody/reconciliation | Operational/compliance/storage staff; no first-batch user route | Internal private migration/custody source, prepare/review/revocation/movement/status routes | **NOT IMPLEMENTED in the first-batch user-facing frontend by scope.** Chapter 14/16 identify this family as operational/internal; no operations console, provider locator UI or public URL fallback was invented. Requires separately approved operations-console scope, policy and deployment acceptance. |
| 19 | Proxy-inspection request through completion | Buyer, inspector and admin; `/buyer/proxy-inspections/new`, `/buyer/proxy-inspections/:requestId`, `/proxy/tasks/:requestId`, `/admin/proxy-inspections/:requestId` | Request/list/detail, price confirmation, payment verify, schedule/start, evidence/report/completion/dispute/review and admin actions | **PARTIAL / adjacent release gate.** Participant and admin UI is source-wired, including protected actions and pending settlement. Chapter 17 says build only if the partner service is in the approved release; fee policy/provider activation and live acceptance are not evidenced. Pass 17 also adds safe report-404 handling and draft retention on rejected mutations. |

The Chapter 17 workflow order and scope above follow the local playbook. It is an orchestration document; exact per-operation request/response and authorization contracts continue to come from Chapters 01–16.

## Role-by-role coverage and UI reachability

| Role | Connected entry points | Coverage and cross-role handoff |
|---|---|---|
| Visitor | `/properties`, project discovery, property detail | Can search, restore URL state, inspect public detail and submit supported non-paid viewing requests. Authenticated save/favorite paths depend on an authorized current profile. |
| Buyer | Property detail, Service Cart, payment/ownership areas, Tours, `/buyer/proxy-inspections/new`, `/buyer/proxy-inspections/:requestId`, `/messages/:conversationId` | Cart/payment references and proxy inspection status are server-derived. Provider return is verified. Pending payment does not grant ownership; notification delivery is not inferred. |
| Owner / landlord | `/dashboard/landlord/add-property`, My Properties, edit/detail, Verification and Title Verification | Draft, supported edits, media, readiness, archive and protected title/evidence paths are connected. Listing-verification preflight and some review outcomes remain blocked. |
| Developer | `/dashboard/landlord/projects/new`, project management/editor, project Imports and Unit Grid | Project/type/unit editing, import job lifecycle, grid operations and readiness are connected in the documented subset. Import row-decision bodies and product enums remain. |
| Organization admin / signatory | Organization Team and Account Security | Member/invitation and applicant signatory slices connect to member token claim and profile state. Seat plans, bank directory, mandates and staff signatory review are not completed. |
| Staff / administrator | `/dashboard/admin/*`, Admin KYC, Title Review, Wallet, Escrow Disputes, moderation | Documented reads and protected action subsets use current server projections and refresh. Policy-gated approval, unspecified queues and some decision contracts remain disabled. |
| Operational custody staff | No first-batch user route | Chapter 17's private-file custody sequence remains an internal operational workflow, intentionally not represented as a user-facing screen. |

The current route table and matched HTTP patterns remain traceable in [Pass 14](MOUNTED_ENDPOINT_INDEX_PASS14.md) and role-specific workflow evidence in [Pass 11](FRONTEND_INTEGRATION_CHECKLIST_PASS11.md). Pass 17 added no routes. The buyer/inspector/admin proxy routes were checked directly; the new report-loader and conflict/error paths have focused route/component tests.

## Service integration and cross-role continuity

| Cross-role sequence | Source-connected path | Remaining boundary |
|---|---|---|
| Owner submits property → staff review → owner/public state | Owner property draft/readiness/publish and documented admin property/project review screens | Duplicate/distress/listing-verification review projections are incomplete; do not claim every property review transition works. |
| Developer creates project/units → staff project review → public discovery | Project editor/type/unit/grid and Admin Projects; public catalogue/map uses backend projection | Publication readiness remains backend-owned; project/owner authorization and live publication have not been accepted. |
| Holder submits evidence/case → staff claims/reviews → holder sees state | Landlord Verification and Admin KYC case detail/history | Staff approval remains subject to active policy/manual-source requirements and separate reviewer; evidence upload is not approval. |
| Organization admin invites → member claims → permissions refresh | Organization Team invite/claim and profile switch/current permissions | Custom roles, mandates, seat plan and signatory review remain incomplete; no email-domain permission inference. |
| Buyer requests proxy inspection → inspector schedules/reports → buyer confirms/disputes → admin resolves | Buyer, inspector and admin proxy routes, shared service, protected actions and refresh | Adjacent release approval, fee policy and provider acceptance are not evidenced. A success response is not treated as payout settlement. |
| Buyer initializes payment → provider return → backend verifies → ownership display | Property/cart payment initialization, reference preservation, verification and ownership reads | Unique index/provider deployment and ownership history/transfer specification remain; no frontend-created ownership. |

### Test evidence by workflow

These are representative existing focused tests, not exhaustive proof of the full journey. All were run in prior passes unless identified as new Pass 17 evidence; no live backend workflow test exists.

| Workflow ID | Focused source test evidence |
|---|---|
| WF17-01 | `src/contexts/AuthContext.test.tsx`, `src/pages/auth/Register.test.tsx`, `src/services/authService.test.ts` |
| WF17-02 | `src/services/profileService.test.ts`, `src/services/organizationManagementService.test.ts` |
| WF17-03 | `src/services/verificationCaseService.test.ts`, `src/utils/verificationCaseSubmission.test.ts`, `src/utils/titleUploadStepUp.test.ts` |
| WF17-04 | `src/services/organizationManagementService.test.ts`, `src/services/profileService.test.ts` |
| WF17-05 | `src/components/property/PropertyForm.structuredFacts.test.tsx`, `src/components/property/PropertyForm.paymentTypes.test.tsx`, `src/services/propertyService.projectAssociation.test.ts` |
| WF17-06 | `src/services/projectService.test.ts`, `src/services/projectService.gridJobs.test.ts`, `src/components/project/UnitGridPanel.test.tsx` |
| WF17-07 | `src/services/propertyService.paymentTypes.test.ts`, `src/services/projectService.gridJobs.test.ts` |
| WF17-08 | `src/utils/projectImportMapping.test.ts`, `src/utils/projectImport.test.ts`, `src/pages/dashboard/Landlord/ProjectPropertyImports.test.tsx` |
| WF17-09 | `src/components/project/UnitGridPanel.test.tsx`, `src/services/projectService.gridJobs.test.ts` |
| WF17-10 | `src/services/personalisationService.test.ts`, `src/utils/savedSearchQuery.test.ts`; Pass 12 also records map/gazetteer tests. |
| WF17-11 | `src/services/tourService.test.ts` |
| WF17-12 | `src/utils/titleUploadStepUp.test.ts`; Pass 14 records protected viewer-route tests. |
| WF17-13 | `src/services/paymentService.test.ts`; Pass 13/16 include cart, checkout return, escrow and unknown-outcome focused evidence. |
| WF17-14 | `src/services/dataProtectionService.test.ts` |
| WF17-15 | `src/utils/messageDeduplication.test.ts`; profile-scoped realtime coverage is recorded in Passes 08, 11 and 13. |
| WF17-16 | `src/services/verificationCaseService.test.ts`, `src/components/proxyNetwork/AdminKycMediaViewer.test.tsx`; admin contracts/tests are itemized in Pass 09/11. |
| WF17-17 | `src/pages/dashboard/Admin/AdminWallet.test.tsx`, `src/services/escrowService.test.ts` |
| WF17-18 | No first-batch user-facing UI or frontend test by design; operations-console scope is separate. |
| WF17-19 | `src/services/proxyNetworkService.test.ts`, `src/components/proxyNetwork/ProxyWorkspace.pricing.test.tsx`, `src/pages/proxyNetwork/ProxyWorkspaces.test.tsx`; these Pass 17 runs exercise all 11 previously partial response rows. |

## Workflow state-machine findings

- Draft → submitted/review → published states are not collapsed: review acceptance is not shown as publication unless the server's state says so.
- Imports and durable grid jobs distinguish queued/running/partial/terminal, preserve operation references, and use server row outcomes. Undo is shown only using returned `undoAvailable`/`undoExpiresAt`.
- Evidence processing and verification decisions remain separate. Staff approval only appears when returned policy/check data makes it eligible.
- Payment initialization, provider return, verification, reconciliation and ownership are separate states. Cancellation is not refund; resolution acceptance is not escrow settlement.
- Realtime events remain invalidation hints followed by REST reconciliation; delivery/read states are not invented.
- Proxy proposal, funded, scheduled, in-progress, buyer-confirmation, release-pending, dispute and completion states remain distinct. Pass 17 tests ensure a rejected mutation does not clear a draft and a reload failure after accepted message does not leave the acknowledged message available for duplicate submission.

## UI/test infrastructure boundary

The repository provides Vitest, Testing Library and jsdom component/service testing. `package.json` has no Playwright, Cypress or Puppeteer dependency/configuration, so no browser automation was introduced. Pass 17 used focused component and service tests; role switching across separate real sessions, responsive browser flows, provider callbacks and full cross-role staging transitions remain in the acceptance plan.

## State, authentication and recovery review

- **Session/profile:** existing auth context sends the selected profile, clears private state on session invalidation and leaves 403 as permission feedback. Initial-login MFA remains blocked by the missing login challenge discriminator. No new auth behavior was introduced here.
- **Bound step-up:** existing JSON and byte-bound flows retain the documented method/path/body/profile/session binding and one-use behavior. Proxy admin, payment, title, grid and privacy controls remain bound where their contracts require it. Pass 17 did not weaken or replay a challenge.
- **Asynchronous state:** 202/queued, processing, partial, unknown, and terminal outcomes remain distinct in earlier integrations. Pass 17's proxy test branches assert that accepted completion enters buyer review/release-pending rather than payout settlement.
- **Conflicts/retries:** known 409 branches refresh server state and preserve user changes. No automatic retry was added. If a proxy mutation returns server success but detail reload fails, the UI now reports the accepted action plus refresh failure, prevents duplicate message resubmission by clearing the acknowledged draft, and keeps refresh available.
- **Report recovery:** only status 404 with the exact documented message `Inspection report not found` is treated as no report yet. 403 and other failures go to the route error state instead of being hidden as empty data.
- **Draft recovery:** message, evidence file/captions and dispute reason/description are retained when the mutation is rejected; the relevant drafts clear only after the mutation succeeds. An acknowledged action is not made retryable just because a subsequent read fails.

## Security and financial safety findings

- Profile selection and backend authorization remain authoritative; route visibility is not a substitute for permissions. No private custody URL, private evidence URL or cross-profile cache behavior was added.
- Bound TOTP is preserved for protected mutations. Uploads remain separate from verification decisions; staff policy prerequisites are not bypassed.
- Provider redirects are not payment evidence. Pending/unknown payment references remain recoverable through documented status reads; no replacement attempt, real payment, refund or escrow release was initiated.
- Payment status does not create ownership. Confirmed ownership remains a backend projection; transfer/history semantics are still unspecified.
- Paid/live tour purchase controls remain disabled and `FEATURE_PAID_TOUR_UNAVAILABLE` remains a capability/product state rather than a generic transient error.

## Pass 16 response branch follow-up

All 11 rows formerly missing dedicated branch assertions now have focused test evidence:

| Variation row | Branch asserted | Test file(s) |
|---|---|---|
| M16-30 | Stale price proposal 409 reloads; no success state | `src/components/proxyNetwork/ProxyWorkspace.pricing.test.tsx` |
| M16-33 | Future local appointment serializes to UTC; server schedule is refreshed | `src/services/proxyNetworkService.test.ts`, `src/components/proxyNetwork/ProxyWorkspace.pricing.test.tsx` |
| M16-34 | Start response enters `in_progress` and reloads | `src/services/proxyNetworkService.test.ts`, `src/components/proxyNetwork/ProxyWorkspace.pricing.test.tsx` |
| M16-37 | Partial report uses PATCH; server `422 missing[]` is surfaced without success | `src/services/proxyNetworkService.test.ts`, `src/components/proxyNetwork/ProxyWorkspace.pricing.test.tsx` |
| M16-38 | Exact documented missing-report 404 is absence; 403 remains an error | `src/pages/proxyNetwork/ProxyWorkspaces.test.tsx` |
| M16-39 | Completion `422 missing[]` remains corrective, not completed | `src/components/proxyNetwork/ProxyWorkspace.pricing.test.tsx` |
| M16-40 | Buyer confirmation moves to release-pending; payout remains awaiting admin action | `src/components/proxyNetwork/ProxyWorkspace.pricing.test.tsx` |
| M16-41 | Active-dispute 409 refreshes and preserves the buyer's reason | `src/components/proxyNetwork/ProxyWorkspace.pricing.test.tsx` |
| M16-42 | Empty messages and a server-provided held notice render without fabricated messages | `src/components/proxyNetwork/ProxyWorkspace.pricing.test.tsx` |
| M16-43 | Failed send retains draft; server-acknowledged send clears it | `src/components/proxyNetwork/ProxyWorkspace.pricing.test.tsx` |
| M16-44 | Review is state-gated to completed work and refreshes after server response | `src/components/proxyNetwork/ProxyWorkspace.pricing.test.tsx` |

The 17 private-file operational rows remain intentionally unused. The Chapter 16 response matrix is representative, not exhaustive of all Chapter 14 routes.

## Pass 17 frontend corrections

- `src/features/proxyNetwork/loadParticipant.ts` holds the participant workspace load path. It translates only the exact documented report-not-found 404 into an absent report. Permission, server and unrelated not-found errors are propagated to the route error state.
- `src/components/proxyNetwork/ProxyWorkspace.tsx` mutation helper now returns an explicit success result. Message, selected evidence/captions and dispute drafts clear only after successful mutation and authoritative reload path; failures preserve input.
- Added component, service and route-helper tests for the response branches above, including failed message/evidence retention and a forbidden report read.
- No endpoint, DTO, permission or state transition was added. No dependency was installed.

## Verification and test-runner investigation

- Focused Vitest command (run with the bundled workspace Node executable):

  ```powershell
  & 'C:\Users\DELL\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --preserve-symlinks --preserve-symlinks-main node_modules/vitest/vitest.mjs run --config vite.config.ts src/components/proxyNetwork/ProxyWorkspace.pricing.test.tsx src/services/proxyNetworkService.test.ts src/pages/proxyNetwork/ProxyWorkspaces.test.tsx --reporter=dot
  ```

  Final run after all edits: **3 files / 35 tests passed, exit 0**. Vitest reported test-case count; the runner summary does not provide an aggregate executed matcher-assertion count, so none is inferred.
- `jsdom@29.1.1` is declared, locked and physically installed. The previous system-Node error was `EPERM: lstat C:\Users\DELL` followed by a misleading `MISSING DEPENDENCY jsdom`; it was a Windows path-resolution failure, not a missing project dependency. The bundled runtime plus preserve-symlink flags provides a clean focused route without installing packages or changing permissions. The historical Pass 15/16 exit-one results remain unsuccessful and are not relabeled.
- TypeScript no-emit: `npx tsc --noEmit -p tsconfig.app.json` with `NODE_OPTIONS=--preserve-symlinks --preserve-symlinks-main` — **exit 0**.
- Edited-file ESLint on the six changed TS/TSX files with `--max-warnings 0` and the same `NODE_OPTIONS` — **exit 0, zero warnings**.
- `git diff --check` — **exit 0**; only LF-to-CRLF working-copy notices.

## Remaining blockers and readiness

The detailed 41-item register remains **19 COMPLETE, 14 PARTIAL, 7 BLOCKED, 1 DEFERRED**. These figures are verified against 41 detailed rows in [the reconciliation](FRONTEND_RECONCILIATION_POST_BACKEND_REMEDIATION.md); the Pass 17 changes do not close or reclassify any of those independent contracts. The unresolved rows and exact dependencies are listed in [the final blocker register](FIRST_BATCH_FRONTEND_REMAINING_BLOCKERS.md).

Configuration/product/deployment dependencies include the nine Chapter 12 activation tasks, provider and private-storage readiness, legal retention/execution approval, payment-attempt uniqueness deployment/reconciliation, the unresolved construction-milestone value decision, paid/live tour product rules, ownership transfer/history rules, and dashboard metric definitions. The staging acceptance sequence is in [the staging plan](FIRST_BATCH_STAGING_ACCEPTANCE_PLAN.md); it is proposed and **not executed**.

**Pass 17 verdict: PARTIAL.** The source-level workflows and the previously untested response branches are documented and locally tested. End-to-end completeness is constrained by unresolved contracts, product decisions, configuration/deployment prerequisites, intentionally internal operations, and the absence of live acceptance. **Live accepted workflows: 0.**
