# Mounted first-batch and adjacent frontend API endpoint index

This index is generated from the Express mount table in `src/app.js` and literal route declarations in mounted `src/routes/*Routes.js` files. Each row has the exact method, full mounted path, source file/line and integration guide. The route/controller/service remains authoritative for payload, permissions and errors. This index is a navigation/inventory aid; a mounted route alone does not prove runtime availability or imply it should receive a UI. Classification is source-informed but not a product release manifest: unclear routes need scope confirmation before frontend work.

**Inventory count:** 594 mounted HTTP registrations identified: 592 literal path registrations plus 2 provider-loop paths (Postmark and Termii). Source-informed classifications: 332 first-batch frontend-facing, 79 first-batch staff-facing, 66 compatibility aliases, 4 deprecated/legacy routes, 51 operational/internal, 3 provider callbacks, 4 unclear staff/admin scope, and 55 other unclear scope. There are 0 routes explicitly tagged Later-batch because no route-level batch tag exists in the source; unclear routes must not be assumed first-batch or later-batch. The document router is intentionally mounted under both `/api/document` and `/api/documents`; both aliases appear. These are registrations, not distinct business operations or the number of first-batch requirements.

| Method | Full mounted path | Route source | Classification | Contract guide |
|---|---|---|---|
| GET | `/api/admin/cart-checkouts` | `src/routes/adminRoutes.js:98` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/cart-checkouts/:checkoutId` | `src/routes/adminRoutes.js:99` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/cart-checkouts/:checkoutId/retry-allocations` | `src/routes/adminRoutes.js:100` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/company-verification-cases` | `src/routes/adminRoutes.js:7` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/company-verification-cases/:id` | `src/routes/adminRoutes.js:8` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/company-verification-cases/:id/claim` | `src/routes/adminRoutes.js:11` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/company-verification-cases/:id/decision` | `src/routes/adminRoutes.js:12` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/company-verification-cases/:id/evidence/:evidenceId/content` | `src/routes/adminRoutes.js:10` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/company-verification-cases/:id/history` | `src/routes/adminRoutes.js:9` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/data-protection-requests` | `src/routes/adminRoutes.js:56` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/data-protection-requests/:id` | `src/routes/adminRoutes.js:57` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/data-protection-requests/:id/decision` | `src/routes/adminRoutes.js:60` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/data-protection-requests/:id/execution` | `src/routes/adminRoutes.js:59` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/data-protection-requests/:id/history` | `src/routes/adminRoutes.js:58` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/data-protection-requests/:id/notice/reconcile` | `src/routes/adminRoutes.js:61` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/distress-sale-assessments` | `src/routes/adminRoutes.js:76` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/distress-sale-assessments/:id/decision` | `src/routes/adminRoutes.js:78` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/distress-sale-assessments/:id/evidence` | `src/routes/adminRoutes.js:77` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/duplicate-property-matches` | `src/routes/adminRoutes.js:72` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/duplicate-property-matches/:id/decision` | `src/routes/adminRoutes.js:75` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/duplicate-property-matches/:id/evidence` | `src/routes/adminRoutes.js:73` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/duplicate-property-matches/:id/evidence/:documentId` | `src/routes/adminRoutes.js:74` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/escrow-disputes` | `src/routes/adminRoutes.js:112` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/escrow-disputes/:disputeId` | `src/routes/adminRoutes.js:113` | First-batch staff-facing | 09-admin-console-and-policies.md |
| PATCH | `/api/admin/escrow-disputes/:disputeId/resolve` | `src/routes/adminRoutes.js:114` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/escrows/:id/process-refund` | `src/routes/adminRoutes.js:115` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/gazetteer/revisions` | `src/routes/adminRoutes.js:68` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/gazetteer/revisions` | `src/routes/adminRoutes.js:69` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/gazetteer/revisions/:id/decision` | `src/routes/adminRoutes.js:71` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/gazetteer/revisions/:id/entries` | `src/routes/adminRoutes.js:70` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/gazetteer/status` | `src/routes/adminRoutes.js:67` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/legal-holds` | `src/routes/adminRoutes.js:63` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/legal-holds` | `src/routes/adminRoutes.js:64` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/legal-holds/:id` | `src/routes/adminRoutes.js:65` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/legal-holds/:id/release` | `src/routes/adminRoutes.js:66` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/listing-accuracy-reports` | `src/routes/adminRoutes.js:83` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/listing-accuracy-reports/:id/resolve` | `src/routes/adminRoutes.js:84` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/listing-verifications` | `src/routes/adminRoutes.js:80` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/listing-verifications/:id/decision` | `src/routes/adminRoutes.js:82` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/listing-verifications/:id/evidence/:documentId` | `src/routes/adminRoutes.js:81` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/notification-deliveries` | `src/routes/adminRoutes.js:86` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/notification-deliveries/:deliveryId/reconcile` | `src/routes/adminRoutes.js:87` | First-batch staff-facing | 09-admin-console-and-policies.md |
| PATCH | `/api/admin/payments/:id/cancel` | `src/routes/adminRoutes.js:97` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/policies/:key` | `src/routes/adminRoutes.js:89` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/policies/:key/history` | `src/routes/adminRoutes.js:90` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/policies/:key/revisions` | `src/routes/adminRoutes.js:91` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/policies/:key/revisions/:revisionId/:decision` | `src/routes/adminRoutes.js:92` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/profile-signatories/:id/review` | `src/routes/adminRoutes.js:20` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/profile-type-changes/:id/review` | `src/routes/adminRoutes.js:25` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/projects` | `src/routes/adminRoutes.js:101` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/projects/:id` | `src/routes/adminRoutes.js:102` | First-batch staff-facing | 09-admin-console-and-policies.md |
| PATCH | `/api/admin/projects/:id/featured` | `src/routes/adminRoutes.js:104` | First-batch staff-facing | 09-admin-console-and-policies.md |
| PATCH | `/api/admin/projects/:id/status` | `src/routes/adminRoutes.js:103` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/property-imports` | `src/routes/adminRoutes.js:105` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/property-imports/:id` | `src/routes/adminRoutes.js:106` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/proxy-inspections` | `src/routes/adminRoutes.js:121` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/proxy-inspections/:id` | `src/routes/adminRoutes.js:122` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/proxy-inspections/:id/release-payment` | `src/routes/adminRoutes.js:123` | First-batch staff-facing | 09-admin-console-and-policies.md |
| PATCH | `/api/admin/proxy-inspections/:id/resolve-dispute` | `src/routes/adminRoutes.js:124` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/proxy-inspectors` | `src/routes/adminRoutes.js:116` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/proxy-inspectors/:id` | `src/routes/adminRoutes.js:117` | First-batch staff-facing | 09-admin-console-and-policies.md |
| PATCH | `/api/admin/proxy-inspectors/:id/reactivate` | `src/routes/adminRoutes.js:120` | First-batch staff-facing | 09-admin-console-and-policies.md |
| PATCH | `/api/admin/proxy-inspectors/:id/review` | `src/routes/adminRoutes.js:118` | First-batch staff-facing | 09-admin-console-and-policies.md |
| PATCH | `/api/admin/proxy-inspectors/:id/suspend` | `src/routes/adminRoutes.js:119` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/roi/assumptions` | `src/routes/roiRoutes.js:43` | Unclear (staff/admin scope) | this index (ROI/market tools) |
| GET | `/api/admin/search` | `src/routes/adminSearchRoutes.js:16` | Unclear (staff/admin scope) | 09-admin-console-and-policies.md |
| PATCH | `/api/admin/settings/virtual-tours` | `src/routes/adminRoutes.js:107` | Unclear (staff/admin scope) | 09-admin-console-and-policies.md |
| GET | `/api/admin/staff-access-changes` | `src/routes/adminRoutes.js:26` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/staff-access-changes` | `src/routes/adminRoutes.js:27` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/staff-access-changes/:id/decision` | `src/routes/adminRoutes.js:28` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/stats` | `src/routes/adminRoutes.js:94` | Unclear (staff/admin scope) | 09-admin-console-and-policies.md |
| GET | `/api/admin/verification-cases` | `src/routes/adminRoutes.js:14` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/verification-cases/:id` | `src/routes/adminRoutes.js:15` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/verification-cases/:id/claim` | `src/routes/adminRoutes.js:18` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/admin/verification-cases/:id/decision` | `src/routes/adminRoutes.js:19` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/verification-cases/:id/evidence/:evidenceId/content` | `src/routes/adminRoutes.js:17` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/verification-cases/:id/history` | `src/routes/adminRoutes.js:16` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/virtual-tours` | `src/routes/adminRoutes.js:109` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/virtual-tours/:propertyId` | `src/routes/adminRoutes.js:111` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/virtual-tours/:propertyId/history` | `src/routes/adminRoutes.js:110` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/virtual-tours/providers/health` | `src/routes/adminRoutes.js:108` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/wallet` | `src/routes/adminRoutes.js:95` | First-batch staff-facing | 09-admin-console-and-policies.md |
| GET | `/api/admin/wallet/transactions` | `src/routes/adminRoutes.js:96` | First-batch staff-facing | 09-admin-console-and-policies.md |
| POST | `/api/analytics/access/initialize-payment` | `src/routes/analyticsRoutes.js:11` | Unclear | this index (analytics access) |
| GET | `/api/analytics/access/status` | `src/routes/analyticsRoutes.js:10` | Unclear | this index (analytics access) |
| POST | `/api/analytics/activity/search` | `src/routes/analyticsRoutes.js:12` | Unclear | this index (analytics access) |
| GET | `/api/analytics/property-heatmap` | `src/routes/analyticsRoutes.js:13` | Unclear | this index (analytics access) |
| GET | `/api/analytics/property-market-summary` | `src/routes/analyticsRoutes.js:14` | Unclear | this index (analytics access) |
| GET | `/api/analytics/property-price-trends` | `src/routes/analyticsRoutes.js:15` | Unclear | this index (analytics access) |
| GET | `/api/auth/account` | `src/routes/authRoutes.js:20` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| POST | `/api/auth/forgot-password` | `src/routes/authRoutes.js:35` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| POST | `/api/auth/login` | `src/routes/authRoutes.js:18` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| POST | `/api/auth/login/second-factor` | `src/routes/authRoutes.js:19` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| POST | `/api/auth/logout` | `src/routes/authRoutes.js:40` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| POST | `/api/auth/phone-verification` | `src/routes/authRoutes.js:24` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| DELETE | `/api/auth/phone-verification/:id` | `src/routes/authRoutes.js:28` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| GET | `/api/auth/phone-verification/:id` | `src/routes/authRoutes.js:26` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| POST | `/api/auth/phone-verification/:id/verify` | `src/routes/authRoutes.js:27` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| GET | `/api/auth/phone-verification/history` | `src/routes/authRoutes.js:25` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| POST | `/api/auth/register` | `src/routes/authRoutes.js:15` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| POST | `/api/auth/resend-verification` | `src/routes/authRoutes.js:34` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| POST | `/api/auth/reset-password` | `src/routes/authRoutes.js:36` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| GET | `/api/auth/sessions` | `src/routes/authRoutes.js:37` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| DELETE | `/api/auth/sessions/:id` | `src/routes/authRoutes.js:39` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| DELETE | `/api/auth/sessions/others` | `src/routes/authRoutes.js:38` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| POST | `/api/auth/step-up` | `src/routes/authRoutes.js:32` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| POST | `/api/auth/step-up/:id/verify` | `src/routes/authRoutes.js:33` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| GET | `/api/auth/two-step` | `src/routes/authRoutes.js:29` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| POST | `/api/auth/two-step/confirm` | `src/routes/authRoutes.js:31` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| POST | `/api/auth/two-step/enroll` | `src/routes/authRoutes.js:30` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| POST | `/api/auth/verify-email` | `src/routes/authRoutes.js:17` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| GET | `/api/auth/verify-email/:token` | `src/routes/authRoutes.js:16` | First-batch frontend-facing | 01-auth-accounts-profiles.md |
| GET | `/api/avm/v1/properties/:propertyReference/valuations` | `src/routes/avmRoutes.js:15` | Unclear | this index (AVM) |
| POST | `/api/avm/v1/valuations` | `src/routes/avmRoutes.js:13` | Unclear | this index (AVM) |
| GET | `/api/avm/v1/valuations/:reference` | `src/routes/avmRoutes.js:14` | Unclear | this index (AVM) |
| DELETE | `/api/cart` | `src/routes/cartRoutes.js:11` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| GET | `/api/cart` | `src/routes/cartRoutes.js:10` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| POST | `/api/cart/checkout/initialize` | `src/routes/cartRoutes.js:15` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| GET | `/api/cart/checkouts` | `src/routes/cartRoutes.js:18` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| GET | `/api/cart/checkouts/:checkoutId` | `src/routes/cartRoutes.js:19` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| GET | `/api/cart/eligibility` | `src/routes/cartRoutes.js:12` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| POST | `/api/cart/items` | `src/routes/cartRoutes.js:13` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| DELETE | `/api/cart/items/:itemId` | `src/routes/cartRoutes.js:14` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| POST | `/api/contact/messages` | `src/routes/contactRoutes.js:5` | Unclear | this index (contact) |
| GET | `/api/document` | `src/routes/documentRoutes.js:80` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document` | `src/routes/documentRoutes.js:81` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/:id` | `src/routes/documentRoutes.js:99` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/:id/access-requests` | `src/routes/documentRoutes.js:100` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/:id/access-status` | `src/routes/documentRoutes.js:97` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/:id/grant` | `src/routes/documentRoutes.js:101` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/:id/inspection` | `src/routes/documentRoutes.js:95` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/:id/inspection/retry` | `src/routes/documentRoutes.js:96` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/:id/open-viewer` | `src/routes/documentRoutes.js:98` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/access-requests` | `src/routes/documentRoutes.js:92` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/assets/:assetId/inspection` | `src/routes/documentRoutes.js:93` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/assets/:assetId/inspection/retry` | `src/routes/documentRoutes.js:94` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/:id` | `src/routes/documentRoutes.js:76` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/:id/recovery` | `src/routes/documentRoutes.js:77` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/:id/revocation-approval` | `src/routes/documentRoutes.js:79` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/:id/revocation-attestation` | `src/routes/documentRoutes.js:78` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/custody/cases` | `src/routes/documentRoutes.js:33` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/custody/cases/:id/movement` | `src/routes/documentRoutes.js:41` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/custody/cases/:id/movement-discovery` | `src/routes/documentRoutes.js:40` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/custody/cases/:id/review` | `src/routes/documentRoutes.js:34` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/custody/discovery` | `src/routes/documentRoutes.js:32` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/custody/movements/:movementId` | `src/routes/documentRoutes.js:43` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/custody/movements/:movementId/attestation` | `src/routes/documentRoutes.js:45` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/custody/movements/:movementId/decision` | `src/routes/documentRoutes.js:44` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/custody/movements/:movementId/history` | `src/routes/documentRoutes.js:42` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/custody/movements/:movementId/retry` | `src/routes/documentRoutes.js:47` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/custody/movements/:movementId/revocation-approval` | `src/routes/documentRoutes.js:46` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/discovery` | `src/routes/documentRoutes.js:74` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/legacy-discovery` | `src/routes/documentRoutes.js:73` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/legacy-files` | `src/routes/documentRoutes.js:35` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/legacy-files/:id` | `src/routes/documentRoutes.js:70` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/legacy-files/:id/amendment` | `src/routes/documentRoutes.js:62` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/legacy-files/:id/amendment/decision` | `src/routes/documentRoutes.js:63` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/legacy-files/:id/content` | `src/routes/documentRoutes.js:69` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/legacy-files/:id/decision` | `src/routes/documentRoutes.js:37` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/legacy-files/:id/download` | `src/routes/documentRoutes.js:68` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/legacy-files/:id/history` | `src/routes/documentRoutes.js:65` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/legacy-files/:id/mapping` | `src/routes/documentRoutes.js:38` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/legacy-files/:id/proof-content` | `src/routes/documentRoutes.js:67` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/legacy-files/:id/public-content` | `src/routes/documentRoutes.js:66` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/legacy-files/:id/replacements` | `src/routes/documentRoutes.js:49` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/legacy-files/:id/replacements/:replacementId` | `src/routes/documentRoutes.js:50` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/legacy-files/:id/replacements/:replacementId/access-requests` | `src/routes/documentRoutes.js:58` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/legacy-files/:id/replacements/:replacementId/access-requests` | `src/routes/documentRoutes.js:57` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/legacy-files/:id/replacements/:replacementId/access-requests/:grantId/content` | `src/routes/documentRoutes.js:60` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/legacy-files/:id/replacements/:replacementId/access-requests/:grantId/decision` | `src/routes/documentRoutes.js:59` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/legacy-files/:id/replacements/:replacementId/access-requests/:grantId/download` | `src/routes/documentRoutes.js:61` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/legacy-files/:id/replacements/:replacementId/content` | `src/routes/documentRoutes.js:54` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/legacy-files/:id/replacements/:replacementId/decision` | `src/routes/documentRoutes.js:51` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/legacy-files/:id/replacements/:replacementId/public-content` | `src/routes/documentRoutes.js:53` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/legacy-files/:id/replacements/:replacementId/retry` | `src/routes/documentRoutes.js:52` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/legacy-files/:id/replacements/:replacementId/review-content` | `src/routes/documentRoutes.js:55` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/legacy-files/:id/retry` | `src/routes/documentRoutes.js:64` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/legacy-files/review` | `src/routes/documentRoutes.js:36` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/reconciliations` | `src/routes/documentRoutes.js:28` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/reconciliations/:id` | `src/routes/documentRoutes.js:30` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/reconciliations/:id/decision` | `src/routes/documentRoutes.js:31` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/reconciliations/:id/recovery` | `src/routes/documentRoutes.js:29` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/reconciliations/discovery` | `src/routes/documentRoutes.js:26` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/reconciliations/review` | `src/routes/documentRoutes.js:27` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/review` | `src/routes/documentRoutes.js:72` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| GET | `/api/document/private-migrations/review/:id/history` | `src/routes/documentRoutes.js:71` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/private-migrations/sources/:kind/:sourceId` | `src/routes/documentRoutes.js:75` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/projects/:projectId/registered-survey` | `src/routes/documentRoutes.js:86` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/properties/:propertyId/title-upload` | `src/routes/documentRoutes.js:90` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/title-asset-upload` | `src/routes/documentRoutes.js:82` | Legacy/compatibility alias | 06-documents-media-verification.md; this index |
| POST | `/api/document/title-upload` | `src/routes/documentRoutes.js:91` | Legacy/deprecated | 06-documents-media-verification.md; this index |
| GET | `/api/documents` | `src/routes/documentRoutes.js:80` | First-batch frontend-facing | 06-documents-media-verification.md; this index |
| POST | `/api/documents` | `src/routes/documentRoutes.js:81` | First-batch frontend-facing | 06-documents-media-verification.md; this index |
| GET | `/api/documents/:id` | `src/routes/documentRoutes.js:99` | First-batch frontend-facing | 06-documents-media-verification.md; this index |
| POST | `/api/documents/:id/access-requests` | `src/routes/documentRoutes.js:100` | First-batch frontend-facing | 06-documents-media-verification.md; this index |
| GET | `/api/documents/:id/access-status` | `src/routes/documentRoutes.js:97` | First-batch frontend-facing | 06-documents-media-verification.md; this index |
| POST | `/api/documents/:id/grant` | `src/routes/documentRoutes.js:101` | First-batch frontend-facing | 06-documents-media-verification.md; this index |
| GET | `/api/documents/:id/inspection` | `src/routes/documentRoutes.js:95` | First-batch frontend-facing | 06-documents-media-verification.md; this index |
| POST | `/api/documents/:id/inspection/retry` | `src/routes/documentRoutes.js:96` | First-batch frontend-facing | 06-documents-media-verification.md; this index |
| POST | `/api/documents/:id/open-viewer` | `src/routes/documentRoutes.js:98` | First-batch frontend-facing | 06-documents-media-verification.md; this index |
| GET | `/api/documents/access-requests` | `src/routes/documentRoutes.js:92` | First-batch frontend-facing | 06-documents-media-verification.md; this index |
| GET | `/api/documents/assets/:assetId/inspection` | `src/routes/documentRoutes.js:93` | First-batch frontend-facing | 06-documents-media-verification.md; this index |
| POST | `/api/documents/assets/:assetId/inspection/retry` | `src/routes/documentRoutes.js:94` | First-batch frontend-facing | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/:id` | `src/routes/documentRoutes.js:76` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/:id/recovery` | `src/routes/documentRoutes.js:77` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/:id/revocation-approval` | `src/routes/documentRoutes.js:79` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/:id/revocation-attestation` | `src/routes/documentRoutes.js:78` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/custody/cases` | `src/routes/documentRoutes.js:33` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/custody/cases/:id/movement` | `src/routes/documentRoutes.js:41` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/custody/cases/:id/movement-discovery` | `src/routes/documentRoutes.js:40` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/custody/cases/:id/review` | `src/routes/documentRoutes.js:34` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/custody/discovery` | `src/routes/documentRoutes.js:32` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/custody/movements/:movementId` | `src/routes/documentRoutes.js:43` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/custody/movements/:movementId/attestation` | `src/routes/documentRoutes.js:45` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/custody/movements/:movementId/decision` | `src/routes/documentRoutes.js:44` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/custody/movements/:movementId/history` | `src/routes/documentRoutes.js:42` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/custody/movements/:movementId/retry` | `src/routes/documentRoutes.js:47` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/custody/movements/:movementId/revocation-approval` | `src/routes/documentRoutes.js:46` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/discovery` | `src/routes/documentRoutes.js:74` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/legacy-discovery` | `src/routes/documentRoutes.js:73` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/legacy-files` | `src/routes/documentRoutes.js:35` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/legacy-files/:id` | `src/routes/documentRoutes.js:70` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/legacy-files/:id/amendment` | `src/routes/documentRoutes.js:62` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/legacy-files/:id/amendment/decision` | `src/routes/documentRoutes.js:63` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/legacy-files/:id/content` | `src/routes/documentRoutes.js:69` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/legacy-files/:id/decision` | `src/routes/documentRoutes.js:37` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/legacy-files/:id/download` | `src/routes/documentRoutes.js:68` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/legacy-files/:id/history` | `src/routes/documentRoutes.js:65` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/legacy-files/:id/mapping` | `src/routes/documentRoutes.js:38` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/legacy-files/:id/proof-content` | `src/routes/documentRoutes.js:67` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/legacy-files/:id/public-content` | `src/routes/documentRoutes.js:66` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/legacy-files/:id/replacements` | `src/routes/documentRoutes.js:49` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/legacy-files/:id/replacements/:replacementId` | `src/routes/documentRoutes.js:50` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/legacy-files/:id/replacements/:replacementId/access-requests` | `src/routes/documentRoutes.js:58` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/legacy-files/:id/replacements/:replacementId/access-requests` | `src/routes/documentRoutes.js:57` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/legacy-files/:id/replacements/:replacementId/access-requests/:grantId/content` | `src/routes/documentRoutes.js:60` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/legacy-files/:id/replacements/:replacementId/access-requests/:grantId/decision` | `src/routes/documentRoutes.js:59` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/legacy-files/:id/replacements/:replacementId/access-requests/:grantId/download` | `src/routes/documentRoutes.js:61` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/legacy-files/:id/replacements/:replacementId/content` | `src/routes/documentRoutes.js:54` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/legacy-files/:id/replacements/:replacementId/decision` | `src/routes/documentRoutes.js:51` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/legacy-files/:id/replacements/:replacementId/public-content` | `src/routes/documentRoutes.js:53` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/legacy-files/:id/replacements/:replacementId/retry` | `src/routes/documentRoutes.js:52` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/legacy-files/:id/replacements/:replacementId/review-content` | `src/routes/documentRoutes.js:55` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/legacy-files/:id/retry` | `src/routes/documentRoutes.js:64` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/legacy-files/review` | `src/routes/documentRoutes.js:36` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/reconciliations` | `src/routes/documentRoutes.js:28` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/reconciliations/:id` | `src/routes/documentRoutes.js:30` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/reconciliations/:id/decision` | `src/routes/documentRoutes.js:31` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/reconciliations/:id/recovery` | `src/routes/documentRoutes.js:29` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/reconciliations/discovery` | `src/routes/documentRoutes.js:26` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/reconciliations/review` | `src/routes/documentRoutes.js:27` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/review` | `src/routes/documentRoutes.js:72` | Operational/internal | 06-documents-media-verification.md; this index |
| GET | `/api/documents/private-migrations/review/:id/history` | `src/routes/documentRoutes.js:71` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/private-migrations/sources/:kind/:sourceId` | `src/routes/documentRoutes.js:75` | Operational/internal | 06-documents-media-verification.md; this index |
| POST | `/api/documents/projects/:projectId/registered-survey` | `src/routes/documentRoutes.js:86` | First-batch frontend-facing | 06-documents-media-verification.md; this index |
| POST | `/api/documents/properties/:propertyId/title-upload` | `src/routes/documentRoutes.js:90` | First-batch frontend-facing | 06-documents-media-verification.md; this index |
| POST | `/api/documents/title-asset-upload` | `src/routes/documentRoutes.js:82` | First-batch frontend-facing | 06-documents-media-verification.md; this index |
| POST | `/api/documents/title-upload` | `src/routes/documentRoutes.js:91` | Legacy/deprecated | 06-documents-media-verification.md; this index |
| GET | `/api/escrow` | `src/routes/escrowRoutes.js:31` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| POST | `/api/escrow` | `src/routes/escrowRoutes.js:30` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| GET | `/api/escrow/:id` | `src/routes/escrowRoutes.js:45` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| PATCH | `/api/escrow/:id/approve-release` | `src/routes/escrowRoutes.js:35` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| PATCH | `/api/escrow/:id/cancel` | `src/routes/escrowRoutes.js:36` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| PATCH | `/api/escrow/:id/dispute` | `src/routes/escrowRoutes.js:37` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| POST | `/api/escrow/:id/initialize-payment` | `src/routes/escrowRoutes.js:32` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| POST | `/api/escrow/:id/process-refund` | `src/routes/escrowRoutes.js:44` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| POST | `/api/escrow/:id/refund-account-details` | `src/routes/escrowRoutes.js:41` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| GET | `/api/escrow/:id/refund-chat` | `src/routes/escrowRoutes.js:39` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| POST | `/api/escrow/:id/refund-chat/messages` | `src/routes/escrowRoutes.js:40` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| POST | `/api/escrow/:id/refund-chat/request-details` | `src/routes/escrowRoutes.js:38` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| PATCH | `/api/escrow/:id/refund-details` | `src/routes/escrowRoutes.js:43` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| POST | `/api/escrow/:id/request-release` | `src/routes/escrowRoutes.js:34` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| PATCH | `/api/escrow/:id/rules/:ruleId/satisfy` | `src/routes/escrowRoutes.js:33` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| GET | `/api/escrow/payout-account` | `src/routes/escrowRoutes.js:29` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| PUT | `/api/escrow/payout-account` | `src/routes/escrowRoutes.js:28` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| GET | `/api/inquiries` | `src/routes/inquiryRoutes.js:17` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 08-privacy-notifications-realtime.md |
| POST | `/api/inquiries` | `src/routes/inquiryRoutes.js:15` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 08-privacy-notifications-realtime.md |
| GET | `/api/inquiries/:id` | `src/routes/inquiryRoutes.js:18` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 08-privacy-notifications-realtime.md |
| PATCH | `/api/inquiries/:id` | `src/routes/inquiryRoutes.js:19` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 08-privacy-notifications-realtime.md |
| GET | `/api/inquiries/export.csv` | `src/routes/inquiryRoutes.js:16` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 08-privacy-notifications-realtime.md |
| GET | `/api/installments` | `src/routes/installmentRoutes.js:21` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| POST | `/api/installments` | `src/routes/installmentRoutes.js:20` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| GET | `/api/installments/:id` | `src/routes/installmentRoutes.js:34` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| PATCH | `/api/installments/:id/admin/status` | `src/routes/installmentRoutes.js:29` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| PATCH | `/api/installments/:id/cancel` | `src/routes/installmentRoutes.js:28` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| POST | `/api/installments/:id/initialize-payment` | `src/routes/installmentRoutes.js:22` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| POST | `/api/installments/:id/pay` | `src/routes/installmentRoutes.js:23` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| GET | `/api/installments/:id/payment-history` | `src/routes/installmentRoutes.js:31` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| GET | `/api/installments/:id/penalties` | `src/routes/installmentRoutes.js:32` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| PATCH | `/api/installments/:id/penalties/:penaltyId/waive` | `src/routes/installmentRoutes.js:33` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| GET | `/api/installments/:id/schedule` | `src/routes/installmentRoutes.js:24` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| PATCH | `/api/installments/:id/schedule/:scheduleItemId/conditions/:conditionId/satisfy` | `src/routes/installmentRoutes.js:27` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| PATCH | `/api/installments/:id/status` | `src/routes/installmentRoutes.js:30` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| GET | `/api/locations/:id` | `src/routes/locationRoutes.js:9` | Unclear | 04-search-maps-discovery.md |
| GET | `/api/locations/gazetteer/status` | `src/routes/locationRoutes.js:7` | Unclear | 04-search-maps-discovery.md |
| GET | `/api/locations/suggestions` | `src/routes/locationRoutes.js:8` | Unclear | 04-search-maps-discovery.md |
| POST | `/api/media/upload` | `src/routes/mediaRoutes.js:24` | First-batch frontend-facing | 06-documents-media-verification.md |
| POST | `/api/messages` | `src/routes/messageRoutes.js:29` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| GET | `/api/messages/:id` | `src/routes/messageRoutes.js:30` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| GET | `/api/messages/conversations` | `src/routes/messageRoutes.js:15` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| POST | `/api/messages/conversations` | `src/routes/messageRoutes.js:14` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| GET | `/api/messages/conversations/:id` | `src/routes/messageRoutes.js:16` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| PATCH | `/api/messages/conversations/:id` | `src/routes/messageRoutes.js:21` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| POST | `/api/messages/conversations/:id/attachments` | `src/routes/messageRoutes.js:22` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| GET | `/api/messages/conversations/:id/messages` | `src/routes/messageRoutes.js:17` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| POST | `/api/messages/conversations/:id/messages` | `src/routes/messageRoutes.js:19` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| GET | `/api/messages/conversations/:id/messages/:messageId/attachments/:attachmentIndex` | `src/routes/messageRoutes.js:18` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| PATCH | `/api/messages/conversations/:id/read` | `src/routes/messageRoutes.js:20` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| POST | `/api/messages/conversations/:id/reports` | `src/routes/messageRoutes.js:23` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| GET | `/api/messages/moderation/reports` | `src/routes/messageRoutes.js:24` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| PATCH | `/api/messages/moderation/reports/:reportId` | `src/routes/messageRoutes.js:25` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| POST | `/api/messages/start` | `src/routes/messageRoutes.js:28` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| POST | `/api/newsletter/subscribe` | `src/routes/newsletterRoutes.js:5` | Unclear | this index (newsletter) |
| GET | `/api/notifications` | `src/routes/notificationRoutes.js:14` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| DELETE | `/api/notifications/:id` | `src/routes/notificationRoutes.js:24` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| GET | `/api/notifications/:id/deliveries` | `src/routes/notificationRoutes.js:21` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| GET | `/api/notifications/:id/deliveries/:deliveryId/history` | `src/routes/notificationRoutes.js:22` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| PATCH | `/api/notifications/:id/read` | `src/routes/notificationRoutes.js:23` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| POST | `/api/notifications/devices` | `src/routes/notificationRoutes.js:19` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| DELETE | `/api/notifications/devices/:deviceId` | `src/routes/notificationRoutes.js:20` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| GET | `/api/notifications/preferences` | `src/routes/notificationRoutes.js:17` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| PATCH | `/api/notifications/preferences` | `src/routes/notificationRoutes.js:18` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| PATCH | `/api/notifications/read-all` | `src/routes/notificationRoutes.js:16` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| POST | `/api/notifications/recent-properties/digest` | `src/routes/notificationRoutes.js:25` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| GET | `/api/notifications/unread-count` | `src/routes/notificationRoutes.js:15` | First-batch frontend-facing | 08-privacy-notifications-realtime.md |
| POST | `/api/notifications/webhooks/postmark` | `src/routes/notificationWebhookRoutes.js:4` | Provider callback | 08-privacy-notifications-realtime.md (provider callback) (provider loop) |
| POST | `/api/notifications/webhooks/termii` | `src/routes/notificationWebhookRoutes.js:4` | Provider callback | 08-privacy-notifications-realtime.md (provider callback) (provider loop) |
| GET | `/api/ownerships/my` | `src/routes/ownershipRoutes.js:9` | Unclear | 07-payments-ownership-escrow.md |
| GET | `/api/payments` | `src/routes/paymentRoutes.js:19` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| GET | `/api/payments/:id` | `src/routes/paymentRoutes.js:22` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| GET | `/api/payments/export.csv` | `src/routes/paymentRoutes.js:20` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| POST | `/api/payments/initialize` | `src/routes/paymentRoutes.js:23` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| GET | `/api/payments/verify/:reference` | `src/routes/paymentRoutes.js:21` | First-batch frontend-facing | 07-payments-ownership-escrow.md |
| POST | `/api/payments/webhook` | `src/routes/paymentRoutes.js:17` | Provider callback | 07-payments-ownership-escrow.md |
| GET | `/api/personalisation/favourites` | `src/routes/personalisationRoutes.js:7` | First-batch frontend-facing | 04-search-maps-discovery.md; 08-privacy-notifications-realtime.md |
| DELETE | `/api/personalisation/favourites/:propertyId` | `src/routes/personalisationRoutes.js:9` | First-batch frontend-facing | 04-search-maps-discovery.md; 08-privacy-notifications-realtime.md |
| PATCH | `/api/personalisation/favourites/:propertyId` | `src/routes/personalisationRoutes.js:10` | First-batch frontend-facing | 04-search-maps-discovery.md; 08-privacy-notifications-realtime.md |
| PUT | `/api/personalisation/favourites/:propertyId` | `src/routes/personalisationRoutes.js:8` | First-batch frontend-facing | 04-search-maps-discovery.md; 08-privacy-notifications-realtime.md |
| GET | `/api/personalisation/following` | `src/routes/personalisationRoutes.js:15` | First-batch frontend-facing | 04-search-maps-discovery.md; 08-privacy-notifications-realtime.md |
| DELETE | `/api/personalisation/following/:profileId` | `src/routes/personalisationRoutes.js:17` | First-batch frontend-facing | 04-search-maps-discovery.md; 08-privacy-notifications-realtime.md |
| POST | `/api/personalisation/following/:profileId` | `src/routes/personalisationRoutes.js:16` | First-batch frontend-facing | 04-search-maps-discovery.md; 08-privacy-notifications-realtime.md |
| DELETE | `/api/personalisation/recent` | `src/routes/personalisationRoutes.js:12` | First-batch frontend-facing | 04-search-maps-discovery.md; 08-privacy-notifications-realtime.md |
| GET | `/api/personalisation/recent` | `src/routes/personalisationRoutes.js:11` | First-batch frontend-facing | 04-search-maps-discovery.md; 08-privacy-notifications-realtime.md |
| DELETE | `/api/personalisation/recent/:propertyId` | `src/routes/personalisationRoutes.js:14` | First-batch frontend-facing | 04-search-maps-discovery.md; 08-privacy-notifications-realtime.md |
| POST | `/api/personalisation/recent/:propertyId` | `src/routes/personalisationRoutes.js:13` | First-batch frontend-facing | 04-search-maps-discovery.md; 08-privacy-notifications-realtime.md |
| GET | `/api/personalisation/searches` | `src/routes/personalisationRoutes.js:18` | First-batch frontend-facing | 04-search-maps-discovery.md; 08-privacy-notifications-realtime.md |
| POST | `/api/personalisation/searches` | `src/routes/personalisationRoutes.js:19` | First-batch frontend-facing | 04-search-maps-discovery.md; 08-privacy-notifications-realtime.md |
| DELETE | `/api/personalisation/searches/:id` | `src/routes/personalisationRoutes.js:22` | First-batch frontend-facing | 04-search-maps-discovery.md; 08-privacy-notifications-realtime.md |
| GET | `/api/personalisation/searches/:id` | `src/routes/personalisationRoutes.js:20` | First-batch frontend-facing | 04-search-maps-discovery.md; 08-privacy-notifications-realtime.md |
| PATCH | `/api/personalisation/searches/:id` | `src/routes/personalisationRoutes.js:21` | First-batch frontend-facing | 04-search-maps-discovery.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles` | `src/routes/profileRoutes.js:17` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles` | `src/routes/profileRoutes.js:18` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current` | `src/routes/profileRoutes.js:19` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/authority-history` | `src/routes/profileRoutes.js:83` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/data-protection-requests` | `src/routes/profileRoutes.js:38` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/data-protection-requests` | `src/routes/profileRoutes.js:39` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/data-protection-requests/:id` | `src/routes/profileRoutes.js:40` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/data-protection-requests/:id/execution` | `src/routes/profileRoutes.js:42` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/data-protection-requests/:id/export/download` | `src/routes/profileRoutes.js:43` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/data-protection-requests/:id/history` | `src/routes/profileRoutes.js:41` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/data-protection-requests/:id/withdraw` | `src/routes/profileRoutes.js:44` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/invitations` | `src/routes/profileRoutes.js:47` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/invitations` | `src/routes/profileRoutes.js:48` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| DELETE | `/api/profiles/current/invitations/:id` | `src/routes/profileRoutes.js:49` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/mandates` | `src/routes/profileRoutes.js:80` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/mandates` | `src/routes/profileRoutes.js:81` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/mandates/:id/:action` | `src/routes/profileRoutes.js:82` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/members` | `src/routes/profileRoutes.js:45` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/members` | `src/routes/profileRoutes.js:46` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| PATCH | `/api/profiles/current/members/:id` | `src/routes/profileRoutes.js:52` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/members/:id/remove` | `src/routes/profileRoutes.js:53` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/onboarding` | `src/routes/profileRoutes.js:20` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| PATCH | `/api/profiles/current/onboarding` | `src/routes/profileRoutes.js:21` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/onboarding/evidence` | `src/routes/profileRoutes.js:26` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/onboarding/evidence` | `src/routes/profileRoutes.js:27` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| DELETE | `/api/profiles/current/onboarding/evidence/:id` | `src/routes/profileRoutes.js:31` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/onboarding/evidence/:id` | `src/routes/profileRoutes.js:28` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/onboarding/evidence/:id/content` | `src/routes/profileRoutes.js:29` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/onboarding/evidence/:id/retry` | `src/routes/profileRoutes.js:30` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/onboarding/evidence/contract` | `src/routes/profileRoutes.js:25` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/payout-setup` | `src/routes/profileRoutes.js:71` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/payout-setup` | `src/routes/profileRoutes.js:73` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/payout-setup/:setupId/reconcile` | `src/routes/profileRoutes.js:74` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/payout-setup/history` | `src/routes/profileRoutes.js:72` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/payout-setup/revoke` | `src/routes/profileRoutes.js:75` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| PATCH | `/api/profiles/current/privacy` | `src/routes/profileRoutes.js:37` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/properties/:id/private-price` | `src/routes/profileRoutes.js:86` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| PUT | `/api/profiles/current/properties/:id/private-price` | `src/routes/profileRoutes.js:87` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/publication-plan` | `src/routes/profileRoutes.js:64` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/publication-plan-purchases` | `src/routes/profileRoutes.js:65` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/publication-plan-purchases` | `src/routes/profileRoutes.js:66` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/publication-plan-purchases/:purchaseId` | `src/routes/profileRoutes.js:67` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/publication-plan-purchases/:purchaseId/audit` | `src/routes/profileRoutes.js:68` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/publication-plan-purchases/:purchaseId/cancel` | `src/routes/profileRoutes.js:69` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/publication-plan-purchases/:purchaseId/reconcile` | `src/routes/profileRoutes.js:70` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/publication-plans` | `src/routes/profileRoutes.js:63` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/roles` | `src/routes/profileRoutes.js:76` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/roles` | `src/routes/profileRoutes.js:77` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| PATCH | `/api/profiles/current/roles/:id` | `src/routes/profileRoutes.js:78` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/roles/:id/state` | `src/routes/profileRoutes.js:79` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/seat-plans` | `src/routes/profileRoutes.js:54` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/seat-purchases` | `src/routes/profileRoutes.js:56` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/seat-purchases` | `src/routes/profileRoutes.js:57` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/seat-purchases/:purchaseId` | `src/routes/profileRoutes.js:58` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/seat-purchases/:purchaseId/audit` | `src/routes/profileRoutes.js:59` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/seat-purchases/:purchaseId/cancel` | `src/routes/profileRoutes.js:60` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/seat-purchases/:purchaseId/reconcile` | `src/routes/profileRoutes.js:61` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/seats` | `src/routes/profileRoutes.js:55` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/seats/:membershipId/renew` | `src/routes/profileRoutes.js:62` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/signatories` | `src/routes/profileRoutes.js:84` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/signatories` | `src/routes/profileRoutes.js:85` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/type-change-requests` | `src/routes/profileRoutes.js:88` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/verification-cases` | `src/routes/profileRoutes.js:33` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/verification-cases` | `src/routes/profileRoutes.js:32` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/verification-cases/:id` | `src/routes/profileRoutes.js:34` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/profiles/current/verification-cases/:id/history` | `src/routes/profileRoutes.js:35` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/current/verification-cases/:id/state` | `src/routes/profileRoutes.js:36` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/invitations/:id/accept` | `src/routes/profileRoutes.js:51` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| POST | `/api/profiles/invitations/claim` | `src/routes/profileRoutes.js:50` | First-batch frontend-facing | 01-auth-accounts-profiles.md; 08-privacy-notifications-realtime.md |
| GET | `/api/projects` | `src/routes/projectRoutes.js:33` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| POST | `/api/projects` | `src/routes/projectRoutes.js:37` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| DELETE | `/api/projects/:id` | `src/routes/projectRoutes.js:71` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| PATCH | `/api/projects/:id` | `src/routes/projectRoutes.js:68` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| POST | `/api/projects/:id/canonical-migrations/:migrationId/rollback` | `src/routes/projectRoutes.js:70` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| POST | `/api/projects/:id/canonical-reclassification` | `src/routes/projectRoutes.js:69` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| POST | `/api/projects/:id/confirm-details` | `src/routes/projectRoutes.js:66` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| GET | `/api/projects/:id/manage` | `src/routes/projectRoutes.js:65` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| POST | `/api/projects/:id/media` | `src/routes/projectRoutes.js:72` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| PATCH | `/api/projects/:id/virtual-tour/provider` | `src/routes/projectRoutes.js:67` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| GET | `/api/projects/:idOrSlug` | `src/routes/projectRoutes.js:77` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| GET | `/api/projects/:idOrSlug/properties` | `src/routes/projectRoutes.js:76` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| GET | `/api/projects/:projectId/property-imports` | `src/routes/projectRoutes.js:51` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| POST | `/api/projects/:projectId/property-imports` | `src/routes/projectRoutes.js:50` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| GET | `/api/projects/:projectId/property-imports/:importId` | `src/routes/projectRoutes.js:55` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| PATCH | `/api/projects/:projectId/property-imports/:importId/cancel` | `src/routes/projectRoutes.js:64` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| POST | `/api/projects/:projectId/property-imports/:importId/confirm` | `src/routes/projectRoutes.js:62` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| PATCH | `/api/projects/:projectId/property-imports/:importId/mapping` | `src/routes/projectRoutes.js:56` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| POST | `/api/projects/:projectId/property-imports/:importId/retry-failed` | `src/routes/projectRoutes.js:63` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| DELETE | `/api/projects/:projectId/property-imports/:importId/rows/:rowNumber` | `src/routes/projectRoutes.js:60` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| PATCH | `/api/projects/:projectId/property-imports/:importId/rows/:rowNumber` | `src/routes/projectRoutes.js:57` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| POST | `/api/projects/:projectId/property-imports/:importId/rows/:rowNumber/confirm-new-type` | `src/routes/projectRoutes.js:59` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| POST | `/api/projects/:projectId/property-imports/:importId/rows/:rowNumber/confirm-update` | `src/routes/projectRoutes.js:58` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| POST | `/api/projects/:projectId/property-imports/:importId/rows/:rowNumber/restore` | `src/routes/projectRoutes.js:61` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| GET | `/api/projects/:projectId/property-imports/schema` | `src/routes/projectRoutes.js:54` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| GET | `/api/projects/:projectId/property-imports/template` | `src/routes/projectRoutes.js:53` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| GET | `/api/projects/:projectId/property-imports/template.xlsx` | `src/routes/projectRoutes.js:52` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| GET | `/api/projects/:projectId/unit-grid` | `src/routes/projectRoutes.js:38` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| POST | `/api/projects/:projectId/unit-grid/bulk` | `src/routes/projectRoutes.js:40` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| GET | `/api/projects/:projectId/unit-grid/export.csv` | `src/routes/projectRoutes.js:39` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| POST | `/api/projects/:projectId/unit-grid/jobs` | `src/routes/projectRoutes.js:41` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| GET | `/api/projects/:projectId/unit-grid/jobs/:jobId` | `src/routes/projectRoutes.js:42` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| POST | `/api/projects/:projectId/unit-grid/jobs/:jobId/cancel` | `src/routes/projectRoutes.js:43` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| POST | `/api/projects/:projectId/unit-grid/operations/:operationId/undo` | `src/routes/projectRoutes.js:44` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| GET | `/api/projects/:projectId/unit-types` | `src/routes/projectRoutes.js:45` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| POST | `/api/projects/:projectId/unit-types` | `src/routes/projectRoutes.js:46` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| DELETE | `/api/projects/:projectId/unit-types/:unitTypeId` | `src/routes/projectRoutes.js:49` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| PATCH | `/api/projects/:projectId/unit-types/:unitTypeId` | `src/routes/projectRoutes.js:48` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| GET | `/api/projects/:projectId/unit-types/:unitTypeId/impact` | `src/routes/projectRoutes.js:47` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| GET | `/api/projects/canonical-migration-review` | `src/routes/projectRoutes.js:35` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| GET | `/api/projects/map` | `src/routes/projectRoutes.js:34` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| GET | `/api/projects/mine` | `src/routes/projectRoutes.js:36` | First-batch frontend-facing | 02-properties-projects-units.md; 05-imports-grids-bulk-operations.md |
| GET | `/api/properties` | `src/routes/propertyRoutes.js:66` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| POST | `/api/properties` | `src/routes/propertyRoutes.js:125` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| DELETE | `/api/properties/:id` | `src/routes/propertyRoutes.js:130` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:id` | `src/routes/propertyRoutes.js:122` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| PATCH | `/api/properties/:id` | `src/routes/propertyRoutes.js:129` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:id/admin-review` | `src/routes/propertyRoutes.js:105` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| PATCH | `/api/properties/:id/approval` | `src/routes/propertyRoutes.js:126` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| POST | `/api/properties/:id/buy` | `src/routes/propertyRoutes.js:131` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| POST | `/api/properties/:id/canonical-migrations/:migrationId/rollback` | `src/routes/propertyRoutes.js:128` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| POST | `/api/properties/:id/canonical-reclassification` | `src/routes/propertyRoutes.js:127` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| POST | `/api/properties/:id/confirm-details` | `src/routes/propertyRoutes.js:123` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:id/construction-updates` | `src/routes/propertyRoutes.js:108` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| POST | `/api/properties/:id/construction-updates` | `src/routes/propertyRoutes.js:109` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:id/distress-sale-evidence` | `src/routes/propertyRoutes.js:72` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| POST | `/api/properties/:id/distress-sale-evidence` | `src/routes/propertyRoutes.js:74` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| POST | `/api/properties/:id/distress-sale-evidence/upload` | `src/routes/propertyRoutes.js:73` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:id/duplicate-candidates` | `src/routes/propertyRoutes.js:81` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:id/duplicate-links` | `src/routes/propertyRoutes.js:80` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| POST | `/api/properties/:id/duplicate-links` | `src/routes/propertyRoutes.js:82` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| POST | `/api/properties/:id/duplicate-links/:linkId/withdraw` | `src/routes/propertyRoutes.js:83` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| PATCH | `/api/properties/:id/featured` | `src/routes/propertyRoutes.js:132` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:id/listing-verification` | `src/routes/propertyRoutes.js:77` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| POST | `/api/properties/:id/listing-verification` | `src/routes/propertyRoutes.js:79` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:id/listing-verification/evidence` | `src/routes/propertyRoutes.js:76` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| POST | `/api/properties/:id/listing-verification/evidence` | `src/routes/propertyRoutes.js:78` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| PATCH | `/api/properties/:id/off-plan/complete` | `src/routes/propertyRoutes.js:110` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:id/owner-detail` | `src/routes/propertyRoutes.js:106` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:id/price-history` | `src/routes/propertyRoutes.js:114` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:id/price-history/chart` | `src/routes/propertyRoutes.js:113` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| DELETE | `/api/properties/:id/project` | `src/routes/propertyRoutes.js:112` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| PATCH | `/api/properties/:id/project` | `src/routes/propertyRoutes.js:111` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| POST | `/api/properties/:id/report-outdated` | `src/routes/propertyRoutes.js:124` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| POST | `/api/properties/:id/save` | `src/routes/propertyRoutes.js:134` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:id/title-verification` | `src/routes/propertyRoutes.js:107` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| POST | `/api/properties/:id/view` | `src/routes/propertyRoutes.js:133` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:id/virtual-tour` | `src/routes/propertyRoutes.js:115` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:id/virtual-tour/floorplan` | `src/routes/propertyRoutes.js:116` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| PATCH | `/api/properties/:id/virtual-tour/matterport` | `src/routes/propertyRoutes.js:120` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:id/virtual-tour/measurements` | `src/routes/propertyRoutes.js:117` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| PATCH | `/api/properties/:id/virtual-tour/provider` | `src/routes/propertyRoutes.js:121` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| PATCH | `/api/properties/:id/virtual-tour/realsee` | `src/routes/propertyRoutes.js:119` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:id/virtual-tour/rooms` | `src/routes/propertyRoutes.js:118` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:propertyId/roi/scenarios` | `src/routes/roiRoutes.js:35` | First-batch frontend-facing | this index (ROI/market tools) |
| POST | `/api/properties/:propertyId/roi/scenarios` | `src/routes/roiRoutes.js:29` | First-batch frontend-facing | this index (ROI/market tools) |
| GET | `/api/properties/:propertyId/title-documents` | `src/routes/propertyRoutes.js:85` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| POST | `/api/properties/:propertyId/title-documents` | `src/routes/propertyRoutes.js:92` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/:propertyId/title-documents/manage` | `src/routes/propertyRoutes.js:86` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/admin/pending-approval` | `src/routes/propertyRoutes.js:84` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/canonical-migration-review` | `src/routes/propertyRoutes.js:69` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/field-dictionary` | `src/routes/propertyRoutes.js:68` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/map` | `src/routes/propertyRoutes.js:67` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/map/nearby` | `src/routes/propertyRoutes.js:70` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/properties/market-benchmark` | `src/routes/roiRoutes.js:27` | First-batch frontend-facing | this index (ROI/market tools) |
| GET | `/api/properties/mine` | `src/routes/propertyRoutes.js:71` | First-batch frontend-facing | 02-properties-projects-units.md; 04-search-maps-discovery.md |
| GET | `/api/proxy-inspections` | `src/routes/proxyInspectionRoutes.js:12` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| POST | `/api/proxy-inspections` | `src/routes/proxyInspectionRoutes.js:11` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| GET | `/api/proxy-inspections/:id` | `src/routes/proxyInspectionRoutes.js:29` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| POST | `/api/proxy-inspections/:id/confirm-completion` | `src/routes/proxyInspectionRoutes.js:24` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| POST | `/api/proxy-inspections/:id/confirm-price` | `src/routes/proxyInspectionRoutes.js:14` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| GET | `/api/proxy-inspections/:id/conversation` | `src/routes/proxyInspectionRoutes.js:26` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| POST | `/api/proxy-inspections/:id/dispute` | `src/routes/proxyInspectionRoutes.js:25` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| GET | `/api/proxy-inspections/:id/evidence` | `src/routes/proxyInspectionRoutes.js:19` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| POST | `/api/proxy-inspections/:id/evidence` | `src/routes/proxyInspectionRoutes.js:18` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| POST | `/api/proxy-inspections/:id/initialize-payment` | `src/routes/proxyInspectionRoutes.js:15` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| POST | `/api/proxy-inspections/:id/messages` | `src/routes/proxyInspectionRoutes.js:27` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| POST | `/api/proxy-inspections/:id/propose-price` | `src/routes/proxyInspectionRoutes.js:13` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| GET | `/api/proxy-inspections/:id/report` | `src/routes/proxyInspectionRoutes.js:22` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| PATCH | `/api/proxy-inspections/:id/report` | `src/routes/proxyInspectionRoutes.js:21` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| PUT | `/api/proxy-inspections/:id/report` | `src/routes/proxyInspectionRoutes.js:20` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| POST | `/api/proxy-inspections/:id/review` | `src/routes/proxyInspectionRoutes.js:28` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| PATCH | `/api/proxy-inspections/:id/schedule` | `src/routes/proxyInspectionRoutes.js:16` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| POST | `/api/proxy-inspections/:id/start` | `src/routes/proxyInspectionRoutes.js:17` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| POST | `/api/proxy-inspections/:id/submit-completion` | `src/routes/proxyInspectionRoutes.js:23` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| GET | `/api/proxy-inspector/tasks` | `src/routes/proxyInspectorTaskRoutes.js:8` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| GET | `/api/proxy-inspector/tasks/:id` | `src/routes/proxyInspectorTaskRoutes.js:9` | First-batch frontend-facing | 07-payments-ownership-escrow.md; 17-end-to-end-frontend-workflows.md |
| GET | `/api/proxy-inspectors` | `src/routes/proxyInspectorRoutes.js:33` | First-batch frontend-facing | this index (proxy inspector) |
| GET | `/api/proxy-inspectors/:id` | `src/routes/proxyInspectorRoutes.js:34` | First-batch frontend-facing | this index (proxy inspector) |
| POST | `/api/proxy-inspectors/kyc` | `src/routes/proxyInspectorRoutes.js:19` | First-batch frontend-facing | this index (proxy inspector) |
| GET | `/api/proxy-inspectors/payout-account` | `src/routes/proxyInspectorRoutes.js:32` | First-batch frontend-facing | this index (proxy inspector) |
| PUT | `/api/proxy-inspectors/payout-account` | `src/routes/proxyInspectorRoutes.js:31` | First-batch frontend-facing | this index (proxy inspector) |
| POST | `/api/proxy-inspectors/payout-account/verify` | `src/routes/proxyInspectorRoutes.js:30` | First-batch frontend-facing | this index (proxy inspector) |
| POST | `/api/proxy-inspectors/register` | `src/routes/proxyInspectorRoutes.js:18` | First-batch frontend-facing | this index (proxy inspector) |
| POST | `/api/reviews` | `src/routes/reviewRoutes.js:10` | Unclear | 07-payments-ownership-escrow.md |
| GET | `/api/roi/assumptions` | `src/routes/roiRoutes.js:24` | Unclear | this index (ROI/market tools) |
| POST | `/api/roi/calculate` | `src/routes/roiRoutes.js:25` | Unclear | this index (ROI/market tools) |
| POST | `/api/roi/v1/estimates` | `src/routes/roiRoutes.js:20` | Unclear | this index (ROI/market tools) |
| GET | `/api/roi/v1/estimates/:reference` | `src/routes/roiRoutes.js:21` | Unclear | this index (ROI/market tools) |
| GET | `/api/roi/v1/properties/:propertyReference/estimates` | `src/routes/roiRoutes.js:22` | Unclear | this index (ROI/market tools) |
| GET | `/api/title-document-viewer/:sessionToken/content` | `src/routes/titleDocumentViewerRoutes.js:7` | Unclear | 06-documents-media-verification.md |
| GET | `/api/title-document-viewer/:sessionToken/download` | `src/routes/titleDocumentViewerRoutes.js:8` | Unclear | 06-documents-media-verification.md |
| POST | `/api/title-document-viewer/:sessionToken/end` | `src/routes/titleDocumentViewerRoutes.js:9` | Unclear | 06-documents-media-verification.md |
| PATCH | `/api/title-documents/:documentId/access-policy` | `src/routes/titleDocumentRoutes.js:21` | Unclear | 06-documents-media-verification.md |
| GET | `/api/title-documents/:documentId/access-status` | `src/routes/titleDocumentRoutes.js:19` | Unclear | 06-documents-media-verification.md |
| GET | `/api/title-documents/:documentId/analytics` | `src/routes/titleDocumentRoutes.js:22` | Unclear | 06-documents-media-verification.md |
| POST | `/api/title-documents/:documentId/initialize-view-payment` | `src/routes/titleDocumentRoutes.js:18` | Unclear | 06-documents-media-verification.md |
| POST | `/api/title-documents/:documentId/open-viewer` | `src/routes/titleDocumentRoutes.js:20` | Unclear | 06-documents-media-verification.md |
| GET | `/api/title-documents/:documentId/views` | `src/routes/titleDocumentRoutes.js:23` | Unclear | 06-documents-media-verification.md |
| GET | `/api/title-registry/:publicVerificationId` | `src/routes/titleRegistryRoutes.js:24` | Unclear | 06-documents-media-verification.md |
| GET | `/api/title-registry/:publicVerificationId/integrity` | `src/routes/titleRegistryRoutes.js:21` | Unclear | 06-documents-media-verification.md |
| POST | `/api/title-registry/:publicVerificationId/request-external-anchor` | `src/routes/titleRegistryRoutes.js:23` | Unclear | 06-documents-media-verification.md |
| POST | `/api/title-registry/:publicVerificationId/verify-document` | `src/routes/titleRegistryRoutes.js:22` | Unclear | 06-documents-media-verification.md |
| GET | `/api/title-registry/public-key` | `src/routes/titleRegistryRoutes.js:18` | Unclear | 06-documents-media-verification.md |
| GET | `/api/title-registry/snapshots/:snapshotDate` | `src/routes/titleRegistryRoutes.js:20` | Unclear | 06-documents-media-verification.md |
| GET | `/api/title-registry/snapshots/:snapshotDate/manifest` | `src/routes/titleRegistryRoutes.js:19` | Unclear | 06-documents-media-verification.md |
| GET | `/api/title-verifications` | `src/routes/titleVerificationRoutes.js:39` | Unclear | 06-documents-media-verification.md; 09-admin-console-and-policies.md |
| POST | `/api/title-verifications` | `src/routes/titleVerificationRoutes.js:38` | Unclear | 06-documents-media-verification.md; 09-admin-console-and-policies.md |
| GET | `/api/title-verifications/:id` | `src/routes/titleVerificationRoutes.js:40` | Unclear | 06-documents-media-verification.md; 09-admin-console-and-policies.md |
| POST | `/api/title-verifications/:id/retry-anchor` | `src/routes/titleVerificationRoutes.js:42` | Unclear | 06-documents-media-verification.md; 09-admin-console-and-policies.md |
| PATCH | `/api/title-verifications/:id/review` | `src/routes/titleVerificationRoutes.js:41` | Unclear | 06-documents-media-verification.md; 09-admin-console-and-policies.md |
| GET | `/api/title-verifications/:id/revocation-requests` | `src/routes/titleVerificationRoutes.js:45` | Unclear | 06-documents-media-verification.md; 09-admin-console-and-policies.md |
| POST | `/api/title-verifications/:id/revocation-requests` | `src/routes/titleVerificationRoutes.js:44` | Unclear | 06-documents-media-verification.md; 09-admin-console-and-policies.md |
| DELETE | `/api/title-verifications/:id/revocation-requests/:requestId` | `src/routes/titleVerificationRoutes.js:46` | Unclear | 06-documents-media-verification.md; 09-admin-console-and-policies.md |
| PATCH | `/api/title-verifications/:id/revoke` | `src/routes/titleVerificationRoutes.js:43` | Unclear | 06-documents-media-verification.md; 09-admin-console-and-policies.md |
| POST | `/api/title-verifications/:id/verify-document` | `src/routes/titleVerificationRoutes.js:27` | Unclear | 06-documents-media-verification.md; 09-admin-console-and-policies.md |
| GET | `/api/title-verifications/public/:verificationId` | `src/routes/titleVerificationRoutes.js:24` | Unclear | 06-documents-media-verification.md; 09-admin-console-and-policies.md |
| GET | `/api/tour` | `src/routes/tourRoutes.js:7` | First-batch frontend-facing | 07-payments-ownership-escrow.md (viewings) |
| POST | `/api/tour` | `src/routes/tourRoutes.js:6` | First-batch frontend-facing | this index (tour workflow) |
| PATCH | `/api/tour/:id` | `src/routes/tourRoutes.js:8` | First-batch frontend-facing | this index (tour workflow) |
| GET | `/api/trust/v1/admin/appeals` | `src/routes/trustRoutes.js:16` | Unclear | 04-search-maps-discovery.md; 09-admin-console-and-policies.md |
| PATCH | `/api/trust/v1/admin/appeals/:id` | `src/routes/trustRoutes.js:17` | Unclear | 04-search-maps-discovery.md; 09-admin-console-and-policies.md |
| POST | `/api/trust/v1/admin/users/:userId/recompute` | `src/routes/trustRoutes.js:18` | Unclear | 04-search-maps-discovery.md; 09-admin-console-and-policies.md |
| GET | `/api/trust/v1/appeals` | `src/routes/trustRoutes.js:15` | Unclear | 04-search-maps-discovery.md; 09-admin-console-and-policies.md |
| POST | `/api/trust/v1/appeals` | `src/routes/trustRoutes.js:14` | Unclear | 04-search-maps-discovery.md; 09-admin-console-and-policies.md |
| GET | `/api/trust/v1/me` | `src/routes/trustRoutes.js:13` | Unclear | 04-search-maps-discovery.md; 09-admin-console-and-policies.md |
| GET | `/api/users` | `src/routes/userRoutes.js:15` | First-batch frontend-facing | 01-auth-accounts-profiles.md (legacy user routes) |
| DELETE | `/api/users/:id` | `src/routes/userRoutes.js:19` | First-batch frontend-facing | 01-auth-accounts-profiles.md (legacy user routes) |
| GET | `/api/users/:id` | `src/routes/userRoutes.js:17` | First-batch frontend-facing | 01-auth-accounts-profiles.md (legacy user routes) |
| PATCH | `/api/users/:id` | `src/routes/userRoutes.js:18` | First-batch frontend-facing | 01-auth-accounts-profiles.md (legacy user routes) |
| GET | `/api/users/landlords` | `src/routes/userRoutes.js:16` | First-batch frontend-facing | 01-auth-accounts-profiles.md (legacy user routes) |
| GET | `/api/users/me/roi/scenarios` | `src/routes/roiRoutes.js:41` | First-batch frontend-facing | this index (ROI/market tools) |
| PATCH | `/api/verification/review/:userId` | `src/routes/verificationRoutes.js:15` | Legacy/deprecated | 01-auth-accounts-profiles.md (legacy route behavior) |
| POST | `/api/verification/submit` | `src/routes/verificationRoutes.js:13` | Legacy/deprecated | 01-auth-accounts-profiles.md (legacy route behavior) |
| GET | `/api/virtual-tours/providers` | `src/routes/virtualTourRoutes.js:6` | Unclear | 02-properties-projects-units.md (virtual tours) |

