# Admin Console and versioned policies

All routes below are mounted by `src/app.js`. Administrative middleware usually requires a current authenticated staff actor with an `admin` role; service-level checks also enforce department, current assignment, reviewer independence, separation of duties and step-up where required. A generic admin role is not a universal bypass. Use `X-Profile-ID` for the current staff profile. Sensitive mutations listed with “step-up” require `X-Step-Up-Challenge` bound to the request method, path, profile, body, and upload digest where applicable.

## Verification and profile authority

| Method and path | Required capability / action |
|---|---|
| `GET /api/admin/verification-cases` | Current verification review queue. |
| `GET /api/admin/verification-cases/:id` | Read a scoped verification case. |
| `GET /api/admin/verification-cases/:id/history` | Case audit history. |
| `GET /api/admin/verification-cases/:id/evidence/:evidenceId/content` | Protected evidence content; current case/evidence permission. |
| `POST /api/admin/verification-cases/:id/claim` | Step-up; claim/transition only when department and case rules allow. |
| `POST /api/admin/verification-cases/:id/decision` | Step-up; decision payload is case-specific and reviewed by service. |
| `GET /api/admin/company-verification-cases[/:id[/history]]` | Organization verification queue/detail/history. |
| `GET /api/admin/company-verification-cases/:id/evidence/:evidenceId/content` | Protected organization evidence. |
| `POST /api/admin/company-verification-cases/:id/{claim,decision}` | Step-up claim/decision. |
| `POST /api/admin/profile-signatories/:id/review` | Step-up signatory review and roster/authority checks. |
| `POST /api/admin/profile-type-changes/:id/review` | Step-up profile-type workflow decision. |
| `GET /api/admin/staff-access-changes` | Current staff access change queue. |
| `POST /api/admin/staff-access-changes` | Step-up: prepare an access change. |
| `POST /api/admin/staff-access-changes/:id/decision` | Step-up, independent decision; preparer cannot approve their own change. |

### Staff access-change contract

All three routes require current Executive department authority; Internal Audit is excluded. `GET /api/admin/staff-access-changes` returns a bounded array of pending DTOs `{id,targetIdentityId,departments,state,preparedBy,reviewedBy?,reviewedAt?,version}`. `POST /api/admin/staff-access-changes` requires bound step-up and accepts exactly `{targetIdentityId,departments}`. `targetIdentityId` is an ObjectId; `departments` is a duplicate-free subset of the User schema enum (`executive`, `sales_partnerships`, `customer_support`, `trust_safety`, `legal_verification`, `escrow_operations`, `finance`, `listings_quality`, `third_party_network`, `technical`, `data_market_intelligence`, `marketing_growth`, `compliance_data_protection`, `internal_audit`). An empty list requests removal of staff access. Success is `201` with the safe change DTO.

`POST /api/admin/staff-access-changes/:id/decision` requires step-up and exact `{decision:"approved"|"rejected",expectedVersion}`. It returns the updated safe DTO. The preparer cannot decide their own change; the preparer's current Executive authority and target `authVersion` are rechecked. Approval updates staff departments/profile and increments target auth version; all target sessions are revoked so the person must sign in again. A stale change/identity returns a conflict; do not retry without reloading. This is not a general client-controlled role or permission mutation API.

Applicant-facing verification submission and status are under `/api/profiles/current/verification-cases`; evidence is uploaded under `/api/profiles/current/onboarding/evidence`. The legacy `/api/verification/submit` and `/review/:userId` routes are mounted compatibility paths that reject the legacy user-ID/raw-KYC workflow with `409 CONFLICT_KYC_PROFILE_WORKFLOW_REQUIRED`; they are not the supported frontend workflow.

### Verification-case decision contract

