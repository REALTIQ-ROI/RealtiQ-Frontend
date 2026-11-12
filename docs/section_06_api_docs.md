# Group 06 API — Media, Documents, Access and Viewings

**Status:** Current backend contract, source-level. This document distinguishes mounted and usable backend paths from gated or absent capabilities. API paths below are mounted by `src/app.js`; `/api/document` is a compatibility alias for the `/api/documents` router.

**Requirements sources:** PRD §14; RQS-06 §§11–14; RQS-01 §§1, 19, 20 and 25; canonical media fields in RQS-02/RQS-04. The Specifications govern conflicts. Listing media uploads retain format/content validation but do not call an antivirus scanner; antivirus scanning was removed because it is not a requirement in those sources.

## Shared request rules

- Protected routes require `Authorization: Bearer <token>` and the authenticated active profile in `X-Profile-ID` (the auth middleware also accepts the selected-profile context encoded in the authenticated session where configured). Mutations re-read current profile, membership, mandate, seat and resource authority server-side.
- The normal JSON API error envelope is the application error response with a stable `code` and `requestId` when available. Do not infer resource existence from a 403/404.
- Protected metadata, requests, grants, view sessions, calendar responses and bookings are `Cache-Control: private, no-store`, and vary by authorization/profile. Private content responses use `nosniff`, a restrictive content policy, safe content disposition, and no provider URL.
- Public listing media is a separate path: only profile-owned, current, content-validated assets attached through canonical media fields are released to public listing projections. Private document records and storage locators are not public DTO fields.

## Media upload and association

### `POST /api/media/upload`

**Purpose:** Upload image/video media for a source-defined listing section. This is a public-media asset intake route, not a private document upload route.

**Authentication/authorization:** Bearer + current seller profile (`owner`, `developer`, `agency`, or `sellers_agent`), `listing.media`, verified identity/contact eligibility as enforced by the current media upload service. Current profile and permissions are checked before Multer and again before storage/persistence.

**Request:** `multipart/form-data`; up to 10 `files` parts; optional text field `section` (one of a source-defined public upload section). Per file maximum 50 MiB; one text field, 120 bytes. Formats: JPEG, PNG, WebP, MP4, QuickTime/MOV. Image bytes undergo content/signature/dimension validation and the approved media size policy; video container/brand and filename extension are checked. Media metadata/contact policy is applied. The route does not perform antivirus scanning.

**Success:** `201 { "media": [<uploaded asset DTO>] }`. Each DTO is the stored asset response plus `assetId`, `versionId`, and `uploadSection`; the CDN URL is for explicitly public-safe media sections only. Later listing mutations must provide the same `assetId` and `versionId`; the server checks profile ownership, section, current content hash/state and media type.

**Errors:** `AUTH_PROFILE_REQUIRED`, `PERMISSION_SELLER_PROFILE_REQUIRED`, `PERMISSION_PROFILE_REQUIRED`, `AUTH_KYC_REQUIRED`, `DOCUMENT_SIZE_INVALID`, `DOCUMENT_CONTENT_INVALID`, `FEATURE_POLICY_UNCONFIGURED`, `LISTING_MEDIA_SECTION_INVALID`, `LISTING_MEDIA_ACCESS_WORKFLOW_REQUIRED`, `LISTING_MEDIA_TYPE_INVALID`, `LISTING_MEDIA_REFERENCE_AUTHORITY_REQUIRED`, `PERMISSION_LISTING_MEDIA_OWNER_REQUIRED`, `PERMISSION_LISTING_MEDIA_VERSION_REQUIRED`, `LISTING_MASTER_PLAN_RELEASE_REQUIRED`, `FEATURE_MEDIA_DECODER_UNAVAILABLE`.

**Access policy:** `ListingMediaAssetService.fixedFreeFields` only permits direct public upload for source-defined Free sections (photos/renders/recorded walkthroughs, project logo, sanitized master/site plan). Other media needs its defined protected-entitlement or rendering workflow; the upload route returns a conflict rather than making it public. Master/site plan bytes are rasterized and metadata stripped before public release.

**Association contracts:** Project media can also be associated through `POST /api/projects/:id/media`; canonical property/project/type/unit APIs accept media references and preserve current asset version/provenance. The public property/project serializers return only safe public media fields. Never send a storage key as an asset reference.

### Public/legacy media content

The public media URLs in an eligible public listing DTO are deliberately public. Legacy migrated media uses `/api/documents/private-migrations/legacy-files/:id/public-content` only when its approved policy explicitly marks that item Free and the migration/release proof is current. Any private, Paid, On request, quarantined, held, unsupported or stale source stays behind an authenticated route or is withheld. The legacy replacement public-content route has the corresponding replacement version segment. This is a controlled REALTIQ content route, not a Cloudinary URL.

## Protected documents: upload, metadata, requests and grants

### Mounted upload routes

| Method and path | Request | Success and main controls |
|---|---|---|
| `POST /api/documents/properties/:propertyId/title-upload` | Multipart single `file`; current supported title metadata fields (`documentType`, `title`, `accessPolicy` JSON); route `propertyId` binds resource. | `201` private `{document,verification,verificationExisting,riskDetected,nextAction}`. Current seller `document.issue`/owner signatory authorization runs before Multer; content validation and file-byte/path/profile-bound step-up run before persistence. |
| `POST /api/documents/title-upload` | Legacy multipart contract; requires `X-Property-ID` matching the multipart `propertyId`. | Header-based authorization precedes file buffering. Missing `X-Property-ID` returns `410 DOCUMENT_UPLOAD_ROUTE_DEPRECATED`; mismatched header/body binding is rejected. New clients use the property-scoped path above. |
| `POST /api/documents/title-asset-upload` | Multipart single `file` and staged-asset metadata. | Private staging record; current seller/document authority, validated bytes and bound step-up required. A staged asset is not public, verified, or a canonical listing reference until attached through the supported workflow. |
| `POST /api/documents/projects/:projectId/registered-survey` | Multipart single `file` and supported document metadata. | Private project survey vault; project authority before file buffering, then content validation and request-bound step-up. |
| `POST /api/properties/:propertyId/title-documents` | Mounted property-scoped title-file compatibility route; multipart `file`. | Current property permission before Multer; file remains protected and versioned. |

