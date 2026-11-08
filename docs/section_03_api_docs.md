# Implementation Group 03 — Shared Property Vocabulary API

## Scope and source precedence

This chapter covers the shared vocabulary and option contracts for property, project, unit-type and unit intake, imports, search, comparison and public display. The PRD and cited REALTIQ Specifications are authoritative; the Specifications govern conflicts. Runtime values come from src/constants/listingDictionary.js and src/constants/sourceListingFields.js. The mounted assembly is src/services/listingFieldValidationService.js and src/services/canonicalListingDataService.js.

Source references:

- PRD §5, physical pages 20–26.
- RQS-03 §§2.1–2.2, pp. 62–64; §3.2 and §3.4, pp. 66–68; location suggestions, p. 71.
- RQS-02 project, location, lifecycle, payment, type, unit and media sections, pp. 42–50.
- RQS-04 field sections, pp. 78–86.
- RQS-01 §7.4 and RQS-05 §§6 and 16 for occupancy; RQS-06 §13 for document/media access levels; RQS-08 §7.3 for payment-time FX agreement.

No separate API is required for values consumed as fields of existing canonical property/project/unit requests. The mounted option-list API is GET /api/properties/field-dictionary. Dynamic locations use the mounted /api/locations routes; no static geography endpoint or fabricated IDs are added.

## 1. Mounted option APIs

### GET /api/properties/field-dictionary

Mounted through /api/properties in src/app.js; the route is /field-dictionary in src/routes/propertyRoutes.js. Public, no query parameters, body or authentication. The route returns HTTP 200 with a JSON object (no data envelope) from canonicalListingDataService.publicDictionary().

The top-level response keys are:

    {
      "version": 3,
      "categories": [{"key":"...", "label":"...", "types":[{"key":"...", "label":"...", "definition":"..."}]}],
      "propertyTypes": [{"key":"...", "label":"...", "definition":"...", "category":"..."}],
      "buildStages": [{"key":"...", "label":"..."}],
      "milestonePhases": [{"label":"...", "entries":[{"key":"...", "label":"..."}]}],
      "milestones": [{"key":"...", "label":"...", "phase":"..."}],
      "amenityGroups": [{"label":"...", "entries":[{"key":"...", "label":"...", "priority":false}]}],
      "amenities": [{"key":"...", "label":"...", "priority":false, "group":"..."}],
      "architecturalStyles": [{"key":"...", "label":"...", "group":"..."}],
      "titleDeclarations": [{"key":"...", "label":"..."}],
      "titleDocumentTypes": [{"key":"...", "label":"..."}],
      "developmentStructures": [{"key":"...", "label":"..."}],
      "advertiserTypes": [{"key":"...", "label":"..."}],
      "unitDisplayModes": [{"key":"...", "label":"..."}],
      "accessLevels": [{"key":"...", "label":"..."}],
      "roadConditions": [{"key":"...", "label":"..."}],
      "servicedValues": [{"key":"...", "label":"..."}],
      "furnishingValues": [{"key":"...", "label":"..."}],
      "occupancyValues": [{"key":"...", "label":"..."}],
      "paymentOptionValues": [{"key":"...", "label":"..."}],
      "availabilityValues": [{"key":"...", "label":"..."}],
      "currencyValues": [{"key":"...", "label":"..."}],
      "fitOutValues": [{"key":"...", "label":"..."}],
      "fields": [/* all 156 source-field metadata objects */],
      "configuration": {
        "commercialUses": {"state":"configured|unconfigured","entries":[]},
        "powerCapacityUnits": {"state":"configured|unconfigured","units":[]},
        "mortgage": {"state":"disabled"},
        "location": {"provider":"...","gazetteerSource":"...","gazetteerState":"...","gazetteerErrorCode":null,"boundaryState":"...","resolutionPolicy":"...","projectPinValidationPolicy":"...","unresolvedLocationPolicy":"..."},
        "sitePlan": {"coordinateMode":"...","minimum":0,"maximum":1,"outOfBoundsPolicy":"...","mediaPolicy":"..."},
        "fx": {"state":"...","provider":"...","conversionEnabled":false,"missingRatePolicy":"...","supportedCurrencies":["NGN","USD"],"maximumRateAgeMinutes":0},
        "poa": {"publicationPolicy":"...","filterPolicy":"...","sortPolicy":"...","reserveVisibility":"private","reserveConflictPolicy":"..."},
        "duplicateMatching": {"candidatePolicy":"...","sizeToleranceConfigured":false,"ambiguousPolicy":"...","automaticMergeEnabled":false}
      }
    }

