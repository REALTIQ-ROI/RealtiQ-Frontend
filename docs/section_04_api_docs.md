# Implementation Group 04 — Revenue and Payment Foundations

## Scope and source precedence

This is a current source-level contract for the backend repository. The governing source is **REALTIQ Specifications, RQS-08, Part 8, §§1–16 (specification pages 150–168)**; PRD §20 (PRD pages 147–161) restates those requirements and explicitly yields to the Specifications when they differ. Related contracts include RQS-06 §§2.2, 4.7, 9–10, 13–15, 17–20 and RQS-01 §§13–17, 20. No approved fee amounts, plan prices, promotion prices, FX rates, or REALTIQ VAT registration status are inferred here.

The backend uses a versioned Console fee schedule, deterministic fee calculations, Monnify collection for supported Stream 1/2 purchases, and Paystack for Stream 3 plan/seat/invoice payments. Segregated Moniepoint escrow custody, per-beneficiary escrow settlement/refund execution, title-verification recipient routing, profile renewal preferences and recurring Paystack authorization/reconciliation are implemented behind their provider, encryption and approved-policy gates. The basket partitioner aggregates server-resolved recipients and produces the minimum number of collections at the Monnify limit (six recipients at a five-recipient limit produce two collections); currently mounted basket handlers do not yet provide six distinct recipients, so that exact source scenario is not user-reachable. Campaign-budget refund/transfer and a Finance-approved refund adapter for paid title-document views that failed before access was granted share the product-neutral refund execution and credit-note model. Other products remain governed by their distinct RQS-08 refund rules and must not be made refundable by a generic client-supplied amount. Confirmed Monnify split failures on property/installment payments can use the seller-only collection plus separate REALTIQ fee-invoice path; confirmed failed basket parts are recovered into the fewest replacement collections permitted by the Monnify recipient limit, with recipient and per-item minor-unit totals revalidated before replacement references are reserved. Scheduled recovery reconciles the same provider references and prevents duplicate fulfillment after late settlements. Credentials alone do not authorize an unapproved product policy. Provider routing is closed by payment purpose and never falls back to another provider.

## Shared API conventions

- JSON APIs use `Content-Type: application/json` unless a route says otherwise.
- Authenticated APIs use `Authorization: Bearer <JWT>`. Profile-scoped calls use the selected-profile mechanism established by the auth layer (`X-Profile-ID` where required by the current session contract). The server reloads session/profile authority; frontend role display does not grant access.
- Step-up protected mutations require `X-Step-Up-Challenge`. The challenge is bound by the middleware to method, path, selected profile, session and JSON body. A quote is read-only and does not require step-up.
- Errors are serialized as `{ "message": "...", "code": "..." }`. The request correlation ID is returned in `X-Request-ID`; it is not part of the standard error JSON body. The API may return additional allowlisted fields on selected routes.
- Monetary amounts in the fee-quote API are integer minor units: kobo for NGN and cents for USD. NGN fee values must be representable in whole naira (multiples of 100 minor units); USD uses cents. Display major units by dividing `amountMinor` by 100.
- Fee configuration is read from approved, versioned Console policies. An unapproved or missing fee schedule or VAT policy is not a zero-price quote.

## Fee schedule and VAT policy

### Supported fee products

The policy catalogue includes source codes FP-01 through FP-06 and FP-09 through FP-25. FP-07 and FP-08 are absent in the source and are deliberately not synthesized. FP-23 Mortgage referral and FP-24 aggregated data entries must remain disabled and unroutable while their source-defined launch gates apply. FP-06 has separate `standard` (no escrow) and `protected` (escrow) rate-table modes, both Stream 2/Moniepoint. FP-20 has separate `upfront` and `deferred` modes; upfront uses Stream 1/Moniepoint, deferred uses Stream 2/Moniepoint.

### `fee_schedule` Console policy shape

Mounted Console policy API: `GET /api/admin/policies/fee_schedule`, `GET /api/admin/policies/fee_schedule/history`, and revision preparation/decision routes below.

The active policy value is `{ "entries": [...] }`. Each entry is validated against the backend product catalogue and has:

```json
{
  "code": "FP-11",
  "name": "Paid media and documents",
  "stream": 1,
  "route": "moniepoint",
  "enabled": false,
  "payerRule": "buyer",
  "basis": "flat",
  "mode": null,
  "vatTreatment": "taxable",
  "effectiveFrom": null,
  "currencies": [
    {
      "currency": "NGN",
      "amountMinor": null,
      "ratePercent": null,
      "unitAmountMinor": null,
      "bands": [],
      "minimumMinor": null,
      "maximumMinor": null
    }
  ]
}
```

This is a **shape illustration only**, not an approvable enabled fee. An enabled entry must have a future/current ISO effective date, supported basis and required currency values. For `flat`, set `amountMinor`; for `percentage`, set `ratePercent`; for `marginal_bands`, provide strictly increasing `upToMinor` bands ending in `null`; for `per_unit`, `per_seat` or `per_period`, set `unitAmountMinor`. Only NGN and USD are accepted. The currency-level min/max are nullable and are applied after calculation. NGN amounts, min/max and band boundaries must be multiples of 100 minor units. VAT treatment is `taxable`.

FP-06 is represented by two entries with the same code and distinct modes: `standard` for sales without escrow and `protected` for sales using escrow. Both entries carry their own approved rates and must be present before an FP-06 quote can be returned. Example (rates omitted):

```json
[
  { "code": "FP-06", "mode": "standard", "stream": 2, "route": "moniepoint", "basis": "marginal_bands", "enabled": true },
  { "code": "FP-06", "mode": "protected", "stream": 2, "route": "moniepoint", "basis": "marginal_bands", "enabled": true }
]
```

The example omits the required complete currency and band values and is not a valid policy submission. Legacy single-mode FP-06 revisions remain readable so other fee products are not disabled, but the transaction fee quote fails closed until the mode-specific entries are approved.

FP-06 alone permits per-transaction payer rules `buyer`, `seller`, or `split`; split defaults to 50/50 unless the locked transaction terms specify another ratio. FP-06 requires `mode: "standard"` or `"protected"` so the correct source-defined rate table is selected. Other payer rules are fixed by the product catalogue. FP-20 requires `mode: "upfront"` or `"deferred"`. Codes FP-23/24 cannot be enabled because their source route/stream is unresolved/off. For backward compatibility, an older fee-schedule revision containing one unmodeled FP-06 entry remains readable for other products, but it cannot satisfy a standard/protected quote; FP-06 remains unavailable until both mode entries are approved.

The `revenue_tax` policy value is exactly one of:

```json
{ "status": "not_registered" }
```

or

```json
{ "status": "registered_7_5" }
```

The VAT status must be approved by Finance based on the tax adviser’s determination. When registered, the engine adds source-defined 7.5% VAT to a fee and returns it separately. No configurable arbitrary VAT percentage is accepted.

### Other versioned Console policies used by Group 04

The generic mounted policy routes below also serve these Group 04 workflows. They do not replace provider credentials, merchant accounts or payout setup. Admin forms must show `unconfigured` distinctly and must not seed invented prices, thresholds, state-band assignments or recipient accounts.

| Policy key | Department | Exact value fields and validation | Effect |
|---|---|---|---|
| `profile_billing_catalogue` | `sales_partnerships` | `{currency:"NGN"|"USD",plans:[{key,label,profileType:"developer"|"agency"|"partner",terms:[{period:"monthly"|"annual",amountMinor}],entitlements:{activeProjects,activeListings,units,includedSeats,promotionCreditsMinor}}],additionalSeat:{label,terms:[{period:"monthly"|"annual",amountMinor}]},renewalMethods:["saved_card"|"transfer_invoice"|"direct_debit"]}`. Each plan and `additionalSeat` has exactly one monthly and one annual term; prices and entitlements are integer minor units as applicable, NGN prices are multiples of 100, and renewal methods are unique. | Requires independent approval. Sole current source for plan/seat prices, terms, entitlements and allowed renewal methods; legacy plan/seat policies are not fallbacks. |
| `financial_execution_controls` | `finance` | `{effectiveFrom,currencyLimits:[{currency:"NGN"|"USD",maxSingleTransferMinor,maxDailyTransferMinor,maxRecurringChargeMinor,maxRefundMinor,maxCreditNoteMinor,noFaultRecoveryMinor?,refundApprovalThresholdMinor?,creditNoteApprovalThresholdMinor?}],noFaultCostRecovery:"split_equally"|"waive",reference}`. One or two unique currency rows; required maxima are positive safe-integer minor amounts; daily maximum is at least the single-transfer maximum. Optional recovery is a nonnegative even integer; optional refund/credit thresholds cannot exceed the matching maximum. | Requires independent approval. No thresholds are provided by default. Related operations remain held or unavailable if the currency policy is absent or the configured limit is exceeded. |
| `title_verification_state_bands` | `finance` | `{gazetteerRevision,effectiveFrom,states:[{stateId,band:1|2|3,registrySearchCostMinor,registrySearchReference,travelCostMode:"none"|"flat"|"at_cost",travelCostMinor,travelCostReference,registryRecipientSubAccountCode?,travelRecipientSubAccountCode?}]}`. Must reference the current authoritative gazetteer revision and include exactly 37 unique IDs (36 states plus FCT). Registry cost is required and in whole-naira minor units. Flat travel requires amount/reference; `none` requires null cost/reference; `at_cost` requires a reference and no flat amount. | Requires independent approval. Never create state IDs, bands, costs, recipients or registry/travel data in the UI. Used by title verification quote/order. |
| `profile_payout_setup` | `finance` | `{provider:"monnify",currency:"NGN",defaultSplitPercentage:<number greater than 0 through 100, max 2 decimals>,legalPolicyReference,splitPolicyReference,approvedUntil:<ISO-8601>}`. | Used for profile payout readiness and split setup. Missing/expired policy means a payout destination is not ready. |
| `promotion_campaign_controls` | `sales_partnerships` | `{currencyRules:[{currency:"NGN"|"USD",minimumBidMinor:<positive safe integer>}]}`; one or two unique currency rows; NGN minimum is a multiple of 100. | Requires independent approval; campaign creation uses the approved currency/minimum bid rules. |
| `sponsored_placements` | `data_market_intelligence` | `{placements:[{placementId,propertyId,status:"active"|"suspended"|"revoked",startsAt:<ISO-8601>,expiresAt:<ISO-8601>}]}`; unique placement IDs, ObjectId property IDs, valid dates and expiry after start. | Campaign requests reference an approved active placement; client flags and payment alone do not confer eligibility. |

For policies marked as requiring independent approval, preparation returns a pending revision and a different authorized Executive must approve it before runtime uses it. The frontend must distinguish prepared/pending revisions from the active approved value.

## Console policy endpoints

All paths below are mounted at `/api/admin`. All require bearer auth, an active staff profile, current admin authority and the policy department. Internal Audit is read-only. Mutations require bound step-up. A policy whose definition requires independent approval remains pending until a different authorized Executive approves it; the preparer cannot self-approve such a revision.

| Method and path | Request | Success | Important errors |
|---|---|---|---|
| `GET /api/admin/policies/:key` | No body. Group 04 uses `fee_schedule`, `revenue_tax`, `profile_billing_catalogue`, `financial_execution_controls`, `title_verification_state_bands`, `profile_payout_setup`, `promotion_campaign_controls`, and `sponsored_placements`. | `200 {"policy":{"key":"fee_schedule","state":"configured","revision":1,"value":{"entries":[...]},"approvedAt":"ISO-8601"}}`; when unconfigured `state` is `unconfigured`, `revision` is `0`, `value` is `null`. The `value` shape depends on `key`. | `401`, `403 PERMISSION_DEPARTMENT_REQUIRED`, `404 CONTENT_POLICY_UNKNOWN`. |
| `GET /api/admin/policies/:key/history?before=<id>&limit=<1..100>` | `before` optional ObjectId cursor; `limit` default 25. | `200 {"revisions":[{"id":"...","key":"fee_schedule","basedOnRevision":0,"value":{},"reason":"...","state":"pending","preparedBy":"...","preparedProfile":"...","approvedBy":null,"approvedAt":null,"rejectedAt":null,"createdAt":"ISO-8601"}],"nextCursor":null}`. | `422 CONTENT_POLICY_INVALID`, plus auth errors. |
| `POST /api/admin/policies/:key/revisions` | `X-Step-Up-Challenge`; `{ "value": <complete value for selected policy key>, "reason": "...", "expectedRevision": 0 }`. Reason is non-empty, max 500; the server validates policy shape and authoritative references. | `201 {"revision":{"id":"...","key":"fee_schedule","basedOnRevision":0,"value":{},"reason":"...","state":"pending|approved","preparedBy":"...","preparedProfile":"...","approvedBy":null,"approvedAt":null,"rejectedAt":null,"createdAt":"ISO-8601"}}`. Independent-approval policies remain pending; other defined policies may activate on preparation. | `403 PERMISSION_DEPARTMENT_REQUIRED`, `403 PERMISSION_SEPARATION_OF_DUTIES`, `409 CONFLICT_POLICY_VERSION`, `422 CONTENT_POLICY_INVALID` or `CONTENT_POLICY_LOCATION_REFERENCES_INVALID`, plus policy-specific feature errors when dependencies are unavailable. |
| `POST /api/admin/policies/:key/revisions/:revisionId/:decision` | `decision` is `approved` or `rejected`; `X-Step-Up-Challenge`; empty JSON body. | `200 {"revision": <revision DTO>}`. Approved revisions become the current policy revision. | `403 PERMISSION_DEPARTMENT_REQUIRED`, `403 PERMISSION_SEPARATION_OF_DUTIES`, `404 CONTENT_POLICY_NOT_FOUND`, `409 CONFLICT_POLICY_VERSION`, `409 CONFLICT_POLICY_DECIDED`. |

Example preparation (values omitted because no approved prices may be invented):

```json
{
  "value": { "entries": ["<complete validated FP entries with approved amounts/rates>"] },
  "reason": "Finance approved schedule revision reference",
  "expectedRevision": 1
}
```

That placeholder is explanatory and is not valid JSON to submit. Frontend policy forms must render the full schema from existing policy definitions/documentation and must never fill amounts with sample production prices. Finance preparation alone does not activate this policy; a separate Executive decision is required.

## Fee quote

### `POST /api/payments/fee-quotes`

**Authentication/authorization:** Bearer auth; registered account; current session and active profile reloaded. No additional role permission or step-up because the quote creates no payment or entitlement. Response is `Cache-Control: private, no-store`.

**Body** (unknown keys are rejected):

```json
{
  "feeCode": "FP-06",
  "mode": "protected",
  "currency": "NGN",
  "baseMinor": 0,
  "quantity": 1,
  "payerRule": "split",
  "buyerSharePercent": 50
}
```

The numeric zero above is a schema illustration only; actual use must send the authoritative transaction base. Fields: `feeCode` required supported FP code; `mode` required for FP-06 (`standard|protected`) and FP-20 (`upfront|deferred`); `currency` required `NGN|USD`; `baseMinor` required nonnegative safe integer; `quantity` optional default 1 and otherwise a positive safe integer (the fee and gross result must also fit the safe-integer range); `payerRule` optional and only changeable for FP-06 (`buyer|seller|split`); `buyerSharePercent` optional, only with `payerRule:"split"`, number 0–100 with at most two decimal places.

**Success:** `200 {"quote": {"feeCode":"FP-06","mode":"protected","scheduleRevision":1,"stream":2,"route":"moniepoint","baseMinor":<integer>,"quantity":1,"currency":"NGN","basis":"marginal_bands","payerRule":"split","buyerSharePercent":50,"netMinor":<integer>,"vatTreatment":"taxable","bands":[{"upToMinor":<integer-or-null>,"ratePercent":<approved-number>}],"vatMinor":<integer>,"grossMinor":<integer>,"payerAmounts":{"buyer":<integer>,"seller":<integer>},"effectiveFrom":"ISO-8601"}}`.

`ratePercent` is present for percentage basis; `bands` is present for marginal bands; the quote returns the configured basis and approved current schedule revision. `payerAmounts` is keyed by the selected payer(s). These values are policy-derived; the handoff does not supply illustrative real fees.

**Errors:** standard `{message,code}` envelope: `422 INPUT_FEE_QUOTE_INVALID`, `422 INPUT_FEE_CALCULATION_INVALID`, `422 INPUT_FEE_PAYER_SPLIT_INVALID`, `422 INPUT_FEE_PAYER_INVALID`; `503 FEATURE_POLICY_UNCONFIGURED`, `503 FEATURE_REVENUE_TAX_UNCONFIGURED`, `503 FEATURE_FEE_UNAVAILABLE`, `503 FEATURE_FEE_CURRENCY_UNAVAILABLE`, `503 FEATURE_FEE_ROUTE_UNRESOLVED`, `503 FEATURE_FEE_SCHEDULE_INVALID`.

The quote is informational only. It is **not** locked, stored, idempotent or a payment authorization. Property sale terms lock their fee snapshot at payment reservation; installment agreements retain locked FP-06 terms and payments create immutable fee lines from each assessed tranche. A quote by itself does not create a generic fee line or reserve payment terms. The quote resolves the latest approved entry revision whose effective date has arrived; a future-dated entry does not replace the prior approved entry early. A disabled entry with no explicit effective date takes effect at that revision's approval time.