Protected title/evidence upload accepts only supported PDF/JPEG/PNG/WebP content within the route's configured size limit. The supported implementation checks file signatures, container structure, format, size, hash and protected storage custody. It does not call a malware scanner. When the private storage/encryption configuration is missing, upload fails closed and does not issue a public URL.

The shared title-document Multer parser accepts one `file`, at most 8 multipart text fields, at most 8 KiB per field, at most 9 total parts and a 50 MiB file. Step-up and file-digest metadata count toward the text-field limit; clients must send only documented fields for that route. `POST /api/documents/title-asset-upload` returns `201 {titleDocumentAsset:{assetId,mimeType,originalFileName,fileSizeBytes,expiresAt,contentValidation:{state,validatedAt}}}`.

The multipart step-up challenge binds exact method, path, selected profile/session, ordinary multipart text fields and SHA-256 of file bytes. Upload submits the matching `X-Step-Up-Challenge`, fields, digest and file; changing any bound field, bytes, profile, method or path requires a new challenge. Use the authentication handoff's `POST /api/auth/step-up` contract to obtain a challenge; do not put the raw file or its storage URL in JSON.

### Document metadata and list routes

| Method and path | Contract |
|---|---|
| `GET /api/documents?propertyId=<id>&page=1&limit=50` | Exactly one of `propertyId` or `projectId`; optional property `category=title_document`; page 1–10000, limit 1–100 (default 50). Private `{documents:[...] ,pagination:{page,limit,total,pages}}` for the profile's current entitlement/authority. A public listing does not reveal private IDs or declared title types. |
| `GET /api/documents?projectId=<id>&category=registered_survey&page=1&limit=50` | Project scoped. Buyers see only the current registered survey eligible for On request, safe metadata and their own request state; owners/authorized staff see the private owner projection. |
| `POST /api/documents` | Step-up protected staged-asset attachment. JSON `{propertyId,documentType,assetId,title?,accessPolicy?}`; `assetId` must be a current unused staged asset owned by the active profile. Returns `201 {document,verification,verificationExisting,riskDetected,nextAction}`. Prefer the property-scoped multipart route for new uploads. |
| `GET /api/documents/:id` | Protected metadata for an authorized current profile. Returns `{document:<safe DTO>,accessStatusEndpoint,viewerEndpoint}`. No storage URL, original provider locator, raw file or unrestricted private metadata. |
| `GET /api/properties/:propertyId/title-documents` | Buyer-side entitled/approved public-policy projection; returns only source-authorized title document summaries and current verification/access states. |
| `GET /api/properties/:propertyId/title-documents/manage` | Seller/admin manage projection; pagination and current selected profile/resource authority apply. Response `{documents:[...],pagination}` includes version and access-policy fields appropriate to the manager. |

Title public summary fields are `{id,publicReference,documentType,title,verificationStatus,verified,accessMode,price,pricingState,pricingErrorCode?}`. Private manage rows add `version`, `submissionVersion`, `submittedAt`, and `accessPolicy:{enabled,mode,price,pricingState,pricingErrorCode?}`. Price is policy-derived, never from the legacy mutable document price.

### On-request access workflow

| Method and path | Contract |
|---|---|
| `POST /api/documents/:id/access-requests` | Current Verified buyer/profile, `document.read`, active published listing, current document version and access policy `on_request`. Empty JSON body only. `201 {request:<safe grant DTO>}`. |
| `GET /api/documents/access-requests?propertyId=<id>&page=1&limit=50` or `?projectId=<id>` | Exactly one resource parameter. Current owner profile with `document.request.approve`. `{requests:[<safe grant DTO>],pagination}`. |
| `POST /api/documents/:id/grant` | Step-up. Body `{requestId,decision:"approve"|"decline"|"revoke",expectedVersion,downloadsAllowed?,expiresAt?}`. Approval/revocation requires current seller/owner/signatory and rechecks recipient Verified status, current document version, content state and listing publication. `200 {request:<safe grant DTO>}`. Preparer/owner policy and current status remain authoritative. |
| `GET /api/documents/:id/access-status` | For project survey returns `{hasAccess,mode,paymentRequired:false,requestState,canRequest,expiresAt}`. Title documents use the current title-document access service; see the title-document viewer routes below. |

Safe access-grant DTO: `{id,documentId,propertyId?,projectId?,state,requestedAt,decidedAt,revokedAt,expiresAt,downloadsAllowed,version}`. A grant is bound to recipient identity/profile, exact document submission version/hash and resource; those private bindings are deliberately omitted. Revocation, expiry, replacement, profile/session change, or custody/content failure immediately blocks access.

### Paid title-document view

| Method and path | Contract |
|---|---|
| `POST /api/title-documents/:documentId/initialize-view-payment` | Bearer + bound step-up; server checks current title document, current approved/published verification, seller access policy, price policy FP-11 and idempotent purchase state. Response is the document purchase job/payment DTO. Config/provider unavailable or unconfigured never creates an assumed entitlement. |
| `GET /api/title-documents/:documentId/access-status` | Bearer; returns `{hasAccess,paymentRequired,price,pricingState,pricingErrorCode?,mode,verificationStatus,checkout?}` and mode-specific `viewed`, `remainingViews`, or `viewCount` where applicable. Requires verified identity and document visibility. |
| `POST /api/title-documents/:documentId/open-viewer` | Bearer; access derived server-side, no client grant/payment fields. `201` short-lived viewer session response with `sessionToken`, content URL, optional permitted download URL, expiry, watermark and controls. |
| `PATCH /api/title-documents/:documentId/access-policy` | Current seller/admin route with step-up; body `{accessPolicy:{enabled,mode},expectedVersion}`. Modes: `private`, `paid_view_once`, `paid_view_multiple`, `on_request`. The server normalizes mode/enabled and ignores any caller-supplied price. |
| `GET /api/title-documents/:documentId/views?page=1&limit=50` | Current seller or authorized Console document reviewer; audit view rows and pagination. No private provider locators. |
| `GET /api/title-documents/:documentId/analytics` | Existing authenticated management projection; current route role middleware plus service authorization. |

