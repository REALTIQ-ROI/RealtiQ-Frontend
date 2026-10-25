# Pass 01–03 frontend-blocking contract remediation

This addendum records the source-backed contracts and targeted backend corrections for the frontend operations blocked by Passes 01–03. It supplements chapters 01–05 and the earlier contract detail in [19](19-frontend-blocking-contracts.md); it does not replace those chapters.

Examples use illustrative IDs, values and file digests. They are not credentials or approved business data.

## 1. Bound step-up and profile-evidence uploads

### `POST /api/auth/step-up`

**Purpose**

Create a one-use TOTP challenge for a specific protected request.

**Authentication and authorization**

Bearer session required. Send `X-Profile-ID` when acting in a selected profile. The selected profile, current session, account authorization version, HTTP method, exact mounted path and canonical JSON body digest are bound to the challenge. Only the TOTP factor is supported for this flow; the factor must already be enabled.

**Request**

`POST`, `PUT`, `PATCH`, or `DELETE` are accepted. `path` must be a literal `/api/...` path without a query string. `body` is the exact JSON request body; use `{}` when the protected request has no body.

```json
{
  "method": "PATCH",
  "path": "/api/projects/64f000000000000000000101",
  "body": {"expectedVersion": 8, "publicationAction": "publish_all_ready"}
}
```

**Success — 201**

```json
{"challengeId":"64f000000000000000000201","expiresAt":"2026-10-25T12:05:00.000Z","method":"totp"}
```

The ID is a challenge-record ID, not an access token. Challenge lifetime is five minutes and is not extended by verification. At most five code attempts are allowed per challenge. The challenge endpoint rate limit is 20 requests per five minutes; no more than ten outstanding challenges are permitted for one account.

### `POST /api/auth/step-up/:id/verify`

```json
{"code":"123456"}
```

Success is `200 {"challengeId":"64f000000000000000000201","verified":true}`. Verification marks the challenge verified, but the challenge is consumed only by the first matching protected request. It cannot be replayed or used with another session/profile, method, path, body, or expired challenge.

### File and multipart binding

The profile-evidence upload is now mounted as preflight → bounded multipart parser → step-up → upload service. This order allows the middleware to hash the actual buffered bytes before consuming the challenge. The frontend must include the SHA-256 digest as the reserved multipart field `__stepUpFileSha256`, and must include that same field and every other multipart text field in the challenge body. Object-key order does not matter; array order does.

For example, if the selected file's SHA-256 is `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`, start the challenge with:

```json
{
  "method":"POST",
  "path":"/api/profiles/current/onboarding/evidence",
  "body":{
    "purpose":"nin",
    "subject":"self",
    "documentKind":"nin_slip",
    "operationKey":"evidence_nin_20261025_a1b2",
    "__stepUpFileSha256":"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  }
}
```

Then submit the same text values and digest with exactly one file:

```http
POST /api/profiles/current/onboarding/evidence
Authorization: Bearer <same-session-token>
X-Profile-ID: <same-profile-id>
X-Step-Up-Challenge: 64f000000000000000000201
Content-Type: multipart/form-data; boundary=<browser-generated>
```

Parts: `file`, `purpose=nin`, `subject=self`, `documentKind=nin_slip`, `operationKey=evidence_nin_20261025_a1b2`, and the digest field above. Do not manually set a multipart boundary; let the HTTP client encode it. The server checks the digest against the bytes, consumes the challenge and removes `__stepUpFileSha256` before the upload controller sees the body.

The router caps this request at one 50 MiB file, five text fields and 1 KiB per field; active evidence policy can impose a lower file limit. Upload validation, storage and scanning follow the existing evidence service. A metadata edit (for example changing `purpose`) or byte change requires a new challenge. Switching profile invalidates the proof. Expired, wrong-scope, wrong-body, wrong-file and replayed proofs fail with `AUTH_STEP_UP_REQUIRED`; challenge verification errors include `AUTH_CHALLENGE_INVALID`, `AUTH_CHALLENGE_FORBIDDEN`, `AUTH_CHALLENGE_REVOKED`, `AUTH_FACTOR_CODE_INVALID` and `AUTH_FACTOR_RATE_LIMITED`.

