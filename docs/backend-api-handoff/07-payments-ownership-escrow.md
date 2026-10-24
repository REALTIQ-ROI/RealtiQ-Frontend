# Payments, ownership and escrow

This document covers only mounted first-batch purchase, seat, title-document and payment interactions. It does not promise the complete later-batch fee engine, contract negotiation or all bilateral escrow/instalment features. Always use provider-verified server state; a browser redirect or client-supplied “paid” flag never fulfills inventory or entitlement.

## Cart and checkout

Mounted `/api/cart` routes:

| Endpoint | Request/response | Access |
|---|---|---|
| `GET /api/cart`, `GET /api/cart/eligibility` | Current profile cart and per-item eligibility DTO. | Optional auth for guest cart; authenticated cart is bound to current buyer profile/seat. |
| `POST /api/cart/items` | Add exact listing/unit item; service validates listing, current ask/currency and buyer profile. | Optional auth; no private listing eligibility bypass. |
| `DELETE /api/cart/items/:itemId`, `DELETE /api/cart` | Remove/clear current selected cart only. | Optional auth; guest/user identity and profile scope retained. |
| `POST /api/cart/checkout/initialize` | Current cart checkout body, `Idempotency-Key`/operation key where requested, step-up. | Bearer, Verified buyer and step-up; current listing price/currency/availability/freshness/owner and profile rechecked. |
| `GET /api/cart/checkouts`, `GET /:checkoutId` | Current buyer checkout history/detail. | Auth buyer or Admin; profile/owner scoped. |
| Admin retry: `GET /api/admin/cart-checkouts`, `GET /:checkoutId`, `POST /:checkoutId/retry-allocations` | Operational state/retry DTO. | Current Admin + relevant department and step-up for retry. |

The cart service binds payment/checkout IDs, exact amount/currency/reference and property eligibility. Allocation is idempotent and recoverable; seat/profile revocation can block a pending checkout. Do not reuse a stale cart price after listing mutation.

## Viewings / tours

`POST /api/tour` creates a viewing request; bearer + Registered access and a current buyer profile with `viewing.manage` are required. Body keys are exactly `propertyId`, `type`, `scheduledAt`, `notes?`, `mode?`, `paymentOption?`, `addToCart?`. `propertyId` is an ObjectId or `RTQ-PROP-*` public reference; `type` is `open_house|virtual_paid|staging_view`; ISO-date-parseable `scheduledAt` is required; notes are up to 1000 characters and must pass the on-platform contact guard; `mode` is `physical|virtual` (defaults to virtual for `virtual_paid`, otherwise physical); `paymentOption` is `cart|standalone`; `addToCart` is boolean. A booking within one hour of another pending/approved booking conflicts (`409 CONFLICT_VIEWING_SCHEDULED`).

Response is `201 { tour }`, except a paid viewing returned to cart is `201 { tour, requiresPayment:true, paymentOption:"cart", cartItem:{itemType:"paid_virtual_tour",resourceId} }`; standalone paid viewing adds `redirectUrl` and `reference`. For standalone `virtual_paid`, current verified access, step-up and email are required, and the server initializes Paystack; if unconfigured it returns `503 PAYMENT_PROVIDER_UNAVAILABLE` and removes the pending booking. **Do not wire this paid branch as the source-compliant live-video pricing flow:** source says seller-run live tours are free at launch and any later fee is controlled by Console/fee schedule, while Inspection Partner fees follow approved partner payment terms and platform splitting. The current tour controller/service instead stores a fixed ₦5,000 and standalone Paystack initialization, with no seller-vs-partner price source or calendar/session binding. This is an internal implementation/contract gap, not merely missing credentials. No client price may be sent or displayed as authoritative.

`GET /api/tour?page=1&limit=50&status=pending` returns a **bare JSON array** of tour DTOs, not `{tours,pagination}`. It also sets `X-Result-Count`, `X-Page`, and `X-Page-Count`; responses are `private, no-store` and vary by `Authorization` and `X-Profile-ID`. Allowed status values are `pending|approved|rejected|completed|cancelled`, page 1–10000, limit 1–100. Buyer sees own requests; seller sees properties it currently manages; staff requires Customer Support permission (Internal Audit read-only). DTO includes `id,type,mode,scheduledAt,status,version,createdAt,updatedAt,property:{id,publicReference,title,location,status}` and buyer-only `notes`.

