# Implementation Group 02 — Identity, Access and Platform Foundations API

**Status:** contracts below are confirmed from current mounted source. Connected applications remain inactive.
**Source precedence:** cited Specifications govern conflicts with PRD.

## 1. Confirmed scope and profile vocabulary

PRD §§3, 4, 12, 18, 21 and 26 and cited Specifications define one sign-in identity with multiple isolated profiles, portal selection, Guest/Registered/Verified access, organization memberships and seats, staff departments, audit, notifications, Console policy authority, security and integration-ready identifiers/events.

The account roles persisted by the current backend are buyer, landlord (legacy API value; product wording is Owner), proxy_inspector and admin. General registration accepts buyer and owner/legacy landlord; Proxy Inspector registration uses POST /api/proxy-inspectors/register. Admin is invitation-only. Profile kinds are buyer, owner, agency, developer, legal_partner, engineering_survey_partner, inspection_partner, valuation_partner, buyers_agent, sellers_agent and staff. The company/cooperative/individual values are legal structures, not account roles. Staff is system-managed, not self-created.

Profile kind/structure pairs now require a source-defined onboarding contract:

| Profile kind | Supported structure |
|---|---|
| buyer | individual, company, cooperative |
| owner | individual |
| agency | individual, company |
| developer | company |
| legal_partner, engineering_survey_partner, inspection_partner, valuation_partner, buyers_agent, sellers_agent | individual, company |
| staff | created only by the staff workflow |

The list is enforced through profileOnboardingFields.definition. Other combinations fail with FEATURE_PROFILE_TYPE_UNAVAILABLE before creating a workspace that cannot enter verification.

PRD §3.4 describes Registered as email plus phone. The existing explicit product instruction allows dashboard GET access after email verification and defers phone verification to Settings. Mutations still require verified email and phone, and verified/KYC operations have their separate gates. The current actor may report accessLevel=guest while phone is unverified; frontend dashboard access must not be gated by accessLevel alone.

## 2. Shared HTTP, identity and error contract

Authenticated endpoints use Authorization: Bearer <JWT>. The server reloads account/session and checks JWT subject, jti, authVersion, expiry, revocation and current account status. Profile-aware APIs resolve the active profile from X-Profile-Id. The server rechecks current profile membership, profile status, role, seat entitlement, resource assignment, mandate and department as required by the operation.

~~~http
Authorization: Bearer <JWT>
X-Profile-Id: <selected-profile-id>
Content-Type: application/json
~~~

Changing X-Profile-Id on the next call is the profile switch. There is no separate switch endpoint. GET /api/profiles lists available workspaces; GET /api/profiles/current reads the selected one. Identity-scoped GET /api/auth/account and GET /api/profiles do not grant workspace authority.

Sensitive mutations listed below require bound TOTP step-up:

1. POST /api/auth/step-up with {method,path,body}; response 201 {challengeId,expiresAt,method:"totp"}.
2. POST /api/auth/step-up/:id/verify with {code}; response {challengeId,verified:true}.
3. Send X-Step-Up-Challenge: <challengeId> on the protected request.

The challenge binds current session/authVersion, active profile, exact HTTP method, mounted path and canonical JSON body; expires in five minutes, allows five verification attempts and is one-use. Multipart uploads bind the actual SHA-256 digest as __stepUpFileSha256 in both the step-up JSON body and multipart fields; the server compares the received bytes before consuming the challenge. Errors include AUTH_STEP_UP_REQUIRED, AUTH_CHALLENGE_INVALID, AUTH_CHALLENGE_FORBIDDEN, AUTH_CHALLENGE_REVOKED, AUTH_FACTOR_CODE_INVALID, AUTH_FACTOR_RATE_LIMITED and AUTH_CHALLENGE_RATE_LIMITED.

Responses use {message,code}; specific routes may include allowlisted field/errors/state data. X-Request-ID is a response header (not included by the generic error handler in JSON). Sensitive responses use Cache-Control: private, no-store and vary by Authorization/X-Profile-Id.

