# GrowPath Frontend Screen Map (OS Shells, Capabilities, Limits)

> Status: CANONICAL
> Owner: Product/Engineering
> Last reviewed: 2026-01-24
> Source of truth for: Navigation, gating, and contract-driven UI

---

## 0) Identity Contract (Single Source of Truth)

All navigation and gating is driven by:

    	GET /api/auth/me → returns:
    		mode: personal | commercial | facility
    		plan: free | pro | creator_plus | commercial | facility
    		capabilities: { [key]: boolean }
    		facilitiesAccess[]: { facilityId, role: OWNER|MANAGER|STAFF }

**Rule:** No screen should guess. If it’s not in /auth/me, it’s not real.

---

## 1) Shells (Mode → Navigation Root)

### A) Personal Shell (mode: personal)

- Audience: single user
- Plans: free, pro, creator_plus
- Root Tabs: Dashboard, Grows, Grow Log, Diagnose, Tools, Feed, Forum, Profile

### B) Commercial Shell (mode: commercial)

- Audience: brand/seller/creator business
- Plans: commercial (and optionally creator_plus if you allow it)
- Root Tabs: CommercialDashboard, Storefront, Campaigns, Orders, Inventory, Courses, Communities, Profile

### C) Facility Shell (mode: facility)

- Audience: multi-user operations
- Plans: facility
- Root Tabs: FacilityDashboard, Rooms, Plants/Batches/Zones (trackingMode), Tasks, Inventory, Team, Reports, Compliance, Profile

_Commercial and Facility are not “features turned on.” They are different operating shells._

---

## 2) Core Screens (Shared Across Shells)

- LoginScreen
- RegisterScreen
- ProfileScreen
- SettingsScreen

(Everything else must live under a shell.)

---

## 3) Tools & Features (Capabilities → Access)

**Grow Tools (Personal Shell primarily):**

- SoilCalculatorScreen → cap.tools_soil_calc
- NPKCalculatorScreen → cap.tools_npk_calc
- VPDToolScreen → cap.tools_vpd
- FeedSchedulerScreen → cap.tools_feed_scheduler
- HarvestEstimatorScreen → cap.tools_harvest_estimator
- TimelinePlannerScreen → cap.tools_timeline
- PDFExportScreen → cap.export_pdf

_Plan mapping is expressed as capabilities in /auth/me (not hardcoded in screens)._

---

## 4) Course System (Shared Feature, Different Rules)

**Screens:**

- CourseListScreen → cap.courses_browse
- CourseDetailScreen → cap.courses_view
- CourseCreateScreen → cap.courses_create + plan limits
- CourseEditScreen → cap.courses_edit_own
- CourseSales/EarningsScreen → cap.courses_earnings
- CourseModerationScreen → cap.courses_moderate (admin/mod capability, not “role”)
- CreatorDashboardScreen → cap.creator_dashboard

**Plan Limits (not gating):**

- limits.maxPaidCourses
- limits.maxLessonsPerCourse
- limits.requiresApprovalForFirstCourse (or capability flag)

_These come from /auth/me so frontend doesn’t drift._

---

## 5) Commercial (Commercial Shell Only)

- PartnerDashboardScreen → cap.commercial_dashboard
- OffersScreen → cap.commercial_offers
- StorefrontScreen → cap.storefront_manage
- Campaigns/AdvertisingScreen → cap.marketing_campaigns
- SocialMediaScreen → cap.social_connect
- OrdersScreen → cap.orders_manage
- InventoryScreen → cap.inventory_manage
- CommunitiesScreen → cap.communities_manage

---

## 6) Facility (Facility Shell Only + Facility Role Authority)

**Screens (capability-gated):**

- FacilityDashboardScreen → cap.facility_dashboard
- RoomsScreen → cap.rooms
- Plants/Batches/Zones (trackingMode-driven) → cap.tracking\_\*
- TasksScreen → cap.tasks
- TeamRolesScreen → cap.team_manage
- SOPsScreen → cap.sops
- AuditLogsScreen → cap.audit_logs
- ComplianceScreen → cap.compliance
- METRCIntegrationScreen → cap.metrc_aligned (or cap.metrc_sync if later)
- TaskVerificationScreen → cap.task_verification
- OperationalAnalyticsScreen → cap.ops_analytics

**Authority (facilityRole inside facilitiesAccess):**

- OWNER/MANAGER: create SOPs, verify tasks, change trackingMode, resolve deviations
- STAFF: complete tasks, create logs, view SOPs

_Rule: capability allows the screen; role allows the action._

---

## 7) Rendering Rules (What UI Must Do)

- Shell selection: by mode only
- Tab/screen visibility: by capabilities
- Limits: by limits object
- Buttons/actions: by facilityRole (facility mode only)

---

## 8) Delete / Rename Notes (Drift Prevention)

Remove language like:

> “Show/hide based on user.plan and user.role”

Replace with:

> “Show/hide based on mode → capabilities → limits → facilityRole”

---

_If you paste your current FEATURE_FLAGS.md (or whatever you’re using) I’ll translate it into:_

- a clean capabilities key list (canonical), and
- a getEntitlements(user) mapping that outputs { mode, plan, capabilities, limits } so VS Code can make backend + frontend match exactly.