`PATCH /api/tour/:id` body exactly `{status, expectedVersion?}`; `status` is `pending|approved|rejected|completed` (the read filter/model also contain `cancelled`, but update validator does not), and optional version must match. The controller returns the **bare tour DTO**, not `{tour}`; response is `private, no-store` and varies by `Authorization` and `X-Profile-ID`. **Viewing cancellation is not specified as a first-batch buyer action in the inspected source**; the RQS speaks to booking, accepting/rescheduling, one-way notifications and listing availability, not a buyer cancel transition. Do not ship a Cancel button. The inconsistent stored/read-only `cancelled` value is not evidence of a supported frontend action. The source-defined calendar/slot workflow and Zoom session issuance are also not represented by these routes, so complete live-video booking remains internally incomplete.

Example requests, exact envelopes and tour response variations are in [15](15-api-dto-and-schema-reference.md) and [16](16-api-response-variation-matrix.md); the workflow boundary is in [17](17-end-to-end-frontend-workflows.md). The full outcome is recorded in [13](13-backend-acceptance-and-contract-review.md).

## Payments

- `POST /api/payments/initialize`: Bearer, Verified and step-up; request body is the server-supported payment initialization payload. Returns provider initialization/reference URL DTO. Exact body is defined by `paymentController.initializePayment`; frontend must not send trusted amount/status fields.
- `GET /api/payments/verify/:reference`: optional auth; verification consults saved provider binding and returns safe payment status. It does not trust a success querystring.
- `GET /api/payments`, `GET /:id`: current actor/finance authorization and safe payment projection.
- `GET /api/payments/export.csv`: step-up, current finance/resource permissions; private CSV with redaction.
- `POST /api/payments/webhook`: raw JSON body and Paystack signature verification. This is provider-to-server, not a browser endpoint.
- Admin `PATCH /api/admin/payments/:id/cancel`: current finance/admin permission + step-up.

Provider references, webhook signature, exact amount/currency and idempotency are server authority. `PAYMENT_*`, `CONFLICT_PAYMENT_*`, `PERMISSION_PAYMENT_*` and provider activation errors are handled through [the shared error guide](10-api-errors-and-state-machines.md). No live Paystack operation was invoked for this handoff.

## Seat and publication-plan billing

Organization seat purchase is documented in [profiles](01-auth-accounts-profiles.md): `GET /api/profiles/current/seat-plans`, `POST /api/profiles/current/seat-purchases`, purchase detail/audit, cancel/reconcile and renew. Only verified provider settlement activates seat entitlement. Seat removal/expiry revokes future access. Plan response can be `unconfigured`; do not hard-code a client plan.

Publication plans use `/api/profiles/current/publication-plans`, `/publication-plan`, `/publication-plan-purchases` and purchase detail/audit/cancel/reconcile. Publication may still be blocked by KYC, owner caps, readiness, title/verification and current plan; payment alone never overrides those gates.

## Escrow and instalments

Mounted routes include `/api/escrow/payout-account` GET/PUT; escrow POST/GET/detail; payment initialization; rule satisfaction; release request/approval; cancel/dispute; refund details/chat; and admin refund/dispute operations. `/api/installments` includes plan create/list/detail/schedule, initialize/pay, condition satisfaction, cancellation/status, payment history/penalties/waiver. Mutating money/approval endpoints require current profile, participant/finance permission and step-up where mounted. Admin/Executive department and separation-of-duties checks apply to approval/refund operations.

Use the current escrow/installment response states; do not derive settlement from local button state. Escrow release and refund are distinct state transitions. A dispute or incomplete rule blocks release. Payout account uses current authorized company/individual profile and signatory requirements. Payee bank data must be treated as private finance data and not stored in general UI analytics.

The route index provides exact mounted paths. Detailed field-level schemas for some legacy escrow/chat and installment rule actions remain controller-defined; use the controller implementation before building those specific forms (see acceptance review). No later-batch investment product, complete fee schedule or unsupported ownership transfer endpoint is implied.

## Ownership and transaction records

`GET /api/ownerships/my` returns the current profile/identity's ownership DTOs; current `X-Profile-ID`/participant scope applies. `POST /api/properties/:id/buy` is a compatibility route; first-batch should use cart/checkout flow. Actual ownership is created only from verified fulfillment and cannot be asserted by property update, import, or sold toggle. `GET /api/properties/:id/owner-detail` is a separate owner-authorized view and must never be used as public detail.

## Proxy inspection service: mounted participant and staff contracts

