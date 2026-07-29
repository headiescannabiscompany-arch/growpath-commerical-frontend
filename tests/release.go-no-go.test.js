const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");

const trackedArtifacts = [
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
  "docs/release-signoff-runbook.md",
  "store-assets/graphics/app-store-icon-1024.png",
  "store-assets/graphics/google-play-icon-512.png",
  "store-assets/graphics/google-play-feature-graphic-1024x500.png"
];

function writeJson(tempRoot, relPath, body) {
  const absolute = path.join(tempRoot, relPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(body, null, 2)}\n`);
}

function writeArtifact(tempRoot, relPath) {
  const absolute = path.join(tempRoot, relPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, "release test artifact\n");
}

function createReleaseRoot() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-go-no-go-"));
  fs.mkdirSync(path.join(tempRoot, "scripts"), { recursive: true });
  fs.copyFileSync(
    path.join(root, "scripts", "release-go-no-go.cjs"),
    path.join(tempRoot, "scripts", "release-go-no-go.cjs")
  );
  trackedArtifacts.forEach((relPath) => writeArtifact(tempRoot, relPath));
  return tempRoot;
}

function writeValidEvidence(tempRoot, overrides = {}) {
  const evidence = {
    "tmp/spec/strict-preflight/valid.json": {
      status: "passed",
      checkedAt: "2026-07-01T00:00:00.000Z",
      command: "npm.cmd run release:preflight:strict"
    },
    "tmp/spec/live-url-checks/valid.json": {
      status: "passed",
      results: [
        "privacy",
        "terms",
        "support",
        "personal-grow-deep-link",
        "delete-account",
        "api-health",
        "api-ready",
        "api-health-api"
      ].map((name) => ({ name, url: `https://example.test/${name}`, status: 200 }))
    },
    "tmp/spec/monitoring-validation/valid.json": {
      status: "passed",
      values: {
        GROWPATH_SENTRY_EVENT_URL: "https://sentry.example.com/events/1",
        GROWPATH_MONITORING_BUILD: "ios-1",
        GROWPATH_CRASH_OWNER: "Crash Owner",
        GROWPATH_TRIAGE_SLA: "next business day"
      }
    },
    "tmp/spec/data-rights-live/valid.json": {
      status: "passed",
      loginStatus: 200,
      exportStatus: 200,
      deleteStatus: 200,
      postDeleteLoginStatus: 401,
      exportTopLevelKeys: ["profile"]
    },
    "tmp/spec/release-builds/valid.json": {
      status: "passed",
      platforms: ["ios", "android"],
      results: [
        { platform: "ios", status: 0 },
        { platform: "android", status: 0 }
      ]
    },
    "tmp/spec/release-device-smoke/valid.json": {
      status: "passed",
      values: {
        GROWPATH_SMOKE_TESTER: "QA Owner",
        GROWPATH_IOS_DEVICE: "iPhone",
        GROWPATH_ANDROID_DEVICE: "Pixel",
        GROWPATH_IOS_BUILD: "ios-1",
        GROWPATH_ANDROID_BUILD: "android-1",
        GROWPATH_SMOKE_RESULT: "passed"
      }
    },
    "tmp/spec/store-screenshots/valid.json": {
      status: "passed",
      values: {
        GROWPATH_SCREENSHOT_IOS_67: "ios-67",
        GROWPATH_SCREENSHOT_IOS_65: "ios-65",
        GROWPATH_SCREENSHOT_IPAD_129: "ipad-129",
        GROWPATH_SCREENSHOT_ANDROID_PHONE: "android-phone",
        GROWPATH_SCREENSHOT_ANDROID_TABLET: "android-tablet"
      }
    },
    "tmp/spec/store-submission/valid.json": {
      status: "passed",
      values: {
        GROWPATH_IOS_APP_RECORD_CONFIRMED: "yes",
        GROWPATH_ANDROID_APP_RECORD_CONFIRMED: "yes",
        GROWPATH_IOS_PRIVACY_NUTRITION_COMPLETED: "yes",
        GROWPATH_GOOGLE_DATA_SAFETY_COMPLETED: "yes",
        GROWPATH_STORE_PRICING_CONFIRMED: "yes",
        GROWPATH_REVIEW_NOTES_CONFIRMED: "yes"
      }
    },
    "tmp/spec/legal-release-signoff/valid.json": {
      status: "approved",
      values: {
        GROWPATH_LEGAL_APPROVER: "Legal Owner",
        GROWPATH_RELEASE_OWNER: "Release Owner",
        GROWPATH_APPROVED_LISTING_VERSION: "2026-07-01",
        GROWPATH_APPROVED_PRIVACY_VERSION: "2026-07-01",
        GROWPATH_AGE_RATING_DECISION: "17+",
        GROWPATH_JURISDICTION_NOTES: "Approved"
      }
    },
    "tmp/spec/release-owners/valid.json": {
      status: "approved",
      values: {
        GROWPATH_RELEASE_OWNER: "Release Owner",
        GROWPATH_QA_OWNER: "QA Owner",
        GROWPATH_SUPPORT_OWNER: "Support Owner",
        GROWPATH_CRASH_OWNER: "Crash Owner",
        GROWPATH_RELEASE_MONITORING_OWNER: "Monitoring Owner",
        GROWPATH_TRIAGE_SLA: "next business day"
      }
    },
    "tmp/spec/hotfix-rollback/valid.json": {
      status: "approved",
      values: {
        GROWPATH_HOTFIX_OWNER: "Hotfix Owner",
        GROWPATH_ROLLBACK_OWNER: "Rollback Owner",
        GROWPATH_HOTFIX_BRANCH: "release/1.0.0-hotfix",
        GROWPATH_ROLLBACK_PLAN: "Withdraw bad build and ship fixed build",
        GROWPATH_SUPPORT_ESCALATION: "support@growpathai.com"
      }
    }
  };

  for (const [relPath, body] of Object.entries({ ...evidence, ...overrides })) {
    writeJson(tempRoot, relPath, body);
  }
}

