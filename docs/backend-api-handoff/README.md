# RealtiQ first-batch frontend integration guide

This folder is the source-traced frontend handoff for the current backend tree. The current source-level review verdict is **PASS WITH WARNINGS for reviewed contract families; NOT COMPLETE as an exhaustive endpoint-by-endpoint production-grade frontend specification**. It covers first-batch public discovery, buyer and seller workflows, profiles, organizations, canonical listings, imports/grid work, protected files, payments, privacy, notifications and staff review. It does not claim production provider activation or runtime acceptance.

## Backend/API overview

The app is an Express API mounted under `/api` in `src/app.js`. No production API hostname is fixed by this repository; configure the frontend's API origin per environment and append the mounted path (for example `<configured-api-origin>/api/auth/login`). JSON requests use `Content-Type: application/json`; multipart endpoints specify their file part below. Authenticated routes use `Authorization: Bearer <access-token>`. A request operating in a workspace/profile must send the current `X-Profile-ID` returned by the account/profile API. The header selects context; it is not proof of membership or permission. The server reloads current account, session, profile and resource authority.

`X-Request-ID` is returned for correlation. CORS exposes `X-Total-Count`, `X-Page`, `X-Page-Limit`, and `X-Request-ID`. Private responses are `Cache-Control: private, no-store` and vary by authorization/profile where the route family applies. Step-up protected mutations require `X-Step-Up-Challenge` from the auth challenge flow; the challenge is single-use and scoped to method, path, active profile and request body/file digest.

## Authentication and profiles

The product has one identity and separately selected individual, company, cooperative or staff profiles. The current account endpoint returns the authenticated identity/session context and available authorized profiles. Call `/api/profiles/current` with `X-Profile-ID` to load the selected workspace. A profile switch is a client context change followed by a fresh request; it does not change the identity token. Never cache permissions across profile switches. UI role labels are hints; gate actions using the current profile permission DTO and still handle `403` from the server.

Actors in the mounted routes include anonymous visitors, registered/current-profile members, verified users, listing owners/editors, organization administrators/signatories, buyers, and staff with current department permissions. A generic `admin` role alone does not bypass current department, assignment, separation-of-duties, resource, step-up or evidence requirements.

## Integration order

1. Auth/session and active profile state (`01`).
2. Profile onboarding, verification and organization roster/permissions (`01`, `06`, `09`).
3. Canonical listing forms and public/private DTOs (`02`, `03`).
4. Search URL state, map, facets and saved searches (`04`).
5. Imports and unit grid (`05`).
6. Protected documents (`06`), then cart/payments (`07`).
7. Privacy, notifications and realtime lifecycle (`08`).
8. Staff/admin screens only for the departments exposed by the relevant route (`09`).
9. Shared errors and state transitions (`10`), configuration-gated UX (`12`), implementation checklist (`11`).

## Navigation

- [Auth, accounts and profiles](01-auth-accounts-profiles.md)
- [Properties, projects and units](02-properties-projects-units.md)
- [Canonical field dictionary: all 156 fields](03-canonical-field-dictionary.md)
- [Search, maps and discovery: 66 controls and 12 sorts](04-search-maps-discovery.md)
- [Imports, grids, bulk operations and undo](05-imports-grids-bulk-operations.md)
- [Documents, media and verification](06-documents-media-verification.md)
- [Payments, ownership and escrow](07-payments-ownership-escrow.md)
- [Privacy, notifications and realtime](08-privacy-notifications-realtime.md)
- [Admin Console and policies](09-admin-console-and-policies.md)
- [Errors and state machines](10-api-errors-and-state-machines.md)
- [Frontend integration checklist](11-frontend-integration-checklist.md)
- [Configuration gates and open decisions](12-configuration-gates-and-open-decisions.md)
- [Backend acceptance and contract review](13-backend-acceptance-and-contract-review.md)
- [Mounted endpoint index](14-mounted-endpoint-index.md)
- [API DTO and schema reference](15-api-dto-and-schema-reference.md)
- [API response-variation matrix](16-api-response-variation-matrix.md)
- [End-to-end frontend workflows](17-end-to-end-frontend-workflows.md)

## Acceptance and contract coverage

