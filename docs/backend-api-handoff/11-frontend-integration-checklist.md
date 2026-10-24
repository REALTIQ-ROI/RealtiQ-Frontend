# Frontend first-batch implementation checklist

Use this as a build sequence, not as a claim that every external service is activated. Each item points to the source-traced endpoint guide and route index. Keep server-returned permissions, states and DTOs authoritative.

## Shared client and app shell

- [ ] Typed API client injects bearer token and active `X-Profile-ID`; see [01](01-auth-accounts-profiles.md).
- [ ] Client preserves `X-Request-ID`, normalizes `{message,code}` and `VALIDATION_FAILED` envelopes, and handles status classes in [10](10-api-errors-and-state-machines.md).
- [ ] Private responses are not stored in shared/browser caches across profile/session boundaries.
- [ ] Profile-switch/logout/suspension clears profile data, stops sockets, and reloads current context.
- [ ] UI checks returned role/permission state but handles server 401/403 as final authority.
- [ ] Request step-up before protected mutations and bind challenge to final method/path/profile/body/file digest.

## Authentication and profiles

- [ ] Implement register, verify email, login, second factor, password reset, session list/revoke, and logout using [01](01-auth-accounts-profiles.md).
- [ ] Load `/api/auth/account`, profile list, `/api/profiles/current`, and active profile before drawing protected navigation.
- [ ] Implement organization invitations, members, roles, seats, mandates, signatories, payout setup, and verification through current profile routes; show expired/revoked membership as denied.
- [ ] Build verification upload state with quarantine/review and evidence replacement; use [06](06-documents-media-verification.md).

## Buyer workflows

- [ ] Search using canonical `queryVersion=canonical-v1`; serialize supported URL filters and all 12 sorts from [04](04-search-maps-discovery.md).
- [ ] Keep catalogue/map/group/facet counts synchronized from the shared response; do not apply private search fields client-side.
- [ ] Implement favorites, following, saved-search CRUD, and alert preferences/status; [04](04-search-maps-discovery.md), [08](08-privacy-notifications-realtime.md).
- [ ] Property detail shows public title/listing-verification signals distinctly; declared title is not verified title.
- [ ] Inquiry/tour, messaging and attachments require profile-context/API authorization; see endpoint index and [07](07-payments-ownership-escrow.md).
- [ ] Cart eligibility then verified/step-up checkout; show provider-pending state and poll/refresh payment status; [07](07-payments-ownership-escrow.md).
- [ ] Ownership and protected title-document access follow the documented current-version grant/viewer flow; [06](06-documents-media-verification.md), [07](07-payments-ownership-escrow.md).

## Seller, landlord and developer workflows

- [ ] Create/edit/draft property, project, type and unit from the canonical dictionary [03](03-canonical-field-dictionary.md) and lifecycle [02](02-properties-projects-units.md).
- [ ] Preserve unset, `null`, `false`, `0`, POA, original currency and private reserve as distinct values.
- [ ] Display inherited value and source/provenance. Send explicit overrides and reset-to-inherited mutations only as supported by the endpoint contract.
- [ ] Show readiness blockers, title/ownership/verification holds, duplicate review, sold/relisting rules, and freshness state from server DTOs.
- [ ] Publish via server action after readiness; don’t infer public state from a successful draft save.
- [ ] Associate public media and protected documents only through their separate upload and association routes.
- [ ] Configure site-plan markers only when coordinate policy, approved master plan and stable unit identity are available.

## Property/project management

- [ ] Build paginated owner listings, project management and selected-unit lists using private management DTO routes.
- [ ] Use `expectedVersion` for edits, publication, availability, price, profile and document mutations.
- [ ] Render price history from asking-price event endpoints and never expose reserve/private price fields outside owner authorization.
- [ ] Implement duplicate candidates/link proposals and reviewed transfer-proof flow without auto-merging records.
- [ ] Preserve sold/history-protected units; relisting uses the source-defined buyer-of-record or reviewed proof workflow.

