# Group 04 — Revenue and Payment Foundations frontend handoff

Date: 10 Nov 2026; contract-update reconciliation: 11 Nov 2026. Sources: the locally supplied `docs/section_04_api_docs.md`, Group 04 frontend prompt, and the user-supplied “Group 04 — Billing, Campaign and Finance Execution Contract Update”. This records source and mock-test integration only; no live backend or provider acceptance was performed.

Verdict: **PARTIAL**. The documented screens and safe mutations listed below are integrated and focused tests pass. The contract-limited UI items in this report still prevent complete first-batch Group 04 coverage.

## Implemented frontend surfaces

| Contract family | Frontend entry and behavior |
| --- | --- |
| Unified seat catalogue and purchases | Organization Management reads current seat plans, memberships and purchase pages; submits returned plan key and monthly/annual term with a stable operation key and bound step-up; exposes purchase detail/audit, cancel and reconcile without assuming entitlement from a redirect. |
| Publication plans | Profile Billing shows server terms, net/VAT/gross and entitlements, current usage, purchases and upgrade quotes. Purchases, cancellation and reconciliation use bound step-up. Pending purchases block another purchase. |
| Renewal | Profile Billing and Organization Management read the server's additive `renewalAvailability` projection on publication and seat catalogues. The preference editors offer manual and only the currently returned provider methods; active reusable authorizations are selected for automatic renewal. Purchase forms can request saved-card authorization with `saveAuthorizationForRenewal: true` when the server says authorization is required. Direct Debit setup, revocation and disable retain bound step-up. Seat preferences use the paid membership ID and latest preference version. Backend configuration remains authoritative. |
| Revenue documents | Profile Billing lists profile-scoped invoices, receipts and credit notes; an issued invoice can start a protected payment with a retained operation key. Neither a redirect nor a credit note is treated as paid or spendable. |
| Profile payout setup | Profile Billing shows policy/provider readiness, masked destination, history, and protected setup, reconcile and revoke actions. No full account number is rendered after submission. |
| Safe payment reads | Buyer, seller and Finance payment histories use `GET /api/payments?page&limit` with header pagination, at most 100 rows per page. Buyer/admin detail views use the safe payment projection. Finance export uses protected `POST /api/payments/export.csv` with `{limit:2000}`; pending cancellation uses protected `PATCH /api/admin/payments/:id/cancel`. |
| USD agreement | Buyer property and installment flows can propose an NGN payable amount for a USD listing/schedule; the seller confirms the current version. The buyer can only submit a confirmed, unexpired, unconsumed `fxConfirmationId`. No browser exchange rate is calculated. |
| Direct property/installment payment | Existing initialization uses the bound step-up request and current buyer profile. Added FP-06 payer rule/share validation and USD confirmation fields. Provider redirects remain pending until the server verifies payment. |
| Service cart | Buyer checkout now follows the returned Monnify `paymentParts`, keeps the checkout reference through partial payment, displays each part and its own reference, and opens only an initialized part's HTTPS URL. A saved unknown reference is checked through the documented buyer-history `paymentReference` filter and its local block is cleared only when that exact checkout is returned without an unresolved part. Title-document eligibility and checkout remain server-authoritative. Paid tours remain unavailable. |
| Title verification fee | Owner title screen requests a state-band quote after an explicit upfront/deferred choice. It creates a protected fee order with a retained operation key, reloads that order, and permits title-case submission only with the matching paid `feeOrderId`. |
| Campaign budgets | Profile Billing now uses the seller's existing listing read followed by `GET /api/profiles/current/promotion-campaigns/eligible-placements?propertyId=...`. The create form uses only returned placements, billing events, currency availability and bid/budget limits, then binds the exact create body to step-up. It also exposes current balances, a cursor-paged ledger, protected top-ups and end/refund/transfer actions. The operation key is retained while funding is pending; a campaign balance is never represented as an account wallet. |
| Finance reporting | Finance Revenue shows server aggregates, fee lines, reconciliation, merchant settlement lines, provider-settlement webhook events and the product refund queue. Event pagination preserves the opaque cursor. Per-event reconcile is step-up protected and never labels merchant matching as beneficiary settlement. Decisions and bounded refund/document reconciliation retain step-up. |
| Escrow and inspection Finance execution | Finance-authorized escrow detail reads beneficiary settlement and segregated refund execution. Inspection Finance execution reads proxy settlement and single-transfer refund records. All panels use server `actionEligibility`, masked destinations, provider-reference/state refresh and bound per-action step-up; a 202 or ambiguous response never confirms a transfer. |
| Console policies | Added the eight Group 04 policy keys to the existing registry with documented field schemas, preserved pending-versus-approved revision state and the existing bound step-up and independent-decision workflow. |

## 11 Nov contract-update route trace

| Backend contract | Frontend consumer | Confirmed UI behavior |
| --- | --- | --- |
| `GET /api/profiles/current/publication-plans`, `GET /api/profiles/current/seat-plans` | Profile Billing; Organization Management and seat renewal preferences | Reads additive `renewalAvailability`; manual remains separate, unavailable methods show their reason and cannot be selected. |
| `GET /api/profiles/current/promotion-campaigns/eligible-placements?propertyId=...`, `POST /api/profiles/current/promotion-campaigns` | Profile Billing campaign form | Uses only a selected owned listing and current returned placements, events, currency rules and limits; POST uses one bound challenge and stable operation key. |
| `GET /api/admin/revenue/provider-settlements?from=...&to=...&after=...&limit=50`, `POST /api/admin/revenue/provider-settlements/:id/reconcile` | Finance Revenue event list | Uses server cursor, shows merchant-only evidence and discrepancies; per-event POST sends `{}` with bound step-up, then reloads the event list. |
| `GET /api/escrow/:id/settlement`, its reconcile and beneficiary authorization POSTs; `GET /api/admin/escrows/:id/refund-execution` and its POSTs | Admin escrow detail | Reads masked beneficiary state and `actionEligibility`; provider code is separate from authenticator code; refreshes after actions or ambiguous outcomes. |
| `GET /api/admin/proxy-inspections/:id/settlement`, `GET /api/admin/proxy-inspections/:id/refund-execution`, and their reconcile/authorization POSTs | Admin inspection workspace and Finance execution route | Uses request ID, safe masked DTOs and eligibility; proxy refund authorization has no beneficiary selector or ID in its path/body. |

