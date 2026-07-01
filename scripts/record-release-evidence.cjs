#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CONFIRM = "RECORD_RELEASE_EVIDENCE";

const evidenceTypes = {
  owners: {
    dir: "tmp/spec/release-owners",
    status: "approved",
    required: [
      "GROWPATH_RELEASE_OWNER",
      "GROWPATH_QA_OWNER",
      "GROWPATH_SUPPORT_OWNER",
      "GROWPATH_CRASH_OWNER",
      "GROWPATH_RELEASE_MONITORING_OWNER",
      "GROWPATH_TRIAGE_SLA"
    ]
  },
  legal: {
    dir: "tmp/spec/legal-release-signoff",
    status: "approved",
    required: [
      "GROWPATH_LEGAL_APPROVER",
      "GROWPATH_RELEASE_OWNER",
      "GROWPATH_APPROVED_LISTING_VERSION",
      "GROWPATH_APPROVED_PRIVACY_VERSION",
      "GROWPATH_AGE_RATING_DECISION",
      "GROWPATH_JURISDICTION_NOTES"
    ]
  },
  hotfix: {
    dir: "tmp/spec/hotfix-rollback",
    status: "approved",
    required: [
      "GROWPATH_HOTFIX_OWNER",
      "GROWPATH_ROLLBACK_OWNER",
      "GROWPATH_HOTFIX_BRANCH",
      "GROWPATH_ROLLBACK_PLAN",
      "GROWPATH_SUPPORT_ESCALATION"
    ]
  },
  "store-submission": {
    dir: "tmp/spec/store-submission",
    status: "passed",
    required: [
      "GROWPATH_IOS_APP_RECORD_CONFIRMED",
      "GROWPATH_ANDROID_APP_RECORD_CONFIRMED",
      "GROWPATH_IOS_PRIVACY_NUTRITION_COMPLETED",
      "GROWPATH_GOOGLE_DATA_SAFETY_COMPLETED",
      "GROWPATH_STORE_PRICING_CONFIRMED",
      "GROWPATH_REVIEW_NOTES_CONFIRMED"
    ],
    yesNo: [
      "GROWPATH_IOS_APP_RECORD_CONFIRMED",
      "GROWPATH_ANDROID_APP_RECORD_CONFIRMED",
      "GROWPATH_IOS_PRIVACY_NUTRITION_COMPLETED",
      "GROWPATH_GOOGLE_DATA_SAFETY_COMPLETED",
      "GROWPATH_STORE_PRICING_CONFIRMED",
      "GROWPATH_REVIEW_NOTES_CONFIRMED"
    ]
  },
  screenshots: {
    dir: "tmp/spec/store-screenshots",
    status: "passed",
    required: [
      "GROWPATH_SCREENSHOT_IOS_67",
      "GROWPATH_SCREENSHOT_IOS_65",
      "GROWPATH_SCREENSHOT_IPAD_129",
      "GROWPATH_SCREENSHOT_ANDROID_PHONE",
      "GROWPATH_SCREENSHOT_ANDROID_TABLET"
    ]
  },
  "device-smoke": {
    dir: "tmp/spec/release-device-smoke",
    status: "passed",
    required: [
      "GROWPATH_SMOKE_TESTER",
      "GROWPATH_IOS_DEVICE",
      "GROWPATH_ANDROID_DEVICE",
      "GROWPATH_IOS_BUILD",
      "GROWPATH_ANDROID_BUILD",
      "GROWPATH_SMOKE_RESULT"
    ],
    exact: {
      GROWPATH_SMOKE_RESULT: "passed"
    }
  },
  monitoring: {
    dir: "tmp/spec/monitoring-validation",
    status: "passed",
    required: [
      "GROWPATH_SENTRY_EVENT_URL",
      "GROWPATH_MONITORING_BUILD",
      "GROWPATH_CRASH_OWNER",
      "GROWPATH_TRIAGE_SLA"
    ]
  }
};

function usage() {
  const types = Object.keys(evidenceTypes).join("|");
  console.log(`Usage: node scripts/record-release-evidence.cjs <${types}>`);
  console.log(`Template: node scripts/record-release-evidence.cjs --template <${types}>`);
  console.log(`Required confirmation: GROWPATH_RELEASE_EVIDENCE_CONFIRM=${CONFIRM}`);
}

function printTemplate(type, spec) {
  console.log(`$env:GROWPATH_RELEASE_EVIDENCE_CONFIRM="${CONFIRM}"`);
  console.log('$env:GROWPATH_EVIDENCE_RECORDED_BY="<name-or-release-machine>"');
  for (const name of spec.required) {
    const expected = spec.exact?.[name];
    if (expected) {
      console.log(`$env:${name}="${expected}"`);
    } else if ((spec.yesNo || []).includes(name)) {
      console.log(`$env:${name}="yes"`);
    } else {
      console.log(`$env:${name}="<required>"`);
    }
  }
  console.log(`npm.cmd run release:record-evidence -- ${type}`);
}

function env(name) {
  return String(process.env[name] || "").trim();
}

function requireConfirmation() {
  if (env("GROWPATH_RELEASE_EVIDENCE_CONFIRM") !== CONFIRM) {
    throw new Error(
      `Refusing to write release evidence. Set GROWPATH_RELEASE_EVIDENCE_CONFIRM=${CONFIRM}.`
    );
  }
}

function requireFields(type, spec) {
  const values = {};
  for (const name of spec.required) {
    const value = env(name);
    if (!value) throw new Error(`${type} evidence is missing ${name}`);
    values[name] = value;
  }
  for (const name of spec.yesNo || []) {
    if (!/^(yes|true|1)$/i.test(values[name])) {
      throw new Error(`${name} must be yes, true, or 1`);
    }
  }
  for (const [name, expected] of Object.entries(spec.exact || {})) {
    if (values[name] !== expected) {
      throw new Error(`${name} must equal ${expected}`);
    }
  }
  return values;
}

function writeEvidence(type, spec, values) {
  const outputDir = path.join(ROOT, spec.dir);
  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(outputDir, `${stamp}.json`);
  const payload = {
    status: spec.status,
    type,
    recordedAt: new Date().toISOString(),
    recordedBy: env("GROWPATH_EVIDENCE_RECORDED_BY") || null,
    values
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  return path.relative(ROOT, outputPath);
}

function main() {
  const templateMode = process.argv[2] === "--template";
  const type = templateMode ? process.argv[3] : process.argv[2];
  if (!type || type === "--help" || type === "-h") {
    usage();
    process.exit(type ? 0 : 1);
  }

  const spec = evidenceTypes[type];
  if (!spec) {
    usage();
    throw new Error(`Unknown release evidence type: ${type}`);
  }

  if (templateMode) {
    printTemplate(type, spec);
    return;
  }

  requireConfirmation();
  const values = requireFields(type, spec);
  const evidencePath = writeEvidence(type, spec, values);
  console.log(`Recorded ${type} release evidence: ${evidencePath}`);
}

try {
  main();
} catch (err) {
  console.error(`Release evidence recording failed: ${err?.message || err}`);
  process.exit(1);
}
