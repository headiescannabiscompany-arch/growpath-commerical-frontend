const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");

function writeFile(tempRoot, relPath, contents) {
  const absolute = path.join(tempRoot, relPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, contents);
}

function fakeNodeScript(name) {
  return `
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, ${JSON.stringify(name.includes("/") ? "../".repeat(name.split("/").length - 1) || "." : ".")});
const logPath = path.join(process.cwd(), "preflight-log.jsonl");
fs.appendFileSync(logPath, JSON.stringify({
  name: ${JSON.stringify(name)},
  argv: process.argv.slice(2),
  strict: process.env.GROWPATH_STRICT_RELEASE || "",
  playwrightPort: process.env.PLAYWRIGHT_WEB_PORT || "",
  playwrightVideo: process.env.PLAYWRIGHT_DISABLE_VIDEO || ""
}) + "\\n");
`;
}

function createPreflightRoot() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-preflight-"));
  fs.mkdirSync(path.join(tempRoot, "scripts"), { recursive: true });
  fs.copyFileSync(
    path.join(root, "scripts", "release-preflight.cjs"),
    path.join(tempRoot, "scripts", "release-preflight.cjs")
  );

  [
    "scripts/scan-release.cjs",
    "scripts/audit-full-surface.cjs",
    "scripts/verify-sentry-dsn.cjs",
    "scripts/verify-live-urls.cjs",
    "scripts/inventory-ui-routes.cjs",
    "scripts/validate-v1-ui-surface.cjs",
    "scripts/validate-v1-feature-matrix.cjs",
    "scripts/export-production-web.cjs",
    "node_modules/jest/bin/jest.js",
    "node_modules/@playwright/test/cli.js"
  ].forEach((relPath) => writeFile(tempRoot, relPath, fakeNodeScript(relPath)));

  writeFile(
    tempRoot,
    "scripts/export-store-assets.ps1",
    "Write-Output 'store assets ok'\n"
  );
  writeFile(
    tempRoot,
    "fake-powershell.js",
    `
const fs = require("fs");
const path = require("path");
fs.appendFileSync(path.join(process.cwd(), "preflight-log.jsonl"), JSON.stringify({
  name: "powershell",
  argv: process.argv.slice(2)
}) + "\\n");
`
  );
  writeFile(
    tempRoot,
    "powershell.cmd",
    '@echo off\r\nnode "%~dp0fake-powershell.js" %*\r\n'
  );
  return tempRoot;
}

function runPreflight(tempRoot, args = []) {
  return spawnSync(
    process.execPath,
    [path.join(tempRoot, "scripts", "release-preflight.cjs"), ...args],
    {
      cwd: tempRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${tempRoot}${path.delimiter}${process.env.PATH || ""}`
      }
    }
  );
}

function readLog(tempRoot) {
  return fs
    .readFileSync(path.join(tempRoot, "preflight-log.jsonl"), "utf8")
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
}

describe("release preflight", () => {
  it("runs normal preflight without writing strict evidence", () => {
    const tempRoot = createPreflightRoot();

    const result = runPreflight(tempRoot);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/preflight passed/);
    expect(fs.existsSync(path.join(tempRoot, "tmp/spec/strict-preflight"))).toBe(false);

    const names = readLog(tempRoot).map((entry) => entry.name);
    expect(names).toEqual([
      "scripts/scan-release.cjs",
      "scripts/audit-full-surface.cjs",
      "scripts/inventory-ui-routes.cjs",
      "scripts/validate-v1-ui-surface.cjs",
      "scripts/validate-v1-feature-matrix.cjs",
      "node_modules/jest/bin/jest.js",
      "node_modules/@playwright/test/cli.js",
      "scripts/export-production-web.cjs"
    ]);
    expect(readLog(tempRoot)[5].argv).toEqual(
      expect.arrayContaining([
        "tests/release.scan.test.js",
        "tests/release.go-no-go.test.js",
        "tests/release.record-evidence.test.js",
        "tests/release.preflight.test.js",
        "tests/release.live-urls.test.js",
        "tests/release.sentry-dsn.test.js",
        "tests/release.data-rights.test.js",
        "tests/release.production-builds.test.js",
        "tests/release.machine-gates.test.js",
        "tests/release.store-assets.test.js"
      ])
    );
  });

  it("runs strict checks before writing strict evidence", () => {
    const tempRoot = createPreflightRoot();

    const result = runPreflight(tempRoot, ["--strict"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/strict preflight passed/);
    expect(result.stdout).toMatch(/strict evidence/);

    const log = readLog(tempRoot);
    expect(log.map((entry) => entry.name)).toEqual([
      "scripts/scan-release.cjs",
      "scripts/audit-full-surface.cjs",
      "scripts/scan-release.cjs",
      "scripts/verify-sentry-dsn.cjs",
      "scripts/verify-live-urls.cjs",
      "scripts/inventory-ui-routes.cjs",
      "scripts/validate-v1-ui-surface.cjs",
      "scripts/validate-v1-feature-matrix.cjs",
      "node_modules/jest/bin/jest.js",
      "node_modules/@playwright/test/cli.js",
      "scripts/export-production-web.cjs"
    ]);
    expect(log[2].strict).toBe("1");
    expect(log[8].argv).toEqual(
      expect.arrayContaining([
        "tests/release.scan.test.js",
        "tests/release.go-no-go.test.js",
        "tests/release.record-evidence.test.js",
        "tests/release.preflight.test.js",
        "tests/release.live-urls.test.js",
        "tests/release.sentry-dsn.test.js",
        "tests/release.data-rights.test.js",
        "tests/release.production-builds.test.js",
        "tests/release.machine-gates.test.js",
        "tests/release.store-assets.test.js"
      ])
    );
    expect(log[9]).toEqual(
      expect.objectContaining({
        playwrightPort: "19025",
        playwrightVideo: "1"
      })
    );

    const evidenceDir = path.join(tempRoot, "tmp/spec/strict-preflight");
    const files = fs.readdirSync(evidenceDir).filter((file) => file.endsWith(".json"));
    expect(files).toHaveLength(1);
    const evidence = JSON.parse(
      fs.readFileSync(path.join(evidenceDir, files[0]), "utf8")
    );
    expect(evidence).toEqual(
      expect.objectContaining({
        status: "passed",
        command: "npm.cmd run release:preflight:strict"
      })
    );
    expect(typeof evidence.checkedAt).toBe("string");
  });
});
