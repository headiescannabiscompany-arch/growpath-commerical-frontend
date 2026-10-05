"use strict";

// npm audit cannot attest to local file dependencies. Require the reviewed
// source, installed resolutions, and security/compatibility tests as well.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const ROOT = path.resolve(__dirname, "..");
const readJson = (relative) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));
const lock = readJson("package-lock.json");
const pkg = readJson("package.json");
assert.equal(lock.lockfileVersion, 3);
assert.equal(pkg.dependencies.expo, "~54.0.37", "Expo SDK must stay at 54");
assert.equal(pkg.dependencies["react-native"], "0.81.5");
assert.equal(pkg.devDependencies.jest, "~29.7.0");

function entriesFor(name) {
  const suffix = `node_modules/${name}`;
  const entries = Object.entries(lock.packages).filter(
    ([entry]) => entry === suffix || entry.endsWith(`/${suffix}`)
  );
  assert.ok(entries.length, `Missing locked dependency ${name}`);
  return entries;
}

const localPackages = [
  [
    "braces",
    "vendor/braces-compat",
    "@growpathai/braces-compat",
    "3.0.3-growpath.1",
    "index.js"
  ],
  [
    "node-forge",
    "vendor/node-forge-patched",
    "node-forge",
    "1.4.0+growpath.1",
    "lib/index.js"
  ],
  [
    "image-size",
    "vendor/image-size-compat",
    "image-size",
    "1.2.1-compat.2.0.4",
    "index.cjs"
  ],
  [
    "brace-expansion",
    "vendor/brace-expansion-compat",
    "brace-expansion",
    "5.0.12",
    "index.cjs"
  ]
];
for (const [name, directory, packageName, version, main] of localPackages) {
  assert.equal(pkg.dependencies[name], `file:${directory}`);
  assert.equal(pkg.overrides[name], `$${name}`);
  const metadata = readJson(`${directory}/package.json`);
  assert.equal(metadata.name, packageName);
  assert.equal(metadata.version, version);
  assert.equal(metadata.private, true);
  assert.equal(metadata.main, main);
  assert.equal(
    metadata.scripts,
    undefined,
    "Local repairs must not add lifecycle scripts"
  );
  for (const [entry, resolution] of entriesFor(name)) {
    assert.equal(resolution.link, true, `${entry}: expected reviewed local dependency`);
    assert.equal(resolution.resolved, directory, `${entry}: unexpected source`);
    assert.equal(
      fs.realpathSync(path.join(ROOT, entry)),
      fs.realpathSync(path.join(ROOT, directory)),
      `${entry}: installed dependency differs from reviewed vendor source`
    );
  }
}

const registryPackages = [
  [
    "axios",
    "axios",
    "1.20.0",
    "sha512-r8aOh8j9cGKpgQAqpzrUHnSIc6a59Y3Xf/cv8sy1DrHCkZHzQGEuoq1tARk6qSyDdtQGSDgpb9kFlruzPvrgwg=="
  ],
  [
    "undici",
    "undici",
    "6.28.1",
    "sha512-zWpdTVD54H48CIybL0rWQ3ukpb9d23wM7eH5RtfdmeP70cWHNjtfo7P4vZX+5CoDcO53J4Pu5uXp7lNfjc6DRA=="
  ],
  [
    "brace-expansion-modern",
    "brace-expansion",
    "5.0.12",
    "sha512-YovQ3rzhaLMIrDjNDMkNS01tea93qhEhG5xy8f6+R0l+dw3Ki+5sCoIoI942iuLZTHWogWktgwVDhU09iNEimQ=="
  ],
  [
    "image-size-modern",
    "image-size",
    "2.0.4",
    "sha512-QRUkFFsRV/6fuESxb9Vkq+a0LkSrgKXuc2NEqfikiXxxN/G3tjWt5EVUlMaImRBZRZK/jRBEbYvpPYZL8t08Zw=="
  ]
];
for (const [alias, name, version, integrity] of registryPackages) {
  for (const [entry, resolution] of entriesFor(alias)) {
    assert.equal(resolution.version, version, `${entry}: unexpected version`);
    assert.equal(resolution.integrity, integrity, `${entry}: unexpected tarball`);
    assert.equal(
      resolution.resolved,
      `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`
    );
    const installed = readJson(`${entry}/package.json`);
    assert.equal(installed.name, name);
    assert.equal(installed.version, version);
  }
}

const hash = (relative) =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, relative)))
    .digest("hex");
assert.equal(
  hash("vendor/braces-compat/INTEGRITY.json"),
  "c52529de16657497ea265b5adb6a8046ad58335186453ecf0857fa949c492946",
  "Braces manifest changed; source must be reviewed again"
);
assert.equal(
  hash("vendor/brace-expansion-compat/index.cjs"),
  "34bb90aa4ed3b2db6cc01696d8cb3f666a71801682b9d224d18fc1d65ad149be"
);
for (const [file, expected] of [
  [
    "vendor/image-size-compat/index.cjs",
    "2a173c8124500b7f64f799924c24987de7d0430456fb16cb38a017b2d284bcb1"
  ],
  [
    "vendor/image-size-compat/package.json",
    "ee1471c46406f4024d55411be4ca8cd332454ee7a202ae07265e89bbcd5b6745"
  ],
  [
    "vendor/node-forge-patched/package.json",
    "45c13cabad883f677ff1b02a9fb4d8a4a6b092705f3d18c9054c875b2ce34b72"
  ],
  [
    "vendor/brace-expansion-compat/package.json",
    "46d8ad0ca28974b7b335469364c5c211f8d0dce65ac6170ca027fdd460cd8673"
  ]
]) {
  assert.equal(hash(file), expected, `${file}: reviewed source changed`);
}

const expansion = require("brace-expansion");
assert.equal(typeof expansion, "function");
assert.equal(expansion.expand, expansion);
assert.deepEqual(expansion("{a,b}/{1..3}"), ["a/1", "a/2", "a/3", "b/1", "b/2", "b/3"]);
assert.deepEqual(
  require("micromatch")(["src/a.ts", "src/b.js", "docs/a.md"], "src/*.{js,ts}"),
  ["src/a.ts", "src/b.js"]
);
const minimatch = require("minimatch");
assert.equal((minimatch.minimatch || minimatch)("src/a.ts", "src/*.{js,ts}"), true);

for (const [script, args = []] of [
  ["scripts/verify-braces-security-backport.cjs"],
  ["scripts/verify-node-forge-backport.cjs", ["--installed"]],
  ["scripts/verify-image-size-compat.cjs"],
  ["tests/unit/image-size-compat.node.test.cjs"],
  ["tests/security/http-dependency-compatibility.test.cjs"],
  ["tests/security/production-dependency-audit.test.cjs"]
]) {
  const result = spawnSync(process.execPath, [path.join(ROOT, script), ...args], {
    cwd: ROOT,
    stdio: "inherit",
    timeout: 60000
  });
  assert.equal(result.error, undefined, `${script}: ${result.error?.message}`);
  assert.equal(result.status, 0, `${script} failed`);
}
console.log(
  "Verified SDK54 dependency repairs: exact registry versions, local sources, installed resolutions and regression checks."
);
