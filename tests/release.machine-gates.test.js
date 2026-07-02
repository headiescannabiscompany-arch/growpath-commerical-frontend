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

function createMachineRoot() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-release-machine-"));
  fs.mkdirSync(path.join(tempRoot, "scripts"), { recursive: true });
  fs.copyFileSync(
    path.join(root, "scripts", "run-release-machine-gates.cjs"),
    path.join(tempRoot, "scripts", "run-release-machine-gates.cjs")
  );
  const scriptPath = path.join(tempRoot, "scripts", "run-release-machine-gates.cjs");
  const script = fs.readFileSync(scriptPath, "utf8");
  fs.writeFileSync(
    scriptPath,
    script.replace(
      /"npm\.cmd", \[/g,
      'process.execPath, [require("path").join(process.cwd(), "fake-npm.js"), '
    )
  );
  writeFile(
    tempRoot,
    "fake-npm.js",
    `
const fs = require("fs");
const path = require("path");
fs.appendFileSync(path.join(process.cwd(), "release-machine-steps.txt"), process.argv.slice(2).join(" ") + "\\n");
`
  );
  return tempRoot;
}

function baseEnv(overrides = {}) {
  return {
    ...process.env,
    PATH: "",
    Path: "",
    EXPO_PUBLIC_SENTRY_DSN: "",
    SENTRY_DSN: "",
    GROWPATH_DATA_RIGHTS_EMAIL: "",
    GROWPATH_DATA_RIGHTS_PASSWORD: "",
    GROWPATH_DATA_RIGHTS_CONFIRM: "",
    GROWPATH_PRODUCTION_BUILD_CONFIRM: "",
    GROWPATH_RELEASE_MACHINE_CONFIRM: "",
    ...overrides
  };
}

function runMachine(tempRoot, args = [], env = {}) {
  const testPath = `${tempRoot}${path.delimiter}${process.env.PATH || process.env.Path || ""}`;
  return spawnSync(
    process.execPath,
    [path.join(tempRoot, "scripts", "run-release-machine-gates.cjs"), ...args],
    {
      cwd: tempRoot,
      encoding: "utf8",
      env: baseEnv({ PATH: testPath, Path: testPath, ...env })
    }
  );
}

const validEnv = {
  EXPO_PUBLIC_SENTRY_DSN: "https://public@sentry.example.com/1",
  GROWPATH_DATA_RIGHTS_EMAIL: "qa-disposable@example.com",
  GROWPATH_DATA_RIGHTS_PASSWORD: "password",
  GROWPATH_DATA_RIGHTS_CONFIRM: "DELETE_DISPOSABLE_ACCOUNT:qa-disposable@example.com",
  GROWPATH_PRODUCTION_BUILD_CONFIRM: "BUILD_PRODUCTION_GROWPATH",
  GROWPATH_RELEASE_MACHINE_CONFIRM: "RUN_RELEASE_MACHINE_GATES"
};

describe("release-machine gate runner", () => {
  it("prints missing real release-machine inputs and runs no steps", () => {
    const tempRoot = createMachineRoot();

    const result = runMachine(tempRoot);

    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(/planned execute order/);
    expect(result.stderr).toMatch(/EXPO_PUBLIC_SENTRY_DSN or SENTRY_DSN/);
    expect(result.stderr).toMatch(/GROWPATH_DATA_RIGHTS_EMAIL/);
    expect(result.stderr).toMatch(/GROWPATH_PRODUCTION_BUILD_CONFIRM/);
    expect(fs.existsSync(path.join(tempRoot, "release-machine-steps.txt"))).toBe(false);
  });

  it("requires explicit release-machine confirmation in execute mode", () => {
    const tempRoot = createMachineRoot();

    const result = runMachine(tempRoot, ["--execute"], {
      ...validEnv,
      GROWPATH_RELEASE_MACHINE_CONFIRM: ""
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/GROWPATH_RELEASE_MACHINE_CONFIRM=RUN_RELEASE_MACHINE_GATES/);
    expect(fs.existsSync(path.join(tempRoot, "release-machine-steps.txt"))).toBe(false);
  });

  it("runs strict preflight, data rights, builds, and final gate in order", () => {
    const tempRoot = createMachineRoot();

    const result = runMachine(tempRoot, ["--execute"], validEnv);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/automated release-machine gates passed/);
    const steps = fs
      .readFileSync(path.join(tempRoot, "release-machine-steps.txt"), "utf8")
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim());
    expect(steps).toEqual([
      "run release:preflight:strict",
      "run verify:data-rights:live",
      "run release:builds",
      "run release:go-no-go"
    ]);
  });
});
