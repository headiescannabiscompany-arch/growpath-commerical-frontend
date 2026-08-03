const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "src", "app");

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

const files = walk(ROOT);

// Treat these as non-routes (optional): adjust as needed
const IGNORE = [/\.contract\.ts$/i, /\.spec\.ts$/i, /\.test\.ts$/i];

function hasDefaultRouteExport(source) {
  return (
    /export\s+default\b/.test(source) || /export\s*{\s*default\s*}\s*from\b/.test(source)
  );
}

function findRouteFilesMissingDefaultExport(routeFiles = files) {
  const bad = [];
  for (const file of routeFiles) {
    if (IGNORE.some((re) => re.test(file))) continue;

    const source = fs.readFileSync(file, "utf8");
    if (!hasDefaultRouteExport(source)) {
      bad.push(path.relative(process.cwd(), file));
    }
  }
  return bad;
}

function main() {
  const bad = findRouteFilesMissingDefaultExport();
  console.log("Route files missing export default:\n");
  bad.forEach((file) => console.log(" -", file));
  console.log("\nTotal:", bad.length);
}

if (require.main === module) main();

module.exports = {
  findRouteFilesMissingDefaultExport,
  hasDefaultRouteExport
};