The staff `POST /api/admin/verification-cases/:id/decision` and `/api/admin/company-verification-cases/:id/decision` require an active Trust & Safety profile, a claimed case, bound step-up, current `expectedVersion`, and reviewer independence from the holder/preparer. Request is `{expectedVersion,decision:"approved"|"rejected",checks?,reasonCodes?}`. Approval requires `checks` to contain exactly one row for each server-returned `requiredChecks` field; each row accepts `{field,source,reference,expiresAt?,nonExpiring?,applicability?,jurisdictionStateId?,issuerName?}`. `source` must be present in the currently approved `company_verification.manualSources` policy; the validator permits only `original_document|official_registry|approved_provider`, and the active policy may narrow that set. Evidence rows are bound to the exact submitted evidence IDs/versions/content hashes; applicable issuer/jurisdiction/expiry fields are enforced by evidence purpose. Rejection requires non-empty `reasonCodes` (maximum 50, each uppercase code); do not send narrative reasons in place of codes. Success returns the case DTO directly, not wrapped in `{case}`. Policy-revision mismatch, changed evidence, stale version, wrong case state or reviewer conflict returns a stable 409/403 code; do not retry without reloading the case. If `company_verification` is unconfigured, keep approval unavailable; do not select manual-source values locally.

## Property trust, duplicate and accuracy review

| Method and path | Purpose |
|---|---|
| `GET /api/admin/duplicate-property-matches` | Review candidate queue. |
| `GET /api/admin/duplicate-property-matches/:id/evidence` | Evidence list. |
| `GET /api/admin/duplicate-property-matches/:id/evidence/:documentId` | Authorized evidence content. |
| `POST /api/admin/duplicate-property-matches/:id/decision` | Step-up decision; evidence/version validation applies. |
| `GET /api/admin/distress-sale-assessments` | Distress assessment review list. |
| `GET /api/admin/distress-sale-assessments/:id/evidence` | Protected evidence. |
| `POST /api/admin/distress-sale-assessments/:id/decision` | Step-up decision. |
| `GET /api/admin/listing-verifications` | Pending platform listing-verification cases. |
| `GET /api/admin/listing-verifications/:id/evidence/:documentId` | Protected evidence content. |
| `POST /api/admin/listing-verifications/:id/decision` | Step-up decision. |
| `GET /api/admin/listing-accuracy-reports` | Accuracy reports. |
| `POST /api/admin/listing-accuracy-reports/:id/resolve` | Step-up resolution. |
| `GET /api/trust/v1/admin/appeals` | Trust appeal queue. |
| `PATCH /api/trust/v1/admin/appeals/:id` | Step-up resolution. |
| `POST /api/trust/v1/admin/users/:userId/recompute` | Step-up/current trust-policy recompute. |

### Property, duplicate and listing-verification decisions

All mutations below require Bearer, a current staff profile, one-use method/path/profile/body-bound step-up and the route's department permission; Internal Audit cannot decide. Reviewers must be independent from the applicant/reporting seller where the service requires it.

| Endpoint | Exact decision body | Success and key conflicts |
|---|---|---|
| `POST /api/admin/duplicate-property-matches/:id/decision` | `{decision:"approve"|"reject",reason,expectedVersion,sourceAuthorityDocumentId?,candidateAuthorityDocumentId?,transferProofDocumentId?}`. Reject requires reason and forbids evidence IDs. Approve of a non-sold pair requires both current private seller-authority document IDs; sold-property relisting requires the exact previously submitted `transferProofDocumentId`. | `200 {link:<safe link DTO>}`. Listings Quality or Legal Verification, independent reviewer, unchanged listing/profile/doc versions and clean evidence are required. Stale pair, evidence or version returns `409`; never substitute another proof document during review. |
| `POST /api/admin/distress-sale-assessments/:id/decision` | `{expectedVersion,decision:"approve"|"reject",reason?}`; reject requires a bounded reason. | `200 {assessment:<staff assessment DTO>}`. Listings Quality only, independent reviewer, current price/currency and current clean private evidence are rechecked. The 15% valuation basis is a source-defined gate; changed price/evidence or stale version conflicts. |
| `POST /api/admin/listing-verifications/:id/decision` | `{expectedVersion,decision:"approve"|"reject",checks?,rejectionReason?}`. Approval `checks` has one row per current server-required key: `{key,source,reference}`. `source` must be in the approved `listing_verification.approvedSources` policy. Rejection requires bounded `rejectionReason`. | `200 {verification:<staff case DTO>}`. Current policy revision, property/project/profile/identity and exact evidence versions are rechecked; absent approved policy returns 503; stale evidence/version returns 409. |
| `POST /api/admin/listing-accuracy-reports/:id/resolve` | `{resolution,expectedUpdatedAt}`; bounded, contact-guarded resolution and exact current ISO timestamp are required. | `200 {report:<safe report DTO>}`. Listings Quality, non-reporter reviewer, pending report and matching `updatedAt` required; otherwise 403/409. |