| HTTP status | Representative codes | Frontend action |
|---|---|---|
| 401 | AUTH_REQUIRED, AUTH_TOKEN_INVALID, AUTH_SESSION_REVOKED | Reauthenticate; do not replay a stale credential. |
| 403 | AUTH_CONTACT_VERIFICATION_REQUIRED, AUTH_PROFILE_FORBIDDEN, AUTH_SEAT_ENTITLEMENT_REQUIRED, PERMISSION_PROFILE_REQUIRED, PERMISSION_DEPARTMENT_REQUIRED, PERMISSION_STAFF_PROFILE_REQUIRED, PERMISSION_READ_ONLY | Keep the workspace restricted and show the server explanation. |
| 409 | CONFLICT_PROFILE_VERSION, CONFLICT_ONBOARDING_VERSION, CONFLICT_MEMBERSHIP_AUTHORIZATION, CONFLICT_ROLE_AUTHORIZATION, CONFLICT_SEAT_AUTHORIZATION, CONFLICT_STAFF_AUTHORIZATION | Reload current state before resubmitting. |
| 422 | INPUT_* and CONTENT_* | Show field-specific validation where supplied. |
| 429 | AUTH_*_RATE_LIMITED | Wait before retrying. |
| 503 | FEATURE_*_UNCONFIGURED / FEATURE_*_REQUIRED | Show unavailable state; do not loop retries. |

## 3. Authentication and sessions

Mounted at /api/auth (src/routes/authRoutes.js, mounted in src/app.js).

| Method and path | Request / response | Access and notes |
|---|---|---|
| POST /api/auth/register | {name,email,password,role?,buyerProfile?}; 201 {message,user}. buyerProfile is {structure:"individual"|"company"|"cooperative",name?}. | Public. Name/email/password required; password >=8 chars, uppercase, digit, <=72 bcrypt bytes. buyerProfile only for buyer. Duplicate identity email: 409 CONFLICT_IDENTITY_EMAIL. |
| GET /api/auth/verify-email/:token | 200 {message}. | Public, one-use token. |
| POST /api/auth/verify-email | {token}; same 200 {message}. | Public compatibility form. |
| POST /api/auth/login | {email,password,role?}; normal 200 {user,token}, plus adminAccess for admin. | Public; role is non-authoritative. Non-admin requires verified email. MFA produces 202 {code:"AUTH_SECOND_FACTOR_REQUIRED",challengeId,expiresAt,method:"totp"} and no token/session. |
| POST /api/auth/login/second-factor | {challengeId,code}; 200 {user,token}, plus adminAccess for admin. | Public challenge completion; one-use, five-minute expiry, auth-version-bound. |
| POST /api/auth/staff-invitations/complete | {email,temporaryPassword,newPassword}; 200 {passwordUpdated:true,loginRequired:true}. | Public, no-store. Temporary password exactly nine digits; new password follows registration rules. Does not issue a session. |
| GET /api/auth/account | 200 authenticated user DTO; admin includes adminAccess. | Bearer; identity-scoped, audited; not a profile permission grant. |
| GET /api/auth/sessions | {sessions:[{id,createdAt,expiresAt,current}]}. | Bearer, own sessions only. |
| DELETE /api/auth/sessions/others | {revoked:number}. | Bearer; revokes other sessions and disconnects their sockets. |
| DELETE /api/auth/sessions/:id | {revoked:number}; missing own session: 404 AUTH_SESSION_NOT_FOUND. | Bearer; cannot revoke another identity's session. |
| POST /api/auth/logout | {message:"Signed out."}. | Bearer; revokes current session and disconnects sockets. |
| GET /api/auth/two-step | {enabled:boolean}. | Bearer. |
| POST /api/auth/two-step/enroll | {password}; 201 {secret,provisioningUri,expiresAt}. | Bearer; current password required; no-store. TOTP label is REALTIQ:<account email>. |
| POST /api/auth/two-step/confirm | {code}; {enabled:true}. | Bearer; verifies enrollment code. |
| POST /api/auth/step-up | {method,path,body}; 201 challenge DTO. | Bearer; protected write method and mounted /api path only. |
| POST /api/auth/step-up/:id/verify | {code}; {challengeId,verified:true}. | Bearer; current profile/session bound. |
| POST /api/auth/phone-verification | Request fields validated by phoneVerificationController; verification request response. | Bearer. Phone may be completed later for dashboard GET access. |
| GET /api/auth/phone-verification/history | Own request history. | Bearer. |
| GET /api/auth/phone-verification/:id | Own request status. | Bearer. |
| POST /api/auth/phone-verification/:id/verify | Verification code; current status. | Bearer. |
| DELETE /api/auth/phone-verification/:id | Cancellation response. | Bearer. |
| POST /api/auth/resend-verification | Email request; safe delivery response. | Public, rate-limited. |
| POST /api/auth/forgot-password | Email request; safe response. | Public, rate-limited. |
| POST /api/auth/reset-password | Token/password; success message. | Public, rate-limited; password validator applies. |

