# Frontend Contract 02 — Identity, Access and Platform Foundations

## Scope and source availability

This pass reviewed the pasted Frontend Contract 02, `docs/section_02_api_docs.md`, the local REALTIQ PRD and consolidated Specifications, and the copied frontend handoff chapters for authentication, profiles, notifications, permissions, DTOs, response variations and workflows. Work was confined to the frontend repository. No backend source, environment file, live API, provider or payment operation was accessed.

The companion `docs/section_02_api_docs.md` is now present in the frontend checkout and was read in full. It is treated as the current mounted-route contract for this pass. Older copied handoff text still conflicts on mandate action names/body details; that discrepancy is recorded below rather than editing the copied backend handoff.

## Initial and final frontend coverage

| Area | Initial state observed | Final state after this pass |
|---|---|---|
| Account login, registration, TOTP challenge and authenticated session | Existing implementation; login challenge did not establish a session until verification | Preserved. Existing AuthContext tests cover normal/MFA session behavior and no token persistence for a pending challenge. |
| Profile list, current-profile selection and switching | Existing profile-scoped API flow and admin profile restriction; profile operations had no request-generation guard | Added latest-request/session/profile checks so older profile reads and switches cannot replace newer selected-profile state. |
| Profile creation | Kind choices existed, but structure selector exposed invalid combinations for several kinds | Structure controls now use the contract's kind-to-structure matrix. Unsupported pairs cannot be submitted, and structure resets to a supported choice when kind changes. |
| Organization membership and invitations | Member add/update/remove, invitation issue/cancel/claim existed; invitation list was only local to the page session | Invitation history loads with pagination; claim/cancel remain. Invitation creation is now disabled because the documented API has no profile-scoped policy/readiness endpoint to preflight. Delivery is described as request state, not confirmed email delivery. |
| Organization custom roles | No role API/UI in the organization screen | Added permission-key role list, create, versioned edit and versioned enable/disable flows. Active returned custom roles can be selected for membership grants. Mutations use exact-body step-up. |
| Mandates | No mandate view | Added current-profile mandate list, authority-history count/pagination, and step-up/version-bound accept, decline and revoke actions from the current companion contract. Creation remains unavailable because the resource-specific permission allowlist is not documented. |
| Signatories | Existing signatory request form in Account Security; no organization-page list | Added a current-profile signatory list. Existing request submission remains unchanged; approval remains an independent staff workflow. |
| Organization seats | No seat plans, current entitlement or purchase history view | Added server-loaded plan, seat and paginated purchase states; purchase/renewal, reconciliation and cancellation use fresh request-bound step-up. Purchase detail and audit routes are available. A payment redirect or accepted request is never shown as active access. Purchase controls require a `planKey` present in a returned plan object. |
| Admin access | Existing `GET /api/admin/access` projection and capability-driven routes; Internal Audit read-only | Preserved. No account-role-only access was added. |
| Notifications and realtime | Existing profile-keyed socket, cache clearing and notification refetch after reconnect/profile changes | Source-reviewed and preserved. Events and records are filtered by active profile; no connected-app UI was introduced. |
| Sessions, phone verification and authenticator settings | Existing account-security flows and session revocation | Source-reviewed and preserved. No access level is inferred from phone verification or profile creation. |

## Source traceability