List/read and evidence-content paths are separate scoped operations; do not infer that queue visibility grants evidence access. Listing-verification approval remains policy-gated and does not merge title verification, distress assessment or moderation status.

### Trust appeals and recomputation

- `POST /api/trust/v1/appeals` (current user/session) body `{decisionReference,reason}`; `reason` is required and up to 2,000 characters. Returns `201 {appeal:{id,publicReference,decision,decisionVersion,reason,status,createdAt,updatedAt,version}}`. One open appeal per active decision; opening moves the challenged trust decision to `under_review`.
- `GET /api/trust/v1/appeals` returns the current identity's `{appeals:[...]}`; no other profile's appeals are included.
- `GET /api/trust/v1/admin/appeals?page=1&limit=20&status=open` is Trust & Safety staff only; status is `open|upheld|adjusted|dismissed`, page 1–10,000, limit 1–100. Response is `{appeals:[<staff appeal DTO>],pagination:{page,limit,total,pages}}`.
- `PATCH /api/trust/v1/admin/appeals/:id` requires Trust & Safety, bound step-up and an independent reviewer. Body accepts `{action:"upheld"|"adjusted"|"dismissed",reason,reviewAt?,expiresAt?,badge?,score?,band?}`; `reason` is required, maximum 2,000. `adjusted` requires a future `reviewAt` or `expiresAt`; badge is `none|bronze|silver|gold`, band is `insufficient|low|standard|strong|excellent`, score is 0–100. Response `{appeal:<staff appeal DTO>,decision:<public trust decision DTO>}`. Already-resolved appeal or changed decision version returns 409; unsupported policy/authority returns 403/422.
- `POST /api/trust/v1/admin/users/:userId/recompute` requires Trust & Safety and step-up, has no body, and returns `{trust:<public trust DTO>}`. The recompute uses server evidence/policy; it is not a client score mutation.

The recompute mutation does not include a request revision because the current mounted handler does not consume a body or idempotency key. Do not add client-supplied score or recompute parameters.

Exact bodies and response DTOs are implemented by the named controllers/services in `src/routes/adminRoutes.js`, `src/routes/trustRoutes.js`, and the corresponding controller files. Review queues are operational staff interfaces; do not reuse public profile/search DTOs to render evidence.

## Privacy, retention, policies and location administration