Each field object includes the source key and references, kind/dataType, level, requiredness/condition, allowedValues/catalogue, unit, minimum/minimumExclusive/maximum, nullableWhen and semantic text (null/zero/unset/inheritance/visibility/importability/searchability); it also includes entityApplicability, validationConstraints, editableTargets, mutationOperations, systemOwned, transitionManaged, workflowOperations and readOnly. Defaults are not implied where the source defines none. Runtime configuration values and dataset statuses are environment/database dependent; clients must consume the returned state rather than depend on sample values. The response includes the complete arrays and field metadata, not ellipsis placeholders.

For request values, use field.allowedValues or field.catalogue as the field validator's authority. If entries are objects with key and label, the validator accepts the stable key or exact label and stores the key. If a field declares raw string allowedValues, submit one of those exact strings; do not assume the parallel option list's key is accepted for every field. In particular buildStage, availability, occupancy, currency and some service/furnishing fields use exact allowedValues strings. Dictionary version 3 identifies the updated metadata/option contract.

The options are public metadata; they do not grant mutation permission. Use existing entity APIs and their authorization. Protected and system-owned fields remain read-only as shown by field metadata.

### GET /api/locations/gazetteer/status

Public, no request parameters. HTTP 200 returns one of:

    {"state":"unconfigured","revision":0,"activeDataset":null}

When a revision exists the response has state configured or unavailable, revision, errorCode and activeDataset. activeDataset contains sourceKind, rowCount, digest and approvedAt. Unavailable states can identify FEATURE_SEARCH_GAZETTEER_SOURCE_UNAVAILABLE or FEATURE_SEARCH_LOCATION_PROVIDER_UNAVAILABLE. Boundary status is separately exposed in field-dictionary configuration.location.boundaryState. The service checks the active approved revision against LOCATION_PROVIDER and LOCATION_GAZETTEER_SOURCE.

### GET /api/locations/suggestions

Public prefix suggestions over the active approved gazetteer; the mounted route has a 60-request-per-minute limiter.

| Query | Required | Contract |
|---|---:|---|
| level | yes | state, lga, area, or estate |
| q | yes | 2–80 characters; normalized prefix search |
| parentId | child levels | Current approved state for LGA, LGA for area, area for estate; not valid for state |
| limit | no | Integer 1–20; default 10 |

Success response:

    {
      "suggestions": [{
        "id": "<current gazetteer ID>",
        "level": "area",
        "name": "<authoritative display name>",
        "parentId": "<parent ID or null>",
        "breadcrumbs": [{"id":"...","level":"state","name":"..."}],
        "publishedStockCount": 12
      }],
      "revision": 4
    }

Only entries with published stock are returned. Results sort by published stock count descending, then normalized name. There is no cursor/page pagination and no coordinates in this DTO.

Invalid level/query/limit returns CONTENT_LOCATION_QUERY_INVALID. Missing/invalid parent returns CONTENT_LOCATION_PARENT_REQUIRED or CONTENT_LOCATION_PARENT_INVALID. Missing approved data/provider returns HTTP 503 with FEATURE_SEARCH_GAZETTEER_UNCONFIGURED, FEATURE_SEARCH_LOCATION_PROVIDER_UNAVAILABLE or FEATURE_SEARCH_GAZETTEER_SOURCE_UNAVAILABLE. No static fallback values are returned.

### GET /api/locations/:id

Public resolver for a current gazetteer ID. Success:

    {
      "location": {
        "id":"<id>", "level":"area", "name":"<name>", "parentId":"<lga-id>",
        "breadcrumbs":[
          {"id":"<state-id>","level":"state","name":"<state>"},
          {"id":"<lga-id>","level":"lga","name":"<lga>"},
          {"id":"<area-id>","level":"area","name":"<name>"}
        ],
        "publishedStockCount":12, "revision":4
      }
    }

The ID must exist in the active approved revision and have published available inventory. Otherwise return CONTENT_LOCATION_NOT_FOUND (404). Missing/unavailable approved data returns 503 as above. IDs are revision-scoped; resolve stale IDs again after a gazetteer revision change.

## 2. Source vocabulary and item-level tracking

API status means that an item is in the mounted dictionary or accepted by the corresponding canonical field validator. Frontend status is NOT REVIEWED IN THIS BACKEND TASK; this report does not claim display completion.

