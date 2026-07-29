const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

describe("Codex Browser workflow contract", () => {
  it("keeps the repository guidance machine-verifiable", () => {
    const result = spawnSync(process.execPath, ["scripts/verify-codex-workflow.cjs"], {
      cwd: root,
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("verified 11 workflow requirements");
  });

  it("scopes truthful visual evidence recovery to explicit requests", () => {
    const runbook = fs.readFileSync(
      path.join(root, "docs", "codex-browser-evidence-runbook.md"),
      "utf8"
    );

    expect(runbook).toMatch(/fully quit the Codex desktop app/i);
    expect(runbook).toMatch(/start a new Codex chat/i);
    expect(runbook).toMatch(/user explicitly requests browser automation/i);
    expect(runbook).toMatch(/Report the limitation once/i);
    expect(runbook).toMatch(/Starting Expo is separate/i);
    expect(runbook).toMatch(/If visual capture is unavailable, say so plainly/i);
    expect(runbook).toMatch(/Never fabricate an artifact/i);
  });
});
