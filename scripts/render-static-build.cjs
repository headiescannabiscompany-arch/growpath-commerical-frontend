const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const index = path.join(dist, "index.html");

function fail(message) {
  console.error(`[render-static-build] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(index)) {
  fail("dist/index.html is missing. Run npm run export:web:production before deploy.");
}

const webBundleDir = path.join(dist, "_expo", "static", "js", "web");
if (!fs.existsSync(webBundleDir)) {
  fail("dist web bundle directory is missing.");
}

const bundles = fs
  .readdirSync(webBundleDir)
  .filter((name) => /^index-[a-zA-Z0-9]+\.js$/.test(name));

if (bundles.length !== 1) {
  fail(`expected exactly one web bundle, found ${bundles.length}.`);
}

const bundle = fs.readFileSync(path.join(webBundleDir, bundles[0]), "utf8");
if (!bundle.includes("https://api.growpathai.com")) {
  fail("production API host was not found in the web bundle.");
}

console.log(`[render-static-build] verified committed dist bundle ${bundles[0]}`);