The endpoint index lists 594 mounted registrations: 332 first-batch end-user, 79 first-batch staff, 66 compatibility aliases, 4 deprecated, 51 operational, 3 provider callbacks, 4 unclear staff/admin-scope and 55 other unclear-scope registrations. These are not unique operations. Static documentation counting found exact method/path mentions for 128/332 end-user and 61/79 staff routes outside the index; exact mentions do not equal complete endpoint contracts. Five request examples and one HTTP response example are present, but the 411 first-batch routes do not all have per-endpoint request, response, error and variation templates. See [13](13-backend-acceptance-and-contract-review.md) for the counts and remaining gap.

The tour contract is corrected to the mounted controller's actual output: GET returns a bare array plus paging headers, and PATCH returns a bare DTO. Cancellation is not required by the inspected first-batch RQS; live/paid viewing remains internally mismatched because the existing fixed ₦5,000 Paystack path is not the source-described seller-free/Console-controlled/partner-terms flow. The finance, private-file custody and proxy inspection contract families are documented in their feature guides and references.

## Contract precedence and acceptance

Use actual mounted route source and current controller/service behavior as the contract. The old `API_DOCS.md` and `docs/first-batch-frontend-api-handoff.md` contain historical sections; where they conflict with this handoff, follow the mounted route/controller and the current code referenced in `13-backend-acceptance-and-contract-review.md`. The field metadata is generated from `src/constants/sourceListingFields.js`; the RQS-03 controls and sort list are cross-referenced to the original specification PDF and canonical query service.

The focused source review confirms that the last two reported internal changes are present: approved profile-completeness criteria and eligible approved sponsored placements feed the shared query ranking; deletion execution has specific identity, evidence, terminal-case and support-document actions with retention/legal-hold/current-authority checks. This was static inspection only. No test, database, provider, or production runtime check was performed. Treat this handoff as implementation documentation, not production activation certification.

## Known limitations

- A 503 may represent a deliberately unavailable feature gate; keep the filter/form state and show the returned code/message rather than silently dropping the criterion.
- USD price comparisons, nearby-radius limits, commute routing, readable gazetteer resolution, trust tiers, freshness-dependent ranking, daily/weekly alerts, KYC rules, payments, private storage/scanning and some protected renderers require approved configuration/provider activation.
- RQS-02/RQS-03 state 16 construction milestones while the current named list contains 15. Do not add a client-side sixteenth value.
- Sponsorship and profile-completeness only affect ranking under the approved Console policies and current eligible source records. Client flags, payment history, Featured, or local client scores cannot create those signals.
- The source-defined search P95 target has not been certified by this source review.
- Viewing cancellation is not required by the inspected first-batch source and no client cancellation transition is mounted. Do not show a Cancel action. Live video booking/pricing remains an internal integration gap: the generic paid-tour route uses a fixed amount and Paystack, while the source requires seller-run live tours free at launch and partner service terms/fee splitting. See [07](07-payments-ownership-escrow.md) and [13](13-backend-acceptance-and-contract-review.md).
- The route index marks each registration with a source-informed category, but source code does not provide an authoritative first-batch tag. Routes marked `Unclear` must be scope-confirmed before they are implemented as frontend product endpoints. The 594 count is the total mounted registration count, not the frontend scope.
- The focused review resolved documentation for admin finance reconciliation, private-file custody/migration and proxy inspection. No claim is made that all 332 user-facing and 79 staff-facing registrations have mandatory per-endpoint full request/response/error/variation examples; the acceptance review measures exact route mentions and records the remaining documentation gap.

## Frontend architecture guidance (recommendations, not extra backend contract)

Use one typed API client that injects the current bearer token and active `X-Profile-ID`, and centralizes request IDs, error normalization and step-up header handling. Store canonical form values separately from derived effective values and provenance. Send only changed editable fields; preserve `false`, `0`, `null`, empty collections, POA and omission distinctly. Use server responses as the source of truth after mutations. For concurrent edits use the returned version/`expectedVersion`; on 409 reload the resource and present a conflict choice rather than overwriting. Keep URL query state canonical and serialize all active supported filters. Use cursor/`before` only on endpoints that return a `nextCursor`; catalogue pages are 1-based. Poll durable job status at a bounded interval, stop on terminal state, and surface per-row outcomes. Invalidate affected listing/search/profile caches after confirmed mutations, profile switches, publish/unpublish, archive, price change and verification change. Start and stop socket listeners with authenticated session/profile lifecycle, and clear profile-specific local state on revocation/logout.
