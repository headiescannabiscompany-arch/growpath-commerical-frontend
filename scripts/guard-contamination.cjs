const { execSync } = require("child_process");

const PATTERNS = ["\\$enc", "New-Object", "<!doctype html", "</html>"];

function rg(pattern) {
  try {
    const out = execSync(
      `rg -n --hidden --glob "!**/node_modules/**" --glob "!**/.git/**" "${pattern}" src`,
      { stdio: ["ignore", "pipe", "pipe"] }
    ).toString();
    return out.trim();
  } catch {
    return "";
  }
}

const hits = [];
for (const pattern of PATTERNS) {
  const found = rg(pattern);
  if (found) hits.push(`\n=== Pattern: ${pattern} ===\n${found}`);
}

if (hits.length) {
  console.error("Contamination detected in src/**:");
  console.error(hits.join("\n"));
  process.exit(1);
}

console.log("Contamination guard passed.");
