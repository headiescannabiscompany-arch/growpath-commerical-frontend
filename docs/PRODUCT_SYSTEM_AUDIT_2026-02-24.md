# GrowPath System Audit
Date: 2026-02-24  
Scope: login -> mode routing -> every user type -> every menu/page -> endpoint wiring status -> AI/tooling integration status

## 1) Canonical User Types and Mode Resolution
- `personal` mode:
  - Plans: `free`, `pro` (plus legacy `influencer` references)
  - Primary surface: `src/app/home/personal/*`
- `commercial` mode:
  - Plan: `commercial` (facility users may also have commercial access)
  - Primary surfaces: `src/app/home/commercial/*` and top-level commercial routes (`/feed`, `/campaigns`, `/storefront`, `/orders`)
- `facility` mode:
  - Plan: `facility`
  - Role-based actions via facility role gate (`OWNER`, `MANAGER`, `STAFF`, `VIEWER`, `TECH`)
  - Primary surface: `src/app/home/facility/*`

Source of truth files:
- `src/entitlements/types.ts`
- `src/entitlements/capabilityKeys.ts`
- `src/entitlements/EntitlementsProvider.tsx`
- `src/app/index.tsx` (entry routing decision tree)

## 2) Login and Entry Flow (Current)
- Root providers:
  - `src/app/_layout.tsx`
  - Providers in order: `AuthProvider` -> `SessionProvider` -> `EntitlementsProvider` -> `FacilityProvider`
- Entry route:
  - `src/app/index.tsx`
  - Decision flow:
    - if hydrating auth: hold
    - if entitlements not ready: hold
    - if no token: `/login`
    - if facility/commercial mode and no selected facility: `/facilities`
    - facility mode with selected facility: `/facilities/{id}/dashboard`
    - commercial mode: `/feed`
    - personal default: `/home/personal`
- Login page:
  - `src/app/login.tsx`
  - Endpoint: `POST /api/auth/login`
  - Token persistence: `src/auth/tokenStore.ts`

## 3) Personal Mode: Page Inventory and Wiring
Tab layout:
- `src/app/home/personal/(tabs)/_layout.tsx`
- Tabs: `Home`, `Grows`, `Logs`, `Tools`, `Courses`, `Forum`, `Diagnose`, `Profile`, `AI`

Core pages:
- `src/app/home/personal/(tabs)/index.tsx`
  - Home hub with links to each function
  - Data: auth + entitlement context only
- `src/app/home/personal/(tabs)/grows/index.tsx`
  - Grow list UI
  - Navigation to grow detail and create
- `src/app/home/personal/(tabs)/grows/new.tsx`
  - Endpoint: `POST /api/personal/grows` via `apiRequest`
- `src/app/home/personal/(tabs)/logs/index.tsx`, `new.tsx`, `[logId].tsx`
  - Log listing/create/detail routes
- `src/app/home/personal/(tabs)/tools/index.tsx`, `vpd.tsx`
  - VPD calculator is implemented client-side
  - Other tool cards still marked planned in UI text
- `src/app/home/personal/(tabs)/forum/*`
  - Nested stack now in place:
    - `forum/index.tsx`
    - `forum/code.tsx`
    - `forum/new-post.tsx` -> `POST /api/forum/posts`
    - `forum/post/[id].tsx` -> `GET /api/forum/posts/{id}` pattern
- `src/app/home/personal/(tabs)/diagnose.tsx`
  - Route wrapper to diagnose surface
- `src/app/home/personal/(tabs)/profile/index.tsx`
  - Account/profile operations and mode transitions
- `src/app/home/personal/(tabs)/ai/index.tsx`
  - AI chat interface shell

Legacy personal registry pages (non-router stack) remain:
- `src/navigation/pageRegistry.personal.js`
- Components include `Dashboard`, `Grows`, `Plants`, `GrowLog`, `Calendar`, `Tools`, `Diagnose`, `Analytics`, `Community`, `Feed`, `Courses`, `Profile`

## 4) Facility Mode: Page Inventory and Wiring
Facility tab layout:
- `src/app/home/facility/(tabs)/_layout.tsx`
- Tabs: `Dashboard`, `Grows`, `Plants`, `Tasks`, `Logs`, `Inventory`, `Team`, `Profile`

