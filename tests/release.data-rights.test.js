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

function createDataRightsRoot() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-data-rights-"));
  fs.mkdirSync(path.join(tempRoot, "scripts"), { recursive: true });
  fs.copyFileSync(
    path.join(root, "scripts", "verify-data-rights-live.cjs"),
    path.join(tempRoot, "scripts", "verify-data-rights-live.cjs")
  );
  return tempRoot;
}

function baseEnv(overrides = {}) {
  return {
    ...process.env,
    GROWPATH_DATA_RIGHTS_API_URL: "https://api.growpathai.com",
    GROWPATH_DATA_RIGHTS_EMAIL: "qa-disposable@example.com",
    GROWPATH_DATA_RIGHTS_PASSWORD: "correct-password",
    GROWPATH_DATA_RIGHTS_CONFIRM: "DELETE_DISPOSABLE_ACCOUNT:qa-disposable@example.com",
    GROWPATH_ALLOW_INSECURE_DATA_RIGHTS_URL: "",
    EXPO_PUBLIC_API_URL: "",
    ...overrides
  };
}

function runVerifier(tempRoot, env = {}) {
  return spawnSync(
    process.execPath,
    [path.join(tempRoot, "scripts", "verify-data-rights-live.cjs")],
    {
      cwd: tempRoot,
      encoding: "utf8",
      env: baseEnv(env)
    }
  );
}

function runVerifierWithMockFetch(tempRoot, responses, env = {}) {
  writeFile(
    tempRoot,
    "run-with-fetch-mock.cjs",
    `
const responses = ${JSON.stringify(responses)};
let index = 0;
global.fetch = async (url, options = {}) => {
  const fs = require("fs");
  const path = require("path");
  fs.appendFileSync(path.join(process.cwd(), "fetch-log.jsonl"), JSON.stringify({
    url,
    method: options.method || "GET",
    headers: options.headers,
    body: options.body ? JSON.parse(options.body) : null
  }) + "\\n");
  const next = responses[index++] || { ok: false, status: 500, body: { error: "missing mock" } };
  return {
    ok: next.ok,
    status: next.status,
    text: async () => next.text !== undefined ? next.text : JSON.stringify(next.body || {}),
    headers: {
      get: (name) => next.requestId && String(name).toLowerCase() === "x-request-id"
        ? next.requestId
        : null
    }
  };
};
require("./scripts/verify-data-rights-live.cjs");
`
  );
  return spawnSync(process.execPath, [path.join(tempRoot, "run-with-fetch-mock.cjs")], {
    cwd: tempRoot,
    encoding: "utf8",
    env: baseEnv(env)
  });
}

function evidenceBody(tempRoot) {
  const dir = path.join(tempRoot, "tmp/spec/data-rights-live");
  const files = fs.readdirSync(dir).filter((file) => file.endsWith(".json"));
  expect(files).toHaveLength(1);
  return JSON.parse(fs.readFileSync(path.join(dir, files[0]), "utf8"));
}

describe("data-rights live verifier", () => {
  it("requires an exact disposable-account deletion confirmation", () => {
    const tempRoot = createDataRightsRoot();

    const result = runVerifier(tempRoot, {
      GROWPATH_DATA_RIGHTS_CONFIRM: "DELETE_DISPOSABLE_ACCOUNT:someone-else@example.com"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Refusing to delete account/);
    expect(fs.existsSync(path.join(tempRoot, "tmp/spec/data-rights-live"))).toBe(false);
  });

  it("requires https unless the local validation override is explicit", () => {
    const tempRoot = createDataRightsRoot();

    const result = runVerifier(tempRoot, {
      GROWPATH_DATA_RIGHTS_API_URL: "http://127.0.0.1:5002"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/requires https/);
    expect(fs.existsSync(path.join(tempRoot, "tmp/spec/data-rights-live"))).toBe(false);
  });

  it("fails if login does not return a token", () => {
    const tempRoot = createDataRightsRoot();

    const result = runVerifierWithMockFetch(tempRoot, [
      { ok: true, status: 200, body: { user: { id: "u1" } }, requestId: "req-login" }
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/login did not return a token/);
    expect(fs.existsSync(path.join(tempRoot, "tmp/spec/data-rights-live"))).toBe(false);
  });

  it("fails if post-delete login still succeeds", () => {
    const tempRoot = createDataRightsRoot();

    const result = runVerifierWithMockFetch(tempRoot, [
      { ok: true, status: 200, body: { token: "token-1" }, requestId: "req-login" },
      { ok: true, status: 200, body: { profile: { id: "u1" } }, requestId: "req-export" },
      { ok: true, status: 200, body: { deleted: true }, requestId: "req-delete" },
      { ok: true, status: 200, body: { token: "token-2" }, requestId: "req-post-delete" }
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/post-delete login still succeeded/);
    expect(fs.existsSync(path.join(tempRoot, "tmp/spec/data-rights-live"))).toBe(false);
  });

  it("writes redacted passed evidence after export, delete, and failed post-delete login", () => {
    const tempRoot = createDataRightsRoot();

    const result = runVerifierWithMockFetch(tempRoot, [
      { ok: true, status: 200, body: { token: "token-1" }, requestId: "req-login" },
      {
        ok: true,
        status: 200,
        body: { profile: { id: "u1" }, grows: [], logs: [] },
        requestId: "req-export"
      },
      { ok: true, status: 204, text: "", requestId: "req-delete" },
      { ok: false, status: 401, body: { error: "deleted" }, requestId: "req-post-delete" }
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Data-rights live verification passed/);

    const evidence = evidenceBody(tempRoot);
    expect(evidence).toEqual(
      expect.objectContaining({
        status: "passed",
        apiBaseUrl: "https://api.growpathai.com",
        account: "qa***@example.com",
        loginStatus: 200,
        exportStatus: 200,
        deleteStatus: 204,
        postDeleteLoginStatus: 401,
        exportTopLevelKeys: ["grows", "logs", "profile"],
        requestIds: {
          login: "req-login",
          export: "req-export",
          delete: "req-delete",
          postDeleteLogin: "req-post-delete"
        }
      })
    );
    expect(typeof evidence.startedAt).toBe("string");
    expect(typeof evidence.completedAt).toBe("string");
    expect(JSON.stringify(evidence)).not.toContain("qa-disposable@example.com");
    expect(JSON.stringify(evidence)).not.toContain("correct-password");

    const fetchLog = fs
      .readFileSync(path.join(tempRoot, "fetch-log.jsonl"), "utf8")
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
    expect(fetchLog.map((entry) => [entry.method, entry.url])).toEqual([
      ["POST", "https://api.growpathai.com/api/auth/login"],
      ["GET", "https://api.growpathai.com/api/account/export"],
      ["DELETE", "https://api.growpathai.com/api/account/delete"],
      ["POST", "https://api.growpathai.com/api/auth/login"]
    ]);
    expect(fetchLog[1].headers.Authorization).toBe("Bearer token-1");
    expect(fetchLog[2].body).toEqual({ reason: "release_data_rights_verification" });
  });
});
