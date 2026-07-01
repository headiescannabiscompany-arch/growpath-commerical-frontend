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

function createLiveUrlRoot(easEnv = {}) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-live-urls-"));
  fs.mkdirSync(path.join(tempRoot, "scripts"), { recursive: true });
  fs.copyFileSync(
    path.join(root, "scripts", "verify-live-urls.cjs"),
    path.join(tempRoot, "scripts", "verify-live-urls.cjs")
  );
  writeFile(
    tempRoot,
    "eas.json",
    `${JSON.stringify(
      {
        build: {
          production: {
            env: {
              EXPO_PUBLIC_API_URL: "https://api.growpathai.com",
              EXPO_PUBLIC_PRIVACY_URL: "https://growpathai.com/privacy",
              EXPO_PUBLIC_TERMS_URL: "https://growpathai.com/terms",
              EXPO_PUBLIC_SUPPORT_URL: "https://growpathai.com/support",
              EXPO_PUBLIC_DELETE_ACCOUNT_URL: "https://growpathai.com/account/delete",
              ...easEnv
            }
          }
        }
      },
      null,
      2
    )}\n`
  );
  return tempRoot;
}

function runVerifier(tempRoot, args = [], env = {}) {
  return spawnSync(
    process.execPath,
    [path.join(tempRoot, "scripts", "verify-live-urls.cjs"), ...args],
    {
      cwd: tempRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        EXPO_PUBLIC_API_URL: "",
        EXPO_PUBLIC_PRIVACY_URL: "",
        EXPO_PUBLIC_TERMS_URL: "",
        EXPO_PUBLIC_SUPPORT_URL: "",
        EXPO_PUBLIC_DELETE_ACCOUNT_URL: "",
        ...env
      }
    }
  );
}

function runVerifierWithMockFetch(tempRoot) {
  writeFile(
    tempRoot,
    "run-with-fetch-mock.cjs",
    `
global.fetch = async (url, options = {}) => {
  const fs = require("fs");
  const path = require("path");
  fs.appendFileSync(path.join(process.cwd(), "fetch-log.jsonl"), JSON.stringify({
    url,
    method: options.method
  }) + "\\n");
  return {
    status: 200,
    ok: true,
    url,
    arrayBuffer: async () => new ArrayBuffer(0)
  };
};
require("./scripts/verify-live-urls.cjs");
`
  );
  return spawnSync(process.execPath, [path.join(tempRoot, "run-with-fetch-mock.cjs")], {
    cwd: tempRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      EXPO_PUBLIC_API_URL: "",
      EXPO_PUBLIC_PRIVACY_URL: "",
      EXPO_PUBLIC_TERMS_URL: "",
      EXPO_PUBLIC_SUPPORT_URL: "",
      EXPO_PUBLIC_DELETE_ACCOUNT_URL: ""
    }
  });
}

function latestEvidence(tempRoot) {
  const dir = path.join(tempRoot, "tmp/spec/live-url-checks");
  const files = fs.readdirSync(dir).filter((file) => file.endsWith(".json"));
  expect(files).toHaveLength(1);
  return JSON.parse(fs.readFileSync(path.join(dir, files[0]), "utf8"));
}

describe("live URL verifier", () => {
  it("accepts production https configuration in dry-run mode", () => {
    const tempRoot = createLiveUrlRoot();

    const result = runVerifier(tempRoot, ["--dry-run"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Live URL dry run passed/);
    expect(result.stdout).toContain("[live-url] configured privacy: https://growpathai.com/privacy");
  });

  it("rejects local production API URLs before network checks", () => {
    const tempRoot = createLiveUrlRoot({
      EXPO_PUBLIC_API_URL: "http://127.0.0.1:5002"
    });

    const result = runVerifier(tempRoot, ["--dry-run"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/api-health must be production https/);
    expect(fs.existsSync(path.join(tempRoot, "tmp/spec/live-url-checks"))).toBe(false);
  });

  it("rejects placeholder public legal URLs before network checks", () => {
    const tempRoot = createLiveUrlRoot({
      EXPO_PUBLIC_PRIVACY_URL: "https://example.com/privacy"
    });

    const result = runVerifier(tempRoot, ["--dry-run"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/privacy must be production https/);
    expect(fs.existsSync(path.join(tempRoot, "tmp/spec/live-url-checks"))).toBe(false);
  });

  it("writes passed evidence after all required URLs respond", () => {
    const tempRoot = createLiveUrlRoot();

    const result = runVerifierWithMockFetch(tempRoot);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Live URL verification passed/);

    const evidence = latestEvidence(tempRoot);
    expect(evidence.status).toBe("passed");
    expect(typeof evidence.checkedAt).toBe("string");
    expect(evidence.results.map((entry) => entry.name)).toEqual([
      "privacy",
      "terms",
      "support",
      "delete-account",
      "api-health",
      "api-ready",
      "api-health-api"
    ]);

    const fetchLog = fs
      .readFileSync(path.join(tempRoot, "fetch-log.jsonl"), "utf8")
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
    expect(fetchLog).toHaveLength(7);
    expect(fetchLog.every((entry) => entry.method === "HEAD")).toBe(true);
  });
});
