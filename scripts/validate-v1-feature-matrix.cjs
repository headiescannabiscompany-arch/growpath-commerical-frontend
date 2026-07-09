"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BACKEND_ROOT = path.join(ROOT, "backend");
const MATRIX_PATH = path.join(ROOT, "docs", "product", "V1_FEATURE_BACKEND_MATRIX.json");
const UI_ROUTES_PATH = path.join(ROOT, "tmp", "spec", "ui-routes.json");
const BACKEND_ROUTES_JSON = path.join(ROOT, "tmp", "spec", "backend-routes.json");
const BACKEND_ROUTES_TXT = path.join(ROOT, "tmp", "spec", "backend-routes.txt");
const VALID_RELEASE_SCOPES = new Set(["v1", "post_v1", "internal", "removed"]);
const VALID_RELEASE_DECISIONS = new Set([
  "complete",
  "beta",
  "hide",
  "backlog",
  "remove"
]);
const VALID_ROW_STATUSES = new Set([
  "canonical",
  "compat_alias",
  "deprecated",
  "planned"
]);
const VALID_UI_MODES = new Set([
  "personal",
  "commercial",
  "facility",
  "public",
  "system",
  "unknown"
]);

function readJson(p) {
  const raw = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function readBackendRoutes() {
  if (fs.existsSync(BACKEND_ROUTES_JSON)) {
    const parsed = readJson(BACKEND_ROUTES_JSON);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.routes)) return parsed.routes;
  }
  if (fs.existsSync(BACKEND_ROUTES_TXT)) {
    return fs
      .readFileSync(BACKEND_ROUTES_TXT, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

function existsEvidencePath(p) {
  const normalized = String(p || "").replace(/\\/g, "/");
  if (!normalized) return false;
  if (normalized.startsWith("backend/")) {
    const relative = normalized.slice("backend/".length);
    if (fs.existsSync(path.join(BACKEND_ROOT, relative))) return true;
    if (relative.startsWith("tests/")) {
      return fs.existsSync(path.join(BACKEND_ROOT, relative.slice("tests/".length)));
    }
    return false;
  }
  return fs.existsSync(path.join(ROOT, normalized));
}

function toBackendRouteSignature(method, apiPath) {
  const normalizedPath = String(apiPath || "").replace(/:([A-Za-z0-9_]+)/g, ":$1");
  return `${String(method || "").toUpperCase()} ${normalizedPath}`;
}

function main() {
  const failures = [];
  const warnings = [];
  let autoMissingUiCount = 0;

  if (!fs.existsSync(MATRIX_PATH)) {
    console.error(`Missing matrix file: ${MATRIX_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(UI_ROUTES_PATH)) {
    console.error(`Missing UI route inventory: ${UI_ROUTES_PATH}`);
    console.error("Run: npm run inventory:ui-routes");
    process.exit(1);
  }

  const matrix = readJson(MATRIX_PATH);
  const uiRoutes = new Set((readJson(UI_ROUTES_PATH).routes || []).map(String));
  const backendRoutes = new Set(readBackendRoutes().map(String));
  const plannedAllowed = !!matrix?.policy?.plannedEndpointsAllowed;
  const requireUiForAll = !!matrix?.policy?.requireUiRouteForAll;
  const features = Array.isArray(matrix?.features) ? matrix.features : [];
  const featureIds = new Map();
  const routeOwners = new Map();

  const policyStatuses = Array.isArray(matrix?.policy?.validRowStatuses)
    ? new Set(matrix.policy.validRowStatuses)
    : new Set();
  for (const status of policyStatuses) {
    if (!VALID_ROW_STATUSES.has(status)) {
      failures.push(`policy.validRowStatuses contains invalid row status: ${status}`);
    }
  }

  for (const feature of features) {
    const id = feature?.featureId || "(missing-id)";
    const status = String(feature?.status || "Unspecified");
    const uiMode = String(feature?.ui?.mode || "");
    const uiRoute = String(feature?.ui?.route || "");
    const releaseScope = String(feature?.releaseScope || "");
    const releaseDecision = String(feature?.releaseDecision || "");
    const rowStatus = String(feature?.rowStatus || "");
    const userVisible = feature?.userVisible === true;
    const apiRows = Array.isArray(feature?.api) ? feature.api : [];
    const evidence = Array.isArray(feature?.evidence?.tests)
      ? feature.evidence.tests
      : [];

    featureIds.set(id, (featureIds.get(id) || 0) + 1);
    if (uiRoute) {
      const owners = routeOwners.get(uiRoute) || [];
      owners.push({ id, rowStatus });
      routeOwners.set(uiRoute, owners);
    }

    if (!VALID_RELEASE_SCOPES.has(releaseScope)) {
      failures.push(
        `[${id}] invalid or missing releaseScope: ${releaseScope || "(missing)"}`
      );
    }
    if (!VALID_RELEASE_DECISIONS.has(releaseDecision)) {
      failures.push(
        `[${id}] invalid or missing releaseDecision: ${releaseDecision || "(missing)"}`
      );
    }
    if (typeof feature?.userVisible !== "boolean") {
      failures.push(`[${id}] missing boolean userVisible`);
    }
    if (!VALID_ROW_STATUSES.has(rowStatus)) {
      failures.push(`[${id}] invalid or missing rowStatus: ${rowStatus || "(missing)"}`);
    }
    if (!VALID_UI_MODES.has(uiMode)) {
      failures.push(`[${id}] invalid or missing ui.mode: ${uiMode || "(missing)"}`);
    }
    if (
      uiMode === "unknown" &&
      !(String(id).startsWith("auto.") && !userVisible && releaseScope === "internal")
    ) {
      failures.push(
        `[${id}] ui.mode=unknown is only allowed for internal auto inventory rows`
      );
    }
    if (rowStatus === "canonical" && (releaseScope !== "v1" || !userVisible)) {
      failures.push(
        `[${id}] rowStatus=canonical requires releaseScope=v1 and userVisible=true`
      );
    }
    if (rowStatus === "canonical" && (!uiRoute || uiMode === "unknown")) {
      failures.push(`[${id}] rowStatus=canonical requires a concrete UI mode and route`);
    }
    if (
      rowStatus === "planned" &&
      !(status === "Planned" || releaseDecision === "backlog")
    ) {
      failures.push(
        `[${id}] rowStatus=planned requires status=Planned or releaseDecision=backlog`
      );
    }
    if (
      rowStatus === "deprecated" &&
      !["Disabled", "Removed"].includes(status) &&
      !["hide", "remove"].includes(releaseDecision) &&
      !["removed", "post_v1"].includes(releaseScope)
    ) {
      failures.push(
        `[${id}] rowStatus=deprecated requires disabled/removed/hide/post_v1 metadata`
      );
    }
    if (rowStatus === "compat_alias" && userVisible) {
      failures.push(`[${id}] rowStatus=compat_alias rows must not be userVisible`);
    }
    if (userVisible && releaseScope !== "v1") {
      failures.push(`[${id}] userVisible rows must use releaseScope=v1`);
    }
    if (userVisible && !["complete", "beta"].includes(releaseDecision)) {
      failures.push(`[${id}] userVisible rows must be releaseDecision=complete or beta`);
    }
    if (["Planned", "Disabled"].includes(status) && userVisible) {
      failures.push(`[${id}] ${status} rows must not be userVisible`);
    }
    if (["Planned", "Disabled"].includes(status) && releaseScope === "v1") {
      failures.push(`[${id}] ${status} rows must not use releaseScope=v1`);
    }

    const isAutoOnly = String(id).startsWith("auto.");
    if (!uiRoute) {
      if (requireUiForAll || (!isAutoOnly && status === "Functional")) {
        failures.push(`[${id}] missing ui.route`);
      } else {
        if (isAutoOnly) autoMissingUiCount += 1;
        else
          warnings.push(
            `[${id}] missing ui.route (allowed for non-UI/auto inventory row)`
          );
      }
    } else if (!uiRoutes.has(uiRoute)) {
      failures.push(`[${id}] ui.route not found in src/app inventory: ${uiRoute}`);
    }

    if (status === "Functional") {
      for (const row of apiRows) {
        const sig = toBackendRouteSignature(row?.method, row?.path);
        if (!backendRoutes.size) {
          warnings.push(
            `[${id}] backend route inventory missing; skipped endpoint check for: ${sig}`
          );
          continue;
        }
        if (!backendRoutes.has(sig))
          failures.push(`[${id}] backend route missing from inventory: ${sig}`);
      }
      if (userVisible && releaseScope === "v1" && evidence.length === 0) {
        failures.push(`[${id}] public v1 feature has no evidence.test entries`);
      }
    } else if (!plannedAllowed && status === "Planned") {
      failures.push(`[${id}] Planned feature is disallowed by policy`);
    }

    if (userVisible && releaseScope === "v1") {
      for (const testPath of evidence) {
        if (!existsEvidencePath(testPath)) {
          failures.push(`[${id}] missing public v1 evidence file: ${testPath}`);
        }
      }
    }
  }

  for (const [id, count] of featureIds) {
    if (count > 1) failures.push(`[${id}] duplicate featureId appears ${count} times`);
  }
  for (const [route, owners] of routeOwners) {
    if (owners.length <= 1) continue;
    const hasCanonical = owners.some((owner) => owner.rowStatus === "canonical");
    const allExplained = owners.every((owner) =>
      ["canonical", "compat_alias", "deprecated"].includes(owner.rowStatus)
    );
    if (!hasCanonical || !allExplained) {
      failures.push(
        `[${route}] duplicate ui.route must have one canonical row and compatibility/deprecated companion rows: ${owners
          .map((owner) => `${owner.id}:${owner.rowStatus}`)
          .join(", ")}`
      );
    }
  }

  console.log(`Features checked: ${features.length}`);
  console.log(`UI routes inventory: ${uiRoutes.size}`);
  console.log(`Backend routes inventory: ${backendRoutes.size}`);
  if (autoMissingUiCount > 0) {
    console.log(
      `Auto/backend-only rows with no UI route: ${autoMissingUiCount} (allowed)`
    );
  }
  if (warnings.length) {
    console.log("\nWarnings:");
    for (const w of warnings) console.log(` - ${w}`);
  }
  if (failures.length) {
    console.error("\nFailures:");
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log("\nV1 feature matrix validation passed.");
}

main();
