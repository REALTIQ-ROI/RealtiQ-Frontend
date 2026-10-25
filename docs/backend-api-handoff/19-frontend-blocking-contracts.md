# Frontend-blocking API contracts

This document records the mounted contracts needed for the seven blocked frontend operations. It is based on the current route, controller, middleware and service code. Examples use illustrative identifiers and values; do not reuse them as real credentials or IDs.

**Contract status:** the contracts below are supplemented by [chapter 20](20-pass01-03-contract-remediation.md). The earlier profile-evidence middleware-order and publication-error serialization gaps have been corrected. Checkout initialization now reserves the cart before the provider call and fails closed on ambiguous outcomes; chapter 20 documents the current retry contract. Historical descriptions below are superseded where stated.

## 1. Bound step-up authentication

### `POST /api/auth/step-up`

**Purpose**

Start a short-lived TOTP challenge bound to one mutating API request and the current account session/profile.

**Authentication and authorization**

- `Authorization: Bearer <access-token>` is required. The account and session are reloaded by authentication middleware.
- Send `X-Profile-ID: <profile-id>` when acting in a selected profile. That profile is captured in the challenge; switching profiles invalidates its use.
- The account must already have an enabled TOTP factor. Other factors are not accepted by this implementation.

**Headers**

```http
Authorization: Bearer <access-token>
X-Profile-ID: 64f000000000000000000001
Content-Type: application/json
```

**Request body**

The controller reads `method`, `path`, and `body`. For an authenticated step-up challenge, `method` must be one of `POST`, `PUT`, `PATCH`, `DELETE`; `path` must be a literal API path matching `/api/...`; `body` is the exact JSON payload to be sent to the protected endpoint (or `{}` when it has no JSON body).

```json
{
  "method": "PATCH",
  "path": "/api/projects/64f000000000000000000101",
  "body": {
    "expectedVersion": 8,
    "publicationAction": "publish_all_ready"
  }
}
```

The path does not include a query string. Challenge creation rejects a path outside the service's `/api/...` character/length contract. The body is digested as canonical JSON: object keys are sorted recursively; array order is retained; absent/null values normalize according to the service's canonical JSON function.

**Success response — HTTP 201**

```json
{
  "challengeId": "64f000000000000000000201",
  "expiresAt": "2026-10-25T12:05:00.000Z",
  "method": "totp"
}
```

`challengeId` is the challenge record ID. It is not a bearer token. The challenge expires five minutes after initiation and is bound to user, current session, active profile, account authorization version, method, exact path and body digest.

### `POST /api/auth/step-up/:id/verify`

**Request body**

```json
{ "code": "123456" }
```

**Success response — HTTP 200**

```json
{
  "challengeId": "64f000000000000000000201",
  "verified": true
}
```

Verification does not itself consume a step-up challenge. The first matching protected request consumes it atomically. Replaying it, changing the method/path/body, using another session/profile, or using it after expiry fails.

**Limits and errors**

| Condition | HTTP | Code |
|---|---:|---|
| TOTP not enabled | 403 | `AUTH_FACTOR_REQUIRED` |
| Invalid method/path | 400 | `AUTH_CHALLENGE_SCOPE_INVALID` |
| Invalid/expired/already verified challenge or 5 attempts exhausted | 403 | `AUTH_CHALLENGE_INVALID` |
| Invalid/reused TOTP counter | 403 | `AUTH_FACTOR_CODE_INVALID` |
| Factor locked after repeated invalid codes | 429 | `AUTH_FACTOR_RATE_LIMITED` |
| 10 outstanding challenges or route rate limit | 429 | `AUTH_CHALLENGE_RATE_LIMITED` |
| Revoked account/session/challenge | 401/403 | `AUTH_SESSION_REVOKED`, `AUTH_CHALLENGE_REVOKED`, or `AUTH_CHALLENGE_FORBIDDEN` |
| Missing, wrong-scope, expired or reused proof on protected action | 403 | `AUTH_STEP_UP_REQUIRED` |

The challenge verification endpoint allows at most five code attempts per challenge. Factor failures are atomically counted and the factor is temporarily locked after five failures. Both challenge routes have an additional rate limit of 20 requests per five minutes. The challenge's five-minute expiry is not extended by verification.

**Protected request header and complete JSON example**

After the verify response, send the same active profile and exact request body to the protected route:

```http
PATCH /api/projects/64f000000000000000000101
Authorization: Bearer <same-session-access-token>
X-Profile-ID: 64f000000000000000000001
X-Step-Up-Challenge: 64f000000000000000000201
Content-Type: application/json
```

```json
{
  "expectedVersion": 8,
  "publicationAction": "publish_all_ready"
}
```

The protected request must use the same method, path (query string excluded), selected profile and JSON body used to start the challenge. `X-Step-Up-Challenge` contains the `challengeId` value.

**Multipart/file binding**

The middleware supports a file digest only when the upload parser has populated `req.file` before the step-up middleware runs. In that ordering, the multipart body includes `__stepUpFileSha256`, a 64-character SHA-256 hex digest of the selected file; the same digest and all other multipart fields are included in challenge creation. The middleware verifies the digest against the buffered file, consumes the challenge and removes the reserved digest field before the controller.

