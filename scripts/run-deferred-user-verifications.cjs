#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";
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
      "On a free account, confirm top and bottom feed placements render, and long pages include one middle placement."
    ]
  },
  {
    area: "Storefront and commercial readiness",
    checks: [
      "Open Commercial > Storefront and verify Storefront is a top-level destination with View as User and setup status.",
      "Open Commercial > Products and verify product cards feed the public storefront and batches/trials/inventory are product support surfaces.",
      "Open Commercial > Courses and a course detail; verify setup warnings and paid Stripe readiness before publish.",
      "Open Commercial > Lives; verify Twitch channel/embed/EventSub warnings and reminder-plan language."
    ]
  },
  {
    area: "Tools to work",
    checks: [
      "Run NPK / Feed Recipe Builder with label N-P2O5-K2O values and verify elemental P/K, density assumptions, release timing, ToolRun tasks, and product draft conversion.",
      "Run Soil Builder and Dry Amendment Mix Builder and verify release charts, recipe timeline tasks, and product-draft conversion.",
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
      "Create a manual task from Task Center using the shared schedule picker quick dates, reminders, and recurrence.",
      "Create tasks from a ToolRun and confirm they link back to the grow/tool result.",
      "Convert an alert to a task and confirm the source link remains visible."
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
    "- Known non-blocking current test noise: some facility tests may emit React act(...) warnings while still passing.",
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
console.log(`[deferred-user-verifications] manual checklist: ${path.relative(root, outFile)}`);
