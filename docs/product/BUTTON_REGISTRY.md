# Button Registry (v1)

Last updated: 2026-02-25

## Rule (locked)
Every visible button must be one of:
- Functional (navigates or mutates successfully)
- Disabled (with a reason string)
- Planned (explicit placeholder screen; no broken navigation)

---

## Evidence sources
- Navigation actions: tmp/spec/nav_actions.txt
- API mutations/reads: tmp/spec/api_mutations.txt
- Route inventory: tmp/spec/route_tree.txt

---

## Seed registry (must-not-break buttons)

### Single User (Free/Pro)
1) Create Grow
- Where: /home/personal/(tabs)/grows/new
- Action: POST /api/personal/grows
- Gating: Free/Pro allowed (limits apply)
- Status: Functional

2) Add Log Entry
- Where: /home/personal/(tabs)/logs/new
- Action: POST /api/personal/logs
- Gating: Free/Pro allowed (limits apply)
- Status: Functional

3) VPD calculator
- Where: /home/personal/(tabs)/tools/vpd
- Action: local compute
- Gating: none
- Status: Functional

4) Forum New Post
- Where: /home/personal/(tabs)/forum/new-post
- Action: POST /api/forum/posts
- Gating: FORUM_POST (Free allowed unless you choose otherwise)
- Status: Functional OR Disabled (must choose, must not error)

---

### Facility
1) Invite team member
- Where: /home/facility/(tabs)/team
- Action: POST endpoints.teamInvite(facilityId) (returns invite token/link)
- Delivery: manual copy/paste (v1)
- Gating: role OWNER/MANAGER + TEAM_INVITE
- Status: Functional

2) Accept invite
- Where: AcceptInvite screen flow
- Action: POST /api/invites/:token/accept
- Gating: invite token valid
- Status: Functional

3) Tasks list + task detail
- Where: /home/facility/(tabs)/tasks, /home/facility/tasks/[id]
- Action: GET endpoints.tasks(facilityId) + GET endpoints.task(...)
- Mutations: create task; assign/reassign; mark IN_PROGRESS; mark DONE
- Gating: TASKS_READ / TASKS_WRITE (role)
- Status: Functional

4) AI Validation Lab actions
- Where: /home/facility/ai/validation
- Action:
  - POST /api/ai/verify
  - POST /api/ai/compare
  - POST /api/ai/feedback
  - POST /api/ai/training/export
- Gating: Facility mode selected; endpoint auth required
- Status: Functional (Unverified)

---

### Commercial
1) Inventory list
- Where: /home/commercial/inventory
- Action: GET /api/commercial/inventory
- Gating: COMMERCIAL_INVENTORY_VIEW
- Status: Functional

2) Inventory update (v1)
- Where: /home/commercial/inventory-item/[id]
- Action: PATCH/PUT /api/commercial/inventory/:id
- Gating: COMMERCIAL_INVENTORY_WRITE
- Status: Functional

3) Inventory create (v1.1 planned)
- Where: /home/commercial/inventory-create
- Action: Planned screen (no mutation in v1)
- Gating: COMMERCIAL_INVENTORY_WRITE
- Status: Planned

4) Feed/Alerts (read-only ok)
- Where: /(commercial)/feed, /(commercial)/alerts/[id]
- Action: GET read-only endpoints
- Gating: COMMERCIAL_FEED_VIEW / COMMERCIAL_ALERTS_VIEW
- Status: Functional (read-only)

---

## Next: SOP-BUTTON-002 (fill the full registry)
- Iterate nav_actions.txt and onpress_hits.txt
- For each onPress:
  - map to route or endpoint
  - assign gating (mode/plan/role/capability)
  - mark Functional/Disabled/Planned
- Stop when every visible button has an entry.

Current evidence:
- Nightly delivery checks (placeholder/corruption/export): `tmp/overnight/verify_night.txt`
- Navigation/action scrape inputs: `tmp/spec/nav_actions.txt`, `tmp/spec/onpress_hits.txt`
