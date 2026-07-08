# GrowPath Canonical User/Mode/Route Matrix

> **Status**: CANONICAL TRUTH
> **Last Updated**: 2026-07-08
> **Source**: Generated from docs/FRONTEND_SCREEN_MAP.md + backend/entitlements.js + actual routes

---

## 0. Current Corrections

This file has older generated sections below. Use these current route rules first:

- Commercial dashboard: `/home/commercial`
- Commercial Storefront owner route: `/home/commercial/storefront`
- Public storefront route: `/store/:slug`
- Public storefront alias routes: `/storefront/:slug` and `/storefront/:slug/products/:productId` mirror the `/store` public URL family.
- Exact legacy `/storefront` is a redirect-only stale-link guard, not a visible owner module.
- Commercial Feed / Campaigns owner route: `/home/commercial/feed`
- Shared Feed viewer route: `/feed`
- Feed is commercial/facility advertising and outreach, not discussion.
- Forum/Q&A discussion routes are `/forum` and `/forum/post/:id`.
- Commercial routes should keep products, product lines, batches/lots, inventory, trials, courses, lives, orders, analytics, and campaigns connected to the commercial workspace.
- Generated sections below this correction block are historical context only when they mention `/feed` as a commercial dashboard, `/storefront` as the owner storefront, or `/dashboard` as the facility dashboard.
- Current root routing is `/home/personal`, `/home/commercial`, `/home/facility/select`, and `/home/facility`.
- Current workspace profile routes are `/home/personal/profile`, `/home/commercial/profile`, and `/home/facility/profile`; all should expose the shared `/account/mode` switcher.

---

## 1. User Modes & Plans

### Mode → Plan Matrix

| Mode         | Valid Plans                   | Shell           | Primary Use Case                      |
| ------------ | ----------------------------- | --------------- | ------------------------------------- |
| `personal`   | `free`, `pro`                 | PersonalShell   | Individual growers, learning, courses, tools |
| `commercial` | `commercial`                  | CommercialShell | Brands, storefronts, campaigns, orders |
| `facility`   | `facility`                    | FacilityShell   | Multi-user operations, compliance     |

**Key Rule**: `mode` determines the navigation shell. `plan` determines capabilities within that shell.

---

## 2. Route Structure (Expo Router File Tree)

### Current Structure (Actual)

```
src/app/
├── index.tsx                    # Root router (mode-based dispatch)
├── _layout.tsx                  # Global providers wrapper
├── login.tsx                    # Auth (unauthed route)
├── vendor-signup.tsx            # Auth (unauthed route)
├── debug.tsx                    # Debug (all modes)
├── dashboard.tsx                # Legacy stub (should be removed)
├── create-post.tsx              # Commercial feature
├── live-session.tsx             # Live feature (all modes)
├── campaigns.js                 # Commercial feature
├── home/
│   └── index.tsx                # Personal mode landing
├── feed/
│   └── index.tsx                # Commercial mode landing (stub)
├── facilities/
│   └── index.tsx                # Facility picker (commercial/facility mode)
├── onboarding/
│   ├── index.tsx
│   ├── first-setup.tsx
│   ├── start-grow.tsx
│   ├── create-facility.tsx
│   ├── pick-facility.tsx
│   ├── join-facility.tsx
│   └── assign-plants.tsx
├── (commercial)/               # Commercial-scoped routes
│   ├── feed/index.tsx
│   ├── tasks/[id].tsx
│   ├── logs/[id].tsx
│   └── alerts/[id].tsx
└── (facility)/                 # Future facility-scoped routes
```

---

## 3. Correct Route Matrix (Mode → Routes)

### Personal Mode (`mode: "personal"`)

**Landing**: `/home`

**Routes**:

- `/home` → PersonalHome (splits into Personal/Commercial/Facility sub-shells)
- `/grows` → GrowsListScreen
- `/grows/[id]` → GrowDetailScreen
- `/logs` → GrowLogsScreen
- `/diagnose` → DiagnoseScreen
- `/tools` → ToolsScreen
  - `/tools/soil` → SoilCalculatorScreen
  - `/tools/npk` → NPKCalculatorScreen
  - `/tools/vpd` → VPDToolScreen
  - `/tools/feed` → FeedSchedulerScreen
  - `/tools/harvest` → HarvestEstimatorScreen
  - `/tools/timeline` → TimelinePlannerScreen
- `/courses` → CoursesScreen
- `/forum` → ForumScreen
- `/profile` → ProfileScreen

**Capabilities Gating**:

- Free: Basic tools + 1 paid course + review required
- Pro: All tools + 3 paid courses + analytics
- Creator Plus: Unlimited courses + certificates + advanced analytics

---

### Commercial Mode (`mode: "commercial"`)