The source includes an Inspection Partner service, while the mounted API uses the `proxy_inspector` role name. The participant routes below are included only where this partner service is part of the approved first-batch release. Authentication is required for the router. `POST /api/proxy-inspections` is buyer-only; inspector actions require the assigned inspector; private detail/evidence/conversation access is limited to buyer, assigned inspector or authorized admin. Several controllers return raw Mongoose model JSON rather than a stable custom DTO—see [15](15-api-dto-and-schema-reference.md)—so preserve unknown fields and do not assume unrelated endpoint responses have identical populated fields. No participant cancellation route is mounted, even though the model has terminal `cancelled`.

| Endpoint | Request | Response and states |
|---|---|---|
| `POST /api/proxy-inspections` | `{propertyId,inspectorId,requestedServices,customRequirements?,preferredDate?}`. `propertyId` is ObjectId or `RTQ-PROP-*`; `inspectorId` is ObjectId; `requestedServices` must be nonempty and use `physical_inspection|recorded_video_walkthrough|photos|condition_report|neighbourhood_review|location_confirmation|document_observation|custom`; if `custom` is included, nonempty `customRequirements` is required. | `201` raw request document, initial status `requested`. Active duplicate buyer/property/inspector returns `409` and `existingRequestId`. Property and inspector eligibility are checked. |
| `GET /api/proxy-inspections`, `/api/proxy-inspector/tasks`, `/api/proxy-inspector/tasks/:id` | List filters: `status`, `property`, `inspector`, `buyer`, `from`, `to`, `page`, `limit`; page default 1, limit default 25 and clamp 1–100. Property accepts ObjectId/public reference. Inspector/buyer IDs must be ObjectIds. Unknown query keys are ignored; `status` is not explicitly validated; date strings are passed to Date conversion. | Participant list is `{requests,total,page,limit}` sorted newest-first. Empty list retains `{requests:[],total:0,page,limit}`. Task detail uses the same participant check. No cursor or client-selected sort. |
| `GET /api/proxy-inspections/:id` | No body/query. | `{request,serviceEscrow,report,evidence,dispute}`; each related value may be `null`/empty. Admin detail adds `auditHistory` and `conversation`. Evidence `accessUrl` values are short-lived signed private URLs and must not be persisted/shared. |
| `POST /api/proxy-inspections/:id/propose-price` | `{amount}` positive whole integer in NGN. Only buyer or assigned inspector; inspector must be partner-work-ready. | Raw updated request. `status` becomes `awaiting_price_confirmation`; changing amount clears both confirmations. Locked or late proposal is `409`. |
| `POST /api/proxy-inspections/:id/confirm-price` | Empty JSON body; step-up header. Buyer/assigned inspector confirms own side. | Raw request; first confirmation leaves `awaiting_price_confirmation`; second sets `agreedPrice`, `priceLockedAt` and `awaiting_payment`. |
| `POST /api/proxy-inspections/:id/initialize-payment` | Empty JSON body; buyer, Verified access and step-up. | Provider result includes `redirectUrl`, `reference`, `pricing`; idempotent pending initialization may return `pending:true` and a message. Paystack is required. Pending reservation/funding conflicts return 409. |
| `PATCH /api/proxy-inspections/:id/schedule` | `{scheduledAt}` future ISO-compatible date; buyer or assigned inspector. | Raw request with `scheduled` state. Only `funded|scheduled` can be scheduled/rescheduled. |
| `POST /api/proxy-inspections/:id/start` | Empty body; assigned inspector only. | Raw request; moves `funded|scheduled` request and funded escrow to `in_progress`/`service_in_progress`. |
| `POST /api/proxy-inspections/:id/evidence` | Multipart array field `evidence`, max 12 files; optional `captions` aligned by file order. Allowed MIME: JPEG, PNG, WebP, MP4, QuickTime, PDF, DOC, DOCX. Max file size uses `PROXY_INSPECTION_MAX_FILE_MB` (fallback 250 MiB in current middleware). Inspector only, while request/escrow are `in_progress`. | `201` array of evidence model records. Storage is authenticated; successful provider upload does not itself mean report completion. |
| `GET /api/proxy-inspections/:id/evidence` | No body. | Array of `{id,type,category,mimeType,fileSize,caption,uploadedAt,accessUrl}`; empty is `[]`. Access URLs are signed/private and actor-bound by the service. |
| `PUT` or `PATCH /api/proxy-inspections/:id/report` | Inspector only during `in_progress`. Accepted keys: `inspectionDate`, `sections`, `visibleDefects`, `positiveObservations`, `neighbourhoodComments`, `roadAccessComments`, `utilityComments`, `locationConfirmed`, `recommendation`, `summary`, `declarationAccepted`, `signedByName`. Text contact guard applies; lists max 100 entries; sections max 50. Section condition `excellent|good|fair|poor|not_inspected|not_applicable`; recommendation `recommended|recommended_with_concerns|further_professional_review_required|not_recommended|neutral`. | Raw report model. First save may initialize source-defined section rows. `declarationAccepted:true` records server declaration text/time and defaults signer name from actor; submitted report is locked. |
| `GET /api/proxy-inspections/:id/report` | No body. | Raw report model; if no report, `404 {message:"Inspection report not found"}`. |
| `POST /api/proxy-inspections/:id/submit-completion` | Empty body; assigned inspector, `in_progress`. | Raw request; status becomes `awaiting_buyer_confirmation`, report is locked. Missing requested-service evidence/declaration/report requirements returns 422 with missing requirements. |
| `POST /api/proxy-inspections/:id/confirm-completion` | Empty body; buyer only after submission and with no active dispute. | Raw request moves to `release_pending`; this is not a completed payout. |
| `POST /api/proxy-inspections/:id/dispute` | `{reason,description?}`; buyer only while awaiting confirmation or release pending. Reason required and contact guarded. | `201` dispute model; request and escrow become `disputed`, funds remain held. Duplicate active dispute or final provider state conflicts. |
| `GET /api/proxy-inspections/:id/conversation`, `POST /api/proxy-inspections/:id/messages` | Message body `{text}`; body text required for admin and user message text cannot contain off-platform contact. Only participants/admin. | Conversation shape `{conversation,messages}`; `POST` returns created message model (201). Contact text may be replaced with a hold notice on read. |
| `POST /api/proxy-inspections/:id/review` | `{rating,professionalism?,accuracy?,communication?,timeliness?,comment?}`; buyer after request status `completed`; rating integer 1–5, unique per inspection. | `201` review model; duplicate review is 409. |
| Staff `GET /api/admin/proxy-inspectors`, `GET /:id`, `PATCH /:id/review`, `/suspend`, `/reactivate` | Current staff/admin; review/suspend/reactivate require step-up. Review accepts decision `approve|reject` with notes/reason; suspend uses reason; reactivate uses notes. | Staff professional projection; review updates searchable/verification status; suspension removes search eligibility. Exact endpoint paths appear in [14](14-mounted-endpoint-index.md). |
| Staff `GET /api/admin/proxy-inspections`, `GET /:id`, `POST /:id/release-payment`, `PATCH /:id/resolve-dispute` | Current staff/admin; release/payment and dispute resolution require step-up. Resolution uses `{resolution,notes?}`; available actions are rechecked in service. | Request detail may include audit/conversation; payment/dispute operation result follows the service escrow/provider state. Do not infer settlement from a successful request alone. |

