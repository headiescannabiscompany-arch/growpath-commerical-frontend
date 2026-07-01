#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const execute = process.argv.includes("--execute");
const platforms = process.argv.includes("--ios-only")
  ? ["ios"]
  : process.argv.includes("--android-only")
    ? ["android"]
    : ["ios", "android"];

function requireConfirmation() {
  const expected = "BUILD_PRODUCTION_GROWPATH";
  if (process.env.GROWPATH_PRODUCTION_BUILD_CONFIRM !== expected) {
    throw new Error(
      `Refusing to run production builds. Set GROWPATH_PRODUCTION_BUILD_CONFIRM=${expected}.`
    );
  }
}

function commandFor(platform) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return {
    command: npx,
    args: ["eas", "build", "--profile", "production", "--platform", platform, "--non-interactive"]
  };
}

function evidencePath() {
  const outputDir = path.join(ROOT, "tmp", "spec", "release-builds");
  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(outputDir, `${stamp}.json`);
}

function runBuild(platform) {
  const spec = commandFor(platform);
  console.log(`[release-builds] running ${spec.command} ${spec.args.join(" ")}`);
  const result = spawnSync(spec.command, spec.args, {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
    shell: false
  });

  return {
    platform,
    command: `${spec.command} ${spec.args.join(" ")}`,
    status: result.status,
    error: result.error ? result.error.message : null,
    stdoutTail: String(result.stdout || "").slice(-4000),
    stderrTail: String(result.stderr || "").slice(-4000)
  };
}

function dryRun() {
  console.log("[release-builds] dry run");
  for (const platform of platforms) {
    const spec = commandFor(platform);
    console.log(`[release-builds] ${platform}: ${spec.command} ${spec.args.join(" ")}`);
  }
  console.log("[release-builds] Set GROWPATH_PRODUCTION_BUILD_CONFIRM=BUILD_PRODUCTION_GROWPATH and pass --execute to run.");
}

function main() {
  if (!execute) {
    dryRun();
    return;
  }

  requireConfirmation();

  const startedAt = new Date().toISOString();
  const results = platforms.map(runBuild);
  const failed = results.find((result) => result.error || result.status !== 0);
  const evidence = {
    status: failed ? "failed" : "passed",
    startedAt,
    completedAt: new Date().toISOString(),
    profile: "production",
    platforms,
    results
  };

  const outputPath = evidencePath();
  fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`[release-builds] evidence: ${path.relative(ROOT, outputPath)}`);

  if (failed) {
    throw new Error(`${failed.platform} production build failed`);
  }
}

try {
  main();
} catch (err) {
  console.error(`[release-builds] failed: ${err?.message || err}`);
  process.exit(1);
}
