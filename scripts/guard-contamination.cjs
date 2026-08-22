const fs = require("fs");
const path = require("path");

const PATTERNS = ["\\$enc", "New-Object", "<!doctype html", "</html>"];
const HTML_EXPORT_MODULES = new Set([
  "src/app/home/personal/(tabs)/tools/pdf-export.tsx",
  "src/utils/aiInspectionEvidenceExport.ts",
  "src/utils/exportVisualTimeline.ts"
]);

function sourceFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...sourceFiles(absolute));
    } else if (entry.isFile()) {
      files.push(absolute);
    }
  }
  return files;
}

function normalizedRelative(file) {
  return path.relative(process.cwd(), file).split(path.sep).join("/");
}

function findings(pattern) {
  const matches = [];
  const isHtmlPattern = pattern === "<!doctype html" || pattern === "</html>";
  for (const file of sourceFiles(path.join(process.cwd(), "src"))) {
    const relative = normalizedRelative(file);
    if (isHtmlPattern && HTML_EXPORT_MODULES.has(relative)) continue;
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (line.includes(pattern.replace("\\$", "$"))) {
        matches.push(`${relative}:${index + 1}:${line}`);
      }
    });
  }
  return matches.join("\n");
}

const hits = [];
for (const pattern of PATTERNS) {
  const found = findings(pattern);
  if (found) hits.push(`\n=== Pattern: ${pattern} ===\n${found}`);
}

if (hits.length) {
  console.error("Contamination detected in src/**:");
  console.error(hits.join("\n"));
  process.exit(1);
}

console.log("Contamination guard passed.");
