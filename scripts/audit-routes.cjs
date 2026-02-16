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
const IGNORE = [
  /\.contract\.ts$/i,
  /\.spec\.ts$/i,
  /\.test\.ts$/i
];

const bad = [];
for (const f of files) {
  if (IGNORE.some((re) => re.test(f))) continue;

  const txt = fs.readFileSync(f, "utf8");
  const hasDefault = /export\s+default\s+/.test(txt);
  if (!hasDefault) bad.push(path.relative(process.cwd(), f));
}

console.log("Route files missing export default:\n");
bad.forEach((f) => console.log(" -", f));
console.log("\nTotal:", bad.length);
