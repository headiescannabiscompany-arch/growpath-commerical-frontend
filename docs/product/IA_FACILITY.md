# Facility IA (v1)

## Scope (locked)
Facility is a role-based, multi-user ops app. Permissions come from OWNER/MANAGER invites.

### IN (Functional targets)
- Dashboard (Today)
- Tasks
- Grows
- Plants
- Logs
- Inventory
- Team (OWNER/MANAGER only)
- Profile/Settings (basic account + facility context + logout)

### OUT (Planned screens, no broken calls)
- Rooms
- Compliance
- Audit Logs
- SOP Templates / SOP Runs
- AI Tools (as a Tools hub inside facility)

---

## Roles (locked)
- OWNER: all capabilities
- MANAGER: all ops, invite/manage team
- STAFF: ops work only, no team admin
- VIEWER: read-only
- Legacy alias: TECH -> STAFF

---

## Team invites (v1)
- Delivery: manual link/token copy
- Acceptance: `/invites/:token/accept`
- Email delivery is v1.1

---

## Tasks (v1 workflow)
- Assignable: yes
- Required fields: `title`
- Optional fields: `dueAt`, `assignedToUserId`, `priority`, `notes`, `photo`
- Statuses: `OPEN` -> `IN_PROGRESS` -> `DONE` (backend-supported)
- Actions:
  - Create task: OWNER/MANAGER/STAFF
  - Assign/reassign: OWNER/MANAGER
  - Mark IN_PROGRESS/DONE: assignee + OWNER/MANAGER
  - VIEWER: read-only

---

## Device modes
- Kiosk mode: Planned (v1.1)
- Tablet: same app UI, touch-first layouts (no separate auth in v1)

---

## Done criteria (facility)
- OWNER can invite and see team list
- STAFF cannot invite
- VIEWER cannot mutate
- Tasks flow supports create, assign, status updates
- No broken buttons on IN routes; OUT routes show Planned
