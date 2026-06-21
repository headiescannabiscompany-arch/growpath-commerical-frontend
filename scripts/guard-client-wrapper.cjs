const fs = require("fs");
const path = require("path");

const sourceRoot = path.resolve("src");
const allowedTransportFiles = new Set([
  path.resolve("src/api/apiRequest.ts"),
  path.resolve("src/api/uriToBlob.ts")
]);
const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const violations = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(file);
      continue;
    }
    if (!sourceExtensions.has(path.extname(entry.name))) continue;

    const absoluteFile = path.resolve(file);
    const text = fs.readFileSync(absoluteFile, "utf8");
    if (!allowedTransportFiles.has(absoluteFile)) {
      if (/\bfetch\s*\(/.test(text)) violations.push(`${file}: direct fetch()`);
      if (/\baxios(?:\.|\s*\()/.test(text)) violations.push(`${file}: direct axios`);
      if (/\bXMLHttpRequest\b/.test(text)) {
        violations.push(`${file}: direct XMLHttpRequest`);
      }
    }

    if (
      absoluteFile !== path.resolve("src/api/apiRequest.ts") &&
      /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/.test(text)
    ) {
      violations.push(`${file}: hardcoded local API URL`);
    }
  }
}

walk(sourceRoot);

for (const wrapper of ["src/api/client.ts", "src/api/client.js", "src/api/apiClient.js"]) {
  const text = fs.readFileSync(wrapper, "utf8");
  if (!text.includes("apiRequest") && !text.includes('from "./client.js"')) {
    violations.push(`${wrapper}: does not delegate to apiRequest`);
  }
}

if (violations.length) {
  console.error("API transport boundary violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("API transport boundary guard passed.");
