"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CONTRACT_PATH = path.join(ROOT, "docs", "contracts", "FRONTEND_RUNTIME_CONTRACT.json");
const APP_DIR = path.join(ROOT, "src", "app");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function readFile(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, "utf8");
}

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx|js|jsx)$/i.test(entry.name)) continue;
    if (/\.bak$/i.test(entry.name)) continue;
    out.push(abs);
  }
  return out;
}

function toRoute(appRelativePath) {
  const noExt = appRelativePath.replace(/\.(tsx?|jsx?)$/i, "");
  const segments = noExt
    .split("/")
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
    .filter((segment) => segment !== "_layout");
  if (segments[segments.length - 1] === "index") segments.pop();
  if (segments.length === 0) return "/";
  return `/${segments.join("/")}`;
}

function collectAppRoutes() {
  const files = walk(APP_DIR);
  const routes = new Set();
  for (const abs of files) {
    const rel = path.relative(APP_DIR, abs).replace(/\\/g, "/");
    const route = toRoute(rel);
    if (route) routes.add(route);
  }
  return routes;
}

function parseVisibleHiddenTabNames(layoutSource) {
  const visible = new Set();
  const hidden = new Set();
  const screenRegex = /<Tabs\.Screen\s+name="([^"]+)"[\s\S]*?options=\{\{([\s\S]*?)\}\}[\s\S]*?\/>/g;
  let match = null;
  while ((match = screenRegex.exec(layoutSource)) !== null) {
    const name = match[1];
    const options = match[2] || "";
    if (/href\s*:\s*null/.test(options)) hidden.add(name);
    else visible.add(name);
  }
  return { visible, hidden };
}

function parseCapabilityKeys(source) {
  const keys = new Set();
  const regex = /([A-Z0-9_]+)\s*:\s*"([A-Z0-9_]+)"/g;
  let match = null;
  while ((match = regex.exec(source)) !== null) {
    keys.add(match[1]);
    keys.add(match[2]);
  }
  return keys;
}

function assertContains(relFile, requiredText, failures) {
  const src = readFile(relFile);
  if (src == null) {
    failures.push(`Missing file: ${relFile}`);
    return;
  }
  if (!src.includes(requiredText)) {
    failures.push(`Missing required text in ${relFile}: ${requiredText}`);
  }
}

function main() {
  if (!fs.existsSync(CONTRACT_PATH)) {
    console.error(`Missing contract file: ${CONTRACT_PATH}`);
    process.exit(1);
  }

  const contract = readJson(CONTRACT_PATH);
  const failures = [];
  const warnings = [];

  const routes = collectAppRoutes();
  for (const route of contract.personal.requiredRoutes || []) {
    if (!routes.has(route)) {
      failures.push(`Required personal route missing from src/app: ${route}`);
    }
  }

  const tabsLayoutFile = contract.personal.tabsLayoutFile;
  const tabsLayout = readFile(tabsLayoutFile);
  if (tabsLayout == null) {
    failures.push(`Missing tabs layout file: ${tabsLayoutFile}`);
  } else {
    const { visible, hidden } = parseVisibleHiddenTabNames(tabsLayout);
    const expectedVisible = new Set(contract.personal.visibleTabs || []);
    const expectedHidden = new Set(contract.personal.hiddenTabs || []);

    for (const tab of expectedVisible) {
      if (!visible.has(tab)) failures.push(`Expected visible tab missing: ${tab}`);
    }
    for (const tab of visible) {
      if (!expectedVisible.has(tab)) {
        failures.push(`Unexpected visible tab in personal layout: ${tab}`);
      }
    }
    for (const tab of expectedHidden) {
      if (!hidden.has(tab)) failures.push(`Expected hidden tab missing: ${tab}`);
    }
  }

  for (const redirectRule of contract.personal.legacyRedirects || []) {
    assertContains(redirectRule.file, redirectRule.mustContain, failures);
  }

  for (const tool of contract.tools.requiredRoutes || []) {
    const abs = path.join(ROOT, tool.file);
    if (!fs.existsSync(abs)) {
      failures.push(`Missing tool file for ${tool.id}: ${tool.file}`);
    }
    if (!routes.has(tool.route)) {
      failures.push(`Missing tool route in src/app for ${tool.id}: ${tool.route}`);
    }
  }

  for (const assertion of contract.tools.safetyAssertions || []) {
    assertContains(assertion.file, assertion.mustContain, failures);
  }

  const capSource = readFile(contract.capabilities.sourceFile);
  if (capSource == null) {
    failures.push(`Missing capabilities source file: ${contract.capabilities.sourceFile}`);
  } else {
    const keys = parseCapabilityKeys(capSource);
    for (const key of contract.capabilities.requiredKeys || []) {
      if (!keys.has(key)) {
        failures.push(`Missing required capability key: ${key}`);
      }
    }
    if (keys.size === 0) warnings.push("No capability keys parsed from source.");
  }

  console.log(`Routes scanned: ${routes.size}`);
  console.log(`Contract file: docs/contracts/FRONTEND_RUNTIME_CONTRACT.json`);

  if (warnings.length) {
    console.log("\nWarnings:");
    for (const warning of warnings) console.log(` - ${warning}`);
  }

  if (failures.length) {
    console.error("\nFailures:");
    for (const failure of failures) console.error(` - ${failure}`);
    process.exit(1);
  }

  console.log("\nFrontend runtime contract validation passed.");
}

main();
