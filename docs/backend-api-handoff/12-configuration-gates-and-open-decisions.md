# Configuration gates and open decisions

The APIs below have provider-independent code paths, but some calls deliberately fail closed, defer processing, or fall back to a safe deterministic result until authoritative configuration is active. Configuration does not prove production activation. Values and variable names are taken from `.env.example` and `src/config/firstBatchPolicies.js`; secrets must stay server-side.

## Search, ranking and geography

| Capability | Backend dependency | While unavailable | Frontend behavior |
|---|---|---|---|
| Nearby radius | Approved `SEARCH_NEARBY_MAX_RADIUS_KM` | `/api/properties/map/nearby` is unavailable when no approved maximum is set. | Disable radius search or show returned unavailable state; do not choose a client maximum. |
| Gazetteer suggestions/breadcrumbs | Approved gazetteer revision; `LOCATION_PROVIDER`, `LOCATION_GAZETTEER_SOURCE`, `LOCATION_RESOLUTION_POLICY` | Exact IDs work only where configured; human-name resolution can be unavailable or review-held. | Do not fabricate IDs or persist unresolved text as canonical location. |
| Boundary/map/project-pin validation | `LOCATION_BOUNDARY_SOURCE`, approved GeoJSON path plus SHA-256, `PROJECT_PIN_VALIDATION_POLICY`, `UNRESOLVED_LOCATION_POLICY` | Unresolved geometry remains draft/review/unavailable according to readiness response. | Preserve form state and show needs-resolution status; do not draw a pin as committed. |
| Site-plan markers | `SITE_PLAN_COORDINATE_MODE`, `SITE_PLAN_MARKER_MIN`, `SITE_PLAN_MARKER_MAX`, `SITE_PLAN_MARKER_OUT_OF_BOUNDS_POLICY`; marker also binds to approved master-plan version and stable unit | Write/read availability follows current site-plan policy and verified media binding. | Do not submit guessed coordinates or invent a missing master plan. |
| USD/FX comparisons | `FX_RATE_PROVIDER`, `FX_CONVERSION_ENABLED`, `FX_MAX_RATE_AGE_MINUTES`, `FX_MISSING_RATE_POLICY`, `FX_SUPPORTED_CURRENCIES`; approved timestamped rates required | No fabricated conversion; conversion excluded or price query fails according to policy. | Preserve original amount/currency; do not convert in the browser. |
| POA and reserve | `LISTING_POA_PUBLICATION_POLICY`, `LISTING_POA_FILTER_POLICY`, `LISTING_POA_SORT_POLICY`, `LISTING_RESERVE_VISIBILITY=private`, `LISTING_POA_RESERVE_CONFLICT_POLICY` | Reserve remains private; unresolved POA/reserve conflict blocks the affected decision. | Show only public POA label; never show reserve. |
| Physical-property size duplicate signal | `PROPERTY_DUPLICATE_SIZE_TOLERANCE_PERCENT` empty by default; manual-review policies; automatic merge disabled | Size-threshold signal disabled; independent matching evidence/manual review remains. | Do not infer geographic identity or merge candidates. |
| Commute | `MAPBOX_ACCESS_TOKEN`, `MAPBOX_COMMUTE_PROFILE`, `MAPBOX_COMMUTE_MAX_DESTINATIONS`, provider approval | Commute filter is safely unavailable if routing cannot be authorized/configured. | Disable or label unavailable; straight-line distance is not travel time. |
| Recommended ranking | Approved Console `recommended_weights`, `profile_completeness_criteria`, approved `sponsored_placements` records and current eligible advertiser/listing | Missing required positive-weight signals discard partial scores, return `RECOMMENDED_SIGNAL_UNAVAILABLE`, and fall back deterministically to newest. | Render response notice; never locally calculate completeness or grant Sponsored state. `Featured` is editorial, not paid Sponsored eligibility. |
| Daily/weekly saved-search alert cadence | Approved versioned Console `saved_search_cadence` policy. Worker interval is operational polling, not an approved cadence. | Daily/weekly matching defers without moving its cursor; instant behavior remains separate. | Show saved cadence and pending/unavailable state returned by API; do not promise delivery time. |
| Freshness/trust | Current evidence plus approved Console policies/cadence | Signals are unavailable or cause safe fallback; no client-submitted score is authority. | Render only returned evidence-backed state. |

## Documents, verification and providers