### Protected viewer bytes

| Method and path | Contract |
|---|---|
| `GET /api/title-document-viewer/:sessionToken/content` | Authenticated current profile/session; returns sanitized, watermarked inline content only after current access/grant/verification/custody/content/version checks. |
| `GET /api/title-document-viewer/:sessionToken/download` | Same checks plus seller-approved `downloadsAllowed`; otherwise `DOCUMENT_DOWNLOAD_FORBIDDEN`. |
| `POST /api/title-document-viewer/:sessionToken/end` | Empty body; ends session and returns `{endedAt,durationMs,status}`. Duration is calculated by the server. |

Viewer sessions are short-lived and bound to current auth session, identity, profile, document ID, document version/hash, and grant/entitlement version. Protected rendering uses a generic safe name, a viewer/date watermark, `private, no-store`, `nosniff`, restrictive CSP and safe inline/attachment disposition. Only supported formats render; unsupported content produces an explicit error. PDF and supported raster content are rendered through the protected renderer; multi-page sequences require the existing approved rendering policy. `PROTECTED_DOCUMENT_WATERMARK_FONT_PATH` is needed for Unicode watermark names; when missing, protected rendering fails closed. Never use the raw Cloudinary URL as a fallback.

## Protected-file custody, migration, replacement and inspection

The plural `/api/documents/private-migrations/...` paths below are operational staff/owner workflows, not normal media screens. Every mutation rechecks current session/profile, current resource or KYC authority, policy/revision, separation of duties, source version and step-up where mounted. All responses are private/no-store. A pending/approved custody record is not proof that bytes have moved or are safe to view.

| Method and mounted path | Purpose / response family |
|---|---|
| `GET /api/documents/private-migrations/discovery`, `GET .../legacy-discovery` | Authorized inventory only; returns bounded source candidates and eligibility reasons. |
| `POST /api/documents/private-migrations/sources/:kind/:sourceId` | Enqueue source migration; step-up; returns job/status record. |
| `GET /api/documents/private-migrations/:id`, `POST .../:id/recovery`, `POST .../:id/revocation-attestation`, `POST .../:id/revocation-approval` | Current migration state and protected recovery/attestation workflow; mutations are versioned and step-up protected. |
| `GET /api/documents/private-migrations/review`, `GET .../review/:id/history` | Staff review queue/history with current department authority. |
| `GET /api/documents/private-migrations/reconciliations/discovery`, `GET .../reconciliations/review`, `POST .../reconciliations`, `GET .../reconciliations/:id`, `POST .../:id/decision`, `POST .../:id/recovery` | Source inventory reconciliation and independently reviewed recovery. Discovery never relocates or releases files. |
| `GET /api/documents/private-migrations/custody/discovery`, `POST .../custody/cases`, `POST .../custody/cases/:id/review` | Record custody case and review. Custody metadata alone does not prove byte custody. |
| `GET /api/documents/private-migrations/custody/cases/:id/movement-discovery`, `POST .../custody/cases/:id/movement` | Dry-run/movement preparation. |
| `GET /api/documents/private-migrations/custody/movements/:movementId`, `GET .../:movementId/history`, `POST .../:movementId/decision`, `/attestation`, `/revocation-approval`, `/retry` | Versioned, audited movement state/review/recovery. Independent approval is required where policy says so. |
| `POST /api/documents/private-migrations/legacy-files`, `GET .../legacy-files/review`, `GET .../legacy-files/:id`, `GET .../:id/history`, `POST .../:id/mapping`, `/decision`, `/retry`, `/amendment`, `/amendment/decision` | Legacy source mapping, evidence, review and retry. No new public URL is inferred. |
| `POST /api/documents/private-migrations/legacy-files/:id/replacements`, `GET .../:id/replacements/:replacementId`, `POST .../decision`, `/retry` | Version-bound legacy replacement/review. |
| `POST /api/documents/private-migrations/legacy-files/:id/replacements/:replacementId/access-requests`, `GET .../access-requests`, `POST .../access-requests/:grantId/decision`, `GET .../access-requests/:grantId/content`, `/download` | Bound recipient request/decision and controlled content. Download requires approved grant. |
| `GET /api/documents/private-migrations/legacy-files/:id/content`, `GET .../:id/download`, `GET .../:id/proof-content`, `GET .../:id/public-content` | Protected legacy content routes; only explicit source-policy Free releases use public-content. Authenticated routes recheck custody/state/authorization before bytes. |
| `GET /api/documents/assets/:assetId/inspection`, `POST .../inspection/retry`, `GET /api/documents/:id/inspection`, `POST .../inspection/retry` | Content/format validation state, not antivirus status. Retry is bounded and authorized. |

These routers are also mounted under `/api/document` for compatibility. Use `/api/documents` for new code. The exact route-level middleware and specialized staff departments are in `src/routes/documentRoutes.js`; resource/source rules are in the corresponding private migration/custody services. Do not expose inventory IDs or evidence contents to a buyer selector.

## Listing/project access levels and current backend behavior

Source levels are **Free**, **Paid**, **On request**, and **Private**. Fixed-Free sections continue through sanitized public media upload. Other source-defined canonical media fields use `ProtectedMediaItem` and the approved `media_access` Console policy. Paid media requires a current Verified buyer profile, a paid Monnify FP-11 order and a version-bound grant. On request always requires a current seller-approved request for that exact item version, including when a Buyer Pass or sponsorship model is available; the seller may require the FP-11 payment before activation. Private is available only to the current seller authority and Legal Verification staff with current selected staff-profile permission. Existing title documents and registered surveys retain their specialized, version-bound routes and authorization. A seller policy never turns an unsafe storage locator into a public URL.

For protected canonical media, the approved policy and each item's selected `freeModels` control seller-sponsored FP-13 access, public sanitized preview, Buyer Pass FP-12, and free-after-action. Buyer Pass also covers opted-in paid title documents and market analytics through the current selected buyer profile. Every protected view is logged; sellers and Legal Verification staff can page the view history. Seller-paid capture remains inert until a verified capture-cost event is available: no seller declaration or client Boolean can create it. Price and payment state are always authoritative server-side.

## Viewing contracts

### Seller calendar read/write