| Method and path | Purpose / protection |
|---|---|
| `GET /api/admin/data-protection-requests[/:id]` | Staff queue/detail. |
| `GET /api/admin/data-protection-requests/:id/{history,execution}` | Request history and per-record job result. |
| `POST /api/admin/data-protection-requests/:id/decision` | Step-up claim/approve/retry/reject/policy hold. |
| `POST /api/admin/data-protection-requests/:id/notice/reconcile` | Step-up completion notice reconciliation. |
| `GET /api/admin/legal-holds[/:id]` | Current hold list/detail. |
| `POST /api/admin/legal-holds` | Step-up, current compliance/data-protection authority; create a record-scoped hold. |
| `POST /api/admin/legal-holds/:id/release` | Step-up, independent release authorization. |
| `GET /api/admin/policies/:key` | Current approved policy. |
| `GET /api/admin/policies/:key/history` | Revision history. |
| `POST /api/admin/policies/:key/revisions` | Step-up: prepare a validated policy revision. |
| `POST /api/admin/policies/:key/revisions/:revisionId/:decision` | Step-up independent approval/rejection. |
| `GET /api/admin/gazetteer/status`, `GET /api/admin/gazetteer/revisions` | Gazetteer operational status/revisions. |
| `POST /api/admin/gazetteer/revisions`, `POST /api/admin/gazetteer/revisions/:id/entries`, `POST /api/admin/gazetteer/revisions/:id/decision` | Step-up prepare, append bounded entries, and independently decide a revision. |

Policy writes are two-person/versioned Console workflows. Do not activate a policy just because the frontend has submitted a draft. Gazetteer administrative APIs are for approved authoritative datasets; frontend must not create synthetic location IDs or boundary data.

## Listing, payments and operational review

Other current admin paths mounted by `adminRoutes.js` include:

- `GET /api/admin/stats`, `/wallet`, `/wallet/transactions`.
- `PATCH /api/admin/payments/:id/cancel` (step-up).
- `GET /api/admin/cart-checkouts`, `GET /api/admin/cart-checkouts/:checkoutId`, `POST /api/admin/cart-checkouts/:checkoutId/retry-allocations` (step-up).
- `GET /api/admin/projects`, `GET /api/admin/projects/:id`, `PATCH /api/admin/projects/:id/status`, `PATCH /api/admin/projects/:id/featured` (the two mutations require step-up; featured status is not a sponsored-placement entitlement).
- `GET /api/admin/property-imports`, `GET /api/admin/property-imports/:id`.
- `GET /api/admin/notification-deliveries`, `POST /api/admin/notification-deliveries/:deliveryId/reconcile` (step-up).
- `GET /api/admin/escrow-disputes`, `GET /api/admin/escrow-disputes/:disputeId`, `PATCH /api/admin/escrow-disputes/:disputeId/resolve`, `POST /api/admin/escrows/:id/process-refund` (mutations require step-up).
- `GET /api/admin/search` (separate search router; current admin access and bounded query normalization).
- Virtual tour operations: `PATCH /api/admin/settings/virtual-tours`, `GET /api/admin/virtual-tours/providers/health`, `GET /api/admin/virtual-tours`, `GET /api/admin/virtual-tours/:propertyId`, `GET /api/admin/virtual-tours/:propertyId/history`.

### Virtual-tour Console settings and history

`PATCH /api/admin/settings/virtual-tours` requires current staff/admin authority, Technical department (Internal Audit read-only), and step-up. Body accepts a non-empty subset of `{enabled?:boolean,defaultProvider?:"realsee"|"matterport",providers?:{realsee?:{enabled:boolean},matterport?:{enabled:boolean}},expectedVersion?:integer>=0}`; unknown keys reject. The response is the normalized settings object `{enabled,defaultProvider,providers:{realsee:{enabled},matterport:{enabled}},version}`. The default provider must remain enabled; stale versions conflict. This controls provider configuration only; it does not establish vendor credentials, ownership of media, or live readiness.

`GET /api/admin/virtual-tours/:propertyId/history?limit=25&before=<id>` returns `{history:[{id,propertyId,projectId,actingIdentityId,actingProfileId,ownerProfileId,provider,action,previousStatus,newStatus,beforeVersion,afterVersion,createdAt}],nextCursor}` with a bounded cursor page. Provider work URLs, raw provider responses, source filenames and signed assets are excluded.

### Notification-delivery operations

