# Privacy, notifications and realtime

Mounted route evidence: `src/routes/profileRoutes.js`, `src/routes/adminRoutes.js`, `src/routes/notificationRoutes.js`, `src/realtime/socketServer.js`, and `src/realtime/realtimeService.js`. Profile routes use bearer auth, registered access, a selected `X-Profile-ID`, and private no-store response headers. Data-protection mutations additionally use step-up.

## Data-protection requests

### Endpoint

`GET /api/profiles/current/data-protection-requests`

Lists requests for the current requester/profile. Query is `before` (Mongo ID cursor) and `limit` (1–100, default 25). Response: `{ requests: DataProtectionRequestSummary[], nextCursor: string|null }`.

### Endpoint

`POST /api/profiles/current/data-protection-requests`

Creates an access, correction, or deletion request. Require a current non-staff profile; organization profile actions require `team.manage`. Step-up required. Body keys are exactly:

```json
{
  "requestType": "access|correction|deletion",
  "scopes": ["account_identity|profile_data|verification|documents|communications|transactions|listing_operations"],
  "correctionFields": ["account_name|account_phone|profile_name|profile_details|verification_record|document_metadata|listing_record"],
  "corrections": {},
  "operationKey": "8-100 characters",
  "expectedProfileVersion": 0
}
```

`scopes` must be a non-empty, duplicate-free array of supported values. `correctionFields` is required and non-empty for correction; omit/empty for other request types. `corrections` is accepted only for correction. The request is idempotent on `(profile, operationKey)` with the same normalized fingerprint; reusing the key for different data returns 409. Success is 201 `{ request: { id, profileId, requestType, state, version, submittedAt, reviewedAt, completedAt, resultCodes, scopes, correctionFields } }`. Type-specific correction value schemas are enforced by `src/services/dataProtectionCorrectionService.js`; see the conflict and source limitation notes below rather than sending arbitrary patches.

### Endpoint

`GET /api/profiles/current/data-protection-requests/:id`

Returns `{ request: DataProtectionRequestSummary }` for the selected profile/requester only. `GET .../:id/history` accepts `before` and `limit` (1–100; default 25) and returns `{ events, nextCursor }`. `GET .../:id/execution` returns job progress and record outcomes. `GET .../:id/export/download` streams the requester's unexpired private export with `Cache-Control: private, no-store`, `nosniff`, and attachment disposition. `POST .../:id/withdraw` is a step-up mutation; body is version-bound by the service. `POST /api/admin/data-protection-requests/:id/decision` is staff step-up workflow; the staff list/read/history/execution endpoints are in [09](09-admin-console-and-policies.md).

Request states: `submitted → under_review → queued → processing → completed | partially_blocked | failed`; `waiting_for_policy`, `rejected`, and `withdrawn` are also represented. Staff actions are `claim`, `approve`, `retry`, `policy_hold`, and `reject`, constrained by state, assignment, current staff authority, version, retention approval, legal holds, and independent-review rules. Deletion execution requires both the approved retention policy and explicit destructive-execution enablement; otherwise the job records a policy hold rather than deleting.

`DataProtectionRequestSummary` is exactly the safe service projection: `id`, `profileId`, `requestType`, `state`, `version`, `submittedAt`, nullable `reviewedAt`, nullable `completedAt`, and `resultCodes`; detail mode also returns `scopes` and `correctionFields`. Execution results distinguish records completed, preserved, blocked, and still processing, with stable reason codes. Do not infer that `completed` means every requested record was deleted: use per-record outcomes and result codes.

`POST /api/profiles/current/data-protection-requests/:id/withdraw` body is exactly `{expectedVersion:integer>=0}` and returns `{request:DataProtectionRequestSummary}`. Withdrawal is denied once the request is terminal, queued, or processing; stale versions return `409 CONFLICT_DATA_PROTECTION_VERSION`. Correction requests accept the top-level `correctionFields`/`corrections` object shown above. The correction value is field-specific: `account_name`/`profile_name` are bounded on-platform strings; `account_phone` is E.164; `profile_details` is `{expectedVersion,values}` using only the active onboarding field contract; `verification_record` is `{caseId,expectedCaseVersion,expectedVersion,values}` and may alter only a field already present in that submitted case; `document_metadata` is `{documentId,expectedVersion,title}` (title only); `listing_record` is `{propertyId,expectedVersion,canonicalFieldMutations}` or `{propertyId,expectedVersion,changes}`. Listing changes cannot alter ownership, availability, reserve, sale evidence, or protected workflow fields. Direct execution is review/approval gated and rechecks current authorization/version; correction request submission is not itself a mutation of the source record.