Private document processing depends on private encrypted storage/keyrings, an approved storage adapter, malware scanning (such as configured ClamAV), inspection, and protected renderer resources. `.env.example` includes `CLOUDINARY_*` provider settings where used, scanner settings, `LEGACY_MEDIA_ROOT`, `LEGACY_MEDIA_KEYS`, `LEGACY_MEDIA_ACTIVE_KEY`, `MEDIA_FFPROBE_PATH`, and data-protection export root/key settings. Missing scanner/storage configuration keeps content quarantined or unavailable; it never permits use of an unprotected provider URL.

KYC and organization verification use current policy and staff review. A frontend can submit the case and evidence, but cannot set a profile to verified; render the server-returned case state and blockers. Missing provider/policy activation leaves the case pending/unavailable or limits eligibility according to the backend state.

Paystack activation requires server credentials such as `PAYSTACK_SECRET_KEY`, configured callbacks/webhooks, and approved seat/publication plans. A browser callback is not proof of payment. Keep purchase state pending until the backend confirms it or exposes reconciliation state.

Email, SMS, WhatsApp and push delivery require provider credentials and configured receipts (`POSTMARK_*`, `TERMII_*`, `FCM_SERVICE_ACCOUNT_JSON`). In-app notification persistence can operate independently. A provider accepted/queued status is not a delivery receipt.

## Data-rights deletion and retention

`.env.example` includes operational retention proposals and worker limits: `PRIVACY_ACCOUNT_RETENTION_DAYS`, `PRIVACY_INACTIVE_ACCOUNT_RETENTION_DAYS`, `PRIVACY_KYC_RETENTION_DAYS`, `PRIVACY_FINANCIAL_RECORD_RETENTION_DAYS`, `PRIVACY_TRANSACTION_RETENTION_DAYS`, `PRIVACY_AUDIT_LOG_RETENTION_DAYS`, `PRIVACY_SUPPORT_RECORD_RETENTION_DAYS`, `PRIVACY_NOTIFICATION_RETENTION_DAYS`, `PRIVACY_EXPORT_EXPIRY_HOURS`, `PRIVACY_DELETION_GRACE_DAYS`, `PRIVACY_LEGAL_HOLD_ENFORCEMENT_ENABLED`, `PRIVACY_DELETION_EXECUTION_ENABLED`, `PRIVACY_REQUIRE_RETENTION_POLICY_APPROVAL`, `PRIVACY_RETENTION_POLICY_VERSION`, `PRIVACY_DELETION_BATCH_SIZE`, and privacy worker lease/retry settings. Proposed defaults are operational settings, not legal advice or a declaration of compliance.

Destructive execution is disabled by default (`PRIVACY_DELETION_EXECUTION_ENABLED=false`) and additionally requires an approved current retention policy and no active record-specific legal hold. Requests may still be submitted, classified, reviewed and prepared; policy-held outcomes are visible in job results. Frontend must render per-record completed/preserved/blocked outcomes and must not promise every record will be erased. Financial, ownership, title, legal and evidentiary records remain preserved where retention requires it.

## Source decisions and limits

1. RQS-02/RQS-03 describe 16 construction milestones while the named source list contains 15. No sixteenth enum was invented. The API dictionary is authoritative for accepted values until the source owner resolves the mismatch.
2. The source says “small” physical-size duplicate tolerance but gives no numeric value. Size-dependent threshold matching stays disabled until an authoritative value is approved.
3. Ranking weights and profile-completeness criteria are versioned Console policies. No default score is fabricated. Approved placement records, not client flags/payment records, establish Sponsored state.
4. Nearby radius, daily/weekly cadence, site-plan marker semantics, boundary/gazetteer licensing, FX source/fallback, and verification/freshness thresholds require authoritative configuration. Safe unavailable behavior is already part of the API contract.

## Activation checklist

- [ ] Configure approved private storage, encryption keys, scanner and protected renderer resources.
- [ ] Approve/load gazetteer and boundary data; activate Mapbox only after licensing/data-handling approval.
- [ ] Approve FX source/rates and freshness policy.
- [ ] Approve Console ranking, completeness, sponsored placement, alert cadence, trust and freshness policies.
- [ ] Set nearby radius and duplicate-size tolerance only after source approval.
- [ ] Load verified seat/publication plans and activate Paystack credentials/webhook.
- [ ] Configure notification providers and verified delivery receipts.
- [ ] Obtain legal approval for retention schedule before enabling deletion.
- [ ] Roll out required indexes, migrations and existing-record reconciliation through deployment procedures; none were executed for this handoff.



## Shared contract references

Contract cross-reference: gated DTO/response behavior is indexed in [15-api-dto-and-schema-reference.md](15-api-dto-and-schema-reference.md) and [16-api-response-variation-matrix.md](16-api-response-variation-matrix.md); applicable UI sequences are in [17-end-to-end-frontend-workflows.md](17-end-to-end-frontend-workflows.md).