Implemented data-backed tabs:
- `dashboard.tsx`
  - Endpoints:
    - `GET endpoints.grows(facilityId)`
    - `GET endpoints.plants(facilityId)`
    - `GET endpoints.tasks(facilityId)`
    - `GET endpoints.inventory(facilityId)`
    - `GET endpoints.growlogs(facilityId)`
- `grows.tsx`
  - `GET endpoints.grows(facilityId)`
- `plants.tsx`
  - `GET endpoints.plants(facilityId)`
- `tasks.tsx`
  - `GET endpoints.tasks(facilityId)`
  - `POST endpoints.tasks(facilityId)`
- `logs.tsx`
  - `GET endpoints.growlogs(facilityId)`
- `inventory.tsx`
  - `GET endpoints.inventory(facilityId)`
- `team.tsx`
  - `GET endpoints.teamMembers(facilityId)`
  - `POST endpoints.teamInvite(facilityId)`
- `profile.tsx`
  - `GET endpoints.me`
  - `GET endpoints.facilities`

Implemented detail pages:
- `plants/[id].tsx` -> `GET endpoints.plant(facilityId, id)`
- `tasks/[id].tsx` -> `GET/PUT endpoints.task(facilityId, id)`
- `logs/[id].tsx` -> `GET endpoints.growlog(facilityId, id)`
- `InventoryItemDetailScreen.tsx`
  - `GET endpoints.inventoryItem(facilityId, id)`
  - `POST endpoints.inventoryAdjust(facilityId, id)`

Facility routes currently still explicit planned placeholders:
- `src/app/home/facility/(tabs)/ai-tools.tsx`
- `src/app/home/facility/(tabs)/audit-logs.tsx`
- `src/app/home/facility/(tabs)/compliance.tsx`
- `src/app/home/facility/(tabs)/sop-runs.tsx`
- `src/app/home/facility/(tabs)/CreateInventoryItemScreen.tsx`
- `src/app/home/facility/ai/*` (ask/template/diagnosis-photo)
- `src/app/home/facility/compliance/*`
- `src/app/home/facility/audit-logs/*` (index/detail/entity variants)
- `src/app/home/facility/sop-runs/*`

Facility legacy registry:
- `src/navigation/pageRegistry.facility.js`
- Now points to real screen files (missing-file failures were corrected)

## 5) Commercial Mode: Page Inventory and Wiring
Commercial home:
- `src/app/home/commercial.tsx`
- Links to feed/campaigns/offers/storefront/orders/courses/communities/profile

Commercial inventory routes:
- `src/app/home/commercial/inventory.tsx` -> `GET /api/commercial/inventory` (path builder in file)
- `src/app/home/commercial/inventory-item/[id].tsx` -> item read/update
- `src/app/home/commercial/inventory-create.tsx` -> still planned placeholder

Commercial stack/tabs (legacy navigator side) now uses real screens:
- `src/navigation/CommercialTabs.js`
- `src/navigation/CommercialStack.js`
- Added concrete screens:
  - `src/screens/commercial/CreateCourseScreen.js`
  - `src/screens/commercial/CommercialToolsScreen.js`
  - `src/screens/commercial/CommercialReportsScreen.js`
  - `src/screens/commercial/CommercialProfileScreen.js`

Commercial registry:
- `src/navigation/pageRegistry.commercial.js`
- Missing component targets were implemented:
  - `src/screens/CampaignsScreen.js`
  - `src/screens/CommercialOrdersScreen.js`
  - `src/screens/ProfileScreen.js`

## 6) Endpoint Connectivity Baseline (By Domain)
Auth/session:
- `/api/auth/login`, `/api/auth/signup`, `/api/me`
- Files: `src/api/auth.ts`, `src/api/me.ts`, `src/auth/*`, `src/app/login.tsx`

Facility core:
- Plants, tasks, inventory, grows, growlogs, rooms, team, audit, deviations, SOP, compliance
- Canonical endpoint builder: `src/api/endpoints.ts`
- Primary consumers: `src/app/home/facility/(tabs)/*.tsx`, `src/screens/facility/*.tsx`, hooks in `src/hooks/*`

