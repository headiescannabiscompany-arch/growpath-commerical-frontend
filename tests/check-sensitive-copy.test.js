"use strict";

const path = require("node:path");
const { execFileSync } = require("node:child_process");

describe("Sensitive copy check", () => {
  it("passes scripts/check-sensitive-copy.js", () => {
    const projectRoot = path.resolve(__dirname, "..");
    const scriptPath = path.join(projectRoot, "scripts", "check-sensitive-copy.js");

    // Run with node; if script exits non-zero, execFileSync throws and the test fails.
    execFileSync(process.execPath, [scriptPath], {
      cwd: projectRoot,
      stdio: "pipe"
    });
  });
});