Seller calendar settings are mounted under `/api/tour`; all responses are private/no-store. A current seller profile with `viewing.manage` is required. Resource overrides additionally require current `viewing.manage` authority over the project/property; unit types are checked against the current project type list. Assignment identity must be an active member with current `viewing.manage`; revoked/expired seats are excluded.

**Calendar scope:** `scopeKind=profile|project|unit_type|property`. `profile` takes no IDs; `project`/`property` require `resourceId`; `unit_type` requires both `resourceId` (embedded type ID) and `projectId`. Effective precedence: property → unit type → project → profile. Removing an override restores the inherited calendar.

#### `GET /api/tour/calendar?scopeKind=profile`

Optional `resourceId`, `projectId`; optional `staffIdentityId` filters the seller-facing slot list and must identify a current permitted team member. Response:

```json
{
  "calendar": {
    "id": "<calendar-id>", "scopeKind": "profile", "scopeId": "<seller-profile-id>",
    "version": 3,
    "slots": [{ "slotId": "<slot-id>", "startsAt": "2030-01-01T10:00:00.000Z", "endsAt": "2030-01-01T11:00:00.000Z", "assignedToIdentityId": "<team-user-id>" }],
    "updatedAt": "2030-01-01T09:00:00.000Z"
  },
  "inheritedFrom": null,
  "inheritedCalendar": null,
  "effectiveCalendarId": "<calendar-id>"
}
```

If no override exists, `calendar:null`; `inheritedFrom` is `profile|project|unit_type|property|null` as applicable and `inheritedCalendar` has the same calendar DTO. `effectiveCalendarId` is the exact effective record ID or `null`. Team identity is returned only to authorized seller-side calendar readers; never expose it in buyer availability.

#### `PUT /api/tour/calendar`

Body allowlist:

```json
{
  "scopeKind": "profile",
  "expectedVersion": 0,
  "slots": [
    { "startsAt": "2030-01-01T10:00:00.000Z", "endsAt": "2030-01-01T11:00:00.000Z" },
    { "startsAt": "2030-01-02T10:00:00.000Z", "endsAt": "2030-01-02T11:00:00.000Z", "assignedToIdentityId": "<active-member-user-id>" }
  ]
}
```

Resource scopes add `resourceId`; unit type adds `projectId`. A slot may include a returned `slotId` to retain the same slot across updates. Dates must be future ISO datetimes and `endsAt > startsAt`; maximum 100 intervals; slots in one calendar cannot overlap. A booked active slot cannot be removed or changed; reschedule/cancel/complete its booking first. `expectedVersion:0` creates a calendar; subsequent writes use the returned version. Success is the calendar response above. Errors include `INPUT_VIEWING_CALENDAR_INVALID`, `INPUT_VIEWING_SLOTS_INVALID`, `INPUT_VIEWING_SLOTS_OVERLAP`, `CONTENT_VIEWING_ASSIGNMENT_INVALID`, `PERMISSION_VIEWING_ASSIGNMENT_REQUIRED`, `CONFLICT_VIEWING_CALENDAR_VERSION`, and `CONFLICT_VIEWING_SLOT_BOOKED`.

#### `DELETE /api/tour/calendar`

Deletes only a non-profile override. Body: `{ "scopeKind":"property", "resourceId":"<property-id>", "expectedVersion":2 }` (project/unit-type scopes use their required identifiers). Success `{calendar:null,inheritedFrom:<scope|null>,inheritedCalendar:<calendar DTO|null>}`. Profile calendar deletion and removal of an override containing an active booking are rejected. This operation uses the current selected seller profile and resource authority; no step-up is currently mounted.

### Buyer availability and booking

#### `GET /api/tour/availability?propertyId=<id>&from=<ISO>&to=<ISO>&page=1&limit=50`

Requires Bearer + a current registered buyer profile. A buyer sees only slots for the selected published listing, never seller calendars or assigned staff IDs. `from` and `to` are required ISO datetimes, `to > from`; page 1–10000; limit 1–100 (default 50). Exact response states:

```json
{ "state":"available", "property":{"id":"<id>","publicReference":"RTQ-PROP-..."}, "calendarId":"<id>", "calendarVersion":3, "slots":[{"slotId":"<id>","startsAt":"2030-01-01T10:00:00.000Z","endsAt":"2030-01-01T11:00:00.000Z"}], "pagination":{"page":1,"limit":50,"total":1,"pages":1} }
```

No appointment advertised: `state:"not_offered", reasonCode:"VIEWING_APPOINTMENT_NOT_OFFERED", slots:[]`. Missing seller calendar: `state:"not_configured", reasonCode:"VIEWING_AVAILABILITY_NOT_CONFIGURED", slots:[]`. An eligible calendar with no free slots returns `state:"available"` and empty `slots`. Unpublished, archived, sold/ineligible inventory is returned as unavailable/not found and is not enumerated.

#### `POST /api/tour`

Bearer + registered buyer profile. Existing compatibility body:

```json
{
  "propertyId":"<property-id-or-public-reference>",
  "type":"private_showing",
  "mode":"physical",
  "scheduledAt":"2030-01-01T10:00:00.000Z",
  "calendarId":"<availability-calendar-id>",
  "calendarVersion":3,
  "slotId":"<availability-slot-id>",
  "notes":"Optional, max 1000 characters; on-platform contact policy applies"
}
```

`private_showing` requires the effective canonical `privateShowingsByAppointment:true` and a current slot. `show_home` requires the effective canonical `showHome.appointmentRequired:true` for that unit type and a slot. In both, `scheduledAt` must equal selected slot start and `mode` is `physical`. The server rechecks current listing publication/availability, owner, membership, slot version, slot assignment and conflict inside the booking transaction. Success `201 {tour:<DTO>}` with `{id,type,mode,scheduledAt,startsAt,endsAt,status,version,createdAt,updatedAt,property:{id,publicReference,title,location,status},notes}`. Initial state is `pending`; seller actions use existing status `approved|rejected|completed`.

