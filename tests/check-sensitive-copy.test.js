import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const scriptPath = path.join(projectRoot, "scripts", "check-sensitive-copy.js");

function runCheck(target) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [scriptPath, target], {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

const fixturesDir = path.join(projectRoot, "tests", "fixtures", "sensitive-copy");

test("fails when sensitive term is shallow JSX text", async () => {
  const { code, stderr } = await runCheck(path.join(fixturesDir, "bad-shallow.js"));
  assert.notEqual(code, 0);
  assert.match(stderr, /bad-shallow\.js/);
});

test("fails when sensitive term is deeply nested JSX text", async () => {
  const { code, stderr } = await runCheck(path.join(fixturesDir, "bad-deep.js"));
  assert.notEqual(code, 0);
  assert.match(stderr, /bad-deep\.js/);
});

test("fails when sensitive term is behind wrong condition", async () => {
  const { code, stderr } = await runCheck(
    path.join(fixturesDir, "bad-wrong-condition.js")
  );
  assert.notEqual(code, 0);
  assert.match(stderr, /bad-wrong-condition\.js/);
});

test("passes when sensitive term is protected by guild gate", async () => {
  const { code, stderr } = await runCheck(
    path.join(fixturesDir, "good-gated.js")
  );
  assert.equal(code, 0, stderr);
});