Authenticated user DTO is allowlisted: _id, id, name, email, phone, product-facing role, emailVerified, phoneVerified, accountStatus, profileVisibility, consented profileImage, ownerVerified, trustBadge, limited KYC status/timestamps, createdAt and updatedAt. Password, auth tokens, MFA secrets, KYC file bytes and encryption internals are omitted.

## 4. Profiles, onboarding and verification

Mounted at /api/profiles (src/routes/profileRoutes.js). All routes use bearer auth, private-response headers and accessLevelMiddleware('registered'). Non-admin GET requires email verified; non-admin mutations require email and phone verified; admin bypasses contact checks but not current-session/profile checks.

| Method and path | Request / response | Authority / behavior |
|---|---|---|
| GET /api/profiles?after=<profileId>&limit=1..100 | {profiles:[profile DTO],nextCursor}; default 50. | Identity's active profile memberships; may lazily link legacy profile. |
| POST /api/profiles | {kind,structure,name,operationKey}; 201 {profile}. | Creates owner-held profile + administrator holder seat. operationKey 8–100 safe characters. Unsupported pair: FEATURE_PROFILE_TYPE_UNAVAILABLE. |
| GET /api/profiles/current | {profile:profile DTO}. | Current selected profile. |
| GET /api/profiles/current/onboarding | Private draft DTO: profileId,kind,structure,version,state,values,readiness,fields,updatedAt. | Current holder, supported type. |
| PATCH /api/profiles/current/onboarding | {expectedVersion,values,restartForCurrentType?}; updated draft DTO. | Step-up. Only profile-specific source-defined fields; null is explicit unanswered/reset; version conflict is 409 CONFLICT_ONBOARDING_VERSION. |
| GET /api/profiles/current/onboarding/evidence/contract | Versioned formats/purposes/document kinds/size/policy state and revision/identity requirements/person paths/source hints. | Current holder; policy may be unconfigured. |
| GET /api/profiles/current/onboarding/evidence?before=&limit= | {evidence,nextCursor}. | Current profile only. |
| POST /api/profiles/current/onboarding/evidence | Multipart purpose, subject?, documentKind?, operationKey, previousEvidenceId?, __stepUpFileSha256, file. 202 evidence DTO. | Step-up bound to bytes and fields; one file; 50 MiB transport maximum; active policy may impose lower bound. |
| GET /api/profiles/current/onboarding/evidence/:id | Safe evidence metadata. | No provider URL. |
| GET /api/profiles/current/onboarding/evidence/:id/content | Inline bytes after custody/state/hash authorization. | Current holder only; no public storage URL. |
| POST /api/profiles/current/onboarding/evidence/:id/retry | {expectedVersion}; 202 evidence DTO. | Step-up. |
| DELETE /api/profiles/current/onboarding/evidence/:id | {expectedVersion}; 202 deletion request/evidence DTO. | Step-up; submitted/audited evidence may be retained. |
| POST /api/profiles/current/verification-cases | {expectedDraftVersion,operationKey,people,identityRoute,identityCountry,identityEvidence}; 201 case DTO. | Step-up; exact declared-person paths, identity routes and country codes; requires current draft/evidence/policy. |
| GET /api/profiles/current/verification-cases?before=&limit=&state= | {cases,nextCursor}. | Holder’s selected profile. |
| GET /api/profiles/current/verification-cases/:id | Holder case DTO. | Own profile only. |
| GET /api/profiles/current/verification-cases/:id/history?before=&limit= | {history,nextCursor}. | Own profile only. |
| POST /api/profiles/current/verification-cases/:id/state | {expectedVersion,action:"withdraw"}; updated DTO. | Step-up. Claim is staff-only. |
| PATCH /api/profiles/current/privacy | {visibility:"private"|"public",followable:boolean,expectedVersion}; {profile}. | Step-up + team.manage; buyer profile remains private. |
| POST /api/profiles/current/type-change-requests | {kind:"owner"|"agency"|"developer",structure,expectedVersion}; 201 {change}. | Step-up; supported seller profile pair only. |
| POST /api/admin/profile-type-changes/:id/review | {decision:"approved"|"rejected",expectedVersion}; {change}. | Trust & Safety + step-up + independent reviewer. |
| GET /api/admin/verification-cases and /api/admin/company-verification-cases | Query before,limit,state,cursor; {cases,nextCursor}. | Trust & Safety; aliases to same implementation. |
| GET /api/admin/verification-cases/:id and company-verification-cases/:id | Staff case DTO adds snapshot,requiredChecks,approvalBlockers and review deadline data. | Trust & Safety; privacy-safe staff route. |
| GET /api/admin/verification-cases/:id/history and company-verification-cases/:id/history | Staff audit history. | Trust & Safety. |
| GET /api/admin/verification-cases/:id/evidence/:evidenceId/content (also company alias) | Protected evidence bytes. | Current KYC review authority and eligible private evidence required. |
| POST /api/admin/verification-cases/:id/claim (also company alias) | {expectedVersion,action:"claim"}; updated case DTO. | Trust & Safety + step-up. |
| POST /api/admin/verification-cases/:id/decision (also company alias) | {expectedVersion,decision:"approved"|"rejected",checks,reasonCodes?}; updated case DTO. | Trust & Safety + step-up, claimed case, current evidence/policy, independent reviewer. |
| POST /api/admin/profile-signatories/:id/review | Review DTO. | Legal Verification + step-up + SoD. |