**Contract status:** implementable. The earlier chapter 19 statement that this route performs step-up before parsing is historical and superseded by this correction. The evidence DTO, list/read/content/retry/delete and verification-case workflows remain as specified in chapter 19.

**Source:** `src/routes/profileRoutes.js`, `src/controllers/profileEvidenceController.js`, `src/middleware/stepUpMiddleware.js`, `src/services/authenticationChallengeService.js`.

## 2. Public canonical-field dictionary

### `GET /api/properties/field-dictionary`

No authentication or active profile is required. The handler returns the public source dictionary and public configuration states; it does not return account data or private policy revision internals. It is generated from the same 156-entry source manifest used by canonical validation.

The response has top-level `version`, source catalogues (`categories`, `propertyTypes`, `buildStages`, `milestones`, `amenities`, title/amenity and other enumerations), `fields`, and `configuration`. Each field retains its source metadata and adds runtime edit metadata. The field shape is:

```json
{
  "key":"annualServiceCharge",
  "sourceRefs":[{"document":"RQS-02","id":"S3","physicalPage":44}],
  "kind":"money_or_none",
  "level":"project_type_unit",
  "requiredness":"required_intake",
  "condition":null,
  "allowedValues":null,
  "catalogue":null,
  "unit":"NGN/year",
  "minimum":0,
  "maximum":null,
  "nullableWhen":null,
  "nullMeaning":"None must be explicit",
  "zeroMeaning":"zero is a numeric value",
  "unsetMeaning":"missing/unanswered; distinct from zero, false, null and POA",
  "inheritance":"project > unit type > unit",
  "publication":"does not independently block publication",
  "searchable":true,
  "searchUse":"annual service charge cap",
  "visibility":"public only through the eligible projection",
  "importable":true,
  "dataType":"money_or_none",
  "entityApplicability":{"sourceLevel":"project_type_unit","mutationTargets":["project","unit_type","project_unit"]},
  "validationConstraints":{"minimum":0,"maximum":null,"unit":"NGN/year","nullableWhen":null,"allowedValues":null,"catalogue":null},
  "editableTargets":["project","unit_type","project_unit"],
  "mutationOperations":{
    "project":{"set":true,"setNull":false,"unset":true,"resetToInherit":false},
    "unit_type":{"set":true,"setNull":false,"unset":true,"resetToInherit":true},
    "project_unit":{"set":true,"setNull":false,"unset":true,"resetToInherit":true}
  },
  "systemOwned":false,
  "transitionManaged":false,
  "workflowOperations":[],
  "readOnly":false
}
```

The actual field's source `kind`, null meanings, validation, level and target operations are authoritative; the example is illustrative. The dictionary omits `default` because the source manifest defines no generic default. `entityApplicability.sourceLevel` is the source level; `mutationTargets` are the API mutation targets. `setNull`, `unset` and `resetToInherit` are distinct. Actual mutation operation strings are `set`, `set_null`, `unset`, and `reset_to_inherit`; consult `mutationOperations` before showing an operation. `availability` is read-only for generic field writes and advertises `workflowOperations:["availability_transition"]`; sold state requires its authorized workflow evidence.

Configuration reports status/selected public values for location, site-plan, FX, POA and duplicate-matching integrations. Unavailable providers/data are represented as status values; this endpoint does not imply the gated capability is active.

**Source:** `src/routes/propertyRoutes.js`, `src/services/canonicalListingDataService.js` (`publicDictionary`), `src/services/listingFieldValidationService.js` (`publicDictionary`, `publicFieldMetadata`), `src/constants/sourceListingFields.js`, `src/constants/listingDictionary.js`.

## 2A. Canonical field mutation contract and specialized values

