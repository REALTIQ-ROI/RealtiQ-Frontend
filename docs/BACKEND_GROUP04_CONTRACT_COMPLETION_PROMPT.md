# REALTIQ BACKEND — CLOSE GROUP 04 FRONTEND CONTRACT GAPS

Use this prompt in the RealtiQ backend repository. First inspect the currently mounted backend routes, controllers, services, DTO serializers, policy validators, tests, and the backend's canonical Group 04 documentation. Implement only the genuine backend contract gaps below. Preserve current authorization, active-profile scoping, step-up, idempotency, separation-of-duties, and financial safety rules.

Do not change frontend code in this task. Create a section04_update_backend_handoff.md canonical backend handoff with the exact final routes, request/response DTOs, status enums, errors, and recovery instructions. Do not expose provider credentials, raw webhook payloads, full beneficiary account details, or unrelated private data. Add backend tests for each changed contract. Do not make live payment, refund, payout, or provider requests.

## 1. Expose renewal method availability to the active profile

The approved `profile_billing_catalogue` policy is the sole source for allowed renewal methods (`saved_card`, `transfer_invoice`, and `direct_debit`). Its current policy schema includes `renewalMethods`, but the documented seller-facing responses for:

- `GET /api/profiles/current/publication-plans`
- `GET /api/profiles/current/seat-plans`

do not expose that list. The frontend therefore cannot filter the renewal-method selector before submitting a preference.

Add an additive, safe availability projection to both catalogue responses. It must be derived from the current approved policy and must state clearly when methods are unavailable because the policy is unconfigured, the policy has no approved methods, or a method's provider/runtime prerequisites are unavailable. Return only methods the active profile can currently choose; do not disclose secrets or infer availability from client state. Keep the renewal-preference write endpoints authoritative and retain their existing validation and errors.

Document the exact response fields, allowed method enum, availability states, and whether `manual` is always available or is represented separately. Do not silently treat every enum value as enabled.

## 2. Add an authoritative eligible-placement lookup for campaign creation

The existing seller routes include:

- `GET /api/profiles/current/promotion-campaigns`
- `POST /api/profiles/current/promotion-campaigns`
- campaign detail, ledger, top-up, and end routes

Campaign creation requires a `placementId`, but there is no seller-facing lookup that tells the current advertiser which placements are eligible for a selected property. The placement policy (`sponsored_placements`) is administrative configuration and is not an appropriate seller discovery API.

First confirm that no equivalent seller-scoped endpoint is already mounted. If none exists, add a profile-scoped read endpoint, preferably:

`GET /api/profiles/current/promotion-campaigns/eligible-placements?propertyId=<property-id>`

The lookup must:

- Require the current authenticated advertiser profile and enforce the same `listing.boost` and resource eligibility rules as campaign creation.
- Return only placements currently eligible for that profile/property under the approved placement and campaign policies.
- Return the exact `placementId` required by campaign creation and a safe, human-readable label. Include the property identity needed to confirm which listing the choice applies to.
- Expose only policy-derived campaign inputs needed by the form, including allowed currencies and the current minimum bid for each currency, when available. Also document the exact validation for `initialBudgetMinor`.
- Distinguish an empty eligible list from missing policy, ineligible property/profile, and provider-unavailable states with documented safe codes/messages.
- Be private/no-store and never treat client-supplied placement status, minimums, or eligibility as authoritative.

Document the exact response envelope and field types. Keep `POST /api/profiles/current/promotion-campaigns` authoritative, idempotent, and step-up protected. Do not add guessed placement IDs, prices, budget minimums, or campaign entitlements.

## 3. Define the provider settlement-event list DTO

The mounted routes are:

- `GET /api/admin/revenue/provider-settlements?from=<ISO>&to=<ISO>&after=<event-id>&limit=50`
- `POST /api/admin/revenue/provider-settlements/:id/reconcile`

The handoff says the GET lists private Monnify settlement webhook records, but does not define the list envelope or row DTO. The reconcile operation's aggregate response is documented, but a client cannot safely identify or present list rows without the GET contract.

Inspect the actual stored settlement-event model and serializer. Publish and, if needed, implement a minimal allowlisted list DTO that provides the event ID required by the reconcile route, safe settlement reference, receipt/reconciliation timestamps, current state, and any safe summary needed to distinguish pending, reconciled, and terminal/error cases. Define the full state enum, pagination envelope/cursor rules, date filters, and response cache policy. Do not return raw webhook bodies, signatures, credentials, or unmasked account data.

