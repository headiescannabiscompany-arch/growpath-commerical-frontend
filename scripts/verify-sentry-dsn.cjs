#!/usr/bin/env node

const crypto = require("crypto");

function env(name) {
  return String(process.env[name] || "").trim();
}

function sentryDsn() {
  const dsn = env("EXPO_PUBLIC_SENTRY_DSN") || env("SENTRY_DSN");
  if (!dsn) throw new Error("Missing EXPO_PUBLIC_SENTRY_DSN");
  return dsn;
}

function parseDsn(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Sentry DSN is not a valid URL");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Sentry DSN must use https");
  }

  if (!parsed.username) {
    throw new Error("Sentry DSN is missing a public key");
  }

  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const projectId = pathParts.pop();
  if (!projectId || !/^\d+$/.test(projectId)) {
    throw new Error("Sentry DSN is missing a numeric project id");
  }

  const pathPrefix = pathParts.length ? `/${pathParts.join("/")}` : "";
  const storeUrl = `${parsed.protocol}//${parsed.host}${pathPrefix}/api/${projectId}/store/`;
  return {
    publicKey: decodeURIComponent(parsed.username),
    projectId,
    storeUrl
  };
}

function eventPayload() {
  return {
    event_id: crypto.randomBytes(16).toString("hex"),
    timestamp: new Date().toISOString(),
    platform: "javascript",
    logger: "growpath-release-preflight",
    level: "info",
    environment: env("GROWPATH_RELEASE_ENV") || "production",
    message: "GrowPath release preflight Sentry DSN verification",
    tags: {
      verification: "release-preflight",
      app: "growpath"
    },
    extra: {
      source: "scripts/verify-sentry-dsn.cjs"
    }
  };
}

async function main() {
  const dsn = parseDsn(sentryDsn());
  const response = await fetch(
    `${dsn.storeUrl}?sentry_key=${encodeURIComponent(dsn.publicKey)}&sentry_version=7`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "growpath-release-preflight/1.0"
      },
      body: JSON.stringify(eventPayload())
    }
  );

  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `Sentry event check failed with HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`
    );
  }

  console.log(
    `Sentry DSN accepted release verification event for project ${dsn.projectId}.`
  );
}

main().catch((err) => {
  console.error(`Sentry DSN verification failed: ${err?.message || err}`);
  process.exit(1);
});
