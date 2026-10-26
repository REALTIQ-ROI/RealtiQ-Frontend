# Imports, grids, bulk operations and undo

All imports and grid actions operate in the active project/profile and use canonical validators, readiness and current authorization. Imported units remain unpublished; readiness is explanatory and publication requires a separate authorized transition.

## Import workflow

Mounted under `/api/projects/:projectId/property-imports`:

| Step | Endpoint | Contract |
|---|---|---|
| Discover schema | `GET /:projectId/property-imports/schema` | Returns source-derived field map and conditional requiredness using project/type context; do not hardcode required top-level columns. |
| Download template | `GET /template` or `GET /template.xlsx` | Text/csv or XLSX template response according to requested route; authenticated current project editor. |
| Upload/stage | `POST /` multipart `file` | CSV/XLSX staged into an import session; success `201` with import session/preview summary. Size, row/column limits are centrally configured. Does not publish. |
| List/read | `GET /` and `GET /:importId` | Current project-scoped import list or detail; row/page parameters are validated by the service. Includes row results/readiness, not private storage credentials. |
| Map columns | `PATCH /:importId/mapping` | Exact body `{mappings:[{columnNumber,field}]}`. `columnNumber` is a positive integer identifying an uploaded source column; `field` is an eligible canonical import field or `null` to explicitly ignore that column. Each mapping object accepts only these two keys; the same column cannot appear twice, two columns cannot target the same field, and an unknown/non-importable field is rejected. Response is the refreshed import-session DTO with mapped columns, row validation and readiness. |
| Edit row | `PATCH /:importId/rows/:rowNumber` | Correct staged row fields; revalidates canonical type/conditional values. Response includes row status/errors/readiness. |
| Confirm an existing unit update | `POST /:importId/rows/:rowNumber/confirm-update` | Step-up and current project/unit version/owner permission required; confirms the explicit target rather than fuzzy overwrite. |
| Confirm new unit type | `POST /:importId/rows/:rowNumber/confirm-new-type` | Step-up; developer explicitly confirms type creation. Worker never creates a type implicitly and revalidates staged rows after confirmation. |
| Remove/restore row | `DELETE /:importId/rows/:rowNumber`, `POST /:importId/rows/:rowNumber/restore` | Row remains auditable; restore revalidates. |
| Submit import | `POST /:importId/confirm` | Step-up, durable async worker; returns `202` import job/session state. Rows are processed in bounded batches with permission/version/idempotency fences. |
| Retry failed rows | `POST /:importId/retry-failed` | Step-up; retries only eligible failures under current authorization and canonical validation. |
| Cancel | `PATCH /:importId/cancel` | Cooperative cancellation. Already committed rows remain and are reported; cancellation does not reverse committed rows. |
| Admin list/read | `GET /api/admin/property-imports`, `GET /api/admin/property-imports/:id` | Current Admin plus department/resource permission. Operational; do not expose to listing users. |

All write calls require Bearer auth and `X-Profile-ID`; exact role, resource and project permission are checked inside the service. Multipart header `Content-Type` must include the browser-generated boundary. Do not manually set a bare `multipart/form-data` content type. The exact accepted file types and row/column/byte limits are configured in `src/config/firstBatchPolicies.js` and `.env.example` (`PROPERTY_BULK_IMPORT_*`, `PROPERTY_IMPORT_*`).

Import preview returns actionable validation errors and `publicationReadiness:{state,ready,blockers:[{field,code}]}` from effective values. A row can be draft-valid while not publication-ready. `projectPin`, `sitePlanPosition` and other policy-gated inputs stay unavailable if authoritative config is absent. Content/media bytes are uploaded through their own approved media/document routes; a CSV path is not a file upload authority.

Import states include staged/correction/ready/queued/processing/partial/completed/failed/cancelled as represented by current import DTO; use returned state rather than inventing client states. The row worker persists progress, current validation errors and row-level outcomes, retries safely and resumes after lease expiry. Current actor/session/profile/seat/mandate and target versions are rechecked at processing. Same idempotency key/payload returns the same operation; conflicting replay returns a conflict.

## Unit grid

`GET /api/projects/:projectId/unit-grid` is the editor grid read. It returns bounded pagination, supported sort/filter values, each row's server-effective canonical values, source/provenance (`unit`, `unitType`, `project`) and version. A missing override is not serialized as a fabricated zero; use provenance to show inherited value. Grid editing endpoints use canonical validation and per-row version conflict checks.

`POST /api/projects/:projectId/unit-grid/bulk` accepts the existing bounded bulk operation schema and applies directly only within configured row/mutation limits. For larger batches, use the durable job endpoint. Do not send unauthorized workflow-owned fields as ordinary values. Supported actions are the source-backed canonical edits, availability/price changes, type moves, publication/unpublication and confirmation only when the existing service/action contract allows them; archive/undo/release constraints are enforced server-side.

### Durable bulk job contract

- `POST /api/projects/:projectId/unit-grid/jobs` → `202 {job}`. Use the operation key and expected project/row versions required by the request schema.
- `GET /api/projects/:projectId/unit-grid/jobs/:jobId` → `{job}` with safe progress, current status and per-row outcomes. Each eligible row may include server-authored `undoAvailable` and `undoExpiresAt`; `undoExpiresAt` is computed from the configured undo window and operation creation time. When the window is configured but the operation timestamp is absent, undo is unavailable and no expiry is fabricated. When no time cutoff is configured, the row may remain undoable based on current version/eligibility checks and no expiry is returned. No raw input secrets or private prices are returned.
- `POST /api/projects/:projectId/unit-grid/jobs/:jobId/cancel` → `{job}`. Cancellation is cooperative; already committed rows remain.
- `POST /api/projects/:projectId/unit-grid/operations/:operationId/undo` → prior operation/row result after current authorization, exact after-version and sold-history checks.

Jobs are durable and leased; row processing is bounded, retryable and resumes from persisted row status. Each row rechecks current permission and version during execution. A member, seat, mandate or session revoked after enqueue cannot authorize the remaining rows. Partial success is a normal result; inspect row errors and do not report the whole job as failed when some rows committed. Undo is conflict-safe and never republishes a unit automatically. Publication, freshness confirmation and non-reversible states do not receive generic undo.

## Version/conflict and errors

Use returned project/unit versions (or ETags only if explicitly returned) as `expectedVersion`/row version. Stable error families include `CONFLICT_PROJECT_VERSION`, `CONFLICT_LISTING_VERSION`, `CONFLICT_GRID_JOB_KEY`, `CONFLICT_GRID_JOB_LEASE`, `CONFLICT_UNIT_SALE_HISTORY`, `CONFLICT_PROJECT_UNIT_IDENTIFIER`, `PERMISSION_*`, `AUTH_*`, `CONTENT_*`, `INPUT_PROPERTY_IMPORT_*`, `EXPORT_RESULT_LIMIT`, `FEATURE_*`. Preserve the staged payload on 409 and reload before reconfirming. See [error guide](10-api-errors-and-state-machines.md).


## Shared contract references

Contract cross-reference: import and grid response/job shapes are in [15-api-dto-and-schema-reference.md](15-api-dto-and-schema-reference.md), variations in [16-api-response-variation-matrix.md](16-api-response-variation-matrix.md), and staged import/retry/undo sequences in [17-end-to-end-frontend-workflows.md](17-end-to-end-frontend-workflows.md).
