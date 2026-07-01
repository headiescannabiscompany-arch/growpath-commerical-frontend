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
  "docs/store-screenshot-capture-runbook.md",
  "store-assets/graphics/app-store-icon-1024.png",
  "store-assets/graphics/google-play-icon-512.png",
  "store-assets/graphics/google-play-feature-graphic-1024x500.png"
];

const evidenceRequirements = [
  {
    name: "strict preflight evidence",
    dir: "tmp/spec/strict-preflight",
    requiredStatus: "passed",
    validate: (body) => Boolean(body.checkedAt && body.command)
  },
  {
    name: "live URL verification",
    dir: "tmp/spec/live-url-checks",
    requiredStatus: "passed",
    validate: (body) => {
      const names = new Set((body.results || []).map((result) => result.name));
      return [
        "privacy",
        "terms",
        "support",
        "delete-account",
        "api-health",
        "api-ready",
        "api-health-api"
      ].every((name) => names.has(name));
    }
  },
  {
    name: "Sentry native crash verification",
    dir: "tmp/spec/monitoring-validation",
    requiredStatus: "passed",
    validate: hasValues([
      "GROWPATH_SENTRY_EVENT_URL",
      "GROWPATH_MONITORING_BUILD",
      "GROWPATH_CRASH_OWNER",
      "GROWPATH_TRIAGE_SLA"
    ])
  },
  {
    name: "disposable-account export/delete verification",
    dir: "tmp/spec/data-rights-live",
    requiredStatus: "passed",
    validate: (body) =>
      Boolean(
        body.loginStatus &&
          body.exportStatus &&
          body.deleteStatus &&
          body.postDeleteLoginStatus &&
          Array.isArray(body.exportTopLevelKeys)
      )
  },
  {
    name: "production iOS/Android build evidence",
    dir: "tmp/spec/release-builds",
    requiredStatus: "passed",
    validate: (body) => {
      const platforms = new Set(body.platforms || []);
      const results = Array.isArray(body.results) ? body.results : [];
      return (
        platforms.has("ios") &&
        platforms.has("android") &&
        results.some((result) => result.platform === "ios" && result.status === 0) &&
        results.some((result) => result.platform === "android" && result.status === 0)
      );
    }
  },
  {
    name: "physical-device smoke evidence",
    dir: "tmp/spec/release-device-smoke",
    requiredStatus: "passed",
    validate: hasValues([
      "GROWPATH_SMOKE_TESTER",
      "GROWPATH_IOS_DEVICE",
      "GROWPATH_ANDROID_DEVICE",
      "GROWPATH_IOS_BUILD",
      "GROWPATH_ANDROID_BUILD",
      "GROWPATH_SMOKE_RESULT"
    ])
  },
  {
    name: "store screenshots evidence",
    dir: "tmp/spec/store-screenshots",
    requiredStatus: "passed",
    validate: hasValues([
      "GROWPATH_SCREENSHOT_IOS_67",
      "GROWPATH_SCREENSHOT_IOS_65",
      "GROWPATH_SCREENSHOT_IPAD_129",
      "GROWPATH_SCREENSHOT_ANDROID_PHONE",
      "GROWPATH_SCREENSHOT_ANDROID_TABLET"
    ])
  },
  {
    name: "store-console submission form evidence",
    dir: "tmp/spec/store-submission",
    requiredStatus: "passed",
    validate: hasValues([
      "GROWPATH_IOS_APP_RECORD_CONFIRMED",
      "GROWPATH_ANDROID_APP_RECORD_CONFIRMED",
      "GROWPATH_IOS_PRIVACY_NUTRITION_COMPLETED",
      "GROWPATH_GOOGLE_DATA_SAFETY_COMPLETED",
      "GROWPATH_STORE_PRICING_CONFIRMED",
      "GROWPATH_REVIEW_NOTES_CONFIRMED"
    ])
  },
  {
    name: "legal release sign-off",
    dir: "tmp/spec/legal-release-signoff",
    requiredStatus: "approved",
    validate: hasValues([
      "GROWPATH_LEGAL_APPROVER",
      "GROWPATH_RELEASE_OWNER",
      "GROWPATH_APPROVED_LISTING_VERSION",
      "GROWPATH_APPROVED_PRIVACY_VERSION",
      "GROWPATH_AGE_RATING_DECISION",
      "GROWPATH_JURISDICTION_NOTES"
    ])
  },
  {
    name: "named release/support/QA/crash owners",
    dir: "tmp/spec/release-owners",
    requiredStatus: "approved",
    validate: hasValues([
      "GROWPATH_RELEASE_OWNER",
      "GROWPATH_QA_OWNER",
      "GROWPATH_SUPPORT_OWNER",
      "GROWPATH_CRASH_OWNER",
      "GROWPATH_RELEASE_MONITORING_OWNER",
      "GROWPATH_TRIAGE_SLA"
    ])
  },
  {
    name: "hotfix and rollback plan sign-off",
    dir: "tmp/spec/hotfix-rollback",
    requiredStatus: "approved",
    validate: hasValues([
      "GROWPATH_HOTFIX_OWNER",
      "GROWPATH_ROLLBACK_OWNER",
      "GROWPATH_HOTFIX_BRANCH",
      "GROWPATH_ROLLBACK_PLAN",
      "GROWPATH_SUPPORT_ESCALATION"
    ])
  }
];

function hasValues(names) {
  return (body) => {
    const values = body?.values || {};
    return names.every((name) => String(values[name] || "").trim());
  };
}

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
      if (
        body?.status === requirement.requiredStatus &&
        (!requirement.validate || requirement.validate(body))
      ) {
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
