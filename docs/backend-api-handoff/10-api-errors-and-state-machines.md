# API errors, retries and state machines

This guide describes error handling shared by mounted routes. Route-specific errors are listed in the corresponding feature guide and in controllers/services identified by [the mounted endpoint index](14-mounted-endpoint-index.md).

## Shared HTTP envelope and headers

`src/middleware/errorMiddleware.js` serializes ordinary errors as `{ "message": string, "code": string }`. Additional fields are emitted only for specific known cases (for example `existingAccess`, `requiresAccountDetails`, `requiresSellerAccount`, and listing validation `errors`). Some validation middleware returns `{ "code": "VALIDATION_FAILED", "errors": [...] }` without the usual `message`; client normalization must accept both forms. Never branch only on English `message` text.

Successful JSON endpoints return their domain DTO directly or the documented wrapper (`{property}`, `{project}`, `{job}`, etc.). A file/content endpoint may return a stream rather than JSON. `X-Request-ID` is generated per request and returned for support correlation. CORS exposes `X-Total-Count`, `X-Page`, `X-Page-Limit`, and `X-Request-ID`. Do not assume every paginated API uses these headers: catalogue, notifications, saved searches, histories, imports and grids also return route-specific pagination/cursors in JSON.

Common HTTP classes:

| Status | Meaning / frontend response |
|---|---|
| 400 / 422 | Malformed, unknown, unsupported or invalid field/query/state. Preserve form data and render field errors; do not drop unknown search filters silently. |
| 401 | Missing, expired, revoked, or invalid current session. Refresh only via supported auth flow; otherwise clear protected state and reauthenticate. |
| 403 | Current actor/profile/role/department/seat/mandate/verification/step-up permission absent. Hide affordance when current permission data says unavailable, but still handle server denial. |
| 404 | Resource is absent or intentionally not visible in this profile; do not infer cross-profile existence. |
| 409 | Current state, version, operation key, uniqueness, policy revision or idempotency conflict. Reload and ask user to resolve; do not blind-retry a mutation with a changed body. |
| 410 | Deprecated workflow/route. Follow replacement in the relevant guide. |
| 413 | Upload or body exceeds configured limit. Keep user content locally and request a smaller file. |
| 429 | Rate limit. Respect `Retry-After` if present; use backoff. |
| 503 | Explicit feature/policy/provider unavailable or transient required dependency failure. Keep criteria/data visible, explain the returned code, and do not retry with weaker validation or broader search. |
| 207 / 202 | Partial or accepted asynchronous operation, not an assertion that every row/provider delivery completed. Read per-item status or poll the returned job. |

## Stable error families

Codes are machine identifiers from `currentAccountService.accessError`, validators and providers. Exact accepted values depend on route. Treat the following code families as meaningful; feature docs enumerate key route-specific codes.

| Family / examples | Handling |
|---|---|
| `AUTH_*` — `AUTH_SESSION_REQUIRED`, `AUTH_STEP_UP_REQUIRED`, `AUTH_PROFILE_FORBIDDEN`, `AUTH_CONTACT_VERIFICATION_REQUIRED` | Re-resolve account/session/profile. Start step-up for sensitive mutation; never replay a stale challenge. |
| `PERMISSION_*` — `PERMISSION_PROFILE_REQUIRED`, `PERMISSION_DEPARTMENT_REQUIRED`, `PERMISSION_CASE_REVIEWER_REQUIRED` | Current authority missing; refresh current profile/access information. |
| `INPUT_*` / `CONTENT_*` — invalid identifier, enum, request shape, upload, query, field, currency, version | Bind error to field/form/query. API explicitly rejects unsupported keys rather than treating them as successful no-ops. |
| `CONFLICT_*` — profile/listing/project/unit/job/request/operation version, active request, duplicate key | Reload resource/job and reconcile. For idempotent submission, replay only the exact same operation key and payload. |
| `FEATURE_*` — provider/configuration/policy unavailable (for example `FEATURE_SEARCH_GEO_RADIUS_UNCONFIGURED`, unavailable approved location/FX/routing/rendering) | Present an unavailable state, preserve user selections, and allow independent functionality to continue. Never fabricate data. |
| `DOCUMENT_*` / `PRIVATE_*` | Do not fall back to public source URL. A quarantined, revoked or inaccessible item must remain unavailable. |
| `PAYMENT_*` / `CHECKOUT_*` | Treat provider callbacks as authoritative only after backend verification. Show pending/reconciliation state; never locally mark paid. |
| Direct-payment initialization: `PAYMENT_INITIALIZATION_PENDING`, `PAYMENT_INITIALIZATION_OUTCOME_UNKNOWN`, `PAYMENT_RESOURCE_RESERVED`, `CONFLICT_PAYMENT_INITIALIZATION`, `CONFLICT_LISTING_PRICE_CHANGED`, `CONFLICT_INSTALLMENT_CHANGED`, `CONFLICT_ESCROW_PAYMENT_STATE`, `PAYMENT_PROVIDER_UNAVAILABLE`, `PAYMENT_PROVIDER_RESPONSE_INVALID`, `FEATURE_PAID_TOUR_UNAVAILABLE` | Keep the returned reference and reconcile with `GET /api/payments/verify/:reference`. Do not start another provider attempt while unresolved. `FEATURE_PAID_TOUR_UNAVAILABLE` means the purchase workflow is not activated; do not replace it with free viewing. |
| `INPUT_PROPERTY_IMPORT_*`, `CONFLICT_GRID_*`, `CONFLICT_UNIT_*`, `EXPORT_RESULT_LIMIT` | Preserve staged rows; surface row-level errors/progress; obey limits returned by schema/policy route. |
| `CONTENT_DATA_PROTECTION_*`, `CONFLICT_DATA_PROTECTION_*`, `RETENTION_*`, `LEGAL_HOLD_*` | Show the request/job result and per-record retained/blocked reasons; do not promise deletion while policy/hold gate is active. |

