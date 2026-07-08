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

## Working Rule For Codex

When in doubt, do the smallest connected slice that makes the app less confusing and more real. Do not create isolated new screens that add another disconnected workflow.