Profile DTO: {id,kind,structure,name,status,verification:{status,reviewedAt},visibility,followable,version,permissions,unreadCount?}. Verification case core DTO: {id,profileId,kind,structure,draftVersion,state,version,rejectionCodes,submittedAt,reviewedAt,expiresAt}. Staff detail adds snapshot, requiredChecks and approvalBlockers. Presence of people/roster data is not proof of identity.

## 5. Organizations, teams, roles and seats

Every operation resolves the selected active profile and rechecks current membership, entitlement, permissions and resource assignment. Mutations are step-up protected and versioned where stated.

### Membership and invitations

| Method/path | Contract |
|---|---|
| GET /api/profiles/current/members?after=&limit= | {members,nextCursor}; team.manage; limit 1–100. |
| POST /api/profiles/current/members | {identityId,role,customRoleId?,deniedPermissions?,assignedOnly?,assignedResources?,negotiationLimit?,expiresAt?}; 201 {member}. Existing account identity invitation; step-up. |
| PATCH /api/profiles/current/members/:id | {expectedVersion,role?,customRoleId?,deniedPermissions?,assignedOnly?,assignedResources?,negotiationLimit?,expiresAt?}; {member}; step-up. |
| POST /api/profiles/current/members/:id/remove | {expectedVersion}; {member}; step-up; revokes entitlements and related signatory, disconnects profile sockets. |
| GET /api/profiles/current/invitations?page=&limit= | {invitations,pagination}; team.manage. |
| POST /api/profiles/current/invitations | {email,grant,operationKey}; 201 invitation DTO. grant accepts the role/assignment fields above. Requires step-up, team.manage, approved profile_invitations policy, invitation keys and secure CLIENT_URL. |
| DELETE /api/profiles/current/invitations/:id | {expectedVersion}; {invitation}; step-up; unaccepted only. |
| POST /api/profiles/invitations/claim | {token}; {invitation,membershipId,state,activationCode?}; verified email and phone must match recipient. |
| POST /api/profiles/invitations/:id/accept | {expectedVersion}; {member,activationCode?}; accepts current invitation attached to that identity. |

### Role vocabulary and permissions

Standard role values are administrator, sales_agent, project_editor, finance and viewer; custom is a profile-owned role. Holder seat is administrator. Explicit denials always win and assigned-only membership cannot access unassigned resources. Members cannot grant permissions they do not hold.

Permission catalogue: dashboard.read, team.manage, roles.manage, listing.read, listing.edit, listing.price, listing.media, listing.publish, listing.boost, listing.confirm, project.edit, enquiry.read, enquiry.reply, message.read, message.reply, negotiation.read, negotiation.propose, terms.accept, viewing.manage, document.read, document.share, document.request.approve, document.issue, payment.read, payment.initiate, payment.manage, escrow.read, escrow.claim, payout.manage, notification.read, notification.preferences, personalisation.read, personalisation.manage.

GET /api/profiles/current/roles?after=&limit=&includeDisabled=true|false returns {roles,nextCursor}; requires roles.manage. POST /api/profiles/current/roles {name,permissions} returns 201 {role}. PATCH /api/profiles/current/roles/:id {name,permissions,expectedVersion} returns {role}. POST /api/profiles/current/roles/:id/state {enabled,expectedVersion} returns {role}. Mutations require step-up. Role DTO {id,name,permissions,version}; disabled role response may include disabledAt.

### Mandates, signatories and audit

