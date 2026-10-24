# Auth, accounts, profiles and permissions

## Legacy identity routes (compatibility; prefer profile APIs)

The following paths are mounted under `/api/users` in `src/routes/userRoutes.js`:

| Endpoint | Contract |
|---|---|
| `GET /api/users/:id` | Self receives the authenticated-user projection; current admin with staff-route permission receives a staff projection; another caller may receive only a public seller profile for a landlord account. Otherwise 403/404. |
| `PATCH /api/users/:id` | Bearer auth + step-up. Body keys only `name`, `phone`, `profileVisibility`, `accountStatus`, `expectedAuthVersion`. Name is 1–120 chars and contact-guarded; phone must be E.164; visibility `private|public`; account state `active|suspended|blacklisted`; version is a non-negative integer. Self may change identity/settings, but profile visibility is redirected to current-profile privacy workflow. Account-state/admin actions require current staff permission; suspension/blacklist/deletion require Executive and exclude Internal Audit. Identity changes revoke sessions and invalidate identity-bound verification approvals. |
| `DELETE /api/users/:id` | Admin route + step-up; body permits only optional `expectedAuthVersion`. The service requires current Executive department and resource permission. This is an account-deletion state transition, not hard deletion; response `{message,id}`. Prefer the data-protection deletion request flow for data-rights requests. |
| `GET /api/users`, `GET /api/users/landlords` | Admin plus current staff route permission; response is staff-user projection or public seller-card list. These are legacy operator directory paths; use profile APIs for user-facing profile screens. |

Legacy `/api/verification/submit` and `/api/verification/review/:userId` routes do not implement current profile verification cases; they reject with `409 CONFLICT_KYC_PROFILE_WORKFLOW_REQUIRED`. Use `/api/profiles/current/verification-cases` and the current admin verification queues.

All profile APIs mount under `/api/profiles`; the router applies Bearer auth, Registered access, private/no-store headers, and current active-profile resolution. `X-Profile-ID` selects an authorized workspace. Omission uses the identity's current primary profile where supported. The identity token is not a company membership grant.

## Authentication/session endpoints

| Endpoint | Request | Success response | Notes/errors |
|---|---|---|---|
| `POST /api/auth/register` | JSON fields validated by `authValidators`; standard registration includes name/email/password/role. Optional `buyerProfile:{structure:"individual"|"company"|"cooperative",name?}`. | Existing own-account registration envelope; exact legacy payload is in `authController.register`. | `422 VALIDATION_FAILED`, `INPUT_BUYER_PROFILE_INVALID`; profile starts private and unverified. Do not treat buyerProfile as KYC. |
| `POST /api/auth/login` | `{email,password,role?}`; role is only a legacy hint, not authority. | Existing token/session login envelope from `authController.login`; MFA may require second factor. | `401 AUTH_INVALID_CREDENTIALS`; `409 AUTH_IDENTITY_REVIEW_REQUIRED`; `422 AUTH_CREDENTIALS_INVALID` / `AUTH_ROLE_HINT_INVALID`. |
| `POST /api/auth/login/second-factor` | Challenge ID and submitted factor code per auth challenge controller. | Authenticated session/token envelope. | Exact code-field DTO is defined in `authenticationChallengeController.completeLogin`; do not substitute a guessed `code` property. |
| `GET /api/auth/account` | Bearer. | Authenticated account DTO from route handler, including current account/session context. | Identity-only route; not a replacement for profile permissions. |
| `GET /api/auth/sessions` | Bearer. | Current identity's safe session list. | Session revocation changes subsequent authorization. |
| `DELETE /api/auth/sessions/others`, `DELETE /api/auth/sessions/:id`, `POST /api/auth/logout` | Bearer. | Current session/revocation result. | Session-bound; do not assume a client-side token deletion is server logout. |
| `POST /api/auth/forgot-password`, `/reset-password`, `/resend-verification` | Controller validators and rate limits apply. | Safe generic acknowledgement. | Never reveal whether another account exists. |
| `GET /api/auth/verify-email/:token`, `POST /api/auth/verify-email` | Verification token (path or controller-defined body). | Verification result. | Challenge limits apply. |
| `POST /api/auth/phone-verification` | `{}` plus `Idempotency-Key` (8–100 safe characters); destination is the account's persisted phone. | `202 {id,state,expiresAt,sentAt?,verifiedAt?,errorCode?}`. | Provider policy/keys and Termii config gate delivery. |
| `GET /api/auth/phone-verification/history?limit=25&before=<id>`, `GET /:id`, `POST /:id/verify`, `DELETE /:id` | Verify body `{code:"digits"}`; current identity/session. | Status `{id,state,...}`; history `{events,nextCursor}`. | Challenge binds session, auth version, phone and expiry. Phone proof is not KYC. |
| `GET /api/auth/two-step`, `POST /two-step/enroll`, `POST /two-step/confirm`, `POST /step-up`, `POST /step-up/:id/verify` | Factor/challenge bodies are controller-defined; authenticated for enrollment/step-up. | Challenge/enrollment status DTOs. | Rate limited; do not log codes or secrets. |

