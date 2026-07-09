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
    "scripts/validate-frontend-runtime-contract.cjs",
    "scripts/validate-backend-route-contract.cjs",
    "scripts/validate-v1-ui-surface.cjs",
    "scripts/validate-v1-feature-matrix.cjs",
    "scripts/inventory-ai-functions.cjs",
    "scripts/run-playwright-expo.cjs",
    "scripts/export-production-web.cjs",
    "scripts/verify-web-seo.cjs",
    "scripts/export-store-assets.cjs",
    "node_modules/jest/bin/jest.js",
    "node_modules/@playwright/test/cli.js"
  ].forEach((relPath) => writeFile(tempRoot, relPath, fakeNodeScript(relPath)));
  return tempRoot;
}

function runPreflight(tempRoot, args = []) {
  const env = { ...process.env };
  delete env.PLAYWRIGHT_WEB_PORT;
  return spawnSync(
    process.execPath,
    [path.join(tempRoot, "scripts", "release-preflight.cjs"), ...args],
    {
      cwd: tempRoot,
      encoding: "utf8",
      env: {
        ...env,
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
      "scripts/validate-frontend-runtime-contract.cjs",
      "scripts/validate-backend-route-contract.cjs",
      "scripts/validate-v1-ui-surface.cjs",
      "scripts/validate-v1-feature-matrix.cjs",
      "scripts/inventory-ai-functions.cjs",
      "node_modules/jest/bin/jest.js",
      "node_modules/jest/bin/jest.js",
      "scripts/run-playwright-expo.cjs",
      "scripts/export-production-web.cjs",
      "scripts/verify-web-seo.cjs",
      "scripts/export-store-assets.cjs"
    ]);
    expect(readLog(tempRoot)[8].argv).toEqual(
      expect.arrayContaining([
        "--config",
        "jest.backend.config.cjs",
        "backend/routes/tools.test.js",
        "backend/routes/cropKnowledge.test.js"
      ])
    );
    expect(readLog(tempRoot)[9].argv).toEqual(
      expect.arrayContaining([
        "tests/unit/cropKnowledge-api.test.ts",
        "tests/release.scan.test.js",
        "tests/release.go-no-go.test.js",
        "tests/release.record-evidence.test.js",
        "tests/release.preflight.test.js",
        "tests/contracts/v1.release.matrix.test.js",
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
      "scripts/validate-frontend-runtime-contract.cjs",
      "scripts/validate-backend-route-contract.cjs",
      "scripts/validate-v1-ui-surface.cjs",
      "scripts/validate-v1-feature-matrix.cjs",
      "scripts/inventory-ai-functions.cjs",
      "node_modules/jest/bin/jest.js",
      "node_modules/jest/bin/jest.js",
      "scripts/run-playwright-expo.cjs",
      "scripts/export-production-web.cjs",
      "scripts/verify-web-seo.cjs",
      "scripts/export-store-assets.cjs"
    ]);
    expect(log[2].strict).toBe("1");
    expect(log[11].argv).toEqual(
      expect.arrayContaining([
        "--config",
        "jest.backend.config.cjs",
        "backend/routes/tools.test.js",
        "backend/routes/cropKnowledge.test.js"
      ])
    );
    expect(log[12].argv).toEqual(
      expect.arrayContaining([
        "tests/unit/cropKnowledge-api.test.ts",
        "tests/release.scan.test.js",
        "tests/release.go-no-go.test.js",
        "tests/release.record-evidence.test.js",
        "tests/release.preflight.test.js",
        "tests/contracts/v1.release.matrix.test.js",
        "tests/release.live-urls.test.js",
        "tests/release.sentry-dsn.test.js",
        "tests/release.data-rights.test.js",
        "tests/release.production-builds.test.js",
        "tests/release.machine-gates.test.js",
        "tests/release.store-assets.test.js"
      ])
    );
    expect(log[13]).toEqual(
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
