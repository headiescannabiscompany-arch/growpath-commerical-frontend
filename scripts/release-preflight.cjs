#!/usr/bin/env node

const https = require("https");
const { spawnSync } = require("child_process");
const fs = require("fs");
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

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
}

function productionEnv() {
  const eas = readJson("eas.json");
  return eas?.build?.production?.env || {};
}

function urlFromEnv(name, fallback) {
  return process.env[name] || productionEnv()[name] || fallback;
}

function liveUrls() {
  const apiBase = urlFromEnv("EXPO_PUBLIC_API_URL", "https://api.growpathai.com").replace(
    /\/$/,
    ""
  );
  return [
    urlFromEnv("EXPO_PUBLIC_PRIVACY_URL", "https://growpathai.com/privacy"),
    urlFromEnv("EXPO_PUBLIC_TERMS_URL", "https://growpathai.com/terms"),
    urlFromEnv("EXPO_PUBLIC_SUPPORT_URL", "https://growpathai.com/support"),
    urlFromEnv("EXPO_PUBLIC_DELETE_ACCOUNT_URL", "https://growpathai.com/account/delete"),
    `${apiBase}/health`,
    `${apiBase}/ready`,
    `${apiBase}/api/health`
  ];
}

function requestUrl(url, method) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method,
        timeout: 20000,
        headers: {
          "user-agent": "growpath-release-preflight/1.0"
        }
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode || 0));
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error(`timeout checking ${url}`));
    });
    req.on("error", reject);
    req.end();
  });
}

async function checkUrl(url) {
  let status = await requestUrl(url, "HEAD");
  if (status === 405 || status === 403) {
    status = await requestUrl(url, "GET");
  }
  if (status < 200 || status >= 400) {
    throw new Error(`${url} returned HTTP ${status}`);
  }
  console.log(`[release-preflight] URL OK ${status}: ${url}`);
}

async function checkLiveUrls() {
  console.log("\n[release-preflight] live production URL checks");
  for (const url of liveUrls()) {
    await checkUrl(url);
  }
}

async function main() {
  run("release scan", process.execPath, ["scripts/scan-release.cjs"]);

  if (strict) {
    run("strict release scan", process.execPath, ["scripts/scan-release.cjs"], {
      env: { GROWPATH_STRICT_RELEASE: "1" }
    });
    await checkLiveUrls();
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

  console.log(
    `\n[release-preflight] ${strict ? "strict " : ""}preflight passed.`
  );
}

main().catch((err) => {
  console.error(`\n[release-preflight] failed: ${err?.message || err}`);
  process.exit(1);
});
