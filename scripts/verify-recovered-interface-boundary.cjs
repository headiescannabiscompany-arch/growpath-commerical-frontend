"use strict";

const { spawnSync } = require("node:child_process");

const BASE_SHA = String(process.env.GROWPATH_INTERFACE_BASE_SHA || "302f5029").trim();
const REJECTED_REDESIGN_SHA = "df50bf58";

const PROTECTED_PATHS = [
  "app.json",
  "src/app/_layout.tsx",
  "src/app/index.tsx",
  "src/components/layout/",
  "src/components/navigation/",
  "src/theme/"
];

const PAGE_CHANGE_BUDGETS = new Map([
  ["src/app/account/billing.tsx", 80],
  ["src/app/admin/index.tsx", 100],
  ["src/app/home/commercial/profile.tsx", 80],
  ["src/app/offers/index.tsx", 160],
  ["src/app/profile/index.tsx", 80],
  ["src/screens/LiveSessionScreen.js", 80],
  ["src/screens/AdminPayoutsScreen.js", 260],
  ["src/screens/CreatorPayoutScreen.js", 260],
  ["src/screens/EarningsScreen.js", 260]
]);

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    throw new Error(
      String(result.stderr || result.stdout || "git command failed").trim()
    );
  }
  return result;
}

function protectedPath(path) {
  return PROTECTED_PATHS.some((entry) =>
    entry.endsWith("/") ? path.startsWith(entry) : path === entry
  );
}

function changedPaths() {
  const tracked = git(["diff", "--name-only", BASE_SHA, "--"]).stdout;
  const untracked = git(["ls-files", "--others", "--exclude-standard"]).stdout;
  return [
    ...new Set(
      `${tracked}\n${untracked}`
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ];
}

function changedLineCounts() {
  const counts = new Map();
  const output = git(["diff", "--numstat", BASE_SHA, "--"]).stdout;
  for (const line of output.split(/\r?\n/)) {
    const [addedRaw, deletedRaw, path] = line.split("\t");
    if (!path) continue;
    const added = Number(addedRaw);
    const deleted = Number(deletedRaw);
    counts.set(path, {
      added: Number.isFinite(added) ? added : Number.POSITIVE_INFINITY,
      deleted: Number.isFinite(deleted) ? deleted : Number.POSITIVE_INFINITY
    });
  }
  return counts;
}

function main() {
  git(["cat-file", "-e", `${BASE_SHA}^{commit}`]);
  const rejected = git(["merge-base", "--is-ancestor", REJECTED_REDESIGN_SHA, "HEAD"], {
    allowFailure: true
  });
  if (rejected.status === 0) {
    throw new Error(
      `Rejected redesign commit ${REJECTED_REDESIGN_SHA} is in this branch's ancestry.`
    );
  }
  if (rejected.status !== 1 && rejected.status !== 128) {
    throw new Error(
      String(rejected.stderr || "Unable to check redesign ancestry.").trim()
    );
  }

  const paths = changedPaths();
  const protectedChanges = paths.filter(protectedPath);
  if (protectedChanges.length) {
    throw new Error(
      `Recovered-interface boundary violation:\n${protectedChanges
        .map((path) => `- ${path}`)
        .join("\n")}`
    );
  }

  const counts = changedLineCounts();
  const oversizedPages = [];
  for (const [path, maximum] of PAGE_CHANGE_BUDGETS) {
    const count = counts.get(path);
    if (!count) continue;
    const total = count.added + count.deleted;
    if (total > maximum)
      oversizedPages.push(`${path}: ${total} changed lines > ${maximum}`);
  }
  if (oversizedPages.length) {
    throw new Error(
      `An existing owner-visible page exceeded its reviewed change budget:\n${oversizedPages
        .map((value) => `- ${value}`)
        .join("\n")}`
    );
  }

  process.stdout.write(
    `Recovered interface boundary PASS: ${paths.length} changed paths; global shell, layout, navigation, and theme remain untouched from ${BASE_SHA}.\n`
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`Recovered interface boundary FAIL: ${error.message}\n`);
  process.exitCode = 1;
}
