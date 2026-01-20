# Entitlement Logic and Matrix Usage

## Overview

This documentation explains how to use the entitlement matrix and `getEntitlement` utility to gate features across all main screens. The goal is to ensure:

- All features are always visible (never hidden)
- Features are gated by capability (entitlement)
- Disabled states, tooltips, and upgrade CTAs are used for gated features
- No empty screens or dead ends
- Consistency and scalability for future features and roles

## Central Entitlement Utility

- **File:** `src/utils/entitlements.js`
- **Exports:**
  - `FEATURES`: Enum of all feature keys
  - `getEntitlement(feature, role)`: Returns entitlement state for a feature and user role
- **Entitlement States:**
  - `"enabled"`: Feature is fully available
  - `"cta"`: Feature is gated, show upgrade CTA
  - `"disabled"`: Feature is visible but not usable (show tooltip or disabled state)

## Usage Pattern (All Screens)

1. **Import the Utility**
   ```js
   import { FEATURES, getEntitlement } from "../utils/entitlements.js";
   ```
2. **Get Entitlement for Each Feature**
   ```js
   const featureEnt = getEntitlement(FEATURES.FEATURE_KEY, user?.role);
   ```
3. **Gate UI Elements**
   - Always render the UI for every feature
   - Use the entitlement value to set `disabled`, `opacity`, and CTA/tooltip text
   - Example:
     ```js
     <PrimaryButton onPress={handleAction} disabled={featureEnt !== "enabled"}>
       {featureEnt === "cta" ? "Upgrade to use this feature" : "Do Action"}
     </PrimaryButton>
     ```

## Best Practices

- **Never hide** features based on entitlement; always render with appropriate gating
- Use `getEntitlement` for all feature gating logic
- Show upgrade CTAs or tooltips for gated features
- Provide context and next steps if a feature is gated
- Reference the entitlement matrix for all new features and roles

## Example: GrowLogsScreen

- **Multiple Grows:**
  - Gated by `FEATURES.MULTIPLE_GROWS`
  - Add button is always visible, disabled or shows CTA if not entitled
- **Photo Upload:**
  - Gated by `FEATURES.GROW_PHOTO`
  - Upload button is always visible, disabled or shows CTA if not entitled
- **Advanced Fields:**
  - Gated by `FEATURES.GROW_ADVANCED`
  - Advanced section toggle is always visible, fields are gated

## Example: DashboardScreen

- **Analytics, Export, Team Tools, Add Plant:**
  - Each feature is gated by its respective `FEATURES` key
  - UI is always rendered, with disabled state or CTA as needed

## Example: DiagnoseScreen

- **AI Diagnosis, Advanced, Vision:**
  - Gated by `FEATURES.AI_DIAGNOSE`, `FEATURES.DIAGNOSE_ADVANCED`, etc.
  - UI is always rendered, with gating logic applied

## Example: CoursesScreen

- **Course Creation, Analytics, Affiliate:**
  - Gated by `FEATURES.COURSE_CREATE`, `FEATURES.COURSE_ANALYTICS`, etc.
  - UI is always rendered, with gating logic applied

## Example: ForumScreen

- **Featured, Brand, Insights:**
  - Gated by `FEATURES.FORUM_FEATURED`, `FEATURES.FORUM_BRAND`, etc.
  - UI is always rendered, with gating logic applied

## Example: ProfileScreen

- **Role-based Features, Workspace Toggles:**
  - Gated by role and `FEATURES` keys
  - UI is always rendered, with gating logic applied

## Adding New Features

1. Add the feature key to `FEATURES` in `entitlements.js`
2. Update the entitlement matrix for all roles
3. Use `getEntitlement` in the relevant screen/component
4. Render the feature UI, gated by the entitlement value

## References

- [entitlements.js](../utils/entitlements.js)
- [COMPLETE_DELIVERY_REPORT.txt](../COMPLETE_DELIVERY_REPORT.txt)
- [GrowLogsScreen-entitlement.md](GrowLogsScreen-entitlement.md)

---

_Last updated: January 18, 2026_