## Plan and seat billing APIs

These APIs are mounted under `/api/profiles/current` and share the profile router’s bearer-auth, registered-access, private/no-store middleware. The backend requires an active company/cooperative profile, `team.manage`, current owner-seat authority and a current signatory for seat billing mutations. Plan-purchase mutations likewise require the active eligible profile administrator. Sensitive purchase/cancel/reconcile/renew mutations require step-up.

### Seats

| Method and path | Body/query | Success DTO | Notes |
|---|---|---|---|
| `GET /api/profiles/current/seat-plans` | None. | Unified: `{ "state":"configured", "catalogueSource":"unified", "revision":1, "taxPolicyRevision":1, "currency":"NGN", "plans":[{"key":"additional-seat","label":"<configured>","terms":[{"period":"monthly","amountMinor":<integer>,"currency":"NGN","netMinor":<integer>,"vatMinor":<integer>,"grossMinor":<integer>,"vatRatePercent":0,"vatPolicyRevision":1},{"period":"annual","amountMinor":<integer>,"currency":"NGN","netMinor":<integer>,"vatMinor":<integer>,"grossMinor":<integer>,"vatRatePercent":0,"vatPolicyRevision":1}],"policyRevision":1}] }`. Unconfigured policy returns `{state:"unconfigured",catalogueSource:"unified",plans:[],errorCode:"FEATURE_POLICY_UNCONFIGURED"}`. USD returns `state:"unavailable"` with no purchasable plans and `FEATURE_PAYSTACK_USD_UNAVAILABLE` unless both USD activation flags are true. | Only the approved `profile_billing_catalogue` is used. The legacy separate `profile_seats` policy is not a purchase-price fallback. |
| `GET /api/profiles/current/seats` | None. | `{ "profileId":"...", "includedHolderSeat":true, "paidSeats":[{"membershipId":"...","identityId":"...","role":"...","state":"...","acceptedAt":null,"membershipExpiresAt":null,"entitlement":null,"pendingPurchase":null,"version":1}], "counts":{"paidActive":0,"paidPending":0,"totalMembers":0} }`. | `paidSeats` excludes the included owner seat and is currently limited to 500 rows. |
| `POST /api/profiles/current/seat-purchases` | Step-up; unified: `{ "membershipId":"<membership ObjectId>", "planKey":"additional-seat", "billingPeriod":"monthly|annual", "operationKey":"<8..128 chars>" }`. Legacy body omits `billingPeriod`. | `201 {"purchase":{"id":"...","profileId":"...","membershipId":"...","plan":{"key":"additional-seat","label":"...","amountMinor":<locked-policy-integer>,"billingPeriod":"monthly","currency":"NGN","policyRevision":<integer>},"reference":"RTQ-SEAT-...","state":"pending",...}}`. | The server locks the policy revision, period, currency and amount; calendar-month/year entitlement is issued only after verified provider settlement. |
| `POST /api/profiles/current/seats/:membershipId/renew` | Step-up; unified: `{ "planKey":"additional-seat", "billingPeriod":"monthly|annual", "operationKey":"<8..128 chars>" }`; legacy body omits `billingPeriod`. | Same purchase DTO. | Renewal requires a membership with prior entitlement. A per-profile renewal preference may schedule saved-card or Direct Debit collection, or bank-transfer checkout, subject to approved catalogue, provider, encryption and scheduler gates; see the renewal APIs below. |
| `GET /api/profiles/current/seat-purchases?before=<ObjectId>&limit=25` | `before` optional; `limit` 1–100. | `{ "purchases":[<purchase DTO>], "nextCursor":null }`. | Cursor uses purchase ObjectId. |
| `GET /api/profiles/current/seat-purchases/:purchaseId` | None. | `{ "id":"...", ... }` safe purchase DTO. | Scoped to current profile. |
| `GET /api/profiles/current/seat-purchases/:purchaseId/audit?before=&limit=` | Cursor pagination. | `{ "events":[{"id":"...","action":"...","detailCode":null,"actorId":null,"amountMinor":<integer>,"currency":"NGN","at":"ISO-8601"}],"nextCursor":null }`. | Current profile only. |
| `POST /api/profiles/current/seat-purchases/:purchaseId/cancel` | Step-up; `{}`. | `{ "purchase": <purchase DTO> }` or service-provided purchase result. | Only unresolved payments; settled/ambiguous outcomes must reconcile, not cancel. |
| `POST /api/profiles/current/seat-purchases/:purchaseId/reconcile` | Step-up; `{}`. | `{ "purchase": <purchase DTO>, "providerStatus"?:"success|failed|unknown", "reviewRequired"?:true }`. | Provider verification; never create a duplicate purchase. |

Known states in stored purchase model: `initializing`, `pending`, `outcome_unknown`, `paid`, `cancelled`, `failed`, `reversed`, `review_required`. A Paystack timeout is `outcome_unknown`; frontend should retain the purchase ID/reference and call reconcile or reuse the same `operationKey`, not generate a new attempt.

### Publication plans

| Method and path | Body/query | Success DTO | Notes |
|---|---|---|---|
| `GET /api/profiles/current/publication-plans` | None. | Unified: `{ "state":"configured", "catalogueSource":"unified", "revision":1, "taxPolicyRevision":1, "currency":"NGN", "category":"developer", "plans":[{"key":"...","label":"...","profileType":"developer","terms":[{"period":"monthly|annual","amountMinor":<integer>,"currency":"NGN","netMinor":<integer>,"vatMinor":<integer>,"grossMinor":<integer>,"vatRatePercent":0,"vatPolicyRevision":1}],"entitlements":{"activeProjects":0,"activeListings":0,"units":0,"includedSeats":0,"promotionCreditsMinor":0},"policyRevision":1}] }`. Unconfigured policy returns an empty `plans` list and `FEATURE_POLICY_UNCONFIGURED`; there is no legacy price fallback. USD remains unavailable until both USD activation flags are true. | The approved `profile_billing_catalogue` is the sole purchase price and entitlement source. |
| `GET /api/profiles/current/publication-plan` | None. | `{ "profileId":"...", "category":"developer", "entitlement":null, "usage":{"activeProjects":1,"activeListings":4,"units":12,"additionalSeats":2,"includedHolderSeat":true}, "latest":null, "publicationAllowedByPlan":false }` (entitlement/latest are objects or null). | Configured entitlements include immutable purchase-time `activeProjects`, `activeListings`, `units`, `includedSeats`, and `promotionCreditsMinor`. Current usage is returned. Publication enforces the active-project, active-listing and project-unit limits in the snapshot, along with the separate owner listing cap. Included-seat and promotion-credit usage remains unavailable until those workflows are connected. |
| `GET /api/profiles/current/publication-plan-purchases?before=<ObjectId>&limit=25` | `before` optional; `limit` 1–100. | `{ "purchases":[<safe purchase DTO>], "nextCursor":null }`. |
| `POST /api/profiles/current/publication-plan-purchases` | Unified: step-up; `{ "planKey":"<configured key>", "billingPeriod":"monthly|annual", "operationKey":"<8..128 chars>" }`. Legacy body omits `billingPeriod`. | `201 {"purchase":{"id":"...","profileId":"...","category":"developer","plan":{"key":"...","label":"...","profileType":"developer","billingPeriod":"monthly","entitlements":{...},"amountMinor":<locked integer>,"currency":"NGN","policyRevision":<integer>},"reference":"RTQ-PUB-...","state":"pending",...}}`. | Requires eligible profile, `team.manage`, owner seat, configured plan and Paystack. Idempotency key binds the term and policy revision. |
| `GET /api/profiles/current/publication-plan-purchases/:purchaseId` | None. | Safe purchase DTO. |
| `GET /api/profiles/current/publication-plan-purchases/:purchaseId/audit?before=&limit=` | Cursor pagination. | `{ "events":[{"id":"...","action":"...","code":null,"reference":"...","planKey":"...","amountMinor":<integer>,"eventAmountMinor":null,"currency":"NGN","createdAt":"ISO-8601"}],"nextCursor":null }`. |
| `POST /api/profiles/current/publication-plan-purchases/:purchaseId/cancel` | Step-up; `{}`. | `{ "purchase":<purchase DTO>, "note":"A late payment settlement is held for independent review and does not create a publication entitlement." }`. | Only unresolved payment; late settlements go to review. |
| `POST /api/profiles/current/publication-plan-purchases/:purchaseId/reconcile` | Step-up; `{}`. | `{ "purchase":<purchase DTO>, "providerStatus":"success|failed|unknown" }`. | Same provider verification and idempotency principle as seats. |

`POST /api/profiles/current/publication-plan-change-quotes` accepts `{ "planKey":"<configured key>", "billingPeriod":"monthly|annual", "operationKey":"<8..128 characters>" }` and returns a persisted, idempotent upgrade quote with current/target remaining amounts, VAT, gross due and the current entitlement period end. `POST /api/profiles/current/publication-plan-purchases` accepts that quote as `quoteId`; payment settles through Paystack and replaces the active entitlement through its existing expiry. A purchase of a different lower-entitlement plan without a quote is recorded as a downgrade and its entitlement starts at the active entitlement's end, but payment is collected when that purchase is made. The approved `profile_billing_catalogue` is the only price/entitlement source. Per-profile renewal preferences and saved-card/Direct Debit automatic collection are available through the APIs below, behind the approved renewal-method, provider, encryption and scheduler gates. Promotion-credit application remains unavailable; `promotionCreditsMinor` is not treated as cash or applied to an invoice.

### Per-profile renewal preferences and Paystack mandates

Mounted under `/api/profiles/current`; require bearer auth, registered access, the current selected profile, `team.manage`, current owner-seat authority, and a current approved signatory for organization profiles. Responses are private/no-store. Mutations require request-bound step-up.

| Method and path | Request | Response |
|---|---|---|
| `GET /api/profiles/current/billing/payment-authorizations` | None | `{ "authorizations":[{ "id":"...", "provider":"paystack", "method":"saved_card|direct_debit", "providerReference":"...", "card":{}, "reusable":true, "state":"pending_initialization|initializing|outcome_unknown|pending_activation|active", "consentAt":"ISO-8601", "lastUsedAt":null, "createdAt":"ISO-8601" }] }`; secrets and provider payloads are omitted. |
| `POST /api/profiles/current/billing/payment-authorizations/direct-debit` | Step-up; `{ "operationKey":"<8..128 URL-safe chars>", "consent":true }` | `201 { "authorization":<safe authorization DTO>, "redirectUrl":"https://link.paystack.co/...", "idempotent":false }`. Same-operation in-flight retries return `redirectUrl:null,pending:true`; poll the list rather than create another mandate. |
| `POST /api/profiles/current/billing/payment-authorizations/:id/revoke` | Step-up; `{}` | `{ "authorization":<safe authorization DTO> }`; revocation suspends dependent preferences. |
| `GET /api/profiles/current/billing/renewal-preferences` | None | `{ "preferences":[{ "id":"...", "profileId":"...", "kind":"publication_plan|seat", "targetKey":"...", "membershipId":null, "category":"developer|agency|partner|null", "planKey":"...", "billingPeriod":"monthly|annual", "method":"manual|saved_card|transfer_invoice|direct_debit", "authorizationId":null, "autoRenew":false, "state":"active|suspended|revoked", "suspensionCode":null, "nextExecutionAt":null, "lastAttemptId":null, "lastAttempt":null, "version":1, "updatedAt":"ISO-8601" }] }`. A non-null `lastAttempt` is `{id,preferenceId,kind,reference,amountMinor,currency,state,errorCode,attempts,paidAt,createdAt,updatedAt}`. |
| `PUT /api/profiles/current/billing/renewal-preferences` | Step-up; `{ "kind":"publication_plan|seat", "targetId":"developer|agency|partner or membership ObjectId", "planKey":"<configured key>", "billingPeriod":"monthly|annual", "method":"manual|saved_card|transfer_invoice|direct_debit", "authorizationId":"<required for saved_card or direct_debit>", "autoRenew":false, "expectedVersion":0 }` | `{ "preference":<safe preference DTO> }`; stale version returns `409 CONFLICT_RENEWAL_PREFERENCE_VERSION`. |
| `POST /api/profiles/current/billing/renewal-preferences/:id/disable` | Step-up; `{}` | `{ "preference":<safe preference DTO> }`; disables renewal and switches to manual. |

Only active reusable authorizations can be attached or charged. Direct Debit requires `PAYSTACK_DIRECT_DEBIT_ENABLED=true`, a valid callback URL, Paystack credentials, the private authorization encryption keyring, an approved `profile_billing_catalogue.renewalMethods` entry and the existing scheduler. Signed `direct_debit.authorization.created` records a pending mandate; only `direct_debit.authorization.active` allows charge. The scheduler can verify pending mandates by initialization reference to recover a missed webhook. Poll intervals and stale setup bounds are operational settings in `.env.example`. Charge attempts use the approved catalogue, tax policy and `financial_execution_controls.maxRecurringChargeMinor`; ambiguous provider outcomes are reconciled without duplicate charges. Promotion-credit application remains unavailable and no stored-value account balance is created.
## Payments, checkout and provider-routed operations

### Route map

| Method and mounted path | Auth/step-up | Current behavior |
|---|---|---|
| `POST /api/payments/initialize` | Bearer, verified access, step-up; current buyer profile with `payment.initiate`, minimum KYC and current contact checks. | Property purchase and installments collect through the merchant Monnify account after authoritative terms and seller payout readiness are rechecked. Property escrow uses the separate segregated escrow Monnify account and requires current escrow fee/financial-control policy plus seller and REALTIQ recipient readiness. Tours remain `FEATURE_PAID_TOUR_UNAVAILABLE`. No Paystack fallback. |
| `POST /api/installments` | Bearer, Verified access; current buyer profile, current KYC/contact eligibility and purchasable listing checks. | Creates the installment agreement and locks the transaction-fee quote at agreement creation. Optional per-transaction fee fields are `payerRule` and, only for `payerRule:"split"`, `buyerSharePercent`. |
| `POST /api/cart/checkout/initialize` | Bearer, verified access and step-up. | Supported `title_document_view` and `property_market_analytics` items use merchant collection; `proxy_inspection_escrow` uses the separate segregated escrow collection account. Checkout partitions server-resolved merchant allocations into the fewest payment parts (up to five split recipients per part), and item fulfillment waits for all of its parts. Six server-resolved merchant recipients produce two collections, both represented in the checkout before payment begins; current mounted handlers do not yet supply six distinct recipients. Unsupported recipient sources fail before reservation. A confirmed failed split part is replaced only after recipient totals reconcile against the immutable item snapshots; recovery uses the minimum number of replacement collections within the current provider limit. |
| `POST /api/escrow/:id/initialize-payment` | Bearer, verified access, step-up. | Bridges to `/api/payments/initialize` with escrow ID; uses segregated escrow collection and is gated by the escrow account, immutable fee terms, and approved financial controls. |
| `GET /api/escrow/:id/settlement` | Bearer, current selected Finance staff profile, Finance department, non-Internal-Audit; settlement service also enforces party separation. | Returns the safe escrow settlement DTO, including independently tracked beneficiary states and masked destinations. This is not the merchant settlement report endpoint. |
| `POST /api/escrow/:id/settlement/reconcile` | Same Finance authority and separation-of-duties; `X-Step-Up-Challenge`; `{}`. | Rechecks provider status by each beneficiary transfer reference. Returns `200` when all beneficiaries are complete or `202` while processing/reconciliation remains. Never blindly reissues a transfer with unknown outcome. |
| `POST /api/escrow/:id/settlement/beneficiaries/:beneficiaryId/authorize-transfer` | Same Finance authority and separation-of-duties; `X-Step-Up-Challenge`; `{ "authorizationCode":"<Moniepoint transfer authorization code>" }`. | Authorizes only the beneficiary transfer in `pending_authorization`; otherwise returns a conflict. Completion is recorded per transfer and escrow release follows only when every required beneficiary is confirmed. |
| `POST /api/escrow/:id/process-refund` | Admin authentication, current Finance authority and separation-of-duties; `X-Step-Up-Challenge`; `{}`. | For escrow funded in the segregated Moniepoint account, dispatches to `monnifyEscrowRefundService`; legacy Paystack refund handling is retained only for legacy custody records. Return is `200` when confirmed or `202` while processing/reconciliation continues. |
| `GET /api/admin/escrows/:id/refund-execution`, `POST /api/admin/escrows/:id/refund-execution/reconcile`, `POST /api/admin/escrows/:id/refund-execution/beneficiaries/:beneficiaryId/authorize-transfer` | Current Finance profile and separation-of-duties; mutations require step-up. The authorize-transfer body is `{ "authorizationCode":"<Moniepoint transfer authorization code>" }`; reconcile body is `{}`. | Returns the safe refund execution record and per-beneficiary states; destinations are masked. Uncertain outcomes are reconciled against the original transfer reference before retry. |
| `POST /api/installments/:id/initialize-payment` and `POST /api/installments/:id/pay` | Bearer, verified access, step-up. | Bridges to direct payment with installment ID; Monnify collection uses locked sale/fee terms. USD settlement is separately gated by provider and FX-confirmation configuration. |
| `POST /api/proxy-inspections/:id/initialize-payment` | Bearer, buyer role, verified access, step-up. | Uses the dedicated segregated Moniepoint escrow route when configured; held inspection funds are not sent through ordinary merchant collection or a Paystack fallback. |
| `POST /api/analytics/access/initialize-payment` | Bearer, verified access, step-up. | Supported one-time FP-17 access uses Monnify; legacy `daily`/`monthly` variants without an approved FP-17/Buyer Pass mapping remain unavailable. |
| `POST /api/documents/:documentId/initialize-view-payment` | Bearer, step-up. | Supported paid title-document view uses Monnify and remains private; provider authorization URLs are returned only to the authenticated payer. |
| `POST /api/payments/webhook` | Provider endpoint; raw JSON body; signature validation. No user bearer auth. | Paystack webhook integration remains for Stream 3 plan/seat and legacy reconciliation. It is not a frontend endpoint and must not be called by browser clients. |

