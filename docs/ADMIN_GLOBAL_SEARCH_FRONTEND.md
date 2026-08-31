# Admin global search frontend

The admin shell's top-bar search uses `GET /api/admin/search` through the shared authenticated Axios client. It never downloads or searches domain collections locally.

The responsive palette normalizes request whitespace, waits 300 ms, requires 2–100 visible characters, aborts obsolete calls, preserves backend ordering, and supports all 13 contract filters. The top-bar limit is 20. Further pages append through **Load more results** and duplicate only repeated `type + route` entries while retaining the first server occurrence.

Search responses are cached in memory for 30 seconds by authenticated admin ID, normalized query, type, page, and limit. Session/user/role changes clear the cache and active requests. Nothing is persisted or sent to analytics.

Returned routes are treated as untrusted. Navigation is permitted only for same-application relative paths matching a route that currently exists in `AppRoutes.tsx`; query strings, fragments, absolute/protocol-relative URLs, backslashes, control characters, and unknown destinations are disabled. The frontend never constructs a route or displayed reference from other result fields.

The palette supports keyboard selection (arrows, Home/End, Enter, Escape), listbox semantics, result-count announcements, visible focus, mobile dialog presentation, server status/type labels, safe unknown-field fallbacks, initial/short/loading/empty/error/loading-more states, and deliberate retry for retryable failures.

Verified destination families currently include user, landlord, property, project, inquiry, payment, checkout, escrow, installment, title-verification list, proxy-inspector, proxy-inspection, and virtual-tour admin routes. Backend results targeting any other path are shown as unavailable rather than redirected to a guessed destination.
