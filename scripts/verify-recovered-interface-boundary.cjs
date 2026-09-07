"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const BASE_SHA = String(
  process.env.GROWPATH_INTERFACE_BASE_SHA ||
    "302f5029ff824eee9ebf1627e249b25b6107fe29"
).trim();
const REJECTED_REDESIGN_SHA = "df50bf581bedf22c9cea0095d1d9d23ac7f68281";
const EXACT_REVERT_SHA = "5958ca6bc7d22abc73569db38ec7b104c7ae1b14";
const ROOT = path.resolve(__dirname, "..");

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
  ["src/app/marketplace.tsx", 30],
  ["src/app/store/[slug].tsx", 120],
  ["src/app/store/[slug]/products/[productId].tsx", 120],
  ["src/screens/MarketplaceScreen.js", 120],
  ["src/screens/LiveSessionScreen.js", 80],
  ["src/screens/AdminPayoutsScreen.js", 260],
  ["src/screens/CreatorPayoutScreen.js", 260],
  ["src/screens/EarningsScreen.js", 260]
]);

function git(args, { allowFailure = false, cwd = ROOT } = {}) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
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

function assertCompleteHistory({ cwd = ROOT } = {}) {
  const result = git(["rev-parse", "--is-shallow-repository"], { cwd });
  if (String(result.stdout || "").trim() !== "false") {
    throw new Error(
      "Recovered interface ancestry requires complete Git history. Fetch the full history before running this guard."
    );
  }
}

function changedPaths({ baseSha = BASE_SHA, cwd = ROOT } = {}) {
  const tracked = git(["diff", "--name-only", baseSha, "--"], { cwd }).stdout;
  const untracked = git(["ls-files", "--others", "--exclude-standard"], {
    cwd
  }).stdout;
  return [
    ...new Set(
      `${tracked}\n${untracked}`
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ];
}

function changedLineCounts({ baseSha = BASE_SHA, cwd = ROOT } = {}) {
  const counts = new Map();
  const output = git(["diff", "--numstat", baseSha, "--"], { cwd }).stdout;
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

function ancestorStatus(commitSha, { cwd = ROOT } = {}) {
  const result = git(["merge-base", "--is-ancestor", commitSha, "HEAD"], {
    allowFailure: true,
    cwd
  });
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new Error(
    `${String(result.stderr || "Unable to check interface ancestry.").trim()} ` +
      "Fetch the complete Git history before running this guard."
  );
}

function verifyRedesignAncestry({
  cwd = ROOT,
  rejectedRedesignSha = REJECTED_REDESIGN_SHA,
  exactRevertSha = EXACT_REVERT_SHA
} = {}) {
  if (!ancestorStatus(rejectedRedesignSha, { cwd })) return;

  if (!ancestorStatus(exactRevertSha, { cwd })) {
    throw new Error(
      `Rejected redesign commit ${rejectedRedesignSha} is in this branch's ancestry ` +
        `without its reviewed exact revert ${exactRevertSha}.`
    );
  }
}

function main({
  baseSha = BASE_SHA,
  cwd = ROOT,
  rejectedRedesignSha = REJECTED_REDESIGN_SHA,
  exactRevertSha = EXACT_REVERT_SHA
} = {}) {
  assertCompleteHistory({ cwd });
  git(["cat-file", "-e", `${baseSha}^{commit}`], { cwd });
  verifyRedesignAncestry({ cwd, rejectedRedesignSha, exactRevertSha });

  const paths = changedPaths({ baseSha, cwd });
  const protectedChanges = paths.filter(protectedPath);
  if (protectedChanges.length) {
    throw new Error(
      `Recovered-interface boundary violation:\n${protectedChanges
        .map((path) => `- ${path}`)
        .join("\n")}`
    );
  }

  const counts = changedLineCounts({ baseSha, cwd });
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
    `Recovered interface boundary PASS: ${paths.length} changed paths; global shell, layout, navigation, and theme remain untouched from ${baseSha}.\n`
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`Recovered interface boundary FAIL: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { assertCompleteHistory, main, verifyRedesignAncestry };