These rows are documented and source-integrated with frontend mocks. They have not been accepted against a live backend or provider.

## Changed frontend files

- Routes and navigation: `src/routes/AppRoutes.tsx`; `src/components/layout/{AdminLayout,BuyerPortalLayout,LandlordPortalLayout}.tsx`.
- New screens/panels: `src/pages/dashboard/{ProfileBilling,Admin/FinanceRevenue,Admin/ProxyFinanceExecution}.tsx`; `src/components/billing/{ProfilePayoutSetup,ProfileCampaigns,PropertyFxAgreement,ProviderSettlementEvents,SeatRenewalPreferences}.tsx`; `src/components/escrow/{EscrowFinanceSettlement,FinanceExecutionPanel}.tsx`.
- Updated screens: `src/pages/dashboard/{OrganizationManagement,Installments,Escrow/EscrowDetails,Admin/AdminPaymentDetails,Admin/ManagePayments,Buyer/CartCheckoutDetail,Buyer/PaymentDetails,Buyer/PaymentHistory,Buyer/ServiceCart,Landlord/LandlordPaymentHistory,Landlord/LandlordTitleVerifications}.tsx`; `src/pages/public/{PropertyDetails,PostPaymentRedirect}.tsx`; `src/components/admin/AdminPolicyValueEditor.tsx`.
- API, contracts and formatting: `src/services/{revenueFoundationService,renewalAvailability,financeRevenueService,financeExecutionService,escrowFinanceSettlementService,fxAgreementService,promotionCampaignService,organizationManagementService,paymentService,titleVerificationService,adminPolicyRegistry,adminPolicyForm,adminPolicyService}.ts`; `src/hooks/usePaymentPage.ts`; `src/utils/{moneyMinor,cartFormatters,cartCheckoutRecovery}.ts`; `src/types/index.ts`; `src/services/cartService.test.ts`.
- Focused tests cover these services and surfaces in the corresponding `*.test.ts` and `*.test.tsx` files, including new billing, campaign, settlement, FX, cart, payment pagination and formatting tests. The supplied `docs/section_04_api_docs.md` remains unmodified.

## Contract-limited or unfinished UI

| Item | Exact limit or remaining work |
| --- | --- |
| General fee quote presentation | `POST /api/payments/fee-quotes` is typed and mock-tested. There is no generic customer flow supplying an authoritative FP fee base and explicit mode/payer terms; no listing-price or fee defaults were invented. A source-specific entry point is still needed. |
| Finance-only inspection discovery | The contract supplies per-request proxy settlement/refund GET routes but no Finance-scoped inspection directory or request search. Finance Revenue permits opening a known inspection request ID; Finance-only staff cannot discover requests from that page. The existing network directory is capability-gated separately. |
| Checkout with no recoverable reference | New payment-return failures retain the exact provider reference and search checkout history by that reference. The remaining edge case is a legacy local “unknown” marker created before a reference was saved; it cannot be safely matched to a checkout. It stays blocked and points the buyer to checkout history/support rather than permitting a potentially duplicate charge. |
| Live provider activation | Approved Console policies, Paystack and Monnify/Moniepoint credentials, callbacks, recipient setup, and settlement report ingestion remain environment/backend dependencies. Mock tests do not establish that any payment can be collected, refunded or settled. |

## Safety and evidence

Multi-part checkout status and payment references are displayed and reconciled by the existing return/history flow. Replacement parts are generated by the backend for eligible confirmed failures; unknown outcomes retain their original reference and must be reconciled. The absence of a browser “force another charge” action is intentional under this contract, not unfinished recovery UI.

- Money from Group 04 fee, plan, campaign, payout and Finance DTOs is formatted from integer minor units. Legacy payment and checkout reads retain their documented major-unit formatting.
- Bound step-up uses the existing auth client and selected profile. Financial mutation bodies are fixed before challenge initiation and the challenge is consumed locally before the protected request.
- An unknown provider result retains the original reference or operation key. A confirmed payment part is not shown as a completed checkout; an accepted upload/title order/purchase is not shown as an entitlement or approved verification.
- Campaign ledger and billing-document pagination ignore responses from an older selection or refresh, so a stale page cannot replace current profile-scoped records.
- Staff and profile visibility are presentation gates; the server still checks session, selected profile, department, resource, version and separation of duties.
- All evidence is source review and focused frontend mocks. No live backend or provider calls were made.

## Verification

The prior Group 04 report recorded a 28-file, 143-test pass. For the 11 Nov contract update, a first 12-file focused run exited 1 (47 passed, one test failed because the bid field's accessible label includes its minimum); the final 12-file run passed 53/53, exit 0. Node's sandboxed Windows startup returned `EPERM` before test discovery; the same focused command ran successfully with the test process outside that file sandbox. TypeScript, edited-file ESLint and `git diff --check` exited 0. The full suite, production build, live backend and payment providers were not run.
