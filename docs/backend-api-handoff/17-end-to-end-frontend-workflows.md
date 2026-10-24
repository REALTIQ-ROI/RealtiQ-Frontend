# End-to-end frontend workflow playbooks

These sequences use only mounted endpoints and source-supported transitions. They describe API orchestration, not a replacement for per-endpoint authorization. Each mutation is still reauthorized by the backend using current session/profile/resource state. See [14](14-mounted-endpoint-index.md) for mounted paths, [15](15-api-dto-and-schema-reference.md) for DTOs, and [16](16-api-response-variation-matrix.md) for state/error variations.

## 1. Register, sign in, initialize account

1. Call the registration route documented in [01](01-auth-accounts-profiles.md); submit only registration fields accepted there.
2. Verify the returned access token/session contract. Store tokens using the frontend’s approved secure session mechanism; do not put them in logs or analytics.
3. Call current-account initialization with bearer token.
4. Select an account-owned profile from the returned profile list and call `/api/profiles/current` with `X-Profile-ID`.
5. On 401/session revocation, clear identity and profile-scoped cache; on 403, refresh current profile/permissions rather than retrying a stale request.

No backend contract in this handoff guarantees a refresh-token endpoint unless listed in [01](01-auth-accounts-profiles.md); do not invent one.

## 2. Switch profile and organization workspace

1. Fetch the current account/profile list.
2. Select an existing authorized profile; set `X-Profile-ID` on subsequent profile-scoped requests.
3. Reload `/api/profiles/current` and permission/roster endpoints after switch.
4. Clear cached drafts, counts, notifications, socket rooms and UI permissions tied to the previous profile.
5. Do not infer member permissions from role names; use returned permissions and still honor server 403.

## 3. Individual verification and evidence

1. Load current profile.
2. Create a verification case using the current-profile verification endpoint from [01]/[06].
3. Upload evidence only using the returned allowed purpose and exact multipart field described in [06].
4. Poll/read the case until current status; the status is the backend authority.
5. If rejected, read case history and submit a replacement/resubmission only where the API exposes that transition. Expired/replaced evidence cannot satisfy eligibility just because a prior case was approved.

## 4. Organization onboarding, seats and signatories

1. Create/select company or cooperative profile using [01].
2. Submit organization verification case and evidence; staff review is separate.
3. As authorized organization administrator, invite/add members, assign active seat/role, and load roster/seat state.
4. For signatory-sensitive mutations, complete the step-up challenge and call the specific signatory/mandate endpoint.
5. Refresh roster and permission snapshots after invite acceptance, seat expiry/removal, mandate change, signatory change or profile switch.
6. Staff verification or policy decisions must use the department-authorized admin route; never optimistically mark the organization verified.

Exact route payload variants are endpoint-specific in [01](01-auth-accounts-profiles.md); unsupported seat plans return the documented unavailable/unconfigured response.

## 5. Seller creates and publishes a standalone property

1. Select an owner/agency seller profile and load current permissions/verification eligibility.
2. Read `GET /api/properties/field-dictionary`.
3. Create or save a draft using canonical property routes in [02](02-properties-projects-units.md), preserving `false`, zero, null, omission and POA separately.
4. Upload public media through the media route; upload title/verification documents through protected document routes in [06]. Never use private storage URLs in listing fields.
5. Read readiness; resolve each returned blocker by updating its field or completing the required independent workflow.
6. Publish only after current authorization, verification, ownership, duplicate and readiness gates pass.
7. Refresh public detail/search projections after success. On version conflict, reload and reconcile rather than retrying stale body.

## 6. Developer creates project, types and units

1. Create project draft.
2. Create each unit type using the project-scoped type API; do not ask import workers to invent types.
3. Create units under the type/project and retain returned unit IDs/versions.
4. Display effective values with provenance: project defaults, type overrides and unit overrides are separate from explicit reset.
5. Reset only through the documented inheritance reset operation; omitted update fields mean no mutation.
6. Use publication readiness before publish-all-ready or selected-unit publication.
7. Invalidate project, unit grid, public listing, map, group, facet and saved-search result caches after server-confirmed writes.

## 7. Edit price and availability

1. Load current listing/unit with version.
2. Submit price/availability mutation through source-supported route, including `expectedVersion` where required.
3. Preserve currency and POA state; do not put reserve price in public response/UI state.
4. On success, use server response and refresh price-history/search projections.
5. On sold/ownership conflict or stale version, do not force-unpublish/relist from the client; use ownership/transfer-proof workflow.

## 8. CSV/XLSX import

1. Create import session/upload file using the exact multipart contract in [05].
2. Fetch parse/mapping/preview state.
3. Map only eligible canonical fields; preserve ambiguous or unsupported fields as row errors, not guessed values.
4. Correct rows using row correction route and repeat validation.
5. If row requires a new unit type, call the explicit developer-confirmed `confirm-new-type` route and then revalidate staged rows.
6. Submit the import job; poll the import session/job endpoint until terminal state.
7. Show succeeded/failed/held counts and per-row codes; retry only failed/retryable rows as the API permits.
8. Never mark imported rows published unless the independent publication API completes.

## 9. Unit grid, bulk mutation and undo

1. Load grid page with supported filter/sort/pagination.
2. Record row/project versions.
3. Submit bounded bulk action/job with idempotency/operation key when the endpoint accepts one.
4. Poll the persisted job status; display partial success and conflict rows separately.
5. Invoke undo only while the operation remains eligible and only with the operation/version token returned by the backend.
6. A subsequent independent edit must produce a conflict; do not overwrite it with cached pre-operation values.