## Mount and contract notes

- Prefixes come from `app.use(prefix, router)` in `src/app.js`.
- The notification receipt paths are generated from the source allowlist `["postmark", "termii"]`; they are provider callbacks, not browser requests.
- The document router has singular and plural compatibility prefixes. New frontend requests should use plural `/api/documents` unless the feature contract explicitly requires a legacy alias.
- Authorization is route middleware plus current-profile/resource checks in the handler/service. Inspect those checks; the table is not a security assertion.
- Multipart file fields and step-up digest requirements are listed in the relevant guide.
- All 156 canonical fields and all 66 RQS-03 filter/control atoms plus 12 sorts have their own inventories in [03](03-canonical-field-dictionary.md) and [04](04-search-maps-discovery.md).

## Route classification counts

Classified registrations: **594**. Classification is static/source-informed and intentionally leaves uncategorized routes as Unclear rather than treating every mount as first-batch UI.

- First-batch frontend-facing: 332
- First-batch staff-facing: 79
- Legacy/compatibility alias: 66
- Legacy/deprecated: 4
- Operational/internal: 51
- Provider callback: 3
- Unclear: 55
- Unclear (staff/admin scope): 4
- Explicitly marked later-batch: 0 (no route-level batch marker exists in source; unresolved scope remains Unclear)

The two document prefixes are separate mounted registrations for the same router and are counted separately. The title-upload compatibility route and two legacy user-ID verification routes reject/deprecate the old contract and are not recommended for new frontend work. Provider callbacks, aliases, operational endpoints and unclear routes are not automatically normal first-batch end-user screens.
