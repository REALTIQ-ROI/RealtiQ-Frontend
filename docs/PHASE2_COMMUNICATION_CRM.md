# Phase 2 communication and CRM

Authenticated buyers, landlords and admins use:

- `/messages` and `/messages/:conversationId` for property/inquiry marketplace conversations.
- `/dashboard/personalisation` for favourites, canonical saved searches/alerts and recent history.
- `/dashboard/notifications` for the durable notification centre and preferences.
- `/dashboard/admin/message-moderation` for the role-protected report queue.

Proxy-inspection conversations and escrow refund chats remain in their existing workspaces. Guest inquiries remain public submissions and do not create an inbox.

## Configuration

- `VITE_API_BASE_URL` configures REST and retains the existing authenticated Axios behavior.
- `VITE_REALTIME_URL` optionally configures the Socket.IO origin. When omitted, an absolute API URL is reduced to its origin; development uses the Vite `/socket.io` websocket proxy.

The single `RealtimeProvider` connects with `auth.token`, websocket/polling transports and credentials. It removes listeners and user-scoped state on logout/token replacement. On `realtime:ready` it refetches inbox/notifications, refetches active history and rejoins the active room. Persisted IDs deduplicate acknowledgements, REST events and socket events. Socket acknowledgement timeout falls back once to REST while preserving the draft on failure.

Only the active authorized conversation room is joined. Typing expires after 2.5 seconds and stops on blur/unmount. Presence is conversation-scoped. Message history uses the backend cursor. Read markers only target the latest visible persisted message received from another participant.

## Attachments and moderation

Attachments are staged one at a time as multipart field `file`. Client affordances accept JPEG, PNG, WebP, PDF, DOC and DOCX up to 10 MB; the server remains authoritative. Messages send only returned `assetId` values, never arbitrary or signed URLs. Staged assets are rejected locally after their one-hour expiry. Delivery links are rendered from current safe message DTOs and are never stored as IDs.

Participant report reasons are `spam`, `harassment`, `fraud`, `inappropriate_content`, and `other`. Admin actions are restricted to the documented enum and require a reason plus confirmation. Participant threads render moderated DTOs as neutral placeholders and never receive queue records or private review notes.

## Notifications and compatibility

The notification centre allowlists known type families and navigation only to message, dashboard, or public-reference property routes. Editable preferences are messages, saved searches, listing changes, inquiries and marketplace. Security, payments and legal remain visibly mandatory. The existing admin recent-properties digest remains unchanged.

New screens use conversation REST contracts. Legacy message endpoints remain untouched only for older clients. Existing property save calls, specialist proxy chat and escrow/refund chat are deliberately not migrated into marketplace messaging.
