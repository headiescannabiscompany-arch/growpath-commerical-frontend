const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
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

  it("rejects broad Android storage permissions", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-release-scan-"));
    fs.cpSync(root, tempRoot, {
      recursive: true,
      filter: (source) => !source.includes(`${path.sep}node_modules${path.sep}`)
    });

    const appJsonPath = path.join(tempRoot, "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
    appJson.expo.android.permissions = [
      ...(appJson.expo.android.permissions || []),
      "android.permission.WRITE_EXTERNAL_STORAGE"
    ];
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

    const result = spawnSync(process.execPath, [path.join(tempRoot, "scripts", "scan-release.cjs")], {
      cwd: tempRoot,
      encoding: "utf8",
      env: process.env
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/avoid broad Android storage permission/);
  });

  it("rejects auth debug logging in release source", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-release-scan-"));
    fs.cpSync(root, tempRoot, {
      recursive: true,
      filter: (source) => !source.includes(`${path.sep}node_modules${path.sep}`)
    });

    const sourcePath = path.join(tempRoot, "src", "api", "auth.js");
    fs.appendFileSync(sourcePath, "\nconsole.error('[API] Login error:', {});\n");

    const result = spawnSync(process.execPath, [path.join(tempRoot, "scripts", "scan-release.cjs")], {
      cwd: tempRoot,
      encoding: "utf8",
      env: process.env
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/auth debug logging/);
  });
});