### Categories and physical property types — PRD §5; RQS-03 §2.1 pp. 62–64; RQS-02 T3–T4; RQS-04 C1–C2

Category options expose key and label. Type options additionally expose definition and category.

| Category | API | Frontend |
|---|---|---|
| flats_apartments — Flats & Apartments | supported | not reviewed |
| houses — Houses | supported | not reviewed |
| commercial_buildings — Commercial Buildings | supported | not reviewed |
| mixed_use — Mixed Use | supported | not reviewed |

| Type key | Exact source label | Category | API | Frontend |
|---|---|---|---|---|
| flat_standard_apartment | Flat / Standard Apartment | Flats & Apartments | supported | not reviewed |
| 1_bedroom_flat | 1-Bedroom Flat | Flats & Apartments | supported | not reviewed |
| 2_bedroom_flat_apartment | 2-Bedroom Flat / Apartment | Flats & Apartments | supported | not reviewed |
| 3_bedroom_flat_apartment | 3-Bedroom Flat / Apartment | Flats & Apartments | supported | not reviewed |
| 4_bedroom_flat_apartment | 4-Bedroom+ Flat / Apartment | Flats & Apartments | supported | not reviewed |
| mini_flat_room_parlour | Mini Flat (Room & Parlour) | Flats & Apartments | supported | not reviewed |
| self_contain_self_contained | Self-Contain (Self-Contained) | Flats & Apartments | supported | not reviewed |
| studio_apartment | Studio Apartment | Flats & Apartments | supported | not reviewed |
| penthouse | Penthouse | Flats & Apartments | supported | not reviewed |
| maisonette | Maisonette | Flats & Apartments | supported | not reviewed |
| serviced_apartment | Serviced Apartment | Flats & Apartments | supported | not reviewed |
| block_of_flats | Block of Flats | Flats & Apartments | supported | not reviewed |
| detached_duplex | Detached Duplex | Houses | supported | not reviewed |
| semi_detached_duplex | Semi-Detached Duplex | Houses | supported | not reviewed |
| terraced_house | Terraced House | Houses | supported | not reviewed |
| detached_bungalow | Detached Bungalow | Houses | supported | not reviewed |
| semi_detached_bungalow | Semi-Detached Bungalow | Houses | supported | not reviewed |
| terraced_bungalow | Terraced Bungalow | Houses | supported | not reviewed |
| townhouse | Townhouse | Houses | supported | not reviewed |
| mansion_villa | Mansion / Villa | Houses | supported | not reviewed |
| chalet | Chalet | Houses | supported | not reviewed |
| boys_quarters_bq | Boys’ Quarters (BQ) | Houses | supported | not reviewed |
| office_space | Office Space | Commercial Buildings | supported | not reviewed |
| co_working_space | Co-Working Space | Commercial Buildings | supported | not reviewed |
| shop_retail | Shop / Retail | Commercial Buildings | supported | not reviewed |
| shop_in_a_mall | Shop in a Mall | Commercial Buildings | supported | not reviewed |
| showroom | Showroom | Commercial Buildings | supported | not reviewed |
| plaza_complex_mall | Plaza / Complex / Mall | Commercial Buildings | supported | not reviewed |
| restaurant_cafe_space | Restaurant / Café Space | Commercial Buildings | supported | not reviewed |
| warehouse | Warehouse | Commercial Buildings | supported | not reviewed |
| cold_room_logistics_hub | Cold Room / Logistics Hub | Commercial Buildings | supported | not reviewed |
| hotel_guest_house | Hotel / Guest House | Commercial Buildings | supported | not reviewed |
| filling_station | Filling Station | Commercial Buildings | supported | not reviewed |
| petrol_gas_plant_tank_farm | Petrol / Gas Plant / Tank Farm | Commercial Buildings | supported | not reviewed |
| factory | Factory | Commercial Buildings | supported | not reviewed |
| school | School | Commercial Buildings | supported | not reviewed |
| hospital_clinic | Hospital / Clinic | Commercial Buildings | supported | not reviewed |
| event_centre | Event Centre | Commercial Buildings | supported | not reviewed |
| place_of_worship | Place of Worship | Commercial Buildings | supported | not reviewed |
| other_commercial | Other Commercial | Commercial Buildings | supported | not reviewed |
| mixed_use_building | Mixed-Use Building | Mixed Use | supported | not reviewed |

All 41 type options include their source description in API propertyTypes[].definition. Do not add land, plot, rental, lease, short-let, generic shell, or estate as a physical property type. Estate / gated community is a project developmentStructure, not a property type.

