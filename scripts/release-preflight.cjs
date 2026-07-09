#!/usr/bin/env node

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const strict = process.argv.includes("--strict");
const playwrightPort = process.env.PLAYWRIGHT_WEB_PORT || "19025";
const jestCli = path.join(ROOT, "node_modules", "jest", "bin", "jest.js");

function run(label, command, args, options = {}) {
  console.log(`\n[release-preflight] ${label}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...(options.env || {}) },
    stdio: "inherit",
    shell: false
  });

  if (result.error) {
    console.error(
      `[release-preflight] ${label} failed to start: ${result.error.message}`
    );
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`[release-preflight] ${label} failed with status ${result.status}`);
    process.exit(result.status || 1);
  }
}

function writeStrictEvidence() {
  const outputDir = path.join(ROOT, "tmp", "spec", "strict-preflight");
  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(outputDir, `${stamp}.json`);
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(
      {
        status: "passed",
        checkedAt: new Date().toISOString(),
        command: "npm.cmd run release:preflight:strict"
      },
      null,
      2
    )}\n`
  );
  console.log(`[release-preflight] strict evidence: ${path.relative(ROOT, outputPath)}`);
}

async function main() {
  run("release scan", process.execPath, ["scripts/scan-release.cjs"]);
  run("full frontend/backend surface audit", process.execPath, [
    "scripts/audit-full-surface.cjs"
  ]);

  if (strict) {
    run("strict release scan", process.execPath, ["scripts/scan-release.cjs"], {
      env: { GROWPATH_STRICT_RELEASE: "1" }
    });
    run("Sentry DSN event check", process.execPath, ["scripts/verify-sentry-dsn.cjs"]);
    run("live production URL checks", process.execPath, ["scripts/verify-live-urls.cjs"]);
  }

  run("UI route inventory", process.execPath, ["scripts/inventory-ui-routes.cjs"]);
  run("frontend runtime contract validation", process.execPath, [
    "scripts/validate-frontend-runtime-contract.cjs"
  ]);
  run("backend route contract validation", process.execPath, [
    "scripts/validate-backend-route-contract.cjs"
  ]);
  run("V1 UI surface validation", process.execPath, [
    "scripts/validate-v1-ui-surface.cjs"
  ]);
  run("V1 feature matrix validation", process.execPath, [
    "scripts/validate-v1-feature-matrix.cjs"
  ]);

  run("focused backend release routes", process.execPath, [
    jestCli,
    "--config",
    "jest.backend.config.cjs",
    "--runInBand",
    "backend/routes/tools.test.js",
    "backend/routes/growpathModules.test.js",
    "backend/routes/cropKnowledge.test.js"
  ]);

  run("focused release unit tests", process.execPath, [
    jestCli,
    "--runInBand",
    "tests/unit/monitoring.test.ts",
    "tests/unit/cropKnowledge-api.test.ts",
    "tests/release.scan.test.js",
    "tests/release.go-no-go.test.js",
    "tests/release.record-evidence.test.js",
    "tests/release.preflight.test.js",
    "tests/contracts/v1.release.matrix.test.js",
    "tests/release.live-urls.test.js",
    "tests/release.sentry-dsn.test.js",
    "tests/release.data-rights.test.js",
    "tests/release.production-builds.test.js",
    "tests/release.machine-gates.test.js",
    "tests/release.store-assets.test.js",
    "src/api/__tests__/users.privacy.test.ts",
    "tests/unit/ProfilePrivacyControls.test.tsx",
    "src/features/personal/__tests__/homeModel.test.ts"
  ]);

  run(
    "focused release Playwright specs",
    process.execPath,
    [
      "scripts/run-playwright-expo.cjs",
      "e2e/profile-privacy-visual.spec.ts",
      "e2e/personal-home-task-sources-visual.spec.ts",
      "e2e/personal-core-loop.spec.ts",
      "e2e/toolrun-log-release.spec.ts",
      "e2e/diagnosis-etgu-visual.spec.ts",
      "--reporter=list"
    ],
    {
      env: {
        PLAYWRIGHT_USE_SYSTEM_CHROME: process.env.PLAYWRIGHT_USE_SYSTEM_CHROME || "1",
        PLAYWRIGHT_WEB_PORT: playwrightPort,
        PLAYWRIGHT_DISABLE_VIDEO: process.env.PLAYWRIGHT_DISABLE_VIDEO || "1"
      }
    }
  );

  run("production web export", process.execPath, ["scripts/export-production-web.cjs"]);
  run("web SEO verification", process.execPath, ["scripts/verify-web-seo.cjs"]);
  run("store graphics export", process.execPath, ["scripts/export-store-assets.cjs"]);

  console.log(`\n[release-preflight] ${strict ? "strict " : ""}preflight passed.`);
  if (strict) writeStrictEvidence();
}

main().catch((err) => {
  console.error(`\n[release-preflight] failed: ${err?.message || err}`);
  process.exit(1);
});