`GET /api/admin/notification-deliveries?state=<state>&before=<deliveryId>` accepts `state=outcome_unknown|activation_pending|failed|retry`; page size is fixed at 50 and `before` is an optional ObjectId cursor. Current Technical or Internal Audit staff may read; the response is `{deliveries:[{id,channel,state,attempts,dueAt,acceptedAt,errorCode,receiptStatus,receiptAt,updatedAt}],nextCursor}`. No recipient address or provider payload is returned.

`POST /api/admin/notification-deliveries/:deliveryId/reconcile` is current Technical staff only (Internal Audit cannot mutate), with step-up and exact body `{outcome:"accepted"|"not_accepted",evidenceReference,expectedUpdatedAt,providerMessageId?}`. `providerMessageId` is required for `accepted` and forbidden as a substitute for evidence. Success is `{delivery:<safe delivery DTO>}`; accepted records become `sent`, while attested non-acceptance becomes `retry`. Stale delivery timestamps or non-unknown state return `409 CONFLICT_NOTIFICATION_DELIVERY`. A reconciliation is an audited staff attestation, not proof from the provider itself.

### Versioned policy and gazetteer revisions

For `/api/admin/policies/:key`, GET returns `{policy:{key,state,revision,value,approvedAt?}}`. `POST /api/admin/policies/:key/revisions` requires the policy's preparation department, current staff profile, and step-up; body is exactly `{value,reason,expectedRevision}` and returns `201 {revision:<revision DTO>}`. The DTO includes `id,key,basedOnRevision,value,reason,state,preparedBy,preparedProfile,approvedBy,approvedAt,rejectedAt,createdAt`. `POST /api/admin/policies/:key/revisions/:revisionId/approved|rejected` has no body; it is an Executive step-up decision, excludes Internal Audit and the preparer, and returns `{revision}`. History accepts `before?` and `limit` 1–100, default 25. Unknown policy keys and invalid revision schemas reject; policy remains unconfigured until the independent decision approves it.

Gazetteer revision preparation at `POST /api/admin/gazetteer/revisions` accepts exactly `{sourceKind:"official_dataset"|"mapbox_permanent"|"manual_verified",sourceReference,reason,expectedRevision,operationKey}` and returns `201 {revision}`. Entry batches at `POST /api/admin/gazetteer/revisions/:id/entries` accept `{operationKey,entries:[{externalId,level:"state"|"lga"|"area"|"estate",name,parentExternalId?}]}`. Decision at `POST /api/admin/gazetteer/revisions/:id/decision` accepts `{decision:"approved"|"rejected",reason}`. Data & Market Intelligence prepares/appends; an independent Executive approves/rejects; Internal Audit is read-only. Revisions are idempotent/versioned, and only approved source data becomes the active directory. Dataset licensing and source verification remain external activation requirements.

Proxy-inspector review routes are also mounted under `/api/admin/proxy-inspectors` and `/api/admin/proxy-inspections`; they are listed in [the endpoint index](14-mounted-endpoint-index.md). Only integrate them if the first-batch product screens include those proxy workflows. They must not be mistaken for property-publication verification.

## Finance reconciliation endpoint contracts

These endpoints are mounted by `src/routes/adminRoutes.js`. All require bearer authentication and current staff/admin authorization; step-up is required for resolution, refund retry, and payment cancellation. `X-Profile-ID` selects the current staff workspace. Service-level finance department, resource assignment, current session and separation-of-duties checks still apply. Do not treat a route-level `admin` middleware pass as a finance permission.

### `GET /api/admin/wallet`

No query or body. Returns a bare summary object, not an envelope:

```json
{"totalCredits":125000,"totalDebits":25000,"netRevenue":100000,"availableRevenue":100000,"transactionCount":3,"breakdown":{"titleDocumentViews":0,"tourPayments":0,"proxyInspectionRevenue":0,"other":100000,"refunds":25000}}
```

`proxyInspectionRevenue` can be omitted if the aggregate source lacks that field. `availableRevenue` is currently calculated as `totalCredits-totalDebits`; this is a ledger total, not bank settlement. Empty ledger returns zero-valued fields.