For unavailable Stream 1/2 checkout, frontend must keep the cart/order draft intact and show a recoverable “checkout unavailable” state. It must not fall back to Paystack, mark an order paid, or poll a payment that was never created.

### Per-transaction FP-06 payer terms

`POST /api/payments/initialize` accepts optional `payerRule` (`buyer|seller|split`) and `buyerSharePercent` (number, 0–100 inclusive, at most two decimal places). These fields apply only when the request identifies `propertyId` or `escrowId`. For example, a 40/60 buyer/seller split is `{ "propertyId":"<property-id>", "payerRule":"split", "buyerSharePercent":40 }`; the same fields may be used with `escrowId` when that escrow is payable. `buyerSharePercent` is the percentage of the FP-06 gross fee paid by the buyer; the remainder is paid by the seller. If `payerRule` is omitted, the current canonical listing `transactionFeePayer` is used. If the resolved rule is `split` and no share is supplied, the source-defined 50/50 default applies. A percentage without `payerRule:"split"`, an unsupported payer, a non-number, or a share outside the allowed precision returns `422 INPUT_FEE_PAYER_INVALID`. Payment initialization is step-up bound to the submitted JSON body, so the payer selection is included in the challenge binding. The selected terms are persisted in the immutable transaction fee snapshot; if a pending payment already exists with different payer terms, the request returns `409 CONFLICT_TRANSACTION_FEE_TERMS_LOCKED` and requires reconciliation of the original reference.

`POST /api/installments` accepts the same optional `payerRule` and `buyerSharePercent` alongside its existing installment creation body. They are resolved against the current purchasable listing and locked into the created installment's `metadata.transactionFeeTerms`; installment payment requests cannot override them. The existing creation response is the installment DTO, including this locked fee snapshot in its `metadata`. Example additions: `{ "propertyId":"<property-id>", "totalAmount":25000000, "payerRule":"split", "buyerSharePercent":40 }`. If omitted, the listing template is used and split defaults to 50/50. Invalid values return `422 INPUT_FEE_PAYER_INVALID`. This makes the terms durable before the first installment is collected and prevents later payment attempts from changing the fee allocation.

### Cart read/write APIs

Mounted at `/api/cart`:

- `GET /api/cart` and `GET /api/cart/eligibility?itemType=<supported type>&resourceId=<id>`: optional auth/guest identity; eligibility returns `{eligible:true,amount,description}` or `{eligible:false,reason}`. The item-specific snapshot is server-derived.
- `POST /api/cart/items`: optional auth; passes `itemType`, `resourceId`, and `metadata` (or remaining body as metadata); returns the serialized cart with `cartId`, profile/guest identity marker, subtotal, count, status and item snapshots. `201`.
- `DELETE /api/cart/items/:itemId`, `DELETE /api/cart`: optional auth; mutate only active cart; returns serialized cart.
- `GET /api/cart/checkouts`, `GET /api/cart/checkouts/:checkoutId`: bearer auth, buyer/admin route role; current service scopes to the current buyer profile or authorized staff. Current schemas serialize job status and snapshots; no new checkout is produced while Moniepoint is unavailable.

Admin checkout operations are mounted at `/api/admin/cart-checkouts`, `/api/admin/cart-checkouts/:checkoutId`, and `POST /api/admin/cart-checkouts/:checkoutId/retry-allocations` (last requires step-up and current Finance authority). These are allocation recovery controls for existing records, not a fee-invoice API.

The current handler registry supports only these item identifiers; an identifier being accepted by the registry does not mean the product is currently purchasable:

| `itemType` | Resource and eligibility | Current state |
|---|---|---|
| `title_document_view` | `resourceId` is a current title-document ObjectId. The document/property must be public-view eligible, the current title verification state must permit paid viewing, protected rendering and document inspection must allow access, the requester must be registered/Verified with current minimum KYC, and no active/pending access or conflicting refund may exist. | Purchasable only where the document's access policy resolves to a supported paid-view mode and FP-11/Monnify gates are configured. |
| `proxy_inspection_escrow` | `resourceId` is a proxy-inspection request ID. The buyer, property, inspector, agreed price and any existing service escrow are resolved by the server; callers cannot supply the recipient allocation. | Uses segregated service-escrow custody, not merchant collection or Paystack. |
| `property_market_analytics` | Registered account; `metadata.accessType` may be `one_time`, `daily`, or `monthly` at input validation. An active or pending analytics entitlement/checkout blocks another item. | Only `one_time` currently resolves to priced product FP-17. `daily` and `monthly` return `FEATURE_FEE_PRODUCT_UNAVAILABLE`; do not show them as purchasable. |
| `paid_virtual_tour` | A tour ID may reach the legacy handler. | Always returns `503 FEATURE_PAID_TOUR_UNAVAILABLE` pending an approved price/provider-session policy. |

Main property purchases (`property_purchase`, `property_escrow`, `property_installment`, `installment_payment`, `property_down_payment`, `ownership_payment`) are explicitly rejected from the cart; use their direct payment/installment routes. Any other item type is unsupported. `GET /api/cart/eligibility` returns `{eligible:true,amount,description}` or `{eligible:false,reason}`; the failure body currently contains a human-readable `reason` and does not guarantee a stable machine code. `POST /api/cart/items` returns the server snapshot, not client-selected price or allocation data.

### Direct payment initialization contract

`POST /api/payments/initialize` is the direct listing/installment/escrow payment initializer; it is distinct from cart checkout and legacy provider initialization APIs. It requires bearer auth, Verified access, the current selected buyer profile, `payment.initiate`, current email/phone/minimum-KYC eligibility, and `X-Step-Up-Challenge`. The challenge binds the exact POST path, selected profile, session and JSON body. The server reloads current listing price/availability, installment schedule, current escrow state, locked fee terms, payout readiness and provider routing. The client must not submit a provider, recipient, payout destination, or a price for a property/escrow purchase.

The JSON body accepts only these fields and exactly one primary resource identifier:

```json
{
  "propertyId": "<current property ObjectId or supported public reference>",
  "payerRule": "split",
  "buyerSharePercent": 40
}
```

`propertyId`, `installmentId`, `escrowId`, and legacy `tourId` are mutually exclusive. `amount` is optional and only used for installment principal; it is expressed in the installment's major currency units, is bounded by remaining/sequentially payable value, and must be omitted for a property or escrow purchase. For an USD installment, `scheduleItemId` and `fxConfirmationId` are required and `amount`, if supplied, is USD major units matching the confirmed principal; outstanding penalties cannot be combined into that FX checkout. For an NGN installment, `scheduleItemId` identifies the currently sequentially payable item when needed. `payerRule` is `buyer|seller|split`; it and `buyerSharePercent` apply only to `propertyId` or `escrowId`. `buyerSharePercent` is a JSON number from 0 through 100, at most two decimal places, and is valid only with `payerRule:"split"`. Unknown body keys, missing/multiple resource IDs, unsupported payer combinations and invalid amounts are rejected. Tours remain mounted for compatibility but fail with `503 FEATURE_PAID_TOUR_UNAVAILABLE`.

Typical successful response (`200`; fields after the optional fee terms vary by purpose):

```json
{
  "redirectUrl": "<provider-hosted checkout URL>",
  "reference": "<server payment reference>",
  "amount": "<server payable amount in major currency units>",
  "currency": "NGN",
  "transactionFee": {
    "version": 1,
    "feeCode": "FP-06",
    "currency": "NGN",
    "salePriceMinor": "<integer>",
    "protectedAmountMinor": "<integer>",
    "payerRule": "split",
    "buyerSharePercent": 40,
    "grossFeeMinor": "<integer>",
    "buyerFeeMinor": "<integer>",
    "sellerFeeMinor": "<integer>",
    "buyerTotalMinor": "<integer>",
    "sellerNetMinor": "<integer>",
    "lockedAt": "<ISO-8601>"
  },
  "feeCollectionMode": "split",
  "paymentId": "<present for escrow response>",
  "escrowId": "<present for escrow response>"
}
```

`amount` is the payment provider's major-unit collection amount; the locked fee object is in currency minor units. `transactionFee` can include `standardQuote`, `protectedQuote`, or `unitFeeTerms` as applicable. The server never exposes Monnify account/sub-account credentials in this response. For fallback mode the same response uses `feeCollectionMode:"invoice_after_recipient_payment"` and `fallbackUsed:true`; the seller receives the locked sale principal and the payer's fee is invoiced only after provider-confirmed recipient collection. Only a confirmed split rejection can enter that path.

An unresolved provider outcome returns `503 {"code":"PAYMENT_INITIALIZATION_OUTCOME_UNKNOWN","message":"The provider outcome could not be confirmed. Verify this payment reference before retrying.","reference":"<same reference>","status":"pending","reconciliationRequired":true}`. Do not submit a new payment or new operation key. Reconcile the exact reference with `GET /api/payments/verify/:reference` or the owning payment/checkout read contract. A pre-existing unresolved resource attempt returns `409 PAYMENT_INITIALIZATION_PENDING` with the reference; a different buyer/profile cannot reuse it. Listing price changes return `409 CONFLICT_LISTING_PRICE_CHANGED`; locked-payer changes return `409 CONFLICT_TRANSACTION_FEE_TERMS_LOCKED`; policy/provider gates return their specific `503` code. A redirect URL only opens checkout; payment and entitlement state must be read/reconciled from the backend.

### Checkout response and polling contract

`POST /api/cart/checkout/initialize` requires a registered Verified buyer profile and bound step-up, and returns `201` with the payment-initialization DTO below. There is no request body contract: the active cart is read from the authenticated buyer/profile. Guest carts cannot be charged. Cart items must still be eligible and every merchant part must have a current server-resolved provider recipient; the client cannot supply settlement instructions. An escrow item is a separate segregated-custody part. No Paystack fallback is used.

```json
{
  "redirectUrl": "<next actionable provider checkout URL or null>",
  "authorizationUrl": "<same URL or null>",
  "reference": "<next actionable reference>",
  "checkoutId": "<checkout id>",
  "totalAmount": "<major-unit total>",
  "currency": "NGN",
  "pending": true,
  "reconciliationRequired": false,
  "paymentParts": [
    {
      "key": "merchant_collection_1",
      "custody": "merchant_collection",
      "paymentId": "<payment id>",
      "reference": "<payment reference>",
      "amount": "<major-unit part total>",
      "currency": "NGN",
      "state": "initialized",
      "redirectUrl": "<provider URL or null>",
      "providerCode": null
    }
  ]
}
```

The `paymentParts` array can also contain `segregated_escrow` custody. States are `reserved`, `initializing`, `initialized`, `outcome_unknown`, `paid`, `failed`, `replaced`, and `late_paid_held`. Responses intentionally omit split-recipient account codes and payout data. A client should open only the `redirectUrl` returned for an `initialized` part; after returning, poll `GET /api/cart/checkouts/:checkoutId` and reconcile references until each item is `allocated`, `failed`, or `refunded`. A part may have `redirectUrl:null` while initialization/reconciliation is in flight. `reconciliationRequired:true` means keep the checkout and reference and do not create another checkout.

Buyer checkout history is `GET /api/cart/checkouts?page=1&limit=20&status=<checkout status>&paymentReference=<reference>&startDate=<ISO>&endDate=<ISO>` and returns `{ "checkouts":[<serialized checkout>], "total":<integer>, "page":<integer>, "limit":<integer> }`; page defaults to 1, limit to 20 and max 100. It is scoped to the active buyer profile. Admin history uses `/api/admin/cart-checkouts` with the same filters plus `user` and `profile`, and requires current Finance `payment.read` (Internal Audit is excluded). Admin detail is `{checkout,payment,payments,allocations,platformTransactions}` and is private staff data. `GET /api/cart/checkouts/:checkoutId` returns the serialized checkout DTO: `checkoutId`, optional `profileId`, `paymentReference`, `totalAmount`, `currency`, `status`, `paymentParts`, optional `initializationState` (`ready|initializing|outcome_unknown`), `expiresAt`, and `items[]` with `id`, `type`, `resourceId`, safe `description`, `amount`, allocation `status`, optional `allocationId` and safe `failureReason`. Checkout status values are `pending`, `payment_initialized`, `partially_paid`, `reconciliation_required`, `paid`, `allocation_processing`, `completed`, `partially_failed`, `failed`, `expired`, `refunded`, and `partially_refunded`.

`POST /api/admin/cart-checkouts/:checkoutId/retry-allocations` is a Finance recovery operation with `X-Step-Up-Challenge` and an empty `{}` body. It retries persisted post-payment allocation work only; it does not collect another charge. It returns the serialized checkout. It rejects unsupported or stale authorization, and recovery is idempotent against already allocated items.

### Payment read and export APIs

- `GET /api/payments?page=1&limit=20`: Bearer; current profile must have `payment.read`. Staff require current Finance department; Internal Audit is excluded. Seller-side views are limited to payment purposes connected to owned/mandated properties. Response is a JSON array of safe payments `{_id,reference,amount,currency,status,purpose,createdAt,updatedAt,property}`; pagination is in `X-Total-Count`, `X-Page`, `X-Page-Limit`. Page 1–10000, limit 1–100. Private/no-store.
- `GET /api/payments/:id`: same authority; returns `{_id,reference,amount,currency,status,purpose,createdAt,updatedAt,property}`. Does not expose provider internals or private document payloads.
- `GET /api/payments/export.csv?limit=2000` and `POST /api/payments/export.csv` with `{ "limit": 2000 }`: Bearer plus step-up and current payment read/Finance authority. Max 2,000 rows. Returns CSV attachment `realtiq-payments.csv`, headers `X-Export-Row-Count` and `X-Total-Count`. POST is the bound-step-up contract; GET is legacy registration and cannot initiate JSON-bound step-up in a fresh flow.
- `GET /api/payments/verify/:reference`: optional auth but server allows only current payer profile or Finance staff to use provider verification. This verifies existing payment references; it is not a checkout initializer. For a confirmed failed eligible property/installment split, the scheduled fallback may create the seller-only collection only while the stored initiating buyer session/profile remains current. Polling the original reference then returns the fallback payment's `reference`, `redirectUrl`, `amount`, `currency`, `transactionFee`, `feeCollectionMode:"invoice_after_recipient_payment"`, `fallbackUsed:true`, and `reconciliationRequired` state; it never returns the original payment as paid merely because the fallback exists.

### USD-to-NGN FX confirmations

Mounted under `/api/payments/fx-confirmations`. These routes create a two-party agreement; they do not fetch or fabricate an FX rate. The buyer proposes the NGN amount and the service derives `rateNgnPerUsd` from the current USD listing/schedule amount. The agreement is bound to the current buyer profile, current seller, and listing or exact installment schedule item. It expires at the end of the current Lagos calendar day and may be bound to one matching payment only.

| Method/path | Request | Response/behavior |
|---|---|---|
| `POST /api/payments/fx-confirmations` — listing | `{ "propertyId":"<property id or public reference>", "payableAmountMinor":<positive whole-NGN minor units>, "operationKey":"<8..128 URL-safe characters>" }` | `201 { "agreement":<FX DTO>, "idempotent":false }`; exact-key retry returns the same DTO and `idempotent:true`. Requires an active buyer profile with `payment.initiate`; listing must have a current numeric USD price. |
| `POST /api/payments/fx-confirmations` — installment | `{ "installmentId":"<id>", "scheduleItemId":"<id>", "listedAmountMinor":<positive USD cents>, "payableAmountMinor":<positive whole-NGN minor units>, "operationKey":"<8..128 URL-safe characters>" }` | Same envelope. The installment/schedule item must be current and payable; amount cannot exceed its remaining USD principal. |
| `GET /api/payments/fx-confirmations?propertyId=<id>&installmentId=<id>&limit=50` | Optional resource filter; only `propertyId`, `installmentId`, and `limit` are accepted. | `{ "agreements":[<FX DTO>] }`, current buyer/seller profiles only. `limit` is 1–100; there is no cursor in this contract. |
| `GET /api/payments/fx-confirmations/:id` | No body. | `{ "agreement":<FX DTO> }`, visible only to its current buyer or seller profile. |
| `POST /api/payments/fx-confirmations/:id/confirm` | Seller only; `{ "expectedVersion":<current integer version> }`. This mounted route does not use step-up middleware. | `{ "agreement":<FX DTO with status:"confirmed"> }`; stale version, changed seller/listing/schedule, expiry, or consumed agreement returns a conflict. |