### Project structure and display mode — RQS-02 P4/P9

| Key | Label | API | Frontend |
|---|---|---|---|
| estate_gated_community | Estate / gated community | supported | not reviewed |
| apartment_building | Apartment building | supported | not reviewed |
| mixed_use_development | Mixed-use development | supported | not reviewed |
| commercial_complex | Commercial complex | supported | not reviewed |
| other | Other | supported | not reviewed |
| grouped_by_unit_type | Grouped by unit type | supported | not reviewed |
| individual_units | Individual units | supported | not reviewed |

These values organize a project and its display; they are not physical property types.

### Build stages and milestones — RQS-02 D1–D6; RQS-04 E1–E5

| Stage key | Exact label | API | Frontend |
|---|---|---|---|
| off_plan | Off-plan | supported | not reviewed |
| under_construction | Under construction | supported | not reviewed |
| uncompleted_building | Uncompleted building | supported | not reviewed |
| semi_finished_advanced_shell_lock_up | Semi-finished (Advanced Shell / Lock-up) | supported | not reviewed |
| newly_built | Newly built | supported | not reviewed |
| renovated | Renovated | supported | not reviewed |
| previously_owned | Previously owned | supported | not reviewed |
| old | Old | supported | not reviewed |

| Milestone key | Exact label | Phase | API | Frontend |
|---|---|---|---|---|
| site_clearing_excavation | Site Clearing & Excavation | Site Preparation & Substructure | supported | not reviewed |
| foundation_footing | Foundation Footing | Site Preparation & Substructure | supported | not reviewed |
| dpc_german_floor | DPC (German Floor) | Site Preparation & Substructure | supported | not reviewed |
| blockwork_lintel_level | Blockwork / Lintel Level | Carcass | supported | not reviewed |
| decking | Decking | Carcass | supported | not reviewed |
| roofing_parapet | Roofing / Parapet | Carcass | supported | not reviewed |
| lock_up | Lock-up | Semi-Finished | supported | not reviewed |
| first_fix_infrastructure | First-Fix Infrastructure | Semi-Finished | supported | not reviewed |
| pop_ceiling | POP Ceiling | Finishing | supported | not reviewed |
| tiling_floor_finishes | Tiling & Floor Finishes | Finishing | supported | not reviewed |
| second_fix_installation | Second-Fix Installation | Finishing | supported | not reviewed |
| screeding_painting | Screeding & Painting | Finishing | supported | not reviewed |
| external_works_services | External Works & Services | Commissioning, External Works & Handover | supported | not reviewed |
| snagging_inspection | Snagging & Inspection | Commissioning, External Works & Handover | supported | not reviewed |
| handover | Handover | Commissioning, External Works & Handover | supported | not reviewed |

Sold as is is not a stage or milestone; it is represented by completedBeforeHandover on the supported unfinished-stage path. ready_to_move_in is a search macro, not a stored stage. projectedHandoverMonth uses YYYY-MM. The APIs and canonical mutation services clear or ignore inactive dependent lifecycle fields according to the source rules.

### Amenities — RQS-03 §3.2 and p. 71; RQS-02 T16/S1

Every amenity response entry has key, label, group and priority. The eight priority choices are flagged by the backend; the UI must use that flag rather than re-computing it.

