# GrowPath AI Connected Workflows Implementation Scope

Date: 2026-07-06

Status: Owner-reviewed direction. This is not a request for a giant overhaul. The app is largely good. The job is to make the existing pieces work together correctly, remove confusion, and build missing connections in thin vertical slices.

## Guiding Rule

Do not rebuild everything from scratch.

Keep the good screens and visual work. Reorganize, rename, connect, and complete workflows so users understand what each mode is for and the data they enter actually powers products, storefronts, AI, tasks, analytics, feeds, courses, lives, tools, and facility setup.

## Product Modes

GrowPath has three main workspace modes:

1. Personal / Free / Pro
   - Individual grow logging, AI help, tools, education, courses, forum, tasks, feed viewing, and personal profile.
   - Grow tools live here: VPD, Dew Point Guard, NPK/feed builder, soil builder, dry amendment builder, topdress planner, crop steering, IPM Scout, pheno hunting, tissue culture, harvest readiness, dry/cure, trichome checks.
   - Personal users can learn, post to forum, track grows, follow brands, buy products/courses, and use advanced tools without being forced into commercial mode.

2. Commercial
   - Brands, educators, suppliers, nurseries, soil companies, product makers, breeders, creators, and service providers.
   - Commercial is not primarily grow tracking.
   - Commercial is storefront, products, courses, lives, feed campaigns/ads, orders, analytics, Stripe, and brand discovery.
   - Product trials can exist, but they attach to products.

3. Facility
   - Operational cultivation, rooms, runs, staff, tasks, compliance, inventory, clone/mother stock, facility batches, SOPs, audit logs, sensors, and controller imports.
   - Facility is where operational create grow/run/batch belongs.
   - Facility may also have public outreach or private internal discussion, but operational workflows remain facility-scoped.

## Feed vs Forum

This must not get confused again.

Forum = conversation.

- Discussion
- Q&A
- Grow help
- Product questions
- Course questions
- Live Q&A
- Facility internal discussion
- Replies, comments, solved answers, moderation

Feed = commercial/facility outreach and advertising.

- Product promotions
- Course promotions
- Live promotions
- Storefront promotions
- Brand/facility awareness
- Campaigns
- Sponsored/pinned placements
- Calls to action

Feed ads can link to forum Q&A, but the discussion happens in forum/product Q&A/live Q&A, not inside the ad placement.

## Feed Placement Rule

Main page should be feed-heavy.

Every major page should support one top promotional placement.

Free account placement rule:

- Short page: one top placement and one bottom placement.
- Long page with two or more scrolling screens: one top, one middle, and one bottom placement.
- Do not repeat the same ad endlessly.
- Placements should rotate by newest, most liked, least clicked, least promoted, relevance, and targeting.

Paid/pro users may have reduced or less intrusive placements later, but the placement engine should support plan-based rules.

## Storefront Direction

Storefront is the center of Commercial.

It is the public brand/profile/store page. It should be easy to reach from Commercial Dashboard and Profile & Billing.

Commercial owner needs:

- Storefront owner home
- Edit storefront
- View as User
- Publish/unpublish
- Setup checklist
- Storefront warnings/tasks
- Storefront analytics

Public users need:

- Brand logo/banner/name/bio
- Grow interests
- Follow/contact/social links
- Featured products
- Featured courses
- Upcoming lives/replays
- Feed campaign strip for ads/outreach
- Forum/Q&A links for discussion
- Product/course/live search and filters

Storefront must connect to:

- Products
- Product lines
- Product batches/lots
- Courses
- Lives/Twitch/replays
- Feed campaigns
- Forum Q&A links
- Stripe checkout
- Orders/enrollments
- Analytics
- Tasks/alerts
- Grow interests
- Media/documents

## Commercial Navigation

Commercial top-level destinations should be:

1. Dashboard
2. Storefront
3. Products
4. Courses
5. Lives
6. Feed / Campaigns
7. Orders
8. Analytics
9. Profile & Billing

Demote/reorganize:

- Product Lines: inside Products as grouping.
- Batches/Lots: inside Product as inventory/production history.
- Product Trials: inside Product as proof/testing records.
- Inventory: generated from Products + Batches/Lots.
- Commercial Grow: hide unless explicitly tied to Product Trial. Operational grows/runs belong in Facility.

## Product System

Product is the main commercial object.

Product fields should support:

- Name
- Category
- Product line
- Thumbnail image
- Gallery/images
- Video upload or linked video
- Documents
- Short description
- Full description
- Grow interests/tags
- Price/sale price
- SKU
- Weight/size/unit
- Quantity/stock
- Fulfillment type
- Stripe product/price
- Status: draft/published/hidden/archived/missing setup

Soil/nutrient/amendment product fields:

