# User Flow Test Matrix and Documentation

## Overview

This document details the tested user flows for all main screens and all user roles (Free, Pro, Influencer, Commercial, Facility). Each flow is validated for entitlement logic, UI gating, upgrade CTAs, and the absence of empty screens or dead ends.

---

## User Roles

- **Free**
- **Pro**
- **Influencer**
- **Commercial Suite**
- **Facility Suite**

## Main Screens

- Dashboard
- GrowLogs
- Diagnose
- Courses
- Forum
- Profile

---

## Test Matrix

| Screen    | Feature             | Free | Pro | Influencer | Commercial | Facility | Notes                                      |
| --------- | ------------------- | ---- | --- | ---------- | ---------- | -------- | ------------------------------------------ |
| Dashboard | Analytics           | CTA  | ✓   | ✓          | ✓          | ✓        | CTA = Upgrade CTA shown, ✓ = enabled       |
| Dashboard | Export              | CTA  | ✓   | ✓          | ✓          | ✓        |                                            |
| Dashboard | Team Tools          | CTA  | CTA | ✓          | ✓          | ✓        |                                            |
| Dashboard | Add Plant           | ✓    | ✓   | ✓          | ✓          | ✓        |                                            |
| GrowLogs  | Multiple Grows      | CTA  | ✓   | ✓          | ✓          | ✓        | Button always visible, CTA if not entitled |
| GrowLogs  | Grow Photo Upload   | CTA  | ✓   | ✓          | ✓          | ✓        | Button always visible, CTA if not entitled |
| GrowLogs  | Advanced Fields     | CTA  | ✓   | ✓          | ✓          | ✓        | Toggle always visible                      |
| Diagnose  | AI Diagnosis        | CTA  | ✓   | ✓          | ✓          | ✓        | Button always visible, CTA if not entitled |
| Diagnose  | Advanced            | CTA  | ✓   | ✓          | ✓          | ✓        |                                            |
| Diagnose  | Vision              | CTA  | ✓   | ✓          | ✓          | ✓        |                                            |
| Courses   | Course Creation     | CTA  | CTA | ✓          | ✓          | ✓        | Button always visible, CTA if not entitled |
| Courses   | Analytics           | CTA  | ✓   | ✓          | ✓          | ✓        |                                            |
| Courses   | Affiliate           | CTA  | CTA | ✓          | ✓          | ✓        |                                            |
| Forum     | Featured            | CTA  | ✓   | ✓          | ✓          | ✓        |                                            |
| Forum     | Brand               | CTA  | CTA | ✓          | ✓          | ✓        |                                            |
| Forum     | Insights            | CTA  | ✓   | ✓          | ✓          | ✓        |                                            |
| Profile   | Workspace Toggles   | CTA  | ✓   | ✓          | ✓          | ✓        |                                            |
| Profile   | Role-based Features | CTA  | ✓   | ✓          | ✓          | ✓        |                                            |

---

## Flow Documentation

### 1. Dashboard

- All features always rendered.
- Gated features show disabled state or upgrade CTA if not entitled.
- No empty states; always context and next steps.

### 2. GrowLogs

- All creation and management features always visible.
- Add Grow, Photo Upload, and Advanced Fields gated by entitlement.
- Upgrade CTA or tooltip shown if not entitled.
- No empty states; always context and next steps.

### 3. Diagnose

- AI Diagnosis, Advanced, and Vision features always visible.
- Gated by entitlement; upgrade CTA or tooltip if not entitled.
- No empty states; always context and next steps.

### 4. Courses

- Course creation, analytics, and affiliate features always visible.
- Gated by entitlement; upgrade CTA or tooltip if not entitled.
- No empty states; always context and next steps.

### 5. Forum

- Featured, Brand, and Insights features always visible.
- Gated by entitlement; upgrade CTA or tooltip if not entitled.
- No empty states; always context and next steps.

### 6. Profile

- Workspace toggles and role-based features always visible.
- Gated by entitlement; upgrade CTA or tooltip if not entitled.
- No empty states; always context and next steps.

---

## Testing Methodology

- Each role was tested on all main screens.
- Confirmed that all features are always visible.
- Confirmed that gating logic matches the entitlement matrix.
- Confirmed that upgrade CTAs and tooltips are present for gated features.
- Confirmed that no screen is ever empty or a dead end.

---

_Last updated: January 18, 2026_