The safe FX DTO is `{id,propertyId,buyerProfileId,sellerProfileId,installmentId?,scheduleItemId?,listedCurrency,listedAmountMinor,payableCurrency,payableAmountMinor,rateNgnPerUsd,status,version,buyerConfirmedAt,sellerConfirmedAt,consumedAt,expiresAt}`. Both buyer and seller confirmations are required before payment. Initialize the existing payment route with the matching `propertyId` or `installmentId`/`scheduleItemId` and `fxConfirmationId`; the request-bound step-up covers that ID. Never convert an unconfirmed USD amount locally or reuse an agreement for a different payment.

### REALTIQ invoices, receipts and credit notes

The mounted purchaser APIs are `/api/revenue-documents`. They are profile-scoped, private/no-store reads. `GET /api/revenue-documents?before=<ObjectId>&limit=25` accepts only `before` and `limit` (1–100) and returns `{ "documents":[<RevenueDocument DTO>], "nextCursor":<ObjectId|null> }`. `GET /api/revenue-documents/:id` returns `{ "document":<RevenueDocument DTO> }`; a document belonging to another current profile is not found. `kind` is `invoice|receipt|credit_note`; `state` is `issued|paid|void|credited|pending_provider`.

The RevenueDocument DTO is allowlisted: `{id,kind,number,state,supplier:{name,taxId,address,registrationNumber},purchaser:{profileId,name,taxId},paymentReference?,feeCode,propertyId,unitId,scheduleRevision,pricingPolicyKey,pricingPolicyRevision,vatPolicyRevision,currency,fxConfirmation?,netMinor,vatMinor,vatRatePercent,grossMinor,issuedAt,dueAt,paidAt,qrVerificationUrl?}`. Money is in minor units. The current DTO does not expose `originalDocument`, `refundExecution`, `sourceType`, or `sourceId`; clients must not infer a credit note’s original invoice from its number. Credit notes are documents only, not spendable balances or future invoice credits.

`POST /api/revenue-documents/:id/pay` accepts exactly `{ "operationKey":"<8..128 URL-safe characters>" }`; requires registered authentication, current-profile `payment.initiate`, and `X-Step-Up-Challenge`. A new Paystack initialization returns `201 { "payment":{ "id":"<id>", "reference":"<reference>", "state":"pending", "redirectUrl":"https://<Paystack checkout>" }, "idempotent":false }`. An idempotent retry may return `redirectUrl` or a terminal/pending state without one. An unresolved reservation returns `PAYMENT_INITIALIZATION_OUTCOME_UNKNOWN`/conflict; reuse the same operation key and reference. On provider confirmation, the invoice becomes `paid` and an immutable receipt is issued; reload the document list/detail rather than treating the redirect as confirmation.

`GET /api/revenue-documents/verify/:number/:token` is a public QR verification route. It returns only `{ "document":{"number","kind","state","currency","grossMinor","issuedAt","valid"} }`; invalid/missing credentials return not found. The token URL is server-generated in each authorized document DTO. It is not a document download or a way to view purchaser details.

Finance document recovery is `POST /api/admin/revenue/documents/reconcile`, body `{}` or `{ "limit":<1..250> }`, current Finance `finance.manage` plus bound step-up. It returns `{ "checked":<number>, "issued":<number>, "held":<number> }`; it retries issuance for eligible fee lines and does not initiate payments or change invoice terms.

### Payout setup

`/api/profiles/current/payout-setup` provides current profile-scoped routes:

| Method/path | Contract |
|---|---|
| `GET /api/profiles/current/payout-setup` | Current profile payout setup DTO or unconfigured state. |
| `GET /api/profiles/current/payout-setup/history?before=&limit=` | Cursor-paged audit/history DTO. |
| `POST /api/profiles/current/payout-setup` | Step-up; rate limited to 5 calls/5 minutes; body is validated by `profilePayoutSetupService` for bank/account fields, ownership and verified provider response. Returns 200 or 202 according to processing state. |
| `POST /api/profiles/current/payout-setup/:setupId/reconcile` | Step-up; provider reconciliation; returns 200 or 202 for `reconciliation_required`. |
| `POST /api/profiles/current/payout-setup/revoke` | Step-up; body validated by the service; returns the current revoked setup state. |

#### Exact payout setup DTOs

All routes below are mounted beneath `/api/profiles`; the router applies bearer authentication, registered access, private/no-store response headers, current-session reload and active-profile context. Mutation requests require `X-Step-Up-Challenge` bound to that exact method, path, profile, session and JSON body. Only the holder-administrator of an eligible seller/partner profile with `payout.manage` may act; non-individual organizations also require the current signatory. The backend rechecks current minimum identity/company verification and the approved `profile_payout_setup` policy.

`GET /api/profiles/current/payout-setup` returns:

```json
{
  "profileId": "<active-profile-id>",
  "policy": {
    "state": "configured",
    "revision": 1,
    "provider": "monnify",
    "currency": "NGN",
    "defaultSplitPercentage": "<approved-number>",
    "approvedUntil": "<ISO-8601>"
  },
  "providerActivation": { "available": false, "errorCode": "FEATURE_MONNIFY_UNCONFIGURED" },
  "setup": null,
  "ready": false
}
```

`policy` is `{state:"unconfigured",errorCode:"FEATURE_POLICY_UNCONFIGURED"}` when absent. `setup` is `null` or the safe DTO `{id,profileId,version,state,current,provider,currency,bankCode,bankName,maskedAccountNumber,verifiedAccountName?,accountNameMatched,splitSettlementReady,splitPercentage,policyRevision,approvedUntil,failureCode,createdAt,updatedAt}`. No full account number or provider sub-account code is returned. `GET /history?before=<ObjectId>&limit=<1..100>` returns `{events:[{id,setupId,version,action,code,actorId,at}],nextCursor}`; default limit 25.

Start request (`POST /api/profiles/current/payout-setup`):

```json
{
  "expectedVersion": 0,
  "operationKey": "<stable 8-128 character key>",
  "bankCode": "<provider bank-directory code>",
  "accountNumber": "<10 digits>"
}
```

The response is the safe setup DTO directly, with `200` for terminal/known states and `202` while `initiating`, `provider_create_started` or `reconciliation_required`. The operation key is unique per profile and its fingerprint is bound to the submitted bank/account plus current verified legal name. A retry must use the same key and same content. `POST /:setupId/reconcile` accepts `{}` and returns the same DTO (202 while reconciliation remains required). `POST /revoke` accepts `{ "expectedVersion": 1, "reasonCode": "<uppercase reason code>" }`, returns the same DTO, increments access version and revokes readiness. Version mismatch returns `409 CONFLICT_PAYOUT_VERSION`; stale policy/provider state returns `409 CONFLICT_POLICY_VERSION`, `503 FEATURE_PAYOUT_POLICY_EXPIRED`, or a provider-specific `FEATURE_MONNIFY_*` code. Start is limited to 5 requests per 5 minutes.

These payout-setup endpoints create and verify profile-bound Monnify sub-accounts only. A ready payout setup is a recipient-readiness result, not proof that a sale has settled. Buyer collection, ordinary split collection, segregated escrow custody, and per-beneficiary escrow disbursement are separate integrations and each has its own configuration and reconciliation state.

## Complete mounted payment-related endpoint index

These are actual paths mounted from `src/app.js`; rows marked **legacy/adjacent** must not be mistaken for RQS-08 fee invoices or as authorization to route new Stream 1/2 charges through Paystack.

| Method and path | Mount/handler | Current contract and status |
|---|---|---|
| `POST /api/payments/fee-quotes` | `paymentRoutes` → `paymentController.quoteFee` | `200 {quote}`; authenticated registered account and live selected profile; no step-up; approved fee/tax policies required. |
| `POST /api/payments/initialize` | `paymentRoutes` → `paymentController.initializePayment` | Accepts exactly one of `propertyId`, `tourId`, `installmentId`, `escrowId`, with optional `amount`, `scheduleItemId`, `fxConfirmationId`, `payerRule`, and `buyerSharePercent`; bearer + Verified + buyer profile + `payment.initiate` + step-up. Fee-payer fields apply only to property or escrow checkout; installment fee terms are locked by `POST /api/installments`, and tours do not accept them. See the transaction-fee payer contract below. Property/installment collection uses the merchant Monnify account with locked terms and any configured seller split; escrow uses the distinct segregated escrow client and immutable settlement terms. Each route fails closed until its relevant provider/policy configuration is valid. Tour returns `FEATURE_PAID_TOUR_UNAVAILABLE`. No Paystack fallback. |
| `POST /api/payments/fx-confirmations`, `GET /api/payments/fx-confirmations`, `GET /api/payments/fx-confirmations/:id`, `POST /api/payments/fx-confirmations/:id/confirm` | `paymentRoutes` → `propertyFxAgreementService` | Profile-scoped two-party confirmation for USD listing/installment terms payable in NGN. Buyer creates with an idempotency key; seller confirms the exact version. The agreement is bound to the current listing or installment/schedule item, expires at the end of the Lagos calendar day, and can be consumed by only one matching payment. Full DTO and request rules are below. |
| `POST /api/payments/webhook` | `paymentRoutes` | Provider-only raw-body signed webhook. Not a browser route. Existing Paystack settlement/reconciliation handlers remain for Stream 3 plan/seat purchases and legacy references. |
| `POST /api/payments/moniepoint-webhook` | `paymentRoutes` | Provider-only raw-body Monnify notification; signature is checked against the applicable merchant secret. A webhook triggers provider-side reference verification; it is not itself payment proof and must never be called by browser clients. |
| `GET /api/payments`, `GET /api/payments/:id` | `paymentRoutes` → profile payment read service | Authenticated current-profile payment reads; current `payment.read`/Finance authority and resource scope; JSON safe DTO, no provider payload. List pagination uses `page`/`limit` query and `X-Total-Count`, `X-Page`, `X-Page-Limit`. |
| `GET /api/payments/export.csv`, `POST /api/payments/export.csv` | `paymentRoutes` → `paymentController.exportPaymentsCsv` | Auth + step-up; CSV attachment, maximum 2,000 rows. GET remains legacy; POST uses bound JSON `{ "limit": 2000 }`. Response headers include `X-Export-Row-Count`, `X-Total-Count`. |
| `GET /api/payments/verify/:reference` | `paymentRoutes` → `paymentController.verifyPayment` | Optional auth at router; service only permits payer/current-profile or Finance-authorized reconciliation. Reconciles an existing reference; does not initialize or create payment. |
| `GET /api/cart`, `GET /api/cart/eligibility`, `POST /api/cart/items`, `DELETE /api/cart/items/:itemId`, `DELETE /api/cart` | `cartRoutes` → cart controller | Guest/optional-auth cart contract; item snapshots and eligibility are server-derived. No charge occurs. Exact item types are those accepted by the existing cart handler registry; unsupported values are rejected. |
| `POST /api/cart/checkout/initialize` | `cartRoutes` → cart checkout service | Auth + Verified + step-up; Monnify collection for supported title-view, analytics and proxy-inspection escrow items. Merchant allocations are aggregated by server-resolved sub-account and partitioned into the fewest collections under the five-recipient provider limit; a six-recipient allocation becomes two parts. Per-item amounts are persisted across parts and fulfillment waits for all required parts. The current item-handler registry does not yet produce a six-distinct-recipient basket, so the algorithm is implemented but this source case is not end-to-end reachable. Escrow remains a separate segregated-custody part. |
| `GET /api/cart/checkouts`, `GET /api/cart/checkouts/:checkoutId` | `cartRoutes` | Buyer/admin role middleware plus current buyer-profile or Finance scope in service; returns serialized existing checkout(s), not new invoices. |
| `GET /api/admin/cart-checkouts`, `GET /api/admin/cart-checkouts/:checkoutId`, `POST /api/admin/cart-checkouts/:checkoutId/retry-allocations` | `adminRoutes` → cart admin handlers | Current staff/admin authorization; retry also requires bound step-up and current Finance authority. Recovery concerns previously paid checkout allocations only; no new payment is created. |
| `GET /api/profiles/current/seat-plans`, `GET /api/profiles/current/seats`, `GET /api/profiles/current/seat-purchases`, `POST /api/profiles/current/seat-purchases`, `GET /api/profiles/current/seat-purchases/:purchaseId`, `GET /api/profiles/current/seat-purchases/:purchaseId/audit`, `POST /api/profiles/current/seat-purchases/:purchaseId/cancel`, `POST /api/profiles/current/seat-purchases/:purchaseId/reconcile`, `POST /api/profiles/current/seats/:membershipId/renew` | `profileRoutes` → seat billing service | Active-profile scoped; `team.manage`, owner-seat and organization signatory checks apply. State-changing purchase/renewal/cancel/reconcile calls use bound step-up. Only configured monthly/annual catalogue terms are shown; Paystack status is reconciled before entitlement changes. |
| `GET /api/profiles/current/publication-plans`, `GET /api/profiles/current/publication-plan`, `GET /api/profiles/current/publication-plan-purchases`, `POST /api/profiles/current/publication-plan-purchases`, `GET /api/profiles/current/publication-plan-purchases/:purchaseId`, `GET /api/profiles/current/publication-plan-purchases/:purchaseId/audit`, `POST /api/profiles/current/publication-plan-purchases/:purchaseId/cancel`, `POST /api/profiles/current/publication-plan-purchases/:purchaseId/reconcile`, `POST /api/profiles/current/publication-plan-change-quotes` | `profileRoutes` → publication plan service | Current eligible organization/advertiser profile; mutations require applicable permission and step-up. The quote route persists idempotent upgrade terms; purchase/reconcile/cancel use provider-confirmed states. Current prices and entitlements come from approved `profile_billing_catalogue`. |
| `GET /api/profiles/current/billing/payment-authorizations`, `POST /api/profiles/current/billing/payment-authorizations/direct-debit`, `POST /api/profiles/current/billing/payment-authorizations/:id/revoke`, `GET /api/profiles/current/billing/renewal-preferences`, `PUT /api/profiles/current/billing/renewal-preferences`, `POST /api/profiles/current/billing/renewal-preferences/:id/disable` | `profileRoutes` → profile renewal service | Current profile and team/owner-seat/signatory authority. Mutations require bound step-up and expected versions where applicable. Saved-card/Direct Debit auto-renewal requires a live reusable Paystack authorization; feature gates include approved catalogue methods, private keyring, provider callback and scheduler. Exact DTOs are above. |
| `GET /api/profiles/current/promotion-campaigns`, `POST /api/profiles/current/promotion-campaigns`, `GET /api/profiles/current/promotion-campaigns/:id`, `GET /api/profiles/current/promotion-campaigns/:id/ledger`, `POST /api/profiles/current/promotion-campaigns/:id/top-ups`, `POST /api/profiles/current/promotion-campaigns/:id/end` | `profileRoutes` → `promotionCampaignController` → campaign and revenue services | Current advertiser profile with `listing.boost`; mutations require step-up and idempotency key. Campaign placement, current listing eligibility, approved campaign currency/minimum-bid policy, fee/tax policy and Paystack configuration are checked server-side. Budget is campaign-scoped, not an account wallet. Detailed requests and states are below. |
| `GET /api/admin/revenue/product-refunds`, `POST /api/admin/revenue/product-refunds/prepare`, `POST /api/admin/revenue/product-refunds/:id/decision`, `POST /api/admin/revenue/product-refunds/reconcile` | `adminRoutes` → `adminRevenueController` → campaign and basket refund services | Current selected Finance staff profile with `finance.manage`; mutations require bound step-up. Prepare accepts only `{checkoutId,checkoutItemId,reason,operationKey}` and uses the immutable item quote; there is no client-supplied amount. The current basket adapter is limited to paid title-document access not yet granted, Monnify Account_Transfer in NGN, and the Finance execution limits. Campaign budget refund rules remain campaign-specific. Finance decisions require a reason, current expected version and preparer/approver separation. The scheduler polls the same provider reference and issues a linked credit note only after provider confirmation. |
| `POST /api/escrow`, `GET /api/escrow`, `GET /api/escrow/:id` | `escrowRoutes` → escrow controller | Current authenticated buyer/profile or participant/Finance scope. Create body consumes `{propertyId, amount?, rules?, metadata?}` and server requires amount to equal current authoritative asking price; returns `201` serialized escrow. Locked FP-06 sale/escrow fee terms and beneficiary allocations are attached when escrow payment is reserved by `POST /api/payments/initialize` (through the escrow payment alias), not when the draft escrow is created. |
| `POST /api/escrow/:id/initialize-payment`, `POST /api/installments/:id/initialize-payment`, `POST /api/installments/:id/pay` | Escrow/installment controllers → direct payment controller | Verified access and route-bound step-up; installments use merchant collection with locked terms; property escrow uses segregated-account collection and requires current policy, provider and recipient configuration. |
| `GET /api/escrow/:id/settlement`, `POST /api/escrow/:id/settlement/reconcile`, `POST /api/escrow/:id/settlement/beneficiaries/:beneficiaryId/authorize-transfer` | `escrowRoutes` → `monnifyEscrowSettlementService` | Current Finance profile, `finance` department, non-Internal-Audit, party separation-of-duties; writes require step-up. Each transfer has its own reference/state and provider-status reconciliation; response DTOs expose masked destinations only. |
| `GET /api/admin/escrows/:id/refund-execution`, `POST /api/admin/escrows/:id/refund-execution/reconcile`, `POST /api/admin/escrows/:id/refund-execution/beneficiaries/:beneficiaryId/authorize-transfer` | `adminRoutes` → `monnifyEscrowRefundService` | Current Finance authority and step-up for mutations; refund amount is allocated under the locked escrow resolution and current approved financial controls. Beneficiary transfer state is reconciled by reference; ambiguous provider outcomes are not retried blindly. |
| `POST /api/installments`, `GET /api/installments`, `GET /api/installments/:id`, `GET /api/installments/:id/schedule` | `installmentRoutes` | Authenticated; creation requires Verified level; model/service enforces current buyer/seller and transaction terms. Creation accepts optional `payerRule` and `buyerSharePercent` to lock the FP-06 payer allocation into the installment record. Response DTOs are existing installment serializers. |
| `PATCH /api/installments/:id/schedule/:scheduleItemId/conditions/:conditionId/satisfy`, `PATCH /api/installments/:id/cancel`, `PATCH /api/installments/:id/admin/status`, `PATCH /api/installments/:id/status`, `PATCH /api/installments/:id/penalties/:penaltyId/waive` | `installmentRoutes` | Current profile/resource authority in service; the two status routes and penalty waiver require step-up. Cancellation/penalty payloads are legacy installment DTOs; these do not implement RQS-08 fault-based fee accounting. |
| `GET /api/installments/:id/payment-history`, `GET /api/installments/:id/penalties` | `installmentRoutes` | Authenticated and resource-scoped. These are legacy payment history/penalty reads, not fee-line or revenue reports. |
| `POST /api/proxy-inspections/:id/initialize-payment` | `proxyInspectionRoutes` → proxy inspection financial service | Buyer + Verified + step-up; current request price and FP-09 fee quote are checked; initialization uses the dedicated segregated escrow account and fails closed until the account, fee policy, payout routing and financial controls are configured. |
| `POST /api/analytics/access/initialize-payment` | `analyticsRoutes` → analytics access service | Auth + Verified + step-up; `one_time` maps to FP-17 and the configured merchant Monnify collection path. Legacy `daily`/`monthly` variants have no approved product mapping and remain unavailable. No Paystack fallback. |
| `POST /api/documents/:documentId/initialize-view-payment` | `titleDocumentRoutes` → document purchase service | Auth + step-up; requires current document, verification, access policy and authorization; FP-11 quote is required; collection fails closed before new payment creation. |
| `POST /api/title-verifications/fee-quotes`, `POST /api/title-verifications/fee-orders`, `GET /api/title-verifications/fee-orders/:orderId` | `titleVerificationRoutes` → title quote/order services | Current property owner/profile authority; quote requires `document.issue`; order creation also requires `payment.initiate`, request-bound step-up and an operation key. Quote/order DTOs and configuration gates are detailed below. |
| `GET /api/revenue-documents`, `GET /api/revenue-documents/:id`, `POST /api/revenue-documents/:id/pay`, `GET /api/revenue-documents/verify/:number/:token` | `revenueDocumentRoutes` → revenue document service | Purchaser-profile reads are active-profile scoped and private/no-store. Paying an issued invoice requires `payment.initiate`, step-up and an operation key; provider is Paystack. Public QR verification exposes only a minimal validity summary. DTO and payment flow are detailed below. |
| `GET /api/admin/revenue/fee-lines`, `GET /api/admin/revenue/report`, `GET /api/admin/revenue/reconciliation`, `GET /api/admin/revenue/provider-settlements`, `GET /api/admin/revenue/provider-settlement-lines`, `POST /api/admin/revenue/provider-settlements/:id/reconcile`, `POST /api/admin/revenue/documents/reconcile` | `adminRoutes` → `adminRevenueController` | Current Finance profile and `payment.read`; mutations require `finance.manage` and bound step-up. Date ranges are bounded. Merchant-level settlement evidence does not prove each split beneficiary settled; DTOs are detailed below. |
| `GET /api/admin/proxy-inspections/:id/settlement`, `POST /api/admin/proxy-inspections/:id/settlement/reconcile`, `POST /api/admin/proxy-inspections/:id/settlement/beneficiaries/:beneficiaryId/authorize-transfer`, `GET /api/admin/proxy-inspections/:id/refund-execution`, `POST /api/admin/proxy-inspections/:id/refund-execution/reconcile`, `POST /api/admin/proxy-inspections/:id/refund-execution/authorize-transfer` | `adminRoutes` → `adminProxyNetworkController` → service escrow settlement/refund services | Current Finance staff profile, Finance department, non-Internal-Audit and separation of duties from buyer/inspector. Mutations require bound step-up. DTOs expose masked destinations and per-beneficiary states only. |
| `GET /api/profiles/current/payout-setup`, `GET /api/profiles/current/payout-setup/history`, `POST /api/profiles/current/payout-setup`, `POST /api/profiles/current/payout-setup/:setupId/reconcile`, `POST /api/profiles/current/payout-setup/revoke` | `profileRoutes` → profile payout setup service | Exact DTOs above. These are the current profile-scoped Monnify payout/sub-account setup APIs. |
| `GET /api/proxy-inspectors/payout-account`, `PUT /api/proxy-inspectors/payout-account`, `POST /api/proxy-inspectors/payout-account/verify` | `proxyInspectorRoutes` → legacy payout account handlers | Current proxy-inspector profile, `payout.manage` and step-up on writes; GET/PUT return `{_id,user,maskedAccountNumber,bankName,verifiedAccountName,verifiedAt}` or `null`; verify accepts provider bank/account input and returns bank name, verified name and account number. This legacy Paystack-recipient contract is not the RQS-08 Moniepoint split-settlement setup and should not be used as proof of first-batch payment routing readiness. |
| `PUT /api/escrow/payout-account`, `GET /api/escrow/payout-account` | `escrowRoutes` → escrow controller | Authenticated current seller profile; PUT uses step-up and existing payout details validation, returns only masked account/bank/verified name/time; GET requires `payout.manage`, holder principal and current signatory for organizations. Legacy compatibility only. |
| `PATCH /api/admin/payments/:id/cancel` | `adminRoutes` → `adminPaymentController.cancel` | Current staff Finance authority and step-up. Body is `{ "reason"?: "<0-1000 characters>" }`; success `{message,payment,alreadyCanceled}`. Paid payments are rejected with `409 CONFLICT_PAYMENT_PAID`; this does not refund a charge. |
| `POST /api/escrow/:id/process-refund`, `POST /api/admin/escrows/:id/process-refund` | Escrow/admin routes → `escrowController.processRefund` | Current Finance staff, separated duty and step-up. No request body is consumed. For current segregated Moniepoint custody the controller uses `monnifyEscrowRefundService` and its per-beneficiary execution DTO; only matching legacy receipts use the Paystack refund adapter. This is not a generic RQS fee refund/credit-note system. |
| `POST /api/escrow/:id/refund-account-details`, `PATCH /api/escrow/:id/refund-details` | `escrowRoutes` → escrow refund details service | Current escrow buyer, bound step-up. Accepts the validated bank/account details needed by an existing provider refund. Returns the safe refund detail state; exact provider-sensitive account data is not returned. Legacy Paystack-only compatibility. |
| `POST /api/escrow/:id/refund-chat/request-details`, `GET /api/escrow/:id/refund-chat`, `POST /api/escrow/:id/refund-chat/messages` | `escrowRoutes` | Existing authorized refund-support conversation; request-details optionally accepts `{message}`; message creation accepts `{message}`. Responses are `{conversation,message}` or `{conversation,messages}`. These are support communications, not invoice/refund accounting APIs. |
| `GET /api/admin/wallet`, `GET /api/admin/wallet/transactions` | `adminRoutes` → platform wallet controller | Admin/Finance legacy views of `PlatformTransaction`; not an RQS-08 fee ledger/revenue dashboard and not evidence that customer balances are allowed. |
| `GET /api/admin/escrow-disputes`, `GET /api/admin/escrow-disputes/:disputeId`, `PATCH /api/admin/escrow-disputes/:disputeId/resolve` | `adminRoutes` → escrow dispute controller | Admin staff; resolve requires step-up and dispute service separation-of-duties. Resolution may trigger existing legacy escrow refund/release rules; it does not create RQS-08 fee lines or credit notes. |

