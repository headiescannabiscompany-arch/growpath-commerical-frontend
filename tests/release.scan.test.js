const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const script = path.join(root, "scripts", "scan-release.cjs");

function runScan(extraEnv = {}) {
  return spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      ...extraEnv
    }
  });
}

describe("release scan", () => {
  it("accepts the configured production legal/support links", () => {
    const result = runScan();

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Release scan passed/);
  });

  it("rejects placeholder legal/support links", () => {
    const result = runScan({
      EXPO_PUBLIC_PRIVACY_URL: "https://example.com/privacy"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Privacy URL must be production https/);
  });
});
