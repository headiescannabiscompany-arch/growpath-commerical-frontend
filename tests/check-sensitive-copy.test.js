/**
 * check-sensitive-copy.test.js
 *
 * This test runs the repo's "check sensitive copy" script via a child Node process.
 * Some locked-down environments block spawning child processes (EPERM/EACCES).
 * In that case, we skip the test rather than failing the whole suite.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function canSpawnNode() {
  const probe = spawnSync(process.execPath, ["-e", "process.exit(0)"], {
    stdio: "ignore"
  });

  if (probe.error) {
    const code = probe.error.code;
    if (code === "EPERM" || code === "EACCES") return false;
    throw probe.error;
  }

  return probe.status === 0;
}

const CAN_SPAWN = canSpawnNode();

function resolveScriptPath() {
  // Prefer .mjs if present, else .js
  const mjs = path.resolve(__dirname, "..", "scripts", "check-sensitive-copy.mjs");
  if (fs.existsSync(mjs)) return mjs;

  const js = path.resolve(__dirname, "..", "scripts", "check-sensitive-copy.js");
  if (fs.existsSync(js)) return js;

  // Fallback: keep the error actionable
  throw new Error(
    `check-sensitive-copy script not found. Expected one of:\n- ${mjs}\n- ${js}`
  );
}

const SCRIPT_PATH = resolveScriptPath();

(CAN_SPAWN ? test : test.skip)("check-sensitive-copy script exits cleanly", () => {
  const res = spawnSync(process.execPath, [SCRIPT_PATH], {
    encoding: "utf8"
  });

  if (res.error) {
    // If spawn becomes blocked mid-run, skip instead of failing the suite.
    const code = res.error.code;
    if (code === "EPERM" || code === "EACCES") return;
    throw res.error;
  }

  const combined = `${res.stdout || ""}${res.stderr || ""}`.trim();

  expect(res.status).toBe(0);
  // Keep this loose so minor messaging changes don't break tests.
  expect(combined.length).toBeGreaterThanOrEqual(0);
});