## Notifications

All `/api/notifications` endpoints re-resolve the current actor/profile and require `notification.read`, or `notification.preferences` on preferences/devices. Responses are private and profile-scoped.

| Endpoint | Contract |
|---|---|
| `GET /api/notifications` | Query keys `page` (1–10000, default 1), `limit` (1–100, default 20), `category`, `read` (`true|false`). Returns `{ notifications, pagination: {page,limit,total,pages} }`. |
| `GET /api/notifications/unread-count` | Returns `{ unreadCount }`. |
| `PATCH /api/notifications/read-all` | Marks all visible unarchived notifications read; returns `{ modifiedCount, readAt }`. |
| `PATCH /api/notifications/:id/read` | Marks owned notification read; returns `{ notification }`. |
| `DELETE /api/notifications/:id` | Archives the owned notification; returns `{ notification }`. |
| `GET /api/notifications/preferences` | Returns `{ preferences: { profileId, categories, updatedAt }, mandatoryCategories }`. |
| `PATCH /api/notifications/preferences` | Partial category/channel booleans. Categories: `messages`, `savedSearches`, `listingChanges`, `inquiries`, `marketplace`; channels: `inApp`, `email`, `sms`, `whatsapp`, `push`. Mandatory categories `security`, `payments`, `legal` cannot be disabled. |
| `POST /api/notifications/devices` | Body exactly `{ "token": "..." }`; returns 201 `{ device }`. Profile is derived from current authorization, never caller-selected. |
| `DELETE /api/notifications/devices/:deviceId` | Revokes current-profile device; returns `{ device }`. |
| `GET /api/notifications/:id/deliveries` | Returns `{ deliveries }` for notification/profile recipient. |
| `GET /api/notifications/:id/deliveries/:deliveryId/history` | Cursor `before`; returns authorized delivery history. |

Notification DTO is allowlisted: `id`, `profileId`, `type`, `category`, safe `title`/`body`, safe `navigation`, `readAt`, and `createdAt`. External contact in title/body is replaced with generic copy. Navigation accepts only local single-slash routes and a constrained public reference. Do not expect private listing fields, evidence, contact details, or provider payloads in the notification DTO.

`POST /api/notifications/recent-properties/digest` is an operator action, not the saved-search alert API. It requires current Marketing & Growth department authority, excludes Internal Audit, accepts only `{daysBack: 1..30, limit: 1..20}` with defaults 7 and 5, and returns 202 or 207 with recipient/property/accepted/failed counts. It attempts dispatch; it does not prove recipient delivery.

Provider receipts are machine-to-machine: `POST /api/notifications/webhooks/postmark` and `/api/notifications/webhooks/termii`; raw JSON, TLS enforced in production. Do not call these from the browser.

## Socket.IO realtime

The server is initialized in the HTTP server entry and exposed at the Socket.IO default path `/socket.io`. Authentication accepts `handshake.auth.token` or `Authorization: Bearer …`; optional selected context is `handshake.auth.profileId`. Each incoming packet reloads current session/profile, and the connection is revalidated every 10 seconds; invalid/revoked contexts disconnect. Client must reconnect and reauthenticate after login, logout, or profile switch. Do not send `X-Profile-ID` as a substitute for handshake profile context.

Server-to-client events:

| Event | Payload |
|---|---|
| `realtime:ready` | `{ userId, connectedAt }` |
| `notification:new` | `{ notification }` using the safe notification DTO |
| `notification:read` | `{ notificationId, readAt }` |
| `notification:archived` | `{ notificationId }` |
| `notification:read-all` | read-all result; current implementation emits its result payload |
| `message:new` | `{ conversationId, message }` using safe conversation message serialization |
| `message:read` | read receipt DTO |
| `conversation:updated` | `{ conversationId, status, actorId }` |
| `presence:update` | `{ conversationId, userId, online }` |
| `typing:start`, `typing:stop` | `{ conversationId, userId }`, volatile |
| `moderation:updated` | `{ conversationId, messageId, action }` |

Client-to-server events use Socket.IO acknowledgements:

