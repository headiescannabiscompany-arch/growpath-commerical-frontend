# Routes (v1)

## Status legend (locked)
- Functional (Verified): route works end-to-end and passed SOP clicklist
- Functional (Unverified): route is implemented but has not passed SOP clicklist
- Disabled: route exists but user cannot use it; shows a clear reason
- Planned: route exists as placeholder; no broken calls; clear "Planned"
- Deprecated: route should redirect to the correct shell (no standalone UI)

---

## Bootstrap/Auth
- `/` (src/app/index.tsx)  Functional  routes by /api/me + preferredMode
- `/login` (src/app/login.tsx)  Functional
- `/register` (src/app/register.tsx)  Functional
- `/onboarding/*`  Functional or Planned per screen:
  - `/onboarding/index.tsx`  Functional
  - `/onboarding/create-facility.tsx`  Functional (facility creation flow)
  - `/onboarding/join-facility.tsx`  Functional (invite/join flow)
  - `/onboarding/pick-facility.tsx`  Functional (if user has multiple)
  - `/onboarding/first-setup.tsx`  Functional (facility setup)
  - `/onboarding/start-grow.tsx`  Planned unless verified
  - `/onboarding/assign-plants.tsx`  Planned unless verified

---

## Group A: Single User shell (Free + Pro)
Owner root:
- `/home/personal/(tabs)/index.tsx`  Functional (dashboard)
- `/home/personal/(tabs)/grows/index.tsx`  Functional (grows list)
- `/home/personal/(tabs)/grows/new.tsx`  Functional (create grow)
- `/home/personal/(tabs)/grows/[growId].tsx`  Functional (grow detail; must contain plants+logs entry points)
- `/home/personal/(tabs)/logs/index.tsx`  Functional (logs list)
- `/home/personal/(tabs)/logs/new.tsx`  Functional (create log)
- `/home/personal/(tabs)/logs/[logId].tsx`  Functional (log detail)
- `/home/personal/(tabs)/tools/index.tsx`  Functional (tools list)
- `/home/personal/(tabs)/tools/vpd.tsx`  Functional (VPD)
- `/home/personal/(tabs)/forum`  Functional (forum list)
- `/home/personal/(tabs)/forum/post/[id].tsx`  Functional (requires id)
- `/home/personal/(tabs)/forum/new-post.tsx`  Functional or Disabled (pick one; must not error)
- `/home/personal/(tabs)/courses.tsx`  Functional (courses list)
- `/home/personal/(tabs)/diagnose.tsx`  Functional or Disabled (capability-gated)
- `/home/personal/(tabs)/ai/index.tsx`  Functional (AI assistant UI)
- `/home/personal/(tabs)/profile/index.tsx`  Functional
- `/home/personal/(tabs)/tasks.tsx`  Disabled (reason: personal tasks not enabled; facility tasks live in facility mode)

---

## Group B: Commercial (paid overlays)
- `/home/commercial.tsx`  Functional (commercial shell entry)
- `/home/commercial/inventory.tsx`  Functional
- `/home/commercial/inventory-item/[id].tsx`  Functional
- `/(commercial)/feed/index.tsx`  Functional (if still used)
- `/(commercial)/alerts/[id].tsx`  Functional
- `/(commercial)/tasks/[id].tsx`  Functional
- `/(commercial)/logs/[id].tsx`  Functional

Commercial rule:
- Commercial must look like Pro Single + overlays. If a route duplicates single-user pages, it should redirect or share UI.

---

## Group B: Facility (paid role-based)
Core:
- `/home/facility/index.tsx`  Functional (routes to select or dashboard)
- `/home/facility/select.tsx`  Functional (choose facility context)
- `/home/facility/(tabs)/dashboard.tsx`  Functional
- `/home/facility/(tabs)/tasks.tsx`  Functional (role-gated mutations)
- `/home/facility/tasks/[id].tsx`  Functional
- `/home/facility/(tabs)/grows.tsx`  Functional
- `/home/facility/grows/[id]`  Planned unless verified
- `/home/facility/(tabs)/plants.tsx`  Functional
- `/home/facility/plants/[id].tsx`  Functional
- `/home/facility/(tabs)/logs.tsx`  Functional
- `/home/facility/logs/[id].tsx`  Functional
- `/home/facility/(tabs)/team.tsx`  Functional (OWNER/MANAGER invite only)
- `/home/facility/(tabs)/inventory.tsx`  Functional
- `/home/facility/(tabs)/InventoryItemDetailScreen.tsx`  Functional
- `/home/facility/(tabs)/CreateInventoryItemScreen.tsx`  Planned unless verified

Compliance/audit/SOP/AI:
- `/home/facility/(tabs)/compliance.tsx`  Planned unless verified end-to-end
- `/home/facility/(tabs)/audit-logs.tsx`  Planned unless verified end-to-end
- `/home/facility/audit-logs/*`  Planned unless verified
- `/home/facility/(tabs)/sop-runs.tsx`  Planned unless verified
- `/home/facility/sop-runs/*`  Planned unless verified
- `/home/facility/(tabs)/ai-tools.tsx`  Planned unless verified

---

## Legacy root routes (must not be standalone)
These exist outside the shells and must be Deprecated -> redirect into /home based on /api/me:
- `/feed`
- `/forum`
- `/courses`
- `/diagnose`
- `/dashboard`
- `/tools`
- `/profile`
(Keep only if they are true shared entry points; otherwise redirect.)