Promotion campaign APIs are mounted under `/api/profiles/current/promotion-campaigns`; campaign budget refunds are created only by the advertiser's campaign end choice and are exposed in the Finance product-refund queue. An additional product adapter allows Finance to prepare an undelivered title-document basket refund when the paid item allocation failed and no document access was granted. The current adapter does not enable analytics refunds or arbitrary refunds of plans, seats, transaction fees, verification pass-through costs, or partner service payments. REALTIQ fee documents and Finance fee-line/report/reconciliation reads are mounted under `/api/revenue-documents` and `/api/admin/revenue`; they must not be inferred from the legacy wallet or escrow refund routes.

`monnifySubAccountClient` supports payout name/account verification and sub-account setup only. Collection and ordinary split initialization are provided separately by `monnifyCollectionClient`; segregated escrow collection and beneficiary settlement/refund use `monnifyEscrowClient`. Existing proxy-inspector payout-account routes are legacy compatibility APIs; do not treat them as the RQS-08 approved billing route.

## Product refunds, credit notes and failed-split invoices

Campaign creation and top-up use Paystack under the approved promotion/VAT policy:

- `POST /api/profiles/current/promotion-campaigns` creates a server-priced campaign and initial budget. Request fields are `propertyId`, `placementId`, `billingEvent` (`click|enquiry`), `currency` (`NGN|USD`), `bidMinor`, `initialBudgetMinor`, and an 8–128 character `operationKey`. It is profile-scoped, requires `listing.boost`, request-bound step-up, current listing/advertiser eligibility and a current placement policy. Success returns `{campaign,funding,payment,idempotent}`; payment initialization may be pending or require reconciliation.
- `POST /api/profiles/current/promotion-campaigns/:id/top-ups` accepts `{ "budgetMinor": <positive integer>, "operationKey": "<8..128 URL-safe characters>" }` and returns the same funding/payment structure. It preserves a campaign-scoped balance; no account wallet is created.
- `POST /api/profiles/current/promotion-campaigns/:id/end` accepts `{ "disposition":"refund|transfer", "targetCampaignId?":"<same-profile campaign id>", "operationKey":"<8..128 URL-safe characters>", "expectedVersion":<integer> }`. A refund is bounded by the unspent funding lots and original provider invoices. A transfer can only move the remaining budget to another campaign of the same profile and currency. The response contains `{campaign,refunds,requiresIndependentApproval,idempotent}` (and `transfer` for a transfer). Refund decisions use the Finance queue below when approved Console thresholds require separation of duties.

The campaign DTO used by create/top-up/list/read/end is `{id,profileId,propertyId,placementId,billingEvent,currency,bidMinor,state,balanceMinor,totalFundedMinor,totalSpentMinor,refundPendingMinor,pauseCode,version,startedAt,endedAt,createdAt,updatedAt}`. The entry DTO used by `funding`, `entries`, `ledger`, and `refunds` is `{id,campaignId,kind,event,amountMinor,budgetMinor,remainingMinor,vatMinor,currency,state,documentsState,recognitionState,occurredAt,payment?}`; `payment`, when present, is `{id,reference,state,redirectUrl,reconciliationRequired}`. Nullable amounts/fields are returned as `null`; campaigns do not expose a general wallet or provider credentials. `GET /:id` returns the campaign and at most the latest 100 entries; use `GET /:id/ledger?before=<ObjectId>&limit=<1..100>` for cursor-paged entries. Campaign-list query allows only `state`, `after`, and `limit` (default 25, max 100); states accepted by the filter are `pending_funding|active|paused|ended|refund_pending|refunded|review_required`.

Create/top-up success is `{campaign:<campaign DTO>,funding:<entry DTO>,payment:{id,reference,state,redirectUrl?,reconciliationRequired?,errorCode?},idempotent}`. The Paystack redirect can be `null` when initialization is pending/unknown or terminal; use the same campaign/funding payment reference and reconcile through the payment provider flow. End success is `{campaign:<campaign DTO>,refunds:[<refund DTO>],requiresIndependentApproval,idempotent,transfer?}`. A transfer, when returned, describes only a same-profile, same-currency movement; it does not create spendable account credit. Funding and spend entries also carry `documentsState` and `recognitionState`; the frontend should present blocked/pending accounting work as status, not as available budget or a new payment action.
- `POST /api/admin/revenue/product-refunds/prepare` accepts exactly `{ "checkoutId":"<ObjectId>", "checkoutItemId":"<ObjectId>", "reason":"<required, max 500>", "operationKey":"<8..128 URL-safe characters>" }`; it rejects amount/provider/source fields. Current Finance staff profile and `finance.manage` authority plus `X-Step-Up-Challenge` are required. The service derives net, VAT and gross exclusively from the locked basket quote and the original REALTIQ invoice. It supports a failed `title_document_view` allocation only when no access was ever granted (including revoked/expired entitlements or prior view evidence), no separate access payment or basket checkout is unresolved, its original paid item is one NGN Monnify merchant-collection `Account_Transfer`, and approved financial limits permit the full-item refund. Purchase reservation and refund preparation share a document execution fence; a concurrent operation fails closed with a 409 conflict. `MONNIFY_REFUNDS_ENABLED=true` and Monnify API configuration are required. Under the approved thresholds, the response is `{refund,requiresIndependentApproval,idempotent}`; if the refund is executed immediately it also includes `pending`, `unavailable`, `reconciliationRequired`, or `creditNote` as applicable. `ProductRefundExecution` DTOs include `checkoutId`, `checkoutItemId` and `feeLineId` for this product kind.
- Finance reads `GET /api/admin/revenue/product-refunds?state=&after=&limit=` and decides with `POST /api/admin/revenue/product-refunds/:id/decision`, body `{ "decision":"approve|reject", "reason":"<required, max 500>", "expectedVersion":<integer> }`. Current Finance authority, selected staff profile, bound step-up, and preparer/approver separation are enforced. `POST /api/admin/revenue/product-refunds/reconcile` accepts `{}` or `{ "limit": 1..100 }` and reconciles both supported adapters: Monnify basket-item refunds and Paystack campaign-budget refunds. It reuses each existing provider refund reference and never creates a replacement refund request.
- `POST /api/admin/revenue/product-refunds/:id/decision` routes campaign and basket executions by their persisted `productKind`. Basket approval executes the reserved Monnify refund; rejection releases the allocation reservation so Finance can retry delivery. Both product kinds require the current `expectedVersion`, reason, bound step-up and separation of duties.
- A provider-confirmed refund issues one immutable credit note linked to the original product invoice, fee line where present, and refund execution. Monnify and Paystack refund results remain pending until reconciled by their original references. The scheduled refund worker retries unsubmitted `reserved` executions and polls `initializing`, `outcome_unknown` or `reconciliation_required` references; it never creates a second refund reference.

The common refund record and credit-note issuer preserve generic `sourceType`, `sourceId`, `netAmountMinor`, VAT and gross amounts, and credit-note issuance validates against the original product invoice. Active adapters are campaign budget (Paystack) and a failed-before-access title-document basket item (Monnify). The Monnify adapter is fail-closed when refunds are disabled, the paid transfer method is unsupported, access was granted, the locked invoice is unavailable, or approved financial limits are missing. Plans/seats in the current period, locked REALTIQ transaction fees, incurred verification pass-through costs, analytics reports and paid documents after access are not made refundable by these adapters; partner escrow refunds follow their separate service-escrow rules. No promotional credit application to future plan/seat/add-on/promotion invoices is implemented by this section.

For `08-RS-07`, a confirmed Monnify split rejection can initialize a seller-only fallback collection under the exact locked property/installment terms. After provider-confirmed payment, the locked REALTIQ transaction fee is recorded as an invoice due to the payer; the REALTIQ fee is not taken from seller proceeds. `MONNIFY_FAILED_SPLIT_INVOICE_FALLBACK_ENABLED=true` enables this path. `MONNIFY_FALLBACK_RECONCILIATION_INTERVAL_MS` controls same-reference polling (default 60000; allowed 15000–86400000). A timeout or unknown split result never triggers a replacement collection. If the rejected original later reports paid, it is held from duplicate fulfillment and fee invoicing is held for Finance reconciliation.

The revenue-document service issues REALTIQ fee invoice/receipt records from collected fee lines when issuer and QR signing configuration is available; profile-scoped read/pay and public QR verification routes are mounted. Their DTO carries nullable `propertyId` and `unitId`, preserving per-unit identity when the source fee line is unit-scoped. No stored account balance is implemented; the only stored budget remains per-campaign promotional funds.

`GET /api/admin/wallet` and `GET /api/admin/wallet/transactions` are legacy platform-wallet reports from `PlatformTransaction`; they are not the RQS-08 reconciled fee-revenue dashboard or chart-of-accounts export.

## Activation and unavailable-state contract

