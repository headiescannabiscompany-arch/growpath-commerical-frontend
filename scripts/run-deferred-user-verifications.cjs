#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";
const npxCmd = isWindows ? "npx.cmd" : "npx";
const shellCmd = process.env.ComSpec || "cmd.exe";
const planOnly = process.argv.includes("--plan");

const checks = [
  {
    label: "Delivery scan",
    command: npmCmd,
    args: ["run", "verify:delivery"]
  },
  {
    label: "Connected workflow verifier",
    command: npmCmd,
    args: ["run", "verify:connected-workflows"]
  },
  {
    label: "GrowPath connected system audit",
    command: npmCmd,
    args: ["run", "audit:growpath-system"]
  },
  {
    label: "Recent autonomous workflow slices",
    command: npmCmd,
    args: [
      "test",
      "--",
      "--runTestsByPath",
      "tests/navigation/commercialStack.test.js",
      "tests/navigation/commercialTabs.test.js",
      "tests/navigation/commercialPageRegistry.test.js",
      "tests/navigation/feedForumSeparationNavigation.test.js",
      "tests/navigation/routeAccess.test.ts",
      "tests/unit/CommercialWorkflowPages.test.tsx",
      "tests/unit/CommercialInventoryCreateRoute.test.tsx",
      "tests/unit/CommercialFeedRoute.test.tsx",
      "tests/unit/CommercialBanner.test.js",
      "tests/unit/FacilityFeedRoute.test.tsx",
      "tests/unit/commercial-feed-api.test.ts",
      "tests/unit/CommercialLivesRoute.test.tsx",
      "tests/LiveSessionScreen.qa.test.js",
      "tests/unit/StorefrontRoute.test.tsx",
      "tests/unit/PublicCommercialRoutes.test.tsx",
      "tests/unit/NpkToolScreen.test.tsx",
      "tests/unit/SoilBuilderToolScreen.test.tsx",
      "tests/unit/DryAmendmentMixToolScreen.test.tsx",
      "tests/unit/TopdressToolScreen.test.tsx",
      "tests/unit/SoilNutrientBatchToolScreen.test.tsx",
      "tests/unit/FeedingConfirmScreen.test.js",
      "tests/unit/IpmScoutToolScreen.test.tsx",
      "tests/unit/HomeScheduleRoute.test.tsx",
      "tests/unit/AlertCenterRoute.test.tsx",
      "tests/unit/NotificationCenterRoute.test.tsx",
      "tests/unit/sourceLinks.test.ts",
      "tests/unit/PersonalTaskCenterRoute.test.tsx",
      "tests/unit/GrowTasksScreen.test.tsx",
      "tests/unit/GrowOverviewScreen.test.tsx",
      "tests/unit/GrowTimelineScreen.test.tsx",
      "tests/unit/CommercialTasksRoute.test.tsx",
      "tests/unit/CommercialTaskDetailRoute.test.tsx",
      "tests/unit/CommercialAlertDetailRoute.test.tsx",
      "tests/unit/CommercialLogDetailRoute.test.tsx",
      "tests/unit/CommercialProfileScreen.test.tsx",
      "tests/unit/FacilityTasksRoute.test.tsx",
      "tests/unit/FacilityTaskDetailRoute.test.tsx",
      "tests/unit/FacilityRoomsRoute.test.tsx",
      "tests/unit/FacilityInventoryRoute.test.tsx",
      "tests/unit/FacilityInventoryCreateRoute.test.tsx",
      "tests/unit/FacilityInventoryItemDetailRoute.test.tsx",
      "tests/unit/integrations_growlink.test.tsx",
      "src/config/__tests__/featureStatus.test.ts",
      "tests/unit/SchedulePicker.test.tsx",
      "tests/unit/AppPageBackBehavior.test.tsx",
      "tests/unit/ScreenBoundaryBackBehavior.test.tsx",
      "tests/unit/AccountModeSwitcher.test.tsx",
      "tests/unit/switchAccountMode.test.ts",
      "tests/unit/PersonalHomeRoute.test.tsx",
      "tests/unit/ProfilePrivacyControls.test.tsx",
      "tests/unit/CommercialProfileRoute.test.tsx",
      "tests/unit/FacilityProfileRoute.test.tsx",
      "tests/unit/aiFeatureMatrix.test.ts",
      "tests/unit/ai-call-normalize.test.ts",
      "tests/unit/pricingConstants.test.js",
      "tests/unit/SubscribeScreenPricing.test.js",
      "tests/unit/SubscriptionScreenPricing.test.js",
      "tests/unit/SupportPage.test.tsx",
      "tests/unit/PolicyContactAliases.test.tsx",
      "tests/unit/SupportContactsConfig.test.ts",
      "tests/unit/PaymentHelpDialog.test.js",
      "tests/unit/CommercialFeedCard.test.tsx",
      "tests/unit/CommercialToolsScreen.test.tsx",
      "tests/unit/CommercialExternalChannelCopy.test.js",
      "tests/unit/ContentMarketplaceScreen.test.tsx",
      "tests/unit/MarketplaceScreenCopy.test.js",
      "tests/unit/PersonalFeedPlacement.test.tsx",
      "tests/unit/ForumFeedSeparationRoutes.test.tsx",
      "tests/unit/CreatePostRootRoute.test.tsx",
      "tests/unit/canonical-route-matrix-doc.test.js",
      "tests/unit/themeTokens.test.js",
      "tests/unit/AppIntroScreen.test.js",
      "tests/unit/GuildCodeScreenCopy.test.js",
      "tests/unit/LegalLinks.test.tsx",
      "tests/unit/LoginEmailVerification.test.tsx",
      "tests/unit/FacilitySopRunsBackRoutes.test.tsx",
      "tests/unit/ResetPasswordScreen.test.tsx",
      "tests/unit/ForgotPasswordScreen.test.tsx",
      "tests/unit/toolRuns-api.test.ts",
      "src/api/__tests__/auth.emailVerification.test.ts",
      "src/features/personal/__tests__/homeModel.test.ts",
      "src/features/personal/tools/__tests__/moduleRecordPersistence.test.ts",
      "src/features/personal/tools/__tests__/saveToolRunAndOpenJournal.test.ts"
    ]
  },
  {
    label: "Backend ingredient/tool persistence",
    command: npxCmd,
    args: [
      "jest",
      "--config",
      "jest.backend.config.cjs",
      "--runInBand",
      "backend/services/ipmGptVerification.test.js",
      "backend/routes/tools.test.js"
    ]
  }
];

