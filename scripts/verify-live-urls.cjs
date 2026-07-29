#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

function env(name) {
  return String(process.env[name] || "").trim();
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
}

function productionEnv() {
  const eas = readJson("eas.json");
  return eas?.build?.production?.env || {};
}

function urlFromEnv(name, fallback) {
  return env(name) || productionEnv()[name] || fallback;
}

function expectedUrls() {
  const apiBase = urlFromEnv("EXPO_PUBLIC_API_URL", "https://api.growpathai.com").replace(
    /\/$/,
    ""
  );
  return [
    {
      name: "privacy",
      url: urlFromEnv("EXPO_PUBLIC_PRIVACY_URL", "https://growpathai.com/privacy")
    },
    {
      name: "terms",
      url: urlFromEnv("EXPO_PUBLIC_TERMS_URL", "https://growpathai.com/terms")
    },
    {
      name: "support",
      url: urlFromEnv("EXPO_PUBLIC_SUPPORT_URL", "https://growpathai.com/support")
    },
    {
      name: "communities",
      url: "https://growpathai.com/communities"
    },
    {
      name: "personal-grow-deep-link",
      url: "https://growpathai.com/home/personal/grows/reload-check/journal"
    },
    {
      name: "delete-account",
      url: urlFromEnv(
        "EXPO_PUBLIC_DELETE_ACCOUNT_URL",
        "https://growpathai.com/account/delete"
      )
    },
    {
      name: "workspace-choice",
      url: "https://growpathai.com/account/workspace"
    },
    {
      name: "workspace-switch",
      url: "https://growpathai.com/account/mode"
    },
    { name: "api-health", url: `${apiBase}/health` },
    { name: "api-ready", url: `${apiBase}/ready` },
    { name: "api-health-api", url: `${apiBase}/api/health` }
  ];
}

function validateProductionUrl(entry) {
  let parsed;
  try {
    parsed = new URL(entry.url);
  } catch {
    throw new Error(`${entry.name} is not a valid URL: ${entry.url}`);
  }

  const host = parsed.hostname.toLowerCase();
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host);
  const isPlaceholder =
    host === "example.com" ||
    host.endsWith(".example.com") ||
    entry.url.includes("TODO") ||
    entry.url.includes("REPLACE_ME");

  if (parsed.protocol !== "https:" || isLocal || isPlaceholder) {
    throw new Error(`${entry.name} must be production https: ${entry.url}`);
  }
}

async function requestUrl(entry, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    try {
      const response = await fetch(entry.url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "growpath-release-url-verifier/1.0"
        }
      });
      await response.arrayBuffer();
      return {
        status: response.status,
        finalUrl: response.url || entry.url
      };
    } catch (err) {
      const fallback = requestUrlWithPowerShell(entry, method);
      if (fallback) return fallback;
      throw err;
    }
  } finally {
    clearTimeout(timeout);
  }
}

function requestUrlWithPowerShell(entry, method) {
  if (process.platform !== "win32") return null;

  const psUrl = entry.url.replace(/'/g, "''");
  const psMethod = method.replace(/'/g, "''");
  const command = [
    "$ProgressPreference='SilentlyContinue'",
    `$r=Invoke-WebRequest -Uri '${psUrl}' -Method '${psMethod}' -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 20`,
    "[Console]::WriteLine($r.StatusCode)"
  ].join("; ");

  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    { encoding: "utf8" }
  );

  const status = Number(String(result.stdout || "").trim());
  if (result.status === 0 && Number.isFinite(status)) {
    return {
      status,
      finalUrl: entry.url
    };
  }

  return null;
}

async function checkUrl(entry) {
  let result = await requestUrl(entry, "HEAD");
  if (result.status === 403 || result.status === 405) {
    result = await requestUrl(entry, "GET");
  }
  if (result.status < 200 || result.status >= 400) {
    throw new Error(`${entry.name} returned HTTP ${result.status}: ${entry.url}`);
  }
  console.log(`[live-url] OK ${result.status} ${entry.name}: ${entry.url}`);
  return {
    name: entry.name,
    url: entry.url,
    status: result.status,
    finalUrl: result.finalUrl
  };
}

function writeEvidence(results) {
  const outputDir = path.join(ROOT, "tmp", "spec", "live-url-checks");
  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(outputDir, `${stamp}.json`);
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(
      {
        status: "passed",
        checkedAt: new Date().toISOString(),
        results
      },
      null,
      2
    )}\n`
  );
  return path.relative(ROOT, outputPath);
}

async function main() {
  const urls = expectedUrls();
  urls.forEach(validateProductionUrl);

  if (dryRun) {
    urls.forEach((entry) =>
      console.log(`[live-url] configured ${entry.name}: ${entry.url}`)
    );
    console.log("Live URL dry run passed.");
    return;
  }

  const results = [];
  for (const entry of urls) {
    results.push(await checkUrl(entry));
  }
  const evidencePath = writeEvidence(results);
  console.log(`Live URL verification passed. Evidence: ${evidencePath}`);
}

main().catch((err) => {
  console.error(`Live URL verification failed: ${err?.message || err}`);
  process.exit(1);
});