| Amenity key | Label | Group | Priority | API | Frontend |
|---|---|---|---:|---|---|
| boys_quarters_bq | Boys’ Quarters (BQ) | Space & Layout | yes | supported | not reviewed |
| maids_room | Maid’s Room | Space & Layout | no | supported | not reviewed |
| guest_house_chalet | Guest House / Chalet | Space & Layout | no | supported | not reviewed |
| study_home_office | Study / Home Office | Space & Layout | no | supported | not reviewed |
| family_lounge | Family Lounge | Space & Layout | no | supported | not reviewed |
| balcony_terrace | Balcony / Terrace | Space & Layout | no | supported | not reviewed |
| rooftop_terrace | Rooftop Terrace | Space & Layout | no | supported | not reviewed |
| private_garden_compound | Private Garden / Compound | Space & Layout | no | supported | not reviewed |
| home_cinema | Home Cinema | Space & Layout | no | supported | not reviewed |
| private_gym | Private Gym | Space & Layout | no | supported | not reviewed |
| basement | Basement | Space & Layout | no | supported | not reviewed |
| attic | Attic | Space & Layout | no | supported | not reviewed |
| 24_hour_electricity | 24-Hour Electricity | Power, Water & Sanitation | yes | supported | not reviewed |
| solar_inverter_system | Solar / Inverter System | Power, Water & Sanitation | yes | supported | not reviewed |
| backup_standby_central_generator | Backup / Standby Central Generator | Power, Water & Sanitation | no | supported | not reviewed |
| dedicated_transformer | Dedicated Transformer | Power, Water & Sanitation | no | supported | not reviewed |
| connected_to_electricity_distribution | Connected to Electricity Distribution | Power, Water & Sanitation | no | supported | not reviewed |
| pre_paid_meter | Pre-Paid Meter | Power, Water & Sanitation | no | supported | not reviewed |
| dedicated_industrial_borehole | Dedicated / Industrial Borehole | Power, Water & Sanitation | yes | supported | not reviewed |
| central_water_treatment_plant | Central Water Treatment Plant | Power, Water & Sanitation | no | supported | not reviewed |
| connected_to_public_municipal_water | Connected to Public / Municipal Water | Power, Water & Sanitation | no | supported | not reviewed |
| septic_tank | Septic Tank | Power, Water & Sanitation | no | supported | not reviewed |
| municipal_sewage_system | Municipal Sewage System | Power, Water & Sanitation | no | supported | not reviewed |
| fitted_kitchen | Fitted Kitchen | Interior Fittings & Fixtures | yes | supported | not reviewed |
| pop_decorative_ceiling | POP Decorative Ceiling | Interior Fittings & Fixtures | no | supported | not reviewed |
| central_air_conditioning | Central Air Conditioning | Interior Fittings & Fixtures | no | supported | not reviewed |
| water_heater | Water Heater | Interior Fittings & Fixtures | no | supported | not reviewed |
| fitted_wardrobes | Fitted Wardrobes | Interior Fittings & Fixtures | no | supported | not reviewed |
| passenger_elevator_lift | Passenger Elevator / Lift | Interior Fittings & Fixtures | no | supported | not reviewed |
| smart_home_automation | Smart-Home Automation | Interior Fittings & Fixtures | no | supported | not reviewed |
| gated_access_estate | Gated Access Estate | Estate Security, Leisure & Site | yes | supported | not reviewed |
| 24_7_uniformed_security_access_post | 24/7 Uniformed Security / Access Post | Estate Security, Leisure & Site | no | supported | not reviewed |
| cctv_surveillance | CCTV Surveillance | Estate Security, Leisure & Site | yes | supported | not reviewed |
| video_intercom | Video Intercom | Estate Security, Leisure & Site | no | supported | not reviewed |
| electric_fencing | Electric Fencing | Estate Security, Leisure & Site | no | supported | not reviewed |
| swimming_pool | Swimming Pool | Estate Security, Leisure & Site | yes | supported | not reviewed |
| fully_equipped_gym | Fully Equipped Gym | Estate Security, Leisure & Site | no | supported | not reviewed |
| estate_clubhouse | Estate Clubhouse | Estate Security, Leisure & Site | no | supported | not reviewed |
| childrens_play_area | Children’s Play Area | Estate Security, Leisure & Site | no | supported | not reviewed |
| sports_court_tennis | Sports Court / Tennis | Estate Security, Leisure & Site | no | supported | not reviewed |
| waterfront_ocean_view | Waterfront / Ocean View | Estate Security, Leisure & Site | no | supported | not reviewed |
| flood_free_covered_drainage | Flood-Free / Covered Drainage | Estate Security, Leisure & Site | no | supported | not reviewed |
| paved_interlocked_access_road | Paved / Interlocked Access Road | Estate Security, Leisure & Site | no | supported | not reviewed |
| shared_estate_parking | Shared / Estate Parking | Estate Security, Leisure & Site | no | supported | not reviewed |

Project estateFacilities is an array of {key,state}, with state exactly Delivered or Planned. Unit unitFeatures is an amenity-key array. Effective delivered amenities combine Delivered project facilities with type/unit features. Planned facilities remain distinct and must not be labelled delivered. Amenity search is strict AND across all selected options. Individual otherAmenity is display-only and is not a catalogue option, project facility or filter.

### Architectural styles — RQS-03 §3.2; RQS-02 T16a; RQS-04 H6