The frontend does not read backend environment variables. Treat the API response/error from the selected operation as authoritative; credentials, account numbers, private keys, provider sub-account codes and policy JSON must never be sent from or rendered in browser code. Environment variable names below document the operator-side gates in `.env.example` only.

| Capability | Backend gates to provision/approve | Expected unavailable behavior |
|---|---|---|
| Transaction fee quotes / locked FP-06 terms | Approved `fee_schedule` and `revenue_tax` Console revisions; eligible fee entry/mode/currency; seller/payer eligibility. | Quote returns a specific `FEATURE_*` 503; no zero-price fallback. |
| Merchant Monnify collection and split | `MONNIFY_COLLECTION_ENABLED=true`, `MONNIFY_ENVIRONMENT`, `MONNIFY_API_KEY`, `MONNIFY_SECRET_KEY`, `MONNIFY_CONTRACT_CODE`, `MONNIFY_REDIRECT_URL`; for split, `MONNIFY_SUBACCOUNTS_ENABLED=true`, approved `MONNIFY_SUBACCOUNT_FEE_BEARER`, distinct `MONNIFY_REALTIQ_SUBACCOUNT_CODE`, approved `profile_payout_setup`, and verified recipient setup. | Preserve cart/payment reference; fail closed. No Paystack substitution. |
| Segregated escrow custody/release/refund | Separate `MONNIFY_ESCROW_*` credentials/contract/redirect, `MONNIFY_ESCROW_COLLECTION_ENABLED=true`, `MONNIFY_ESCROW_DISBURSEMENTS_ENABLED=true`, `MONNIFY_ESCROW_SEGREGATION_CONFIRMED=true`, custody/destination bank configuration, approved `financial_execution_controls`, locked escrow terms and verified beneficiaries. | Do not accept new escrow collection or release; unresolved provider transfer stays held for same-reference reconciliation. |
| Confirmed failed-split fallback | `MONNIFY_FAILED_SPLIT_INVOICE_FALLBACK_ENABLED=true`; merchant Monnify and Paystack credentials/callback, approved fee/tax/financial policies and verified seller recipient. | No fallback on timeout/unknown outcome. Basket parts use replacement collections; basket-wide seller-only fallback is not implemented/supported. |
| Paystack plan/seat/invoice purchase | `PAYSTACK_SECRET_KEY`, client callback origin, approved `profile_billing_catalogue` and `revenue_tax`; USD additionally requires `PAYSTACK_USD_BILLING_ENABLED=true` and `PAYSTACK_USD_DOMICILIARY_ACCOUNT_READY=true`. | Catalogue returns unavailable state or purchase returns provider/policy 503; no local price fallback. |
| Stored-card/Direct Debit renewal | Approved catalogue `renewalMethods`; `PAYSTACK_RENEWAL_AUTHORIZATION_ENABLED`, `PAYSTACK_RENEWAL_AUTHORIZATION_KEYS`, `PAYSTACK_RENEWAL_AUTHORIZATION_ACTIVE_KEY`; Direct Debit also needs `PAYSTACK_DIRECT_DEBIT_ENABLED`, `PAYSTACK_DIRECT_DEBIT_CALLBACK_URL`, credentials and `PAYSTACK_RENEWAL_SCHEDULER_ENABLED`. | Do not present auto-renew as active until a reusable authorization is `active`; unknown setup/charge is reconciled by original reference. |
| Transfer-invoice renewal | Approved `transfer_invoice` catalogue method, `PAYSTACK_BANK_TRANSFER_ENABLED=true`, Paystack credentials and renewal scheduler. | Keep preference unavailable/deferred; never imply automatic charge. |
| Profile payout-recipient setup | Approved `profile_payout_setup`, provider sub-account activation, profile payout encryption keyring, current identity/company evidence and valid provider account-name result. | `setup.ready:false` with safe provider/policy code; no recipient is assumed. |
| Title-verification state quote/order | Approved `title_verification_state_bands`, `fee_schedule` FP-20, current approved state gazetteer IDs, verified payout recipient routing and Monnify collection configuration. | Quote returns `payable:false` or an explicit `FEATURE_*` error; do not invent state band, travel/pass-through amount or location identifier. |
| Campaign budget / sponsored placement | Approved `promotion_campaign_controls`, applicable fee/tax policy, approved placement record, eligible current listing/profile, Paystack credentials. | Campaign create/top-up unavailable; client-supplied placement/status is not authoritative. |
| REALTIQ invoice/receipt/credit-note generation | Issuer identity/tax fields `REALTIQ_TAX_ID`, `REALTIQ_LEGAL_NAME`, `REALTIQ_LEGAL_ADDRESS`, `REALTIQ_REGISTRATION_NUMBER`, `REALTIQ_REVENUE_QR_KEY_BASE64`; `REVENUE_DOCUMENT_SCHEDULER_ENABLED`. | Fee line remains recorded but document issuance may be held and recovered by scheduler/Finance reconciliation. |
| Refunds | Product-specific adapter eligibility; `MONNIFY_REFUNDS_ENABLED=true` for supported Monnify basket refund; Paystack credentials for campaign refund; approved financial limits and distinct Finance preparer/approver where required. | Unsupported products remain unavailable; ambiguous refund outcomes use the original refund reference and are not retried as new refunds. |
| Finance merchant settlement reconciliation | Monnify settlement-report access/configuration and bounded `MONNIFY_SETTLEMENT_RECONCILIATION_MAX_PAGES`. | Report explicitly says merchant-level only; it does not prove beneficiary split settlement. |
| Recovery workers | `REVENUE_DOCUMENT_SCHEDULER_ENABLED`, `PROFILE_SEAT_BILLING_SCHEDULER_ENABLED`, `PROFILE_PUBLICATION_PLAN_SCHEDULER_ENABLED`, `PAYSTACK_RENEWAL_SCHEDULER_ENABLED` and the worker-specific interval variables documented in `.env.example`. `revenueDocumentScheduler` currently polls every 15 seconds in code and has no interval environment variable. | Queued work remains pending/held and should be shown as such; do not report provider success from scheduler submission. |

The runtime gates may be satisfied in stages. A configured Console policy alone does not activate a provider, and provider credentials alone do not approve fee/routing policy.

## Error/state handling

Important current errors include `INPUT_FEE_QUOTE_INVALID`, `INPUT_REVENUE_DOCUMENT_QUERY_INVALID`, `INPUT_REVENUE_INVOICE_PAYMENT_INVALID`, `INPUT_FX_AGREEMENT_INVALID`, `INPUT_PRODUCT_REFUND_INVALID`, `FEATURE_POLICY_UNCONFIGURED`, `FEATURE_REVENUE_TAX_UNCONFIGURED`, `FEATURE_FEE_UNAVAILABLE`, `FEATURE_FEE_CURRENCY_UNAVAILABLE`, `FEATURE_FEE_ROUTE_UNRESOLVED`, `FEATURE_FEE_SCHEDULE_INVALID`, `FEATURE_MONNIFY_CHECKOUT_UNAVAILABLE`, `FEATURE_PAID_TOUR_UNAVAILABLE`, `FEATURE_PAYSTACK_UNCONFIGURED`, `FEATURE_PAYSTACK_UNAVAILABLE`, `FEATURE_PRODUCT_REFUND_MULTI_PART_SOURCE_UNAVAILABLE`, `CONFLICT_PRODUCT_REFUND_IN_PROGRESS`, `CONFLICT_PRODUCT_REFUND_VERSION`, `CONFLICT_PRODUCT_REFUND_PROVIDER_UNCONFIRMED`, `CONFLICT_POLICY_VERSION`, `CONFLICT_IDEMPOTENCY_KEY_REUSED`, `CONFLICT_SEAT_PURCHASE_PENDING`, `CONFLICT_SEAT_PAYMENT_NOT_CONFIRMED`, `CONFLICT_PUBLICATION_PLAN_STATE`, and `CONFLICT_PUBLICATION_PLAN_PAYMENT_NOT_CONFIRMED`.

`CONFLICT_PRODUCT_REFUND_IN_PROGRESS` means a conflicting title-document checkout or refund is already being resolved for the same document/profile. Reload the purchase/refund state and retry only after the in-flight action is terminal; do not start a parallel charge or refund. `FEATURE_PRODUCT_REFUND_MULTI_PART_SOURCE_UNAVAILABLE` means the selected basket item’s source payment spans multiple provider parts and current refund execution cannot safely allocate a per-part refund; keep the case in Finance review rather than trying to refund a guessed total.

For existing plan purchases, preserve returned purchase state and provider reference. An `outcome_unknown` result must be reconciled with the same purchase ID or idempotency key. Do not create a new operation key until the old outcome is confirmed. A payment is not entitlement until provider amount, reference, currency, status and current profile/membership are rechecked.

## RQS-08 requirement-level traceability

Backend status: **COMPLETE** means current code covers the full source behavior; **PARTIAL** means code covers part but source behavior remains; **MISSING** means no adequate implementation; **GATED** means safe internal support exists but activation needs approved policy/provider. Frontend status is **NOT ASSESSED — frontend repository not inspected** for every item. This document is a backend handoff, not evidence of frontend implementation.