Canonical source fields use one mutation envelope; a field is writable only when its runtime dictionary entry lists the requested target and operation.

### Property mutation — `PATCH /api/properties/:id`

```json
{
  "expectedVersion": 4,
  "canonicalFieldMutations": [
    {"field":"projectFaqs","operation":"set","value":[{"question":"When is viewing available?","answer":"Contact through the on-platform inquiry flow."}]},
    {"field":"unitPriceOverride","operation":"reset_to_inherit"}
  ]
}
```

`canonicalFieldMutations` is a list of 1–200 `{field,operation,value?}` objects. Allowed operation names are `set`, `set_null`, `unset`, and `reset_to_inherit`; the dictionary's `mutationOperations` is authoritative for each target. `set_null`, `unset`, and `reset_to_inherit` are distinct. `expectedVersion` is accepted for optimistic concurrency; send the current root DTO `version`. Success is the property DTO at the root (not `{property:...}`), with the new `version`, owner-scoped `canonicalFields`, and `effectiveCanonicalFields`/`canonicalFieldProvenance` where the current profile can read them. Public/non-owner property serialization continues to omit seller-only and protected fields.

### Project and type mutations

- `PATCH /api/projects/:id`: `{expectedVersion?,canonicalFieldMutations:[...]}`; success is the project DTO with `version` and any publication operation result.
- `PATCH /api/projects/:projectId/unit-types/:unitTypeId`: `{expectedVersion,expectedTypeVersion,canonicalFieldMutations:[...]}`; success is `{unitType,impact,projectVersion}`. The project and type versions are separate concurrency tokens.
- A project-unit parent value cannot be written as a unit override. The API rejects a parent-level mutation with `LISTING_PARENT_FIELD_REQUIRES_PARENT_EDIT`; update the project or unit type. The field dictionary may advertise project-level and unit-type-level targets separately.

### Source-defined structured values

The runtime `kind` plus validator and field constraints are the payload schema. Important specialized values already accepted by those validators include:

| Kind / example field | Value shape and restrictions |
|---|---|
| `image_media` / project logo | `{ "assetId":"<ObjectId>", "versionId":"<ObjectId>"? }`. This is an authorized asset reference, not a client-supplied public/private URL. |
| `media_list` / renders, progress, aerial media | Array of `{assetId,versionId?,caption?,altText?,cover?,source?,attribution?,date?,milestone?}`. Only listed keys are accepted. Progress media requires a valid date and source milestone; aerial media requires source and attribution; renders require the source-defined artist-impression caption; project photos require exactly one cover when non-empty. References are authorized against the current profile and asset version. |
| `question_answer_list` / `projectFaqs` | Array of `{question,answer}`; each question is 1–500 chars, each answer 1–5000 chars, maximum 50 rows, and both pass the on-platform contact policy. |
| `milestone_target_list` / milestone targets | Array of `{milestone,targetMonth,originalTargetMonth?}` with unique source milestone keys and `YYYY-MM` months. |
| `fee_payer_template` | `"buyer"`, `"seller"`, `"split"`, or `{payer,buyerPercent?}`; split requires a percentage in 0–100. |
| `payment_option_boolean_map` | Object whose only keys are `outright_purchase` and `instalment_plan`, each boolean. |
| `payment_template_value` | Bounded JSON (depth ≤5, 50 entries per object/array); safe strings are contact-policy checked, HTTP links are rejected, and no arbitrary executable/template URL is accepted. Use the source field's exact meaning; this validator does not define a payment or legal policy. |
| `master_survey_pair` | `{publicMasterPlan?:"<ObjectId>",privateRegisteredSurvey?:"<ObjectId>"}`. These are distinct visibility references and must be attached through authorized document workflows. |
| `viewing_schedule` | Array of either `{kind:"specific",startsAt,endsAt,timeZone}` or `{kind:"recurring_weekly",dayOfWeek,startsAtLocal,endsAtLocal,timeZone,startsOn?,endsOn?}`; the server validates IANA time zone and interval ordering. |

