# GrowPath Frontend Screen Map (Pricing & Permissions)

## Account Types

- Free User (plan: free)
- Pro Grower (plan: pro)
- Creator Plus (plan: creator_plus)
- Commercial Partner (plan: commercial)
- Facility (plan: facility)

## Core Screens

- LoginScreen
- RegisterScreen
- DashboardScreen
- FeedScreen
- ForumScreen
- ProfileScreen
- SettingsScreen

## Grow Tools

- SoilCalculatorScreen (all plans)
- NPKCalculatorScreen (all plans)
- VPDToolScreen (all plans)
- FeedSchedulerScreen (pro+)
- HarvestEstimatorScreen (pro+)
- TimelinePlannerScreen (pro+)
- PDFExportScreen (pro+)

## Course System

- CourseListScreen
- CourseDetailScreen
- CourseCreateScreen (all plans, limits by plan)
- CourseEditScreen
- CourseSalesScreen
- CourseModerationScreen (admin/mod only)
- CreatorDashboardScreen (creator_plus, commercial, facility)

## Commercial/Facility

- PartnerDashboardScreen (commercial)
- OffersScreen (commercial)
- FacilityDashboardScreen (facility)
- ComplianceScreen (facility)
- TeamRolesScreen (facility)
- SOPsScreen (facility)
- AuditLogsScreen (facility)
- METRCIntegrationScreen (facility)
- TaskVerificationScreen (facility)
- OperationalAnalyticsScreen (facility)

## Feature Gating Example

- Show/hide screens and features based on user.plan and user.role
- Use FEATURE_FLAGS.md for logic

# See FEATURE_FLAGS.md for plan-based feature logic
