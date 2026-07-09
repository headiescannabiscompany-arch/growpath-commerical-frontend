"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SPEC_PATH = path.join(
  ROOT,
  "docs",
  "GROWPATH_TOOL_FUNCTION_SPEC_V1.0.1_HARDENED.md"
);
const CONTRACT_PATH = path.join(ROOT, "docs", "contracts", "AI_FUNCTION_INVENTORY.json");
const OUT_DIR = path.join(ROOT, "tmp", "spec");
const OUT_FILE = path.join(OUT_DIR, "ai-function-inventory.json");
const SCAN_DIRS = ["docs", "src", "tests", "scripts"];

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "tmp", "dist", "build", "coverage"].includes(entry.name)) {
      continue;
    }
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, out);
    } else if (entry.isFile() && /\.(md|json|js|jsx|ts|tsx|mjs|cjs)$/i.test(entry.name)) {
      out.push(abs);
    }
  }
  return out;
}

function parseRegistry(markdown) {
  const start = markdown.indexOf("## 5) Function Registry (Canonical)");
  const end = markdown.indexOf("## 6) Function Contracts", start);
  if (start < 0 || end < 0) {
    throw new Error("Unable to locate Section 5 function registry in hardened tool spec.");
  }

  const lines = markdown.slice(start, end).split(/\r?\n/);
  const byTool = {};
  const functions = [];
  let currentSection = null;

  for (const line of lines) {
    const heading = line.match(/^###\s+(.+?)\s*$/);
    if (heading) {
      currentSection = heading[1].trim().toLowerCase();
      byTool[currentSection] = byTool[currentSection] || [];
      continue;
    }

    const bullet = line.match(/^-\s+`([a-z][a-z0-9]*\.[A-Za-z0-9]+)`\s*$/);
    if (!bullet) continue;
    const name = bullet[1];
    const tool = name.split(".")[0];
    if (!currentSection) {
      throw new Error(`Function ${name} appears before a registry section.`);
    }
    if (tool !== currentSection) {
      throw new Error(`Function ${name} is listed under ${currentSection}.`);
    }
    byTool[tool].push(name);
    functions.push({ tool, name });
  }

  if (!functions.length) {
    throw new Error("No AI functions found in the hardened tool spec registry.");
  }

  return {
    source: rel(SPEC_PATH),
    registrySection: "5",
    totalFunctions: functions.length,
    toolCount: Object.keys(byTool).length,
    byTool,
    functions
  };
}

function stableInventory(inventory) {
  return {
    source: inventory.source,
    registrySection: inventory.registrySection,
    totalFunctions: inventory.totalFunctions,
    toolCount: inventory.toolCount,
    byTool: Object.fromEntries(
      Object.entries(inventory.byTool).map(([tool, names]) => [tool, [...names].sort()])
    ),
    functions: [...inventory.functions].sort((a, b) => a.name.localeCompare(b.name))
  };
}

function findForbiddenTypos() {
  const typo = "cultiva" + " rId";
  const findings = [];
  for (const dir of SCAN_DIRS) {
    for (const file of walk(path.join(ROOT, dir))) {
      const text = fs.readFileSync(file, "utf8");
      text.split(/\r?\n/).forEach((line, index) => {
        if (line.includes(typo)) {
          findings.push({ file: rel(file), line: index + 1, source: line.trim() });
        }
      });
    }
  }
  return findings;
}

function main() {
  const spec = fs.readFileSync(SPEC_PATH, "utf8").replace(/^\uFEFF/, "");
  const generated = stableInventory(parseRegistry(spec));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(generated, null, 2)}\n`, "utf8");

  if (!fs.existsSync(CONTRACT_PATH)) {
    console.error(`[fail] Missing canonical AI function inventory: ${rel(CONTRACT_PATH)}`);
    console.error(`Generated candidate: ${rel(OUT_FILE)}`);
    process.exit(1);
  }

  const canonical = JSON.parse(fs.readFileSync(CONTRACT_PATH, "utf8").replace(/^\uFEFF/, ""));
  const canonicalStable = stableInventory(canonical);
  if (JSON.stringify(canonicalStable) !== JSON.stringify(generated)) {
    console.error("[fail] Canonical AI function inventory does not match hardened spec.");
    console.error(`Expected count from spec: ${generated.totalFunctions}`);
    console.error(`Canonical count: ${canonical.totalFunctions}`);
    console.error(`Generated candidate: ${rel(OUT_FILE)}`);
    process.exit(1);
  }

  const typoFindings = findForbiddenTypos();
  if (typoFindings.length) {
    console.error("[fail] Forbidden doc typo found.");
    for (const finding of typoFindings) {
      console.error(`- ${finding.file}:${finding.line} ${finding.source}`);
    }
    process.exit(1);
  }

  console.log(
    `[ok] AI function inventory: ${generated.totalFunctions} functions across ${generated.toolCount} tools.`
  );
}

main();
