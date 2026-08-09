const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const LOCK_PATH = path.join(ROOT, "package-lock.json");
const HIGH_SEVERITIES = new Set(["high", "critical"]);

const IMAGE_SIZE_EXCEPTION = {
  expires: "2026-09-08",
  installedVersion: "1.2.1",
  advisoryIds: new Set(["GHSA-w3rx-r6r6-pgpr", "GHSA-5p2g-fcmc-qvqq"]),
  packages: new Set([
    "image-size",
    "metro",
    "metro-config",
    "metro-transform-worker",
    "@expo/metro",
    "@expo/metro-config",
    "@expo/cli",
    "@expo/config",
    "@expo/config-plugins",
    "@expo/prebuild-config",
    "@react-native/community-cli-plugin",
    "react-native",
    "@shopify/react-native-skia",
    "expo",
    "expo-asset",
    "expo-constants",
    "expo-dev-client",
    "expo-dev-launcher",
    "expo-linking",
    "expo-manifests",
    "expo-notifications",
    "expo-router"
  ])
};

function advisoryId(entry) {
  if (!entry || typeof entry !== "object" || typeof entry.url !== "string") return null;
  return entry.url.match(/GHSA-[a-z0-9-]+/i)?.[0]?.toUpperCase() || null;
}

function loadAuditReport() {
  const result = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["audit", "--omit=dev", "--audit-level=high", "--json"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }
  );

  const raw = result.stdout?.trim();
  if (!raw) {
    process.stderr.write(result.stderr || "npm audit returned no JSON output.\n");
    process.exit(result.status || 1);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    process.stderr.write(`Unable to parse npm audit JSON: ${error.message}\n`);
    process.stderr.write(result.stderr || "");
    process.exit(1);
  }
}

function validateExceptionPreconditions() {
  const today = new Date().toISOString().slice(0, 10);
  if (today > IMAGE_SIZE_EXCEPTION.expires) {
    throw new Error(
      `The image-size audit exception expired on ${IMAGE_SIZE_EXCEPTION.expires}. Re-review upstream advisories and Expo/Metro before extending it.`
    );
  }

  const lock = JSON.parse(fs.readFileSync(LOCK_PATH, "utf8"));
  const installed = lock.packages?.["node_modules/image-size"]?.version;
  if (installed !== IMAGE_SIZE_EXCEPTION.installedVersion) {
    throw new Error(
      `The image-size audit exception was reviewed for ${IMAGE_SIZE_EXCEPTION.installedVersion}, but package-lock contains ${installed || "no version"}.`
    );
  }
}

function classify(report) {
  const vulnerabilities = report.vulnerabilities || {};
  const relevant = Object.entries(vulnerabilities).filter(([, value]) =>
    HIGH_SEVERITIES.has(String(value?.severity || "").toLowerCase())
  );
  const allowed = new Set();

  const direct = vulnerabilities["image-size"];
  const directIds = (direct?.via || []).map(advisoryId).filter(Boolean);
  const uniqueDirectIds = new Set(directIds);
  const directHasOnlyReviewedAdvisories =
    direct &&
    uniqueDirectIds.size === IMAGE_SIZE_EXCEPTION.advisoryIds.size &&
    [...uniqueDirectIds].every((id) => IMAGE_SIZE_EXCEPTION.advisoryIds.has(id)) &&
    [...IMAGE_SIZE_EXCEPTION.advisoryIds].every((id) => uniqueDirectIds.has(id));

  if (directHasOnlyReviewedAdvisories) allowed.add("image-size");

  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, value] of relevant) {
      if (allowed.has(name) || !IMAGE_SIZE_EXCEPTION.packages.has(name)) continue;
      const via = value.via || [];
      const objectIds = via.map(advisoryId).filter(Boolean);
      const dependencyNames = via.filter((entry) => typeof entry === "string");
      const objectsAllowed = objectIds.every((id) =>
        IMAGE_SIZE_EXCEPTION.advisoryIds.has(id)
      );
      const dependenciesAllowed =
        dependencyNames.length > 0 &&
        dependencyNames.some((dep) => allowed.has(dep)) &&
        dependencyNames.every((dep) => IMAGE_SIZE_EXCEPTION.packages.has(dep));
      if (objectsAllowed && dependenciesAllowed) {
        allowed.add(name);
        changed = true;
      }
    }
  }

  return {
    allowed: relevant.filter(([name]) => allowed.has(name)),
    blocked: relevant.filter(([name]) => !allowed.has(name))
  };
}

try {
  validateExceptionPreconditions();
  const report = loadAuditReport();
  const { allowed, blocked } = classify(report);

  if (blocked.length > 0) {
    console.error(
      "Production dependency audit found unapproved high/critical vulnerabilities:"
    );
    for (const [name, value] of blocked) {
      console.error(
        `- ${name}: ${value.severity} (${value.range || "range unavailable"})`
      );
    }
    if (blocked.some(([name]) => name === "image-size")) {
      console.error(
        `image-size advisory fields: ${JSON.stringify(
          (report.vulnerabilities?.["image-size"]?.via || []).map((entry) =>
            typeof entry === "string"
              ? entry
              : {
                  source: entry.source,
                  name: entry.name,
                  title: entry.title,
                  url: entry.url
                }
          )
        )}`
      );
    }
    process.exit(1);
  }

  if (allowed.length > 0) {
    console.warn(
      `Production audit passed with one reviewed upstream exception: image-size ${IMAGE_SIZE_EXCEPTION.installedVersion} (${[
        ...IMAGE_SIZE_EXCEPTION.advisoryIds
      ].join(", ")}), expiring ${IMAGE_SIZE_EXCEPTION.expires}.`
    );
    console.warn(
      `Affected build-tool dependency chain: ${allowed
        .map(([name]) => name)
        .sort()
        .join(", ")}`
    );
  } else {
    console.log(
      "Production dependency audit passed with no high/critical vulnerabilities."
    );
  }
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