- GET /api/profiles/current/mandates?after=&limit= => {mandates,nextCursor}; dashboard.read.
- POST /api/profiles/current/mandates => {agentProfileId,resourceKind:"property"|"project",resourceId,type:"sole"|"exclusive"|"open",permissions,startsAt,expiresAt}; 201 {mandate}; step-up + team.manage + owner/signatory. Open mandate cannot edit or boost.
- POST /api/profiles/current/mandates/:id/:action => {expectedVersion,conflictDeclared?}; supported actions are accept, decline and revoke; current agent/owner profile and authority are rechecked.
- GET /api/profiles/current/signatories?after=&limit= => {signatories,nextCursor}; team.manage.
- POST /api/profiles/current/signatories => 201 {signatory}; step-up; source authority evidence is bound and reviewed.
- GET /api/profiles/current/authority-history?before=&limit= => {history,nextCursor}; team.manage.

Member DTO {id,profileId,identityId,role,customRoleId?,deniedPermissions,state,ownerSeat,assignedOnly,assignedResources,negotiationLimit?,expiresAt?,version}. Mandate DTO {id,ownerProfileId,agentProfileId,resourceKind,resourceId,type,permissions,state,startsAt,expiresAt,version}. Signatory DTO {id,profileId,identityId,state,expiresAt,reviewedAt,version}.

### Paid seats

| Method/path | Contract |
|---|---|
| GET /api/profiles/current/seat-plans | Configured: {state:"configured",revision,currency,plans}; unconfigured: {state:"unconfigured",plans:[],errorCode:"FEATURE_POLICY_UNCONFIGURED"}. |
| GET /api/profiles/current/seats | {profileId,includedHolderSeat:true,paidSeats,counts}. |
| GET /api/profiles/current/seat-purchases?before=&limit= | {purchases,nextCursor}. |
| POST /api/profiles/current/seat-purchases | {membershipId,planKey,operationKey}; 201 purchase DTO. |
| POST /api/profiles/current/seats/:membershipId/renew | {planKey,operationKey}; 201 purchase DTO. |
| GET /api/profiles/current/seat-purchases/:purchaseId | {purchase}. |
| GET /api/profiles/current/seat-purchases/:purchaseId/audit?before=&limit= | {events,nextCursor}. |
| POST /api/profiles/current/seat-purchases/:purchaseId/cancel | Empty JSON body; purchase DTO. |
| POST /api/profiles/current/seat-purchases/:purchaseId/reconcile | Empty JSON body; purchase and optional providerStatus. |

Seat mutations need step-up, team.manage, current company/cooperative signatory and approved profile_seats policy. Purchases need Paystack credentials. operationKey is 8–128 safe characters. Entitlement is checked on each request; expiry/removal revokes access, signatories and profile sockets. Do not assume a plan or amount before policy configuration.

## 6. Staff Console authority and policies

Admin role alone is not Executive authority. Each Console route checks current selected staff profile and department. executive grants operational capabilities; internal_audit remains read-only even on legacy mixed assignments.

Departments: executive, sales_partnerships, customer_support, trust_safety, legal_verification, escrow_operations, finance, listings_quality, third_party_network, technical, data_market_intelligence, marketing_growth, compliance_data_protection, internal_audit.

| Method/path | Request / success | Authority |
|---|---|---|
| GET /api/admin/access | {access:{accountId,role,profileId,staffDepartments,departmentAssignments,effectiveDepartments,capabilities,accessMode,isExecutive,isInternalAudit,readOnly,canManageStaff,assignableDepartments}} | Admin + current staff profile. |
| GET /api/admin/staff?q=&after=&limit=&includeUnassigned= | {staff,nextCursor}; limit 1–100. | Executive only. |
| POST /api/admin/staff | {name,email,departments}; 201 {staff}. | Executive + step-up; creates verified active admin identity and sends encrypted generated temporary credential. Credential is never returned; first login must set a new password. |
| POST /api/admin/staff/:identityId/resend-invitation | Empty body; 202 {staff}. | Executive + step-up. |
| GET /api/admin/staff-access-changes | {changes}. | Executive. |
| POST /api/admin/staff-access-changes | {targetIdentityId,departments}; 201 {change}. | Executive + step-up; target must already be admin; empty departments removes Console access; Internal Audit must be assigned alone. |
| POST /api/admin/staff-access-changes/:id/decision | {decision:"approved"|"rejected",expectedVersion}; {change}. | Executive + step-up + independent reviewer. Approval bumps authVersion and revokes sessions/sockets. |
| GET /api/admin/policies/:key | {policy}. | Policy department, Executive or Internal Audit read rules. |
| GET /api/admin/policies/:key/history?before=&limit= | {revisions,nextCursor}. | Same read authority. |
| POST /api/admin/policies/:key/revisions | {value,reason,expectedRevision}; 201 {revision}. | Department authority + step-up. A valid new revision is approved and activated atomically by the acting admin. |
| POST /api/admin/policies/:key/revisions/:revisionId/:decision | Legacy pending revision decision; decision approved or rejected. | Current authority, version and SoD checks. |