**Resolved middleware order:** `POST /api/profiles/current/onboarding/evidence` now runs profile/evidence preflight, bounded `multer.single('file')`, step-up validation, then the evidence upload service. The step-up middleware hashes the actual file bytes, verifies the submitted `__stepUpFileSha256`, binds the digest and multipart fields to the challenge, consumes the challenge and removes the reserved digest field before controller validation. See [chapter 20 §1](20-pass01-03-contract-remediation.md#1-bound-step-up-and-profile-evidence-uploads) for the exact sequence and sample.

**Source references:** `src/routes/authRoutes.js`, `src/controllers/authenticationChallengeController.js`, `src/services/authenticationChallengeService.js`, `src/middleware/stepUpMiddleware.js`, `src/middleware/authMiddleware.js`.

## 2. Verification cases and evidence

The profile router is mounted at `/api/profiles` and applies authentication plus registered-access middleware to the router. Holder operations use the current selected profile and holder identity. Staff operations use the Trust & Safety department and separation-of-duties checks.

### Evidence contract and metadata

#### `GET /api/profiles/current/onboarding/evidence/contract`

No body. Returns the current profile's upload contract; the payload varies by profile kind/structure and the active Console policies.

```json
{
  "version": 1,
  "formats": ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  "purposes": ["selfie", "bvn", "nin", "additional_government_id", "proof_of_address", "passport", "residence_national_id", "overseas_address_proof", "company_registration", "tin", "registered_address", "cooperative_registration", "authority", "purchase_resolution", "scuml", "state_registration", "professional_membership", "professional_indemnity_insurance"],
  "documentKinds": {"nin": ["nin_slip", "nin_card"]},
  "maxBytes": 10485760,
  "policies": {
    "upload": {"state": "configured", "revision": 4},
    "acceptedIdentity": {"state": "configured", "revision": 7}
  },
  "acceptedInternationalIds": [],
  "individualRoutes": {
    "nigerian": ["bvn", "nin", "additional_government_id", "proof_of_address"],
    "international": ["passport", "residence_national_id", "overseas_address_proof"]
  },
  "serviceAreaSource": {"state": "not_applicable", "endpoint": "/api/locations/suggestions?level=state"},
  "subjects": {"fixed": ["self"], "personFields": []}
}
```

The values above illustrate shape only. `maxBytes`, policy revisions, accepted IDs, partner credential data and subject fields come from current configured policies/profile definition. The purpose enum includes all values in `src/constants/profileEvidence.js`; `documentKinds` is constrained for purposes that define explicit choices.

#### `GET /api/profiles/current/onboarding/evidence?limit=25&before=<evidence-id>`

`limit` is 1–100, default 25; `before` is an ObjectId cursor. Response:

```json
{
  "evidence": [
    {
      "id": "64f000000000000000000301",
      "profileId": "64f000000000000000000001",
      "purpose": "nin",
      "subject": "self",
      "documentKind": "nin_slip",
      "version": 1,
      "previousEvidenceId": null,
      "mimeType": "application/pdf",
      "size": 245120,
      "state": "clean",
      "errorCode": null,
      "scannedAt": "2026-10-25T11:00:00.000Z",
      "createdAt": "2026-10-25T10:45:00.000Z"
    }
  ],
  "nextCursor": null
}
```

`legacyFileId` is present only for legacy-linked evidence. Evidence states in the model are `migration_pending`, `awaiting_upload`, `quarantined`, `scanning`, `clean`, `rejected`, `retry`, `activation_pending`, `held`, `deleting`, `privacy_deleting`, and `deleted`.

#### `GET /api/profiles/current/onboarding/evidence/:id`

Returns one evidence DTO in the same shape as a `evidence[]` element.

#### `GET /api/profiles/current/onboarding/evidence/:id/content`

Returns the complete private file bytes, not JSON. Access is limited to its holder/current profile and only when current scan policy, content hash and clean state pass. Range requests and query parameters are rejected. Response is `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, sandbox CSP and inline content disposition.

### Evidence upload, retry and delete request

#### `POST /api/profiles/current/onboarding/evidence`

Multipart fields: `file` (exactly one; accepted PDF/JPEG/PNG/WebP), `purpose` (required), `subject` (optional; defaults `self`), `documentKind` (optional; defaults to purpose), `operationKey` (required, 8–100 allowed by shared validator and not `legacy_` prefix), `previousEvidenceId` (optional, required to match the current version when replacing).

Upload middleware limits: one file, 50 MiB hard request limit, five text fields, 1 KiB each. The active private-evidence policy may impose a lower maximum. Success is **202 Accepted** and returns the evidence DTO in quarantine/pending processing state.

```text
POST /api/profiles/current/onboarding/evidence
Authorization: Bearer <access-token>
X-Profile-ID: <profile-id>
X-Step-Up-Challenge: <verified-challenge-id>
Content-Type: multipart/form-data

file=<binary>
purpose=nin
subject=self
documentKind=nin_slip
operationKey=evidence_nin_20261025_a1b2
```

```json
{
  "id": "64f000000000000000000301",
  "profileId": "64f000000000000000000001",
  "purpose": "nin",
  "subject": "self",
  "documentKind": "nin_slip",
  "version": 1,
  "previousEvidenceId": null,
  "mimeType": "application/pdf",
  "size": 245120,
  "state": "quarantined",
  "errorCode": null,
  "scannedAt": null,
  "createdAt": "2026-10-25T10:45:00.000Z"
}
```

On a replacement, `previousEvidenceId` must name the latest evidence version for the same purpose/subject; otherwise `CONFLICT_EVIDENCE_VERSION`. Duplicate `operationKey` with identical content replays its DTO; with different content returns `CONFLICT_EVIDENCE_OPERATION`.

#### `POST /api/profiles/current/onboarding/evidence/:id/retry`

JSON body `{ "expectedVersion": 1 }`; requires step-up. Returns 202 and evidence DTO after scan retry is queued.

#### `DELETE /api/profiles/current/onboarding/evidence/:id`

JSON body `{ "expectedVersion": 1 }`; requires step-up. Returns 202 and evidence DTO in `deleting`. Historical migration evidence, evidence referenced by a submitted verification case or signatory record, and evidence still referenced by the onboarding draft cannot be deleted through this route.

### Verification-case DTO and holder endpoints

Case DTO:

```json
{
  "id": "64f000000000000000000401",
  "profileId": "64f000000000000000000001",
  "kind": "buyer",
  "structure": "individual",
  "draftVersion": 7,
  "state": "submitted",
  "version": 1,
  "rejectionCodes": [],
  "submittedAt": "2026-10-25T11:00:00.000Z",
  "reviewedAt": null,
  "expiresAt": null
}
```

States: `submitted`, `under_review`, `approved`, `rejected`, `withdrawn`, `superseded`, `expired`.

#### `POST /api/profiles/current/verification-cases`

Requires current profile holder/team authority and step-up. The current onboarding draft must be complete and `expectedDraftVersion` must match. `operationKey` makes submission idempotent. `people` must provide route/country for every declared person in the draft. Individual profiles that require identity evidence also send `identityRoute`, `identityCountry`, and exact purpose/evidence references.

```json
{
  "expectedDraftVersion": 7,
  "operationKey": "verification_case_20261025_a1b2",
  "people": [],
  "identityRoute": "nigerian",
  "identityCountry": "NG",
  "identityEvidence": [
    {"purpose": "bvn", "evidenceId": "64f000000000000000000301"},
    {"purpose": "nin", "evidenceId": "64f000000000000000000302"},
    {"purpose": "additional_government_id", "evidenceId": "64f000000000000000000303"},
    {"purpose": "proof_of_address", "evidenceId": "64f000000000000000000304"}
  ]
}
```

The sample is for an individual Nigerian profile whose current intake requires the Nigerian evidence route. `people` must be populated from the profile's declared person fields when applicable; for each element the exact body is `{ "path": "directors[0]", "route": "nigerian", "country": "NG" }`. Use exact draft-declared paths. International evidence requires approved country-specific document-kind configuration. Company/cooperative submissions use source-defined fields already saved in the encrypted onboarding draft and do not submit those profile fields again here.

Success is HTTP 201 with the case DTO. Errors include `CONFLICT_ONBOARDING_VERSION`, `CONFLICT_VERIFICATION_DRAFT`, `REVIEW_ONBOARDING_INCOMPLETE`, `CONFLICT_VERIFICATION_OPERATION`, `CONFLICT_VERIFICATION_ACTIVE`, `INPUT_IDENTITY_EVIDENCE_REQUIRED`, `INPUT_IDENTITY_ROUTE_INVALID`, `FEATURE_IDENTITY_DOCUMENTS_UNCONFIGURED`, and `FEATURE_GAZETTEER_UNCONFIGURED`.

#### `GET /api/profiles/current/verification-cases`

Query: `limit` (default 25, 1–100), `before` (ObjectId cursor), optional `state` from the state list. Response `{ "cases": [<case DTO>], "nextCursor": "<id-or-null>" }`.

#### `GET /api/profiles/current/verification-cases/:id`

Returns the case DTO. Holder response does not include private evidence snapshot or staff checks.

#### `GET /api/profiles/current/verification-cases/:id/history?limit=25&before=<audit-id>`

Response:

```json
{
  "events": [{"id":"64f000000000000000000501","action":"verification_submitted","version":1,"at":"2026-10-25T11:00:00.000Z"}],
  "nextCursor": null
}
```

Holder history omits actor IDs and encrypted decision details.

#### `POST /api/profiles/current/verification-cases/:id/state`

Requires step-up. Exact body is `{ "expectedVersion": 1, "action": "withdraw" }`; holder may withdraw only. `claim` is a staff-only operation on the admin route. Returns updated case DTO. State/version conflicts use `CONFLICT_VERIFICATION_VERSION` and `CONFLICT_VERIFICATION_STATE`.

### Staff queue, evidence, claim, decision and history

Mounted at `/api/admin`. `/verification-cases` is canonical; `/company-verification-cases` is a compatibility alias with the same handlers.

- `GET /api/admin/verification-cases?limit=25&state=submitted&cursor=<signed-cursor>` — current admin session, Trust & Safety department. Response `{cases,nextCursor}`. `limit` is 1–100; supported `state` values are the case states above. `before` is accepted for legacy paging; staff cursor is signed and must be passed back unchanged.
- `GET /api/admin/verification-cases/:id` — staff detail DTO adds `reviewDeadlineState`, `reviewDueAt`, `escalationDueAt`, `escalationEnqueuedAt`; also `snapshot`, `requiredChecks`, `approvalBlockers`. Snapshot is private applicant/case data; show only to authorized review staff.
- `GET /api/admin/verification-cases/:id/history?limit=25&before=<audit-id>` — events also include `actorId`, `actingProfileId`, and a decrypted `decision` when one was recorded and available.
- `GET /api/admin/verification-cases/:id/evidence/:evidenceId/content` — full binary inline content, private/no-store, nosniff, sandboxed CSP; query params and Range are denied. Current Trust & Safety authority and case membership are rechecked before and after reading.
- `POST /api/admin/verification-cases/:id/claim` — requires step-up; body `{ "expectedVersion": 1 }` (the controller forces action `claim`). Response staff case DTO.
- `POST /api/admin/verification-cases/:id/decision` — requires step-up; body below. Response staff case DTO.

Approve body shape:

```json
{
  "expectedVersion": 2,
  "decision": "approved",
  "checks": [
    {"field":"countryOfResidence","source":"official_registry","reference":"private reference recorded by reviewer"},
    {"field":"evidence.64f000000000000000000301","source":"approved_provider","reference":"private evidence reference","expiresAt":"2027-10-25T00:00:00.000Z"}
  ]
}
```

`checks` must contain exactly one unique entry for every `requiredChecks` item returned by the staff detail endpoint; `source` must be in the approved `company_verification.manualSources` policy. Check fields vary by profile/case/evidence. Evidence checks require `expiresAt`, or `nonExpiring:true` only for policy-approved evidence purposes. Cooperative registration/state registration checks have additional issuer/jurisdiction fields. For company-buyer cases SCUML applicability checks can include `applicability:"required"|"not_applicable"` as allowed by the current policy.

Reject body:

```json
{
  "expectedVersion": 2,
  "decision": "rejected",
  "reasonCodes": ["DOCUMENT_UNREADABLE"]
}
```

Approval requires current case version, current policy revision, current evidence versions/hashes, all independent checks, and reviewer assignment to the current reviewer. Staff cannot review their own identity/profile, their membership's profile, or a person listed in the case. Internal Audit is read-only. Relevant errors include `PERMISSION_DEPARTMENT_REQUIRED`, `PERMISSION_SEPARATION_OF_DUTIES`, `PERMISSION_CASE_REVIEWER_REQUIRED`, `REVIEW_VERIFICATION_CHECKS_REQUIRED`, `INPUT_VERIFICATION_CHECK_INVALID`, `INPUT_VERIFICATION_REJECTION_REQUIRED`, `CONFLICT_VERIFICATION_VERSION`, `CONFLICT_VERIFICATION_STATE`, `CONFLICT_VERIFICATION_EVIDENCE`, `CONFLICT_VERIFICATION_POLICY`, and configuration-gated `FEATURE_GAZETTEER_UNCONFIGURED`.

**Implementation caveat:** the evidence upload route's middleware ordering described in section 1 prevents upload-byte digest binding. The other evidence metadata/state contracts are implemented as described, but clients must not treat that route as enforcing file-bound step-up until the route order is corrected.

**Source references:** `src/app.js`, `src/routes/profileRoutes.js`, `src/routes/adminRoutes.js`, `src/controllers/profileVerificationController.js`, `src/controllers/profileEvidenceController.js`, `src/services/profileVerificationService.js`, `src/services/profileEvidenceService.js`, `src/services/individualIdentityEvidenceService.js`, `src/constants/profileEvidence.js`, `src/constants/profileOnboardingFields.js`.

## 3. Cart checkout initialization

### `POST /api/cart/checkout/initialize`

This is the cart checkout operation. It is distinct from legacy direct payment initialization at `POST /api/payments/initialize`.

**Authentication and prerequisites**

- Requires Bearer authentication, `verified` access level, current selected buyer profile, enabled step-up factor and a bound `X-Step-Up-Challenge`.
- Current identity must have verified email and phone and minimum approved KYC. Current buyer profile must satisfy final purchase terms/signatory checks.
- Cart must be active, non-empty, each item must still pass its cart-item eligibility snapshot, and total must be greater than zero. Price/eligibility is rebuilt server-side from the cart.
- Current registered route requires an account; guest-cart routes do not make this checkout endpoint guest accessible.

**Request body**

The controller reads optional `email`; registered user's stored email takes precedence. There is no documented `Idempotency-Key` header or required client idempotency field. For the normal registered buyer request send `{}`. Step-up must bind the exact JSON body sent.

```http
POST /api/cart/checkout/initialize
Authorization: Bearer <access-token>
X-Profile-ID: <buyer-profile-id>
X-Step-Up-Challenge: <challenge-id>
Content-Type: application/json
```

```json
{}
```

**Success — HTTP 201**

```json
{
  "redirectUrl": "https://checkout.paystack.com/example",
  "authorizationUrl": "https://checkout.paystack.com/example",
  "reference": "paystack_reference",
  "checkoutId": "64f000000000000000000601",
  "totalAmount": 2500000,
  "currency": "NGN"
}
```

When a matching, unexpired checkout is already `payment_initialized` with a pending payment, the response has the same fields and adds `"pending": true`.

**States and verification**

Checkout status model values: `pending`, `payment_initialized`, `paid`, `allocation_processing`, `completed`, `partially_failed`, `failed`, `expired`, `refunded`, `partially_refunded`. Item allocation states: `pending`, `processing`, `allocated`, `failed`, `refunded`. The checkout detail serializer returns `{checkoutId,profileId,paymentReference,totalAmount,currency,status,expiresAt,items:[{id,type,resourceId,description,amount,status,allocationId?,failureReason?}]}`. `GET /api/cart/checkouts/:checkoutId` is the authenticated buyer/admin detail route; buyer access is profile scoped.

After Paystack redirect/webhook, the frontend may call:

`GET /api/payments/verify/:reference`

This is a provider verification fallback, not checkout initialization. On verified success it responds `{ "verified": true, "payment": <serialized payment> }`; when Paystack has not succeeded it responds `{ "verified": false }` with HTTP 200. The payment callback/webhook also finalizes side effects. Fetch `GET /api/cart/checkouts/:checkoutId` afterward to render allocation status.

**Errors and provider availability**

Known business errors include `AUTH_KYC_REQUIRED`, `AUTH_PROFILE_KIND_FORBIDDEN`, `AUTH_SESSION_REQUIRED`, `CART`/eligibility 400 or 409 errors, and `PAYMENT_PROVIDER_UNAVAILABLE`/Paystack configuration 503 depending on the failure point. Empty cart or zero total is rejected; stale cart-item eligibility returns 409 with invalid item reasons internally, but the shared HTTP error serializer does not preserve arbitrary `details` fields. Missing/invalid Paystack response is currently thrown as 502 and sanitized to the shared error envelope.

**Retry contract:** the initializer now atomically creates a pending checkout and changes the cart to `checkout_pending` before calling Paystack. A provider or persistence outcome that cannot be confirmed is recorded as `outcome_unknown`; the endpoint returns `PAYMENT_CHECKOUT_INITIALIZATION_PENDING` and subsequent initialization requests refuse to call Paystack again. This prevents duplicate provider attempts but deliberately requires provider/payment reconciliation or support before retry. There is still no client-supplied idempotency header. See [chapter 20 §6](20-pass01-03-contract-remediation.md#6-checkout-initialization-and-safe-retry-behavior).

**Source references:** `src/app.js`, `src/routes/cartRoutes.js`, `src/controllers/cartController.js`, `src/services/cartCheckoutService.js`, `src/models/CartCheckout.js`, `src/routes/paymentRoutes.js`, `src/controllers/paymentController.js`.

## 4. Project publication

### `PATCH /api/projects/:id`

There is no separate mounted project-publish endpoint. Publication is an action on the existing project update route. `POST /api/projects` creates a draft; it allows only `publicationAction:"save_draft"`, not publishing during creation.

**Authentication and permissions**

- Bearer authentication, registered and verified seller/developer access, current selected profile.
- Project authorization checks current project permissions. Publishing requires `listing.publish`; owner signatory authority, current developer verification/KYC, organization eligibility, and publication eligibility are rechecked.
- Step-up middleware is invoked for `publicationAction` publish actions, legacy publication flags, and commercial field changes. Bind the exact PATCH path and request body.

**Request body**

`expectedVersion` is an accepted optional non-negative integer. When provided it must match current project version (`CONFLICT_PROJECT_VERSION`). Frontend should always send the version from the project DTO. Supported `publicationAction` values on update are `publish_all_ready`, `publish_selected`, `save_draft`. `selectedUnitIds` is required and non-empty only for `publish_selected`, accepts unique ObjectIds and is bounded by configured grid-job maximum. Do not send generic `{publish:true}` as the canonical contract.

Publish all ready:

```json
{
  "expectedVersion": 8,
  "publicationAction": "publish_all_ready"
}
```

Publish selected:

```json
{
  "expectedVersion": 8,
  "publicationAction": "publish_selected",
  "selectedUnitIds": ["64f000000000000000000701"]
}
```

For either, step-up initiation must bind `method:"PATCH"`, `path:"/api/projects/<projectId>"`, and the exact body object above; then provide `X-Step-Up-Challenge` on the same PATCH.

**Success response — HTTP 200**

The endpoint returns `{ "project": <project detail DTO plus publication and version> }`. The `publication` property is:

```json
{
  "published": true,
  "publishedUnitCount": 6,
  "blockedUnitCount": 1,
  "blockedUnits": [
    {"unitId":"64f000000000000000000702","blockers":[{"field":"titleType","code":"REVIEW_FIELD_REQUIRED"}]}
  ],
  "projectBlockers": []
}
```

`projectBlockers` is omitted when empty. Top-level returned project DTO includes `version`; the publication result is nested at `project.publication`.

**Readiness and state behavior**

Project and unit publication readiness are evaluated server-side. At least one eligible approved unit is needed for project-wide publication. Project-level blockers prevent selected publication. Each selected unit must belong to this project, be approved and ready. Current owner must be an active verified developer; company eligibility and listing cap/publication gates apply. Duplicate holds, private reserve policy and title/ownership conditions can block publication. Publishing ready units can publish the project; no ready eligible units produces an error. `save_draft`, `isPublished:false` or `unpublish:true` unpublishes the project and project units. Legacy flags remain accepted only under the mutually exclusive validation rules; use `publicationAction`.

**Errors**

`CONTENT_PROJECT_PUBLICATION_NOT_READY` (422), `CONTENT_PROJECT_PUBLICATION_SELECTION_INVALID` (409/422), `CONTENT_CANONICAL_RECLASSIFICATION_REQUIRED` (409), `CONTENT_DUPLICATE_REVIEW_REQUIRED` (409), `AUTH_DEVELOPER_VERIFICATION_REQUIRED` (403), `AUTH_KYC_REQUIRED` (403), `PERMISSION_INDEPENDENT_REVIEW_REQUIRED` (403), `CONFLICT_PROJECT_VERSION` (409), `CONFLICT_LISTING_VERSION` (409), and relevant configuration/policy gates. Shared error envelope is `{ "message": "...", "code": "..." }`.

**Resolved response behavior:** for `CONTENT_PROJECT_PUBLICATION_NOT_READY`, the shared error middleware returns an allowlisted `publicationReadiness` object containing canonical field/code blocker pairs and valid unit IDs. It discards arbitrary internal detail fields. See [chapter 20 §5](20-pass01-03-contract-remediation.md#5-project-publication-deletion-and-media-contracts).

**Source references:** `src/routes/projectRoutes.js`, `src/controllers/projectController.js`, `src/services/profileProjectService.js` (`validateBody`, `publish`, `update`), `src/middleware/stepUpMiddleware.js`, `src/middleware/errorMiddleware.js`.

## 5. Canonical property map

### `GET /api/properties/map`

Two implementations exist. Use `queryVersion=canonical-v1` for the shared catalogue/map/facets semantics below. Requests containing recognized canonical query fields also enter this path. Legacy requests fall through to `propertyMapService` and have a different DTO; do not mix both query contracts in one frontend client.

**Authentication** is optional for public map search. Public result DTOs are used. If `fromAccountsIFollow=true`, current authentication/profile context is needed to resolve followed profiles.

**Canonical query parameters**

Required bounds for map view: `north`, `south`, `east`, `west`. If any bound is supplied, all four are required. `mapActive=true` also requires all four. `mapActive=false` causes supplied bounds to be ignored with notice. Bounds are numeric degrees, valid geographic ranges, north must not be south of south, east must not be west of west, and area must not exceed configured maximum. `mapZoom` (alias `zoom`) is 0–22; both cannot disagree. Controller defaults map zoom to `10` when canonical map search is selected.

The canonical parser's fixed query keys are:

```text
queryVersion, page, limit, sort, status, search, reference, exactReference,
includeUnpriced, withPhotosOnly, includeUnderOffer, includeSold,
north, south, east, west, mapActive, mapZoom, zoom,
nearbyLat, nearbyLng, nearbyRadiusKm, projectId, projectSlug,
minPrice, maxPrice, priceBand,
installmentDuration, instalmentDuration, initialDepositCap, escrowAvailable,
serviceCharge, handoverFrom, handoverBy, publishedWithin, reducedSinceListing,
distressSaleOnly, readyToMoveIn, numberOfFloors, videoTour, hasVideoTour,
has3dTour, hasFloorPlan, hasDroneFlyThrough, openHouse, openHouseThisWeekend,
privateShowingsByAppointment, hasShowHome, platformVerifiedTitleOnly,
platformVerifiedListingOnly, advertiserType, fromAccountsIFollow,
commuteFrom, commuteMinutes, bedrooms, bathrooms, propertyType, category,
completionStage, installmentAvailable
```

`page` defaults to 1 (maximum 10000); `limit` defaults to 50 (range 1–100). `sort` defaults to `recommended` and accepts `recommended`, `newest`, `price_asc`, `price_desc`, `handover_soonest`, `verified_first`, `recently_reduced`, `largest_reduction`, `bedrooms_desc`, `floor_area_desc`, `highest_rated`, and `trust_tier`. Source-compatible sort aliases include `recent`, `newest_most_recent`, `price_low_to_high`, `price_high_to_low`, `handover_date_soonest`, `price_reduced_largest_drop`, `bedrooms`, `bedrooms_most`, `floor_area`, and `floor_area_largest`.

The parser also accepts the source-compatible filter aliases `type`, `types`, `propertyTypes`, `categories`, `stages`, `completionStage`, `beds`, `toilets`, `title`, `amenities`, `titles`, `titleDeclarations`, `payment_type`, `price_negotiable`, `price_reduced`, `search_as_i_move_the_map`, `min_price`, `max_price`, `min_beds`, `max_beds`, `exact_beds`, `minBeds`, `maxBeds`, `exactBeds`, `min_internal_floor_area`, `max_internal_floor_area`, `minBuiltUpArea`, `maxBuiltUpArea`, `min_built_up_area`, `max_built_up_area`, `min_plot_area`, `max_plot_area`, `min_plot_size`, `max_plot_size`, `minBedrooms`, `maxBedrooms`, `exactBedrooms`, `minBathrooms`, `maxBathrooms`, `exactBathrooms`, `minArea`, `maxArea`, `minPlotArea`, `maxPlotArea`, `minPrice`, and `maxPrice`. Aliases normalize to the shared canonical key; supplying two aliases for the same filter with different values returns `CONTENT_QUERY_ALIAS_CONFLICT`.

In addition to the fixed names above, a field key is accepted only when it is marked `searchable` in `src/constants/listingDictionary.js` and is not excluded by `canonicalCatalogueService.js` as private or non-filterable. Numeric searchable fields accept `min<Field>`, `max<Field>`, and `exact<Field>` forms (with the specific aliases listed above); `askingPrice` is the price-range exception. This source-defined dynamic set is the authoritative list—arbitrary field names are rejected. `installmentAvailable` supports `true`; `false` is explicitly rejected in favor of the source-defined `paymentOptions` filter.

Recognized-but-unavailable or non-filter request fields are not usable filters: `currency` and `featured` return `CONTENT_QUERY_REMOVED_FILTER`; `ownerId`, `hasProject`, `listingType`, `developmentStatus`, `minConstructionProgress`, `maxConstructionProgress`, `completionBefore`, and `completionAfter` return `CONTENT_QUERY_UNSUPPORTED_FILTER`. Price comparisons use source currency/FX behavior, not a currency-membership filter. For query semantics, see `src/services/canonicalCatalogueService.js` normalization and `matchesCriteria`; the map endpoint uses that shared pipeline rather than map-only matching.

**Request example**

```http
GET /api/properties/map?queryVersion=canonical-v1&north=6.60&south=6.35&east=3.60&west=3.20&mapZoom=13&page=1&limit=50&status=available&sort=recommended&propertyType=detached_house&minPrice=50000000
```

**Property mode response** (at/above configured detail zoom; shape abbreviated only for large property DTO):

```json
{
  "mode": "properties",
  "bounds": {"north":6.6,"south":6.35,"east":3.6,"west":3.2},
  "zoom": 13,
  "total": 28,
  "truncated": false,
  "facets": {"categories":{},"propertyTypes":{},"buildStages":{},"availability":{},"unpriced":0,"distressSale":0,"verifiedListing":0,"byField":{},"byFieldTruncated":{},"media":{},"viewings":{},"freshness":{},"priceCountsByCurrency":{}},
  "sort": "recommended",
  "page": 1,
  "limit": 50,
  "properties": [
    {
      "_id": "64f000000000000000000801",
      "publicReference": "RTQ-PROP-10000001",
      "title": "Example home",
      "locationPoint": {"type":"Point","coordinates":[3.35,6.45]},
      "canonicalEffectiveFields": {"propertyType":"detached_house","askingPrice":75000000,"currency":"NGN"}
    }
  ],
  "normalization": {"queryVersion":"canonical-v1","query":{},"notices":[]}
}
```

The example property fields are illustrative; actual properties pass through the public serializer. Private owner contacts, reserve prices, private title/evidence identifiers and other private fields are not map DTO fields.

**Cluster mode response** (below configured detail zoom):

```json
{
  "mode":"clusters",
  "bounds":{"north":6.6,"south":6.35,"east":3.6,"west":3.2},
  "zoom":8,
  "total":120,
  "priceAggregateState":"configured",
  "clusters":[
    {"clusterId":"0.5:6.000:3.000","lat":6.25,"lng":3.25,"propertyCount":18,"sponsoredCount":2,"minimumPrice":25000000,"maximumPrice":90000000}
  ],
  "facets":{},
  "sort":"recommended",
  "page":1,
  "limit":50,
  "normalization":{"queryVersion":"canonical-v1","query":{},"notices":[]}
}
```

Canonical cluster aggregates are built from all matching map results, not page-only rows. Where an FX comparison needed for price aggregates has no approved current rate, the cluster reports `priceAggregateState:"fx_unconfigured"` and price extrema can remain null. Property mode uses canonical result pagination and sets `truncated` from total vs page limit. Empty results use the same DTO with `total:0`, empty `properties` or `clusters`, and facets/counts of zero.

**Errors/configuration gates**

Invalid/partial bounds: `CONTENT_QUERY_GEO_INVALID` (400); excessive viewport: `CONTENT_QUERY_GEO_INVALID` (422); unsupported filter/sort: `CONTENT_QUERY_UNSUPPORTED_FILTER`/`CONTENT_QUERY_SORT_INVALID` (400); unavailable mandatory FX/verification/trust policy can return a 503 `FEATURE_*` code. `GET /api/properties/map` without a canonical query uses legacy map parameters `north,south,east,west,zoom,page,limit`; legacy response shape is `propertyMapService`'s `mode/bounds/zoom/total` plus `properties` or `clusters` and is not the canonical facets/normalization contract.

**Source references:** `src/app.js`, `src/routes/propertyRoutes.js`, `src/controllers/propertyController.js` (`getMapProperties`), `src/services/canonicalCatalogueService.js` (`normalizeCanonicalQuery`, `searchProperties`, `buildCanonicalMap`), `src/services/propertyMapService.js`, `src/config/firstBatchPolicies.js`.

## 6. Project unit-grid mutations, jobs and undo

All routes below are mounted under `/api/projects`; `projectId` is the Mongo ObjectId path reference. They require Bearer authentication and current project/profile authorization. Seller export is not available to staff.

### Grid read — `GET /api/projects/:projectId/unit-grid`

Query: `page` (default 1, max 10000), `limit` (default 50, max 100), `sort` (`newest`, `price_asc`, `price_desc`, `availability`, `publication`, `unit_type`), `search`, `unitTypeId`, `availability` (`available`, `under_offer`, `sold`, `not_released`), `publicationState` (`published`, `unpublished`, `blocked`, `needs_review`, `archived`), `problemsOnly` boolean, `minPrice`, `maxPrice`, `currency` (`NGN`/`USD`, required with price bounds/sort), `propertyType` (supported built type).

Response:

```json
{
  "project": {"id":"64f000000000000000000101","name":"Example project"},
  "projectVersion": 8,
  "items": [
    {
      "_id":"64f000000000000000000701",
      "publicReference":"RTQ-PROP-10000001",
      "rawOverrides":{"bedrooms":3},
      "effectiveFields":{"bedrooms":3,"currency":"NGN","askingPrice":75000000},
      "fieldSources":{"bedrooms":{"sourceLevel":"unit","state":"overridden"},"currency":{"sourceLevel":"project","state":"inherited"}},
      "version":4,
      "readiness":{"publicationState":"unpublished","problems":false,"blockers":[],"migrationState":"mapped"}
    }
  ],
  "pagination":{"page":1,"limit":50,"total":1,"pages":1},
  "filters":{"page":1,"limit":50,"sort":"newest"}
}
```

`blockers` and `migrationState` are included only in the owner profile's projection; public-effective fields and source provenance remain distinct.

### Synchronous canonical edits/type moves — `POST /api/projects/:projectId/unit-grid/bulk`

Body requires `operationKey` (8–100 URL-safe characters), `expectedProjectVersion`, and 1..configured `maxRowsPerRequest` rows. Each row has `unitId`, `expectedVersion`, and exactly one of:

- `canonicalFieldMutations`: 1..configured per-row max, each mutation uses `{field,operation,value?}` per canonical mutation contract (`set`, `unset`, `reset_to_inherited` where the field supports it); or
- `unitTypeId`: move the unit to a same-project unit type.

```json
{
  "operationKey":"grid_edit_20261025_a1b2",
  "expectedProjectVersion":8,
  "rows":[
    {"unitId":"64f000000000000000000701","expectedVersion":4,"canonicalFieldMutations":[{"field":"bedrooms","operation":"set","value":3}]}
  ]
}
```

Success HTTP 200:

```json
{
  "operation":{"id":"64f000000000000000000901","state":"applied","action":"field_edit","undoAvailable":true,"undoExpiresAt":"2026-10-26T11:00:00.000Z","rowCount":1,"createdAt":"2026-10-25T11:00:00.000Z","undoneAt":null,"rows":[{"propertyId":"64f000000000000000000701","beforeVersion":4,"afterVersion":5,"fields":["bedrooms"]}]},
  "projectVersion":9,
  "replayed":false
}
```

Repeating the same operation key and request returns `replayed:true`; using it for different content returns `CONFLICT_GRID_OPERATION_KEY`. Sold/buyer-recorded units, private/system fields, duplicate field mutations, stale project/unit versions and unavailable configured location/site-plan fields are rejected.

### Durable jobs — `POST /api/projects/:projectId/unit-grid/jobs`

HTTP 202 with `{ "job": <job summary> }`. Common envelope:

```json
{
  "operationKey":"grid_job_20261025_a1b2",
  "expectedProjectVersion":8,
  "action":"availability",
  "actionOptions":{"targetAvailability":"Under Offer"},
  "rows":[
    {"unitId":"64f000000000000000000701","expectedVersion":4}
  ]
}
```

Actions: `field_edit`, `availability`, `price_adjustment`, `publish`, `unpublish`, `archive`, `confirm`. For `field_edit`, each row follows the synchronous edit schema. For actions other than `field_edit`, rows contain only unitId/expectedVersion. `availability` requires `actionOptions.targetAvailability` in `Available`, `Under Offer`, `Not released`; a unit may not be transitioned to Sold here. `price_adjustment` requires `actionOptions:{mode:"amount"|"percentage",direction:"increase"|"decrease",value:<positive number>}`; amount must be a whole number. Other actions do not accept `actionOptions`. `confirm` requires configured freshness policy.

Job summary:

```json
{
  "id":"64f000000000000000001001",
  "projectId":"64f000000000000000000101",
  "action":"availability",
  "state":"queued",
  "operationKey":"grid_job_20261025_a1b2",
  "createdAt":"2026-10-25T11:00:00.000Z",
  "startedAt":null,
  "completedAt":null,
  "progress":{"total":1,"completed":0,"failed":0,"cancelled":0,"remaining":1},
  "cancellationRequested":false,
  "rows":[{"index":0,"unitId":"64f000000000000000000701","state":"queued","attempts":0,"undoAvailable":false}]
}
```

Overall states: `queued`, `processing`, `completed`, `partially_completed`, `failed`, `cancelled`. Row states: `queued`, `processing`, `completed`, `failed`, `cancelled`. A completed row can contain `operationId`, `operationCreatedAt`, `beforeVersion`, `afterVersion`; an error row contains `error:{code,message}`. A job key is idempotent for the same profile/project and request hash; a key with different request returns `CONFLICT_GRID_JOB_KEY`.

### Poll and cancel

- `GET /api/projects/:projectId/unit-grid/jobs/:jobId` → HTTP 200 `{ "job": <job summary> }`; same currently authorized project profile must own the job context.
- `POST /api/projects/:projectId/unit-grid/jobs/:jobId/cancel` → HTTP 200 `{ "job": <job summary> }`; no request body is consumed by the controller. Completed terminal jobs replay unchanged; in-progress jobs receive cancellation request and queued rows can become cancelled.

Job creation conflicts include `CONFLICT_PROJECT_VERSION`, `CONFLICT_LISTING_VERSION`, `CONTENT_GRID_JOB_INVALID`, `CONTENT_GRID_AVAILABILITY_INVALID`, `CONTENT_GRID_PRICE_ADJUSTMENT_INVALID`, `CONTENT_GRID_JOB_KEY`, and resource/permission failures. Workers recheck current account/session/profile/permissions before each row.

### Undo — `POST /api/projects/:projectId/unit-grid/operations/:operationId/undo`

Requires `X-Step-Up-Challenge` bound to POST, exact path and `{}` request body. The controller ignores a request body; frontend should send `{}`. Success HTTP 200:

```json
{
  "operation":{"id":"64f000000000000000000901","state":"undone","action":"field_edit","undoAvailable":false,"rowCount":1,"createdAt":"2026-10-25T11:00:00.000Z","undoneAt":"2026-10-25T11:05:00.000Z","rows":[{"propertyId":"64f000000000000000000701","beforeVersion":4,"afterVersion":5,"fields":["bedrooms"]}]},
  "rows":[{"property":"64f000000000000000000701","version":6}],
  "replayed":false
}
```

Undo is version-aware: every unit must still have the operation's `afterVersion`, remain in the current profile scope and not gain sale history; original unit-type capacity/availability and canonical validation are rechecked. The undo window is configured by backend policy. Errors include `CONFLICT_GRID_UNDO_NOT_SUPPORTED`, `CONFLICT_GRID_UNDO_EXPIRED`, `CONFLICT_GRID_UNDO_SCOPE`, `CONFLICT_GRID_UNDO_VERSION`, `CONFLICT_LISTING_VERSION`, and `AUTH_STEP_UP_REQUIRED`. Undo replay returns `replayed:true`.

**Source references:** `src/routes/projectRoutes.js`, `src/controllers/projectController.js`, `src/services/profileProjectService.js`, `src/services/projectUnitGridJobService.js`, `src/models/ProjectUnitGridJob.js`, `src/models/ProjectUnitGridOperation.js`, `src/middleware/stepUpMiddleware.js`.

## 7. Privacy execution outcomes

### Applicant: `GET /api/profiles/current/data-protection-requests/:id/execution`

Requires authentication, registered access and current active profile. The request must belong to that selected profile and requester. No body or additional headers beyond Bearer/profile are required.

### Staff: `GET /api/admin/data-protection-requests/:id/execution`

Requires current admin staff session and data-protection review authority; execution service rechecks the staff authorization. Staff response may additionally include `completionNotice`.

The endpoint returns this exact shape (fields with null/conditional values are present as produced below):

```json
{
  "requestId":"64f000000000000000001101",
  "state":"partially_blocked",
  "version":4,
  "completedAt":null,
  "resultCodes":["PROFILE_IDENTITIES_ANONYMIZED","LEGAL_HOLD_ACTIVE"],
  "job":{
    "state":"partially_blocked",
    "dueAt":"2026-10-25T11:00:00.000Z",
    "attempts":2,
    "progress":{"discovered":12,"completed":6,"preserved":3,"blocked":2,"processing":0},
    "resultCodes":["PROFILE_IDENTITIES_ANONYMIZED"],
    "lastErrorCode":null,
    "completedAt":null
  },
  "export":null,
  "deletion":{
    "counts":{"discovered":12,"completed":6,"preserved":3,"blocked":2,"held":1,"eligible":0,"processing":0},
    "outcomes":[
      {"recordKind":"profile","category":"account","state":"completed","reasonCode":"ANONYMIZED","proposedAction":"anonymize","count":2},
      {"recordKind":"private_evidence","category":"kyc","state":"preserved","reasonCode":"PRESERVE_LEGAL_EVIDENCE","proposedAction":"preserve","count":3},
      {"recordKind":"document","category":"support_record","state":"held","reasonCode":"LEGAL_HOLD_ACTIVE","proposedAction":"delete","count":1}
    ]
  }
}
```

For non-deletion requests `deletion` is `null`; for non-access requests `export` is `null`. `completionNotice` appears only on the staff endpoint for deletion requests and has `{state,outcome,attempts,lastErrorCode,acceptedAt}`.

**Important scope limitation:** this endpoint does not return a per-record execution ledger. Internal deletion summary items have record kind/category/state/reason/trigger/eligible date/proposed action/hold count, but `executionStatus` groups them by recordKind, category, state, reasonCode, proposedAction and returns only `count`. It does not return record IDs, trigger dates, eligible dates or hold IDs. The frontend can render outcome groups and totals only. If the intended UI needs one row per underlying record, that response contract is absent and must not be fabricated client-side.

Execution/job states include `queued`, `processing`, `waiting_for_policy`, `partially_blocked`, `completed`, `failed`; deletion outcome states are `discovered`, `eligible`, `processing`, `completed`, `preserved`, `blocked`, `held`. Job/execution is asynchronous: poll this GET; do not infer completion from the request acceptance response.

**Source references:** `src/routes/profileRoutes.js`, `src/routes/adminRoutes.js`, `src/controllers/dataProtectionRequestController.js`, `src/services/dataProtectionRequestService.js` (`executionStatus`), `src/services/dataProtectionExecutionService.js` (`status`), `src/services/dataProtectionDeletionService.js` (`summary`, `dto`).

## Confirmed contract gaps and frontend enablement

### Current contract limits

1. **Privacy execution exposes grouped outcomes, not record rows.** Frontend can implement aggregate progress/result groups. Per-record outcome UI is unsupported by the mounted API.
2. **Map has a canonical and legacy contract.** Use `queryVersion=canonical-v1` plus all bounds for catalogue parity. Legacy map calls have another DTO and filter builder.
3. **Unit-type endpoints are nested under the project path.** There is no plain unit-type detail GET or archive path. Use chapter 20 §4 for exact CRUD routes and DTOs.
4. **Project delete is not project archive.** `DELETE /api/projects/:id` deletes only an empty project and returns `409 CONFLICT_PROJECT_HAS_UNITS` if unit references exist.
5. **Checkout provider outcomes can be unknown.** Do not automatically issue a new initialization attempt after `PAYMENT_CHECKOUT_INITIALIZATION_PENDING`; use current checkout/payment status and reconciliation.

### Operations frontend Codex can safely enable now

- Bound JSON step-up initiation/verification and protected JSON calls, plus file-bound profile evidence upload using `__stepUpFileSha256` as defined in chapter 20.
- Verification case list/detail/history, staff queue/detail/history/claim/decision, evidence metadata and content reads, subject to current profile/staff authorization and configured policy gates.
- Cart checkout initialization using an active verified buyer profile and bound request body; payment verification and checkout detail polling. Do not auto-retry an unknown provider outcome.
- Project publish-all-ready and publish-selected requests with `publicationAction` and current `expectedVersion`, rendering allowlisted `publicationReadiness` blockers when returned.
- Canonical map searches with validated complete bounds, normalized shared filters, facets and either property or cluster mode.
- Grid reads, synchronous canonical field/type edits, durable job creation/poll/cancel and step-up undo with version-conflict handling.
- Privacy execution progress rendered as aggregate outcome groups; do not render fabricated per-record rows.