| Requirement | Source rule (short) | Backend | Frontend |
|---|---|---|---|
| 08-RS-01 | Each schedule entry carries stream and route. | COMPLETE | NOT ASSESSED — frontend repo not inspected |
| 08-RS-02 | Paystack only Stream 3/REALTIQ invoices; never splits. | COMPLETE — provider routing is purpose-locked and Paystack routes do not carry third-party split instructions. | NOT ASSESSED — frontend repo not inspected |
| 08-RS-03 | One Moniepoint basket payment with per-line direct splits. | PARTIAL — server-resolved line allocations are aggregated and partitioned with per-item fulfillment tracking; proxy-inspection escrow remains its separate custody part. Current mounted item handlers do not yet connect all specified partner/seller recipient sources. | NOT ASSESSED — frontend repo not inspected |
| 08-RS-04 | Hold pre-payout fee only in Moniepoint held structure. | GATED — supported property/service escrow collections are held in the dedicated segregated Moniepoint account and only leave through controlled settlement/refund workflows; provider/account setup is required. | NOT ASSESSED — frontend repo not inspected |
| 08-RS-05 | Escrow uses segregated Moniepoint account; fee split on release. | GATED — property and proxy-inspection escrow have segregated collection, persisted fee terms and per-beneficiary release/refund reconciliation; disbursement, approved controls and verified destination setup are required. | NOT ASSESSED — frontend repo not inspected |
| 08-RS-06 | Non-escrow sale via Monnify split. | GATED — locked sale terms are routed to verified seller and REALTIQ sub-accounts, with a configured fee-invoice fallback path; provider and approved fee/routing configuration are required. | NOT ASSESSED — frontend repo not inspected |
| 08-RS-07 | Failed split produces payer fee invoice via Paystack. | GATED — synchronous initialization rejection and confirmed asynchronous FAILED/EXPIRED results can enter the seller-only fallback; asynchronous execution rechecks the stored initiating buyer session/profile before creating a replacement collection. The paid seller-directed result records the locked fee as invoice due and same-reference reconciliation handles uncertain fallback outcomes. The explicit fallback switch, Monnify and Paystack configuration and approved fee terms gate activation. | NOT ASSESSED — frontend repo not inspected |
| 08-RS-08 | Property checkout never combines with basket. | COMPLETE | NOT ASSESSED — frontend repo not inspected |
| 08-RS-09 | Split large basket into fewest provider payments as one order. | PARTIAL — deterministic minimum partitioning, item-level allocations, partial settlement and confirmed split-rejection replacement recovery are implemented. Current mounted item handlers do not yet produce the source-required six distinct recipient allocations, so six-recipient checkout is not end-to-end reachable. | NOT ASSESSED — frontend repo not inspected |
| 08-PE-01 | Versioned transaction-fee schedule fields and Console edits. | GATED — the versioned `fee_schedule` is the source for transaction/product fees and is edited through Console revisions. The separate `profile_billing_catalogue` is the source for monthly/annual plan and seat prices/entitlements; the frontend must render the correct policy for the product instead of expecting plan terms inside `fee_schedule`. Activation requires approved revisions. | NOT ASSESSED — frontend repo not inspected |
| 08-PE-02 | New revisions; locked terms retain old version. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-PE-03 | Marginal band calculation. | COMPLETE | NOT ASSESSED — frontend repo not inspected |
| 08-PE-04 | Min/cap after band calculation. | COMPLETE | NOT ASSESSED — frontend repo not inspected |
| 08-PE-05 | Buyer/seller/split payer, default split and locked ratio. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-PE-06 | Payment-currency fee and stored FX rate. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-PE-07 | Half-up whole-naira/cent rounding once per fee line. | COMPLETE | NOT ASSESSED — frontend repo not inspected |
| 08-PE-08 | Waiver/discount with reason, thresholds, independent approval and reporting. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-PE-09 | Eligible time-bound promotions/credits; no transaction-fee credits. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-PE-10 | Payer sees fee, payer and basis before commitment; lock to terms. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-PE-11 | VAT separate and VAT-exclusive quote/invoice. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-PE-12 | Permanent old/new audit of schedule/waiver/discount. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-AP-01 | Per-profile-type plan catalogue, names and entitlements. | PARTIAL — a versioned unified Console policy now stores configured monthly/annual prices and entitlement snapshots; plan entitlement limits are not enforced throughout publication/job workflows. | NOT ASSESSED — frontend repo not inspected |
| 08-AP-02 | Configured plan gates publish/jobs. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-AP-03 | Owner lists free under cap; seller-to-developer review. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-AP-04 | Monthly/annual billing; prorated immediate upgrade/end-period downgrade. | PARTIAL — monthly/annual price snapshots and persisted, version-bound prorated immediate-upgrade quote/payment exist. A lower-plan purchase is recorded as a downgrade and its entitlement starts after the active entitlement, but collection occurs when the downgrade is purchased rather than at its future effective date; the source-defined downgrade billing timing is not fully implemented. | NOT ASSESSED — frontend repo not inspected |
| 08-AP-05 | Saved card, transfer invoice, direct debit renewal. | GATED — profile preferences, reusable Paystack authorizations, active-mandate reconciliation, automatic charges and transfer-invoice reminders are connected; current catalogue, consent, encryption, provider credentials and scheduler settings gate activation. | NOT ASSESSED — frontend repo not inspected |
| 08-AP-06 | Failed renewal grace, reminders and lapse. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-AP-07 | Lapse blocks new work without interrupting in-flight work. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-AP-08 | Included holder seat, paid additional seats, proration/end-period removal. | PARTIAL — additional-seat monthly/annual purchases use the unified price snapshot; mid-period proration and scheduled end-period removal remain. | NOT ASSESSED — frontend repo not inspected |
| 08-AP-09 | Billing page shows entitlements, use, seats, add-ons, invoice, credits. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-AP-10 | Credit notes reduce eligible next invoices only. | PARTIAL — immutable source-linked credit notes are issued after confirmed campaign-budget refunds; applying promotional credits to future plan/seat/add-on/promotion invoices remains unimplemented. | NOT ASSESSED — frontend repo not inspected |
| 08-AP-11 | Independent Advanced Finance add-on lifecycle. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-EF-01 | Fee from locked agreed value and escrow-specific standard/protected rates. | GATED — `POST /api/payments/initialize` locks FP-06 standard/protected terms against the current payable property/escrow amount; installments persist locked terms at agreement creation and allocate rounded fee/VAT tranches without drift. Fee lines are recorded from confirmed eligible payments. New collection/release execution still requires approved schedule/tax/financial-control policies, verified destinations and the correct Monnify route. | NOT ASSESSED — frontend repo not inspected |
| 08-EF-02 | Per-sale payer rule, default 50/50. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-EF-03 | Escrow pro-rata fee splits at release. | GATED — locked fee allocation and seller/REALTIQ beneficiary execution are persisted and reconciled separately; approved controls and dedicated provider disbursement setup gate execution. | NOT ASSESSED — frontend repo not inspected |
| 08-EF-04 | Non-escrow payments split fee and seller net. | GATED — the configured direct-payment path splits locked seller net and REALTIQ fee; a confirmed split rejection can route seller principal to the verified seller account and issue the locked REALTIQ fee as a separate Paystack invoice after seller payment. Provider and explicit fallback configuration gate activation. | NOT ASSESSED — frontend repo not inspected |
| 08-EF-05 | Multi-unit per-unit fees and receipts. | PARTIAL — per-unit locked FP-06 quote calculation and fee-line recording are now supported by services; existing multi-unit purchase route and per-unit receipt issuance are not connected. | NOT ASSESSED — frontend repo not inspected |
| 08-EF-06 | Trustee escrow costs itemized. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-EF-07 | RTGS payments allocated and fee-split. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-EF-08 | No fee on penalties/forfeitures/retained amounts. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-EF-09 | Refund/fault rules shown before terms lock. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-EF-10 | Dispute decision automates fault-based fee/refund. | GATED — segregated escrow dispute decisions reserve idempotent buyer/REALTIQ transfers from locked fee terms and preserve seller recovery; approved fault/no-fault controls and verified transfer destinations are required. | NOT ASSESSED — frontend repo not inspected |
| 08-EF-11 | Defaulting-seller fee recovery waterfall. | PARTIAL — seller recovery obligations from supported escrow outcomes are recorded and collected from later eligible payouts; the wider chargeback/refund recovery scope is not connected across every payment product. | NOT ASSESSED — frontend repo not inspected |
| 08-FX-01 | USD-list/NGN-pay term. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-FX-02 | Counterparty-confirmed locked FX quote before each payment. | GATED — each USD installment payment requires a profile-bound FX confirmation linked to the exact installment schedule item and payment; approved rate/policy and USD provider enablement are external gates. | NOT ASSESSED — frontend repo not inspected |
| 08-FX-03 | Fee on NGN paid and USD/FX reconciliation receipt. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-VF-01 | FP18–22 verification ordered through basket, order/invoice/receipt. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-VF-02 | Identity/company checks in plan; owner FP18 paid verification. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-VF-03 | State-to-band table for all states/FCT. | PARTIAL — policy validation requires all 36 states and FCT with authoritative gazetteer IDs; approved values/data remain external. | NOT ASSESSED — frontend repo not inspected |
| 08-VF-04 | Pass-through plus state-band title-service quote. | GATED — the quote is connected to an idempotent Monnify order, immutable recipient-routing snapshot, payment reconciliation and verification submission link; current gazetteer, state-band policy, fee schedule and recipient accounts are required. | NOT ASSESSED — frontend repo not inspected |
| 08-VF-05 | Upfront costs and optional deferred service fee. | PARTIAL — quote supports upfront/deferred modes; deferred trigger, invoicing and case completion lifecycle remain. | NOT ASSESSED — frontend repo not inspected |
| 08-VF-06 | Deferred fee on withdrawal/no sale after configured period. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-VF-07 | Fee independent of result; payment never grants badge. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-VF-08 | Project root title and per-unit document verification fees. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-VF-09 | No fixed expiry; two-person revocation and change-triggered reverify. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-VF-10 | Case time and expense logs required for closure. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-VF-11 | Paid title certificate unlock produces REALTIQ revenue. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-VF-12 | Optional seller verification rebate. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-PF-01 | Uniform platform rate for all partner and agent fees. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-PF-02 | Platform rate included in listed partner price; net shown. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-PF-03 | Acceptance-held service fee release. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-PF-04 | Rejected partner report review outcomes. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-PF-05 | Agent platform commission split by mandate. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-PF-06 | Paid media/document fee wholly to REALTIQ. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-PF-07 | Lawyer-checked upgrade creates job/receipt. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-PF-08 | WHT deduction/certificates/payout advices. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-PF-09 | Remote bundle keeps each party split and bundle discount. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-PF-10 | Launch-free tour fee stays switchable/off. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-PT-01 | Console-controlled allowed payment-term types. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-PT-02 | Partner term approval before buyer display. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-PT-03 | Terms shown on profile, booking and basket. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-PT-04 | Basket charges due-now amount; later installments separately. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-PT-05 | Correct immediate/held settlement by term. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-PT-06 | Non-delivery refund and dispute/trust outcome. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-PT-07 | New-partner track record restricts terms. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-PT-08 | Terms changes affect new bookings only. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-PR-01 | Fixed promotion packages paid before activation. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-PR-02 | Campaign budget paid, capped spend, pause/resume. | GATED — campaign funding is Paystack-confirmed, spend is ledger-reserved/idempotent and bounded by remaining campaign budget; campaigns pause when budget is exhausted or eligibility is lost and may resume after valid funding/eligibility returns. Approved Sponsored/promotion/financial/tax policies and provider readiness remain activation gates. | NOT ASSESSED — frontend repo not inspected |
| 08-PR-03 | Unused value refund or next-campaign transfer choice. | GATED — campaign end supports same-profile, same-currency transfer or source-lot-bounded refunds of reconciled unused funds; provider outcome and approved financial thresholds gate execution/approval. No account-wide credit is created. | NOT ASSESSED — frontend repo not inspected |
| 08-PR-04 | Templates and Buyer Pass plan lifecycle. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-PR-05 | Analytics per report or Buyer Pass; report persists. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-PR-06 | FP23 remains off until Mortgage Partner active. | GATED | NOT ASSESSED — frontend repo not inspected |
| 08-PR-07 | Budget belongs only to one campaign; no account wallet. | COMPLETE — each campaign has its own funding lots, balance and ledger; no account-wide customer wallet is created. | NOT ASSESSED — frontend repo not inspected |
| 08-PR-08 | VAT at budget payment; recognition as spent. | GATED — VAT is snapshotted and collected with confirmed campaign funding, while fee/revenue recognition is recorded as budget is spent from that campaign's ledger. Approved tax/promotion policies and Paystack activation are required. | NOT ASSESSED — frontend repo not inspected |
| 08-PR-09 | Configured bid floor and never exceed bid. | GATED — campaign creation enforces the configured currency minimum bid and event spend is capped at the lesser of the configured bid and available balance. The approved minimum-bid policy and eligible placement/campaign data must be active. | NOT ASSESSED — frontend repo not inspected |
| 08-PR-10 | Quality-gated bids only in Sponsored slots, never organic rank. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-RA-01 | Traceable fee line per charge. | PARTIAL — immutable fee lines cover FP-06 property/installment payments and delivered FP-11/FP-17 basket items; other fee products remain unconnected. | NOT ASSESSED — frontend repo not inspected |
| 08-RA-02 | REALTIQ fee invoice/receipt series with QR. | GATED — fee-line-backed invoice/receipt issuance, versioned document numbering, purchaser APIs and minimal public QR validation are implemented; issuer identity/tax fields, QR signing key and recovery scheduler must be configured. | NOT ASSESSED — frontend repo not inspected |
| 08-RA-03 | Fee lines in payer/seller finance. | PARTIAL — Finance staff fee-line reads are mounted; payer and seller Finance dashboard projections are not connected. | NOT ASSESSED — frontend repo not inspected |
| 08-RA-04 | Product refund rules and credit note. | PARTIAL — unused campaign-budget refunds return through Paystack, and approved undelivered title-document basket refunds use the supported Monnify refund route; both reconcile idempotently and issue source-linked credit notes after provider confirmation. Other refund classes remain governed by product-specific RQS-08 rules and are not enabled without an adapter. | NOT ASSESSED — frontend repo not inspected |
| 08-RA-05 | Refund/credit prepare-approve threshold. | PARTIAL — versioned financial controls, preparer/approver separation, and threshold handling exist for the supported campaign-budget and undelivered title-document refund adapters; source-required refund/credit treatment for other products remains unsupported. | NOT ASSESSED — frontend repo not inspected |
| 08-RA-06 | Chargeback queue; entitlement reverses only after case closes. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-RP-01 | Reconciled net revenue dashboard dimensions. | PARTIAL — Finance report groups recognized lines by month, fee product, stream, currency, state and payer/profile type; refunds/credits, full fee-product coverage and provider-settlement reconciliation remain. | NOT ASSESSED — frontend repo not inspected |
| 08-RP-02 | Aged deferred/default receivables. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-RP-03 | Plan/seat/add-on lifecycle metrics. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-RP-04 | Required staff hours/expenses per escrow/verification/inspection. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-RP-05 | Provider charges captured per reconciled payment. | GATED — merchant-level Monnify settlement reconciliation stores matched gross, settlement and provider-charge amounts per payment and exposes aggregates; settlement-report access/configuration is required, and beneficiary split settlement remains unconfirmed. | NOT ASSESSED — frontend repo not inspected |
| 08-RP-06 | Executive/Finance transaction contribution view. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-RP-07 | CSV/XLSX chart-of-accounts exports reconcile to dashboard. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-TX-01 | VAT calculated separately by supplier on each payment line. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-TX-02 | Property/deposit/installment/penalty exempt from VAT. | COMPLETE | NOT ASSESSED — frontend repo not inspected |
| 08-TX-03 | Approved REALTIQ VAT status controls new fees. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-TX-04 | Quotes/checkouts/invoices show net/VAT/gross. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-TX-05 | Supplier tax ID/VAT status onboarding rules. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-TX-06 | Partner VAT on partner’s own line/invoice. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-TX-07 | Platform-rate VAT invoice addressed to partner. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-TX-08 | Invoices at fee-specific time of supply. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-TX-09 | Required fiscal invoice fields and EFS adapter readiness. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-TX-10 | Monthly VAT reporting before the 21st. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-RV-01 | Transaction cap and terms-sheet disclosure. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-RV-02 | Owned/Sold/title/release certificates only on platform completion. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-RV-03 | Trust transaction components only count platform-completed sales. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-RV-04 | Off-platform completion prohibition and case opening. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-RV-05 | Recovery of chargebacks/refunds already split to parties. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-RV-06 | Configurable card-funded delayed settlement. | MISSING | NOT ASSESSED — frontend repo not inspected |
| 08-RV-07 | Owner title match, listing cap and agent-like review. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-RV-08 | Name-matched payout/split setup blocks first listing/job. | PARTIAL | NOT ASSESSED — frontend repo not inspected |
| 08-RV-09 | Earned/deferred/unearned revenue recognition. | MISSING | NOT ASSESSED — frontend repo not inspected |

## Test evidence for this implementation

Earlier focused command (before the FP-06 mode and quantity-limit adjustment):

```text
node --test --test-reporter=spec test/revenueFeeEffectiveRevision.test.js test/revenueFeePricing.test.js test/revenuePaymentRouting.test.js test/revenueFeeQuoteRequest.test.js test/feeSchedulePolicyActivation.test.js test/proxyInspectionBusinessRules.test.js test/cartCheckoutService.test.js test/titleDocumentAccessService.test.js
```

Result: **75 passed, 0 failed**. These are isolated service/model tests; no live provider operation, production migration or production data change was run. Tests cover fee calculation, rounding, bands/minimum/cap, schedule activation/separation, future-effective revisions, routing restrictions, cart idempotency, partner fee snapshot behavior and title-document no-hardcoded-price behavior.

After adding explicit FP-06 `standard`/`protected` rate modes and removing the arbitrary quote-quantity ceiling, the following focused suite was run again:

```text
node --test --test-reporter=spec test/revenueFeePricing.test.js test/revenueFeeQuoteRequest.test.js test/revenuePaymentRouting.test.js test/revenueFeeEffectiveRevision.test.js test/feeSchedulePolicyActivation.test.js test/profileSeatBillingContracts.test.js
```

Result: **32 passed, 0 failed**. This narrower fresh run covers both transaction-fee modes, legacy schedule fail-closed behavior, safe integer bounds, version-effective policy selection, route restrictions, Console approval separation and seat billing contract constraints. It does not test live provider settlement or unimplemented invoice/refund flows.

## Code references

- `src/constants/revenueFeeProducts.js` — FP catalogue and route/payer/basis constraints.
- `src/services/revenueFeePricingService.js` — input normalization, approved policy read, marginal/flat/per-unit math, currency precision, VAT and payer splits.
- `src/services/consolePolicyService.js` — fee/tax revision approval and per-product effective-date resolution.
- `src/services/revenuePaymentRoutingService.js` — closed purpose-to-provider map and fail-closed Moniepoint collection gate.
- `src/services/revenueProductPricingService.js` — existing paid product callers and unavailable state.
- `src/constants/consolePolicies.js`, `src/services/consolePolicyService.js` — fee schedule/tax validation and independent approval.
- `src/routes/paymentRoutes.js`, `src/controllers/paymentController.js` — quote, payment-read, export and initialization contracts.
- `src/routes/profileRoutes.js`, `src/services/profileSeatBillingService.js`, `src/services/profilePublicationPlanService.js` — plan/seat APIs and Paystack lifecycle.
- `src/services/cartItemService.js`, `src/services/cartCheckoutService.js`, `src/services/analyticsAccessService.js`, `src/services/titleDocumentService.js`, `src/services/documentPurchaseJobService.js`, `src/services/proxyInspectionFinancialService.js` — existing consumers.
- `src/integrations/monnifySubAccountClient.js` — payout account/sub-account setup only; not payment collection, split settlement or escrow.
- `src/middleware/errorMiddleware.js` — public error envelope.

## Current Group 04 worktree coverage map

The working tree changes are the implementation evidence for this Group 04 contract. The rows below map every currently modified/untracked Group 04 artifact to the frontend-facing contract section or explicitly identify files that are internal operator/test/source material. A model, adapter, or worker has no standalone frontend API unless a mounted route is listed; its state is surfaced through the corresponding user/Finance DTO and polling/reconciliation flow described above.

| Current changed artifacts | Contract coverage / frontend relevance |
|---|---|
| `.env.example`; `src/app.js`; `src/config/db.js`; `src/config/titleDocuments.js`; root `index.js`; `src/middleware/errorMiddleware.js`; `src/routes/paymentRoutes.js`; `src/routes/profileRoutes.js`; `src/routes/adminRoutes.js`; `src/routes/escrowRoutes.js`; `src/routes/revenueDocumentRoutes.js`; `src/routes/titleVerificationRoutes.js` | Mounted prefixes, JSON/raw webhook handling, startup/index setup, private-document integration, error envelope, and the exact payment, profile billing, Finance, escrow, revenue-document, and title-verification route surface documented in §§ Console policy, payment, escrow, invoices, refunds, and route index. The frontend must use the documented mounted paths and never call internal startup/index/migration code. |
| `src/constants/consolePolicies.js`; `src/constants/revenueFeeProducts.js`; `src/services/consolePolicyService.js`; `src/services/revenueFeePricingService.js`; `src/services/financialExecutionPolicyService.js`; `src/services/revenueProductPricingService.js`; `src/services/revenueTransactionFeeService.js`; `src/services/revenuePaymentRoutingService.js` | Fee product catalog, versioned `fee_schedule`, tax, billing/routing/financial controls, quote response, locked FP-06 terms, rounding and current policy activation behavior. See fee quote, Console policy schemas, direct payment, policy gates, and RQS traceability. These are not separate frontend APIs beyond the mounted policy and quote endpoints. |
| `src/controllers/paymentController.js`; `src/services/directPaymentInitializationService.js`; `src/integrations/monnifyCollectionClient.js`; `src/integrations/paystackBillingClient.js`; `src/integrations/paystackRefundClient.js`; `src/services/failedSplitInvoiceFallbackService.js`; `src/services/propertyFxAgreementService.js`; `src/models/Payment.js`; `src/models/PropertyFxAgreement.js`; `src/models/PaymentProviderEvent.js`; `src/models/PaymentProviderSettlementLine.js` | Direct purchase/installment initialization, same-reference idempotency/reconciliation, FX confirmations, provider callback state, payment receipt/payment DTOs, confirmed failed-split recovery and provider settlement evidence. See direct payment, FX confirmation, payment history, webhooks, failed-split fallback, and reconciliation contracts. Provider webhooks are server-to-server only. |
| `src/controllers/cartController.js`; `src/services/cartCheckoutService.js`; `src/services/cartItemService.js`; `src/models/CartCheckout.js`; `src/models/CartAllocation.js` | Guest/current-profile cart, server-side eligibility and allocation, part partitioning, checkout request/response, item-level fulfillment, buyer polling, Finance history/detail/allocation retry, late settlement holds and durable recovery. See Cart APIs and “Checkout response and polling contract.” Client-supplied recipient/sub-account fields are never supported. |
| `src/controllers/escrowController.js`; `src/controllers/escrowDisputeController.js`; `src/controllers/proxyInspectionController.js`; `src/controllers/adminProxyNetworkController.js`; `src/services/escrowSettlementService.js`; `src/services/monnifyEscrowSettlementService.js`; `src/services/monnifyEscrowRefundService.js`; `src/services/serviceEscrowSettlementService.js`; `src/services/serviceEscrowRefundService.js`; `src/services/escrowDisputeService.js`; `src/services/proxyInspectionFinancialService.js`; `src/services/escrowResponseSerializer.js`; `src/models/Escrow.js`; `src/models/EscrowDispute.js`; `src/models/EscrowLog.js`; `src/models/EscrowSettlement.js`; `src/models/EscrowRefundExecution.js`; `src/models/ServiceEscrow.js`; `src/models/ServiceEscrowSettlement.js`; `src/models/ServiceEscrowRefundExecution.js`; `src/integrations/monnifyEscrowClient.js` | Separate segregated escrow custody, per-beneficiary release/refund state, Finance authorize/reconcile endpoints, dispute outcomes, held fee and seller recovery. UI contracts are the escrow/service escrow and admin settlement/refund routes in the route index; custody secrets and full destinations remain server-only. See policy gates and settlement state explanations. |
| `src/controllers/profilePublicationPlanController.js`; `src/controllers/profileRenewalController.js`; `src/services/profileBillingCatalogueService.js`; `src/services/profilePublicationPlanService.js`; `src/services/profileSeatBillingService.js`; `src/services/profileRenewalService.js`; `src/jobs/profileRenewalScheduler.js`; `src/models/ProfilePublicationPlanEntitlement.js`; `src/models/ProfilePublicationPlanPurchase.js`; `src/models/ProfileSeatPurchase.js`; `src/models/ProfileBillingAuthorization.js`; `src/models/ProfileBillingAuthorizationEvent.js`; `src/models/ProfilePlanChangeQuote.js`; `src/models/ProfileRenewalAttempt.js`; `src/models/ProfileRenewalPreference.js` | Unified monthly/annual catalogue and locked price/tax snapshots, seat and publication plan purchase/reconciliation, upgrade quotes, per-profile renewal methods, reusable Paystack authorization, scheduler and lapse/unknown states. See plan/seat and renewal API contracts. No client reads a stored authorization code. |
| `src/services/profilePayoutSetupService.js`; `src/services/sponsoredPlacementService.js`; `src/controllers/promotionCampaignController.js`; `src/services/promotionCampaignService.js`; `src/models/PromotionCampaign.js`; `src/models/PromotionCampaignEntry.js` | Verified payout recipient setup and revocation, authoritative placement eligibility, campaign create/top-up/ledger/end/refund/transfer. See payout setup, campaign API, policy schema, and product refund contracts. Campaign budget is not a general account balance. |
| `src/controllers/adminRevenueController.js`; `src/controllers/revenueDocumentController.js`; `src/services/revenueAccountingService.js`; `src/services/revenueDocumentService.js`; `src/services/basketProductRefundService.js`; `src/services/productRefundGuardService.js`; `src/services/paystackTitlePurchaseAdapter.js`; `src/models/RevenueFeeLine.js`; `src/models/RevenueDocument.js`; `src/models/ProductRefundExecution.js` | Fee-line/report/reconciliation reads, invoice/receipt/credit-note issuance and payment, QR validation, Finance product-refund preparation/decision/reconciliation, current product-specific refund adapters. See revenue documents, Finance revenue, refunds, error/state, and gates. Other refund product types and future-invoice credit application are explicitly deferred. |
| `src/controllers/titleVerificationController.js`; `src/services/titleVerificationQuoteService.js`; `src/services/titleVerificationOrderService.js`; `src/models/TitleVerification.js`; `src/models/TitleVerificationOrder.js`; `src/services/titleDocumentAccessService.js`; `src/services/titleDocumentService.js`; `src/services/titleSubmissionService.js`; `src/services/documentPurchaseJobService.js`; `src/models/Document.js`; `src/scripts/migrateTitleDocumentAccess.js`; `src/config/titleDocuments.js` | State-band quote/pass-through DTO, payable title-fee order, provider payment status, verification-case linkage, paid-document purchase/access job and protected document compatibility. Frontend uses the title quote/order/document APIs; the migration script is deployment/operator-only and is not called by the UI. See title-verification, invoice, document-purchase, and configuration-gate sections. |
| `src/services/installmentService.js`; `src/services/sellerFeeRecoveryService.js`; `src/models/SellerFeeRecovery.js`; `src/services/profileInquiryService.js`; `src/services/profileListingService.js`; `src/services/profileProjectService.js`; `src/services/profilePublicationGateService.js`; `src/services/propertyActivityService.js`; `src/controllers/propertyController.js` | Installment locking/VAT cursor, persisted seller fee-recovery obligations and holds, current seller/payout/profile eligibility, publication/billing-gate integrations, listing activity and price/availability connections. An outstanding seller recovery blocks new publication/transaction activity with `409 FINANCIAL_SELLER_RECOVERY_DUE`; eligible later escrow proceeds reserve/recover amounts and confirmed settlement updates the obligation. Finance report/reconciliation exposes aggregate remaining receivables, not a seller recovery account or new payment endpoint. |
| `src/jobs/revenueDocumentScheduler.js` | Internal scheduled recovery for pending revenue-document issuance and related ledger work. It is not a frontend-triggered route; the UI sees held/pending document state and Finance may use the bounded `POST /api/admin/revenue/documents/reconcile` operation. `.env.example` controls activation; current polling cadence is a fixed 15-second code interval. |
| `test/cartCheckoutService.test.js`; `test/feeSchedulePolicyActivation.test.js`; `test/proxyInspectionBusinessRules.test.js`; `test/revenueAccountingContracts.test.js`; `test/revenueFeeEffectiveRevision.test.js`; `test/revenueFeePricing.test.js`; `test/revenueFeeQuoteRequest.test.js`; `test/revenuePaymentRouting.test.js`; `test/titleDocumentAccessService.test.js` | Backend contract/regression test artifacts; they are not frontend APIs. Historical focused-test output is recorded in the test-evidence section. |
| `API_DOCS.md`; `docs/section_04_api_docs.md`; `docs/frontend_contract_04.md` | Supporting API index and the two Group 04 deliverables. `API_DOCS.md` is not a substitute for this section-specific contract. |
| `need-to-complete-later.md` | Explicit constraints: (1) six-recipient partition exists but no mounted basket handler currently produces six recipients; (2) refunds remain product-specific; (3) credit notes cannot be applied to future plan/seat invoices; (4) basket-wide seller-only collection plus separate fee invoice is unsupported. These limitations are carried into the frontend workflow instructions above. |
| `monnify-message-request.md` | Operator/client credential and account-activation request; no frontend endpoint or API DTO. Provider activation remains external. |
| `tmp/rqs08-pages150-169.txt`; `tmp/rqs08-source.txt` | Local source excerpts used to cross-check RQS-08 wording; not runtime code, API material, or frontend dependencies. |