- Bag weight/volume
- N-P-K
- Guaranteed analysis
- Calcium, magnesium, sulfur, micros
- Ingredients
- Directions
- Application rate
- Re-amendment rate
- Storage instructions
- Safety notes
- COA/SDS/lab documents
- Batch/lot number
- Mixed/packed dates
- Retest/expiration date
- Release timing chart when created from NPK/Soil/Dry Amendment tools

Product lines organize products. They are not separate stores.

Batches/lots belong inside products.

Inventory is generated from products and batches/lots.

Product trials belong inside products and can link to grows, sensor data, photos, outcomes, feed posts, courses, and product claims.

## Tools and AI

AI is the interface. Tool engines are the source of truth.

Users should be able to ask:

- Build me a veg recipe.
- I have these ingredients and guaranteed analyses. Help me hit 3-1-1.
- Show fast, medium, and slow release.
- Turn this recipe into a product draft.
- Save this to my grow.
- Create topdress tasks in 21 days.
- Scale this to a facility batch.

The AI must not guess math. It should collect missing info, call deterministic tool engines, explain assumptions, and preview before saving/publishing/creating tasks.

Core tool objects:

- ToolRun
- Recipe
- Ingredient library
- Saved recipe/version history
- Chart outputs
- Task outputs
- Linked grow/product/facility/course records

Priority tools:

- NPK / Feed Recipe Builder
- Soil Builder
- Dry Amendment Mix Builder
- Topdress / Re-Amend Planner
- IPM Scout with GPT verification
- Pheno Hunting Matrix
- Tissue Culture Tracker
- Harvest Readiness / Trichome Check

## NPK / Soil Builder Requirements

The current weak calculator should be treated as NPK Label Ratio Preview if it cannot handle full recipes.

The real NPK / Feed Recipe Builder must support:

- 18 to 20 ingredient rows.
- Guaranteed analysis entry.
- N as elemental N.
- P label as P2O5 and optional elemental conversion.
- K label as K2O and optional elemental conversion.
- Dry product nutrient mass.
- Liquid density handling.
- ppm only where appropriate for liquid feed solutions.
- Clear difference between label NPK, elemental P/K, nutrient mass, ppm, and soil availability.
- Fast/medium/slow release timing.
- Target vs actual.
- Nutrient contribution by ingredient.
- Cost and batch scaling where possible.

Conversions:

```txt
Elemental P = P2O5 x 0.4364
Elemental K = K2O x 0.8301
P2O5 = Elemental P x 2.291
K2O = Elemental K x 1.205
```

Soil/amendment recipe charts:

- N release over time
- P release over time
- K release over time
- Ca/Mg/S contribution
- Fast/medium/slow split
- Estimated availability window
- Uncertainty band

Time windows:

- Day 0-7
- Day 7-14
- Day 14-21
- Day 21-30
- Day 30-45
- Day 45-60
- Day 60-90
- 90+ days

John's soil logic:

- A target like 3-1-1 can be built from a 1-1-1 slow-release base plus faster nitrogen and mineral/biology support.
- Compost/castings introduce uncertainty unless lab-tested.
- Breakdown timing matters.
- Rest/cook time matters.
- Warn about hot mixes, seedlings, compost uncertainty, and early use.

## Tasks and Schedule

Tasks are the action layer. They should connect every workflow.

Use one Task model, one SchedulePicker, and one Calendar/Agenda view across the app.

Task sources:

- Manual
- AI
- Grow/plant
- ToolRun
- Recipe
- Course/lesson
- Live
- Product/storefront/order
- Facility/room/SOP
- Sensor alert
- Alert

Task fields:

- Workspace type
- Source type/id
- Linked grow/plant/toolrun/recipe/course/lesson/live/product/product batch/facility/room/order/alert
- Due/start/end
- Reminder plan
- Recurrence
- Priority/status
- Assignee/user/role
- Proof required
- Approval required
- Completion note/history

SchedulePicker should be reusable for:

- Task due dates
- Live schedule
- Course assignment due dates
- Topdress reminders
- Soil cook/ready dates
- Alert snooze
- Feed post schedule
- Product launch
- Facility SOP recurrence

## Courses and Lives

Courses are guided workflows, not just videos.

Courses connect to:

- Products
- Lives
- Replays
- Lessons/modules
- Documents/videos
- ToolRuns
- Recipes
- Tasks/checklists
- Forum/course discussion
- Stripe
- Storefront
- Feed campaigns
- Analytics

Lives connect to:

- Twitch
- Storefront
- Courses
- Products
- Feed campaigns
- Forum Q&A
- Tasks
- Alerts/notifications
- Replay
- Analytics

Twitch direction:

- OAuth for connection.
- Twitch Embed for live/video/chat where supported.
- EventSub for stream online/status events.
- GrowPath schedule/reminder engine for planned lives.
- Replay link/manual VOD support first if automatic replay import is not ready.

## Sensor / Controller Import

Importing sensor/controller data should build the user's space, not just charts.

Supported provider direction:

- Pulse
- TrolMaster
- AROYA
- Growlink
- SensorPush
- UbiBot
- Aranet
- METER/ZENTRA
- HOBOlink
- Monnit
- Other later

