# API DTO and schema reference

This reference records source-backed shapes for cross-screen DTOs and the four contract families closed in this handoff. It is deliberately not a universal schema: several endpoints return different serializers for the same stored model. Follow the endpoint-specific contract where it differs. Source paths are relative to the backend root.

## Contract rules

- JSON success envelopes are endpoint-specific. Some controllers return `{resource: ...}`, some return arrays or bare objects, and some return `{items, pagination}`. Do not wrap responses client-side as though the server always returns `{success,data}`.
- ObjectId values serialize as strings when a serializer explicitly converts them. Dates are ISO JSON strings on the wire. `null`, omitted keys and empty arrays are not interchangeable.
- Public listing/profile serializers are allowlists. Do not hydrate them with private model fields in the frontend.
- Error response shapes and codes are indexed in [10](10-api-errors-and-state-machines.md).

## Tour DTO

Source: `src/services/profileTourService.js` (`dto`), `src/models/Tour.js`, `src/controllers/tourController.js`.

```json
{
  "id": "66f000000000000000000001",
  "type": "open_house",
  "mode": "physical",
  "scheduledAt": "2026-11-14T10:00:00.000Z",
  "status": "pending",
  "version": 0,
  "createdAt": "2026-10-24T12:00:00.000Z",
  "updatedAt": "2026-10-24T12:00:00.000Z",
  "property": {
    "id": "66f000000000000000000002",
    "publicReference": "RTQ-PROP-1001",
    "title": "Fictional home",
    "location": "Fictional district",
    "status": "available"
  },
  "notes": "Buyer-only field"
}
```

`notes` is included only in buyer responses; `property` is `null` only when the controller/service source has no property object, although list processing excludes missing/archived properties. Stored status supports `pending|approved|rejected|completed|cancelled`; `PATCH /api/tour/:id` currently accepts only the first four. See [07](07-payments-ownership-escrow.md) for the source/contract outcome. A created paid-tour response may additionally include `requiresPayment`, `paymentOption`, `cartItem`, `redirectUrl` and `reference` depending on request branch; the current paid path is not a safe first-batch price contract.

The HTTP envelopes differ by method:

- `POST /api/tour` returns `{tour}` for the ordinary path; the paid cart branch returns `{tour,requiresPayment:true,paymentOption:"cart",cartItem:{itemType,resourceId}}`; the standalone paid branch returns `{tour,redirectUrl,reference,requiresPayment:true}`.
- `GET /api/tour` returns a bare JSON array `TourDTO[]`; pagination totals are response headers `X-Result-Count`, `X-Page`, and `X-Page-Count`. Empty results are `[]` with total `0` and page count `0`.
- `PATCH /api/tour/:id` returns a bare `TourDTO`.

Representative request/response:

```http
POST /api/tour HTTP/1.1
Authorization: Bearer <fictional-access-token>
X-Profile-ID: 66f000000000000000000010
Content-Type: application/json

{"propertyId":"RTQ-PROP-1001","type":"open_house","scheduledAt":"2026-11-14T10:00:00.000Z","mode":"physical","notes":"Please confirm the gate location."}
```

```json
{"tour":{"id":"66f000000000000000000001","type":"open_house","mode":"physical","scheduledAt":"2026-11-14T10:00:00.000Z","status":"pending","version":0,"createdAt":"2026-10-24T12:00:00.000Z","updatedAt":"2026-10-24T12:00:00.000Z","property":{"id":"66f000000000000000000002","publicReference":"RTQ-PROP-1001","title":"Fictional home","location":"Fictional district","status":"available"},"notes":"Please confirm the gate location."}}
```

For `GET`, use for example `GET /api/tour?page=1&limit=25&status=pending`; the response body is the array itself. For `PATCH`, send `{"status":"approved","expectedVersion":0}` and consume the bare DTO. The current read-list and update response contracts are confirmed by `src/controllers/tourController.js`; do not use the stale `{tours,pagination}` or `{tour}` wrappers found in earlier documentation.

Complete list and update examples:

```http
GET /api/tour?page=1&limit=25&status=pending HTTP/1.1
Authorization: Bearer <fictional-access-token>
X-Profile-ID: 66f000000000000000000010
```

```http
HTTP/1.1 200 OK
X-Result-Count: 1
X-Page: 1
X-Page-Count: 1
Cache-Control: private, no-store
Content-Type: application/json

[{"id":"66f000000000000000000001","type":"open_house","mode":"physical","scheduledAt":"2026-11-14T10:00:00.000Z","status":"pending","version":0,"createdAt":"2026-10-24T12:00:00.000Z","updatedAt":"2026-10-24T12:00:00.000Z","property":{"id":"66f000000000000000000002","publicReference":"RTQ-PROP-1001","title":"Fictional home","location":"Fictional district","status":"available"},"notes":"Please confirm the gate location."}]
```