| Source requirement | Frontend evidence | Status | Remaining dependency |
|---|---|---|---|
| PRD §3.1 and RQS-06 §2.1: account/profile/portal separation; staff profiles are system-created | `ProfileSwitcher` still excludes admin profile switching and staff profile creation. | Source verified | None for this pass. |
| PRD §3.3 and RQS-06 §2.2: one account may hold isolated profiles; switch changes workspace | `AuthContext` validates returned profile IDs, reloads current profile and guards stale async results. `RealtimeContext` scopes socket/cache data by account and selected profile. | Source verified; stale guard implemented and tested | Backend remains authoritative for cross-profile authorization. |
| Profile kind/structure pairs in Contract 02 and copied handoff 01 | `PROFILE_STRUCTURES_BY_KIND` and `ProfileSwitcher` render only supported structures. | Implemented and focused-tested | Unsupported API pairs continue to surface server errors. |
| PRD §3.4 / current rule: dashboard GET access does not require phone verification | Existing route guards do not block dashboard entry solely on `phoneVerified`. Account security retains phone verification in Settings. | Source verified | Mutations still obey server checks. |
| PRD §3.6; RQS-06 §2.2; RQS-08 §3: holder seat included, additional seats paid and access depends on entitlement | Organization screen reads returned plans, seats, purchase details/audit and uses exact purchase/renewal/cancel/reconcile DTOs. | Partial; source verified and focused-tested | Plan-item DTO is missing; Paystack/provider configuration and callback acceptance remain deployment dependencies. |
| RQS-06 §§19–21: membership, roles, invitations, mandates and authority records are profile-scoped and protected | Existing member/invitation calls preserved; role state/custom-role grants, mandate actions/history and signatory list added. | Partial; supported paths source-verified | Invitation readiness preflight and mandate permission allowlist are missing; mandate action text conflicts in older handoff. |
| PRD §18 / admin access rules: current staff profile and server-issued capability projection govern Console access | Existing Admin access service and route shell use `adminAccess.capabilities`, read-only state and `GET /api/admin/access`. | Source verified | Staff authority changes remain server-enforced. |
| PRD §18 / RQS-06 §19: policy revision activation follows server response | Existing policy management displays returned state and uses the approved response. This pass did not change policy behavior. | Source verified from current implementation | Individual policy configuration remains separately gated. |
| RQS-06 §11 / notification delivery: profile-scoped in-app records do not prove provider delivery | Existing notification UI shows API delivery/request states; realtime reconnection refetches current profile data. | Source verified | Provider activation remains a deployment gate. |
| PRD §26: connected applications are inactive until registered and enabled | No active connected-app screen or connection mutation was added. | Preserved | Partner authentication, sharing consent, webhook and payload contracts remain deferred. |
| PRD §12.5, §21 and Specifications §0.3 rule 7: accessible forms and status | New controls use labels, fieldsets, semantic section headings, status text and explicit disabled states. | Implemented at source level | A full WCAG 2.1 AA audit was not performed. |

## Exact API usage added

All calls use the existing Axios client, which supplies the current Bearer token and active `X-Profile-ID`. Protected mutations use `useBoundStepUp` and the exact method/path/body that the service submits.

- `GET /api/profiles/current/invitations?page=1&limit=20` and subsequent page values.
- `GET /api/profiles/current/roles?limit=100&includeDisabled=true` and `POST /api/profiles/current/roles/:id/state` with `{ enabled, expectedVersion }`.
- `POST /api/profiles/current/roles` with `{ name, permissions }`.
- `PATCH /api/profiles/current/roles/:id` with `{ name, permissions, expectedVersion }`.
- `GET /api/profiles/current/mandates?limit=50`.
- `POST /api/profiles/current/mandates/:id/:action` for `accept`, `decline`, or `revoke` with `{ expectedVersion }` and a bound challenge.
- `GET /api/profiles/current/authority-history?limit=25&before=<opaque-cursor>`.
- `GET /api/profiles/current/signatories?limit=50`.
- `GET /api/profiles/current/seat-plans`, `/seats`, and paginated `/seat-purchases?limit=25&before=<opaque-cursor>`.
- `GET /api/profiles/current/seat-purchases/:purchaseId` and `/api/profiles/current/seat-purchases/:purchaseId/audit?limit=25&before=<opaque-cursor>`.
- `POST /api/profiles/current/seat-purchases` with `{ membershipId, planKey, operationKey }`.
- `POST /api/profiles/current/seats/:membershipId/renew` with `{ planKey, operationKey }`.
- `POST /api/profiles/current/seat-purchases/:purchaseId/reconcile` and `/cancel` with `{}` and fresh bound challenges.