Private evidence/document kinds are not a shortcut around document upload, scan/quarantine, owner/profile binding or grant checks. Public media and private documents use different upload/access routes. The API rejects invalid or unauthorized references; do not construct raw IDs or URLs from untrusted client data.

`availability` is intentionally `readOnly:true` for generic canonical field writes and exposes `workflowOperations:["availability_transition"]`; use the project unit-grid transition/job APIs documented in chapter 05. Sold requires transaction evidence and cannot be set or undone by a generic listing form. `projectPin` and `sitePlanPosition` remain subject to authoritative location/site-plan policies; unset, blocked provider results, or missing approved references must be presented as unavailable, not fabricated.

The PASS 03 matrix's “PARTIAL” and “BLOCKED BY CONTRACT” labels describe frontend control coverage. They do not by themselves mean that the backend lacks canonical persistence or validation. For backend callers, use the dictionary-driven operations and these validator shapes; if a field has no `editableTargets` or its specialized prerequisite is unavailable, the field is intentionally not writable through the generic mutation route.

**Source:** `src/routes/propertyRoutes.js`, `src/routes/projectRoutes.js`, `src/services/profileListingService.js`, `src/services/profileProjectService.js`, `src/services/canonicalListingDataService.js`, `src/services/listingFieldValidationService.js`, `src/services/listingReferenceAuthorizationService.js`.

## 3. Effective fields and provenance: unit types

### `GET /api/projects/:projectId/unit-types`

Bearer authentication and the current selected profile are required. The active profile must have current `listing.read` authority on the project. The response is:

```json
{
  "projectVersion": 9,
  "unitTypes": [
    {
      "id":"64f000000000000000000301",
      "version":2,
      "projectVersion":9,
      "canonicalFields":{"currency":"USD","unitTypeName":"Detached Duplex","category":"houses","propertyType":"detached_duplex"},
      "effectiveFields":{"currency":"USD","unitTypeName":"Detached Duplex","category":"houses","propertyType":"detached_duplex","annualServiceCharge":0},
      "fieldSources":{
        "currency":{"sourceLevel":"unit_type","state":"explicit"},
        "annualServiceCharge":{"sourceLevel":"project","state":"inherited"}
      },
      "media":[]
    }
  ]
}
```

`canonicalFields` are the values stored on the type; `effectiveFields` resolve type values over project defaults only for dictionary fields that inherit. `fieldSources` contains source level and effective state. Type-stored values are marked `explicit`; project-derived values are `inherited`; a unit-level value replacing a parent value is reported as `overridden`. This DTO does not invent unit overrides. Project version and type version must be retained for writes. Reserve remains private: only the current owning non-staff profile can receive its decrypted value; public/non-owner projections exclude it. Do not treat `media` storage identifiers as private-document URLs.

The project management/detail DTO also embeds `unitTypes`; there is no plain `GET /api/projects/:projectId/unit-types/:unitTypeId` route. The mounted `/impact` route returns the type DTO and inheritance impact summary.

### `GET /api/projects/:projectId/unit-types/:unitTypeId/impact`

Current project editor profile required (`project.edit`). Response:

```json
{
  "unitType":{"id":"64f000000000000000000301","version":2,"projectVersion":9,"canonicalFields":{},"effectiveFields":{},"fieldSources":{},"media":[]},
  "impact":{"affectedUnits":12,"fields":{"bedrooms":{"inheritingUnits":8,"overriddenUnits":4}}}
}
```

Only changed fields are returned in `impact.fields`; counts are over current units linked to that type.

**Source:** `src/routes/projectRoutes.js`, `src/controllers/projectController.js`, `src/services/profileProjectService.js` (`unitTypeDto`, `unitTypeImpactRead`), `src/services/canonicalListingDataService.js`.

## 4. Unit-type CRUD and project → type → unit setup

