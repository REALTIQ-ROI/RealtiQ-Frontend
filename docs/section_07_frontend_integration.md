# Group 07 frontend integration

Frontend integration of the Group 07 contract is mounted in the existing profile, project, partner, community, notification, and Admin Console workflows. The browser uses the shared Axios client for Bearer authentication and the active `X-Profile-ID`; protected writes use the existing request-bound step-up hook. Private partner, job, trust, appeal, earnings, promotion, and Finance reads use `no-store` request headers. Profile-scoped screens clear their local state and cancel pending step-up when the selected profile changes.

## Screen map

| Route / surface | Main implementation | Contract behavior |
|---|---|---|
| `/partners`, `/partners/:profileId` | `PartnerDirectory`, `PublicProfile` | Public directory and profile DTOs, current offerings and bookability, profile-specific project/listing previews, public reviews/followers, and explicit unavailable states. Booking uses an approved offering or automatic matching inputs returned/selected through current APIs. |
| `/dashboard/community` | `Community` | Explore, following and own-post views, engagement, comments, reports, public posts, saved state, sponsored separation, and selected-profile following feed. |
| Project details | `ProjectCommunity` | Project follows, question/answer workflow, project reviews and developer replies, source selection from current relationship APIs, signed-handover ratings, and moderation state. |
| `/dashboard/partner-workspace` | `PartnerWorkspace` | Current partner profile, approved service catalogue, availability/calendar and member assignment, jobs, conflict decisions, appointment/video state, private job conversation, sealed reports, payment state, earnings, disputes and withholding certificates. |
| `/dashboard/profile-trust` | `ProfileTrust` | Selected profile trust and safe unavailable/new states; no inferred score or tier. |
| `/dashboard/community-tools` | `CommunityGrowthTools` | Tracked share kits, opt-in lead broadcasts, returned promotion catalogue/products, campaigns, payment verification, unused-value refund/transfer actions, and server-reported organic comparison. |
| `/dashboard/admin/partner-operations` | `Group07PartnerOperations` | Current Third-Party Network queues and versioned service/job/dispute actions. |
| `/dashboard/admin/profile-trust-appeals` | `ProfileTrustAppeals` | Trust & Safety appeal decisions and outcome-document state. |
| `/dashboard/admin/social-moderation` | `SocialModeration` | Authorized post/comment/report moderation. |
| `/dashboard/admin/project-community-moderation` | `ProjectCommunityModeration` | Separate project question/answer/review moderation queues. |
| `/dashboard/admin/partner-finance-operations` | `Group07FinanceOperations` | Finance settlement and partner refund execution with current server versions, action eligibility and bound step-up. |
| Resolved escrow dispute detail | `DisputeTrustImpact` | Trust & Safety case-level penalty adjustment, independent from the dispute’s financial decision. |
| Notification centre | `Notifications`, `notificationVisibility` | Displays exactly the supported `following.*` notices in `followed_updates`, scoped by the active profile and linked only through safe local navigation. |

Buyer enquiry creation and inquiry details expose the backend lead-update opt-in/out controls only for buyer profiles. The notification center's followed-update category is display-only because the current preference DTO has no separate preference key for it.

## API client and mutation handling

`src/services/group07Service.ts` contains the Group 07 DTOs and wrappers. It uses the configured API client, the opaque cursors returned by the backend, private/no-store headers for private reads, and `X-Step-Up-Challenge` for protected decisions, payments, promotions, and staff adjustments. The client does not decide permissions: Admin routes use current capability projections and API failures remain authoritative.

The following-update notification types accepted by the frontend are `following.new_listing`, `following.price_change`, `following.project_progress`, `following.open_house`, `following.show_home`, and `following.social_post`. Notification bodies and destinations are server-owned; the frontend does not compose listing prices, project status, recipient identity, or private data into them.

## Remaining operational gates and contract limits

- Policy, private storage/envelope, QR signing, approved provider, scheduler, tax recipient, city gazetteer, and promotion inventory/price setup remain backend/deployment gates. A configured policy or checkout redirect is not shown as completed provider operation.
- The Finance contract exposes settlement/refund execution by a known partner job or dispute ID, but does not define a Finance discovery/list endpoint for these Group 07 records. The Finance page therefore requires an authorized reference and never guesses one or searches an unrelated directory.
- Promotion city selection remains unavailable until the backend publishes approved city entries; staged source data is never presented as a selectable city.
- Live video and paid promotion remain unavailable or pending when current server readiness/payment state says so. The UI does not claim provider activation or settlement.

No backend code, endpoint, policy value, provider activation, production migration, or live provider operation was added by this frontend integration.