Common staff errors: PERMISSION_EXECUTIVE_REQUIRED, PERMISSION_DEPARTMENT_REQUIRED, PERMISSION_STAFF_PROFILE_REQUIRED, PERMISSION_READ_ONLY, PERMISSION_SEPARATION_OF_DUTIES, CONFLICT_STAFF_AUTHORIZATION, CONFLICT_SESSION_AUTHORIZATION.

## 7. Notifications and realtime

All /api/notifications routes are private/no-store and selected-profile scoped.

| Method/path | Request / response |
|---|---|
| GET /api/notifications?page=1&limit=20&category=&read=true|false | {notifications:[{id,profileId,type,category,title,body,navigation?,readAt,createdAt}],pagination:{page,limit,total,pages}}. page 1–10000; limit 1–100. |
| GET /api/notifications/unread-count | {unreadCount}. |
| PATCH /api/notifications/read-all | {modifiedCount,readAt}. |
| PATCH /api/notifications/:id/read | {notification:<safe notification DTO>}. |
| DELETE /api/notifications/:id | Archive response {notification:<safe notification DTO>}. |
| GET /api/notifications/preferences | {preferences:{profileId,categories,mandatoryCategories,updatedAt},mandatoryCategories}. |
| PATCH /api/notifications/preferences | JSON keyed by supported optional categories with boolean inApp,email,sms,whatsapp,push channels; same response. |
| POST /api/notifications/devices | {token}; 201 {device}. |
| DELETE /api/notifications/devices/:deviceId | {device}. |
| GET /api/notifications/:id/deliveries | {deliveries:[{id,channel,state,attempts,dueAt,acceptedAt,errorCode,receiptStatus,receiptAt}]}. |
| GET /api/notifications/:id/deliveries/:deliveryId/history?before= | {history,nextCursor}. |
| POST /api/notifications/recent-properties/digest | Admin + marketing_growth. |

Optional preference keys: messages, inquiries, viewings, offers, savedSearches, listingChanges, escrow, documents, jobs, mandates, promotions, posts, followedUpdates, follows, newFollowers, postInteractions, reportOutcomes and legacy marketplace. Mandatory categories security, payments and legal cannot be disabled.

~~~json
{
  "messages": {"inApp": true, "email": false, "sms": false, "whatsapp": false, "push": false},
  "savedSearches": {"email": true}
}
~~~

Realtime notification events are emitted to account/profile rooms only after current session/profile authorization is revalidated. Minimal events include notification:read, notification:read-all and notification:archived. Session/profile/seat revocation disconnects sockets. Reconnect and reload current profile after a switch or revocation. External email/SMS/WhatsApp/push delivery is configuration-dependent; an in-app notification record is not proof that external delivery succeeded.

## 8. Integration identifiers and outbox

Current models/services:
- User.globalParticipantId: opaque immutable account identifier.
- Property.globalPropertyId: opaque listing/unit identifier.
- Project.globalPropertyId: opaque project identifier.
- GlobalIdentifier: unique global-ID and source-record registry.
- IntegrationCrossReference: application ID/type/external ID to global ID mapping.
- IntegrationOutboxEvent: eventId,source,schemaVersion,idempotencyKey,globalPropertyId,participantIds,occurredAt and delivery state.

Source event vocabulary: listing.created, listing.price_changed, listing.withdrawn, offer.accepted, transaction.completed, property.handover, project.created, unit.status_changed, milestone.verified and title.verified. Existing authoritative listing/project/unit-status/transaction/milestone/handover/title paths write outbox records within the source transaction. There is no Offer model/acceptance route, so offer.accepted has no producer.

Writes are idempotent and transaction-bound. Historical records need the bounded npm run global-identifiers:backfill deployment script and unique-index rollout; it was not run here. No connected app is registered or active. No external app dispatcher, mounted partner API, OIDC/client-credentials/mTLS contract, signed webhook handshake, consent/share controls or partner payload schemas are provided by this group. PRD §26 defers connected apps at launch, and cited source does not specify external scopes/data payloads enough to invent them.

## 9. Requirement traceability

Frontend status records this pass's source-level implementation and verification only. It does not claim production, provider, deployment or live-backend acceptance.