All routes are mounted under `/api/projects`; authenticated current profile context is required. Every write is scoped to a project the profile can edit. Commercial fields require current `listing.price`, public media requires `listing.media`, and the project service rechecks current authorization. Conditional step-up applies to commercial/publication-sensitive create/update bodies; DELETE always has step-up and owner-signatory checks.

### Create — `POST /api/projects/:projectId/unit-types`

Body allows only `expectedVersion` (required current project integer version) and optional `canonicalFields` object. Canonical fields are validated for target `unit_type` in draft phase. Success `201`:

```json
{"unitType":{"id":"64f000000000000000000301","version":0,"projectVersion":10,"canonicalFields":{"unitTypeName":"Detached Duplex","category":"houses","propertyType":"detached_duplex"},"effectiveFields":{},"fieldSources":{},"media":[]},"projectVersion":10}
```

Example minimal draft body:

```json
{"expectedVersion":9,"canonicalFields":{"unitTypeName":"Detached Duplex","category":"houses","propertyType":"detached_duplex","unitTypeQuantity":12}}
```

Do not include asking price, currency, payment or media unless the profile has the corresponding permission and a step-up challenge is bound to this exact POST.

### Update — `PATCH /api/projects/:projectId/unit-types/:unitTypeId`

Body must include `expectedVersion` (project version), `expectedTypeVersion` (type version), and 1–200 `canonicalFieldMutations`. Success `200`:

```json
{"unitType":{"id":"64f000000000000000000301","version":3,"projectVersion":11,"canonicalFields":{"unitTypeName":"Detached Duplex"},"effectiveFields":{},"fieldSources":{},"media":[]},"impact":{"affectedUnits":12,"fields":{"bedrooms":{"inheritingUnits":8,"overriddenUnits":4}}},"projectVersion":11}
```

Mutation example:

```json
{"expectedVersion":10,"expectedTypeVersion":2,"canonicalFieldMutations":[{"field":"bedrooms","operation":"set","value":2}]}
```

The operation vocabulary is `set`, `set_null`, `unset`, `reset_to_inherit`; each field's dictionary metadata tells which operations are valid. Successful type changes increment both the type and project versions, update the search projection, recalculate affected values and invalidate/review impacted publication state. Price changes also use shared asking-price history and unpublish affected units for review.

### Remove — `DELETE /api/projects/:projectId/unit-types/:unitTypeId`

JSON body is required: `{"expectedVersion":10,"expectedTypeVersion":2}`. Success `200 {"removed":true,"projectVersion":11}`. Removal is allowed only when no current or historical unit references the type. It does not archive a referenced type. Errors include `CONTENT_VERSION_INVALID`, `CONTENT_UNIT_TYPE_INVALID`, `CONTENT_UNIT_TYPE_NOT_FOUND`, `CONFLICT_UNIT_TYPE_VERSION`, `CONFLICT_UNIT_TYPE_HAS_UNITS`, `CONFLICT_PROJECT_VERSION`, `AUTH_STEP_UP_REQUIRED`, and permission errors.

### Create a unit in the selected type — `POST /api/properties`

This is the mounted unit-creation route; there is no generic `/api/units` or unit-grid create route. Use a project-scoped draft first if a unit needs incomplete values. The current profile must have seller/project edit authority, minimum KYC, and matching project ownership; the selected unit type must belong to the project. The route validates effective project/type/unit values and synchronizes the project-unit identity.

```json
{
  "publicationAction":"save_draft",
  "projectId":"64f000000000000000000101",
  "canonicalUnitTypeId":"64f000000000000000000301",
  "projectUnit":{"unitNumber":"B-204"},
  "canonicalFields":{"unitIdentifier":"B-204"}
}
```

The response is `201 {"property":<owner property DTO>,"titleDocuments":[],"titleVerifications":[],"riskDetected":false,"message":"Draft saved privately; submit it for review when required fields are complete."}`. `property.canonicalReadiness` is included when canonical input was supplied. For a project unit, the owner DTO also includes `canonicalUnitTypeId` and `projectUnit` so the client can retain the association. An unanswered draft payment-options list is returned as `paymentTypes:[]`; it is not normalized to a published-listing default. Commercial/media writes additionally require `listing.price`/`listing.media`; non-draft create or commercial input requires request-bound step-up. Unit identifier must agree with `projectUnit.unitNumber` and be unique within the project.