Import wizard:

1. Choose provider.
2. Connect credentials/OAuth/API key.
3. Test connection.
4. Fetch organizations/facilities/rooms/controllers/devices/metrics.
5. Show import preview.
6. Suggest rooms from provider device names.
7. Let user rename, merge, split, or manually map.
8. Confirm import.
9. Create rooms/devices/sensor streams.
10. Start read-only sync.

Imported data powers:

- VPD
- Dew Point Guard
- Bud Rot Risk
- Crop Steering
- Watering Planner
- Dryback tracking
- Environmental summaries
- AI grow/facility review
- Alerts/tasks
- Run comparisons
- Product trials
- Course examples

No write/control actions unless explicitly supported and reviewed.

## Back Arrow Rule

Root pages do not need back arrows. Nested pages do.

Use shared WorkspacePageHeader or equivalent. Do not hand-code back behavior page by page.

Root examples:

- Personal Dashboard
- Commercial Dashboard
- Facility Dashboard
- Storefront root
- Products root
- Courses root
- Lives root
- Feed/Campaigns root
- Task Center
- Schedule root
- Forum root

Nested examples:

- Product detail/edit/new
- Product batch/lot detail
- Course builder
- Lesson editor
- Live scheduler/detail
- Task detail/edit
- Storefront edit/preview
- Order detail
- Facility room/run detail
- Grow/plant detail
- Tool result detail
- Forum thread detail
- Alert detail

## Immediate Build Order

Do this in thin slices:

### Phase 1 - Clarify Navigation and Labels

- Keep existing good screens.
- Make Storefront top-level and obvious.
- Rename Feed/Campaigns correctly as advertising/outreach.
- Keep Forum separate as discussion.
- Hide/demote confusing top-level Product Trials/Batches/Lines/Inventory until connected.
- Ensure Commercial tab/page links open the correct pages.
- Add back arrow rule via shared header/page metadata.

### Phase 2 - Storefront Thin Slice

- Storefront owner home.
- Storefront edit.
- Public storefront / View as User.
- Product card grid.
- Product detail.
- Missing setup warnings.
- Product appears on storefront when published.

### Phase 3 - Product System Connection

- Product lines inside products.
- Batches/lots inside products.
- Inventory generated from products/batches.
- Soil/nutrient/amendment fields.
- Convert recipe to product draft.

### Phase 4 - ToolRun / Recipe Foundation

- Confirm ToolRun persistence.
- Add/complete Recipe model.
- Make NPK/Soil/Dry Amendment/Topdress save and link results.
- Tool results can create tasks and convert to product/facility batch where applicable.

### Phase 5 - Tasks / Calendar

- One Task model and Task Center.
- SchedulePicker.
- Tool-to-task workflows.
- Storefront/product/course/live missing setup tasks.
- Alert-to-task.

### Phase 6 - Courses / Lives

- Course builder with media/docs/modules/lessons/tasks/products/lives.
- Lives root/scheduler.
- Twitch connection skeleton.
- RSVP/reminders/replay.

### Phase 7 - Feed Campaign Engine

- FeedCampaign model.
- Placement slots.
- Campaign builder.
- Free account placement rules.
- Real impressions/clicks/conversions.

### Phase 8 - Sensor Import Wizard

- Provider connector interface.
- Read-only import preview.
- Auto-build personal grow space/facility rooms.
- Create devices/streams/readings.
- Use imported data in tools/AI/tasks.

## Non-Negotiable Acceptance Criteria

1. Users can understand Personal vs Commercial vs Facility.
2. Storefront is obvious in Commercial.
3. Feed is ads/outreach, not forum.
4. Forum is discussion/Q&A/community, not ads.
5. Commercial products appear as storefront cards with images and professional detail pages.
6. Product lines, batches/lots, inventory, and trials are connected through Product.
7. Soil/nutrient products support guaranteed analysis, NPK, ingredients, directions, documents, and release charts.
8. AI uses deterministic tools for recipe math.
9. NPK/soil tools support multi-ingredient guaranteed-analysis workflows.
10. ToolRuns and recipes can attach to grows, products, facility batches, courses, and tasks.
11. Tasks and SchedulePicker are shared across workflows.
12. Courses connect to products, lives, tasks, forum, Stripe, storefront, and analytics.
13. Lives connect to Twitch, courses, products, feed campaigns, tasks, notifications, replays, and analytics.
14. Sensor/controller import can auto-build rooms/devices/streams after user review.
15. Imported sensor data powers tools, AI, alerts, tasks, and dashboards.
16. Free users see top/bottom feed placements, plus middle placement on long pages.
17. Every nested page has a back arrow.
18. Analytics uses real events, not fake placeholder numbers.
19. Dead or unfinished features are hidden, relabeled, or connected before being prominent.
20. Work is delivered in small connected slices, not a giant rewrite.