Legacy `type:"open_house"` returns `409 CONTENT_OPEN_HOUSE_NO_BOOKING`: Open House is walk-in, not an appointment; render the canonical `openHouseSchedule`. `virtual_paid` returns `503 FEATURE_PAID_TOUR_UNAVAILABLE`. Seller-run `live_guided_video_tour` uses a seller-enabled calendar and Zoom Server-to-Server OAuth; missing Zoom configuration returns `503 FEATURE_LIVE_VIDEO_PROVIDER_UNAVAILABLE`. `staging_view` remains accepted as a legacy compatibility type and should not be exposed as a source-defined option.

#### `GET /api/tour?page=1&limit=50&status=pending`

Current buyer sees only their own selected-profile bookings. Seller sees owned/mandated authorized resources. Staff reads require Customer Support authority; Internal Audit is read-only. Success is a JSON array of tour DTOs with `Cache-Control: private, no-store` and headers `X-Result-Count`, `X-Page`, `X-Page-Count`; the CORS allowlist exposes all three to browsers. Query allows `page`, `limit` (1–100), and status `pending|approved|rejected|completed|cancelled`.

#### `PATCH /api/tour/:id`

Status compatibility body is `{ "status":"approved", "expectedVersion":0 }` (expectedVersion optional only on the legacy status-only form; version conflict is returned if supplied and stale). Seller assignment requires `expectedVersion` and body `{ "assignedToIdentityId":"<active-member-user-id>", "expectedVersion":0 }`; use `null` to clear an assignment. Reschedule requires the complete selected slot tuple plus version: `{ "calendarId":"<id>", "calendarVersion":3, "slotId":"<new-slot-id>", "scheduledAt":"<same-slot-start>", "expectedVersion":1 }`. The route rechecks seller resource permission, active seat and assignment permission, current slot/calendar version, no overlap and pending/approved status; no staff/client field can change owner or buyer identity. Status, assignment and reschedule can be combined atomically with expectedVersion. Success is one safe tour DTO; failures include `CONFLICT_TOUR_VERSION`, `CONFLICT_TOUR_STATE`, `CONFLICT_VIEWING_CALENDAR_VERSION`, `CONFLICT_VIEWING_SLOT_UNAVAILABLE`, `CONFLICT_VIEWING_SLOT_BOOKED`, `PERMISSION_VIEWING_ASSIGNMENT_REQUIRED`, `PERMISSION_RESOURCE_REQUIRED`, `AUTH_PROFILE_FORBIDDEN`.

Creation sends in-app notices `viewing.request` to seller, `viewing.created` to buyer, and `viewing.assigned` when the selected slot is assigned. Seller updates send `viewing.updated` to buyer and `viewing.assigned` to the member after assignment. Messages contain no contact details. Delivery uses the existing notification service; no new notification provider is introduced.

## Live Guided Video Tour (seller-run Free)

`PUT /api/tour/calendar` accepts the existing `{scopeKind,resourceId?,projectId?,expectedVersion,slots}` body plus `liveGuidedEnabled:boolean`. `GET /api/tour/calendar` includes `liveGuidedEnabled` in the calendar DTO. `GET /api/tour/availability?propertyId=<id>&type=live_guided_video_tour&from=<ISO>&to=<ISO>&page=1&limit=50` uses the effective calendar/slot version; a disabled seller option returns `state:"not_offered",reasonCode:"LIVE_VIDEO_NOT_OFFERED",slots:[]`. A missing Zoom runtime returns `503 FEATURE_LIVE_VIDEO_PROVIDER_UNAVAILABLE` without reserving a slot.

Buyer booking uses `POST /api/tour` with `{propertyId,type:"live_guided_video_tour",mode:"virtual",scheduledAt,calendarId,calendarVersion,slotId,notes?}`. The current buyer profile and published/available listing are checked before booking. `201 {tour:{id,type,mode,scheduledAt,startsAt,endsAt,status:"pending",version,video:{state:"queued",provider:"zoom",joinPath:null},property,...}}`. The seller approves/reschedules through the existing versioned `PATCH /api/tour/:id`; rescheduling or terminal status queues a provider update. Meeting creation is performed by `src/jobs/liveVideoTourScheduler.js` with a durable tour lease, bounded batch and current buyer/owner/listing recheck. An uncertain Zoom create is held in `reconciliation_required` rather than blind-retried.

| Method and path | Authorization, request and response |
|---|---|
| `GET /api/tour/:id/video-session` | Bearer, current buyer or seller resource `viewing.manage`. `200 {tourId,state,provider:"zoom",joinPath,lastErrorCode}`; states `queued`, `processing`, `ready`, `reconciliation_required`, `ended`. Meeting ID, raw join URL and host credentials are never returned. |
| `GET /api/tour/:id/video-session/join` | Same current participant authority. Requires approved tour, ready meeting, current published/available property and parent project, and unexpired slot. Rechecks Zoom meeting binding, audits the read and responds `200 {joinUrl:"<current Zoom URL>"}` with private/no-store headers. The seller receives the current host-start URL; the buyer receives the attendee URL. Neither is in public listing/session DTOs. Never cache or publish it. A missing valid host-start URL yields `503 LIVE_VIDEO_HOST_LINK_UNAVAILABLE` for the seller. No step-up is added to this read. |
| `POST /api/tour/:id/video-session/reconcile` | Current seller resource authority, bound step-up; `{meetingId:"<Zoom numeric ID>",expectedVersion:<tour version>}`. An operator must find the actual Zoom meeting by its `REALTIQ tour <tourId>` agenda marker after an ambiguous create; never guess an ID. The backend verifies that marker against Zoom before persisting. `200 {tourId,state:"ready",provider:"zoom",joinPath,version}`. This is recovery for an ambiguous provider outcome, not a new meeting creation. |

Zoom runtime variables are `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_HOST_USER_ID`; scheduler controls are `LIVE_VIDEO_TOUR_SCHEDULER_ENABLED`, `LIVE_VIDEO_TOUR_SCHEDULER_INTERVAL_MS` and `LIVE_VIDEO_TOUR_MAX_MEETINGS_PER_RUN`. The official Zoom OAuth and Meetings API are used. Meetings require the host and use Zoom's waiting room; no recording is started automatically. The seller host-start URL is fetched on demand and never persisted or returned to the buyer. No provider credentials or meeting links are stored in a public listing projection. The seller remains the guide; the platform Zoom host account is an integration principal.