Document the exact reconcile response and all terminal/intermediate states. Preserve Finance-only authorization, selected staff profile, bound step-up, bounded provider paging, original-reference reconciliation, and the rule that merchant settlement verification does not prove beneficiary split settlement.

## 4. Publish complete safe DTOs for existing refund and proxy-settlement routes

The Group 04 handoff names these existing Finance routes:

- Escrow refund: `GET /api/admin/escrows/:id/refund-execution`, `POST .../refund-execution/reconcile`, and `POST .../refund-execution/beneficiaries/:beneficiaryId/authorize-transfer`.
- Proxy inspection settlement: `GET /api/admin/proxy-inspections/:id/settlement`, `POST .../settlement/reconcile`, and `POST .../settlement/beneficiaries/:beneficiaryId/authorize-transfer`.
- Proxy inspection refund: `GET /api/admin/proxy-inspections/:id/refund-execution`, `POST .../refund-execution/reconcile`, and `POST .../refund-execution/authorize-transfer`.

The handoff currently says these DTOs contain masked destinations and per-beneficiary states, but does not define the complete fields, state enums, response envelopes, or the exact proxy refund authorization request. Inspect the actual serializers and handlers. For each GET and mutation, document the exact safe response shape, HTTP status behavior (including pending/accepted responses), error codes, and terminal/intermediate state machine. Include only the identifiers and safe fields required for a Finance operator to understand the execution and select an eligible action. Define precisely how the proxy refund authorization identifies its beneficiary and its exact request body.

If an existing route does not currently return enough safe information for the described workflow, make an additive response correction. Keep full destination details server-side; expose masked destination data only. Include the authoritative current state/version and action eligibility information where needed for a usable screen, but continue to enforce every decision on the server.

Preserve Finance authority, current staff-profile context, separation-of-duties, bound one-use step-up, current-version checks, same-reference reconciliation, and no-blind-retry behavior. A request being accepted or reconciliation being started must not be represented as a completed transfer or refund.

## 5. Cross-contract verification and documentation

After implementation, verify consistency among the actual mounted route registrations, controller/service behavior, serializers, validators, tests, and Group 04 API handoff. For each changed route include:

- Method and path.
- Authentication, active profile, department/resource authority, and step-up requirements.
- Exact query/body schema.
- Exact success envelope and HTTP statuses.
- Complete application-state enums and terminal states.
- Error codes and safe recovery guidance.
- Pagination and private/no-store behavior.

Do not change existing payment, refund, escrow, or campaign financial semantics to make a frontend screen easier to build. Do not claim a provider integration is live based on a policy record or mock test.

## Explicitly not backend blockers

- `POST /api/payments/fee-quotes` already has a documented request and response contract. Do not add a generic quote endpoint or invent a fee base, FP-06 mode, payer rule, or transaction terms. A general quote screen needs a product decision about where it belongs and an authoritative source-specific fee base; existing transaction flows must continue to derive and lock their own terms.
- Multi-part checkout replacement is backend-owned and already documented. The frontend displays/reconciles returned references. Do not add a browser command that forces a new charge for an unknown outcome.
- A legacy frontend “unknown payment” marker with no saved provider reference cannot be safely correlated by a backend route. Keep it blocked for manual history/support resolution; do not clear it by guessing.
- Live Paystack/Monnify collection, refunds, settlement, and payout require deployment/operator configuration, approved policies, credentials, callbacks, and provider setup. Do not place secrets in code or enable live transactions as part of this contract task. Report the exact operational prerequisites separately.

## Acceptance

1. Renewal catalogue responses expose the current approved method availability without exposing secrets or weakening write validation.
2. Sellers can retrieve only eligible campaign placements for their selected property and receive exact current campaign input constraints.
3. Finance can safely render provider settlement webhook records and reconcile a selected record using the returned ID.
4. Finance can safely render escrow/proxy settlement and refund states and identify the exact eligible protected action, using fully documented DTOs.
5. All mutations retain server authorization, step-up, idempotency/version checks, separation-of-duties, and safe ambiguous-outcome handling.
6. Backend tests cover the new/changed DTOs, permission boundaries, pagination, policy/provider-unavailable states, terminal and pending outcomes, and stale/duplicate mutation attempts.
7. The canonical Group 04 handoff is updated with the verified contract. Report any unresolved policy/product or deployment prerequisite separately from backend code completion.