Forum/community:
- `/api/forum/*`
- Consumers:
  - `src/screens/ForumScreen.js`
  - `src/screens/ForumNewPostScreen.js`
  - `src/screens/ForumPostDetailScreen.js`
  - router wrappers in `src/app/home/personal/(tabs)/forum/*`

Diagnose/AI:
- Diagnose service:
  - `src/api/diagnose.js`
  - `src/hooks/useDiagnose.ts`
- Facility AI call contract:
  - `POST /api/facility/{facilityId}/ai/call`
  - `src/hooks/useAICall.ts`
  - Tool screens: trichome, harvest window, VPD, EC recommend

Commercial:
- storefront/orders/campaign/social/vendor analytics endpoints
- Files: `src/api/storefront.ts`, `src/api/orders.ts`, `src/api/campaigns.ts`, `src/api/socialMedia.js`, `src/api/vendor*.js|ts`

## 7) AI, LAWNS, and Journal-First Positioning
Current principle in codebase (and should remain explicit in product docs):
- AI is a helper, not an authority.
- Human grower judgment remains primary.
- Longitudinal grow journal + context quality drives model usefulness.
- External experts (soil scientists, agronomists, commercial nutrient vendors, lab testing) remain required validation channels.

Current structured context used in diagnosis:
- Light: PPFD, DLI, spectrum, fixture model, distance
- Air: temp, RH, airflow, optional CO2
- Water: source, treatment, pH, PPM
- Nutrients: brand, dose/strength, feeding schedule
- Substrate: type, pH, EC
- Time dimension: growth stage + historical logs/photos

Gaps to close for full LAWNS-over-time:
- Persist every diagnosis input with timestamp and grow/plant linkage
- Persist AI output with confidence + version metadata
- Track post-diagnosis outcomes (resolved/not resolved/time-to-resolve)
- Join with grow logs to build longitudinal “cause -> action -> outcome” sequences

## 8) External AI Verification + Training Loop (Status)
Current status:
- No full external verifier pipeline is wired end-to-end in frontend code.
- Internal AI calls are wired (`/ai/call` and diagnose APIs), but cross-model adjudication and training-feedback capture are partial.

Required architecture (documented for implementation):
- Step A: Internal model inference
- Step B: External verifier inference (independent model/provider)
- Step C: Comparison layer:
  - agreement score
  - divergence classification
  - escalation flags for human review
- Step D: Human outcome capture:
  - action taken
  - observed result
  - confidence override
- Step E: Training dataset export (curated, de-identified, versioned)

## 9) “Every Page” Documentation Status
Completed in this audit:
- User types/modes and auth entry flow
- Personal/facility/commercial route families
- Menu registries and tab surfaces
- Implemented vs planned page map
- Endpoint source-of-truth and major consumers
- AI tooling and longitudinal-data gap map

Still required for full per-page UX runbook depth:
- Field-by-field action matrix for each screen component
- Dropdown values/options by screen
- Button-level event and endpoint mapping by screen
- Screenshot snapshots per page state (empty/loading/error/populated)
- This should be generated from runtime test traversal (Playwright) and exported as artifacts

## 10) Immediate Next Execution Backlog (Priority Order)
1. Replace remaining `PlannedScreen` routes in `src/app/home/facility/*` with working screens/hooks.
2. Remove all “Planned” UI text in active surfaces (`facility dashboard modules`, `commercial inventory create`, `personal tools planned cards`, `GrowLogScreen planned copy`).
3. Complete AI external verifier pipeline:
   - add verifier API client
   - dual-inference compare screen
   - reviewer override UI
   - feedback persistence endpoint wiring
4. Implement longitudinal LAWNS timeline view:
   - per-grow chart overlays (light/water/feed vs symptom/outcome)
   - diagnosis history + intervention outcomes
5. Add page-by-page screenshot/test harness:
   - login
   - each mode home
   - each tab
   - detail pages
   - error states
6. Publish generated “Full UX Function Register” from runtime snapshots and API logs.
