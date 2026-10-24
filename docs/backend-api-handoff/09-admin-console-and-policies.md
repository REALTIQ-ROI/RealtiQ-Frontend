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

Applicant-facing verification submission and status are under `/api/profiles/current/verification-cases`; evidence is uploaded under `/api/profiles/current/onboarding/evidence`. The legacy `/api/verification/submit` and `/review/:userId` routes are mounted compatibility paths that reject the legacy user-ID/raw-KYC workflow with `409 CONFLICT_KYC_PROFILE_WORKFLOW_REQUIRED`; they are not the supported frontend workflow.

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



## Shared contract references

Contract cross-reference: finance and review response shapes are in [15-api-dto-and-schema-reference.md](15-api-dto-and-schema-reference.md), response variants in [16-api-response-variation-matrix.md](16-api-response-variation-matrix.md), and staff review/reconciliation flows in [17-end-to-end-frontend-workflows.md](17-end-to-end-frontend-workflows.md).