## Protected canonical listing media and common access levels

The following endpoints are mounted under `/api/media`. They use `ProtectedMediaItem` with exact `resourceKind=property|project|unit_type`, `resourceId` (project ID for `unit_type`) and `unitTypeId` for embedded unit types. New property drafts must be created before attaching protected media. A canonical mutation accepts the protected item's `{assetId:item.id,versionId:item.versionId}` only for the exact same resource, media field, seller profile and current version. Fixed-Free photo/render/recorded-tour/master-plan sections continue to use `/api/media/upload`; they cannot be reclassified as Paid.

| Method and path | Request/response and authority |
|---|---|
| `GET /api/media/access-options` | Public-safe, no-store `{levels:[{mediaKind,allowedLevels}],freeModels,buyerPassDurationHours,grantDurationHours,prices:{paidItem,buyerPass,sellerSponsored}}`; each price is `{state:"configured"|"unavailable",amountMinor,currency,errorCode?}`. `503 FEATURE_POLICY_UNCONFIGURED` if no approved `media_access` revision. This exposes approved usable choices, never policy secrets. `seller_capture` is withheld from the returned options until a verifiable capture-cost event exists. |
| `GET /api/media/resources/:resourceKind/:resourceId/items?unitTypeId=<id>&limit=25&after=<opaque-id>` | `unitTypeId` is required only for `unit_type`. `200 {items:[<safe item DTO>],nextCursor}`. Public sees only published non-Private items; owner/authorized Legal Verification staff may see their private items. Cursor advances by the last scanned ObjectId in descending order; a page may contain fewer visible items than the limit. Limit 1–100. |
| `POST /api/media/resources/:resourceKind/:resourceId/items` | Bearer/current seller `listing.media`; owner-resource authorization precedes Multer. Multipart single `file` plus `mediaKind`, `title` (1–160), `capturedAt` (`YYYY-MM-DD`), `accessLevel`, optional JSON-array `freeModels`, `unitTypeId`, `previewAssetId`, `downloadsAllowed`, `chargeOnRequest`, `previousItemId`, and `__stepUpFileSha256`. One file, at most 12 text fields, 4 KiB per field, configurable byte limit. Exact method/path/profile/session/metadata/file digest bound via `X-Step-Up-Challenge`. `201 {item:<safe item DTO>}`. The server validates source-specific image/video sections, file signatures, content/container, current policy, ownership and version; seals bytes before creating a selectable item. The source label is server-owned `seller_provided`. |
| `GET /api/media/items/:id/preview` | Public only for a current published item with approved `free_preview` and a validated public image preview. `303` to the sanitized preview asset. No protected original URL or bytes are released. |
| `GET /api/media/items/:id/content` | Current Free, owner, Legal Verification staff, or eligible Verified buyer entitlement. For non-Free buyer access, `?download=true` requires an explicit current seller-approved download grant. Returns safe inline PDF/image/video or an attachment for allowed technical files, `private,no-store`, `nosniff`, sandbox CSP and `X-Media-View-ID` for logged buyer views. Non-Free image/PDF/video is watermarked with viewer name/time; explicit downloads also use the safe rendition. Rendering failure returns explicit `DOCUMENT_RENDER_FORMAT_UNAVAILABLE` or `FEATURE_MEDIA_VIDEO_RENDERER_UNAVAILABLE`; never fall back to an original storage URL. |
| `POST /api/media/items/:id/views/:viewId/complete` | Authenticated viewer, `{durationSeconds:<integer 0..86400>}`; server caps it at elapsed time. `200 {viewId,state:"recorded"}`. |
| `GET /api/media/items/:id/views?limit=25&after=<id>` | Current seller `document.read` or Legal Verification staff. `200 {views:[{id,itemVersion,viewerProfileId,viewerName,accessMode,startedAt,endedAt,durationSeconds}],nextCursor}`. No contact, KYC or storage data. |
| `POST /api/media/items/:id/access-requests` | Verified buyer/current profile, empty JSON body. On-request item only. `200 {request:{id,itemId,buyerProfileId,state,version,downloadsAllowed,expiresAt,createdAt,updatedAt},idempotent}`. |
| `GET /api/media/items/:id/access-requests?limit=25&after=<id>` | Current seller with `document.request.approve`. `200 {requests:[<grant DTO>],nextCursor}`. |
| `POST /api/media/items/:id/access-requests/:grantId/decision` | Current seller authority, owner signatory for approve/revoke, bound step-up; `{decision:"approve"|"decline"|"revoke",expectedVersion,downloadsAllowed?}`. `200 {request:<grant DTO>}`. Approved free requests are usable until expiry; charged requests require a paid order before activation. |
| `POST /api/media/items/:id/revoke` | Current owner profile and current signatory authority, bound step-up; `{expectedVersion}`. `200 {item:<safe DTO>}`; item revocation immediately blocks all grants/passes and protected reads. Replacement uploads specify `previousItemId` and revoke the prior version atomically. |
| `POST /api/media/items/:id/purchase` | Verified buyer, bound step-up; `{idempotencyKey:"<8..128 chars>"}`. FP-11/Monnify price is derived on server. `200 {order:<order DTO>,idempotent:false}`; purchase is held if the item, ownership, publication or buyer authority changes before paid fulfillment. |
| `POST /api/media/items/:id/sponsor` | Current seller, current owner signatory, bound step-up; same idempotency body. FP-13/Monnify paid fulfillment activates seller-sponsored free viewing. |
| `POST /api/media/buyer-passes/purchase` | Verified buyer, bound step-up; same idempotency body. FP-12/Monnify paid fulfillment creates a profile-bound time-limited pass. |
| `GET /api/media/orders/:id` | Purchasing profile only. `200 {order:{id,kind,itemId,paymentId,paymentReference,amountMinor,currency,state,checkoutUrl,expiresAt,lastErrorCode,createdAt,updatedAt},paymentStatus}`. Order states `pending`, `active`, `held`, `failed`; `paymentStatus` is `pending`, `paid`, `failed`, `canceled` or `unknown`. Unknown provider initiation is reconciled through the same reference, never blindly recharged. |

