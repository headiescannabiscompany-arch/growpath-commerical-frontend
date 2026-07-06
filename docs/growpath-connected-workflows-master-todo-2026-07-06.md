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

## Working Rule For Codex

When in doubt, do the smallest connected slice that makes the app less confusing and more real. Do not create isolated new screens that add another disconnected workflow.