```http
PATCH /api/tour/66f000000000000000000001 HTTP/1.1
Authorization: Bearer <fictional-owner-token>
X-Profile-ID: 66f000000000000000000015
Content-Type: application/json

{"status":"approved","expectedVersion":0}
```

Successful PATCH returns the updated `TourDTO` directly (same fields as the DTO above, with `status:"approved"` and the incremented `version`); response is not wrapped. The ordinary status update does not require a step-up header in `tourRoutes.js`.

## Finance reconciliation DTOs

Sources: `src/controllers/platformWalletController.js`, `src/services/escrowResponseSerializer.js`, `src/controllers/escrowDisputeController.js`.

Wallet summary is a bare object:

```json
{
  "totalCredits": 125000,
  "totalDebits": 25000,
  "netRevenue": 100000,
  "availableRevenue": 100000,
  "transactionCount": 3,
  "breakdown": {
    "titleDocumentViews": 0,
    "tourPayments": 0,
    "proxyInspectionRevenue": 0,
    "other": 100000,
    "refunds": 25000
  }
}
```

`proxyInspectionRevenue` may be omitted when aggregate data does not contain that field. `other` is derived by subtraction; no separate settlement/bank-available balance is returned. Do not interpret `availableRevenue` as provider-settled funds; the controller currently sets it to net revenue.

Platform transaction list is `{transactions,total,page,limit}`. Each row is `{id,type,direction,amount,paymentReference,status,createdAt,updatedAt,propertyReference?}`. The serializer deliberately omits populated identities, provider payloads, document locators and arbitrary metadata. `propertyReference` is present only when a populated property has a public reference.

Representative response for `GET /api/admin/wallet/transactions?page=1&limit=1`:

```json
{"transactions":[{"id":"66f000000000000000000020","type":"tour_payment","direction":"credit","amount":5000,"paymentReference":"fictional_ref_1001","status":"completed","createdAt":"2026-10-24T12:00:00.000Z","updatedAt":"2026-10-24T12:00:00.000Z","propertyReference":"RTQ-PROP-1001"}],"total":1,"page":1,"limit":1}
```

This is an illustrative serializer shape, not a statement that a tour payment is currently source-compliant or active in a deployment.

An escrow dispute safe DTO is `{id,reason,description,status,preDisputeStatus,resolution,openedAt,resolvedAt,createdAt,updatedAt}`. `description` and `resolution` can be `null`; unsafe contact text is removed by the safe serializer. Dispute detail is `{dispute,escrow,milestones:{all,satisfied,outstanding},financialState:{paymentStatus,refund,sellerPayout},history,logs,availableActions}`. Refund/payout are either a safe record or `null`; `availableActions` is an object of booleans, not an authorization grant.

Admin dispute resolution response is a partial object containing any applicable `escrow`, `dispute`, `refund`, `payout`, `pending`, `reused` and `reconciliationRequired` keys. A 202 means a provider operation remains pending. See [16](16-api-response-variation-matrix.md) for response branches.

## Private-file reconciliation and custody DTOs

Sources: `src/services/privateFileReconciliationService.js`, `src/services/legacyPrivateFileService.js`, `src/services/legacyCustodyMovementService.js`.

Reconciliation DTO:

```json
{
  "id": "66f000000000000000000003",
  "sourceKind": "document",
  "sourceId": "66f000000000000000000004",
  "state": "proposed",
  "version": 1,
  "codes": [],
  "memberCount": 2,
  "mode": "relocate",
  "processing": false,
  "attempts": 0,
  "migrationId": null
}
```

Status adds `integrity:{valid,codes}`, `history:[{id,actorId,profileId,action,version,codes,at}]`, and `nextCursor`. Discovery is a dry-run DTO with `dryRun`, `sourceKind`, `sourceId`, `inventoryVersion`, `eligible`, `replacementContainmentEligible`, `canonicalSource`, `codes`, and redacted member identity/classification summaries. Exact member details are not a public document DTO.

Legacy private-file DTO is `{replacementId,replacementState,amendmentState,amendmentMapping,id,sourceKind,sourceId,sourceKey,ownershipState,custodyReason,state,version,sourceVersion,purpose,accessMode,migrationId,evidenceId,errorCode}`. Nullable fields are explicit `null`; `amendmentMapping` is a small allowlist of `purpose|documentKind|mimeType|accessMode`.

Custody-movement DTO is exactly `{id,fileId,state,version,attempts,errorCode,completedAt}`. `errorCode` and `completedAt` are nullable. Evidence, source URLs, storage IDs, hashes, provider keys and reviewer identity are intentionally not included.

## Proxy inspection DTOs

Sources: `src/models/ProxyInspectionRequest.js`, `ProxyInspectionReport.js`, `ProxyInspectionEvidence.js`, `ProxyInspectionDispute.js`; controller returns request/model objects for several routes rather than a common serializer.

