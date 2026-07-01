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

function createBuildRoot({ failPlatform = "" } = {}) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-builds-"));
  fs.mkdirSync(path.join(tempRoot, "scripts"), { recursive: true });
  fs.copyFileSync(
    path.join(root, "scripts", "run-production-builds.cjs"),
    path.join(tempRoot, "scripts", "run-production-builds.cjs")
  );
  writeFile(
    tempRoot,
    "fake-npx.js",
    `
const fs = require("fs");
const path = require("path");
const platformIndex = process.argv.indexOf("--platform");
const platform = platformIndex >= 0 ? process.argv[platformIndex + 1] : "";
fs.appendFileSync(path.join(process.cwd(), "build-log.jsonl"), JSON.stringify({
  argv: process.argv.slice(2),
  platform
}) + "\\n");
if (platform === ${JSON.stringify(failPlatform)}) {
  console.error("simulated " + platform + " build failure");
  process.exit(42);
}
console.log("simulated " + platform + " build success");
`
  );
  const scriptPath = path.join(tempRoot, "scripts", "run-production-builds.cjs");
  const script = fs.readFileSync(scriptPath, "utf8");
  fs.writeFileSync(
    scriptPath,
    script.replace(
      /const npx = process\.platform === "win32" \? "npx\.cmd" : "npx";\r?\n  return \{\r?\n    command: npx,\r?\n    args: \["eas",/,
      'return {\n    command: process.execPath,\n    args: [path.join(ROOT, "fake-npx.js"), "eas",'
    )
  );
  writeFile(tempRoot, "npx.cmd", '@echo off\r\nnode "%~dp0fake-npx.js" %*\r\n');
  writeFile(tempRoot, "npx", '#!/usr/bin/env sh\nnode "$(dirname "$0")/fake-npx.js" "$@"\n');
  return tempRoot;
}

function runBuildScript(tempRoot, args = [], env = {}) {
  const testPath = `${tempRoot}${path.delimiter}${process.env.PATH || process.env.Path || ""}`;
  return spawnSync(
    process.execPath,
    [path.join(tempRoot, "scripts", "run-production-builds.cjs"), ...args],
    {
      cwd: tempRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: testPath,
        Path: testPath,
        GROWPATH_PRODUCTION_BUILD_CONFIRM: "",
        ...env
      }
    }
  );
}

function latestEvidence(tempRoot) {
  const dir = path.join(tempRoot, "tmp/spec/release-builds");
  const files = fs.readdirSync(dir).filter((file) => file.endsWith(".json"));
  expect(files).toHaveLength(1);
  return JSON.parse(fs.readFileSync(path.join(dir, files[0]), "utf8"));
}

describe("production build runner", () => {
  it("prints production build commands in dry-run mode without evidence", () => {
    const tempRoot = createBuildRoot();

    const result = runBuildScript(tempRoot);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/\[release-builds\] dry run/);
    expect(result.stdout).toMatch(/--profile production --platform ios --non-interactive/);
    expect(result.stdout).toMatch(/--profile production --platform android --non-interactive/);
    expect(fs.existsSync(path.join(tempRoot, "tmp/spec/release-builds"))).toBe(false);
  });

  it("refuses execute mode without explicit production confirmation", () => {
    const tempRoot = createBuildRoot();

    const result = runBuildScript(tempRoot, ["--execute"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Refusing to run production builds/);
    expect(fs.existsSync(path.join(tempRoot, "build-log.jsonl"))).toBe(false);
    expect(fs.existsSync(path.join(tempRoot, "tmp/spec/release-builds"))).toBe(false);
  });

  it("writes passed evidence for successful iOS and Android builds", () => {
    const tempRoot = createBuildRoot();

    const result = runBuildScript(tempRoot, ["--execute"], {
      GROWPATH_PRODUCTION_BUILD_CONFIRM: "BUILD_PRODUCTION_GROWPATH"
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/release-builds.*evidence/);

    const buildLog = fs
      .readFileSync(path.join(tempRoot, "build-log.jsonl"), "utf8")
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
    expect(buildLog.map((entry) => entry.platform)).toEqual(["ios", "android"]);

    const evidence = latestEvidence(tempRoot);
    expect(evidence).toEqual(
      expect.objectContaining({
        status: "passed",
        profile: "production",
        platforms: ["ios", "android"]
      })
    );
    expect(evidence.results).toEqual([
      expect.objectContaining({
        platform: "ios",
        status: 0,
        error: null
      }),
      expect.objectContaining({
        platform: "android",
        status: 0,
        error: null
      })
    ]);
    expect(evidence.results[0].command).toMatch(/eas build --profile production --platform ios/);
    expect(typeof evidence.startedAt).toBe("string");
    expect(typeof evidence.completedAt).toBe("string");
  });

  it("writes failed evidence and exits nonzero when a build fails", () => {
    const tempRoot = createBuildRoot({ failPlatform: "android" });

    const result = runBuildScript(tempRoot, ["--execute"], {
      GROWPATH_PRODUCTION_BUILD_CONFIRM: "BUILD_PRODUCTION_GROWPATH"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/android production build failed/);

    const evidence = latestEvidence(tempRoot);
    expect(evidence.status).toBe("failed");
    expect(evidence.results).toEqual([
      expect.objectContaining({ platform: "ios", status: 0 }),
      expect.objectContaining({
        platform: "android",
        status: 42,
        stderrTail: expect.stringContaining("simulated android build failure")
      })
    ]);
  });

  it("supports platform-scoped execute evidence", () => {
    const tempRoot = createBuildRoot();

    const result = runBuildScript(tempRoot, ["--execute", "--ios-only"], {
      GROWPATH_PRODUCTION_BUILD_CONFIRM: "BUILD_PRODUCTION_GROWPATH"
    });

    expect(result.status).toBe(0);
    const evidence = latestEvidence(tempRoot);
    expect(evidence.status).toBe("passed");
    expect(evidence.platforms).toEqual(["ios"]);
    expect(evidence.results).toEqual([expect.objectContaining({ platform: "ios", status: 0 })]);
  });
});