**Important policy limitation:** the current financial service calculates a buyer fee and inspector commission using `PROXY_INSPECTION_*` settings with code fallbacks. Those values are implementation behavior, not approved partner terms by virtue of being present. Do not hard-code them in frontend or present a quote as policy-approved until the versioned/approved partner fee policy and provider activation are confirmed. Paystack credentials, payout readiness and authenticated media storage are external gates. No cancellation action is available in the mounted participant route family.

Representative creation call (fictional IDs; no client-supplied price):

```http
POST /api/proxy-inspections HTTP/1.1
Authorization: Bearer <fictional-buyer-token>
Content-Type: application/json

{"propertyId":"RTQ-PROP-1001","inspectorId":"66f000000000000000000011","requestedServices":["physical_inspection","condition_report","photos"],"preferredDate":"2026-11-14T10:00:00.000Z"}
```

The route requires the legacy authenticated User role `buyer` and the selected inspector must have an approved/searchable/available profile. This controller/service does not consume `X-Profile-ID`; do not assume this endpoint has the same active-profile contract as canonical profile APIs. A successful create returns the raw request model (see [15](15-api-dto-and-schema-reference.md)); it does not return a fee quote. Realtime/notification delivery is a separate best-effort side effect.

## Configuration gates

Seat plan and publication plan are versioned Console policies; Paystack credential/activation and verified callback are required for settlement. Payout providers and notification receipts are external. If unavailable, preserve `pending`, `activation_pending`, `review_required`, or safe `FEATURE_*` state; never simulate paid or available funds.
