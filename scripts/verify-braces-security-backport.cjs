const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const vendor = path.join(root, "vendor", "braces-compat");
const patched = require(vendor);

function expectedDepthError(run) {
  assert.throws(
    run,
    (error) => error instanceof SyntaxError && error.code === "ERR_BRACES_MAX_DEPTH"
  );
}

function runAttack(name) {
  const depth = 4000;
  const patterns = {
    braces: "{".repeat(depth) + "x" + "}".repeat(depth),
    alternatives: "{".repeat(depth) + "a,b" + "}".repeat(depth),
    parentheses: "(".repeat(depth) + "x" + ")".repeat(depth),
    mixed: "{(".repeat(2000) + "x" + ")}".repeat(2000),
    unclosed: "{".repeat(depth) + "x",
    rangeThenComma: "{".repeat(1000) + "1..3,4" + "}".repeat(1000)
  };

  if (Object.prototype.hasOwnProperty.call(patterns, name)) {
    const input = patterns[name];
    assert.ok(input.length < 10000, "Attack stays below upstream's character cap");
    for (const method of ["parse", "compile", "expand", "stringify", "create"]) {
      expectedDepthError(() => patched[method](input));
    }
    expectedDepthError(() => patched(input));
    expectedDepthError(() => patched([input], { expand: true }));
    expectedDepthError(() => patched(input, { maxDepth: false, maxLength: Infinity }));
    return;
  }

  if (name === "ast") {
    const ast = { type: "root", nodes: [] };
    let parent = ast;
    for (let index = 0; index < depth; index += 1) {
      const node = { type: "paren", nodes: [], parent };
      parent.nodes.push(node);
      parent = node;
    }
    parent.nodes.push({ type: "text", value: "x", parent });
    for (const method of ["compile", "expand", "stringify"]) {
      expectedDepthError(() => patched[method](ast));
      expectedDepthError(() => require(path.join(vendor, "lib", method))(ast));
    }
    return;
  }

  if (name === "astCycle") {
    for (const method of ["compile", "expand", "stringify"]) {
      const ast = { type: "root", nodes: [] };
      ast.nodes.push(ast);
      expectedDepthError(() => patched[method](ast));
    }
    return;
  }

  if (name === "parentCycle") {
    const ast = { type: "paren", nodes: [] };
    ast.parent = ast;
    expectedDepthError(() => patched.expand(ast));
    return;
  }

  if (name === "flatten") {
    const { flatten } = require(path.join(vendor, "lib", "utils"));
    let nested = ["x"];
    for (let index = 0; index < depth; index += 1) nested = [nested];
    expectedDepthError(() => flatten(nested));
    const cyclic = [];
    cyclic.push(cyclic);
    expectedDepthError(() => flatten(cyclic));
    return;
  }

  throw new Error(`Unknown attack fixture ${name}`);
}

if (process.argv[2] === "--attack") {
  runAttack(process.argv[3]);
  process.stdout.write("bounded\n");
} else {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(vendor, "INTEGRITY.json"), "utf8")
  );
  for (const [relativePath, expected] of Object.entries(manifest.local.files)) {
    const actual = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(vendor, relativePath)))
      .digest("hex");
    assert.equal(actual, expected, `Vendored source integrity: ${relativePath}`);
  }
  const metadata = require(path.join(vendor, "package.json"));
  assert.equal(metadata.name, "@growpathai/braces-compat");
  assert.equal(metadata.version, "3.0.3-growpath.1");
  assert.equal(metadata.private, true);
  assert.equal(manifest.local.name, metadata.name);
  assert.equal(manifest.local.version, metadata.version);

  if (!process.argv.includes("--vendor-only")) {
    const lock = JSON.parse(
      fs.readFileSync(path.join(root, "package-lock.json"), "utf8")
    );
    const paths = Object.keys(lock.packages).filter((entry) =>
      /(?:^|\/)node_modules\/braces$/.test(entry)
    );
    assert.ok(paths.length > 0, "No installed braces resolution was recorded");
    for (const relativePath of paths) {
      const installedDir = path.join(root, relativePath);
      const installedPackage = JSON.parse(
        fs.readFileSync(path.join(installedDir, "package.json"), "utf8")
      );
      assert.equal(
        installedPackage.name,
        metadata.name,
        `${relativePath} must resolve to the local fork`
      );
      assert.equal(
        installedPackage.version,
        metadata.version,
        `${relativePath} must use the reviewed backport`
      );
      for (const [file, expected] of Object.entries(manifest.local.files)) {
        const actual = crypto
          .createHash("sha256")
          .update(fs.readFileSync(path.join(installedDir, file)))
          .digest("hex");
        assert.equal(
          actual,
          expected,
          `Installed source integrity: ${relativePath}/${file}`
        );
      }
    }
  }

  const fixtures = JSON.parse(
    fs.readFileSync(path.join(vendor, "compatibility-fixtures.json"), "utf8")
  );
  let assertions = 0;
  for (const { input, options, snapshot } of fixtures) {
    for (const [method, expected] of Object.entries(snapshot)) {
      let result;
      try {
        result = { value: patched[method](input, options) };
      } catch (error) {
        result = { error: error.name, message: error.message };
      }
      assert.deepEqual(
        result,
        expected,
        `${method} ${JSON.stringify(input)} ${JSON.stringify(options)}`
      );
      assertions += 1;
    }
  }

  assert.deepEqual(patched(["{a,b}", "{b,c}"], { expand: true, nodupes: true }), [
    "a",
    "b",
    "c"
  ]);
  assert.throws(() => patched.parse("x".repeat(10001)), /exceeds max characters/);
  assert.throws(() => patched.expand("{1..1001}"), /exceeds range limit/);
  assert.throws(() => patched.parse(null), TypeError);
  for (const [open, close] of [
    ["{", "}"],
    ["(", ")"]
  ]) {
    const boundary = open.repeat(64) + "x" + close.repeat(64);
    assert.equal(patched.stringify(boundary), boundary);
    assert.equal(patched.compile(boundary), boundary);
    assert.deepEqual(patched.expand(boundary), [boundary]);
    expectedDepthError(() => patched.parse(open + boundary + close));
  }
  // Literal delimiters are not real nesting and must stay usable.
  const quoted = '"' + "{".repeat(100) + '"';
  assert.equal(patched.stringify(quoted), "{".repeat(100));
  assert.equal(
    patched.stringify("[" + "{".repeat(100) + "]"),
    "[" + "{".repeat(100) + "]"
  );
  assert.equal(patched.stringify("\\{".repeat(100)), "{".repeat(100));

  const attacks = [
    "braces",
    "alternatives",
    "parentheses",
    "mixed",
    "unclosed",
    "rangeThenComma",
    "ast",
    "astCycle",
    "parentCycle",
    "flatten"
  ];
  for (const attack of attacks) {
    const child = spawnSync(process.execPath, [__filename, "--attack", attack], {
      cwd: root,
      encoding: "utf8",
      timeout: 3000,
      maxBuffer: 1024 * 1024
    });
    assert.equal(child.error, undefined, `${attack}: ${child.error?.message}`);
    assert.equal(child.status, 0, `${attack}: ${child.stderr}`);
    assert.equal(
      child.stdout,
      "bounded\n",
      `${attack} must finish with controlled validation`
    );
  }
  console.log(
    `Braces security backport verified: ${assertions} compatibility comparisons, boundaries, integrity, and ${attacks.length} isolated attack cases.`
  );
}
