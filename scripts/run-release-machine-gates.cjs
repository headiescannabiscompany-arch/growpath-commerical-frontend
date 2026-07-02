#!/usr/bin/env node

const { spawnSync } = require("child_process");

const execute = process.argv.includes("--execute");
const CONFIRM = "RUN_RELEASE_MACHINE_GATES";

function env(name) {
  return String(process.env[name] || "").trim();
}

function missingRequirements() {
  const missing = [];

  if (!env("EXPO_PUBLIC_SENTRY_DSN")) {
    missing.push("EXPO_PUBLIC_SENTRY_DSN");
  }

  for (const name of [
    "GROWPATH_DATA_RIGHTS_EMAIL",
    "GROWPATH_DATA_RIGHTS_PASSWORD",
    "GROWPATH_DATA_RIGHTS_CONFIRM",
    "GROWPATH_PRODUCTION_BUILD_CONFIRM"
  ]) {
    if (!env(name)) missing.push(name);
  }

  if (execute && env("GROWPATH_RELEASE_MACHINE_CONFIRM") !== CONFIRM) {
    missing.push(`GROWPATH_RELEASE_MACHINE_CONFIRM=${CONFIRM}`);
  }

  return missing;
}

function runStep(label, command, args) {
  console.log(`\n[release-machine] ${label}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: false
  });

  if (result.error) {
    throw new Error(`${label} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with status ${result.status}`);
  }
}

function printPlan() {
  console.log("[release-machine] planned execute order:");
  console.log("1. npm.cmd run release:preflight:strict");
  console.log("2. npm.cmd run verify:data-rights:live");
  console.log("3. npm.cmd run release:builds");
  console.log("4. npm.cmd run release:go-no-go");
  console.log("");
  console.log("Set GROWPATH_RELEASE_MACHINE_CONFIRM=RUN_RELEASE_MACHINE_GATES and pass --execute to run.");
}

function printMissing(missing) {
  console.error("[release-machine] missing required release-machine inputs:");
  for (const name of missing) {
    console.error(`- ${name}`);
  }
}

function main() {
  const missing = missingRequirements();
  if (!execute) {
    printPlan();
    if (missing.length) {
      printMissing(missing);
      process.exit(1);
    }
    console.log("[release-machine] required inputs are present.");
    return;
  }

  if (missing.length) {
    printMissing(missing);
    process.exit(1);
  }

  runStep("strict release preflight", "npm.cmd", ["run", "release:preflight:strict"]);
  runStep("live data-rights export/delete verification", "npm.cmd", [
    "run",
    "verify:data-rights:live"
  ]);
  runStep("production iOS/Android builds", "npm.cmd", ["run", "release:builds"]);
  runStep("final go/no-go gate", "npm.cmd", ["run", "release:go-no-go"]);

  console.log("\n[release-machine] automated release-machine gates passed.");
}

try {
  main();
} catch (err) {
  console.error(`[release-machine] failed: ${err?.message || err}`);
  process.exit(1);
}