const manualChecks = [
  {
    area: "Mode separation",
    checks: [
      "Switch Personal, Commercial, and Facility identities and confirm each dashboard names the current mode.",
      "Open Personal Profile, Commercial Profile & Billing, and Facility Profile and confirm each has a visible Switch Workspace action that opens /account/mode.",
      "Confirm commercial pages do not create personal grows and facility pages create rooms/runs/tasks instead of storefront products."
    ]
  },
  {
    area: "Cross-workspace visual polish",
    checks: [
      "Compare Facility, Commercial, and Personal profile/task/AI surfaces and confirm Personal and Commercial now carry the tighter Facility-style card radius, density, and operational tone without losing their own workflow purpose.",
      "Open Personal AI, Personal Profile, Commercial Tools, Commercial Profile, Commercial Task Detail, Commercial Alert Detail, and Commercial Log Detail and confirm cards/actions feel consistent, readable, and not oversized or overly rounded."
    ]
  },
  {
    area: "Support alias UI smoke check",
    checks: [
      "Owner confirmed support is live with all aliases; open Support and verify general, billing, orders, sales, commercial, courses, live, facility, partners, contact, privacy, legal, and security requests still display the routed @growpathai.com aliases.",
      "Confirm the full live alias set is represented where appropriate in config/docs: support, help, contact, hello, info, admin, billing, orders, sales, partners, privacy, legal, security, commercial, facility, courses, live, noreply, and notifications at growpathai.com.",
      "Verify sender-only aliases noreply@growpathai.com and notifications@growpathai.com remain configured for system email use but are not displayed as public support destinations.",
      "Open Privacy, Terms, and payment help surfaces and confirm they route privacy/legal/security/billing copy to the live aliases instead of placeholders."
    ]
  },
  {
    area: "Feed versus Forum",
    checks: [
      "Confirm Feed cards read as commercial/facility outreach with CTA buttons, not discussion threads.",
      "Confirm Forum pages still present discussion/Q&A/thread behavior and can link to product/course/live context.",
      "Create a commercial feed campaign with grow interests, schedule start/end, reminder, recurrence, product/live/course/storefront destination, and Forum/Q&A link; confirm those fields show on the campaign card and Schedule page.",
      "Open Feed with /feed?campaignId=:id and confirm the exact promoted outreach card is focused even when the campaign was created from a storefront, live, alert, task, notification, or schedule source.",
      "From Feed, Live Session, and Brand Forum/Q&A cards, confirm product/course CTAs preserve exact /store/:slug/products/:id and /store/:slug/courses/:id routes when the payload uses storefrontSlug, linkedStorefrontSlug, brandSlug, or publicSlug.",
      "From the root Create Post action as a selected Facility user, confirm it opens /home/facility/feed for facility outreach creation instead of the shared /feed viewer.",
      "On a free account, confirm top and bottom feed placements render, and long pages include one middle placement."
    ]
  },
  {
    area: "Storefront and commercial readiness",
    checks: [
      "Open Commercial > Storefront and verify Storefront is a top-level destination with View as User and setup status.",
      "Open active Commercial Tools/capability menu entries and confirm Storefront Offers opens Storefront and Feed / Campaigns opens the campaign builder; Marketplace compatibility screens should not appear in active navigation.",
      "From Commercial > Storefront, verify product, course, live, campaign, and Q&A cards link back to their owner workspaces.",
      "Open the public brand profile, public storefront, and public product detail and confirm product/course/campaign grow interests display and still route to Store, Feed Campaigns, and Forum/Q&A correctly.",
      "Open the public storefront and confirm Upcoming Lives render from the storefront payload and route to /live-session?sessionId=:id.",
      "Open public product detail and confirm product-linked lives render as Product Lives with Open Live actions to /live-session?sessionId=:id.",
      "Open the same public storefront and product detail through /storefront/:slug and /storefront/:slug/products/:productId and confirm they match the /store URL family.",
      "Open Commercial > Orders from the commercial tab/dashboard and verify it stays inside /home/commercial/orders with no root-page back arrow.",
      "Open Commercial > Products and verify product cards feed the public storefront and batches/trials/inventory are product support surfaces.",
      "From Commercial > Storefront quick product creation, enter Stripe product and price IDs and confirm both values save with the created product.",
      "From Commercial > Products, create a published product using Stripe product and price IDs without an external purchase URL and confirm setup readiness accepts the Stripe price.",
      "Open Commercial > Product Detail, edit Stripe product and price IDs, save, and confirm both identifiers persist before testing checkout routing.",
      "Open public product cards/details and confirm Stripe-ready products show Buy, external-only products show External Link, and products without checkout setup do not show a fake Buy CTA.",
      "Open Commercial > Inventory, create an item, and open its detail; confirm visible routes use /home/commercial/inventory/new and /home/commercial/inventory/:id while legacy inventory-create/inventory-item URLs are only compatibility aliases.",
      "Open Commercial > Storefront and verify Product Lines appear as storefront sections with grow interests, owner detail links, and View-as-User line-filter links.",
      "Open a public brand profile and public storefront and confirm Product Lines appear with grow interests and Browse Line actions.",
      "Open a Product Line Browse Line link and confirm /store/:slug?line=:lineId filters product cards and offers View All Products.",
      "Open Commercial > Product Trials and verify private evidence-run list, create, and detail actions use /home/commercial/evidence-runs, /home/commercial/evidence-runs/new, and /home/commercial/evidence-runs/:id instead of exposing a commercial grow workspace.",
      "From Commercial tasks, Schedule, Alerts, and Notifications, open a product-batch source that also has a product id and confirm it opens /home/commercial/products/:productId?batchId=:batchId, shows focused product-batch context in Linked Evidence, and offers an Open Focused Batch action instead of treating the batch as a separate app.",
      "Open Commercial > Courses and a course detail; verify thumbnail, banner, category, grow interests, setup warnings, and paid Stripe readiness before publish.",
      "Open /store/:slug/courses/:courseId and /storefront/:slug/courses/:courseId and confirm the public course detail shows price, grow interests, related products, related lives, Feed campaign CTAs, Forum/Q&A links, and paid checkout routing.",
      "Create storefront, product, course, live, and feed setup tasks and verify task detail shows source links, related object IDs, grow interests, schedule fields, and reminder context.",
      "Open Commercial > Lives; verify Twitch channel/embed/EventSub warnings and reminder-plan language.",
      "Open a public live from a Feed campaign, task, schedule item, notification, or alert and confirm it opens /live-session?sessionId=:id with Twitch embed, replay, and clickable linked product/course/Forum Q&A actions."
    ]
  },
  {
    area: "Tools to work",
    checks: [
      "Run NPK / Feed Recipe Builder with label N-P2O5-K2O values and verify elemental P/K, density assumptions, release timing, the AI recipe brief, ToolRun tasks, and product draft conversion.",
      "Create an Ingredient Library entry and verify supplier, cost, release window, document URL, label photo URL, application notes, and micronutrient notes remain visible after reload.",
      "Run Soil Builder, Dry Amendment Mix Builder, Topdress Planner, and Soil & Nutrient Batch Planner and verify label N-P2O5-K2O wording, AI recipe/plan briefs, release timing, task plans, and product-draft/commercial/facility handoff language where available.",
      "Create a commercial soil/nutrient/amendment product and verify the form labels product analysis as label N-P2O5-K2O while preserving product specs for storefront display.",
      "Use the legacy feeding label-scan confirmation and verify scanned fertilizer values are displayed as label N-P2O5-K2O before scheduling.",
      "Run IPM Scout and verify GrowPath AI and GPT verification are shown and saved together."
    ]
  },
  {
    area: "Sensor import onboarding",
    checks: [
      "In Personal integrations, verify Growlink import preview creates detected rooms/devices/normalized streams before creating the source.",
      "Confirm Personal Growlink source saves suggested grow spaces with read-only devices, normalized metrics, and sensor streams for later tent/room setup.",
      "In Facility rooms/import, verify detected devices create room mappings with sensorStreams preserved for dashboards/tools/AI.",
      "Confirm Facility room import stores suggested alert/task rules for imported alarm metrics without exposing write/control actions.",
      "Confirm read-only sync language is visible and no write/control action is exposed."
    ]
  },
  {
    area: "Tasks and schedule",
    checks: [
      "Create a manual task from Task Center using the shared schedule picker quick dates: This evening, In 3 days, In 21 days, and Next week.",
      "Schedule a commercial live and a feed campaign with the shared SchedulePicker and confirm start/end, reminders, and recurrence appear in /home/schedule.",
      "Confirm the same SchedulePicker behavior is available from Personal, Commercial, Facility, and Alert Center task/snooze flows.",
      "Create tasks from a ToolRun and confirm they link back to the grow/tool result.",
      "Convert an alert to a task and confirm the source link remains visible."
    ]
  },
  {
    area: "Source routing",
    checks: [
      "From Schedule, Alert Center, Notification Center, and task detail, confirm Open Source actions route product launches, product trials, inventory, orders, feed campaigns, lesson/course releases, live reminders, alert snoozes, facility SOPs, and grow milestones to the correct workspace.",
      "Confirm Commercial dashboard action-item tasks preserve source ids for inventory, product trials, orders, feed campaigns, and alerts."
    ]
  }
];