> Current correction: Commercial lands at `/home/commercial`. Storefront owner work lives at `/home/commercial/storefront`; public storefronts live at `/store/:slug`. Feed/Campaigns owner work lives at `/home/commercial/feed`; shared promotional Feed is `/feed`. Forum/Q&A discussion stays in `/forum` and `/forum/post/:id`.

**Landing**: `/home/commercial`

**Routes**:

- `/feed` → CommercialFeedScreen (brand dashboard)
- `/facilities` → FacilityPickerScreen (select facility to manage)
- `/storefront` → StorefrontScreen
- `/campaigns` → CampaignsScreen
- `/offers` → OffersScreen
- `/orders` → OrdersScreen
- `/inventory` → InventoryScreen (commercial)
- `/courses` → CoursesScreen (create/sell)
- `/communities` → CommunitiesScreen
- `/social` → SocialMediaScreen
- `/analytics` → AnalyticsScreen
- `/profile` → ProfileScreen

Current commercial routes:

- `/home/commercial` - Commercial dashboard / owner command center
- `/home/commercial/storefront` - Storefront owner home
- `/home/commercial/products` - Commercial products
- `/home/commercial/product-lines` - Product Lines support surface
- `/home/commercial/batch-planner` - Product batches/lots support surface
- `/home/commercial/evidence-runs` - Product-trial evidence runs
- `/home/commercial/trials` - Product Trials support surface
- `/home/commercial/feed` - Feed / Campaigns owner workspace
- `/feed` - Shared commercial/facility promotional Feed viewer
- `/forum` and `/forum/post/:id` - Forum/Q&A discussion
- `/home/commercial/courses` - Commercial courses
- `/home/commercial/lives` - Commercial lives
- `/home/commercial/orders` - Orders
- `/home/commercial/inventory` - Inventory support root
- `/home/commercial/inventory/new` - Inventory support creation
- `/home/commercial/inventory/:id` - Inventory support detail
- `/home/commercial/analytics` - Commercial analytics
- `/home/commercial/profile` - Profile & Billing
- `/store/:slug` and `/storefront/:slug` - Public storefronts

Legacy compatibility guards:

- `/campaigns` redirects to `/home/commercial/marketing`.
- `/orders` redirects to `/home/commercial/orders`.
- `/storefront` redirects/gates to commercial owner storefront.
- `/home/commercial/inventory-create` mirrors `/home/commercial/inventory/new`.
- `/home/commercial/inventory-item/:id` mirrors `/home/commercial/inventory/:id`.
- `/home/commercial/grows` mirrors `/home/commercial/evidence-runs`.

**Capabilities**:

- `commercial.offers`
- `commercial.advertising`
- `commercial.leads`
- All creator_plus course capabilities

**Gating**: Must have `plan: "commercial"` and `mode: "commercial"`

---

### Facility Mode (`mode: "facility"`)

**Landing**: `/facilities` (picker) → `/dashboard` (after selection)

**Routes**:

- `/facilities` → FacilityPickerScreen (0/1/>1 facilities logic)
- `/dashboard` → FacilityDashboardScreen
- `/rooms` → RoomsScreen
- `/rooms/[id]` → RoomDetailScreen
- `/plants` → PlantsScreen (if `trackingMode: "individual"`)
- `/batches` → BatchCyclesScreen (if `trackingMode: "batch"`)
- `/zones` → ZonesScreen (if `trackingMode: "zone"`)
- `/tasks` → TasksScreen
- `/tasks/[id]` → TaskDetailScreen
- `/inventory` → InventoryScreen (facility)
- `/team` → TeamScreen
- `/sops` → SOPsScreen
- `/compliance` → ComplianceScreen
- `/audit` → AuditLogsScreen
- `/metrc` → METRCIntegrationScreen (if enabled)
- `/reports` → ReportsScreen
- `/profile` → ProfileScreen

**Capabilities**:

- `facility.dashboard`
- `facility.compliance`
- `facility.team`
- `facility.sops`
- `facility.audit`
- `facility.metrc`
- `facility.task_verification`
- `facility.ops_analytics`

**Gating**:

- Must have `plan: "facility"` and `mode: "facility"`
- Actions gated by `facilityRole` (OWNER/MANAGER/STAFF/VIEWER/AUDITOR)

---

## 4. Home Shell Decision Logic

The `/home` route should act as a **mode-aware shell** that routes to different implementations:

```typescript
// src/app/home/index.tsx

export default function Home() {
  const ent = useEntitlements();
  const facility = useFacility();

  if (!ent.ready) return <Loading />;

  // Personal mode → Personal home
  if (ent.mode === "personal") {
    return <PersonalHome />;
  }

  // Commercial mode → Need facility selection first
  if (ent.mode === "commercial") {
    if (!facility.isReady) return <Loading />;
    if (!facility.selectedId) return <Redirect href="/facilities" />;
    return <CommercialHome />;
  }

  // Facility mode → Need facility selection first
  if (ent.mode === "facility") {
    if (!facility.isReady) return <Loading />;
    if (!facility.selectedId) return <Redirect href="/facilities" />;
    return <FacilityHome />;
  }

  // Fallback
  return <PersonalHome />;
}
```

