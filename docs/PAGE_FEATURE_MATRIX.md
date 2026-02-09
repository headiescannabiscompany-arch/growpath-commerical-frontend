# Page & Feature Matrix (v1)

This matrix enumerates all screens/routes and defines mode access, required context, and CTA status.
Contract source of truth: docs/ACCOUNT_MODE_CONTRACT.md

Legend:

- ✅ = implemented + correct
- 🚧 = partially implemented / incomplete
- ❌ = not available by contract
- ⚠️ = available but missing CTAs / empty states / gating

## Modes

- SINGLE_USER
- COMMERCIAL
- FACILITY

## Required Context Flags

- requiresFacilityId
- requiresBrandId
- roleGated (OWNER/MANAGER/STAFF/VIEWER)

---

## Matrix

| Screen                   | Route                                   | SINGLE | COMMERCIAL | FACILITY | requiresFacilityId | requiresBrandId | roleGated | CTAs correct | Empty states locked | Notes / Gaps                                        |
| ------------------------ | --------------------------------------- | -----: | ---------: | -------: | -----------------: | --------------: | --------: | -----------: | ------------------: | --------------------------------------------------- |
| AI4 Compliance Dashboard | /home/facility/compliance/ai4.dashboard |     ❌ |         ❌ |       ✅ |                 ✅ |              ❌ |        ✅ |           ✅ |                  ✅ | Backend: deviations summary + SOP recommended wired |
| Weekly Reports List      | /home/facility/compliance/reports       |     ❌ |         ❌ |       ✅ |                 ✅ |              ❌ |        ✅ |           ✅ |                  ✅ | weeklyReportsStore + report detail + export         |
| Weekly Report Detail     | /home/facility/compliance/report-detail |     ❌ |         ❌ |       ✅ |                 ✅ |              ❌ |        ✅ |           ✅ |                  ✅ | deep links verified                                 |
| Compare Result (AI3.3)   | /home/facility/sop-runs/compare-result  |     ❌ |         ❌ |       ✅ |                 ✅ |              ❌ |        ✅ |           🚧 |                  ✅ | Must confirm route + ensure highlights link back    |
| SOP Recommendations View | /home/facility/sops                     |     ❌ |         🚧 |       ✅ |                 ✅ |         (maybe) |        ✅ |           🚧 |                  ✅ | depends on if commercial supports SOP templates     |
| Deviations Summary View  | /home/facility/compliance               |     ❌ |         ❌ |       ✅ |                 ✅ |              ❌ |        ✅ |           ✅ |                  ✅ | open/recurring + action queue ordering              |
| Courses                  | /courses                                |     ✅ |         ✅ |       ✅ |                 ❌ |              ❌ |        ❌ |           🚧 |                  🚧 | "TODO" at line 40                                   |
| Diagnose                 | /diagnose                               |     ✅ |         ✅ |       ✅ |                 ❌ |              ❌ |        ❌ |           🚧 |                  🚧 | "TODO" at line 40                                   |
| Feed                     | /feed                                   |     ✅ |         ✅ |       ✅ |                 ❌ |              ❌ |        ❌ |           🚧 |                  🚧 | "TODO" at line 16                                   |
| Forum                    | /forum                                  |     ✅ |         ✅ |       ✅ |                 ❌ |              ❌ |        ❌ |           🚧 |                  🚧 | "TODO" at line 40                                   |
| Create Facility          | /onboarding/create-facility             |     ❌ |         ✅ |       ✅ |                 🚧 |              🚧 |        🚧 |           🚧 |                  🚧 | "TODO" at line 58                                   |
| Join Facility            | /onboarding/join-facility               |     ❌ |         ✅ |       ✅ |                 🚧 |              🚧 |        🚧 |           🚧 |                  🚧 | "TODO" at line 7                                    |
| Pick Facility            | /onboarding/pick-facility               |     ❌ |         ✅ |       ✅ |                 🚧 |              🚧 |        🚧 |           🚧 |                  🚧 | "TODO" at line 7                                    |
| Profile                  | /profile                                |     ✅ |         ✅ |       ✅ |                 ❌ |              ❌ |        ❌ |           🚧 |                  🚧 | "TODO" at line 40                                   |

<!-- Remaining routes will be filled in next pass -->