function commandLine(check) {
  return [check.command, ...check.args].join(" ");
}

function run(check) {
  console.log(`\n[deferred-user-verifications] ${check.label}`);
  if (!isWindows) {
    return spawnSync(check.command, check.args, {
      cwd: root,
      stdio: "inherit",
      shell: false
    });
  }

  return spawnSync(shellCmd, ["/d", "/c", commandLine(check)], {
    cwd: root,
    stdio: "inherit",
    shell: false
  });
}

function renderChecklist() {
  const lines = [
    "# Deferred User Verification Checklist",
    "",
    "Run this after autonomous implementation slices to batch the user/browser checks that were intentionally deferred.",
    "",
    "## Automated Commands",
    "",
    ...checks.map((check) => `- ${commandLine(check)}`),
    "",
    "## Human / Browser Checks",
    ""
  ];

  manualChecks.forEach((section) => {
    lines.push(`### ${section.area}`, "");
    section.checks.forEach((check) => lines.push(`- [ ] ${check}`));
    lines.push("");
  });

  lines.push(
    "## Notes",
    "",
    "- Facility visual quality should be applied across Personal/Pro and Commercial UI, not kept only in Facility.",
    "- Owner confirmed support is live with all aliases; keep future checks focused on UI routing, the complete alias set, and sender-only visibility.",
    "- Known non-blocking current test noise: some facility and NPK tests may emit React act(...) warnings while still passing.",
    ""
  );

  return lines.join("\n");
}

const checklist = renderChecklist();
const outDir = path.join(root, "tmp");
const outFile = path.join(outDir, "deferred-user-verification-checklist.md");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, checklist);
console.log(`[deferred-user-verifications] wrote ${path.relative(root, outFile)}`);

if (planOnly) {
  console.log(checklist);
  process.exit(0);
}

for (const check of checks) {
  const result = run(check);
  if (result.error) console.error(result.error);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("\n[deferred-user-verifications] automated checks passed");
console.log(
  `[deferred-user-verifications] manual checklist: ${path.relative(root, outFile)}`
);
