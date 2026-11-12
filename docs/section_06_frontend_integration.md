# Group 06 Frontend Integration

This note records the frontend flows integrated against the current Group 06 request contract. It does not claim that external providers or deployment dependencies are operational.

## Registered project surveys

The project management screen loads the project survey list and the seller request queue with pagination, then loads access status per returned document. Sellers with the active profile permissions `document.issue` and `project.edit` can upload one PDF, JPEG, PNG, or WebP file up to 50 MiB. The form binds the exact project version, JSON access policy, and SHA-256 of the file bytes to a fresh step-up challenge before sending matching multipart text fields and the file. The browser supplies the multipart boundary.

An accepted upload is shown as a stored/submitted survey version, not as title verification, publication, or buyer access. Replacements use the server-selected predecessor and show the returned replacement reference. The project and survey list are refreshed after upload.

Buyers can request access only when the server reports that they can. Sellers decide the returned request/version with step-up. Viewing rechecks access, document version, current-version status, content hash, and protected response headers. Bytes are fetched only through the authenticated title-document-viewer route. The local viewing copy is revoked when the modal closes, the profile changes, or the server session expires.

## Viewing assignments and live tours

Seller calendar assignment choices come only from the active profile's paginated `GET /api/profiles/current/viewing-assignees` result. The UI displays names and roles, never assignment identity IDs. Calendar saves send the chosen returned identity or `null`, together with the current calendar version. A revoked assignment conflict reloads both the team directory and calendar.

Live guided-tour booking is offered only while availability reports `ready`. The tour page displays server readiness and exposes joining only for an approved tour whose video-session response says `joinAvailable: true` and supplies the expected participant join route. The join URL is fetched only when the participant activates the join action. Ambiguous meeting creation remains in reconciliation and does not start a second meeting automatically.

## Paid title-document access

Payment initialization sends `{}` with a step-up challenge bound to the exact `POST /api/title-documents/:documentId/initialize-view-payment` request. The UI displays the returned amount, currency, reference, and secure redirect before the user continues to the provider. A return from the provider only causes the frontend to reload `GET /api/title-documents/:documentId/access-status`; it does not call the generic payment verifier for this flow and does not grant access. Opening the viewer requires current server status `hasAccess: true` and `purchaseState: active`.

The current backend has a provider-routing limitation: its title-view checkout requires Monnify routing configuration while initializing the dedicated checkout through Paystack. Provider configuration errors are presented as unavailable/support states. The UI has no provider selector and does not start another attempt while the current outcome is pending, unknown, or requires reconciliation.

## Managed document acknowledgment and issuance

The selected recipient's `myResponse` controls the acknowledgment action and status. An acknowledgment appears complete only after the server returns the updated document DTO. Version conflicts reload detail. Issuers see aggregate recipient response states without peer profile IDs or contact details; recipients see only their own response.

The document manager loads the selected profile's no-store issuance-readiness projection. It displays the returned authority, signatory, QR/origin, envelope, storage, size, and issuance states. Readiness only enables the UI action as a convenience; the issue endpoint still enforces authority, version, and step-up.

## Protected media readiness

The existing protected-media panel loads `/api/media/access-options` without caching and renders server-returned policy, collection, price, storage, envelope, renderer, and purchase readiness. A `configured_unverified` result means the backend can attempt the operation; it does not establish settlement or entitlement. Purchase controls remain gated by both item access state and the server's `usableToAttempt` projection.

The checked-in `docs/section_06_api_docs.md` defines `levels` as per-media `{mediaKind, allowedLevels}` entries, which the existing upload form needs to offer valid media types. The newer readiness example shows a flat list of access-level strings; that list alone cannot identify which media types accept each level. The frontend keeps the documented per-media mapping and fails closed with an unavailable message if the response contains no mapped media types. No fallback choices are invented.

## Contract synchronization note

The checked-in `docs/section_06_api_docs.md` predates several exact DTO details in the current frontend handoff, including viewing assignees, managed-document readiness and recipient response projections, protected-media readiness, and the title checkout return shape. The frontend follows the current request contract supplied for this integration. Keep the backend API handoff synchronized with those DTOs so future frontend changes can use one repository source of truth.