| Style key | Exact label | Group | API | Frontend |
|---|---|---|---|---|
| contemporary | Contemporary | Styles common in Nigeria | supported | not reviewed |
| classic_neoclassical | Classic / Neoclassical | Styles common in Nigeria | supported | not reviewed |
| modern_minimalist | Modern Minimalist | Styles common in Nigeria | supported | not reviewed |
| mediterranean | Mediterranean | Styles common in Nigeria | supported | not reviewed |
| colonial | Colonial | Styles common in Nigeria | supported | not reviewed |
| afro_brazilian | Afro-Brazilian | Styles common in Nigeria | supported | not reviewed |
| tropical_modernist | Tropical Modernist | Styles common in Nigeria | supported | not reviewed |
| sudano_sahelian_hausa | Sudano-Sahelian / Hausa | Styles common in Nigeria | supported | not reviewed |
| yoruba_courtyard | Yoruba Courtyard | Styles common in Nigeria | supported | not reviewed |
| igbo_traditional | Igbo Traditional | Styles common in Nigeria | supported | not reviewed |
| benin_edo_traditional | Benin (Edo) Traditional | Styles common in Nigeria | supported | not reviewed |
| brutalist | Brutalist | Styles common in Nigeria | supported | not reviewed |
| mid_century_modern | Mid-Century Modern | Other international styles | supported | not reviewed |
| art_deco | Art Deco | Other international styles | supported | not reviewed |
| industrial_loft | Industrial / Loft | Other international styles | supported | not reviewed |
| scandinavian | Scandinavian | Other international styles | supported | not reviewed |
| victorian | Victorian | Other international styles | supported | not reviewed |
| georgian | Georgian | Other international styles | supported | not reviewed |
| tudor | Tudor | Other international styles | supported | not reviewed |
| spanish_hacienda | Spanish / Hacienda | Other international styles | supported | not reviewed |
| ranch | Ranch | Other international styles | supported | not reviewed |
| postmodern | Postmodern | Other international styles | supported | not reviewed |
| high_tech_glass_curtain_wall | High-Tech / Glass Curtain-Wall | Other international styles | supported | not reviewed |

An unlisted typed style is display-only through architecturalStyleOther when no fixed style is selected; it never matches the fixed-style filter.

### Title declarations and upload vocabulary — RQS-03 §3.4 p. 68; RQS-02 S4; RQS-04 J2

| Key | Label | API | Frontend |
|---|---|---|---|
| c_of_o | C of O | supported | not reviewed |
| global_c_of_o | Global C of O | supported | not reviewed |
| governors_consent | Governor’s Consent | supported | not reviewed |
| deed_of_assignment | Deed of Assignment | supported | not reviewed |
| deed_of_sub_lease | Deed of Sub-Lease | supported | not reviewed |
| letter_of_allocation | Letter of Allocation | supported | not reviewed |
| registered_survey | Registered Survey | supported | not reviewed |
| excision | Excision | supported | not reviewed |
| gazette | Gazette | supported | not reviewed |
| approved_building_plan | Approved Building Plan | supported | not reviewed |
| r_of_o | R of O | supported | not reviewed |
| no_title_document_declared | No title document declared (individual-property declaration only, exclusive choice) | supported | not reviewed |

Projects use rootTitleDeclarations; standalone properties use titleDeclarations, which also permits the exclusive no-title declaration. Upload documentType uses the same 11 canonical document keys plus other, exposed as titleDocumentTypes. No title document declared is not an upload type. Legacy upload values certificate_of_occupancy, survey_plan, allocation_letter and excision_document remain accepted but are not advertised as separate options. Those aliases map to C of O, Registered Survey, Letter of Allocation and Excision for duplicate/current-version handling. New clients submit canonical keys.

Item-level title, occupancy, availability and currency status:

| Item | Exact label/value | Backend | Frontend |
|---|---|---|---|
| Upload fallback | Other | supported through titleDocumentTypes; not a title declaration | not assessed here |
| Occupancy | Vacant possession | supported | not assessed here |
| Occupancy | Sold with occupiers | supported | not assessed here |
| Availability | Available | supported | not assessed here |
| Availability | Under Offer | supported | not assessed here |
| Availability | Sold | system/transaction-managed | not assessed here |
| Availability | Not released | supported as non-public state | not assessed here |
| Primary currency | NGN | supported | not assessed here |
| Primary currency | USD | supported | not assessed here |

### Occupancy, availability, currency and price — RQS-02 T17/U2/U2b; RQS-03 §3.4; RQS-04 D1–D8/H5/L1