| Event | Input and acknowledgement |
|---|---|
| `conversation:join`, `conversation:leave` | `{ conversationId }`; `{ok:true, conversationId}` for join, `{ok:true}` for leave; requires current message-read access and conversation membership. |
| `message:send` | `{ conversationId, text, attachmentIds? }`; ack `{ok:true,message}`. Requires `message.reply`. |
| `message:read` | `{ conversationId, messageId }`; ack `{ok:true,receipt}`. |
| `conversation:update` | `{ conversationId, ...supported state changes }`; ack `{ok:true,conversation}`. Exact allowed update fields are enforced by messaging service. |
| `typing:start`, `typing:stop` | `{ conversationId }`; ack `{ok:true}`. Requires `message.reply`. |

Rejected acknowledgements are `{ ok:false, error }`, where `error` is the safe error object. Messaging requires registered/verified access and current profile permission. Conversation rooms are not authorization grants; every join and outbound emission checks current access. Payloads are not guaranteed delivered while disconnected; REST history is the recovery path. No generic listing-change socket event is defined by this source.

## Conversations, messages and attachments

The mounted HTTP family is `/api/messages`; every route requires Bearer auth and registered access, then the messaging service verifies current active profile permission and participation.

| Endpoint | Request/response |
|---|---|
| `POST /api/messages/conversations` | Body `{propertyId, inquiryId?}`; returns 200 `{conversation}`. Current buyer/profile/property and inquiry relationship rules apply. |
| `GET /api/messages/conversations` | Bounded inbox query; returns service `{conversations, pagination}`. See service query allowlist before adding UI filters. |
| `GET /api/messages/conversations/:id` | `{conversation}` safe projection. |
| `GET /api/messages/conversations/:id/messages` | History with service pagination/cursor and safe message projection. |
| `POST /api/messages/conversations/:id/messages` | Body `{text, attachmentIds?}`; attachment IDs must be authorized/clean/attachable for this conversation. Returns 201 `{message}`. Contact information is blocked by server policy. |
| `PATCH /api/messages/conversations/:id/read` | Body `{messageId}`; marks current participant read and returns read receipt DTO. |
| `PATCH /api/messages/conversations/:id` | Conversation state mutations are allowlisted by service; returns `{conversation}`. |
| `POST /api/messages/conversations/:id/attachments` | Multipart single field `file`, maximum 10 MiB. Quarantine accepts PDF/JPEG/PNG/WebP/DOC/DOCX only when the content signature agrees; contact-policy scan and malware scan still determine release. Returns 201 `{attachment:{assetId,mimeType,originalFileName,fileSizeBytes,expiresAt,scanStatus,attachable:false}}`. Upload is not attachable until inspection/release completes. |
| `GET /api/messages/conversations/:id/messages/:messageId/attachments/:attachmentIndex` | Streams only the authorized conversation/message attachment; supports requested byte range through the access service; `?download` selects safe download disposition. |
| `POST /api/messages/conversations/:id/reports` | Body `{reason, messageId?, details?}`; reason is `spam|harassment|fraud|inappropriate_content|other`; duplicate open report returns 409. |
| `GET /api/messages/moderation/reports` | Admin route plus current Trust & Safety department; query `limit`, `page`, `status=open|dismissed|actioned`, `reason`; returns reports and pagination. |
| `PATCH /api/messages/moderation/reports/:reportId` | Admin route plus Trust & Safety and independent reviewer; `action` is `dismiss|warn|hide_message|restore_message|block_conversation|close_conversation|reopen_conversation`; resolution reason is stored/audited. |

Legacy `POST /api/messages/start`, `POST /api/messages`, and `GET /api/messages/:id` remain mounted; prefer the `/conversations` family. Upload rate limit is 20 per 15 minutes; messaging mutation rate limit is 100 per 15 minutes. Attachment content remains non-downloadable and rejects byte-range requests; use the protected inline preview. DOC/DOCX may be accepted into quarantine but the current attachment preview renderer supports only PDF/JPEG/PNG; unsupported preview returns 503 and does not expose original bytes.

## Frontend lifecycle

Keep notifications and messages partitioned by active profile. Clear in-memory notification/message caches and disconnect sockets on logout, profile switch, session revocation, or account suspension. Re-fetch REST inbox/history after reconnect; events are hints, not a durable cursor. Never trust client-supplied user/profile IDs in mutation payloads where service derives identity from the session.



## Shared contract references

Contract cross-reference: request, per-record outcome, notification and error DTOs are in [15-api-dto-and-schema-reference.md](15-api-dto-and-schema-reference.md), response variations in [16-api-response-variation-matrix.md](16-api-response-variation-matrix.md), and privacy/realtime sequences in [17-end-to-end-frontend-workflows.md](17-end-to-end-frontend-workflows.md).
