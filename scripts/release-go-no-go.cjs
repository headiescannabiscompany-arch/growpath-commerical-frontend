#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const trackedRequired = [
  "APP_STORE_CHECKLIST.md",
  "APP_STORE_LISTING.md",
  "docs/release-readiness-evidence-2026-07-01.md",
  "docs/store-privacy-data-safety-2026-07-01.md",
  "docs/store-assets-evidence-2026-07-01.md",
  "docs/live-url-verification.md",
  "docs/monitoring-verification.md",
  "docs/data-rights-live-verification.md",
  "docs/production-build-device-smoke-runbook.md",
  "docs/release-go-no-go-gate.md",
  "store-assets/graphics/app-store-icon-1024.png",
  "store-assets/graphics/google-play-icon-512.png",
  "store-assets/graphics/google-play-feature-graphic-1024x500.png"
];

const evidenceRequirements = [
  {
    name: "strict preflight evidence",
    dir: "tmp/spec/strict-preflight",
    requiredStatus: "passed"
  },
  {
    name: "live URL verification",
    dir: "tmp/spec/live-url-checks",
    requiredStatus: "passed"
  },
  {
    name: "Sentry native crash verification",
    dir: "tmp/spec/monitoring-validation",
    requiredStatus: "passed"
  },
  {
    name: "disposable-account export/delete verification",
    dir: "tmp/spec/data-rights-live",
    requiredStatus: "passed"
  },
  {
    name: "production iOS/Android build evidence",
    dir: "tmp/spec/release-builds",
    requiredStatus: "passed"
  },
  {
    name: "physical-device smoke evidence",
    dir: "tmp/spec/release-device-smoke",
    requiredStatus: "passed"
  },
  {
    name: "store screenshots evidence",
    dir: "tmp/spec/store-screenshots",
    requiredStatus: "passed"
  },
  {
    name: "store-console submission form evidence",
    dir: "tmp/spec/store-submission",
    requiredStatus: "passed"
  },
  {
    name: "legal release sign-off",
    dir: "tmp/spec/legal-release-signoff",
    requiredStatus: "approved"
  },
  {
    name: "named release/support/QA/crash owners",
    dir: "tmp/spec/release-owners",
    requiredStatus: "approved"
  },
  {
    name: "hotfix and rollback plan sign-off",
    dir: "tmp/spec/hotfix-rollback",
    requiredStatus: "approved"
  }
];

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function jsonFiles(relDir) {
  const absolute = path.join(ROOT, relDir);
  if (!fs.existsSync(absolute)) return [];
  return fs
    .readdirSync(absolute)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(absolute, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

function latestPassingEvidence(requirement) {
  for (const file of jsonFiles(requirement.dir)) {
    try {
      const body = JSON.parse(fs.readFileSync(file, "utf8"));
      if (body?.status === requirement.requiredStatus) {
        return path.relative(ROOT, file);
      }
    } catch {
      // Ignore malformed evidence and keep looking.
    }
  }
  return null;
}

function main() {
  const blockers = [];
  const passed = [];

  for (const relPath of trackedRequired) {
    if (exists(relPath)) passed.push(`tracked artifact present: ${relPath}`);
    else blockers.push(`missing tracked artifact: ${relPath}`);
  }

  for (const requirement of evidenceRequirements) {
    const evidence = latestPassingEvidence(requirement);
    if (evidence) {
      passed.push(`${requirement.name}: ${evidence}`);
    } else {
      blockers.push(
        `${requirement.name}: missing ${requirement.requiredStatus} JSON evidence under ${requirement.dir}/`
      );
    }
  }

  console.log("Release go/no-go gate");
  for (const item of passed) {
    console.log(`PASS ${item}`);
  }

  if (blockers.length) {
    console.error("\nNO-GO blockers:");
    for (const blocker of blockers) {
      console.error(`- ${blocker}`);
    }
    process.exit(1);
  }

  console.log("\nGO: all required release evidence is present.");
}

main();