For sensitive routes, obtain a current server challenge, then send its token as `X-Step-Up-Challenge` on the exact mutation. The challenge is bound to HTTP method, path, selected profile, request body and, for file uploads, the submitted file digest. A changed body/file requires a new challenge. Failures include `AUTH_STEP_UP_REQUIRED`.

## Profiles, workspace and permissions

| Endpoint | Contract | Authorization/behavior |
|---|---|---|
| `GET /api/profiles?limit=50&after=<membership-id>` | `{profiles:[{id,kind,structure,name,status,verification:{status,reviewedAt},visibility,followable,version,permissions,unreadCount}],nextCursor}`; limit 1–100. | Current identity and authorized profile memberships only. Use `id` in `X-Profile-ID`. |
| `POST /api/profiles` | Profile creation fields are validated by `profileController.create`; do not send role/permission grants as profile identity. | Current registered identity. Exact creation variants must follow controller schema. |
| `GET /api/profiles/current` | `{profile:...}`. | Current active profile; private/no-store. |
| `GET/PATCH /api/profiles/current/onboarding` | GET current onboarding state; PATCH `{expectedVersion,values}` or approved `restartForCurrentType` workflow. | Holder-managed intake. PATCH requires step-up. Omitted fields are not silently reset. KYC/evidence remains a distinct workflow. |
| `PATCH /api/profiles/current/privacy` | Current privacy settings body accepted by `profileController.privacy`. | Step-up; profile owner/current permission. Never put private KYC or payout fields in this payload. |
| `GET /api/profiles/current/roles`; `POST /current/roles`; `PATCH /current/roles/:id`; `POST /current/roles/:id/state` | Role grants are restricted to caller's current grant scope. State body `{enabled,expectedVersion}`. | `team.manage` and step-up on writes. Disabling revokes authority; user-supplied role names cannot increase grants. |
| `GET/POST /current/members`; `PATCH /current/members/:id`; `POST /current/members/:id/remove` | Roster DTOs are safe, paginated (`limit`,`after`) where supported; mutation payloads use role/grant/assignment contract. | Current organization administrator with `team.manage`; step-up for add/change/remove. Membership, seat, role, assignments and current resource grants are rechecked. |
| `GET/POST /current/invitations`; `DELETE /current/invitations/:id`; `POST /invitations/claim`; `POST /invitations/:id/accept` | Issue `{email,operationKey,grant:{role,...}}`; claim `{token}`; cancel `{expectedVersion}`. | Current Registered identity/profile; writes that change authority require step-up except recipient accept/claim. Invite token is opaque, recipient-bound and must not go in query/analytics. Responses omit token, email and provider identifiers. |
| `GET /current/mandates`; `POST /current/mandates`; `POST /current/mandates/:id/:action` | Mandate scope, resource and dates are validated by profile service. | `team.manage`, active organization profile and step-up. Accepted/current mandate is resource-specific; expiry/revocation immediately removes delegated authority. Action enum is controller-validated; inspect source before adding new action values. |
| `GET /current/signatories`; `POST /current/signatories`; `POST /api/admin/profile-signatories/:id/review` | Submit `{identityId,authorityEvidenceId,expiresAt}` (legacy `authorityDocumentId` is accepted only for same-profile inspected authority document); review `{decision:"approved"|"rejected"|"revoked",expectedVersion}`. | Submit step-up; staff review is current Legal & Verification, step-up and independent from applicant/profile holder. Approved current evidence and roster membership are required for signatory authority. |
| `GET /current/authority-history?before=<id>` | `{events:[...],nextCursor}`. | Current profile authority; immutable history DTO. No evidence contents/private reserve. |

