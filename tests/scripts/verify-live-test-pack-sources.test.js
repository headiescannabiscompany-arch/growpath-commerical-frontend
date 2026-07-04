const { spawnSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "verify-live-test-pack-sources.cjs");

function run(args = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: "utf8"
  });
}

describe("verify-live-test-pack-sources", () => {
  it("allows placeholder source links only in planning mode", () => {
    const result = run(["--allow-placeholders"]);

    expect(result.status).toBe(0);
    const summary = JSON.parse(result.stdout);
    expect(summary.allowPlaceholders).toBe(true);
    expect(summary.placeholderCount).toBeGreaterThan(0);
    expect(summary.rehostedAssetCount).toBe(0);
  });

  it("blocks strict source verification while source links are placeholders", () => {
    const result = run();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("source links are still placeholders");
    const summary = JSON.parse(result.stdout);
    expect(summary.allowPlaceholders).toBe(false);
    expect(summary.placeholderCount).toBeGreaterThan(0);
  });
});