## 10. Search, map, saved search and alerts

1. Build URL state only from the wire parameters listed in [04].
2. Call catalogue, map, facets or project-group endpoint with the same canonical filter set; never maintain separate client filtering semantics.
3. Preserve same-unit AND and strict amenity AND semantics.
4. On unavailable FX, nearby, commute, gazetteer, freshness, ranking or alert cadence policy, keep the filter visible and show the backend code; do not silently remove it.
5. Create/update saved search using canonical supported filters and sort; reload it and serialize the returned query for URL round-trip.
6. Subscribe to supported instant/digest cadence only when API/policy says available; matching notifications can be delayed/deferred. De-duplicate by server event IDs and refresh listing state before display.

## 11. Request a viewing

1. Buyer selects an eligible published property and submits `POST /api/tour` with accepted type, schedule and optional safe notes.
2. Handle `409 CONFLICT_VIEWING_SCHEDULED` by selecting another slot/time; there is no slot-calendar endpoint in the current route set.
3. For normal request, display `{tour}`; owner receives one-way notification.
4. For `virtual_paid`, current implementation returns cart or Paystack-initiation branches and uses a fixed server-side amount. The source requires seller-run live video to be free at launch and partner pricing to follow partner terms; therefore do not wire this paid branch as a correct first-batch purchase workflow until backend contract is corrected.
5. No viewing cancellation operation is mounted and first-batch source does not require one; do not expose Cancel.

## 12. Protected document access

1. Request/list document metadata using active profile.
2. Create access request or initiate paid access only for a version-bound document.
3. Wait for grant/payment and current scan state.
4. Open the viewer session; render only through the authorized viewer content route.
5. End the viewer when leaving. A profile switch, expiry, revocation, scan change or document replacement invalidates old grant/session.
6. On unsupported format or missing renderer configuration, show unavailable state; never fall back to storage URL.

## 13. Cart, checkout, payment and ownership

1. Add an eligible current listing/service item to cart.
2. Call cart eligibility and display server totals/currency.
3. Initialize checkout with required step-up/idempotency inputs.
4. Redirect to provider only when backend returns the authorization URL.
5. On redirect return, call backend verification/status endpoint; never trust querystring success.
6. Poll/reload pending allocation/checkout status; only server-confirmed fulfillment updates ownership/entitlement.

## 14. Privacy data-access/correction/deletion

1. Submit the profile-scoped request with supported type/scopes and operation key.
2. Poll request status and any secure export link only via authenticated endpoint.
3. Correction requests proceed through review/approval before source record updates.
4. Deletion is classified per record; legal holds, retention and preserved evidence can produce partial completion. Show retained/blocked outcomes explicitly; never promise complete erasure.

## 15. Notifications and sockets

1. Authenticate socket using current bearer and selected profile as specified in [08].
2. Subscribe only to server-authorized rooms/events.
3. Treat socket events as invalidation hints; load REST detail for canonical status.
4. Reconnect/re-authenticate after token refresh or profile change; clear prior room listeners.
5. For delivery failures, use notification preference/delivery status endpoints, not client retry loops.

## 16. Staff verification, moderation and policy

1. Load only department-authorized queue.
2. Read evidence through protected content endpoint and current access scope.
3. Claim/prepare review where route requires it.
4. Obtain step-up for protected decision and use separate actor for two-person approval when required.
5. Refresh queue/history after decision; do not infer publication/trust from a draft policy or evidence upload.

## 17. Finance reconciliation

1. Load `/api/admin/wallet` and `/wallet/transactions` with supported filters.
2. For an escrow dispute, load the list then detail; show `availableActions` returned by the server.
3. Submit `action` + `reason` to the resolve endpoint only when server action is enabled and actor has required finance authority/step-up.
4. If response is 202 or `pending:true`, retain pending state and refresh reconciliation/status. Never show a refund/release as complete from a provider redirect.
5. The exact contract for each rare reconciliation branch is in [09] and [15]; do not add unexposed settlement actions.

## 18. Private-file custody/reconciliation operations

1. Staff discovers source and receives dry-run `inventoryVersion`/`sourceVersion`.
2. Prepare using exact version token and step-up; this creates a held/proposed operation, not a public file.
3. Independent department reviewer reads, verifies source/policy and decides using case reference/evidence.
4. Approved movement requires distinct technical/compliance actors, complete origin revocation proof and fresh provider policy.
5. Poll status/history; recover only with current expected version and no active lease. Never restore the original public URL.

## 19. Proxy-inspection request through completion

1. Buyer selects an eligible published property and approved searchable inspector.
2. Create request with requested service set; active duplicates return 409.
3. Buyer and inspector negotiate a positive whole-NGN amount; each independently confirms the same proposed price.
4. Buyer initializes provider payment after verified/step-up checks; wait for backend funding status.
5. Participants schedule only funded work; inspector starts, uploads required evidence, saves structured report and submits completion.
6. Buyer confirms or raises dispute; confirmation moves release to pending, not paid. Admin/provider confirms payout/refund.
7. Buyer may review only completed inspection, once.

The proxy workflow is implemented as an adjacent partner service; build only if that service is part of the approved frontend release. This does not imply general Partner Portal features are first-batch.

