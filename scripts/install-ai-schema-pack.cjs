const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = process.cwd();
const targetRoot = path.join(root, "schemas", "schemas");

function usage() {
  console.error("Usage: npm run schema:install -- <schema-pack.zip|extracted-directory>");
  console.error("");
  console.error(
    "The source must contain common.json plus objects/, requests/, and responses/."
  );
}

function assertInsideWorkspace(file) {
  const resolved = path.resolve(file);
  const workspace = path.resolve(root);
  if (resolved !== workspace && !resolved.startsWith(workspace + path.sep)) {
    throw new Error(`Refusing to write outside workspace: ${resolved}`);
  }
  return resolved;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    ...options
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status}`);
  }
}

function hasPackShape(dir) {
  return (
    fs.existsSync(path.join(dir, "common.json")) &&
    fs.existsSync(path.join(dir, "objects")) &&
    fs.existsSync(path.join(dir, "requests", "AiCallRequest.json")) &&
    fs.existsSync(path.join(dir, "responses", "ApiSuccessEnvelope.json")) &&
    fs.existsSync(path.join(dir, "responses", "ApiErrorEnvelope.json"))
  );
}

function findPackRoot(start, depth = 0) {
  if (depth > 5 || !fs.existsSync(start)) return null;
  const stat = fs.statSync(start);
  if (!stat.isDirectory()) return null;
  if (hasPackShape(start)) return start;

  for (const entry of fs.readdirSync(start, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const found = findPackRoot(path.join(start, entry.name), depth + 1);
    if (found) return found;
  }
  return null;
}

function extractZip(zipPath) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-schema-pack-"));
  if (process.platform === "win32") {
    run("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force",
      zipPath,
      tempRoot
    ]);
  } else {
    run("unzip", ["-q", zipPath, "-d", tempRoot]);
  }
  return tempRoot;
}

function copyDirectoryContents(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      fs.cpSync(source, dest, { recursive: true, force: true });
    } else if (entry.isFile()) {
      fs.copyFileSync(source, dest);
    }
  }
}

function main() {
  const sourceArg = process.argv[2];
  if (!sourceArg) {
    usage();
    process.exit(2);
  }

  const source = path.resolve(sourceArg);
  if (!fs.existsSync(source)) {
    throw new Error(`Schema pack source not found: ${source}`);
  }

  let searchRoot = source;
  if (fs.statSync(source).isFile()) {
    if (path.extname(source).toLowerCase() !== ".zip") {
      throw new Error("Schema pack file must be a .zip archive.");
    }
    searchRoot = extractZip(source);
  }

  const packRoot = findPackRoot(searchRoot);
  if (!packRoot) {
    throw new Error(
      "Could not find schema pack root. Expected common.json, objects/, requests/, and responses/."
    );
  }

  assertInsideWorkspace(targetRoot);
  fs.rmSync(targetRoot, { recursive: true, force: true });
  copyDirectoryContents(packRoot, targetRoot);

  console.log(`Installed AI schema pack from ${packRoot}`);
  run(process.execPath, [path.join(root, "scripts", "check-ai-schema-pack.cjs")]);
}

try {
  main();
} catch (err) {
  console.error(`[fail] ${err.message}`);
  process.exit(1);
}