Safe item DTO fields are `{id,versionId,resourceKind,resourceId,unitTypeId,ownerProfileId,mediaKind,title,capturedAt,source,mimeType,fileSizeBytes,accessLevel,freeModels,previewPath,state,version,downloadsAllowed,chargeOnRequest,access,createdAt,updatedAt}`. `access` is `{state:"free"|"owner"|"staff"|"active"|"verification_required"|"request_available"|"purchase_available"|"locked",mode?,contentPath?}`. Policy is the approved `media_access` Console revision with `{rules:[{mediaKind,allowedLevels}],freeModels,buyerPassDurationHours,grantDurationHours,technicalFormats:[{mediaKind,mimeType,signatureHex}]}`. FP-11/12/13 and Monnify must also be configured for purchases. Private bytes use `LEGACY_MEDIA_ROOT` and the `LEGACY_MEDIA` envelope keyring; protected video requires `PROTECTED_MEDIA_FFMPEG_PATH`. Free protected images are served as metadata-stripped PNG, Free PDFs as safe rendered PDFs, and Free videos as transcoded MP4; the sealed source is not exposed to a public caller. A funded proxy inspection counts as a free-after-action entitlement only when it is bound to the current buyer profile; legacy account-only inspections do not grant cross-profile access. Seller-paid capture cannot be claimed without a verifiable capture-cost event and therefore remains unavailable.

Existing title document seller access-policy updates additionally accept optional `buyerPassEnabled:boolean` for enabled paid modes only: `PATCH /api/title-documents/:documentId/access-policy` with `{accessPolicy:{mode:"paid_view_once"|"paid_view_multiple",enabled:true,buyerPassEnabled:true},expectedVersion}` and bound step-up. Current title verification, document custody and selected buyer-profile pass are rechecked at viewer creation and every byte read. `GET /api/title-documents/:documentId/access-status` may return `{hasAccess:true,paymentRequired:false,mode:"buyer_pass",passExpiresAt}`. The seller must opt in; a pass does not override a Private/On request title policy. Market analytics access middleware and status likewise accept a current selected-profile Buyer Pass.

## General Document Manager

This is a separate authenticated, private workflow mounted at `/api/document-manager`; it does not replace title-document vault, payment receipts or REALTIQ fee invoices. Templates are editable drafts owned by the current issuer profile. Content and recipient access are selected-profile checked. Organization approval requires an independent active team member with `document.issue`; final issuance and organizational signing recheck current signatory authority. Approve, issue, sign and archive use bound one-use step-up. All mutations are audited. An issued document's body, issuer, recipients, reference and content fingerprint are immutable; amendments are new drafts with `previousDocumentId`.

| Method/path | Exact request and response |
|---|---|
| `GET /api/document-manager/templates?limit=25&after=<id>&state=active` | Issuer `document.issue`; `{templates:[{id,issuerProfileId,title,documentType,body,requiresWetInk,state,version,createdAt,updatedAt}],nextCursor}`. Limit 1–100; state `active|archived`. |
| `POST /api/document-manager/templates` | `{title,documentType,body,requiresWetInk?}`; `201 {template:<template DTO>}`. Placeholders in `body` use `{{name}}` keys. |
| `PATCH /api/document-manager/templates/:id` | `{expectedVersion,title?,documentType?,body?,requiresWetInk?,state?:"archived"}`; `200 {template:<template DTO>}`. Only current active template/version may change. |
| `GET /api/document-manager/documents?limit=25&after=<id>&state=<state>` | Current issuer/issued recipient `document.read`; `{documents:[<document DTO>],nextCursor}`. States `draft`, `approval_pending`, `approved`, `issuing`, `issued`, `signed`, `acknowledged`, `archived`. Recipients never see a draft or `issuing` reservation. |
| `POST /api/document-manager/documents` | `{templateId?,title?,documentType?,body?,recipientProfileIds?:[<current profile IDs>],mergeValues?:{placeholder:"text"},requiresWetInk?,previousDocumentId?}`. Title/type/body come from the template when omitted. Merge keys must match exactly. `201 {document:<document DTO with body>}`. |
| `GET /api/document-manager/documents/:id` | Current issuer or issued recipient. `200 {document:<document DTO with body>}`; read audit recorded. |
| `PATCH /api/document-manager/documents/:id` | Issuer `document.issue`, draft only; `{expectedVersion,title?,documentType?,body?,recipientProfileIds?,requiresWetInk?}`. `200 {document:<DTO with body>}`. |
| `POST /api/document-manager/documents/:id/submit` | Issuer `{expectedVersion}`. Individual issuer → `approved`; organization issuer → `approval_pending` and team notification. |
| `POST /api/document-manager/documents/:id/approve` | Independent organization team approver, bound step-up, `{expectedVersion}`. `approval_pending` → `approved`; the author cannot approve their own draft. |
| `POST /api/document-manager/documents/:id/issue` | Issuer/current organization signatory, bound step-up, `{expectedVersion}`. `approved` → durable `issuing` reservation → sealed PDF → `issued`. Same reservation can be retried after storage failure. `200 {document:<DTO>}`. Current recipients receive generic notices. |
| `POST /api/document-manager/documents/:id/sign` | Current recipient, organization signatory where applicable, bound step-up; `{expectedVersion,typedName}`. Stores profile, identity, time and issued content hash; duplicate response blocked. |
| `POST /api/document-manager/documents/:id/acknowledge` | Current recipient `{expectedVersion}`. Same version/identity checks; records acknowledgment. Once all recipients respond, state is `signed` if any typed signature exists, otherwise `acknowledged`. `requiresWetInk` remains a separate visible flag and does not attest to physical ink by itself. |
| `POST /api/document-manager/documents/:id/archive` | Issuer, bound step-up, `{expectedVersion}`. Issued/signed/acknowledged → `archived`; content remains sealed and authorized recipients may still read it. |
| `GET /api/document-manager/documents/:id/content` | Authorized issuer or issued recipient; current access rechecked. Returns private sealed `application/pdf` bytes with `no-store`, `nosniff`, sandbox CSP and no storage URL. |
| `GET /api/document-manager/documents/:id/history?limit=25&after=<id>` | Issuer only; `{events:[{action,actorProfileId,at,version}],views:[{profileId,action,viewedAt}],nextCursor}`. |
| `GET /api/document-manager/v/:reference/:token` (QR) and `/verify/:reference/:token` (compatibility) | Public signed-QR verification; `200 {valid:true,reference,issuerName,documentType,issuedAt,contentHash,state,supersedesReference:null}`. Invalid/unknown tokens return `404 DOCUMENT_VERIFICATION_INVALID` without disclosing document contents or recipients. |