### `GET /api/admin/wallet/transactions`

Supported query parameters (unknown keys are rejected with `400 INPUT_WALLET_QUERY_INVALID`):

| Name | Type | Required/default | Validation and behavior |
|---|---|---|---|
| `from`, `to` | ISO timestamp string | optional | Must exactly parse as ISO; `from <= to`; inclusive `createdAt` range. |
| `type` | string | optional | `title_document_view|tour_payment|platform_fee|proxy_inspection_commission|proxy_inspection_buyer_fee|proxy_inspection_refund|property_analytics_access|other`. |
| `status` | string | optional | `pending|completed|reversed|refunded`. |
| `paymentStatus` | string | optional | `pending|paid|failed|canceled`; filters transaction rows by linked Payment state. |
| `property`, `user`, `inspector`, `inspectionRequest` | ObjectId string | optional | Each must be a valid 24-hex ObjectId. |
| `reference` | string | optional | 1–160 ASCII alphanumeric/underscore/hyphen characters. |
| `page` | integer | default `1` | 1–1,000,000. |
| `limit` | integer | default `25` | 1–100. |

Example: `GET /api/admin/wallet/transactions?from=2026-10-01T00%3A00%3A00.000Z&to=2026-10-24T23%3A59%3A59.999Z&type=tour_payment&status=completed&page=1&limit=25`.

Response is `{transactions:[{id,type,direction,amount,paymentReference,status,createdAt,updatedAt,propertyReference?}],total,page,limit}`. The serializer does not return user identity, bank details, raw provider payload, document locator or arbitrary transaction metadata. Empty pages retain the envelope with `transactions:[]`.

### Escrow-dispute queue, detail and resolution

| Endpoint | Request | Success/variation |
|---|---|---|
| `GET /api/admin/escrow-disputes` | Query allowlist: `page` default 1, 1–10000; `limit` default 20, 1–100; `status=open|under_review|awaiting_refund|awaiting_seller_release|resolved|cancelled`; `escrow`, `buyer`, `seller`, `property` ObjectId; `search` at most 120 characters. Unknown keys or invalid scalar/query values return `400 CONTENT_QUERY_INVALID`. | `200 {items:[{...SafeDisputeDTO,escrow:EscrowSummary|null}],pagination:{page,limit,total,pages}}`; empty is `items:[]`, total/pages zero. Filters are combined. |
| `GET /api/admin/escrow-disputes/:disputeId` | No query/body. | `200 {dispute,escrow,milestones:{all,satisfied,outstanding},financialState:{paymentStatus,refund,sellerPayout},history,logs,availableActions}`. Missing dispute/escrow is `404` with `{message}`. `refund` and `sellerPayout` may be `null`; `availableActions` is advisory state from the service and each mutation rechecks authority. |
| `PATCH /api/admin/escrow-disputes/:disputeId/resolve` | Step-up; JSON `{action,reason}`. `action` is `reopen|refund_buyer|release_seller|cancel_escrow`; trimmed `reason` is required. The service rejects other actions or empty reason. | `200` serialized result when resolved synchronously; `202` when provider work is pending. Optional response keys include `escrow`, `dispute`, `refund`, `payout`, `pending`, `reused`, and `reconciliationRequired`. |
| `POST /api/admin/escrows/:id/process-refund` | Step-up; no request body fields are consumed. The current service selects only a refund in a retryable attention state and checks finance authority/separation of duties. | `200` final/reused result or `202` pending; absent escrow is `404 {message:"Escrow not found"}`; nonretryable state/authority/provider failures use shared error handling. |

Resolution example:

```http
PATCH /api/admin/escrow-disputes/66f000000000000000000001/resolve HTTP/1.1
Authorization: Bearer <fictional-staff-token>
X-Profile-ID: 66f000000000000000000010
X-Step-Up-Challenge: <fictional-one-time-challenge>
Content-Type: application/json

{"action":"refund_buyer","reason":"Evidence review supports the buyer refund."}
```

