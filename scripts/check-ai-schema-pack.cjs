const fs = require("fs");
const path = require("path");

const root = process.cwd();
const schemasRoot = path.join(root, "schemas", "schemas");
const objectsDir = path.join(schemasRoot, "objects");
const requestsDir = path.join(schemasRoot, "requests");
const responsesDir = path.join(schemasRoot, "responses");

const requiredFiles = [
  path.join(schemasRoot, "common.json"),
  path.join(requestsDir, "AiCallRequest.json"),
  path.join(responsesDir, "ApiSuccessEnvelope.json"),
  path.join(responsesDir, "ApiErrorEnvelope.json")
];

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function jsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.toLowerCase().endsWith(".json"))
    .map((file) => path.join(dir, file));
}

const missing = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) missing.push(rel(file));
}

if (!fs.existsSync(objectsDir)) {
  missing.push(rel(objectsDir) + "/");
}
if (!fs.existsSync(requestsDir)) {
  missing.push(rel(requestsDir) + "/");
}
if (!fs.existsSync(responsesDir)) {
  missing.push(rel(responsesDir) + "/");
}

const objectSchemas = jsonFiles(objectsDir).filter(
  (file) => path.basename(file) !== "placeholder.json"
);

const invalidJson = [];
for (const file of [
  ...requiredFiles.filter((required) => fs.existsSync(required)),
  ...objectSchemas
]) {
  try {
    JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    invalidJson.push(`${rel(file)}: ${err.message}`);
  }
}

if (objectSchemas.length < 20) {
  missing.push(`at least 20 stored object schemas; found ${objectSchemas.length}`);
}

if (missing.length || invalidJson.length) {
  console.error("[fail] AI schema pack is incomplete.");
  if (missing.length) {
    console.error("\nMissing:");
    for (const item of missing) console.error(` - ${item}`);
  }
  if (invalidJson.length) {
    console.error("\nInvalid JSON:");
    for (const item of invalidJson) console.error(` - ${item}`);
  }
  console.error(
    "\nRestore the authoritative schema pack into schemas/schemas/ before release validation."
  );
  process.exit(1);
}

console.log(
  `[ok] AI schema pack present: ${objectSchemas.length} object schemas plus request/response envelopes.`
);
