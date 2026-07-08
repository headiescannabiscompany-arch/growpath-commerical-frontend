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

## Working Rule For Codex

When in doubt, do the smallest connected slice that makes the app less confusing and more real. Do not create isolated new screens that add another disconnected workflow.