| Item | Exact values/semantics | API | Frontend |
|---|---|---|---|
| occupancy | Vacant possession; Sold with occupiers | supported | not reviewed |
| availability | Available; Under Offer; Sold; Not released | supported | not reviewed |
| currency | NGN; USD only | supported | not reviewed |
| askingPrice | Whole-number amount ≥ 0 in primary currency | supported | not reviewed |
| priceOnApplication | Boolean; true clears numeric ask; not a zero amount or literal POA string | supported; publication is policy-gated | not reviewed |
| secondAskingPrice | Optional whole-number amount ≥ 0 in the other NGN/USD currency; determined by currency; no secondCurrency request field | supported | not reviewed |
| reservePrice | Whole number ≥ 0; private to seller, excluded from public/search/ordinary staff projection | supported | not reviewed |
| actualSalePrice | Transaction/system-managed private value; not caller-editable | supported | not reviewed |

POA filter/sort/publication and reserve conflicts follow configuration.poa; never guess an unapproved value. USD-to-NGN search indexing uses approved FX policy/rates in configuration.fx; the client must not compute authoritative conversion. Sold is transaction-generated, not an ordinary edit. Not released is not buyer-visible. Occupancy is sale context, not a rental/tenancy product. New-build units default to Vacant possession where the applicable creation flow supplies the source default.

### Measurement and room semantics — RQS-03 §3.2 pp. 66–67; RQS-02 T6–T15; RQS-04 F1–G5

| Field | Unit and semantics | Required condition | API | Frontend |
|---|---|---|---|---|
| internalFloorArea | m²; if set, > 0 | Source intake requirement for applicable scope | supported | not reviewed |
| unitFootprint | m²; if set, > 0 | Applicable unit/type | supported | not reviewed |
| wholeBuildingFootprint | m²; if set, > 0 | Attached/shared lot | supported | not reviewed |
| plotSize | m²; if set, > 0 | Applicable land-bearing property | supported | not reviewed |
| unbuiltArea | m², computed from plot minus applicable footprint | System-managed | supported/read-only | not reviewed |
| commercialFrontage | metres; nonnegative numeric value | Commercial category | supported | not reviewed |
| bedrooms/fullBathrooms/powderRooms | Counts; do not substitute zero for unknown or not applicable | Commercial room counts may be explicit null; residential requiredness remains source-driven | supported | not reviewed |
| terraceFloors | Whole number ≥ 1 | Terraced House or Townhouse | supported | not reviewed |
| commercialFloorsOrUnits/liftCount | Whole-number source fields; do not add unsupported minimums | Commercial category | supported | not reviewed |

All areas are m². Do not accept/convert sqft, acres, “plots” as a unit, or inferred values. The field dictionary exposes validationConstraints.minimumExclusive = 0 for internalFloorArea, unitFootprint, wholeBuildingFootprint and plotSize. Missing, null, zero and false stay distinct; null is accepted only in the source-defined commercial room-count case.

### Additional dictionary options

| List | Exact labels | API | Frontend |
|---|---|---|---|
| accessLevels | Free; Paid; On request; Private | supported | not reviewed |
| roadConditions | Tarred; Untarred; Flood-prone; Sand-filled area | supported | not reviewed |
| servicedValues | Serviced; Not Serviced | supported | not reviewed |
| furnishingValues | Furnished; Semi-Furnished; Unfurnished | supported | not reviewed |
| paymentOptionValues | Outright Purchase; Instalment Plan; Mortgage Accepted | supported; Mortgage Accepted disabled until gate active | not reviewed |
| fitOutValues | Shell & core; Partly fitted; Fully fitted | supported | not reviewed |

Commercial uses and power-capacity units are Console-controlled and may be unconfigured with empty lists. Do not invent a use, unit, backup enum, or other commercial value. powerBackup remains source-defined text. Mortgage is reported disabled until the applicable partner gate activates.

Item-level status for the remaining fixed option values:

| Group | Exact value | Backend | Frontend |
|---|---|---|---|
| Access level | Free | supported | not assessed here |
| Access level | Paid | supported | not assessed here |
| Access level | On request | supported | not assessed here |
| Access level | Private | supported | not assessed here |
| Road condition | Tarred | supported | not assessed here |
| Road condition | Untarred | supported | not assessed here |
| Road condition | Flood-prone | supported | not assessed here |
| Road condition | Sand-filled area | supported | not assessed here |
| Serviced | Serviced | supported | not assessed here |
| Serviced | Not Serviced | supported | not assessed here |
| Furnishing | Furnished | supported | not assessed here |
| Furnishing | Semi-Furnished | supported | not assessed here |
| Furnishing | Unfurnished | supported | not assessed here |
| Payment option | Outright Purchase | supported | not assessed here |
| Payment option | Instalment Plan | supported | not assessed here |
| Payment option | Mortgage Accepted | dictionary value supported; selection disabled until gate activates | not assessed here |
| Commercial fit-out | Shell & core | supported | not assessed here |
| Commercial fit-out | Partly fitted | supported | not assessed here |
| Commercial fit-out | Fully fitted | supported | not assessed here |

