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
      "tests/unit/CommercialFeedRoute.test.tsx",
      "tests/unit/commercial-feed-api.test.ts",
      "tests/unit/CommercialLivesRoute.test.tsx",
      "tests/unit/StorefrontRoute.test.tsx",
      "tests/unit/PublicCommercialRoutes.test.tsx",
      "tests/unit/NpkToolScreen.test.tsx",
      "tests/unit/SoilBuilderToolScreen.test.tsx",
      "tests/unit/DryAmendmentMixToolScreen.test.tsx",
      "tests/unit/TopdressToolScreen.test.tsx",
      "tests/unit/SoilNutrientBatchToolScreen.test.tsx",
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
      "tests/unit/FacilityTasksRoute.test.tsx",
      "tests/unit/FacilityTaskDetailRoute.test.tsx",
      "tests/unit/FacilityRoomsRoute.test.tsx",
      "src/config/__tests__/featureStatus.test.ts",
      "tests/unit/SchedulePicker.test.tsx",
      "tests/unit/AppPageBackBehavior.test.tsx",
      "tests/unit/ScreenBoundaryBackBehavior.test.tsx",
      "tests/unit/pricingConstants.test.js",
      "tests/unit/SubscribeScreenPricing.test.js",
      "tests/unit/SubscriptionScreenPricing.test.js",
      "tests/unit/CommercialFeedCard.test.tsx",
      "tests/unit/PersonalFeedPlacement.test.tsx",
      "tests/unit/ForumFeedSeparationRoutes.test.tsx",
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
      "backend/routes/tools.test.js"
    ]
  }
];

const manualChecks = [
  {
    area: "Mode separation",
    checks: [
      "Switch Personal, Commercial, and Facility identities and confirm each dashboard names the current mode.",
      "Confirm commercial pages do not create personal grows and facility pages create rooms/runs/tasks instead of storefront products."
    ]
  },
  {
    area: "Feed versus Forum",
    checks: [
      "Confirm Feed cards read as commercial/facility outreach with CTA buttons, not discussion threads.",
      "Confirm Forum pages still present discussion/Q&A/thread behavior and can link to product/course/live context.",
      "Create a commercial feed campaign with grow interests, schedule start/end, reminder, recurrence, product/live/course/storefront destination, and Forum/Q&A link; confirm those fields show on the campaign card and Schedule page.",
      "On a free account, confirm top and bottom feed placements render, and long pages include one middle placement."
    ]
  },
  {
    area: "Storefront and commercial readiness",
    checks: [
      "Open Commercial > Storefront and verify Storefront is a top-level destination with View as User and setup status.",
      "From Commercial > Storefront, verify product, course, live, campaign, and Q&A cards link back to their owner workspaces.",
      "Open the public brand profile, public storefront, and public product detail and confirm product/course/campaign grow interests display and still route to Store, Feed Campaigns, and Forum/Q&A correctly.",
      "Open Commercial > Orders from the commercial tab/dashboard and verify it stays inside /home/commercial/orders with no root-page back arrow.",
      "Open Commercial > Products and verify product cards feed the public storefront and batches/trials/inventory are product support surfaces.",
      "Open Commercial > Courses and a course detail; verify thumbnail, banner, category, grow interests, setup warnings, and paid Stripe readiness before publish.",
      "Create storefront, product, course, live, and feed setup tasks and verify task detail shows source links, related object IDs, grow interests, schedule fields, and reminder context.",
      "Open Commercial > Lives; verify Twitch channel/embed/EventSub warnings and reminder-plan language."
    ]
  },
  {
    area: "Tools to work",
    checks: [
      "Run NPK / Feed Recipe Builder with label N-P2O5-K2O values and verify elemental P/K, density assumptions, release timing, the AI recipe brief, ToolRun tasks, and product draft conversion.",
      "Create an Ingredient Library entry and verify supplier, cost, release window, document URL, label photo URL, application notes, and micronutrient notes remain visible after reload.",
      "Run Soil Builder, Dry Amendment Mix Builder, Topdress Planner, and Soil & Nutrient Batch Planner and verify AI recipe/plan briefs, release timing, task plans, and product-draft/commercial/facility handoff language where available.",
      "Run IPM Scout and verify GrowPath AI and GPT verification are shown and saved together."
    ]
  },
  {
    area: "Sensor import onboarding",
    checks: [
      "In Personal integrations, verify Growlink import preview creates detected rooms/devices/normalized streams before creating the source.",
      "In Facility rooms/import, verify detected devices create room mappings with sensorStreams preserved for dashboards/tools/AI.",
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