function runGate(tempRoot) {
  return spawnSync(
    process.execPath,
    [path.join(tempRoot, "scripts", "release-go-no-go.cjs")],
    {
      cwd: tempRoot,
      encoding: "utf8",
      env: process.env
    }
  );
}

describe("release go/no-go gate", () => {
  it("passes when all tracked artifacts and evidence are valid", () => {
    const tempRoot = createReleaseRoot();
    writeValidEvidence(tempRoot);

    const result = runGate(tempRoot);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/GO: all required release evidence is present/);
  });

  it("rejects negative store-console confirmations", () => {
    const tempRoot = createReleaseRoot();
    writeValidEvidence(tempRoot, {
      "tmp/spec/store-submission/valid.json": {
        status: "passed",
        values: {
          GROWPATH_IOS_APP_RECORD_CONFIRMED: "yes",
          GROWPATH_ANDROID_APP_RECORD_CONFIRMED: "no",
          GROWPATH_IOS_PRIVACY_NUTRITION_COMPLETED: "yes",
          GROWPATH_GOOGLE_DATA_SAFETY_COMPLETED: "yes",
          GROWPATH_STORE_PRICING_CONFIRMED: "yes",
          GROWPATH_REVIEW_NOTES_CONFIRMED: "yes"
        }
      }
    });

    const result = runGate(tempRoot);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/store-console submission form evidence/);
  });

  it("rejects live URL evidence with a failing status", () => {
    const tempRoot = createReleaseRoot();
    writeValidEvidence(tempRoot, {
      "tmp/spec/live-url-checks/valid.json": {
        status: "passed",
        results: [
          "privacy",
          "terms",
          "support",
          "personal-grow-deep-link",
          "delete-account",
          "api-health",
          "api-ready",
          "api-health-api"
        ].map((name) => ({
          name,
          url: `https://example.test/${name}`,
          status: name === "support" ? 500 : 200
        }))
      }
    });

    const result = runGate(tempRoot);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/live URL verification/);
  });

  it("rejects data-rights evidence when post-delete login succeeds", () => {
    const tempRoot = createReleaseRoot();
    writeValidEvidence(tempRoot, {
      "tmp/spec/data-rights-live/valid.json": {
        status: "passed",
        loginStatus: 200,
        exportStatus: 200,
        deleteStatus: 200,
        postDeleteLoginStatus: 200,
        exportTopLevelKeys: ["profile"]
      }
    });

    const result = runGate(tempRoot);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/disposable-account export\/delete verification/);
  });

  it("rejects device-smoke evidence that is not explicitly passed", () => {
    const tempRoot = createReleaseRoot();
    writeValidEvidence(tempRoot, {
      "tmp/spec/release-device-smoke/valid.json": {
        status: "passed",
        values: {
          GROWPATH_SMOKE_TESTER: "QA Owner",
          GROWPATH_IOS_DEVICE: "iPhone",
          GROWPATH_ANDROID_DEVICE: "Pixel",
          GROWPATH_IOS_BUILD: "ios-1",
          GROWPATH_ANDROID_BUILD: "android-1",
          GROWPATH_SMOKE_RESULT: "failed"
        }
      }
    });

    const result = runGate(tempRoot);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/physical-device smoke evidence/);
  });
});
