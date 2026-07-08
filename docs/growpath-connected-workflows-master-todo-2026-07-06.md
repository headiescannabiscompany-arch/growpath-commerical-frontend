# GrowPath AI Connected Workflows Master Todo

Date: 2026-07-06

Status: Execution backlog. Owner approved Codex to work through this list without asking for every small permission.

## Product North Star

The app is largely good. Do not rip it apart. Make the existing screens, data, AI, tools, tasks, storefront, feed, forum, courses, lives, products, and facility workflows connect correctly.

Facility currently has the strongest visual appeal and sense of operational polish. Apply that level of visual quality, density, hierarchy, and seriousness across Personal/Pro and Commercial. Personal should feel like a polished grow OS. Commercial should feel like a polished brand/storefront workspace. Facility should stay operational and professional.

## Definitions To Preserve

- Personal / Free / Pro: individual grow tracking, AI, grow tools, courses, forum, profile, buying/following.
- Commercial: brand/storefront, products, courses, lives, feed campaigns/ads, orders, analytics, Stripe, brand discovery.
- Facility: operational cultivation, rooms, runs, batches, staff, compliance, tasks, SOPs, sensors, audit logs.
- Forum: discussion, Q&A, help, comments, solved answers, internal facility discussion.
- Feed: commercial/facility outreach and advertising, not a second forum.
- Tasks: the action layer across every workflow.
- AI: the human interface over deterministic tools and connected data, not a replacement for tool math.

## P0 - Must Fix Before More Broad Manual QA

1. Commercial navigation clarity
   - Make Storefront a first-class commercial destination.
   - Put Storefront prominently on Commercial Dashboard.
   - Ensure bottom tabs/routes open correct pages, not dashboard again.
   - Hide or demote top-level routes that feel disconnected until connected: product trials, batches, product lines, duplicate inventory.
   - Rename confusing surfaces so Product Lines, Batches/Lots, Trials, and Inventory are clearly related to Products.

2. Storefront-first commercial slice
   - Add Storefront owner home.
   - Add View as User / public preview path.
   - Show setup checklist: logo, banner, bio, grow interests, Stripe, first product/course/live, published status.
   - Make Add Product, Create Course, Schedule Live, Create Feed Campaign, Orders, Analytics easy from Storefront and Dashboard.
   - Ensure public/storefront-style page can show products/courses/lives/campaigns even if some data is mocked/empty.

3. Feed vs Forum correction
   - Replace wording that implies Feed is discussion.
   - Feed / Campaigns means ad/outreach placement by commercial/facility accounts.
   - Forum means discussion/Q&A.
   - Feed cards should look promotional and have CTAs.
   - Forum threads/comments should remain discussion.

4. Free account feed placement rule
   - Free account pages: top + bottom placement.
   - Long pages with two or more scroll screens: top + middle + bottom.
   - Do not repeat the same ad everywhere.
   - Rotate by newest, most liked, least clicked, least promoted, and relevance when data exists.

5. Back arrows
   - Every nested page gets a back arrow.
   - Root pages do not need a back arrow.
   - Use shared page/header behavior, not one-off custom buttons.
   - Confirm commercial product/detail/edit/new, course builder/detail, storefront edit/preview, task/detail, grow/plant/detail, facility room/run/detail have back behavior.

6. Commercial product card and product detail basics
   - Product create/edit supports image, name, category, description, price, size/weight, grow interests, status.
   - Product appears as a storefront card when published.
   - Product detail shows professional info and buy CTA if Stripe-ready.
   - Soil/nutrient/amendment fields are available or planned visibly: NPK, guaranteed analysis, ingredients, directions, application rate, documents, batch/lot.

7. Course workflow minimum
   - Create Course must look and behave like a real button/workflow.
   - Course create/edit must support thumbnail/banner, description, category, grow interests, free/paid, modules/lessons, videos/links/documents, products/lives/tasks eventually.
   - Courses should appear on storefront and course discovery when published.

8. Facility room creation
   - Facility users must be able to add rooms/greenhouses.
   - Facility onboarding should guide facility name, type, rooms/zones, crops/batches, staff/tasks, inventory/settings, dashboard walkthrough.
   - Stock risk should not appear before useful inventory/crop data exists.

9. Password reset/login reliability
   - Password reset flow: email -> link -> valid reset screen -> save password -> login works.
   - Commercial/facility/pro/free login should not get stuck in loops.
   - Failed login/server disconnect states should show actionable errors.

10. Pricing display
   - Pro: $10/month, $100/year.
   - Commercial: $50/month, $500/year.
   - Facility: $100/month, $1,000/year.
   - Stripe annual monthly-equivalent copy should be clear and not look contradictory.

## P1 - Connected Workflow Foundation

11. ToolRun foundation
   - Confirm all serious tools persist ToolRun records.
   - ToolRun can link to grow, plant, log, task, product, batch, facility, room, course.
   - Tool outputs can create tasks/logs/timeline events.

12. Recipe model
   - Add Recipe object for feed recipes, soil recipes, dry blends, topdress plans, foliar, teas, facility SOP recipes, commercial product formulas.
   - Recipe can duplicate/version/compare.
   - Recipe can convert to commercial product draft or facility production batch.

13. Ingredient library
   - Save reusable ingredients with guaranteed analysis, density, release speed, cost, supplier, documents/photos.
   - User-entered label data overrides generic assumptions.

14. NPK / Feed Recipe Builder
   - Multi-input builder with 18-20 rows.
   - Guaranteed analysis fields.
   - P2O5/K2O conversions and elemental values.
   - Dry/liquid calculations, density handling, ppm when appropriate.
   - Target profile mode, dose existing products mode, dry blend mode, soil amendment mode.
   - AI can collect inputs and call deterministic math engine.

15. Soil Builder
   - Full base mix + amendments + biology/activation + rest/cook timeline.
   - Fast/medium/slow release chart.
   - Compost uncertainty warnings.
   - Save to grow/product/facility batch.

16. Dry Amendment Mix Builder
   - Build concentrated dry blend.
   - Estimated guaranteed analysis.
   - Ingredient contribution chart.
   - Product-ready label fields.
   - Bag sizes and application directions.

17. Topdress / Re-Amend Planner
   - Grow/plant/bed specific topdress plan.
   - Expected release timeline.
   - Follow-up tasks.

18. IPM Scout GPT verification
   - Same structured scout info goes to GrowPath/local logic and GPT/OpenAI verification.
   - Store both answers.
   - Show agreement/conflict.
   - Save to grow/facility timelines and create follow-up tasks.

19. Pheno Hunting Matrix
   - Score vigor, morphology, stress tolerance, pest resistance, early sex, resin, smell/taste, yield, hash value, keeper status.
   - Link selected keepers to clone/mother/tissue culture/commercial genetics/facility stock later.

20. Tissue Culture Tracker
   - Explant, sterilization, media, vessel/batch, contamination, multiplication, rooting, acclimation, photos, survival rate.

## P2 - Task / Calendar / Alerts Engine

21. One Task model
   - Links to grow, plant, ToolRun, recipe, course, lesson, live, product, batch, facility, room, SOP, alert.
   - Due date, start/end, reminders, recurrence, priority, assignee, proof, approval, history.

22. Task Center
   - Today, overdue, upcoming, completed, assigned, source filters.
   - Commercial tasks: storefront/product/course/live/order setup.
   - Facility tasks: room/SOP/team/proof/approval.
   - Personal tasks: grow/course/tool/live reminders.

23. SchedulePicker
   - Shared popup/bottom-sheet calendar for due dates, lives, course assignments, recipe timelines, alert snooze, feed schedule, product launch, facility SOP recurrence.

24. Schedule / Agenda page
   - Agenda/day/week/month.
   - Shows tasks, live events, course assignments, feed schedules, product launches, grow milestones, soil ready dates, facility SOPs.

25. Alert Center
   - Alerts can resolve, snooze, create task, assign, ask AI, view source.
   - Setup alerts, sensor alerts, course/live alerts, storefront/product alerts, facility training alerts.

26. Notification engine
   - In-app first; push/email when configured.
   - Task reminders, live reminders, course due/overdue, alert critical/digest, replay available.

## P3 - Courses and Lives

27. Course builder
   - Course basics, thumbnail/banner, modules, lessons, media, linked videos, documents, tasks, products, lives, discussion, Stripe, publish state.

28. Course player
   - Lessons, progress, resources, tasks, Ask AI, notes, discussion, related products/lives.

29. Course analytics
   - Views, enrollments, sales, progress, drop-off, task completion, live RSVPs, product clicks, questions.

30. Lives
   - Lives root, scheduler, Twitch connection, RSVP, embedded live/replay, related course/product/feed/forum, notifications.

31. Twitch
   - OAuth connection.
   - Twitch Embed for video/chat where supported.
   - EventSub for stream online/status.
   - Replay link/manual VOD first if automatic VOD import is not ready.

## P4 - Feed Campaign Engine

32. FeedCampaign model
   - Owner commercial/facility.
   - Product/course/live/storefront/facility/general campaign.
   - Creative, CTA, destination, grow interests, targeting, placements, schedule, status.

33. Feed placement engine
   - Slot keys: home hero/top/middle/bottom, page top/middle/bottom, course/tool/forum/product/facility/commercial slots.
   - Plan-aware placement rules.
   - Context-aware targeting.

34. Feed campaign builder
   - Campaign type, destination, creative, placement, audience, schedule, review.
   - Prevent publishing if destination is broken or missing setup.

35. Feed analytics
   - Impressions, clicks, conversions, hide/report, placement performance, grow interest performance.

## P5 - Forum / Discussion Engine

36. One discussion engine
   - Threads/posts/comments/categories/tags/grow interests/media/documents.
   - Author identity: user, commercial, facility, moderator.
   - Context links: grow, plant, ToolRun, recipe, product, course, lesson, live, storefront, facility, room, task, alert.

37. Forum home/categories/thread detail/create thread
   - Discussion/Q&A, not ads.
   - Product Q&A, course discussion, live Q&A, facility internal threads.

38. Forum tasks/alerts/AI
   - Create task from thread/comment.
   - Alerts for replies, mentions, unanswered product/course/facility questions.
   - AI helps title/category/tags/summarize/extract tasks.

39. Moderation
   - Report, hide/remove/lock/pin/move, moderation queue, audit trail.

## P6 - Sensor / Controller Import

40. Integration connector interface
   - Provider connections with encrypted auth, status, capabilities, last sync, errors.
   - Read-only first.

41. Import wizard
   - Provider select, connect, test, fetch structure, preview, room/device mapping, confirm.

42. Auto-build spaces
   - Personal: grow space/tent/room/devices/streams.
   - Facility: facility/rooms/zones/devices/streams/alerts/dashboards.
   - Commercial: product trial spaces or demo/education spaces only when relevant.

43. Metric normalization
   - air temp, RH, VPD, dew point, CO2, PPFD/DLI, substrate moisture/EC/pH, irrigation events, alarms, offline/fault.

44. Imported data powers tools
   - VPD, Dew Point, Bud Rot Risk, Crop Steering, Watering Planner, dryback, AI summaries, alerts/tasks, run comparisons, product trials, course examples.

## P7 - Analytics and Data Use

45. No dead fields
   - Every collected field must feed display, analytics, AI, search, recommendations, tasks, alerts, or exports.

46. Commercial analytics
   - Storefront/product/course/live/feed/order/grow-interest analytics from real events.

47. Personal analytics
   - Grow consistency, tool use, environment history, task completion, run comparisons.

48. Facility analytics
   - Room stability, task completion, SOP compliance, sensor alerts, batch/run history, staff/training.

## Immediate Execution Slice

Start here:

1. Audit current commercial dashboard, storefront, products, feed, forum, courses, lives, and tab routes.
2. Make Storefront prominent and top-level.
3. Clarify Feed/Campaigns labels and copy as ads/outreach.
4. Hide/demote confusing standalone product trial/batch/line nav items where they are not yet connected.
5. Add shared nested-page back behavior where possible.
6. Add storefront owner/public preview thin slice if missing.
7. Wire product cards to storefront.
8. Run local QA on commercial mode.
9. Commit/push.

## Recent Execution Progress

Completed and pushed:

1. NPK / Feed Recipe Builder now exposes an AI recipe brief while preserving deterministic calculator math for label N-P2O5-K2O, elemental conversion, density assumptions, release timing, ToolRun tasks, and product draft conversion.
2. Soil Builder, Dry Amendment Mix Builder, Topdress Planner, and Soil & Nutrient Batch Planner now share the same AI-guided, calculator-verified pattern through the reusable calculator screen.
3. Soil Builder can brief AI on base mix, compost uncertainty, fast/slow amendments, rest/cook timing, grow tasks, facility batch handoff, and product draft conversion.
4. Dry Amendment Mix Builder can brief AI on ingredient label contribution, release class, package/label gaps, batch tasks, facility production handoff, and commercial product draft conversion.
5. Topdress Planner can brief AI on stage fit, release class, harvest timing, water-in checks, and 3/7/21-day follow-up tasks.
6. Soil & Nutrient Batch Planner can brief AI on production scaling, pull-list risk, QA/label needs, batch/lot documentation, commercial product drafts, and facility production records.
7. Deferred verification now includes focused tests for NPK, Soil Builder, Dry Amendment Mix Builder, Topdress Planner, and Soil & Nutrient Batch Planner.
8. Personal task centers no longer expose commercial/facility admin source types, and personal task source links stay inside personal grow/course/tool workflows.
9. Notification Center, Alert Center, and Schedule now route tasks to canonical personal/commercial/facility task pages instead of stale root task paths.
10. Legacy facility onboarding and `/facilities/:id/*` shims now redirect to canonical facility workspace URLs, not Expo group-segment URLs.
11. Legacy feed activity cards now open workspace task, alert, log, and grow pages instead of dead root `/tasks`, `/alerts`, `/logs`, or `/app` paths.
12. Commercial task source links now open alert-backed tasks in the shared Alert Center.
13. Storefront owner preview actions now use explicit `View as User` language for the public store page and brand profile.
14. Commercial Product Trials now keep owners in commercial routes for evidence runs, products, batches, and storefront work instead of sending them into Personal grow creation.
15. Commercial product trial evidence-run detail now links back to commercial products/trials rather than the Personal grow workspace.
16. Free feed placement policy now explicitly treats `longContent` as two or more scrolling screens: free users get top and bottom placements, plus one middle placement only on those longer pages.
17. Public plan feature matrix now uses shared pricing constants, shows Facility as `$100/month or $1,000/year`, and has a regression scan against stale `$50/mo` Facility copy and corrupted glyphs.
18. Feed campaign Forum/Q&A CTAs now use a shared `/forum/post/:id` route instead of pointing commercial/facility outreach into Personal forum URLs.
19. Storefront course, live, and campaign Q&A links now use the same shared forum route, keeping storefront discussion links mode-neutral.
20. Personal task and home-dashboard forum source links now open the shared forum route, reinforcing one discussion system while leaving personal forum tabs as local entry points.
21. The shared `/feed` route is now viewable by Personal, Commercial, and Facility modes; campaign creation remains controlled inside the feed screen by current mode.
22. Feed placement rails now try to load real commercial/facility campaigns from `/api/commercial/feed` and only use static promotional cards as fallback.
23. The public plan feature matrix now compares Free, Pro, Commercial, and Facility only, removing the unpriced Creator Plus column from user-facing pricing.
24. Commercial forum-backed tasks now route to the shared `/forum/post/:id` discussion route from both the commercial task list and detail page.
25. Commercial dashboard now includes a launch-assistant surface that routes owners toward task, campaign, and analytics workflows while keeping records as the source of truth.
26. Facility task detail now exposes canonical source navigation for alert-backed and forum-backed tasks, while keeping facility tool/recipe tasks inside facility routes.
27. Commercial alert and log detail pages now rely on the shared `ScreenBoundary` back control instead of duplicate hand-coded back links.
28. `/home/commercial/tasks/:id` now resolves to the commercial task detail screen so feed, alert, notification, and schedule links can open commercial tasks directly.
29. Personal forum and community post previews now open the shared `/forum/post/:id` detail route, reinforcing one discussion system while Feed remains promotional outreach.
30. Personal Task Center now supports `ai_diagnosis` sources, preserves AI Diagnosis labels, stores linked diagnosis ids, and routes diagnosis follow-up tasks back to the diagnosis tool with grow context.
31. Alert Center and Notification Center now route forum, facility-run, and SOP source items to canonical shared/facility pages instead of dropping those source links.
32. The shared Schedule page now routes standalone personal tasks to `/home/personal/tasks` instead of the stale `/home/personal/more/tasks` path.
33. The root `/tools` path now redirects to the Personal Tools hub instead of showing a developer shell.
34. Personal forum post detail now uses the shared `ScreenBoundary` back control instead of a hand-coded back button.
35. Feed campaign CTAs now stay public/user-facing when a storefront slug is missing: product campaigns fall back to Store search, course campaigns to the public course catalog, and live campaigns to Feed discovery instead of commercial admin pages.
36. Shared Alert Center and Notification Center source links now respect workspace: commercial setup sources keep owner routes, personal product/course/live sources go to public or personal destinations, and facility product sources go to facility inventory.
37. Commercial dashboard helper copy now says `Commercial launch assistant` instead of commercial AI/business-helper language, keeping the panel focused on launch tasks, campaigns, and analytics without implying a disconnected AI workspace.
38. Schedule items from lives and courses now route by workspace: commercial owners keep admin destinations, personal live/course items stay user-facing, and facility course items route into facility SOP/training work.
39. Public brand, storefront, and product Forum/Q&A links now open the shared `/forum/post/:id` route when a thread id exists, with `/forum` as fallback, instead of leaking users into Personal forum workspace URLs.
40. Facility task detail source navigation now keeps facility users in facility SOP/training, inventory, operational runs, or shared feed/forum routes instead of sending course, live, product, batch, or trial sources into commercial admin screens.
41. Facility entry, dashboard shim, facility picker, and onboarding redirects now land on canonical `/home/facility` and `/home/facility/select` routes instead of bouncing users through legacy `/facilities/:id/dashboard` shims.
42. Legacy facility home labels now use the quieter facility visual language without emoji/arrow clutter, keeping the polished facility style consistent with the broader app direction.
43. Released Personal tool routes for Nutrient Source Comparison, Product / Ingredient Library, and Saved Tool Runs are now explicitly registered in the tools stack so nested tool navigation has consistent titles and back behavior.
44. Store discovery and Commercial Product Lines no longer link owners to the blocked `/storefront` route; owner actions now use `/home/commercial/storefront` and `/home/commercial/products/new`.
45. Product checkout return URLs now come back to the public store/product route that started checkout instead of the blocked owner `/storefront` route.
46. Route access home resolution now agrees with the canonical Facility workspace by sending selected facility users to `/home/facility` instead of stale `/home/facility/dashboard`.
47. The legacy root `/logs` route is now a redirect-only stale-link guard to the commercial dashboard, while the contracted `/logs/[id]` detail route remains available with a valid commercial fallback.
48. Legacy root `/orders` and `/campaigns` routes now redirect into canonical commercial workspace pages, with the orders workflow moved under the commercial screen module instead of living as a top-level orphan surface.
49. The legacy root `/diagnose` route now sends Personal users to Personal diagnosis, Facility users to facility diagnosis intake, and Commercial users back to the commercial workspace, while commercial course/support actions stay inside `/home/commercial/courses`.
50. The storefront owner UI now lives under the canonical commercial workspace route, while legacy root `/storefront` redirects to `/home/commercial/storefront`.
51. The GrowPath system audit now checks legacy `/storefront` as a redirect-only guard, alongside legacy `/logs`, `/orders`, and `/campaigns`.
52. The legacy native Personal dashboard no longer fetches `/api/posts/feed` as a discussion feed; it now uses shared campaign placements and sends conversation language to Forum/Q&A.
53. The root `/create-post` route no longer opens a generic feed/social composer; Personal users go to Forum/Q&A post creation, Commercial users go to Feed/Campaigns, and Facility users go to shared outreach campaigns.
54. The GrowPath system audit now checks `/create-post` as a workspace-aware redirect guard and flags it if a visible generic post composer returns.
55. The legacy native Forum screen now frames itself as Forum/Q&A, uses `New Discussion` language, and labels commercial/facility authors as Brand or Facility instead of generic business/social-feed copy.
56. The legacy native Forum composer no longer offers commercial `offer` posts; commercial/facility users can create education, discussion, course, product Q&A, or live Q&A forum posts while promotional offers remain in Feed/Campaigns.
57. Personal `/home/personal/more/social-tools` now redirects to Forum/Q&A, while commercial Social Tools have been renamed/framed as External Channels for off-platform scheduling, separate from in-app Feed/Campaigns.
58. The legacy native `CreatePostScreen` no longer owns a separate `/api/posts` social-feed composer; compatibility paths now reuse the Forum/Q&A composer.
59. Commercial external-channel integration now uses external-channel language, keeps off-platform scheduling distinct from GrowPath Feed/Campaigns, and removes the old social-media/corrupted status copy.
60. The GrowPath system audit now checks the legacy Personal `more/social-tools` route as a redirect-only guard to Forum/Q&A.
61. Commercial Community now behaves as Brand Forum/Q&A support, reads/writes through the shared forum API, and the audit flags it if support posts move back onto Feed/Campaigns.
62. The legacy `FacilityFeedScreen` compatibility path now renders the shared campaign Feed route instead of the old `/api/posts/feed` community-feed implementation, with an audit guard to keep it that way.
63. Commercial marketplace integrations now use External Channels language and explicitly distinguish off-platform channels from GrowPath Feed/Campaigns and Forum/Q&A.
64. Commercial Profile & Billing now uses brand/storefront identity language in the dashboard, profile form, and product catalog copy while preserving existing backend `businessName` fields.
65. The root Account Profile commercial card now uses brand identity, Feed/Campaigns, Forum/Q&A, and workspace-tool language instead of business/social wording.
66. Facility now has an Integrations entry point that surfaces read-only sensor/controller providers and routes users to the existing room import preview for auto-building rooms/devices/streams.
67. Personal Data Integrations now explains imported account structure can suggest grow spaces, uses `Verify + preview controllers`, and creates explicit read-only telemetry sources.
68. Facility Integrations now has focused route coverage and a GrowPath system audit guard requiring the read-only room import preview handoff, provider visibility, and no write/control drift.
69. The legacy native `FeedScreen` no longer owns a social/community feed or `/api/posts/feed`; it now delegates to the shared Feed/Campaigns route, and paywall/search copy separates Forum/Q&A discussion from Feed campaign discovery.
70. The legacy native `ToolsScreen` no longer shows a flat calculator list; it now delegates to the connected Personal Tools / AI hub with workflow categories, feed placements, saved runs, recipes, and ingredient access.
71. Full-suite verification gaps from Feed placements are stabilized: photo upload mocks now include image resolution, log-photo tests target the journal image by label, reports expectations match the current Orders card, and facility feed policy text explicitly says educational/outreach content is required.
72. The legacy native `StorefrontScreen` no longer owns a duplicate storefront/product editor; it now delegates to the canonical Commercial Storefront owner workspace, with a focused unit test and GrowPath system audit guard to keep storefront management unified.
73. Stale feed test contracts no longer model Feed as `/api/posts/feed` or a user post composer: acceptance fixtures now exercise `/api/commercial/feed` campaign placements, and old Playwright social-feed specs are retired until the harness supports the current workspace shell.
74. Visible discussion navigation now uses Forum/Q&A language across Personal, Commercial, Facility, profile, dashboard, and marketing surfaces while preserving existing route names for compatibility.
75. Schedule, Alert Center, and Notification Center now share source-aware routing for tasks, products, courses, lives, feed campaigns, recipes/tool runs, product trials, orders, grow records, facility records, sensor alerts, and Forum/Q&A threads so reminders and alerts return users to the workflow that created them.
76. The legacy `createFeedPost` API wrapper no longer posts to `/api/posts`; it now preserves photo uploads while creating Forum/Q&A discussions through the canonical forum endpoint so old callers cannot revive a social-feed composer.
77. The legacy `api/posts.js` compatibility client now maps feed, trending, create, like, unlike, and comment calls onto Forum/Q&A endpoints, with regression coverage preventing old `/api/posts/*` discussion contracts from returning.
78. Registration, plan walkthroughs, the first-run intro, and the facility picker now use Personal / Commercial / Facility workspace language instead of vague business surfaces/models or facility-as-business copy.
79. Commercial evidence-run creation copy now says brand/product context and uses `demo_trial` language, avoiding the old implication that Commercial is an operational grow workspace.
80. Commercial Task Center and commercial task detail now use the shared source-link resolver, including lesson-backed tasks that open the commercial course workflow instead of dropping the user at an unlinked task.
81. The GrowPath system audit now guards the legacy `api/posts.js` compatibility client, requiring it to use Forum/Q&A endpoints and flagging any drift back to `/api/posts` discussion contracts.
82. Facility task detail now uses the shared source-link resolver, and the resolver recognizes `tool_run`, `live_replay`, and `ai_diagnosis` aliases so task, alert, schedule, and notification links stay connected across Personal, Facility, Feed, Forum/Q&A, and AI/tool workflows.
83. Personal Task Center now uses the shared source-link resolver too, opening product, product-batch, storefront, course, live replay, alert, Forum/Q&A, AI diagnosis, and ToolRun sources through user-facing paths instead of suppressing valid outreach/learning links or leaking into commercial admin routes.
84. Personal grow timeline source actions now use the shared resolver for journal entries, ToolRuns, tasks, AI diagnoses, automation, plants, and grow milestones, with journal events opening their actual log detail and automation events returning to the grow automation workflow.
85. Personal dashboard task source links now share the same resolver as Task Center and Timeline, so ToolRun, AI diagnosis, automation policy, Forum/Q&A, journal, and manual task links open the connected workflow instead of local one-off fallbacks.
86. The GrowPath system audit now guards the shared source-link resolver, requiring connected workflow aliases and usage from Personal Task Center, grow timeline, and the personal dashboard model.
87. Shared order source links now respect workspace: commercial order alerts stay in Commercial Orders, facility order/input references go to Facility Inventory, and personal purchase/order references go to the personal profile area instead of leaking into commercial admin.
88. Commercial product-batch source links now open `/home/commercial/batch-planner/:batchId` when a batch id is present instead of stopping at the batch-planner root.
89. Grow-specific Personal Tasks now show `View Source` actions for linked records, using the shared resolver so AI diagnosis and ToolRun tasks open the diagnosis and saved-run workflows directly from the grow task list.
90. Commercial product trial evidence-run detail now opens linked product and batch records through their detail routes instead of query-string root list fallbacks.
91. Shared schedule/source routing now recognizes calendar-specific aliases like lesson releases, course releases, product launches, live reminders, scheduled feed posts, alert snoozes, facility SOPs, and grow milestones so agenda items can open the correct Personal, Commercial, Facility, Feed, Forum/Q&A, or Alert workflow without one-off routing.
92. Commercial dashboard action-item tasks now preserve inventory, product trial, order, feed campaign, and alert source ids, and inventory-backed tasks open the correct Commercial or Facility inventory workflow instead of becoming generic dashboard todos.
93. The deferred/manual verification scripts now run the GrowPath connected system audit, include shared source-link routing coverage, and add human checks for source routing across Schedule, Alert Center, Notification Center, commercial dashboard tasks, inventory, trials, orders, feed campaigns, releases, live reminders, alert snoozes, facility SOPs, and grow milestones.
94. Alert Center now supports assigning alert-created tasks and provides Ask AI links with alert/source/workspace context for Personal AI, Facility AI, and the Commercial launch assistant surface, alongside resolve, snooze, create-task, and view-source actions.
95. Notification Center now lets users create source-linked follow-up tasks from notifications, preserving the notification id plus the original task, alert, course, live, product, product trial, feed campaign, order, forum, room, facility run, SOP, recipe, or ToolRun source context.
96. Schedule / Agenda now has workspace and source filters, so users can narrow the shared calendar to Personal, Commercial, Facility, tasks, lives, course releases, or feed campaigns without losing the connected Open Source actions.
97. Facility room-backed source links now preserve the room id in `/home/facility/rooms?roomId=...`, and the Facility Rooms workspace reads that route parameter so task, alert, schedule, and notification links can land on the intended room context.
98. Facility SOP-backed source links now preserve SOP run ids in `/home/facility/sop-runs/:id`, so task, alert, notification, and schedule source actions can open the exact SOP/training run instead of dropping users at the SOP run list.
99. Commercial live source links now preserve live ids in `/home/commercial/lives?liveId=...`, and the Commercial Lives workspace highlights the selected live so reminders, tasks, notifications, and schedule items land on the relevant live event context.
100. Feed campaign source links now preserve campaign ids in `/home/commercial/feed?campaignId=...` and `/home/facility/feed?campaignId=...`, and the shared Feed/Campaigns screen highlights the selected campaign so alerts, notifications, tasks, and schedule items return to the right outreach card.
101. Commercial order source links now preserve order ids in `/home/commercial/orders?orderId=...`, and the Orders workspace highlights the selected order so fulfillment alerts, notifications, and schedule tasks land on the relevant order instead of the root list only.
102. Personal ToolRun and recipe source links now preserve saved run ids in `/home/personal/tools/saved-runs?toolRunId=...`, and the Saved Tool Runs workspace auto-selects the requested run so grow tasks, timelines, alerts, notifications, and schedule items reopen the exact saved tool output.
103. Facility product, product-batch, order, and inventory source links now preserve ids in `/home/facility/InventoryItemDetailScreen?id=...`, so stock alerts, notifications, tasks, and operational references can open the exact inventory item instead of the facility inventory root.
104. Commercial recipe and ToolRun source links now preserve ids in `/home/commercial/batch-planner/:id`, while facility recipe and ToolRun links preserve ids in `/home/facility/ai-tools?toolRunId=...` and the facility AI Tools surface displays the linked context instead of dropping operators on an unscoped tool root.
105. Alert and notification source links now preserve item ids in `/home/alerts?alertId=...` and `/home/notifications?notificationId=...`, with both centers highlighting the linked row so reminders, snoozes, and follow-up tasks reopen the relevant item instead of only the root inbox.
106. Facility course, lesson, and course-assignment source links now preserve ids in `/home/facility/sop-runs/:id`, so facility training tasks can reopen the relevant SOP/training run instead of the SOP run root list.
107. Personal course, lesson, and course-release source links now preserve ids in `/home/personal/courses?courseId=...`, and the personal Courses screen opens the linked course detail when that query is present so course tasks, alerts, notifications, and schedule items do not lose context.
108. Feed live reminder links now preserve live ids in `/feed?liveId=...`, and the shared Feed/Campaigns screen highlights the matching live campaign card so live reminders and promotional CTAs return to the relevant outreach item without turning Feed into discussion.
109. Personal/viewer feed campaign source links now preserve campaign ids in `/feed?campaignId=...`, so feed campaign alerts, notifications, and schedule items can reopen the exact promotional card instead of dropping users on the generic Feed root.
110. Public storefront source links now preserve storefront slugs in `/store/:slug`, while commercial owner storefront links stay in `/home/commercial/storefront`, so storefront alerts, campaign CTAs, and schedule items can reopen the actual brand page without leaking owners into the public route.
111. The canonical route matrix now carries an explicit current-corrections block for Commercial Storefront, public storefronts, shared Feed/Campaigns, and Forum/Q&A, preventing future work from treating legacy `/storefront` or Feed-as-discussion notes as canonical truth.
112. Legacy feed item routing now treats explicit `storefrontSlug` metadata as a public storefront link to `/store/:slug`, while preserving `brandSlug`/commercial profile metadata for `/brands/:slug`, so promotional cards do not send storefront traffic to the wrong public surface.
113. Legacy feed item alert routing now preserves alert ids in `/home/alerts?alertId=...`, so feed-derived alert cards reopen the relevant Alert Center row instead of dropping users at the generic alert inbox.
114. Legacy facility feed item routing now opens exact facility log detail routes and preserves plant ids in `/home/facility/plants/:id`, keeping operational feed cards tied to the source record instead of broad facility lists.
115. Personal plant source links now preserve plant ids in `/home/personal/grows/:growId/plants?plantId=...`, and the grow plants screen can visually mark the linked plant so plant tasks, alerts, and logs do not collapse to a generic plant list.
116. Public product source links now use `/store/:slug/products/:productId` when storefront metadata is available, so product ads, tasks, alerts, and batch references open the actual storefront product page instead of a broad store search.
117. AI diagnosis source links now preserve plant context in `/home/personal/diagnose?growId=...&plantId=...`, so saved diagnosis tasks, alerts, and timeline entries reopen the same plant context the user diagnosed.
118. Shared source links now recognize linked-field-only ids for lives, feed campaigns, orders, alerts, notifications, ToolRuns, and recipes, keeping task, alert, schedule, and notification records connected even when they do not carry a generic `sourceId`.
119. Shared source links now prefer exact linked ids over broad fallback `sourceId` values for forum threads, lives, feed campaigns, orders, alerts, notifications, ToolRuns, recipes, product trials, and SOPs, preventing grow/task fallbacks from overriding the real source record.
120. Shared source links now infer missing source types from linked fields such as alert, forum, ToolRun, product, plant, and grow ids, so older task/notification records with good links but no `sourceType` can still reopen the intended workflow.
121. Commercial and facility product-batch source links now recognize `linkedProductBatchId`, so product batch tasks, alerts, and notifications open the batch/inventory detail instead of stopping at the batch planner or inventory root.
122. Personal grow-log source links now recognize and infer `linkedLogId`, so journal-backed tasks, alerts, notifications, and timeline items open the exact log detail instead of falling back to the grow journal list.
123. Commercial Task Center cards now display linked-only source ids such as `linkedLiveId`, `linkedFeedPostId`, product/batch/trial ids, orders, alerts, forum threads, and storefront slugs, so owners can see what the task is attached to even when the backend did not send a generic `sourceId`.
124. Facility task detail now displays the same linked source reference it uses for `View Source`, so forum-, SOP-, room-, run-, product-, alert-, live-, ToolRun-, and recipe-backed tasks no longer look unlinked when the backend only sends linked fields.
125. Personal Task Center cards now display linked-only source ids and linked ToolRuns, so product-batch, product, course, live, alert, forum, room/facility/SOP, and ToolRun-backed tasks show their actual context instead of relying only on `sourceObjectId`.
126. Grow-specific personal task cards now display linked-only source ids and linked ToolRuns, so grow-local product batch, recipe, product, course, live, alert, forum, facility/SOP, and ToolRun-backed tasks show the same connected context as the global Personal Task Center.
127. Facility Task Center cards now display linked-only source ids in the task subtitle, so room, SOP, run, alert, course, live, ToolRun, recipe, product/batch/trial, and forum-backed work stays identifiable before opening task detail.
128. Personal Task Center source routing now prefers linked-only source ids such as recipe, product/batch/trial, order, course, live, alert, forum, facility/room/run/SOP, plant, and grow before ToolRun fallback, so linked batch cards open the batch/product context instead of accidentally routing from the ToolRun id.
129. Schedule/Agenda task items now prefer linked-only source ids and allow source-link inference, so calendar tasks backed by product batches, recipes, ToolRuns, alerts, courses, lives, feed campaigns, orders, rooms/SOPs/runs, plants, or grows click back to the real workflow instead of generic task pages.
130. Notification-created tasks now preserve linked-only source ids such as product batches, products/trials, courses, lives, feed campaigns, orders, forum threads, facility rooms/runs/SOPs, recipes, and ToolRuns, so reminders can become source-linked follow-up work even when `sourceId` is missing.
131. Alert-created tasks now preserve linked-only source ids such as product batches, products/trials, storefronts, grows/plants/logs, tasks, rooms/facilities/runs/SOPs, ToolRuns, recipes, lessons/courses, feed campaigns, orders, sensor alerts, and forum threads, so alert-to-task keeps the real source context.
132. Commercial alert detail task creation now preserves linked-only product batch/trial and campaign/order/source ids, so owners opening a single alert can still create source-linked follow-up work even when the alert detail lacks `sourceId`.
133. Commercial task detail source routing now prefers linked ids that match the task `sourceType`, so linked-only feed campaign and product batch tasks open the commercial feed campaign or batch workflow instead of falling back to a less specific product/source id.
134. Commercial Task Center source labels now prefer linked ids that match the task `sourceType`, so linked-only product batch and feed campaign cards show the batch/campaign id and route to the matching workflow instead of displaying a broader product id.
135. Shared source links now recognize `linkedGrowLogId` as a grow-log alias alongside `linkedLogId`, so alert-created grow-log tasks and legacy alert records reopen the exact personal log detail.
136. Shared source links now recognize `linkedTaskId` as a task alias and infer `task` when `sourceType` is missing, so task reminders from notifications, alerts, and schedule items route to commercial/facility task detail or the correct personal task workspace.
137. Shared source links now infer alert and feed campaign routes from `linkedSensorAlertId`, `linkedFeedCampaignId`, and `linkedFeedPostId`, so linked-only sensor alerts and promotional campaign records reopen the Alert Center or commercial/facility Feed Campaigns area without needing a generic `sourceId`.
138. Personal grow timeline source buttons now try the shared source-link resolver before falling back to legacy `sourceModel` rules, so linked-only product batch, product, course, live, alert, forum, recipe, ToolRun, and other source-linked events can reopen their real workflow from the grow timeline.
139. Personal grow overview timeline previews now open explicit linked source records through the shared resolver, so recent product batch, task, feed campaign, and other linked timeline events stay connected before the user opens the full timeline.
140. Schedule / Agenda now infers source types from linked-only sensor alert and feed campaign fields, so calendar filtering and Open Source actions keep alert and outreach records connected even without a generic `sourceType`/`sourceId` pair.
141. Facility task creation and task subtitles now preserve `linkedSensorAlertId` and `linkedFeedCampaignId`, so sensor-driven operational jobs and facility outreach campaign tasks do not collapse into generic alerts or legacy feed-post ids.
142. Alert Center and Notification Center task creation now preserve canonical feed campaign ids and sensor alert ids, so follow-up tasks created from outreach, reminders, and controller warnings remain source-linked across Personal, Commercial, and Facility workspaces.
143. Commercial Task Center, commercial task detail, and commercial alert detail now create, display, and route canonical feed campaign ids while still reading legacy feed-post fields, keeping Feed as the outreach/campaign system instead of a discussion post source.
144. Personal Task Center and grow-specific personal tasks now preserve linked sensor alert ids separately from generic alert ids, so sensor/controller warnings can become personal follow-up tasks without losing their alert-center source route.
145. Deferred/manual verification scripts now include the latest connected source-routing tests for grow overview/timeline, personal tasks, commercial tasks, commercial alert detail, facility tasks, Schedule, Alert Center, Notification Center, and the shared source-link resolver.
146. Facility task detail now preserves linked sensor alert and feed campaign ids while editing workflow context, so operators can reopen controller alerts and facility outreach campaigns from detail pages without falling back to generic alert or legacy feed-post links.
147. Commercial product, course, and live setup tasks now emit canonical feed campaign ids while still reading legacy feed-post fields, so storefront readiness work stays tied to Feed/Campaigns outreach instead of discussion posts.
148. Commercial storefront setup tasks now emit canonical feed campaign ids for active campaigns while preserving legacy feed-post compatibility fields, so storefront launch checklists remain tied to Feed/Campaigns outreach.
149. Commercial live scheduling and storefront live cards now accept and display canonical feed campaign ids while preserving legacy feed-post compatibility, so live outreach stays connected to Feed/Campaigns instead of being treated as discussion.
150. Commercial dashboard action-item tasks now emit canonical feed campaign ids while preserving legacy feed-post compatibility, so owner command-center campaign fixes route back to Feed/Campaigns outreach.
151. Commercial Feed campaign creation now uses `/api/commercial/feed` instead of the legacy `/api/commercial/posts` endpoint, with audit coverage to keep in-app outreach on the Feed/Campaigns contract.
152. Feed campaign cards and placement rails now use canonical engagement-count naming while preserving legacy like-count fallback, keeping Feed as advertising/outreach instead of social discussion.
153. Active Feed/Campaigns UI now uses canonical campaign API types and functions, leaving old feed-post names only as compatibility aliases for legacy callers.
154. Active Feed/Campaigns audit coverage now requires campaign API names in the UI, acceptance coverage uses the canonical campaign list API, and legacy like-count data is normalized to campaign engagement counts at the API edge.
155. Commercial live scheduling now uses canonical related feed campaign form state while still writing the legacy feed-post alias for backend compatibility, keeping live outreach tied to Feed/Campaigns language.
156. Commercial product and course setup tasks now mirror canonical feed campaign ids into legacy feed-post compatibility arrays, so older source-link consumers stay connected while the active workflow uses Feed/Campaigns language.
157. Commercial product/course setup regression coverage now uses canonical-only feed campaign fixtures and verifies legacy alias task fields are still populated, preventing old feed-post data assumptions from hiding drift.
158. Personal Growlink import now saves suggested grow-space metadata alongside detected rooms, devices, normalized metrics, and read-only sensor streams, so controller imports can seed personal tents/rooms later instead of storing only telemetry numbers.
159. Facility controller room import now attaches suggested alert/task rules for imported alarm metrics while preserving read-only mappings, helping facilities start with actionable room monitoring after import.
160. Deferred verification scripts now include the personal Growlink import regression and manual checks for suggested personal grow spaces plus facility imported alert/task rule metadata.
161. Deferred verification now runs the IPM Scout regression that proves GrowPath AI and GPT verification answers are displayed, saved, and carried into follow-up task plans.
162. Production export SEO copy and live-test fixture labels now avoid "commercial grow" wording, using commercial storefront and product-trial evidence language instead.
163. App-store draft copy, product-trial evidence-run placeholders, and commercial fixture assertions now use storefront/product-trial language instead of commercial grow/crop wording.
164. Commercial course lesson task templates now preserve linked course, product, live, and Forum/Q&A context so lesson-created tasks can route back to the right source workflow.
165. Commercial course lesson task templates now carry shared Task defaults for commercial workspace, open status, normal priority, proof, and approval flags, so saved lesson actions can enter the Task Center with predictable behavior.
166. Commercial surfaces that route to the discussion workspace now label those actions as Forum / Q&A instead of generic Community, keeping Feed/Campaigns for outreach and Forum/Q&A for support/discussion.
167. Commercial Marketing Planner now accepts and displays a `linkedTrialId` evidence-run alias while still writing legacy `linkedGrowId`, reducing commercial-grow naming confusion without breaking existing campaign integrations.
168. Feed/Campaigns now accepts, displays, tracks, and task-links `linkedTrialId` evidence-run aliases while preserving legacy `linkedGrowId`, keeping outreach campaigns tied to product-trial evidence without reviving commercial-grow language.
169. Shared source-link routing now recognizes `linkedTrialId` as a product-trial alias, so campaign, task, alert, schedule, and notification records with the clearer evidence-run field can reopen commercial trial detail pages.
170. Alert Center, Notification Center, and Schedule/Agenda now preserve and infer `linkedTrialId` product-trial aliases when creating follow-up tasks or opening agenda sources, so the clearer evidence-run field stays connected beyond Feed/Campaigns.
171. Commercial Brand Forum/Q&A support posts now write and display `linkedTrialId` evidence-run aliases while preserving legacy `linkedGrowId`, keeping support answers tied to product trials without treating Forum/Q&A as Feed.
172. Commercial Task Center and commercial task detail now display, route, and create product-trial tasks with the clearer `linkedTrialId` alias while preserving legacy `linkedProductTrialId`, keeping evidence-run tasks connected to commercial trial detail pages.
173. Commercial inventory create/detail now preserve `linkedTrialId` product-trial evidence aliases while still writing legacy `linkedGrowId`, so stock support records stay connected to evidence runs without reviving commercial-grow language.
174. Commercial courses now preserve `linkedTrialIds` evidence-run aliases on create, setup tasks, and detail updates while still writing legacy `linkedGrowIds`, keeping education content tied to product-trial evidence without commercial-grow wording.
175. Commercial batch planning now preserves `linkedTrialId` evidence-run aliases while still writing legacy `trialGrowId`, so formula batches display and link to product-trial evidence without grow-oriented field names leaking into the workflow.
176. Product trial detail evidence tasks now preserve `linkedTrialId` alongside legacy `linkedGrowId`, so claim-readiness follow-up tasks keep the product-trial evidence-run alias through the shared task system.
177. GrowPath system audit now recognizes the current shared source-link resolver contract for personal grow-log routing, so connected task/timeline/dashboard workflow links verify as covered instead of reporting a stale false negative.
178. Commercial dashboard action tasks now preserve `linkedTrialId` when action items point at product-trial evidence, keeping command-center follow-up work aligned with the clearer evidence-run alias.
179. Commercial live setup tasks now preserve live visibility, Twitch channel/embed/EventSub context, replay URL, and notification-plan metadata, so setup work can route and explain the actual live workflow instead of becoming a generic live todo.
180. Commercial Product Trials now label linked private run context as evidence runs in the create form, list cards, and claim-readiness copy while preserving backend `growId` compatibility, reducing the visible Commercial-vs-Personal grow confusion.
181. Commercial task detail now labels linked run context as `Evidence run` instead of `Grow evidence`, keeping owner task context aligned with Product Trial evidence language while preserving legacy linked-grow fields.
182. Commercial evidence-run list/detail copy now treats the linked run as a private evidence-run record rather than a generic grow workspace, while keeping the compatibility route and API fields intact.
183. Payment support now uses the real `support@growpathai.com` address, removes corrupted placeholder icon text from the payment help dialog, and has regression coverage for the visible email plus `mailto:` target.
184. Facility inventory item detail now uses the shared back control with `/home/facility/inventory` as its fallback, with focused route coverage, so nested inventory records obey the workspace back-arrow rule.
185. Personal Forum new-post and guidelines pages now use the shared back control with `/home/personal/forum` fallbacks, with route coverage proving nested Forum pages return to the Forum root while Feed placements remain campaign/ad surfaces.
186. Facility audit log detail, audit entity detail, and compliance report detail now use shared back controls with audit/compliance fallbacks in all loading, error, and content states, with focused coverage for the nested compliance/audit back-arrow rule.
187. Commercial inventory create now uses the shared commercial AppPage shell with a `/home/commercial/inventory` fallback, keeping support-item creation visually aligned with the commercial workspace and covered by the existing create-route regression.
188. Personal journal create and detail pages now use shared back controls that return to the selected/linked grow journal, including locked-state creation coverage and loaded log-detail coverage, so grow logging follows the nested page navigation rule.
189. Personal Create Grow now uses the shared back control with `/home/personal/grows` fallback across limit-checking, locked, and create-form states, with access-route coverage proving the nested create flow returns to My Grows.
190. Facility SOP run start, presets, compare, compare-result, and run detail pages now use shared back controls with SOP-root/compare fallbacks, with focused coverage for the nested SOP workflow navigation rule.
191. Commercial profile support guidance now uses the live `support@growpathai.com` mailbox instead of a fake example placeholder, with route coverage confirming the brand profile hydrates the real support address while still allowing owners to override it.
192. Legacy Personal Bud Rot Risk and Harvest Estimator tool pages now use the shared back-control boundary with `/home/personal/tools` fallbacks, with focused coverage proving those nested tools return to the Tools hub instead of hand-coding standalone back buttons.
193. Legacy Personal AI Feeding Schedule and Watering Planner pages now use the shared back-control boundary with `/home/personal/tools` fallbacks, extending focused coverage across grow-action tools that can create logs and tasks.
194. Legacy Personal PPFD / DLI Planner and Timeline Planner pages now use the shared back-control boundary with `/home/personal/tools` fallbacks, with focused coverage for light-planning and milestone-planning tool navigation.
195. Legacy Personal AI Environment Analysis and PDF / Export pages now use the shared back-control boundary with `/home/personal/tools` fallbacks, with focused coverage for environment-review and export-tool navigation.
196. Personal Ingredient Library and Saved Tool Runs now use the shared back-control boundary with `/home/personal/tools` fallbacks, and their existing workflow tests assert the shared fallback while preserving ingredient-save and ToolRun-reopen behavior.
197. Personal VPD Calculator and Nutrient Chemistry now use the shared back-control boundary with `/home/personal/tools` fallbacks across locked and enabled states, with focused coverage for climate and nutrient-support tool navigation.
198. Personal Pheno Matrix and NPK / Feed Recipe Builder now use the shared back-control boundary with `/home/personal/tools` fallbacks, including the NPK locked-Pro state, while existing task-plan and product-draft tests assert the shared fallback.
199. Personal Plant Issue Diagnosis now uses the shared back-control boundary with a `/home/personal` fallback, its workflow regression asserts the shared fallback, and a source scan confirms Personal, Commercial, and Facility home routes no longer hand-code `BackButton`.
200. The shared backend-calculator Personal tool engine now uses the shared back-control boundary with `/home/personal/tools` fallbacks across locked and enabled states, so calculator-backed tools such as Soil Builder, Dry Amendment Mix, Topdress, IPM Scout, Harvest Readiness, and Dry/Cure Guard inherit consistent nested tool navigation.
201. Public support routing now uses the live GrowPath alias set for general, billing, commercial/storefront, facility, privacy, legal, and security requests, and account recovery/deletion fallback copy points users to the canonical support inbox with focused regression coverage.
202. Payment help now uses the shared support-contact config and routes billing/subscription issues to `billing@growpathai.com`, with regression coverage for the visible alias and `mailto:` destination.
203. GrowPath system audit now recognizes the canonical Personal tool routes for Nutrient Source Comparison, Soil Builder, Dry Amendment Mix Builder, Topdress Planner, pH / EC Range Check, and Dry / Cure Guard, reducing false partials and proving those connected calculator-backed tools as present-foundation modules.
204. GrowPath system audit now recognizes Soil & Nutrient Batch Planner evidence from its canonical tool route, backend calculator, focused test, and production-task language, and recognizes Facility Insights Summary from the facility dashboard route that consumes the read-only insights summary, moving the audit to 21 present-foundation modules.
205. GrowPath system audit now recognizes the Nutrient Chemistry route as the visible Compatibility Checker surface and Personal Diagnose as the ETGU Diagnosis Rules surface, with diagnosis route coverage asserting the ETGU symptom-pattern explanation remains visible after a result.
206. GrowPath system audit now treats route-less foundation contracts as route-optional evidence modules, anchors Product / Ingredient Library to its visible Personal tool route, and recognizes Organism Library as a crop-knowledge/IPM support library, bringing the audit to 32 present-foundation modules with no partials.
207. Commercial Storefront now has real nested edit and preview routes under `/home/commercial/storefront`, the dashboard Edit Storefront action opens the edit route, nested routes hide the tab bar, and focused coverage proves both routes use the shared back fallback to the Storefront root.
208. Legacy billing Upgrade Plan now uses the shared Pro, Commercial, and Facility pricing constants, shows monthly and annual options with annual billed-once/yearly equivalent copy, and sends the selected interval to checkout with focused regression coverage.
209. Public Privacy and Terms pages now route contact copy through the live support alias config for privacy, legal, security, and general account support, with regression coverage proving the aliases remain visible.
210. Release go/no-go support escalation evidence now uses the live `support@growpathai.com` mailbox instead of a placeholder fixture, with the focused release gate test passing.
211. Account mode switching now has a visible `/account/mode` workspace switcher with current identity, Personal / Commercial / Facility selector cards, manage-vs-create actions, Profile entry point, and persisted preferred-mode switching through the entitlement layer instead of a local-only toggle.
212. Personal and Facility dashboard headers now explicitly label their workspace mode, matching the Commercial workspace label so all three root dashboards show the current mode boundary before users create or manage records.
213. The active Personal Forum/Q&A composer now displays the posting identity, stores `authorType: "user"` plus workspace context through the shared forum API, and keeps the copy clear that Feed / Campaigns is outreach rather than discussion.
214. Feed/Campaigns creation now sends explicit commercial or facility `authorType` alongside `workspaceType`, so outreach campaigns store the acting brand/facility identity instead of relying only on mode inference.
215. Personal Profile now opens the shared `/account/mode` workspace switcher from the visible Mode card and explains that Personal grow records/Forum, Commercial storefront outreach, and Facility operational rooms stay separate.
216. Facility Profile now shows a facility-workspace identity card with Switch Workspace and Account Profile actions, keeping operational rooms/runs/tasks/sensors/compliance visibly separate from Personal grow records and Commercial storefront outreach.
217. Commercial Profile & Billing now exposes the shared workspace switcher beside Account Profile, giving brand owners a direct path back to Personal/Commercial/Facility identity selection while keeping brand settings separate from account controls.
218. Deferred user verification now runs the workspace switcher/profile and live support-alias regressions and asks the human/browser pass to confirm `/account/mode` is reachable from Personal, Commercial, and Facility profiles plus all live @growpathai.com support aliases.
219. The canonical route matrix now explicitly marks older generated `/feed`, `/storefront`, and `/dashboard` rows as historical when they conflict with current `/home/commercial`, `/home/commercial/storefront`, `/home/commercial/feed`, `/home/facility/select`, and `/home/facility` routing, with a doc regression guard.
220. Facility Feed/Campaigns now has a real `/home/facility/feed` route that reuses the shared campaign screen in facility-outreach mode, so facility tasks, alerts, notifications, and schedule source links to outreach campaigns no longer point at a missing route.
221. Support/ops handoff is now marked live: `support`, `billing`, `privacy`, `legal`, `security`, `commercial`, and `facility` @growpathai.com aliases are documented as production contacts, and config coverage locks the shared alias map plus routed support topics.
222. Facility Feed/Campaigns route access is now guarded as a selected-facility workspace route, with regression coverage proving unselected facility users stay on setup while selected facility users can open `/home/facility/feed`.
223. Facility inventory source links now use the canonical `/home/facility/inventory/:id` route, with a wrapper route and focused coverage across inventory cards, source links, facility task detail, alerts, and notifications replacing the old screen-filename URL.
224. Facility inventory creation now uses the canonical `/home/facility/inventory/new` route and the shared back-control shell with `/home/facility/inventory` fallback, so nested inventory setup no longer exposes the old component filename URL.
225. Deferred user verification now includes Facility inventory list, create, and detail route regressions, keeping the batched script aligned with canonical inventory routes and the nested back-control rule.
226. Commercial product-trial evidence runs now have canonical `/home/commercial/evidence-runs`, `/new`, and `/:id` wrapper routes; owner-facing product, batch, trial, inventory, marketing, and source-link paths now route there while legacy `/home/commercial/grows` remains only as compatibility implementation.
227. Deferred user verification now explicitly asks the browser pass to confirm Commercial Product Trials open private evidence-run list, create, and detail actions through `/home/commercial/evidence-runs` routes instead of exposing a commercial grow workspace.
228. Facility tabs now hide the bottom tab bar for canonical nested inventory create/detail routes (`/home/facility/inventory/new` and `/home/facility/inventory/:id`) while keeping the inventory root tabbed and preserving legacy filename-route compatibility.
229. Legacy commercial stack and page registry entries now resolve product-trial evidence screens through the canonical `/home/commercial/evidence-runs` wrappers while preserving old stack screen names only for compatibility.
230. Public storefront slugs now have a `/storefront/:slug` alias that renders the same public storefront as `/store/:slug`, while exact `/storefront` remains the commercial owner redirect/gated route.
231. Public storefront product detail slugs now have a `/storefront/:slug/products/:productId` alias that renders the same product page as `/store/:slug/products/:productId`, keeping public storefront URL families consistent.
232. Deferred user verification now asks the browser pass to compare `/storefront/:slug` and `/storefront/:slug/products/:productId` against the canonical `/store` public storefront URL family.
233. The canonical route matrix now documents `/storefront/:slug` and `/storefront/:slug/products/:productId` as public aliases while preserving exact `/storefront` as the commercial owner redirect-only stale-link guard.
234. Commercial Profile & Billing now shows both canonical `/store` public URLs and the human-readable `/storefront` alias URLs so owners understand either storefront route family reaches the same public brand/product surfaces.
235. Storefront owner Public Discovery now shows and links a View-as-User `/storefront/:slug` alias alongside the canonical `/store/:slug` and brand profile links, making the public storefront compatibility route directly testable by owners.
236. Storefront product creation now uses the canonical `linkedTrialId` evidence-run field in owner form state and payloads while still writing legacy `linkedGrowTrialId` for backend compatibility.
237. Commercial workflow API now exposes canonical product-trial evidence-run function names and the commercial dashboard loads evidence through those aliases while preserving old commercial-grow function exports for compatibility.
238. Commercial dashboard and page registry now use canonical `CommercialEvidenceRuns` route names for product-trial proof records, while native stack legacy `CommercialGrows` names remain only as compatibility aliases.
239. Commercial product-trial evidence-run wrappers, workflow tests, and API return types now use canonical evidence-run naming internally while leaving legacy commercial-grow endpoints and exports only as compatibility shims.
240. Shared feed placement policy no longer exposes a forum-highlight switch, and the dead feed-folder forum highlight components were removed so Feed rails can only render campaign/ad placements while Forum remains the discussion surface.
241. Forum API route constants now expose canonical `LATEST`, `TRENDING`, and `FOLLOWING` names for discussion thread lists, with legacy `FEED_*` constants retained only as aliases so old callers cannot confuse Forum/Q&A lists with Feed campaigns.
242. Canonical commercial evidence-run wrappers now pass `commercial-evidence-runs`, create, and detail route keys into the shared AppPage shell, preserving root/no-back and nested/back behavior without exposing old commercial-grow route-key names.
243. Facility manual room creation now captures optional zone/area and stage context, stores those fields through the room API, and displays them on the selected room workspace so Rooms/Zones setup is not limited to imported controller data.
244. Storefront product setup warnings now require grow interests and size/weight in addition to image, description, price, checkout, and published status, so product cards are ready for discovery, targeting, and buyer context before owners treat them as complete.
245. Commercial Products root now blocks publish and setup readiness when product grow interests are missing, keeping product management aligned with storefront discovery and targeting requirements.
246. Commercial Product Detail now exposes editable grow interests, includes them in publish readiness, and saves them with product updates so owners can fix targeting/discovery blockers without leaving the detail workspace.
247. Commercial Product Lines now carry grow interests through API typing, root creation, list display, detail editing, and save payloads so product families can drive storefront discovery and feed targeting instead of acting as internal-only labels.
248. Feed/Campaigns now exposes linked Product Line context in the campaign builder, readiness checks, card metadata, CTA routing, setup tasks, create payloads, and click analytics so product-family ads connect to storefront discovery without becoming forum discussion.
249. Public brand profiles and storefronts now extract and render Product Lines with grow interests and line-filter links so commercial product families are visible to users instead of only existing in owner/admin workflows.
250. Public storefront Product Line links now filter product cards by linked product-line IDs and provide a visible return-to-all-products action, making product-family storefront navigation functional instead of a decorative query link.
251. Storefront owner home now loads Product Lines, shows their grow-interest context, and links each line to owner detail plus the filtered public storefront so the commercial brand hub matches what users can browse publicly.
252. Deferred user verification now includes Product Line checks across Storefront owner home, public brand/storefront pages, and `/store/:slug?line=:lineId` filtered product-card behavior.
253. Public product detail pages now preserve Product Line context with line summary, grow interests, and Browse Line routing back to the filtered storefront, so buyers do not lose product-family navigation after opening a product.
254. Storefront owner product creation now offers quick-select buttons for existing Product Lines while preserving the product-line ID field, so commercial owners can attach products to storefront families without copying raw IDs.
255. Commercial Product Line detail now loads attached products, shows their status, grow interests, and descriptions, and links back to owner product detail so Product Lines behave as connected product families instead of standalone labels.
256. Commercial Soil & Nutrient Batch Planner now loads existing Product Lines and offers quick-select buttons on batch creation, keeping formula/production batches connected to storefront product families without manual ID copying.
257. Commercial Marketing Planner now loads existing Product Lines, counts line-linked campaigns as connected plans, and offers quick-select buttons for product-family campaigns instead of making owners type raw line IDs.
258. Canonical Product Trial Evidence Run creation now loads existing Product Lines and offers quick-select buttons so private evidence records can attach to storefront product families without raw ID lookup.
259. Commercial Course creation now loads existing Product Lines and offers quick-select buttons for product-family course links, making product education easier to connect to storefront families without manual ID entry.
260. Commercial Course detail/edit now loads existing Product Lines and offers quick-select buttons for linked product-family metadata, so owners can repair course-to-product-line connections after creation without raw ID lookup.
261. Commercial Product Trials now load existing Product Lines and offer quick-select buttons on trial creation, keeping compatibility trial records connected to storefront product families while evidence-runs remain canonical.
262. Commercial Product Detail now loads existing Product Lines, shows current line context, and offers a quick-select repair path that saves `productLineId`, so owners can fix storefront family metadata after product creation without copying raw IDs.
263. Commercial Product Trial detail and canonical Evidence Run detail now link product-line IDs back to owner Product Line detail pages, matching the batch-detail behavior and keeping evidence records navigable through storefront product families.
264. Commercial inventory creation now has a canonical `/home/commercial/inventory/new` wrapper and owner entry points use it, while legacy `/home/commercial/inventory-create` remains only as compatibility.
265. Commercial inventory detail now has a canonical `/home/commercial/inventory/:id` wrapper, inventory rows and source links route there, and legacy `/home/commercial/inventory-item/:id` remains only as compatibility.
266. Legacy CommercialStack screen names for inventory create/detail now import the canonical `/home/commercial/inventory/new` and `/home/commercial/inventory/:id` wrappers, keeping old navigation names compatible without exposing stale route files as the implementation source.
267. Commercial workflow regression coverage now imports canonical inventory detail through `/home/commercial/inventory/:id`, so tests exercise the current route family instead of the legacy compatibility file.
268. The canonical route matrix Commercial section now lists `/home/commercial` as the landing route, documents the current owner/storefront/feed/inventory route family, and marks old `/campaigns`, `/orders`, `/inventory-create`, `/inventory-item/:id`, and `/grows` paths as compatibility guards.
269. The root Create Post action now sends Facility users to `/home/facility/feed` for facility outreach campaign creation instead of the shared `/feed` viewer, keeping facility author identity and workspace routing intact.
270. Deferred user verification now includes the canonical Commercial inventory create/detail regression, the canonical route-matrix guard, and the root Create Post facility-outreach regression, with browser checklist items for `/home/commercial/inventory/new`, `/home/commercial/inventory/:id`, and `/home/facility/feed`.
271. Feed placement rails now route product-line campaigns to filtered public storefront discovery (`/store/:slug?line=:lineId` or `/store?line=:lineId`), matching the main Feed/Campaigns destination behavior so top/middle/bottom ads keep product-family CTAs connected.
272. Storefront owner Active Feed Campaigns now shows linked product-line context and a Browse Line action back to the filtered public storefront, so owners can see which storefront family each campaign promotes without treating the ad as discussion.
273. Commercial Marketing Planner rows now display linked product-line context for existing launch plans, matching the linked-plan metrics and keeping product-family campaigns visible instead of only showing product/course/evidence-run IDs.
274. Commercial workflow regression fixtures now use campaign-placement language instead of "post to feed" copy, keeping tests aligned with Feed as advertising/outreach and Forum as discussion.
275. Shared source-link routing now sends commercial `product_trial` evidence sources to canonical `/home/commercial/evidence-runs/:id` routes across Schedule, Alerts, Notifications, and Commercial task views, leaving Product Trials as an owner workflow instead of the generic evidence destination.
276. Commercial Product Trials list now exposes a direct `Open Evidence Run` action whenever a trial has linked evidence, preserving the owner trial detail route while making the underlying evidence-run workflow reachable from the list.
277. Support aliases are confirmed live for `support`, `billing`, `privacy`, `legal`, `security`, `commercial`, and `facility` @growpathai.com, matching the shared support-contact config and deferred browser verification checklist.
278. Legacy CommercialStack Campaigns/Advertising screen copy now frames the page as a marketing planner that hands off real outreach to Feed / Campaigns, removing old feed-post/platform-campaign ambiguity from compatibility navigation.
279. Active QA login defaults and the test-user account guide now use `@growpathai.com` addresses instead of stale `@growpath.com` accounts, reducing live smoke-test confusion while leaving historical release evidence unchanged.
280. Native Commercial dashboard inventory labels now say Inventory Support and describe stock as supporting products, batches, orders, and storefront availability instead of implying a separate commercial inventory universe.
281. Commercial dashboard task source classification now preserves order and alert action IDs in addition to product, inventory, product-trial evidence, and feed-campaign tasks; alert setup items are no longer misclassified as storefront sources just because their type includes `storefront`.
282. Shared SchedulePicker coverage now locks the 21-day quick date and `every 21 days` recurrence option used by topdress, re-amend, soil cook, and follow-up workflows.
283. Public support routing now gives every live alias its own shared support-topic row: support, billing, privacy, legal, security, commercial, and facility @growpathai.com all appear as first-class contact destinations.
284. Commercial Forum/Q&A owner copy now says Brand Forum / Q&A instead of commercial community, keeping discussion/support language separate from Feed / Campaigns outreach.
285. Commercial course and analytics copy now labels support discussion as Forum/Q&A instead of community, so creator education loops and forum-reply metrics do not blur into Feed/Campaigns.
286. Commercial Brand Forum/Q&A now labels the legacy community directory handoff as Open Forum Directory, keeping owner navigation discussion-oriented without exposing community/feed ambiguity.
287. Public Support page intro now names account, billing, technical, privacy, legal, security, commercial, and facility support so every live alias category is discoverable before users read the routing cards.
288. Commercial action E2E coverage now creates Product Trial Evidence Runs and Feed campaigns through the canonical labels and `/api/commercial/feed` endpoint instead of stale commercial-grow and feed-post wording.
289. GrowPath system audit output now says Commercial Forum/Q&A instead of commercial community, so internal audit reports preserve the Feed-versus-Forum distinction.
290. The legacy `/communities` directory now presents itself as a Forum Directory with discussion-group copy, keeping the route useful for Q&A discovery without blurring into Feed/Campaigns outreach.
291. Personal home Explore now links to `Forum / Q&A` instead of `Community`, matching the Personal tab label and keeping discussion language separate from Feed/Campaigns.
292. Registration, search, and subscription feature copy now refer to Forum/Q&A where they mean the discussion feature, while Feed/Campaigns remains the outreach/ad surface.
293. Onboarding guild-selection and walkthrough copy now presents Forum/Q&A groups and Feed campaign targeting explicitly, so new users learn the discussion-versus-outreach split before checkout.
294. Register-account E2E expectations now look for Forum group onboarding labels instead of stale guild-selection copy, keeping browser coverage aligned with the visible onboarding flow.
295. Legacy commercial community compatibility screen now presents Forum/Q&A groups, avoids corrupted member glyphs, and renders featured groups from loaded data instead of the imported API function.
296. Personal Forum/Q&A membership fallbacks now say forum groups instead of guilds, preserving the user-facing discussion vocabulary while leaving backend guild API contracts untouched.
297. Shared Forum Directory and onboarding group picker fallbacks now say Forum group when backend rows are unnamed, so first-run and directory screens no longer surface stale Guild vocabulary.
298. Storefront owner setup now uses the live `support@growpathai.com` alias as its support-email placeholder, matching the already-live support alias map and brand profile guidance.
299. Feed live campaign CTAs and shared non-commercial live source links now open the public Live Session surface instead of looping back into Feed, keeping Feed promotional and giving live reminders, schedule items, and tasks a real event destination.
300. Public Live Session now renders the Twitch embed surface, replay action, scheduled/status metadata, and linked product/course/Forum Q&A context, so campaign and reminder traffic lands on a real event page instead of a thin external-link card.
301. Shared commercial product-batch source links now prefer the linked Product detail workspace when a product id is present, while preserving Batch Planner as the fallback for batch-only records, keeping batches/lots attached to products instead of acting like a separate app.
302. Shared CommercialBanner copy is now ASCII-clean and uses Pro Forum/Q&A plus Commercial storefront language instead of stale community/marketplace wording, with regression coverage to keep global promo copy aligned.
303. Deferred user verification now runs the latest CommercialBanner and LiveSession regressions and asks the human/browser pass to confirm product-linked batch routing plus public live-session campaign/task/schedule/notification entry points.
304. Storefront owner and Commercial Profile support-email placeholders now read from the shared live support-contact config instead of duplicating `support@growpathai.com`, keeping support alias changes centralized.
305. Commercial Product Detail now reads `batchId` route context, shows the focused product batch in Linked Evidence, and links directly to the focused Batch Planner detail so product-batch tasks/alerts/schedule items keep batches/lots inside the product workspace while preserving full production-detail access.
306. Deferred user verification now checks not only product-linked batch routing but also the Product Detail focused-batch context and Open Focused Batch action, so the browser pass verifies batches/lots stay attached to products while still exposing production records.
307. Personal feature metadata now titles the legacy `personal.community` route as Forum / Q&A and the shared menu comment names Forum/Q&A as the separate discussion surface, keeping compatibility keys while removing visible Feed-vs-Forum ambiguity.
308. Public Store discovery now presents Storefront offers and routes to `/offers` instead of sending users into `/marketplace`, and the Commercial plan offer copy now starts with storefront/products/campaigns rather than marketplace language.
309. Paywall, global Search, Commercial Tools, and shared capability menus now use Storefront Offers, Creator Content, and External Channel Integrations labels while preserving legacy Marketplace route names only as compatibility targets.
310. Storefront owner quick product creation now accepts and posts a Stripe price ID alongside external purchase URL, so product checkout readiness can be completed from the storefront workflow instead of forcing owners to leave the brand setup surface.
311. Commercial Products create flow now accepts Stripe price IDs, posts them to the product API, and allows publish setup with either Stripe price or external purchase URL, matching the product readiness rules already used by storefront cards and product detail.
312. Commercial product records now support Stripe product IDs as well as Stripe price IDs across the shared Product type, Storefront quick-create, Commercial Products create, and Product Detail edit/update flows, aligning product checkout setup with the existing course Stripe Product/Price model.
313. Deferred user verification now includes Stripe product and price ID checks for Storefront quick product creation, Commercial Products publish readiness, and Product Detail edits so checkout setup can be browser-verified in one batched pass.
314. The shared support-contact config now includes the full live GrowPath alias set, exposes public routing for support, billing, orders, sales, commercial, courses, live events, facility, partners, contact, privacy, legal, and security, and keeps noreply/notifications as sender-only aliases.
315. Public storefront course detail routes now exist at `/store/:slug/courses/:courseId` and `/storefront/:slug/courses/:courseId`, showing course price, grow interests, related products, related lives, Feed campaign CTAs, Forum/Q&A links, analytics tracking, and paid Stripe checkout return routing.
316. Public storefront pages now render Upcoming Lives from the storefront payload and route each live to `/live-session?sessionId=:id`, keeping live cards visible on storefronts while the public Live Session page remains the event detail surface.
317. Public Live Session pages now turn related product, course, and Forum/Q&A IDs into clickable actions, using storefront-aware product/course routes when a storefront slug is available and preserving Twitch/replay controls.
318. Public storefront product CTAs now reflect checkout readiness: Stripe-ready products show Buy, external-only products show External Link, and products with no checkout destination do not expose a fake Buy action.
319. Public product detail pages now render product-linked lives as Product Lives with Open Live actions, so product demos, launch sessions, Q&A lives, and replays are connected from the buyer-facing product record.
320. Support aliases are live for the full shared alias set: support, help, contact, hello, info, admin, billing, orders, sales, partners, privacy, legal, security, commercial, facility, courses, live, noreply, and notifications @growpathai.com, with public routes exposing only user-contact destinations.
321. Shared source-link routing now opens viewer course sources on `/store/:slug/courses/:courseId` when storefront metadata exists, so course ads, live context, reminders, alerts, and schedule items can land on the public brand course page instead of only the personal course query route.
322. Feed/Campaigns and top-page FeedRail course ads now use storefront-aware public course routes when campaign metadata includes a storefront slug, and FeedRail live ads open the public Live Session surface instead of looping back into Feed.
323. Public Live Session product links now use the same `/store?q=:productId` discovery fallback as Feed/Campaigns when a storefront slug is missing, while still using exact `/store/:slug/products/:productId` routes when brand context exists.
324. App intro copy now introduces connected Personal, Commercial/storefront, and Facility workspaces while explicitly separating promotional Feed/Campaigns from Forum/Q&A discussion/support before users enter onboarding.
325. The legacy commercial creator-content screen no longer exposes Marketplace wording in visible titles, errors, search placeholders, fallback item labels, or customer labels; old marketplace API names remain only as compatibility plumbing.
326. The legacy public Marketplace compatibility screens now present themselves as Storefront Offers in visible headers, search, loading/error/empty states, back links, fallback item labels, and checkout accessibility labels while retaining old marketplace route/API names only as compatibility internals.
327. Commercial external-channel and influencer CTA copy now uses External Channel Integrations and Creator Content language instead of marketplace wording, and the creator CTA uses ASCII-clean text.
328. Forum post detail anonymous author fallbacks now say Forum member instead of Community member, keeping discussion labels aligned without changing legacy route/API compatibility names.
329. Schedule/Agenda now forwards full live, course, and feed campaign records into the shared source-link resolver, so viewer course releases with storefront slugs open public storefront course pages instead of losing brand context.
330. Alert Center and Notification Center now preserve storefront slug aliases when creating follow-up tasks from source-linked product/course/live/storefront records, so task source links can keep exact public storefront routes after alert/notification conversion.
331. Growers Forum code-of-conduct copy now says the Forum is not a Storefront, Feed campaign, or checkout surface, and points sales/promotions to approved Storefront and Stripe flows instead of legacy marketplace language.
332. Legacy feed item cards now route product and course campaign metadata to exact public storefront product/course destinations when a storefront slug is present, with discovery fallbacks when only product/course ids exist.
333. Commercial Brand Forum/Q&A recent support posts now expose direct actions to linked public storefront product/course pages, evidence runs, and storefronts, so support answers connect users back to the real product/course/store surfaces.
334. Personal Task Center now shows a separate View Linked Object action when alert/tool/source-created tasks carry product, course, live, storefront, or Forum context, so users can open the exact public storefront object without losing the original alert/source trail.
335. Personal grow-specific Tasks tabs now mirror the Task Center source behavior by keeping the original alert/source link while adding View Linked Object for product, course, live, storefront, and Forum context carried on the task.
336. Commercial Task Detail now keeps alert/source routing intact while adding a separate View Linked Object action for product, product-batch, trial, course, lesson, live, feed-campaign, storefront, and Forum context when it differs from the task source.
337. Commercial Task Center cards now expose the same source-plus-linked-object split as task detail, so alert-backed setup tasks can keep their Alert Center trail while jumping directly to the product/course/live/storefront/campaign object that needs work.
338. Facility Task Detail now preserves alert/source routing while adding View Linked Object for product, product-batch, trial, SOP/course, lesson, live, feed-campaign, and Forum context, keeping facility users inside facility inventory/runs/SOP surfaces instead of commercial admin routes.
339. Commercial Alert Detail now opens the affected product, batch, trial, course, live, storefront, feed campaign, order, or Forum source directly with View Linked Object while still creating alert-backed follow-up tasks with the original alert trail.
340. Notification-created follow-up tasks now preserve specific lesson and course-assignment IDs instead of flattening them into generic course links, keeping course workflow reminders connected to the exact lesson or assignment that generated the notification.
341. Alert-created follow-up tasks now preserve parent course, exact lesson, and course-assignment IDs so instructor/student alert workflows stay connected to the specific course child record that needs action.
342. Schedule/Agenda and the shared source-link resolver now infer `linkedCourseAssignmentId` as course-assignment context, so assignment calendar items reopen the course workflow instead of falling back to generic task pages when `sourceType` is missing.
343. Shared course source links now carry exact `lessonId` and `assignmentId` query context on commercial, personal/public storefront, and facility course/SOP routes, so task and schedule links can open the parent course while preserving the exact child record that caused the action.
344. Personal Task Center, grow-specific Tasks, Commercial Task Center/detail, and Facility Tasks/detail now all recognize `course_assignment` sources and preserve `linkedCourseAssignmentId` so course/SOP assignment tasks create, display, and reopen the exact assignment context consistently across workspace modes.
345. Deferred user verification now records that the owner confirmed support is live with all aliases, shifting the remaining support check to UI routing and sender-only visibility instead of treating alias creation as an open blocker.
346. Active commercial menus and Commercial Tools no longer route creator-content/storefront-offer work into legacy Marketplace compatibility screens; owners now go to Storefront, Feed / Campaigns, and Marketing Planner while external-channel and influencer copy points to courses, lives, and storefront offers.
347. The legacy Content Marketplace compatibility screen now presents visible upload/browse/analytics copy as Storefront Offers and offer drafts, while keeping old marketplace API calls only as compatibility plumbing.
348. Shared card radius now uses the tighter 8px workspace token, applying more of Facility's operational visual polish to Personal and Commercial components that consume the common theme.
349. Deferred user verification now includes the Storefront Offers compatibility tests, active Commercial Tools navigation test, Marketplace compatibility copy guard, shared theme-token guard, and a browser checklist item proving active menus no longer expose Marketplace screens.
350. Commercial Task Detail now consumes the shared 8px card radius token for cards, feedback, and action buttons, keeping commercial source-linked task workflows visually aligned with Facility's tighter operational polish.
351. Commercial Alert Detail now matches the same shared 8px card radius treatment as Commercial Task Detail, and both routes use ASCII loading copy to avoid visible encoding drift.
352. Commercial Log Detail now uses the shared 8px workspace card radius and has focused route coverage proving the nested log detail loads from the global log endpoint.
353. Active Commercial Tools cards now consume the shared 8px workspace radius token while preserving Storefront Offers, Feed / Campaigns, and Marketing Planner navigation coverage.
354. Personal Profile cards and primary account actions now consume the shared 8px workspace radius token, extending the Facility-level visual polish to the Personal account/support surface without changing profile behavior.
355. Personal AI command-center cards, message panels, prompt input, and send action now consume the shared 8px workspace radius token, extending the polished operational look to the grower AI surface.
356. Legacy Commercial Profile compatibility cards and billing actions now consume the shared 8px workspace radius token, with focused coverage for commercial identity rendering and subscription navigation.
357. Deferred user verification now includes the new Commercial Log Detail, Commercial Profile compatibility, Personal AI, and support/profile visual-token coverage plus a manual cross-workspace visual-polish check.
358. Connected workflow verification now passes after cleaning the Personal Forum post detail formatting drift that was blocking lint; the gate completed lint, focused connected tests, and production web export successfully.
359. Legacy Commercial Profile compatibility copy now uses Commercial Brand Profile and Brand labels instead of Business, keeping fallback profile surfaces aligned with the storefront-first commercial workspace language.
360. Legacy Commercial Forum/Q&A group topics now use Commercial Ops instead of Business, keeping commercial discussion vocabulary aligned with brand/storefront operations rather than generic business labels.
361. Commercial Course workflow copy now says storefront context instead of business context, keeping commercial courses tied to products, support, onboarding, and storefront education.
362. Public Marketplace compatibility copy now says Storefront Offers only, removing the remaining visible creator-content wording while keeping old marketplace API names as compatibility plumbing.
363. Personal Tools now labels the recipe/product handoff area as Products & Production instead of Business & Production, keeping Personal mode focused on tools while still supporting product/facility handoffs.
364. Shared tab navigation now labels the discussion destination as Forum / Q&A while keeping FeedTab labeled Campaigns, with regression coverage proving Feed remains the promotional campaign route and Forum remains the discussion route.
365. Public Offers pricing copy now describes the Commercial plan as Brand-focused and says brand operations instead of business operations, keeping upgrade language aligned with storefront-first commercial accounts.
366. Shared capability menus now label discussion as Forum / Q&A and commercial metrics as Commercial Analytics, removing another generic Business Metrics label from user-facing navigation.
367. Legacy marketplace compatibility API fallbacks now say Storefront offer/customer and storefront offer browse/load errors, preventing old Marketplace wording from leaking into Storefront Offers analytics or fallback UI.
368. Personal Forum route and stack title now use Forum / Q&A, and the route consumes the shared 8px card radius token so the Personal discussion surface matches the Facility-style visual polish.
369. Commercial Inventory create now says Inventory Support Record/Create Inventory Record instead of ambiguous Support Item copy, and its inputs/actions use the shared 8px radius token.
370. Commercial Inventory list/detail/dashboard/navigation now refer to individual stock rows as Inventory Records instead of Support Items, and the detail cards/actions use the shared 8px radius token.
371. Legacy central page registry now labels the Forum route as Forum / Q&A while preserving the route name for compatibility, with navigation coverage guarding the corrected discussion label.
372. Commercial Analytics metric and breakdown cards now consume the shared 8px card radius token, extending Facility-style visual polish to the event-backed commercial analytics surface.
373. Commercial Inventory list cards, summary cards, guide cards, and create action now consume the shared 8px card radius token, aligning the full inventory support surface with Facility-style visual polish.
374. Personal Forum/Q&A compatibility tab cards, membership actions, discussion actions, and feedback now consume the shared 8px card radius token, extending the Facility-style visual polish to the legacy personal discussion surface.
375. Personal Forum/Q&A new-post inputs, identity/setup cards, photo controls, action buttons, previews, and feedback now consume the shared 8px card radius token, applying the Facility-style visual polish to the user-facing discussion composer.
376. Personal Forum/Q&A post-detail cards, attached-photo previews, comment composer, moderation/action buttons, and feedback now consume the shared 8px card radius token, keeping nested user discussion pages visually aligned with the Facility-style app polish.
377. Personal Grows list panels, grow cards, grow-linked actions, and create-grow CTAs now consume the shared 8px card radius token, carrying the Facility-style visual polish into the core personal grow workspace.
378. Create Grow inputs, error panel, photo tools, advanced-field toggle, attached-photo cards, URL action, and submit CTA now consume the shared 8px card radius token while preserving pill selectors, extending Facility-style visual polish to the personal grow creation flow.
379. Personal Grow overview panels, stat cards, and grow action buttons now consume the shared 8px card radius token, centralizing the Facility-style visual polish on the core grow workspace landing page.
380. Personal Grow Tools hub cards, saved-run actions, and inline result controls now consume the shared 8px card radius token, keeping grow-linked ToolRun workflows visually aligned with the Facility-style app polish.
381. Personal Grow Journal, Compare, and Automation subpages now consume the shared 8px card radius token for CTAs, cards, code/output blocks, automation actions, and empty states while preserving pill filters, extending Facility-style polish across more nested grow workflows.
382. Personal Grow Timeline filters, event cards, source-link actions, tags, and empty states now consume the shared 8px card radius token, keeping the source-linked grow history view aligned with the Facility-style visual system.
383. Personal grow-specific Tasks form, inputs, add button, task cards, source actions, danger actions, and source/priority chips now consume the shared 8px card radius token, keeping grow task workflows aligned with the Facility-style polish while preserving source-link behavior.
384. Personal Grow Plants form, species/profile inputs, crop-profile actions, empty state, plant cards, and plant quick actions now consume the shared 8px card radius token, extending Facility-style polish to plant-level tracking inside grows.
385. Personal Journal create/detail inputs, note boxes, photo tiles, insight/review cards, warning/feedback panels, and edit/delete/save actions now consume the shared 8px card radius token while preserving tag pills, aligning grow-log workflows with Facility-style polish.
386. Personal Diagnose inputs, photo preview, action buttons, locked notice, provider/readiness panels, crop-context review, and follow-up cards now consume the shared 8px card radius token while preserving pill selectors, extending Facility-style polish to AI diagnosis/IPM-adjacent grow workflows.
387. Personal home/dashboard pulse cards, metrics, alert rows, task rows, command actions, and inline actions now consume the shared 8px card radius token, carrying Facility-style polish onto the main grower command center.
388. Personal Task Center metric cards, create-task form, inputs, source/priority chips, task cards, and task actions now consume the shared 8px card radius token while preserving count/source pills, aligning the global personal action layer with Facility-style polish.
389. Personal Forum/Q&A guidelines card now consumes the shared 8px card radius token, removing the last non-token card radius from the personal forum route family while keeping Feed/Campaign placements separate from discussion.
390. Personal Tools hub context banner, tool cards, and saved-runs/recipe/ingredient utility actions now consume the shared 8px card radius token, extending Facility-style polish to the main AI/tool discovery surface.
391. Personal AI reference/draft cards, AI action buttons, grow-context chips, Profile verification rows, email inputs, and account actions now consume the shared 8px card radius token, extending Facility-style polish to personal assistant and account-management surfaces.
392. Personal NPK / Feed Recipe Builder guidance, AI brief, batch inputs, ingredient rows, analysis fields, selectors, action buttons, result cards, saved recipes, and locked panel now consume the shared 8px card radius token, applying Facility-style polish to the core recipe-calculation workflow.
393. Personal Ingredient Library ingredient cards, label-analysis inputs, and create/update/archive actions now consume the shared 8px card radius token while preserving favorite/filter pills, aligning reusable guaranteed-analysis data entry with Facility-style polish.
394. Personal Integrations provider panels, Growlink setup panel, controller options, import-preview room cards, inputs, notices, and connect/sync actions now consume the shared 8px card radius token while preserving read-only status pills, aligning sensor/controller onboarding with Facility-style polish.
395. Dew Point Guard telemetry/source panels, CSV ingest actions, manual-reading controls, event flag/output cards, Pulse controls, and fetch actions now consume the shared 8px card radius token while preserving mode chips, aligning dew-point and sensor-risk workflows with Facility-style polish.
396. VPD Calculator, PPFD / DLI Planner, and Watering Planner inputs and locked states now consume the shared 8px card radius token while preserving VPD selector pills, extending Facility-style polish across core environment and irrigation tools.
397. Bud Rot Risk, Harvest Estimator, AI Feeding Schedule, AI Environment Analysis, Timeline Planner, and PDF / Export inputs, actions, preview cards, milestone cards, and locked states now consume the shared 8px card radius token across legacy personal planning/export tools.
398. Saved Tool Runs cards, note editor, save action, and Pheno Matrix candidate cards, score inputs, ranked rows, score badges, and locked state now consume the shared 8px card radius token while preserving saved-run filter pills.
399. Nutrient Chemistry context panels, recommendation cards, compatibility warnings, rate/lab inputs, release groups, evidence tags, form cards, and action buttons now consume the shared 8px card radius token while preserving nutrient/compare pills.
400. Personal Forum/Q&A list photo thumbnails now consume the shared 8px card radius token, leaving the personal route-family radius scan with only intentional pill controls.
401. Commercial dashboard logout, pulse, action-item, task, feedback, metric, and quick-action surfaces now consume the shared 8px card radius token while preserving status pills, extending the Facility-style visual polish to the storefront-first command center.
402. Commercial Task Center metric cards, create-task form, schedule-linked inputs, source/priority chips, task cards, feedback, and task actions now consume the shared 8px card radius token while preserving count/source pills, aligning the commercial action layer with Facility-style polish.
403. Commercial Profile & Billing brand actions, identity metrics, profile inputs, and save CTA now consume the shared 8px card radius token, keeping support-email and storefront identity setup visually aligned with Facility-style polish.
404. Commercial Orders feedback, summary cards, order metadata chips, and fulfillment actions now consume the shared 8px card radius token while preserving status pills, keeping Stripe/order follow-through visually aligned with Facility-style polish.
405. Commercial Brand Forum / Q&A metrics, support inputs, create action, linked-object actions, and post rows now consume the shared 8px card radius token while keeping Feed/Campaigns visually and behaviorally separate from discussion.
406. Storefront owner workspace feedback, setup metrics, inputs, checklist rows, public-link previews, preview/object actions, media previews, product cards, campaign rows, and warning panels now consume the shared 8px card radius token while preserving storefront status and tag pills.
407. Commercial Products catalog metrics, product-create inputs, publish/create actions, product rows, product thumbnails, and warning panels now consume the shared 8px card radius token while preserving missing-setup and task pills.
408. Commercial Product Detail rows, evidence/action buttons, effectiveness metrics, focused-batch panel, product-line selectors, edit inputs, and save CTA now consume the shared 8px card radius token while preserving readiness and warning pills.
409. Commercial Product Lines root/detail actions, forms, line rows, detail rows, linked-product rows, feedback, and save controls now consume the shared 8px card radius token, keeping storefront product grouping visually aligned with product cards.
410. Commercial Courses root/detail metrics, inputs, product-line selectors, setup warning panels, course rows, thumbnails, lesson rows, and publish/save actions now consume the shared 8px card radius token while preserving course-product-live Forum/Q&A links.
411. Commercial Lives metrics, Twitch/schedule inputs, visibility actions, setup warning panels, schedule CTA, and live rows now consume the shared 8px card radius token while preserving course/product/feed/forum/replay/reminder links.
412. Commercial Marketing Planner metrics, campaign inputs, product-line selector, creative upload/clear actions, creative previews, campaign rows/images, budget badges, and CTA buttons now consume the shared 8px card radius token, keeping Feed/Campaign outreach visually aligned but distinct from Forum/Q&A.
413. Commercial Analytics action links now consume the shared 8px card radius token, keeping event-backed storefront, product, course, feed, live, and order metrics visually aligned with the Facility-style page treatment.
414. Commercial Batch Planner root/detail metrics, formula inputs, product-line selectors, batch rows, evidence fields, and save/actions now consume the shared 8px card radius token so recipe-to-product-to-trial production planning keeps the Facility-style polish.
415. Commercial Product Trial Evidence Runs root/detail metrics, trial setup inputs, product-line selectors, evidence-run rows, linked evidence fields, and save/actions now consume the shared 8px card radius token while keeping commercial grows framed as product evidence instead of facility operations.
416. Commercial Product Trials root/detail forms, product-line selectors, trial rows, feedback, evidence fields, claim-readiness task actions, and save controls now consume the shared 8px card radius token while preserving 999 claim-status pills.
417. Shared Schedule / Agenda metric cards, refresh action, filters, feedback, agenda cards, and source links now consume the shared 8px card radius token while preserving count/type pills, extending Facility-style visual polish across personal, commercial, and facility timing workflows.
418. Shared Notification Center header panel, filters, mark-read actions, notification cards, read badges, source links, and create-task controls now consume the shared 8px card radius token, aligning cross-workspace reminders with the Facility-style treatment.
419. Shared Alert Center metric cards, schedule/action panel, filters, feedback, alert cards, create/resolve/snooze/source/AI actions, and assignee input now consume the shared 8px card radius token while preserving severity pills.
420. Facility Dashboard hero, compliance/task pulse cards, refresh action, priority/action panels, and operational tiles now consume the shared 8px card radius token, keeping the original Facility visual language aligned with the cross-user polish pass.
421. Facility Sensor Integrations provider guidance cards and room-import CTA now consume the shared 8px card radius token while preserving provider pills, keeping controller/Pulse/TrolMaster onboarding aligned with the shared polish pass.
422. Facility Rooms controller import preview, room forms, preview rows, create/delete actions, batch-cycle summary, and feedback now consume the shared 8px card radius token while preserving room/status pills, keeping auto-built rooms visually aligned with the shared polish pass.
423. Facility Tasks root/detail form cards, schedule-linked inputs, create/complete/proof/approval/source actions, task rows, and feedback now consume the shared 8px card radius token while preserving source/status pills, keeping the facility action layer visually aligned with the shared task/calendar polish.
424. Facility Profile workspace identity cards, workspace/account actions, and logout control now consume the shared 8px card radius token while preserving the Facility palette, keeping account identity and support setup visually aligned with the shared polish pass.
425. Facility AI Tools linked ToolRun/recipe context panel and tool-entry cards now consume the shared 8px card radius token, keeping AI-over-tools entry points visually aligned with the shared facility polish.
426. Facility Inventory root/create/detail summary panels, empty states, list rows, create inputs, adjustment inputs, and inventory actions now consume the shared 8px card radius token while preserving stock-status pills, keeping operational inventory visually aligned with the shared facility polish.
427. Facility SOP Runs list/detail/start/presets/compare screens now use the shared 8px card radius token for summary panels, alert cards, run cards, checklist steps, inputs, and SOP actions while preserving status pills, keeping SOP execution visually aligned with the facility task layer.
428. Facility Audit Logs and Compliance report/AI detail cards now consume the shared 8px card radius token, keeping audit-trail and compliance drilldowns visually aligned with Facility-style records.
429. Facility Team invite card, email input, invite action, and member rows now consume the shared 8px card radius token, keeping facility role and staff-management setup aligned with the shared visual polish.
430. Facility Select onboarding rows plus create/request/switch/support/logout actions now consume the shared 8px card radius token, keeping the first facility workspace choice aligned with the shared Facility visual treatment.
431. Facility AI Ask, AI Templates, and AI Validation Lab headers, preset/tool cards, inputs, choices, actions, result panels, readiness/evidence cards, and response envelopes now consume the shared 8px card radius token, keeping AI-over-tools workflows aligned with the shared Facility visual system.
432. Facility Compliance root tiles, cards, create/resolve/approve/reject actions, SOP/deviation inputs, and feedback panel now consume the shared 8px card radius token, keeping compliance operations aligned with audit detail polish.
433. Facility cultivation record surfaces for grows, logs, and plants now use the shared 8px card radius token on list rows, detail cards, plant summaries, forms, feedback, and create actions while preserving room/batch/status pills.
434. Facility Reports export actions, readiness panels, secondary actions, report cards, and metric tiles now consume the shared 8px card radius token, completing the non-pill Facility tab radius pass.
435. Public storefront discovery, storefront home, product detail, and course detail inputs, feedback panels, product/spec cards, profile panels, CTAs, linked rows, and line panels now consume the shared 8px card radius token while preserving storefront/course status pills.
436. Feed / Campaigns promotional composer, destination link boxes, creative previews, filters, campaign cards, feed images, CTAs, and secondary actions now consume the shared 8px card radius token while preserving campaign chips/link metadata pills and keeping Feed visually distinct from Forum.
437. Forum Directory feedback, summary cards, search input, metadata labels, and join actions now consume the shared visual radius treatment while preserving discussion-group pills, keeping Forum/Q&A visually polished without turning it into Feed advertising.
438. Account Mode Switcher identity panel, workspace selector, segment buttons, workspace cards, and boundary note now consume the shared 8px card radius token while preserving status badges as pills, keeping Personal, Commercial, and Facility mode choice visually aligned.
439. Account Profile status rows, sign-in email inputs, plan facts, workspace actions, privacy export controls, and danger actions now consume the shared 8px card radius token, keeping live support/account-management surfaces visually aligned with Facility polish.
440. Login, Register, Forgot Password, Reset Password, and Verify Email panels, media frames, inputs, verification notices, CTAs, and account-choice controls now consume shared radius tokens while preserving radio/pill semantics, extending Facility-style polish to every auth entry point.
441. Shared SchedulePicker clear action and schedule inputs now consume the shared 8px card radius token while preserving quick-date, reminder, recurrence, lights-cycle, and all-day chips as pills across task/calendar workflows.
442. Public Brand Profile feedback and Store/Profile/Campaign/Forum action controls now consume the shared 8px card radius token while preserving trial/status pills, keeping storefront-facing brand discovery aligned with the public storefront polish.
443. Onboarding walkthroughs, forum-group selection, facility creation, invite joining, and facility picking now consume shared radius tokens for panels, cards, inputs, and actions while preserving grow-interest chips as pills across Personal, Commercial, and Facility setup paths.
444. Public Offers plan billing selector, feedback panel, and checkout CTAs now consume the shared 8px card radius token while leaving the shared Pro, Commercial, and Facility pricing constants untouched.
445. Shared Feed banners, ad images, education cards, operational feed cards, commercial campaign cards, and feed filter/status chips now consume shared radius tokens, keeping promotional outreach cards visually consistent and distinct from Forum/Q&A discussion surfaces.
446. Shared primitives for AppCard, InlineError, BackButton, ErrorState, ErrorBoundary, and rectangular SkeletonLoader placeholders now consume the shared 8px card radius token, carrying the Facility-style visual treatment into common app infrastructure.
447. Room setup, grow-start, plant assignment, and plant action cards now consume the shared 8px card radius token, applying the Facility-style polish to the setup path that creates rooms, batches, plants, tasks, logs, and AI context.
448. Root bootstrap recovery actions and the legacy facility selection surface now consume shared radius tokens for buttons, cards, feedback panels, and status badges, keeping app entry and facility selection aligned with the shared visual system.
449. AI result cards and AI context selectors now consume the shared 8px card radius token, keeping evidence, grow/room/photo context, notes, and persisted ToolRun-style outputs visually aligned across user modes.
450. Permission inspector, locked entitlement screens, and route access guard actions now consume the shared 8px card radius token, keeping mode/plan guardrails visually aligned while preserving support and dashboard recovery paths.
451. Grow interest picker/editor containers, save actions, badges, and interest chips now consume shared radius tokens, preserving pill semantics while keeping discovery, targeting, recommendations, and course/product/feed tagging visually aligned.
452. Legacy task rows, task completion modal, task creation inputs, entitlement warning, and create-task actions now consume the shared 8px card radius token, keeping older task entry points aligned with the shared action-layer polish.
453. Shared context bar actions, automation rows, and legacy screen scaffold sections/cards/debug panels now consume shared radius tokens while preserving badge/pill semantics across older commercial and facility surfaces.
454. Legacy lesson add/edit inputs, upload actions, thumbnails, locked-authoring panels, and save controls now consume the shared 8px card radius token, keeping course authoring aligned with storefront/course workflow polish.
455. Legacy course browse/detail locked cards, search/invite inputs, feedback panels, detail cards, and checkout/enrollment/report actions now consume the shared 8px card radius token, keeping course discovery and course-detail workflows visually aligned.
456. Legacy personal plant creation inputs, media upload controls, photo thumbnails, and grow-medium selection chips now consume shared radius tokens, keeping the personal grow setup path visually aligned while preserving chip semantics.
457. Legacy personal environment, VPD, and schedule calculator inputs, action buttons, result cards, and recommendation cards now consume the shared 8px card radius token while preserving existing tool-calculation and ToolUsage save behavior.
458. Legacy commercial dashboard, orders, and inventory buttons/cards/inputs/errors now consume the shared 8px card radius token, keeping older commercial storefront, order, and stock surfaces aligned with the newer workspace polish.
459. Legacy facility VPD, EC recommendation, and compliance log inputs/actions/cards now consume shared radius tokens while preserving compliance type pills and existing AI/compliance submission behavior.
460. Forum follow controls, filters, report modal, new-post composer cards/media controls, post media, tags, and comment input now consume shared radius tokens while preserving forum tag/filter pill semantics and keeping discussion visually distinct from Feed ads.
461. Legacy diagnosis, diagnosis history, and diagnosis result inputs, result panels, media previews, action controls, feedback cards, and tag chips now consume shared radius tokens while preserving diagnostic and feedback persistence behavior.
462. Shared inventory rows, room cards, grow/plant selectors, stage slider notches, and AI token balance widgets now consume shared radius tokens, carrying the Facility visual polish into cross-mode components used by Personal, Commercial, and Facility workflows.
463. Facility task management, team invitation/member rows, settings forms, and automation policy cards/actions now consume shared radius tokens, extending the same Facility visual appeal across operational setup, staff, SOP, and alert automation workflows.
464. Legacy Forum root discussion notice, tabs, post cards, avatars, media, identity badges, tags, and filter/create actions now consume shared radius tokens while preserving the explicit Forum/Q&A versus Feed/Campaigns separation copy.
465. Personal grow log calendar cells, selected-day panels, detail actions/photos/chips/tags, and entry form inputs/photos/tags/environment sections now consume shared radius tokens while preserving grow-log, stage-sync, and forum-share behavior.
466. Legacy feeding label scan, nutrient confirmation, feeding plan setup, and schedule result cards/actions now consume shared radius tokens while preserving entitlement gates and feeding schedule/template API flow.
467. Personal grow list search/cards, harvest estimator inputs/actions, light calculator panels/results, and legacy lesson viewer locked/video/complete controls now consume shared radius tokens while preserving grow navigation, ToolUsage save, calculator, and lesson completion behavior.
468. Legacy campaign planner, personal analytics, commercial reports, and vendor metrics forms/cards/actions now consume shared radius tokens while preserving feed/campaign planning, real analytics summaries, report routing, and vendor soil/equipment metric workflows.
469. Legacy live session list/detail cards, hero, Twitch embed frame, product/course/forum context pills, and replay/moderation CTAs now consume shared radius tokens while preserving live, replay, storefront, course, and Forum/Q&A routing.
470. Payment help dialog panels and email/close actions now consume shared radius tokens while continuing to route payment issues through the centralized live billing support alias.
471. Payments, Paywall, Subscription Status, Subscription upgrade, and Pricing Matrix cards/badges/actions now consume shared radius tokens while preserving live pricing constants, checkout handoff, backend-confirmed unlocks, and support fallback behavior.
472. Facility harvest window, Harvest AI MVP, and trichome analysis cards/inputs/photo previews/actions now consume shared radius tokens while preserving canonical harvest AI function names, photo upload, and calendar writeback behavior.
473. Facility audit logs, SOP templates, and legacy team invitation/member surfaces now consume shared radius tokens while preserving facility access checks, audit log creation, SOP CRUD, and team invite workflow behavior.
474. Legacy task modal, schedule warning/intent panels, schedule detail modal actions, and QA diagnostic sections now consume shared radius tokens while preserving task CRUD, task completion gating, and runtime diagnostic behavior.
475. Legacy personal/facility plant list and plant detail cards, search input, stage badge, chart frame, photo frames, timeline selectors, log cards, and export action now consume shared radius tokens while preserving plant navigation, chart rendering, and export behavior.
476. Legacy storefront-offer marketplace search, offer cards, category chips, feedback panels, detail actions, and checkout CTA now consume shared radius tokens while preserving storefront-offer copy, detail navigation, and purchase handoff behavior.
477. Legacy category and subcategory browser search panels, inputs, category rows, and subcategory cards now consume shared radius tokens while preserving discovery routing into inventory, tools, calendar, courses, certificates, campaigns, live sessions, and category course lists.
478. Commercial content marketplace inputs, filter chips, create-offer actions, thumbnails, badges, media upload controls, and publish CTA now consume shared radius tokens while preserving storefront-offer upload, thumbnail upload, sales data, and draft-save behavior.
479. Legacy personal nutrient calculator, pH/EC calculator, and pest/disease identifier inputs, actions, and result cards now consume shared radius tokens while preserving deterministic calculations and ToolUsage save behavior.
480. Facility AI tools home and Nutrient Tools dashboard cards, stat boxes, select-grow action, tool tiles, and badges now consume shared radius tokens while preserving AI feature matrix routing and nutrient tool navigation.
481. Legacy profile, global search, and profile certificate cards, inputs, locked notices, earned badges, and certificate actions now consume shared radius tokens while preserving auth mode display, entitlement-gated search, and certificate navigation behavior.

## Working Rule For Codex

When in doubt, do the smallest connected slice that makes the app less confusing and more real. Do not create isolated new screens that add another disconnected workflow.
