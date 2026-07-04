"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CONTRACT_PATH = path.join(ROOT, "docs", "contracts", "BACKEND_ROUTE_CONTRACT.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function read(relFile) {
  return fs.readFileSync(path.join(ROOT, relFile), "utf8").replace(/^\uFEFF/, "");
}

function normalizePath(routePath) {
  const value = String(routePath || "").trim();
  if (!value || value === "/") return "/";
  return value.replace(/\/+$/g, "") || "/";
}

function collectRoutes(source) {
  const routes = new Set();
  const routerRegex =
    /\brouter\s*\.\s*(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/g;
  const calculatorRegex = /\bcalculatorRoute\(\s*["'`]([^"'`]+)["'`]/g;
  let match = null;
  while ((match = routerRegex.exec(source)) !== null) {
    routes.add(`${match[1].toUpperCase()} ${normalizePath(match[2])}`);
  }
  while ((match = calculatorRegex.exec(source)) !== null) {
    routes.add(`POST ${normalizePath(match[1])}`);
  }
  return routes;
}

function main() {
  if (!fs.existsSync(CONTRACT_PATH)) {
    console.error(`Missing backend route contract: ${CONTRACT_PATH}`);
    process.exit(1);
  }

  const contract = readJson(CONTRACT_PATH);
  const failures = [];
  let checkedRouteCount = 0;

  for (const moduleDef of contract.requiredRouteModules || []) {
    const routeFile = path.join(ROOT, moduleDef.file);
    const testFile = path.join(ROOT, moduleDef.testFile);
    if (!fs.existsSync(routeFile)) {
      failures.push(`Missing backend route module for ${moduleDef.id}: ${moduleDef.file}`);
      continue;
    }
    if (!fs.existsSync(testFile)) {
      failures.push(
        `Missing backend route test for ${moduleDef.id}: ${moduleDef.testFile}`
      );
    }

    const source = read(moduleDef.file);
    const routes = collectRoutes(source);
    for (const expected of moduleDef.requiredRoutes || []) {
      checkedRouteCount += 1;
      const key = `${String(expected.method || "").toUpperCase()} ${normalizePath(
        expected.path
      )}`;
      if (!routes.has(key)) {
        failures.push(
          `Missing ${moduleDef.id} route ${key} in ${moduleDef.file} mounted at ${moduleDef.basePath}`
        );
      }
    }
  }

  console.log(`Backend route modules checked: ${contract.requiredRouteModules.length}`);
  console.log(`Required route declarations checked: ${checkedRouteCount}`);

  if (failures.length) {
    console.error("\nFailures:");
    for (const failure of failures) console.error(` - ${failure}`);
    process.exit(1);
  }

  console.log("\nBackend route contract validation passed.");
}

main();