| Source | Requirement | Backend status and code evidence | Frontend status | Acceptance evidence | Gate or decision |
|---|---|---|---|---|---|
| PRD §3.1 | Source-defined user classes and portals | PARTIAL: role/profile vocabularies exist; legacy account role landlord remains in API; profile kinds are separate | SOURCE-REVIEWED; touched profile choices preserve role distinctions | authController, profilePermissions, profileOnboardingFields; ProfileSwitcher | Owner display wording vs legacy value |
| PRD §3.2 | Guest access | PARTIAL: public routes exist, no Guest profile/session | NO GUEST PROFILE OR SESSION UI ADDED | app.js mounts public APIs | No Guest profile API defined |
| PRD §3.3 | One sign-in, several profiles and profile isolation | COMPLETE for profile-aware routes: Profile, Membership, currentContext and X-Profile-Id | PARTIAL — stale profile request/switch protection implemented and focused-tested | profile/current endpoints; AuthContext tests; profileAuthorizationService | Some legacy routes not profile-scoped |
| PRD §3.4 | Guest/Registered/Verified | PARTIAL: KYC and contact access levels exist; email-only dashboard GET differs from Registered definition | SOURCE-VERIFIED — dashboard entry remains independent of phone verification | accessLevelMiddleware, accessEligibilityService; route guards | Preserve explicit phone-later product instruction |
| PRD §3.5 | Individual/org identity verification | CONFIGURATION-GATED: encrypted intake/evidence/cases/review exist | EXISTING FLOW PRESERVED; no new KYC eligibility or backend state invented | onboarding/evidence/verification APIs; existing verification UI | private evidence, identity and company policies |
| PRD §3.6; RQS-06 §3 | Team/roles/custom roles/seats | PARTIAL: access controls, role and entitlement lifecycle exist | PARTIAL — roles/seats source-integrated; invitation creation withheld pending readiness read; mandate creation withheld pending allowlist | OrganizationManagement and focused service/UI tests | approved seat policy and Paystack |
| RQS-06 §2.1–2.2 | Profile types/portals | PARTIAL: supported source-defined combinations enforced | IMPLEMENTED AND FOCUSED-TESTED — supported kind/structure combinations only | PROFILE_STRUCTURES_BY_KIND; ProfileSwitcher tests | Legacy profile reconciliation |
| RQS-06 §3.1–3.4 | Org roster, declared people, signatories, KYC | CONFIGURATION-GATED | PARTIAL — roster, signatory list/request and existing KYC flows; configuration gates remain | OrganizationManagement; AccountSecuritySettings; onboarding, verification, signatory services | current policy, encryption keys, gazetteer |
| RQS-06 §4.1–4.7 | Seats, capacity and revocation | CONFIGURATION-GATED: current entitlement enforcement exists | PARTIAL — plan/seat/purchase detail/audit/cancel paths source-integrated; no live payment acceptance | OrganizationManagement and organizationManagementService tests | approved plan/Paystack config |
| RQS-06 §19.1 | Staff department authority | COMPLETE for mounted Console routes | SOURCE-VERIFIED — existing capability/current-profile Admin access preserved | Admin access projection and route source review | Executive assignment |
| RQS-06 §19.2 | Internal Audit read-only | COMPLETE | SOURCE-VERIFIED — existing read-only behavior preserved | staffCapabilities and route source review | None |
| RQS-06 §19.3 | Separation of duties | COMPLETE on implemented staff review/approval paths | SOURCE-VERIFIED — no authority or separation rule weakened | existing bound-step-up and review paths | operation-specific source rules |
| RQS-06 §19.4 | Staff audit trail | COMPLETE for access/policy/profile authority operations | SOURCE-REVIEWED — existing audit views preserved | ProfileAuthorityAudit, ConsolePolicyAudit | retention configuration |
| PRD §4 | Security/privacy/access rules | PARTIAL product-wide; current session/profile/permission fences exist in these consumers | SOURCE-VERIFIED for touched profile/org flows; server remains authoritative | authMiddleware, currentContext, role middleware; focused tests | remaining unrelated consumer routes |
| PRD §12 | Shared workspace shell | NO_API_REQUIRED for layout; profile, permissions and unread-count data exist | EXISTING SHELL PRESERVED; profile switching now ignores stale responses | BuyerPortalLayout, ProfileSwitcher, AuthContext | visual shell is frontend scope |
| PRD §18 | Console, departments, policies and notifications | PARTIAL: APIs and policy authority implemented; channels gated | EXISTING CAPABILITY/DEPARTMENT UI PRESERVED; no connected-app flow introduced | adminRoutes, notificationRoutes; existing Admin access UI | providers/approved policies |
| PRD §21 | Availability/security/accessibility | PARTIAL: auth fences, no-store, request IDs; WCAG is frontend | PARTIAL — touched forms have labels, focusable controls and explicit unavailable states; full WCAG audit pending | touched profile and organization UI; focused tests | operational SLO rollout |
| RQS-01 §18.2 | Seat role vocabulary/custom roles | COMPLETE | IMPLEMENTED AND FOCUSED-TESTED — standard and active returned custom roles; state mutation uses version and step-up | OrganizationManagement and service tests | None |
| RQS-01 §27.1 | User class/portal mapping | PARTIAL: profile kinds implement class distinctions; labels are client-facing | SOURCE-REVIEWED; no role classes merged or invented | account/profile mapping; ProfileSwitcher | terminology aliases |
| RQS-01 §27.2 | Social contacts/following | OUTSIDE IDENTITY FOUNDATION; separate social APIs exist | NOT GROUP 02 UI | route inventory outside this section | later group |
| RQS-06 §20 | Notification categories/preferences | COMPLETE preference APIs; external delivery gated | EXISTING PROFILE-SCOPED NOTIFICATION UI PRESERVED; external delivery not claimed | NotificationPreference + notification centre; RealtimeContext | provider activation |
| PRD §26.1 | No connected apps at launch | COMPLETE: connectors not activated | NO APP CONNECTION | no active app client | later activation |
| PRD §26.2 | Global participant/property IDs | PARTIAL pending existing-record backfill/index rollout | NO CLIENT ID REGISTRY OR CONNECTOR UI ADDED | immutable fields, registry and script | deployment backfill |
| PRD §26.3 | Cross-reference mapping | PARTIAL: model/service only, no mounted management endpoint | NO CONNECTOR UI | IntegrationCrossReference | partner auth/endpoint contract |
| PRD §26.4–26.5 | OIDC/API/integration security contract | MISSING as a connected-app API | NOT AVAILABLE | no mounted client/API route | scopes, payload and consent decisions |
| PRD §26.6 | Transactional event outbox | PARTIAL: outbox/producers exist; offer accepted path unavailable; no dispatcher | NO APP DELIVERY | IntegrationOutboxEvent and producers | no Offer path; no connector |
| PRD §26.7–26.8 | At-least-once external delivery/webhook/sandbox | PARTIAL: internal event state exists; external dispatcher/webhook protocol absent | NOT AVAILABLE | outbox schema only | external contract/credentials |
| RQS-08 §3; 08-AP-01–11 | Seat plan and payment | CONFIGURATION-GATED; entitlement/access behavior exists | PARTIAL — source-integrated UI; provider acceptance and plan item contract remain open | profileSeatBillingService; OrganizationManagement focused tests | policy and Paystack |
| PRD §21 | WCAG 2.1 AA | NO_API_REQUIRED | PARTIAL — touched UI uses labelled controls and explicit states; full WCAG 2.1 AA audit remains | user interface; focused UI tests | manual keyboard, contrast and screen-reader review |

