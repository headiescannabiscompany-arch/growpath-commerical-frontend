# Legacy UI Diff (Single‑User Baseline)

## Legacy sources scanned
- `C:\GrowPathAI-UI` (UI source)
- `C:\GrowPathAI-UI-UI` (backend only; no UI source found)

## Legacy Single‑User Tabs
From `C:\GrowPathAI-UI\src\navigation\MainTabs.js`:
1. Home (DashboardScreen)
2. Plants (GrowLogsScreen)
3. Diagnose (DiagnoseScreen)
4. Search (SearchScreen)
5. Feed (FeedScreen, Pro only)
6. Forum (ForumScreen)
7. Courses (CoursesScreen)
8. Profile (ProfileScreen)
9. Calendar (GrowLogCalendarScreen)

## Legacy Grow Backbone
From `GrowLogsScreen` and `GrowJournalScreen`:
- Grow creation happens in GrowLogs (with plant identities and environment).
- Grow detail (GrowJournal) contains:
  - Plant identities
  - Grow log entries
  - Optional photo upload (Pro-gated)

## Current App (expo-router) Personal Tabs
From `src/app/home/personal/(tabs)`:
- `index` (home)
- `grows/*`
- `logs/*`
- `tools/*`
- `courses`
- `forum/*`
- `diagnose`
- `ai/*`
- `profile/*`
- `tasks`

## Diff Summary (legacy -> current)
| Legacy tab/screen | Current route(s) | Notes |
| --- | --- | --- |
| Home/Dashboard | `/home/personal/(tabs)/index` | Needs legacy dashboard layout parity. |
| Plants/GrowLogs | `/home/personal/(tabs)/grows/*` | Must keep Grow as center (plants + logs). |
| Diagnose | `/home/personal/(tabs)/diagnose` | Ensure gating by plan/limits. |
| Search | (no direct tab) | Decide if remains in personal. |
| Feed (Pro) | `/feed` or commercial feed | Needs explicit owner. |
| Forum | `/home/personal/(tabs)/forum/*` | Ensure post/[id] param correctness. |
| Courses | `/home/personal/(tabs)/courses` | Align to legacy behavior. |
| Profile | `/home/personal/(tabs)/profile` | Must show plan/mode/email. |
| Calendar | (no direct tab) | Decide if personal gets calendar. |