Document DTO: `{id,issuerProfileId,issuerIdentityId,recipientProfileIds,templateId,templateVersion,previousDocumentId,title,documentType,requiresWetInk,state,version,reference,issuedAt,contentHash,signatures:[{profileId,method,at}],approvedAt,archivedAt,contentPath,qrVerificationUrl,body?,createdAt,updatedAt}`. `body` is returned only on authorized detail/draft mutation. `contentPath` and `qrVerificationUrl` remain null while `issuing`. `REALTIQ_DOCUMENT_QR_KEY_BASE64` (dedicated 32-byte base64 key), `DOCUMENT_MANAGER_PUBLIC_ORIGIN` (HTTPS API origin), `DOCUMENT_MANAGER_MAX_ISSUED_BYTES`, private envelope storage and current `document.issue` permissions are required to issue. The QR encoder is local; no third-party QR service receives private document data. The public verification URL must fit the supported QR capacity. Missing keys/storage fail closed with `FEATURE_DOCUMENT_QR_UNCONFIGURED`/`FEATURE_MEDIA_STORAGE_UNCONFIGURED`.

## Confirmed implementation boundaries

| Capability | Current backend state |
|---|---|
| Public media upload/association | Implemented for fixed-Free sections; protected canonical media uses the private item route, current resource binding, item/version association and per-read entitlement. |
| Protected title/project-survey documents | Private storage, versioning, current status/access policy, view-on-request grants, paid-title access, safe protected render, access logs and controlled downloads exist. |
| Legacy private file custody/recovery | Staff discovery, mapping, review, custody/movement, replacement, reconciliation and protected content routes exist; original bytes/custody must still be proven. |
| Malware scanning | Not implemented and not required by cited PRD/Specifications; do not show antivirus scan states or configure an AV dependency. Existing file inspection validates content/signatures/containers and is not an antivirus claim. |
| Viewing calendar | Profile/project/unit-type/property explicit slots, override inheritance, staff assignment, buyer availability, booking, rescheduling and notifications are implemented by Group 06 routes. Calendar index deployment prerequisite is listed below. |
| Open House and Show Home display | Existing canonical `openHouseSchedule` and `showHome` fields carry source-specific specific/weekly schedules and hours. Open House is walk-in; bookings use private showing slots. |
| Live guided Zoom | Seller-enabled calendar, buyer slot booking, durable meeting synchronization, current participant join and explicit ambiguous-outcome reconciliation are implemented; live use is gated on Zoom credentials. |
| General document manager/templates/e-sign | Template, draft, independent organization approval, sealed PDF issuance, typed signing/acknowledgment, archive, access log and signed QR verification are mounted. Counsel-reviewed template content is not supplied by the backend. |

## Deployment prerequisites

- Deploy the code and create the `viewing_calendars` unique compound index `{ownerProfile:1,scopeKind:1,projectId:1,scopeId:1}` before concurrent seller calendar writes. `projectId` disambiguates embedded unit-type IDs. Do not run index creation from this document.
- Keep the existing private object storage, private envelope keys, content-validation and protected-renderer configuration current. For Unicode watermarks set `PROTECTED_DOCUMENT_WATERMARK_FONT_PATH` to an approved absolute TTF/OTF path.
- Configure title-document price/access policy and payment providers through their existing policies before Paid title views are enabled. No provider credential or policy is fabricated here.
- Configure the Zoom Server-to-Server OAuth account, host user and meeting API scopes, then start the live-video scheduler. Set the dedicated document QR key and HTTPS origin, and keep the private envelope keyring/volume durable. Approve a `media_access` Console revision and the applicable FP-11/12/13 prices before enabling protected-media purchases. Configure Monnify collections and trusted local FFmpeg for protected video rendering. No live provider call is made by this document.
- Apply the newly declared MongoDB indexes for managed documents, protected media, grants, passes, orders, views and tour video state before concurrent production use. Do not infer that a schema declaration has already created a production index.
- No antivirus service or AV environment variables are required.

## Source files

- Mounts: `src/app.js`, `src/routes/mediaRoutes.js`, `src/routes/documentRoutes.js`, `src/routes/titleDocumentRoutes.js`, `src/routes/titleDocumentViewerRoutes.js`, `src/routes/tourRoutes.js`, `src/routes/propertyRoutes.js`, `src/routes/projectRoutes.js`.
- Media: `src/controllers/mediaController.js`, `src/controllers/protectedMediaController.js`, `src/routes/protectedMediaRoutes.js`, `src/services/protectedMediaAccessService.js`, `src/services/protectedMediaPurchaseService.js`, `src/services/protectedMediaVideoRenderer.js`, `src/services/listingMediaAssetService.js`, `src/services/publicPropertySerializer.js`.
- Protected files: `src/controllers/documentController.js`, `src/controllers/titleDocumentController.js`, `src/services/profileDocumentReadService.js`, `src/services/profileDocumentGrantService.js`, `src/services/profileDocumentViewerSessionService.js`, `src/services/profileDocumentViewerAuthorityService.js`, `src/services/protectedDocumentRenderer.js`, `src/services/documentInspectionService.js`, `src/services/privateFileMigrationService.js`.
- Viewing: `src/models/ViewingCalendar.js`, `src/models/Tour.js`, `src/services/viewingCalendarService.js`, `src/services/profileTourService.js`, `src/services/liveVideoTourService.js`, `src/services/zoomMeetingAdapter.js`, `src/jobs/liveVideoTourScheduler.js`, `src/controllers/tourController.js`.
- General documents: `src/models/ManagedDocument*.js`, `src/services/managedDocumentService.js`, `src/services/documentQrService.js`, `src/routes/managedDocumentRoutes.js`; existing `privateMediaVault.js` stores sealed bytes.
