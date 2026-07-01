#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SEARCH_ROOTS = [
  "app.json",
  "eas.json",
  "src"
];
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".json"]);

const allowedLocalUrlFiles = new Map([
  [
    path.normalize("src/api/apiRequest.ts"),
    "Development fallback is gated out of production."
  ],
  [
    path.normalize("src/screens/LiveSessionTwitchEmbed.js"),
    "Twitch embed localhost value is returned only for non-production."
  ]
]);

const checks = [
  {
    name: "OpenAI secret key",
    pattern: /sk-[A-Za-z0-9_-]{20,}/g
  },
  {
    name: "Google API key",
    pattern: /AIza[0-9A-Za-z_-]{20,}/g
  },
  {
    name: "private key material",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/g
  },
  {
    name: "client secret assignment",
    pattern: /\bclient_secret\b\s*[:=]\s*["'][^"']{8,}["']/gi
  },
  {
    name: "refresh token assignment",
    pattern: /\brefresh_token\b\s*[:=]\s*["'][^"']{8,}["']/gi
  },
  {
    name: "hardcoded local URL",
    pattern: /https?:\/\/(?:localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(?::\d+)?/g,
    allowFile: (rel) => allowedLocalUrlFiles.has(rel)
  },
  {
    name: "auth debug logging",
    pattern: /Authorization preview|Authorization header present|\[API\] Login (?:request|error)|passwordLength/g
  },
  {
    name: "legacy privacy API endpoint",
    pattern: /\/api\/privacy\/(?:export|delete)\b/g
  },
  {
    name: "public environment variable exposes secret-like value",
    pattern: /\bEXPO_PUBLIC_[A-Z0-9_]*(?:SECRET|PRIVATE|TOKEN|PASSWORD|CLIENT_SECRET)[A-Z0-9_]*\b/g
  }
];

const releaseLinks = [
  {
    name: "Privacy URL",
    env: "EXPO_PUBLIC_PRIVACY_URL",
    extra: "PRIVACY_URL",
    fallback: "https://growpathai.com/privacy"
  },
  {
    name: "Terms URL",
    env: "EXPO_PUBLIC_TERMS_URL",
    extra: "TERMS_URL",
    fallback: "https://growpathai.com/terms"
  },
  {
    name: "Support URL",
    env: "EXPO_PUBLIC_SUPPORT_URL",
    extra: "SUPPORT_URL",
    fallback: "https://growpathai.com/support"
  },
  {
    name: "Delete-account URL",
    env: "EXPO_PUBLIC_DELETE_ACCOUNT_URL",
    extra: "DELETE_ACCOUNT_URL",
    fallback: "https://growpathai.com/account/delete"
  }
];

const strictRelease = process.env.GROWPATH_STRICT_RELEASE === "1";

function readExpoExtra() {
  const appJsonPath = path.join(ROOT, "app.json");
  if (!fs.existsSync(appJsonPath)) return {};
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
    return appJson?.expo?.extra || {};
  } catch (err) {
    violations.push({
      file: "app.json",
      line: 1,
      check: "valid app.json",
      value: err?.message || String(err)
    });
    return {};
  }
}

function readEasProductionEnv() {
  const easPath = path.join(ROOT, "eas.json");
  if (!fs.existsSync(easPath)) return {};
  try {
    const easJson = JSON.parse(fs.readFileSync(easPath, "utf8"));
    return easJson?.build?.production?.env || {};
  } catch (err) {
    violations.push({
      file: "eas.json",
      line: 1,
      check: "valid eas.json",
      value: err?.message || String(err)
    });
    return {};
  }
}

function validateAndroidPermissions() {
  const appJsonPath = path.join(ROOT, "app.json");
  if (!fs.existsSync(appJsonPath)) return;

  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
    const permissions = appJson?.expo?.android?.permissions || [];
    const broadStorage = permissions.filter((permission) =>
      ["android.permission.READ_EXTERNAL_STORAGE", "android.permission.WRITE_EXTERNAL_STORAGE"].includes(
        permission
      )
    );

    for (const permission of broadStorage) {
      violations.push({
        file: "app.json",
        line: 1,
        check: "avoid broad Android storage permission",
        value: permission
      });
    }
  } catch (err) {
    violations.push({
      file: "app.json",
      line: 1,
      check: "valid app.json",
      value: err?.message || String(err)
    });
  }
}

function validateProductionHttpsUrl({ file, line = 1, check, value }) {
  if (!value) {
    violations.push({ file, line, check, value: "missing" });
    return;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    violations.push({ file, line, check, value });
    return;
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
    value.includes("TODO") ||
    value.includes("REPLACE_ME");

  if (parsed.protocol !== "https:" || isLocal || isPlaceholder) {
    violations.push({ file, line, check, value });
  }
}

function validateFrontendMonitoring(extra) {
  const dsn = String(process.env.EXPO_PUBLIC_SENTRY_DSN || extra.SENTRY_DSN || "");
  if (!strictRelease && !dsn) return;

  if (!dsn) {
    violations.push({
      file: "eas.json",
      line: 1,
      check: "frontend crash reporting DSN",
      value: "missing EXPO_PUBLIC_SENTRY_DSN"
    });
    return;
  }

  try {
    const parsed = new URL(dsn);
    if (parsed.protocol !== "https:" || parsed.hostname === "example.com") {
      throw new Error("invalid production DSN");
    }
  } catch {
    violations.push({
      file: "eas.json",
      line: 1,
      check: "frontend crash reporting DSN must be production https",
      value: dsn
    });
  }
}

function validateProductionApiUrl(easEnv) {
  const value = String(easEnv.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL || "");
  validateProductionHttpsUrl({
    file: "eas.json",
    check: "production API URL must be production https",
    value
  });
}

function validateReleaseLink(link, extra) {
  const value = String(process.env[link.env] || extra[link.extra] || link.fallback || "");
  validateProductionHttpsUrl({
    file: "src/config/config.ts",
    check: `${link.name} must be production https`,
    value
  });
}

function walk(target, files = []) {
  const absolute = path.join(ROOT, target);
  if (!fs.existsSync(absolute)) return files;
  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    if (SOURCE_EXTENSIONS.has(path.extname(absolute))) files.push(absolute);
    return files;
  }
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".expo") continue;
    const next = path.join(target, entry.name);
    if (entry.isDirectory()) walk(next, files);
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(path.join(ROOT, next));
    }
  }
  return files;
}

function lineFor(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

const violations = [];
const files = SEARCH_ROOTS.flatMap((root) => walk(root));
const expoExtra = readExpoExtra();
const easProductionEnv = readEasProductionEnv();

validateAndroidPermissions();
validateFrontendMonitoring(expoExtra);
validateProductionApiUrl(easProductionEnv);

for (const link of releaseLinks) {
  validateReleaseLink(link, expoExtra);
}

for (const file of files) {
  const rel = path.normalize(path.relative(ROOT, file));
  const text = fs.readFileSync(file, "utf8");

  for (const check of checks) {
    check.pattern.lastIndex = 0;
    let match;
    while ((match = check.pattern.exec(text))) {
      if (check.allowFile?.(rel)) continue;
      violations.push({
        file: rel,
        line: lineFor(text, match.index),
        check: check.name,
        value: match[0]
      });
    }
  }
}

if (violations.length) {
  console.error("Release scan failed:");
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} ${violation.check}: ${violation.value}`
    );
  }
  process.exit(1);
}

console.log(
  `Release scan passed. Checked ${files.length} files; local URL allowlist: ${allowedLocalUrlFiles.size}.`
);
