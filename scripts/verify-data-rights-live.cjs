#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_API_URL = "https://api.growpathai.com";

function env(name) {
  return String(process.env[name] || "").trim();
}

function requireEnv(name) {
  const value = env(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function apiBaseUrl() {
  const raw =
    env("GROWPATH_DATA_RIGHTS_API_URL") ||
    env("EXPO_PUBLIC_API_URL") ||
    DEFAULT_API_URL;
  const url = new URL(raw);
  if (url.protocol !== "https:" && env("GROWPATH_ALLOW_INSECURE_DATA_RIGHTS_URL") !== "1") {
    throw new Error(
      "Data-rights verification requires https. Set GROWPATH_ALLOW_INSECURE_DATA_RIGHTS_URL=1 only for local backend validation."
    );
  }
  return raw.replace(/\/$/, "");
}

function assertDisposableAccount(email) {
  const confirm = requireEnv("GROWPATH_DATA_RIGHTS_CONFIRM");
  const expected = `DELETE_DISPOSABLE_ACCOUNT:${email}`;
  if (confirm !== expected) {
    throw new Error(
      `Refusing to delete account. Set GROWPATH_DATA_RIGHTS_CONFIRM=${expected} for this disposable account.`
    );
  }
}

function redactEmail(email) {
  const [name, domain] = String(email).split("@");
  if (!domain) return "<email>";
  return `${name.slice(0, 2)}***@${domain}`;
}

async function requestJson(baseUrl, route, options = {}) {
  const res = await fetch(`${baseUrl}${route}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { text };
    }
  }

  return {
    ok: res.ok,
    status: res.status,
    body,
    requestId: res.headers.get("x-request-id") || null
  };
}

function assertOk(step, result) {
  if (!result.ok) {
    throw new Error(`${step} failed with HTTP ${result.status}`);
  }
}

function writeEvidence(summary) {
  const outputDir = path.join(ROOT, "tmp", "spec", "data-rights-live");
  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(outputDir, `${stamp}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
  return path.relative(ROOT, outputPath);
}

async function main() {
  const baseUrl = apiBaseUrl();
  const email = requireEnv("GROWPATH_DATA_RIGHTS_EMAIL");
  const password = requireEnv("GROWPATH_DATA_RIGHTS_PASSWORD");
  assertDisposableAccount(email);

  const startedAt = new Date().toISOString();
  const login = await requestJson(baseUrl, "/api/auth/login", {
    method: "POST",
    body: { email, password }
  });
  assertOk("login", login);

  const token = login.body?.token;
  if (!token) throw new Error("login did not return a token");

  const exported = await requestJson(baseUrl, "/api/account/export", { token });
  assertOk("account export", exported);
  if (!exported.body || typeof exported.body !== "object") {
    throw new Error("account export did not return a JSON object");
  }

  const deleted = await requestJson(baseUrl, "/api/account/delete", {
    method: "DELETE",
    token,
    body: { reason: "release_data_rights_verification" }
  });
  assertOk("account delete", deleted);

  const postDeleteLogin = await requestJson(baseUrl, "/api/auth/login", {
    method: "POST",
    body: { email, password }
  });
  if (postDeleteLogin.ok) {
    throw new Error("post-delete login still succeeded");
  }

  const summary = {
    status: "passed",
    startedAt,
    completedAt: new Date().toISOString(),
    apiBaseUrl: baseUrl,
    account: redactEmail(email),
    loginStatus: login.status,
    exportStatus: exported.status,
    deleteStatus: deleted.status,
    postDeleteLoginStatus: postDeleteLogin.status,
    exportTopLevelKeys: Object.keys(exported.body || {}).sort(),
    requestIds: {
      login: login.requestId,
      export: exported.requestId,
      delete: deleted.requestId,
      postDeleteLogin: postDeleteLogin.requestId
    }
  };

  const evidencePath = writeEvidence(summary);
  console.log(`Data-rights live verification passed. Evidence: ${evidencePath}`);
}

main().catch((err) => {
  console.error(`Data-rights live verification failed: ${err?.message || err}`);
  process.exit(1);
});