## Verification and eligibility

- `GET /api/profiles/current/onboarding/evidence/contract` returns the active evidence contract. Use it before showing evidence purposes/types.
- `GET/POST /api/profiles/current/onboarding/evidence`; upload multipart part `file` (one configured supported file; route limits apply), with evidence metadata in allowed form fields. Upload, retry and removal require the current holder profile; upload/retry/remove are step-up protected. List/read/content routes are profile-private and never return the storage URL.
- `POST /api/profiles/current/verification-cases` submits a versioned snapshot; `GET` list/detail/history; `POST /:id/state` is applicant transition only. The current applicant submits; independent staff reviews through `/api/admin/verification-cases` or `/company-verification-cases`.
- `GET /api/auth/account`, profile switcher and verification DTOs are separate. Registration role hints and account-level flags do not grant company permission, KYC approval, publication, payout or step-up.
- Legacy `POST /api/verification/submit` and `PATCH /api/verification/review/:userId` remain mounted for compatibility but return `409 CONFLICT_KYC_PROFILE_WORKFLOW_REQUIRED`; do not wire them.

## Seats and organization billing

Current endpoints include `GET /current/seat-plans`, `/current/seats`, `/current/seat-purchases`, `POST /current/seat-purchases`, `GET /current/seat-purchases/:purchaseId[/audit]`, `POST /:purchaseId/cancel|reconcile`, and `POST /current/seats/:membershipId/renew`. Purchase body `{membershipId,planKey,operationKey}` returns `201 {purchase:{...safePurchase,redirectUrl?}}`; same key/profile/payload is idempotent. Seat plan response may be `{state:"configured",revision,currency:"NGN",plans:[...]}` or `{state:"unconfigured",plans:[],errorCode:"FEATURE_POLICY_UNCONFIGURED"}`. Payment callbacks, not client redirects, activate entitlements. The profile admin must hold current `team.manage`, correct organization permission and step-up on purchase/cancel/reconcile/renew. Revoked/expired/unpaid seats deny subsequent requests.

Publication plan purchase routes mirror the seat purchase lifecycle under `/current/publication-plans`, `/current/publication-plan`, `/current/publication-plan-purchases`. Payout setup routes `/current/payout-setup` and `/history`, POST start/reconcile/revoke require current profile permission and step-up. Provider readiness does not equal payout approval.

## Frontend state guidance

Keep account and selected-profile stores separate. After login, load `/api/profiles`, select only a returned profile, then send its ID on each profile-scoped request. On `401`, clear session state; on `403` profile/seat/mandate/department errors, refresh current profile/permissions and do not retry under another profile automatically. On profile switch, cancel stale queries, clear private caches and restart socket subscriptions. Use exact `expectedVersion` values for mutations. Never display organization-only fields to a member merely because the account holder belongs to that organization.


## Shared contract references

Contract cross-reference: shared account/profile DTOs are in [15-api-dto-and-schema-reference.md](15-api-dto-and-schema-reference.md); response and error variations are indexed in [16-api-response-variation-matrix.md](16-api-response-variation-matrix.md); onboarding and switching sequences are in [17-end-to-end-frontend-workflows.md](17-end-to-end-frontend-workflows.md).