## Search and maps

- [ ] Implement filter atoms F01–F66 and sort table exactly as [04](04-search-maps-discovery.md); do not invent unimplemented UI enum values.
- [ ] Serialize location identifiers, parent constraints, map bounds and nearby radius only when required settings/data are available.
- [ ] Handle 503 unavailable signals without removing selected criteria or returning broadened results.
- [ ] Show Recommended fallback notice when approved authoritative ranking inputs are unavailable.
- [ ] Keep sponsored, platform verification, title verification, freshness, advertiser provenance, and Featured editorial display separate.
- [ ] Map viewport/clustering and list results use the same query and effective unit criteria.

## Imports, grid and bulk

- [ ] Download template/schema before mapping; upload CSV/XLSX with browser multipart boundary; [05](05-imports-grids-bulk-operations.md).
- [ ] Render row errors/readiness from server preview, allow row correction, and require explicit type creation confirmation.
- [ ] Poll import/grid job status, surface partial results, support retry/cancel, and preserve committed rows.
- [ ] Apply version-aware undo only when server confirms eligibility; do not treat publish/sold transitions as reversible generic edits.
- [ ] Invalidate project/grid/search/public caches after committed canonical changes.

## Documents and privacy

- [ ] Distinguish public media from private evidence/document assets; use protected viewer session, not provider URL.
- [ ] Integrate upload progress/quarantine/review, current version, grant expiry/revocation and access receipt state.
- [ ] Implement access/correction/deletion requests, histories, per-record outcomes and private export download; [08](08-privacy-notifications-realtime.md).
- [ ] Explain retained/held records as partial completion; do not promise deletion of legal/financial/title evidence.

## Payments and financial workflows

- [ ] Buyer cart/checkout, payment history, installments and escrow are implemented as stateful backend workflows; see [07](07-payments-ownership-escrow.md).
- [ ] Require server confirmation before showing settled/purchased/ownership state.
- [ ] Payout setup and signatory state must be reloaded before a payout workflow.
- [ ] Display provider unavailable/reconciliation status and retry only using backend idempotency instructions.

## Notifications and realtime

- [ ] Implement current-profile notification list/preferences/devices/read/archive with mandatory categories preserved.
- [ ] Socket connection uses current bearer + selected profile; reauthenticate after profile/session changes.
- [ ] Treat realtime messages as hints and refresh REST history after reconnect.
- [ ] Do not place private KYC, reserve, raw attachment URLs or provider secrets in frontend telemetry.

## Staff/admin

- [ ] Implement only approved staff departments/screens; read-only/audit separation remains enforced [09](09-admin-console-and-policies.md).
- [ ] Build verification, duplicate, listing accuracy, legal hold, data-rights, delivery, policy and gazetteer queues from the actual mounted routes.
- [ ] Require step-up for route-marked mutations and show independent-review constraints.
- [ ] Keep raw evidence private; retrieve only through authorized content endpoints.
- [ ] Do not use “Featured” as a Sponsored placement entitlement.

## Responsive and accessible states

- [ ] Every 202/partial response has a visible pending/progress state and retry-safe exit.
- [ ] Every 409 explains that server state changed and offers reload/compare.
- [ ] Every 503 preserves input and explains the specific unavailable capability.
- [ ] File controls display configured limits from schema/contract and supported MIME rules; never imply unsupported formats.
- [ ] Keyboard/screen-reader flow identifies blockers, field errors, job progress and permission denial.



## Shared contract references

Contract cross-reference: use [15-api-dto-and-schema-reference.md](15-api-dto-and-schema-reference.md) for current DTO shapes, [16-api-response-variation-matrix.md](16-api-response-variation-matrix.md) for variations, and [17-end-to-end-frontend-workflows.md](17-end-to-end-frontend-workflows.md) for ordered API sequences.