---

## 5. Index.tsx Routing Logic (CORRECTED)

The root `index.tsx` should:

1. Wait for auth hydration
2. Redirect unauthed → `/login`
3. Wait for entitlements hydration
4. For commercial/facility: wait for facilities hydration
5. Route based on mode + facility selection

**Current Issues**:

- ❌ Routes commercial to `/feed` but `/feed/index.tsx` is a stub
- ❌ Routes facility to `/dashboard` but `/dashboard.tsx` is a legacy stub
- ❌ No clear "facility required but not selected" flow

**Correct Logic**:

```typescript
// src/app/index.tsx

export default function Index() {
  const auth = useAuth();
  const ent = useEntitlements();
  const facility = useFacility();

  if (auth.isHydrating) return <LoadingAuth />;
  if (!auth.token) return <Redirect href="/login" />;
  if (!ent.ready) return <LoadingEntitlements />;

  // Personal users → /home (personal shell)
  if (ent.mode === "personal") {
    return <Redirect href="/home" />;
  }

  // Commercial/Facility users → need facility context first
  if (ent.mode === "commercial" || ent.mode === "facility") {
    if (!facility.isReady) return <LoadingFacilities />;

    // No facility selected → picker
    if (!facility.selectedId) {
      return <Redirect href="/facilities" />;
    }

    // Has facility → route to mode-specific landing
    if (ent.mode === "facility") {
      return <Redirect href="/dashboard" />;
    }
    if (ent.mode === "commercial") {
      return <Redirect href="/feed" />;
    }
  }

  // Fallback (shouldn't reach)
  return <Redirect href="/home" />;
}
```

---

## 6. Files to Create/Update

### High Priority (Foundation)

1. **Create**: `src/app/home/personal.tsx`
   - Personal mode home screen
   - Dashboard with plants, grows, tools, courses
2. **Create**: `src/app/home/commercial.tsx`
   - Commercial mode home screen
   - Brand dashboard, campaigns, offers, orders

3. **Create**: `src/app/home/facility.tsx`
   - Facility mode home screen
   - Facility dashboard, rooms, tasks, compliance

4. **Update**: `src/app/home/index.tsx`
   - Add mode-aware shell logic (see section 4)

5. **Delete**: `src/app/dashboard.tsx`
   - Legacy stub, conflicts with facility dashboard route

6. **Create**: `src/app/dashboard/index.tsx` (facility dashboard)
   - Real facility dashboard implementation

7. **Update**: `src/app/feed/index.tsx`
   - Real commercial feed implementation

---

## 7. Tab Navigation Structure (Future)

### Personal Mode Tabs

- Dashboard → `/home`
- Grows → `/grows`
- Diagnose → `/diagnose`
- Tools → `/tools`
- Profile → `/profile`

### Commercial Mode Tabs

- Dashboard → `/feed`
- Storefront → `/storefront`
- Campaigns → `/campaigns`
- Courses → `/courses`
- Profile → `/profile`

### Facility Mode Tabs

- Dashboard → `/dashboard`
- Rooms → `/rooms`
- Tasks → `/tasks`
- Team → `/team`
- Profile → `/profile`

---

## 8. Backend Contract Reference

From `/api/me`:

```json
{
  "user": {
    "id": "...",
    "email": "...",
    "name": "...",
    "mode": "personal|commercial|facility",
    "plan": "free|pro|creator_plus|commercial|facility",
    "facilitiesAccess": [
      { "facilityId": "...", "role": "OWNER|MANAGER|STAFF|VIEWER|AUDITOR" }
    ]
  },
  "ctx": {
    "mode": "personal|commercial|facility",
    "plan": "free|pro|creator_plus|commercial|facility",
    "capabilities": {
      "courses.create": true,
      "tools.vpd": true,
      "facility.dashboard": true,
      ...
    },
    "limits": {
      "maxPaidCourses": 3,
      "maxLessonsPerCourse": 20
    }
  }
}
```

---

## 9. Decision Summary

**You need to**:

1. ✅ Turn `/home` into a mode-aware shell (create personal/commercial/facility sub-screens)
2. ✅ Create real `/dashboard` for facility mode (delete legacy stub)
3. ✅ Create real `/feed` for commercial mode (replace stub)
4. ⚠️ Decide: Do you want bottom tabs now or later?
5. ⚠️ Decide: Which features to implement first (Personal grows? Facility rooms? Commercial campaigns?)

**Recommendation**:

- Start with **Personal mode** features (grows, plants, logs) since you know that domain best
- Use facility/commercial stubs for now (you already have them)
- Add tabs once you have 3+ screens per mode actually working

---

_This document is the canonical source of truth for routing decisions._