## 10. Focused verification

- node --test test/authRoleIdentity.test.js test/group02PlatformFoundations.test.js — passed, 12 tests.
- node --test --test-name-pattern="standard roles|assigned-only authorization|identity authorization fencing|current-session validation|Executive staff" test/profilePermissions.test.js — passed, 5 selected tests.
- The first combined run also selected an unrelated legacy adminSearch mapper test that fails because CONFIG.landlord is undefined; it was excluded from the final focused run. An existing auth test fixture was corrected to represent the explicit email-verified dashboard policy.
- No database integration, provider call, full build, migration or connected-app activation was performed.

## 11. Rollout prerequisites and known limits

Review and apply indexes through deployment procedures, then run npm run global-identifiers:backfill against a reviewed target database. This task did not run it. MongoDB transactions are required for permission fences/outbox writes. Configure invitation/private-envelope keys, identity email, current approved Console policies, notification providers, and Paystack before enabling their dependent workflows.

Internal integration contract work remains unavailable: no mounted external app authentication/client registration, OIDC/client-credential/mTLS or partner data API, external event dispatcher, signed webhook delivery/reconciliation, consent/share controls, or partner payload schema. These are not simulated; PRD §26 says no connected applications at launch, and the cited documents do not provide enough partner-specific scopes and payloads to safely invent them.
