#!/usr/bin/env node

const { spawnSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const strict = process.argv.includes("--strict");
const playwrightPort = process.env.PLAYWRIGHT_WEB_PORT || "19025";
const jestCli = path.join(ROOT, "node_modules", "jest", "bin", "jest.js");
const playwrightCli = path.join(ROOT, "node_modules", "@playwright", "test", "cli.js");

function run(label, command, args, options = {}) {
  console.log(`\n[release-preflight] ${label}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...(options.env || {}) },
    stdio: "inherit",
    shell: false
  });

  if (result.error) {
    console.error(`[release-preflight] ${label} failed to start: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`[release-preflight] ${label} failed with status ${result.status}`);
    process.exit(result.status || 1);
  }
}

async function main() {
  run("release scan", process.execPath, ["scripts/scan-release.cjs"]);

  if (strict) {
    run("strict release scan", process.execPath, ["scripts/scan-release.cjs"], {
      env: { GROWPATH_STRICT_RELEASE: "1" }
    });
    run("Sentry DSN event check", process.execPath, ["scripts/verify-sentry-dsn.cjs"]);
    run("live production URL checks", process.execPath, ["scripts/verify-live-urls.cjs"]);
  }

  run("UI route inventory", process.execPath, ["scripts/inventory-ui-routes.cjs"]);

  run("focused release unit tests", process.execPath, [
    jestCli,
    "--runInBand",
    "tests/unit/monitoring.test.ts",
    "tests/release.scan.test.js",
    "src/api/__tests__/users.privacy.test.ts",
    "tests/unit/ProfilePrivacyControls.test.tsx",
    "src/features/personal/__tests__/homeModel.test.ts"
  ]);

  run(
    "focused release Playwright specs",
    process.execPath,
    [
      playwrightCli,
      "test",
      "e2e/profile-privacy-visual.spec.ts",
      "e2e/personal-home-task-sources-visual.spec.ts",
      "e2e/personal-core-loop.spec.ts",
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
  run("store graphics export", "powershell", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    "scripts/export-store-assets.ps1"
  ]);

  console.log(
    `\n[release-preflight] ${strict ? "strict " : ""}preflight passed.`
  );
}

main().catch((err) => {
  console.error(`\n[release-preflight] failed: ${err?.message || err}`);
  process.exit(1);
});