The request record has stored fields `property,buyer,inspector,inspectorProfile,conversation,requestedServices,customRequirements,preferredDate,scheduledAt,status,proposedPrice,proposedBy,buyerPriceConfirmed,inspectorPriceConfirmed,agreedPrice,priceLockedAt,startedAt,completionSubmittedAt,buyerConfirmedAt,completedAt,cancelledAt,reportLockedAt,metadata,createdAt,updatedAt`. Populated fields vary by endpoint. Do not assume a single response projection. Status values are `requested|negotiating|awaiting_price_confirmation|awaiting_payment|funded|scheduled|in_progress|completion_submitted|awaiting_buyer_confirmation|release_pending|disputed|refund_pending|completed|cancelled|refunded`.

For `POST /api/proxy-inspections`, the controller returns the newly created raw Mongoose model (ObjectIds serialize as strings; optional values with no stored value may be omitted). Representative shape:

```json
{"_id":"66f000000000000000000030","property":"66f000000000000000000002","buyer":"66f000000000000000000011","inspector":"66f000000000000000000012","inspectorProfile":"66f000000000000000000013","conversation":"66f000000000000000000014","requestedServices":["physical_inspection","condition_report","photos"],"status":"requested","buyerPriceConfirmed":false,"inspectorPriceConfirmed":false,"metadata":{},"createdAt":"2026-10-24T12:00:00.000Z","updatedAt":"2026-10-24T12:00:00.000Z","__v":0}
```

The subsequent `GET /api/proxy-inspections/:id` is a different envelope with `request`, `serviceEscrow`, `report`, `evidence`, and `dispute`; it may populate buyer/inspector/property fields. The API does not normalize create, list, detail and status-mutation responses into one frontend DTO. No `expectedVersion` is accepted by the current proxy mutation routes; state conflicts are returned by conditional service transitions.

Report fields are `inspectionRequest,inspector,property,inspectionDate,sections[],visibleDefects[],positiveObservations[],neighbourhoodComments,roadAccessComments,utilityComments,locationConfirmed,recommendation,summary,declarationAccepted,declarationText,signedByName,signedAt,submittedAt,metadata,createdAt,updatedAt`. Section condition is `excellent|good|fair|poor|not_inspected|not_applicable`; recommendation is `recommended|recommended_with_concerns|further_professional_review_required|not_recommended|neutral`.

Evidence list rows are `{id,type,category,mimeType,fileSize,caption,uploadedAt,accessUrl}`. `accessUrl` is a signed private delivery URL and must not be persisted in analytics or shared across profiles. Evidence types/categories are defined by `ProxyInspectionEvidence`; upload accepts image/video MIME families and PDF/DOC/DOCX and is limited by `proxyInspectionUploadMiddleware`.

Dispute fields are `inspectionRequest,serviceEscrow,raisedBy,reason,description,status,resolution,resolutionNotes,resolvedBy,resolvedAt,createdAt,updatedAt`; states are `open|under_review|corrections_requested|refund_processing|release_processing|resolved`; resolutions are `resume_service|refund_buyer|release_inspector|cancel_and_refund`.

## Routes returning resource-specific shapes

This table points to authoritative serializer/model sources; it is not permission to normalize unlike DTOs into one frontend type.

| DTO family | Source of truth | Frontend note |
|---|---|---|
| Account/profile/membership/seat/signatory | `src/services/currentAccountService.js`, `profileService.js`, `profileAuthorizationService.js`, profile controllers and `AccountProfile`/membership models | The API returns several projections by endpoint; use the DTO in [01](01-auth-accounts-profiles.md). |
| Property/project/type/unit/effective values | canonical serializers, `sourceListingFields.js`, inheritance and publication services | Canonical input and public DTO differ. See [02](02-properties-projects-units.md) and [03](03-canonical-field-dictionary.md). |
| Search/map/facets/groups | `canonicalCatalogueService.js` and controller response branches | Shared query semantics do not imply identical envelopes. See [04](04-search-maps-discovery.md). |
| Import/grid jobs and rows | import/grid controllers, services and job models | Preserve row error/result arrays and job state; see [05](05-imports-grids-bulk-operations.md). |
| Protected documents/viewer | document/title serializers and viewer services | Never accept a model object as a browser-safe DTO. See [06](06-documents-media-verification.md). |
| Cart/payment/checkout/ownership | cart, payment, escrow and ownership serializers | Amount, currency, provider reference and payment state have separate authority; see [07](07-payments-ownership-escrow.md). |
| Privacy request/export/record result | data-protection request and execution serializers | Per-record outcome is not equivalent to whole-request deletion success; see [08](08-privacy-notifications-realtime.md). |
| Notification/realtime | notification serializers and socket event producers | Payloads are profile-scoped; refresh REST state after reconnect. See [08](08-privacy-notifications-realtime.md). |
| Admin review | queue-specific controllers/serializers | No shared admin-review DTO exists; see [09](09-admin-console-and-policies.md). |