**Important route-contract correction:** Chapter 02 previously described `GET/PATCH/DELETE /:unitTypeId` as mounted, which is incorrect. All unit-type endpoints are nested under `/api/projects/:projectId/unit-types`. `GET /:unitTypeId/impact` is the only mounted unit-type-specific GET; its response contains the type DTO. No type archival API is present.

**Source:** `src/routes/projectRoutes.js`, `src/routes/propertyRoutes.js`, `src/controllers/projectController.js`, `src/controllers/propertyController.js`, `src/services/profileProjectService.js`, `src/services/projectUnitIdentityService.js`.

### End-to-end setup order

For the frontend's project setup flow, use these existing mounted operations in order:

1. `POST /api/projects` with the project create/draft contract in chapter 02. Retain `project._id` and `project.version`.
2. `POST /api/projects/:projectId/unit-types` with `expectedVersion: project.version`. Retain `unitType.id` and `unitType.version`.
3. `POST /api/properties` with `publicationAction:"save_draft"`, `projectId`, `canonicalUnitTypeId`, and a unique matching `projectUnit.unitNumber` / `canonicalFields.unitIdentifier`.
4. `GET /api/projects/:projectId/unit-grid` to read the persisted unit with `effectiveFields`, `fieldSources`, `version` and readiness.

The owner must send the same Bearer session and `X-Profile-ID` on each request. The grid response demonstrates the persisted type inheritance; values from a parent type are returned with `fieldSources.<field>.sourceLevel:"unit_type"` and `state:"inherited"`. The isolated MongoDB acceptance script exercises this mounted sequence, including type create/edit/list, project-unit create/grid read, a zero-valued explicit unit override and the mounted 156-field dictionary response: `scripts/first-batch-publication-integration.cjs`. `REALTIQ_CONTRACT_SETUP_ONLY=1` runs the four contract groups; all four passed in the current run. The default broad script continued into publication and stopped with `CONTENT_PROJECT_PUBLICATION_NOT_READY`; a full-script pass is not claimed.

## 5. Project publication, deletion and media contracts

### Publish/update — `PATCH /api/projects/:id`

Bearer auth and current selected profile are required. The current profile needs project edit authority for content changes and `listing.publish` for publication actions, plus active verified developer/KYC/company eligibility and owner-signatory authority at publish time. The route requires step-up for publish actions and commercial changes. `expectedVersion` is optional for backward compatibility; always send the version from the last DTO, because when supplied it is checked against the current project version.

Supported canonical actions are `save_draft`, `publish_all_ready`, `publish_selected`; selected action requires non-empty unique `selectedUnitIds` belonging to the project. Do not send a generic `{publish:true}` body as the frontend contract. Example:

```json
{"expectedVersion":8,"publicationAction":"publish_selected","selectedUnitIds":["64f000000000000000000701"]}
```

Success is `200 {"project":<project DTO plus version and optional publication>}`. The optional `project.publication` is `{published,publishedUnitCount,blockedUnitCount,blockedUnits:[{unitId,blockers:[{field,code}]}],projectBlockers?:[{field,code}]}`. `CONTENT_PROJECT_PUBLICATION_NOT_READY` now includes a safe allowlisted `publicationReadiness` member in the shared error response, with only known canonical fields, machine codes and valid unit IDs. It does not expose arbitrary service details.

### Delete project — `DELETE /api/projects/:id`

Authenticated current project owner profile, `project.edit` and `listing.publish` are required, and the service checks owner-signatory authority and step-up. Body is `{}` or `{"expectedVersion":8}`. Success is `200 {"message":"Project deleted"}` only when no property references the project. A project with units or transaction history returns `409 CONFLICT_PROJECT_HAS_UNITS`. **This route deletes an empty project; it is not an archive endpoint.** No archive endpoint should be offered from this contract.