## 3. Location hierarchy and external data

The location path is state → lga → area → estate. Source scope is Nigeria’s 36 states and FCT, but current labels/IDs come from the active approved gazetteer/provider; backend does not hardcode a parallel name/ID list. Suggestions require parents for child levels and only return locations with published stock. An estate is selected under an area.

projectPin is a latitude/longitude object validated against configured Nigerian boundary policy. It is not a gazetteer ID and is not fabricated from an address. configuration.location reports provider, source, dataset state, boundary state, resolution policy, pin policy and unresolved-location policy. If the dataset/boundary is unavailable, show an unavailable/deferred state; do not submit a display label as an ID. Mapbox, gazetteer and boundary activation require approved provider data/configuration.

| Hierarchy item | API level | Parent rule | Backend | Frontend |
|---|---|---|---|---|
| State | state | none | supported only from approved active dataset | not assessed here |
| LGA | lga | current state ID required | supported only from approved active dataset | not assessed here |
| Area | area | current LGA ID required | supported only from approved active dataset | not assessed here |
| Gated estate | estate | current area ID required | supported only from approved active dataset | not assessed here |

## 4. Canonical values in other API requests

There is no separate options API for every field. Existing canonical property/project/unit and import APIs consume field keys listed in fields. Examples:

    {"unitFeatures":["boys_quarters_bq","swimming_pool"]}
    {"estateFacilities":[{"key":"swimming_pool","state":"Planned"}]}
    {"occupancy":"Vacant possession","currency":"NGN","askingPrice":185000000,"priceOnApplication":false}
    {"secondAskingPrice":120000}

The secondAskingPrice example means USD if currency is NGN, or NGN if currency is USD. It is a seller-stated alternate amount, not an FX conversion. Do not include a secondCurrency property. Public eligible projections may return the seller-stated second price but never reservePrice, title files/private identifiers or actual sale details.

## 5. Admin gazetteer operations

Gazetteer revision maintenance is an operational admin workflow under /api/admin, not a listing-form option endpoint. It requires current staff authority; preparation/entry/decision routes use the existing department, profile, step-up and independent-approval checks in locationGazetteerService.js. A revision must be approved and active before public suggestions/resolution work. Do not display unapproved entries.

## 6. Configuration and safe unavailable states

| Capability | Backend signal | Client behavior |
|---|---|---|
| Gazetteer | configuration.location.gazetteerState or location 503 FEATURE_SEARCH_GAZETTEER_UNCONFIGURED/provider/source error | No fabricated locations/IDs; preserve drafts. |
| Boundary/project pin | configuration.location.boundaryState and pin validation result | Do not claim a pin is authoritative; allow only the backend-supported draft/review state. |
| FX | configuration.fx.state and server search behavior | Preserve source amount/currency; never calculate filtering conversion in the client. |
| POA/reserve | configuration.poa | Keep POA separate; do not expose reserve. |
| Commercial use/power units | configuration.commercialUses.state / configuration.powerCapacityUnits.state | Show unavailable and do not invent values. |
| Mortgage | configuration.mortgage.state = disabled | Hide/disable Mortgage Accepted. |
| Site-plan marker | configuration.sitePlan | Use returned coordinate mode/range; require current associated project plan. |

## 7. Implementation changes in this group

- Source field metadata and runtime validation now distinguish an exclusive minimum; the four area fields reject zero and expose minimumExclusive: 0.
- second_currency_money now reaches whole-number amount validation. It follows the source rule that the optional alternate price is in the other of NGN/USD; no unsupported secondCurrency field is required.
- Protected title uploads now derive accepted canonical document types from listingDictionary.titleDeclarations, retain legacy aliases for existing callers, expose canonical upload choices, store and serialize canonical keys, use source labels, and treat aliases/canonical keys as one document class for duplicate/current-version checks.
- Dictionary response version is 3 for the updated metadata and option contract.

No database migration is introduced. Legacy aliases remain accepted on input; writes and responses use canonical keys, while alias-aware reads preserve access to historical records.