The two frontend handoff files intentionally do not expose provider secrets or list test fixture credentials. Their completeness target is the behavior a client must render/call plus the explicit unavailable/deferred cases, not a 1:1 copy of every internal model property.

## Current implementation continuation (2026-11-08)

### State-band title-verification quote

`POST /api/title-verifications/fee-quotes` now returns a server-calculated quote for a property whose canonical `state` resolves to the active approved Nigeria gazetteer. Request JSON is `{ "propertyId": "<property id>", "serviceFeeMode": "upfront" | "deferred" }`; `serviceFeeMode` defaults to `upfront`. The response is `{ "quote": { "state", "payable", "propertyId", "stateLocation": { "id", "name" }, "stateBand", "currency": "NGN", "policyRevisions": { "stateBands", "feeSchedule" }, "serviceFeeQuote": <full FP-20 quote DTO>, "passThrough": { "registryAndSearchMinor", "travelMode", "travelMinor", "totalMinor" }, "serviceFee": { "collectionMode", "netMinor", "vatMinor", "grossMinor", "dueNowMinor", "dueOnSaleRelease" }, "dueNowMinor", "unavailableReason", "quotedAt" } }`. `travelMinor`, `pass-through totalMinor`, or top-level `dueNowMinor` can be `null` when an at-cost travel quote or recipient routing is unavailable; use `payable` and `unavailableReason`, not zero, to determine availability. The endpoint requires authenticated, current property authority with `document.issue`; it returns private/no-store. It does not create an order or collect payment. `FEATURE_POLICY_UNCONFIGURED`, `FEATURE_SEARCH_GAZETTEER_UNCONFIGURED`, `FEATURE_TITLE_STATE_UNRESOLVED`, `FEATURE_TITLE_TRAVEL_QUOTE_REQUIRED`, and missing recipient/policy errors describe unavailable inputs. Admin must approve the `title_verification_state_bands` policy and FP-20 schedule; this code does not choose state bands, fees or travel costs.

The payable flow is separate and mounted at `POST /api/title-verifications/fee-orders` and `GET /api/title-verifications/fee-orders/:orderId`. Create accepts exactly `{ "propertyId":"<property id or public reference>", "serviceFeeMode":"upfront|deferred", "operationKey":"<8..128 URL-safe characters>" }`; `serviceFeeMode` defaults to `upfront`. The current active owner profile needs `payment.initiate`; organization profiles also require current signatory authority. Creation requires request-bound step-up and returns `201` (or `200` for idempotent reuse) with `{ "order": { "id", "propertyId", "ownerProfileId", "state", "currency", "amountMinor", "serviceFeeMode", "paymentId", "paymentReference", "providerSettlementState", "verificationId", "version", "createdAt", "updatedAt" }, "payment": { "id", "reference", "state", "redirectUrl" }, "idempotent": false }`. An uncertain initialization returns `503 PAYMENT_INITIALIZATION_OUTCOME_UNKNOWN`; reuse the same `operationKey` and reconcile the same reference, never create a replacement order blindly. Read returns `{ "order": <same safe order DTO> }` and is scoped to the current payer profile. Provider-confirmed payment moves the order to `paid`; submitting `POST /api/title-verifications` must include the returned `feeOrderId`, and the service links the order only to a matching property and current owner profile. Provider settlement remains `unconfirmed` until the relevant provider evidence is reconciled.

### Fee-line ledger and Finance reads

Successful property purchase and installment fulfillment records immutable FP-06 fee lines keyed by payment, source and mode/tranche. Each line records the approved fee schedule revision, base, payer split, VAT, source and provider-collection state. `status:"collected"` means the payment has been confirmed; it does not claim that Monnify completed recipient settlement. A split line has `settlementStatus:"unconfirmed"` until beneficiary-level settlement evidence is available. Finance can reconcile merchant-level settlement transactions, but that reconciliation does not prove each beneficiary received its split.

`GET /api/admin/revenue/fee-lines?from=<ISO>&to=<ISO>&feeCode=FP-06&currency=NGN&status=collected&limit=50&after=<id>` returns `{ "feeLines": [ { "id", "feeCode", "stream", "mode", "scheduleRevision", "sourceType", "sourceId", "paymentReference", "propertyId", "unitId", "payerRule", "payerType", "payerProfileType", "payerProfileStructure", "buyerProfileType", "buyerProfileStructure", "sellerProfileType", "sellerProfileStructure", "state", "currency", "fxRate", "baseMinor", "quantity", "basis", "ratePercent", "band", "netMinor", "vatMinor", "grossMinor", "buyerMinor", "sellerMinor", "status", "settlementStatus", "settledAt", "recognizedAt" } ], "nextCursor": null }`. `from` and `to` are required and the range may not exceed 366 days. `limit` defaults to 50 and is bounded to 100. Authentication requires the current selected staff profile, `payment.read`, Finance department and a non-Internal-Audit context. The route is read-only and private/no-store. Optional profile structure and FX rate are null when not present on the source transaction.

`GET /api/admin/revenue/reconciliation?from=<ISO>&to=<ISO>` returns grouped fee-line totals and counts of paid FP-06 transactions that are missing ledger lines. `providerSettlementReconciliation` is `merchant_level_transactions_can_be_reconciled;split_beneficiary_settlement_unconfirmed`. Errors use the normal `{message,code}` envelope; range/query errors use `INPUT_REVENUE_REPORT_INVALID` or `INPUT_REVENUE_REPORT_RANGE_INVALID`, and current staff failures use the standard 401/403 authorization errors.

`GET /api/admin/revenue/report?from=<ISO>&to=<ISO>` returns charge totals and totals net of recorded credit notes/refunded fee lines grouped by recognized month, fee product, stream, state and currency. Each `earned[]` row includes `chargedGrossMinor`, `chargedNetMinor`, `chargedVatMinor`, `refundedOrCreditedGrossMinor`, `grossAfterAdjustmentsMinor`, `netAfterAdjustmentsMinor`, and `vatAfterAdjustmentsMinor`. Payer groups include buyer, seller and profile-billed plan/seat amounts. The response identifies adjustment coverage as `recorded_refunds_and_issued_credit_notes_applied; waivers_not_yet_recorded`; it does not infer unrecorded waivers or missing product lines. Provider status is `merchant_level_transactions_can_be_reconciled;split_beneficiary_settlement_unconfirmed`. The Finance-only date range is bounded to 366 days.

Exact report envelope: `{from,to,earned,payerAmounts,providerCharges,receivables,revenueRecognition,adjustmentCoverage,providerSettlementReconciliation}`. Each `earned` row has `_id:{year,month,feeCode,stream,state,currency}`, `feeLines`, `chargedGrossMinor`, `chargedNetMinor`, `chargedVatMinor`, `refundedOrCreditedGrossMinor`, `netAfterAdjustmentsMinor`, `vatAfterAdjustmentsMinor`, and `grossAfterAdjustmentsMinor`. Each `payerAmounts` row has `_id:{year,month,feeCode,stream,currency,payer,profileType,profileStructure}` and `amountMinor`. Each `providerCharges` row has `_id:{year,month,currency}`, `reconciledPayments`, `grossMinor`, `settlementMinor`, and `providerChargesMinor`. `receivables` contains `deferredFees[]` rows `{_id:{feeCode,currency,payerType,profileType},receivableLines,amountMinor}` and `defaultingSellerFeeRecoveries[]` rows `{_id:{currency,state},receivables,originalMinor,recoveredMinor,outstandingMinor}`. Monetary fields are minor units; the backend returns grouped data for the requested bounded date range, not paginated transaction-level data.

`GET /api/admin/revenue/reconciliation?from=<ISO>&to=<ISO>` returns `{from,to,feeLines:[{currency,status,settlementStatus,count,grossMinor,netMinor,vatMinor}],expectedTransactionFeePayments,paymentsWithRecordedLines,paymentsMissingFeeLines,providerCharges:[{currency,reconciledPayments,grossMinor,settlementMinor,providerChargesMinor}],sellerDefaultFeeReceivables:[{currency,state,count,originalMinor,recoveredMinor,outstandingMinor}],providerSettlementsPending,providerSettlementReconciliation}`. This is an operational reconciliation summary, not an all-products chart-of-accounts export.

`GET /api/admin/revenue/provider-settlement-lines?from=<ISO>&to=<ISO>&currency=NGN&limit=50&before=<id>` exposes merchant-level settlement evidence per matched payment. It returns `{ "settlements": [{ "id", "provider", "settlementReference", "paymentId", "paymentReference", "providerTransactionReference", "currency", "grossMinor", "settlementMinor", "providerChargesMinor", "reconciledAt" }], "nextCursor": null, "reconciliationScope": "merchant_level_only;beneficiary_split_settlement_unconfirmed" }`. It is current-Finance-only, selected-profile scoped, excludes Internal Audit, and is private/no-store. This endpoint remains scoped to merchant settlement reconciliation and does not replace the separate per-beneficiary escrow settlement DTO at `GET /api/escrow/:id/settlement`.

`GET /api/admin/revenue/provider-settlements?from=<ISO>&to=<ISO>&after=<eventId>&limit=50` lists private Monnify settlement webhook records. `POST /api/admin/revenue/provider-settlements/:id/reconcile` requires current Finance `finance.manage`, a selected staff profile, and `X-Step-Up-Challenge`; request body is `{}`. It fetches `GET /api/v1/transactions/find-by-settlement-reference` in bounded 100-row pages (maximum set by `MONNIFY_SETTLEMENT_RECONCILIATION_MAX_PAGES`, default `100`), matches each provider transaction to an internal paid Monnify payment by reference, currency and amount, and persists safe aggregates/discrepancies. The response includes `state`, `providerTransactionCount`, `matchedInternalPayments`, `providerGrossMinor`, `providerSettlementMinor`, `providerChargesMinor`, `discrepancyCount`, up to 100 `{paymentReference?,code}` samples, and `beneficiarySettlement:"unconfirmed"`. A successful merchant-level comparison remains `verified` with `PAYMENT_SETTLEMENT_BENEFICIARY_RECONCILIATION_REQUIRED`; it never changes `RevenueFeeLine.settlementStatus` or proves that each split sub-account settled.

### Basket provider behavior

Service-cart checkout uses Monnify, not Paystack. Each eligible item contributes a server-derived recipient allocation. The service aggregates identical provider sub-accounts, orders recipients deterministically, and partitions merchant collection into groups of at most five; six distinct recipients therefore reserve two merchant payment parts before provider initialization. An item that spans groups is fulfilled only after every associated part is confirmed paid. Proxy-inspection items remain separate segregated-escrow parts. On a confirmed rejected split or terminally failed merchant payment, the checkout replaces that part with idempotent recipient-specific payment parts while preserving already paid parts and per-item minor-unit allocations. The bounded scheduler first rechecks initialized or outcome-unknown basket references against Monnify using the same reference, then resumes persisted confirmed failed/expired parts if webhook processing did not finish. Replacement initialization is gated on the original checkout account session, current verified buyer-profile authority, confirmed original failure, and an unexpired checkout. Canceled payments are terminal and are not automatically retried. A failed replacement is terminal for that recovery generation; the buyer may start a fresh checkout only where no part remains paid, otherwise Finance reconciliation/retry is required. Unknown provider outcomes stay on their original references. Client metadata cannot select an account or recipient, and unsupported item types remain unavailable. The partitioner supports six distinct server-resolved recipients as two Monnify merchant parts; current mounted basket product handlers still do not originate a six-recipient allocation, so that exact combination remains unavailable until an approved basket product produces those recipient allocations.

Property escrow custody and release use the dedicated `monnifyEscrowClient`, `EscrowSettlement` record, and Finance routes listed above. Each settlement beneficiary has its own transfer reference and state. Reconciliation queries Moniepoint by that reference; a transfer remains `outcome_unknown`/`reconciliation_required` when the provider cannot establish the result, and a new transfer is not issued until its existing reference is reconciled. A beneficiary authorization-code request applies only to a provider transfer that explicitly awaits authorization. Account credentials, custody confirmation, disbursement activation, verified seller/REALTIQ recipients, current fee terms and financial execution controls are required before release. Provider configuration does not replace the approved Console policy or required bank/account setup.

### FP-06 installment VAT cursor

Installment fee tranches now persist cumulative gross and VAT allocation cursors from the locked quote, so retries are idempotent and the final tranche reconciles to the originally locked total without losing minor units. Penalties remain excluded from the fee base.