For strict enumerations, route-specific service allowlists are authoritative. Do not build a client enum from arbitrary API examples.

## State and retry rules

| Workflow | Relevant states and transitions | Client rule |
|---|---|---|
| Authentication | login may require second factor; session active → revoked/expired | Store bearer securely; after profile switch re-fetch `/api/auth/account` and selected profile; clear cached private data on logout/revocation. |
| Verification | profile case `submitted`, claimed/review states, accepted/rejected/superseded/expired as returned | Evidence corrections create a new reviewable current record; only response status drives badges and publication gates. |
| Listing/project/unit | draft/incomplete → readiness evaluated → pending review/published → paused/archived/sold states according to resource and policy | Publication must be a server transition; readiness blockers are not proof of publication. Never locally flip public visibility. |
| Import | staged/correction → queued/processing → completed/partial/failed/cancelled | `202` means queued. Poll import detail/status. Cancellation is cooperative; committed rows stay committed. Retry only failed eligible rows. |
| Grid bulk job | queued → processing ↔ retry/deferred → completed/partial/failed/cancelled | Poll persisted job DTO with bounded backoff. A partial job contains committed rows; use row results. Undo checks versions and is not available for irreversible/sold/publication transitions. |
| Saved search/alerts | active preferences/cadence → scheduled/matching/queued delivery → sent/failed/retry/suppressed states | Alert delivery may be policy-gated. Use returned status; delivery attempt is not provider receipt. Do not repeatedly create duplicates. |
| Document | staged/uploaded → scanning/quarantined → accepted/rejected/review → current/replaced/revoked | Viewer/download session must be requested for current authorized version. Do not use stored URLs or assume replacement retains prior grant. |
| Data rights | submitted → review → queued → processing → completed/partially_blocked/failed, or waiting_for_policy/rejected/withdrawn | Poll execution and inspect item outcomes; retries are server-authorized; legal/retention-preserved records remain retained. |
| Payment/escrow | initialized/pending → verified/settled or failed/reversed/review; escrow release/dispute follows its own actor transitions | Backend verification/callback reconciliation is authoritative. Do not retry provider init with a new idempotency reference unless the server directs it. |

## Step-up and optimistic concurrency

Sensitive routes require a one-use challenge. Start with `POST /api/auth/step-up`, complete `POST /api/auth/step-up/:id/verify`, then send returned challenge in `X-Step-Up-Challenge`. Challenge binds method/path/profile/body. For multipart uploads, include the actual file digest through the exact route contract; editing any field or file invalidates the challenge.

Use the returned document/project/property/unit/profile/job version in the route's `expectedVersion`, `expectedProfileVersion`, or row-version field. A 409 means the server did not apply the requested transition for the stale version. Reload and reconcile; never update the version locally to force a retry.



## Shared contract references

Contract cross-reference: resource DTOs are in [15-api-dto-and-schema-reference.md](15-api-dto-and-schema-reference.md); the current endpoint-family state/response index is [16-api-response-variation-matrix.md](16-api-response-variation-matrix.md); complete sequences are in [17-end-to-end-frontend-workflows.md](17-end-to-end-frontend-workflows.md).
