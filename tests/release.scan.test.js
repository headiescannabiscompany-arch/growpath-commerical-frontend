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

  it("rejects local production API URLs", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-release-scan-"));
    fs.cpSync(root, tempRoot, {
      recursive: true,
      filter: (source) => !source.includes(`${path.sep}node_modules${path.sep}`)
    });

    const easPath = path.join(tempRoot, "eas.json");
    const easJson = JSON.parse(fs.readFileSync(easPath, "utf8"));
    easJson.build.production.env.EXPO_PUBLIC_API_URL = "http://127.0.0.1:5002";
    fs.writeFileSync(easPath, JSON.stringify(easJson, null, 2));

    const result = spawnSync(process.execPath, [path.join(tempRoot, "scripts", "scan-release.cjs")], {
      cwd: tempRoot,
      encoding: "utf8",
      env: { ...process.env, EXPO_PUBLIC_API_URL: "" }
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/production API URL must be production https/);
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

  it("rejects legacy privacy account endpoints in release source", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-release-scan-"));
    fs.cpSync(root, tempRoot, {
      recursive: true,
      filter: (source) => !source.includes(`${path.sep}node_modules${path.sep}`)
    });

    const sourcePath = path.join(tempRoot, "src", "api", "users.js");
    fs.appendFileSync(sourcePath, "\nconst stale = '/api/privacy/delete';\n");

    const result = spawnSync(process.execPath, [path.join(tempRoot, "scripts", "scan-release.cjs")], {
      cwd: tempRoot,
      encoding: "utf8",
      env: process.env
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/legacy privacy API endpoint/);
  });

  it("scans all source folders for hardcoded local URLs", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-release-scan-"));
    fs.cpSync(root, tempRoot, {
      recursive: true,
      filter: (source) => !source.includes(`${path.sep}node_modules${path.sep}`)
    });

    const sourcePath = path.join(tempRoot, "src", "utils", "releaseLeak.ts");
    fs.writeFileSync(sourcePath, "export const leak = 'http://127.0.0.1:5002';\n");

    const result = spawnSync(process.execPath, [path.join(tempRoot, "scripts", "scan-release.cjs")], {
      cwd: tempRoot,
      encoding: "utf8",
      env: process.env
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/hardcoded local URL/);
  });

  it("strict release mode requires frontend crash reporting DSN", () => {
    const result = runScan({
      GROWPATH_STRICT_RELEASE: "1",
      EXPO_PUBLIC_SENTRY_DSN: ""
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/frontend crash reporting DSN/);
  });
});
