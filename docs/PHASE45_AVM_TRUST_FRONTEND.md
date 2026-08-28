# Phase 4–5 frontend foundation

## Routes

- `/dashboard/valuations/:propertyReference` — authenticated evaluation; history is shown only when the owner/admin endpoint authorizes it.
- `/dashboard/trust` — current-user safe trust explanation and appeal history/submission.
- `/dashboard/admin/trust-appeals` — admin-only queue, resolution, and recomputation.

## Integrated endpoints

- `POST /api/avm/v1/valuations` with a stable per-attempt `Idempotency-Key` retained after recoverable failure.
- `GET /api/avm/v1/valuations/:publicReference` and `GET /api/avm/v1/properties/:propertyReference/valuations`.
- `GET /api/trust/v1/me`, `POST/GET /api/trust/v1/appeals`.
- `GET/PATCH /api/trust/v1/admin/appeals` and `POST /api/trust/v1/admin/users/:userId/recompute`.
- Existing create/update property endpoints now round-trip optional `structuredFacts`; legacy `squareFeet` remains independent.

## Security and cache rules

AVM, trust, user appeals, and admin queues use separate in-memory stores keyed by authenticated user and role. All stores clear on login, logout, token expiry, or account/role change. A 403 valuation detail response removes that protected snapshot. User appeal UI never renders admin resolution/reviewer fields. Internal database IDs are used only for authorized admin mutations; navigation uses public references.

## Product limitations

The UI labels `approved_asking` evidence as asking prices and never calls the estimate a certified appraisal or completed-sale valuation. `insufficient_data` never renders an estimate or range. No public AVM route exists. CPI/inflation adjustment, verified-sale feeds, macroeconomic/environmental/infrastructure enrichment, AVM backtesting, anti-gaming signals, public valuations, title timestamps/blockchain confirmations, and live inspection video are not simulated because the backend has no corresponding capability.