If response status is 202, display a pending reconciliation state and refresh the dispute detail/finance queue; do not optimistically report settlement. The same response decision does not guarantee provider success. Payment cancellation is a separate `PATCH /api/admin/payments/:id/cancel` operation; cart allocation recovery is `POST /api/admin/cart-checkouts/:checkoutId/retry-allocations`. Those actions are not substitutes for dispute resolution.

## Contract boundary

This file records mounted paths and route-level middleware. Route body/response shape remains operation-specific; use the corresponding controller/service as contract when implementing a particular Console screen. In particular policy payloads, evidence decision codes and payment/escrow resolution bodies are not interchangeable. Admin errors use the shared `{message, code}` envelope, with typed validation/conflict codes and `X-Request-ID`.



## Legal holds

Mounted in `src/routes/adminRoutes.js` under `/api/admin/legal-holds`. All routes require Bearer authentication and current Admin/staff context; `X-Profile-ID` selects the staff profile. The service additionally requires `compliance_data_protection`; Internal Audit can read but cannot issue or release. Create/release require `X-Step-Up-Challenge` bound to the exact request. Release requires a different authorized actor than the issuer. Holds are record-specific and do not auto-release when `reviewAt` or `expiresAt` passes.

| Endpoint | Request | Response |
|---|---|---|
| `GET /api/admin/legal-holds?before=<ObjectId>&limit=50&state=active&subjectKind=profile` | Optional `before`, `limit` 1–100, `state=active|released`, `subjectKind=account|profile|financial_transaction|escrow|dispute|investigation|property|ownership|title_document|kyc_evidence|regulatory_record|litigation_record`. Unknown/invalid query keys are rejected. | Bare `{holds:[LegalHoldDTO],nextCursor:string|null}`. |
| `GET /api/admin/legal-holds/:id` | No body/query. | `{hold:LegalHoldDTO}`. |
| `POST /api/admin/legal-holds` | `{subjectKind,subjectId,category,reasonCode,operationKey,expiresAt?,reviewAt?}`. `operationKey` is 8–100 letters/digits/underscore/hyphen. Dates must be valid ISO dates; expiry, if supplied, must be in the future. Category must match the subject-kind family. | `201 {hold:LegalHoldDTO}`; replaying the same operation key and same scope returns the existing hold; reusing it for a different scope conflicts. |
| `POST /api/admin/legal-holds/:id/release` | `{expectedVersion,reasonCode}`; reason is `resolved|authority_withdrawn|superseded|court_or_regulator_release`. | `{hold:LegalHoldDTO}`; stale version `409 CONFLICT_LEGAL_HOLD_VERSION`; issuer release denied with `403 PERMISSION_SEPARATION_OF_DUTIES`. |

`LegalHoldDTO` is `{id,subjectKind,subjectId,holderId,profileId,category,reasonCode,issuer,createdAt,expiresAt,reviewAt,state,releaseActor,releaseReasonCode,releasedAt,version}`; nullable subject/release fields are `null`. Allowed categories are `account_profile|financial_transaction_escrow|dispute_investigation|property_ownership_title|kyc_identity_evidence|regulatory_litigation`. Allowed reason codes are `regulatory_preservation|litigation_preservation|investigation|dispute|ownership_claim|identity_review|financial_review|other_authorized_basis`. The hold write service fences current staff and department authorization inside the database transaction and appends an audit record. An active hold blocks prepared eligible deletion items; it does not itself authorize arbitrary record reads.

## Shared contract references

Contract cross-reference: finance and review response shapes are in [15-api-dto-and-schema-reference.md](15-api-dto-and-schema-reference.md), response variants in [16-api-response-variation-matrix.md](16-api-response-variation-matrix.md), and staff review/reconciliation flows in [17-end-to-end-frontend-workflows.md](17-end-to-end-frontend-workflows.md).
