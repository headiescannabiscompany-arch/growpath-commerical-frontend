# GrowPath Frontend Screen Map

> Status: CANONICAL
> Owner: Product/Engineering
> Last reviewed: 2026-06-21
> Source of truth for: navigation, shell separation, capability gating, and
> workflow ownership

## 0) Identity Contract

All navigation and gating is driven by:

```http
GET /api/auth/me
```

The response supplies `mode`, `plan`, `capabilities`, `limits`, active facility
context, and facility role. No screen should infer access from plan or role
names alone.

## 1) Shells

### Personal Shell

- Audience: single grower.
- Root tabs: Dashboard, Grows, Logs, Tools, Feed, Forum, Courses, Profile.

### Commercial Shell

- Audience: brand, seller, creator, or commercial partner.
- Root tabs: CommercialDashboard, Storefront, CommercialTools,
  CommercialReports, CommercialProfile.
- Stack workflows: Links, Campaigns, CommercialOrders, CommercialInventory,
  Courses, CreateCourse, CourseDetail, Lesson, Marketplace, and billing status.

### Facility Shell

- Audience: multi-user facility operations.
- Root tabs: FacilityDashboard, Rooms, Plants/Batches/Zones, Tasks, Inventory,
  Reports, Compliance, SOPs, Audit, Team, Profile.

Commercial and Facility are separate operating shells, not features toggled on
inside the Personal shell.

## 2) Shared Screens

- LoginScreen
- RegisterScreen
- ProfileScreen
- SettingsScreen

Everything else belongs to a shell or an explicitly shared workflow.

## 3) Personal Tools

- SoilCalculatorScreen -> soil tool capability.
- NPKCalculatorScreen -> NPK tool capability.
- VPDToolScreen -> VPD tool capability.
- FeedSchedulerScreen -> feed scheduler capability.
- HarvestEstimatorScreen -> harvest estimator capability.
- TimelinePlannerScreen -> timeline planner capability.
- PDFExportScreen -> export capability.
- PhenoMatrixScreen -> phenotype scoring and keeper ranking capability.

Plan mapping is expressed as capabilities and limits from `/api/auth/me`.

## 4) Course System

- CoursesScreen -> course view capability.
- CourseDetailScreen -> course detail/enrollment/payment status capability.
- CreateCourseScreen -> course creation capability and course limits.
- AddLessonScreen / EditLessonScreen / LessonScreen -> lesson capability and
  lesson limits.
- EarningsScreen / CreatorPayoutScreen / AdminPayoutsScreen -> creator earnings
  and payout capabilities.
- AdminCoursesScreen -> course moderation capability.

Course limits come from `ctx.limits`, including `maxPaidCourses`,
`maxLessonsPerCourse`, and certificate limits.

## 5) Commercial Shell

- CommercialDashboardScreen -> summarizes storefront, products, courses, links,
  campaigns, orders, and inventory from commercial endpoints.
- StorefrontScreen -> manages storefront identity and product
  create/update/delete/publish state through `/api/commercial`.
- LinksScreen -> manages public commercial links.
- CampaignsScreen / AdvertisingScreen -> manages marketing campaign workflows.
- CommercialOrdersScreen -> reviews commercial orders.
- CommercialInventoryScreen -> lists and searches basic commercial inventory.
- CoursesScreen / CreateCourseScreen / CourseDetailScreen -> manages commercial
  courses using course capabilities and limits.
- CommercialToolsScreen -> entry point for social tools, marketplace,
  advertising, and related commercial workflows.
- CommercialReportsScreen -> commercial reporting workflows.
- MarketplaceScreen / MarketplaceDetailScreen -> marketplace browse, detail, and
  purchase request workflows.

## 6) Facility Shell

- FacilityDashboardTab -> summarizes grows, plants, rooms, batch cycles, tasks,
  inventory, logs, team, SOPs, audit logs, verification queue, and reports.
- FacilityRoomsTab -> manages rooms and batch cycles through facility-scoped
  endpoints.
- FacilityTasksRoute / FacilityTaskDetail -> creates, edits, assigns,
  completes, reopens, and deletes facility tasks with facility role checks.
- FacilityReportsTab -> reads `/api/facilities/:facilityId/reports/summary`.
- FacilityComplianceTab -> manages deviations, SOP templates, audit events, and
  verification approvals/rejections.
- SOP runs routes -> start, list, compare, and inspect SOP runs.
- Audit log routes -> list audit events and inspect event details.
- FacilityTeamTab -> lists team members and sends invites when role allows.
- Inventory, plants, grows, and logs tabs -> facility-scoped operational data.

Facility capability allows screen access. Facility role authorizes actions
inside the active facility, and the backend remains authoritative for every
facility-scoped request.

## 7) Rendering Rules

- Shell selection is by `ctx.mode`.
- Screen visibility is by canonical capabilities.
- Limits are read from `ctx.limits`.
- Facility actions also consider `ctx.facilityRole`.
- Backend authorization remains required for every mutation.

## 8) Drift Prevention

Avoid language such as "show based on plan" or "show based on role". Use:

```text
mode -> capabilities -> limits -> facilityRole
```

When routes or workflow ownership change, update this map in the same change.
