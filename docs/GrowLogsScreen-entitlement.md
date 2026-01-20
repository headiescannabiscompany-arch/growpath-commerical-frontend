# GrowLogsScreen Entitlement Logic Documentation

## Overview

The `GrowLogsScreen` implements the Grow Log feature for users, with all features always visible and gated by the entitlement matrix. This ensures:

- No empty screens or dead ends
- All features are rendered, but may be disabled or show upgrade CTAs if not entitled
- Entitlement logic is centralized via `getEntitlement` and the `FEATURES` matrix

## Key Entitlement Features

- **Multiple Grows**: Controlled by `FEATURES.MULTIPLE_GROWS` and the user's role. If not entitled, the add grow button is disabled and an upgrade CTA is shown.
- **Grow Photo Upload**: Controlled by `FEATURES.GROW_PHOTO`. The photo upload button is always visible but disabled or shows an upgrade CTA if not entitled.
- **Advanced Grow Fields**: Controlled by `FEATURES.GROW_ADVANCED`. The advanced section toggle is always visible, but advanced fields are only usable if entitled.

## Usage Pattern

1. **Import Entitlement Utilities**
   ```js
   import { FEATURES, getEntitlement } from "../utils/entitlements.js";
   ```
2. **Get Entitlement for Each Feature**
   ```js
   const multiGrowEnt = getEntitlement(FEATURES.MULTIPLE_GROWS, user?.role);
   const photoEnt = getEntitlement(FEATURES.GROW_PHOTO, user?.role);
   const advancedEnt = getEntitlement(FEATURES.GROW_ADVANCED, user?.role);
   ```
3. **Gate UI Elements**
   - Render all feature UI elements.
   - Use the entitlement value to set `disabled`, `opacity`, and CTA text.
   - Example:
     ```js
     <PrimaryButton onPress={handleAddGrow} disabled={multiGrowEnt !== "enabled"}>
       {multiGrowEnt === "cta" ? "Upgrade to add multiple grows" : "Create Grow"}
     </PrimaryButton>
     ```

## Best Practices

- **Always render** all feature UI, even if not entitled.
- Use `getEntitlement(feature, role)` for all gating logic.
- Show upgrade CTAs or tooltips for gated features.
- Never leave a screen empty; provide context and next steps.

## Example Entitlement Matrix Usage

See `src/utils/entitlements.js` for the full matrix and utility.

## References

- [GrowLogsScreen.js](src/screens/GrowLogsScreen.js)
- [entitlements.js](src/utils/entitlements.js)
- [COMPLETE_DELIVERY_REPORT.txt](COMPLETE_DELIVERY_REPORT.txt)

---

_Last updated: January 18, 2026_
