# GrowPath Copilot-Ready TODOs (Pricing, Permissions, Courses)

## 1. Feature Flag Integration

- [ ] Implement plan-based feature gating using FEATURE_FLAGS.md
- [ ] Add plan and role fields to user model (see DB_SCHEMA_DIFF.sql)
- [ ] Enforce course creation, lesson, and certificate limits by plan

## 2. Course System

- [ ] Build CourseCreateScreen (multi-step, plan-based limits)
- [ ] Build CourseModerationScreen (admin/mod only)
- [ ] Add course approval flow for free/pro users
- [ ] Add course analytics (basic/advanced by plan)
- [ ] Add CreatorDashboardScreen (creator_plus, commercial, facility)
- [ ] Add course sales and payout UX

## 3. Grow Tools

- [ ] Gate advanced tools (feed scheduler, harvest estimator, timeline, export) by plan
- [ ] Add pheno matrix UI (pro+, commercial, facility)

## 4. Commercial/Facility

- [ ] Build PartnerDashboardScreen (commercial)
- [ ] Build FacilityDashboardScreen (facility)
- [ ] Add compliance, team roles, SOPs, audit logs, METRC, task verification, analytics screens (facility)

## 5. Moderation & Admin

- [ ] Build admin moderation panel for courses
- [ ] Add backend hooks for moderation, approval, and reporting

## 6. UI/UX

- [ ] Hide/show features and screens based on user.plan and user.role
- [ ] Add dropdowns for advanced tools in single user mode

## 7. Documentation

- [ ] Keep FEATURE_FLAGS.md, DB_SCHEMA_DIFF.sql, and FRONTEND_SCREEN_MAP.md up to date

# Reference FEATURE_FLAGS.md for all plan-based logic

# Reference DB_SCHEMA_DIFF.sql for backend changes

# Reference FRONTEND_SCREEN_MAP.md for UI structure