Existing profile, account, admin-access, membership, invitation, session, MFA, notification and realtime routes were retained.

## Contract and configuration blockers retained

1. **Mandate permission allowlist:** the companion defines create fields and says permission keys must come from a server mandate allowlist, but does not provide that allowlist. Creation is withheld. Older `docs/backend-api-handoff/01-auth-accounts-profiles.md` conflicts with the current companion's action enum and acceptance body. This UI uses the current companion actions (`accept`, `decline`, `revoke`) with `{ expectedVersion }`; backend acceptance of that body was not live-tested.
2. **Seat plan item DTO:** the companion confirms only a `plans` array, not the item schema. Purchase/renew controls require a returned `planKey`; no plan IDs, prices, seat quantities or renewal rules are hard-coded.
3. **Invitation readiness:** no profile-scoped route reports `profile_invitations` policy/provider readiness. Since this screen must preflight and cannot read Admin-only Console policy safely as an organization user, invite creation is disabled with an explicit explanation. Invitation history, cancellation and invitation claiming remain.
4. **Purchase audit event DTO:** detail and audit endpoints are wired. The audit contract specifies `{events,nextCursor}` but not each event's shape; UI displays the returned event count and cursor controls without guessing or rendering raw record fields.
5. **Seat operations:** payment/provider callbacks—not browser redirects—activate entitlements. Live provider acceptance was not tested; no live purchase, cancellation or reconciliation was performed.
6. **Connected apps:** partner auth, scopes, consent UI, signed-webhook handshake and payload schemas remain absent/deferred; no active connect flow is shown.
7. **Operational gates:** invitation encryption/policy/`CLIENT_URL`/email provider; approved seat policy and Paystack credentials; TOTP configuration; and verification evidence/provider policies remain backend deployment/configuration dependencies.

## Verification

- Focused Vitest: `npx vitest run --pool=threads --maxWorkers=1 src/contexts/AuthContext.test.tsx src/components/layout/ProfileSwitcher.test.tsx src/pages/dashboard/OrganizationManagement.test.tsx src/services/organizationManagementService.test.ts` — **exit 0; 4 files and 32 tests passed**.
- Wider regression attempt: `npx vitest run --maxWorkers=1 src/contexts/AuthContext.test.tsx src/components/layout/ProfileSwitcher.test.tsx src/services/organizationManagementService.test.ts src/contexts/RealtimeContext.lifecycle.test.tsx src/routes/AdminAccessRoute.test.tsx` — **exit 1**. Vitest reported 3 files/11 tests passed but also 2 unhandled worker-start errors, including a timeout starting the `ProfileSwitcher.test.tsx` fork worker. This invocation is unsuccessful and is not counted as passing.
- Edited-file ESLint on all changed `.ts`/`.tsx` files — **exit 0**.
- `git diff --check` — **exit 0**. Git emitted only LF-to-CRLF working-copy warnings.
- TypeScript no-emit (`npx tsc --noEmit --project tsconfig.app.json --pretty false`) — **exit 1 with 33 existing project diagnostics**, all outside files changed for this pass. Reported examples include policy editor/schema typing, unrelated test fixture casts, Admin route imports, escrow fixtures, proxy inspector DTOs, Landlord verification typing and user normalization. No diagnostic referenced a changed source or test file.
- No full test suite, production build, live backend request, provider call or financial operation was run.

## Completion evidence and disposition

Contract 02 is **PARTIAL** at frontend source level. The confirmed frontend-owned profile-structure, stale-response and role-state gaps are closed. Organization role state, mandate actions, authority history and seat purchase detail/audit/cancel paths now follow the available source contract. Invitation creation and mandate creation remain safely unavailable due to missing read/allowlist contracts; seat choices stay gated unless the server returns a documented `planKey`. The pass is not production-accepted: operational configuration is unverified, some DTO/action details remain incomplete or contradictory, WCAG acceptance has not been performed, and TypeScript still fails on 33 unrelated project diagnostics.
