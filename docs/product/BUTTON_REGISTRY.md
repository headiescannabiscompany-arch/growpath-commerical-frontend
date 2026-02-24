# Button Registry (v1)

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
- Action: POST endpoints.teamInvite(facilityId) (pick canonical endpoint)
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
- Mutations: complete/ack/etc where present
- Gating: TASKS_READ / TASKS_WRITE (role)
- Status: Functional

---

### Commercial
1) Inventory list
- Where: /home/commercial/inventory
- Action: GET /api/commercial/inventory
- Gating: COMMERCIAL_INVENTORY_VIEW
- Status: Functional

2) Like/Unlike feed item
- Where: CommercialFeedCard
- Action: POST /api/commercial/like/:id, /api/commercial/unlike/:id
- Gating: COMMERCIAL_FEED_VIEW
- Status: Functional (note: still legacy api client; candidate to unify)

---

## Next: SOP-BUTTON-002 (fill the full registry)
- Iterate nav_actions.txt and onpress_hits.txt
- For each onPress:
  - map to route or endpoint
  - assign gating (mode/plan/role/capability)
  - mark Functional/Disabled/Planned
- Stop when every visible button has an entry.

