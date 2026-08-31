# Evidence-backed ROI v1 frontend

The authenticated ROI v1 flow is deliberately separate from the legacy calculator and saved-scenario contracts.

- Create: `/dashboard/roi-v1/properties/:propertyReference/new`
- Detail: `/dashboard/roi-v1/estimates/:estimateReference`
- Owner/admin history: `/dashboard/roi-v1/properties/:propertyReference/history`
- API: `POST /roi/v1/estimates`, `GET /roi/v1/estimates/:reference`, and `GET /roi/v1/properties/:propertyReference/estimates`

The create form locks the public property reference, validates all contract bounds, converts local optional evidence time to ISO at submission, and omits blank overrides. A cryptographically random idempotency key is bound to the serialized request. It is retained for a retry while inputs remain unchanged and discarded after success, conflict, or any input edit.

ROI v1 cache entries are in-memory and scoped by authenticated user plus public reference and history filters. Session/user/role changes clear the cache. A successful creation caches only its returned public estimate reference and invalidates only that user's matching property history.

The result UI never computes ROI. It renders response currency and server-returned metrics/scenarios, hides absent appreciation metrics, suppresses all KPIs and scenarios for `insufficient_data`, and always presents returned warnings and limitations. Evidence and user assumptions have separate provenance tables. Public UI and routes use `RTQ-PROP-*` and `RTQ-ROI-*` references only.

The pre-existing `/tools/roi-calculator`, property ROI calculator, saved scenarios, and admin assumption screens retain their legacy service functions and contracts.