### Add/replace project media

- `POST /api/projects/:id/media` adds media references (deduplicated); accepts `{"expectedVersion":8,"media":[<media-ref>]}` or a single media object (the wrapper form is preferred). Success `201 {"project":<project DTO>}`. `listing.media` is required.
- `PATCH /api/projects/:id` with a complete `media` array replaces the project's media associations; send `media:[]` to clear them and include `expectedVersion`. Valid media keys are `assetId`, `versionId`, `uploadSection`, `url`, `public_id`, `type`, `caption`, `altText`, `source`, `attribution`, `capturedAt`, `milestone`, `isCover`; type is `image|video`. Text is on-platform-contact validated. Private documents use protected document routes, not this media association.
- There is no individual `DELETE /api/projects/:id/media/:mediaId` route.

**Source:** `src/routes/projectRoutes.js`, `src/controllers/projectController.js`, `src/services/profileProjectService.js` (`update`, `remove`, `addMedia`), `src/middleware/errorMiddleware.js`.

## 6. Checkout initialization and safe retry behavior

### `POST /api/cart/checkout/initialize`

Mounted in `src/routes/cartRoutes.js`. Requires Bearer auth, verified access, current buyer profile and step-up bound to the exact POST path/body. The body accepts optional `{ "email": "buyer@example.test" }`; a registered user's stored email takes precedence. No client `Idempotency-Key` is part of the route contract. Active cart contents, item eligibility, price, currency, current identity/profile and KYC are rechecked server-side. The cart must be active, non-empty, and have a positive total. Paystack configuration is required.

Success `201`:

```json
{"redirectUrl":"https://checkout.paystack.com/<provider-path>","authorizationUrl":"https://checkout.paystack.com/<provider-path>","reference":"<provider-reference>","checkoutId":"64f000000000000000000601","totalAmount":2500000,"currency":"NGN"}
```

When a matching initialized pending payment already exists, the response includes `pending:true` and reuses its provider URL/reference. The backend now atomically reserves a pending checkout and changes the cart to `checkout_pending` **before** calling Paystack. If the provider call or local completion has an ambiguous result, it persists `initializationState:"outcome_unknown"` and returns `503 PAYMENT_CHECKOUT_INITIALIZATION_PENDING`; a subsequent initialize attempt returns `409 PAYMENT_CHECKOUT_INITIALIZATION_PENDING` without calling Paystack again. This fail-closed state requires existing payment/provider reconciliation or support; it is not safe for the client to silently retry initialization.

`GET /api/cart/checkouts/:checkoutId` returns the profile-scoped checkout serializer, including `status`, `initializationState` for pending states, `paymentReference`, `expiresAt` and item allocation states. The payment verification flow remains `GET /api/payments/verify/:reference`, followed by checkout detail refresh; a provider `verified:false` response is not a completed transaction. Existing Paystack callbacks/webhooks remain authoritative for final state.

Errors include `FEATURE_PAYMENT_PROVIDER_UNCONFIGURED` (503), `PAYMENT_CHECKOUT_INITIALIZATION_PENDING` (409/503), `CONFLICT_CART_VERSION` (409), empty/zero cart errors (400), current profile/KYC/permission errors (401/403), and current cart-item eligibility conflicts. Provider initialization is not executed from tests or this remediation.

**Source:** `src/routes/cartRoutes.js`, `src/controllers/cartController.js`, `src/services/cartCheckoutService.js`, `src/models/CartCheckout.js`, `src/middleware/stepUpMiddleware.js`.

## 7. Organization/profile and verification contracts

Use chapter 01 for authentication, profile, seats, membership and organization routes, and chapter 19 §2 for verification-case/evidence endpoints, DTOs, state transitions and staff review. These mounted paths were not replaced by new endpoints in this remediation. In particular:

- TOTP: `GET /api/auth/two-step` → `{enabled}`; `POST /api/auth/two-step/enroll` body `{password?}` → `201 {secret,provisioningUri,expiresAt}`; `POST /api/auth/two-step/confirm` body `{code}` → `{enabled:true}`. Enrollment requires current password; secret is returned only for provisioning and must not be logged.
- Verification cases: holder routes are `/api/profiles/current/verification-cases` and `/api/profiles/current/verification-cases/:id` plus `/history` and POST `/:id/state`; staff routes are under `/api/admin/verification-cases`. All profile routes use current account/session and active profile. State-changing submit/withdraw/claim/decision operations require step-up; staff decision requires Trust & Safety, current case claim, version/policy/evidence checks and separation of duties.
- Profile evidence upload uses the byte-bound step-up sequence in §1. Existing upload success status is 202; evidence state can remain queued/quarantined while scanning is pending.

There is no new contract for an unmounted endpoint. Any enrollment, roster, signatory or verification operation not listed in actual mounted routers remains governed by chapters 01/19 and the actual current routes.

## 8. Integration blockers and frontend enablement

| Operation | Status after remediation | Frontend action |
|---|---|---|
| Canonical field form metadata | Implemented and public | Use `/api/properties/field-dictionary`; render only supported targets/operations and configuration state. |
| Unit-type list/create/edit/remove | Existing nested routes; request/response DTO clarified | Use exact nested paths; preserve project and type versions; handle `CONFLICT_UNIT_TYPE_HAS_UNITS`; no type archive/detail route. |
| Effective type values/provenance | Implemented for unit-type DTO | Render raw type values separately from effective/inherited display. Keep reserve private. |
| Profile evidence upload | Route now parses bounded bytes before consuming step-up | Hash file in client, bind digest plus all multipart metadata, then upload with same session/profile and challenge. |
| Project publication blockers | Safe error DTO now preserves blocker rows | Render `publicationReadiness.projectBlockers` and `.units` after a failed publish, without parsing internal error details. |
| Project deletion/media | Existing behavior clarified | Treat DELETE as deletion of empty projects; use PATCH full media list for removal. No archive/delete-media subroute. |
| Cart checkout retries | Duplicate provider attempt prevented during unresolved initialization | Poll checkout/status or request support; never retry a 503/409 unknown state as a fresh payment. |

## 9. Source-level contract caveats

- Tests can establish dictionary metadata shape, serializer privacy, route middleware order and checkout no-retry behavior, but do not establish live Paystack operation.
- Project creation and unit-type routes use conditional step-up; the challenge must be created for the exact request only when middleware requires it. Do not attach a stale challenge to a different body.
- Project `expectedVersion` remains optional on update/delete for legacy compatibility. New frontend mutations should send it to receive optimistic conflict detection.
- A project DELETE is not a project archive. If product needs a distinct archive flow, that requires an authoritative requirement and separate backend contract; it is not implied by this route.
- `sitePlanPosition`, location provider results, FX conversion and other dictionary configuration gates retain their current unavailable states when authoritative policy/data is absent.

## 10. Contract code references

- Mounted path registration: `src/app.js`, `src/routes/authRoutes.js`, `src/routes/profileRoutes.js`, `src/routes/projectRoutes.js`, `src/routes/propertyRoutes.js`, `src/routes/cartRoutes.js`.
- Controllers: `src/controllers/authenticationChallengeController.js`, `src/controllers/profileEvidenceController.js`, `src/controllers/projectController.js`, `src/controllers/propertyController.js`, `src/controllers/cartController.js`.
- Services/serializers: `src/services/authenticationChallengeService.js`, `src/services/profileProjectService.js`, `src/services/canonicalListingDataService.js`, `src/services/listingFieldValidationService.js`, `src/services/cartCheckoutService.js`.
- Safety/error handling: `src/middleware/stepUpMiddleware.js`, `src/middleware/errorMiddleware.js`, `src/services/currentAccountService.js`.
