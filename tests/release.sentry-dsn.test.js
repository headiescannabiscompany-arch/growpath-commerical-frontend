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

function createSentryRoot() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-sentry-dsn-"));
  fs.mkdirSync(path.join(tempRoot, "scripts"), { recursive: true });
  fs.copyFileSync(
    path.join(root, "scripts", "verify-sentry-dsn.cjs"),
    path.join(tempRoot, "scripts", "verify-sentry-dsn.cjs")
  );
  return tempRoot;
}

function runVerifier(tempRoot, env = {}) {
  return spawnSync(process.execPath, [path.join(tempRoot, "scripts", "verify-sentry-dsn.cjs")], {
    cwd: tempRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      EXPO_PUBLIC_SENTRY_DSN: "",
      SENTRY_DSN: "",
      GROWPATH_RELEASE_ENV: "",
      ...env
    }
  });
}

function runVerifierWithMockFetch(tempRoot, { ok = true, status = 200, body = "" } = {}) {
  writeFile(
    tempRoot,
    "run-with-fetch-mock.cjs",
    `
global.fetch = async (url, options = {}) => {
  const fs = require("fs");
  const path = require("path");
  fs.writeFileSync(path.join(process.cwd(), "fetch-call.json"), JSON.stringify({
    url,
    method: options.method,
    headers: options.headers,
    body: JSON.parse(options.body)
  }, null, 2));
  return {
    ok: ${JSON.stringify(ok)},
    status: ${JSON.stringify(status)},
    text: async () => ${JSON.stringify(body)}
  };
};
require("./scripts/verify-sentry-dsn.cjs");
`
  );
  return spawnSync(process.execPath, [path.join(tempRoot, "run-with-fetch-mock.cjs")], {
    cwd: tempRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      EXPO_PUBLIC_SENTRY_DSN: "https://public%20key@sentry.example.com/42",
      SENTRY_DSN: "",
      GROWPATH_RELEASE_ENV: "production"
    }
  });
}

describe("Sentry DSN verifier", () => {
  it("requires a configured DSN", () => {
    const tempRoot = createSentryRoot();

    const result = runVerifier(tempRoot);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Missing EXPO_PUBLIC_SENTRY_DSN/);
  });

  it("rejects non-https DSNs", () => {
    const tempRoot = createSentryRoot();

    const result = runVerifier(tempRoot, {
      EXPO_PUBLIC_SENTRY_DSN: "http://public@sentry.example.com/42"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Sentry DSN must use https/);
  });

  it("rejects DSNs without a numeric project id", () => {
    const tempRoot = createSentryRoot();

    const result = runVerifier(tempRoot, {
      EXPO_PUBLIC_SENTRY_DSN: "https://public@sentry.example.com/project"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/numeric project id/);
  });

  it("fails when Sentry rejects the verification event", () => {
    const tempRoot = createSentryRoot();

    const result = runVerifierWithMockFetch(tempRoot, {
      ok: false,
      status: 403,
      body: "forbidden"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Sentry event check failed with HTTP 403: forbidden/);
  });

  it("posts a release verification event to the DSN store endpoint", () => {
    const tempRoot = createSentryRoot();

    const result = runVerifierWithMockFetch(tempRoot);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Sentry DSN accepted release verification event for project 42/);

    const call = JSON.parse(fs.readFileSync(path.join(tempRoot, "fetch-call.json"), "utf8"));
    expect(call.url).toBe(
      "https://sentry.example.com/api/42/store/?sentry_key=public%20key&sentry_version=7"
    );
    expect(call.method).toBe("POST");
    expect(call.headers).toEqual(
      expect.objectContaining({
        "Content-Type": "application/json",
        "User-Agent": "growpath-release-preflight/1.0"
      })
    );
    expect(call.body).toEqual(
      expect.objectContaining({
        platform: "javascript",
        logger: "growpath-release-preflight",
        level: "info",
        environment: "production",
        message: "GrowPath release preflight Sentry DSN verification",
        tags: {
          verification: "release-preflight",
          app: "growpath"
        },
        extra: {
          source: "scripts/verify-sentry-dsn.cjs"
        }
      })
    );
    expect(call.body.event_id).toMatch(/^[a-f0-9]{32}$/);
  });
});
