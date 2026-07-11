#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  console.error(`[source-record-contract] ${message}`);
  process.exitCode = 1;
}

function requireText(label, contents, pattern, description) {
  if (!pattern.test(contents)) fail(`${label} missing ${description}`);
}

const schema = read("backend/models/schemas/sourceRecord.js");
const toolsRoute = read("backend/routes/tools.js");
const cropRoute = read("backend/routes/cropKnowledge.js");
const productApi = read("src/api/productIngredients.ts");
const cropApi = read("src/api/cropKnowledge.ts");
const recipeApi = read("src/api/nutrientRecipes.ts");
const toolsTest = read("backend/routes/tools.test.js");
const cropTest = read("backend/routes/cropKnowledge.test.js");

[
  "sourceName",
  "sourceType",
  "url",
  "citation",
  "license",
  "licenseReviewedAt",
  "commercialUseAllowed",
  "trainingUseAllowed",
  "accessedAt",
  "lastReviewedAt",
  "region",
  "cropScope",
  "confidence",
  "notes"
].forEach((field) => {
  requireText("SourceRecord schema", schema, new RegExp(`\\b${field}\\b`), field);
  requireText("product ingredient API SourceRecord", productApi, new RegExp(`\\b${field}\\b`), field);
});

[
  "extension",
  "federal",
  "academic",
  "api",
  "manufacturer_label",
  "manufacturer",
  "user_entered",
  "growpath_verified",
  "ai_assisted",
  "other"
].forEach((sourceType) => {
  requireText("SourceRecord schema sourceType enum", schema, new RegExp(`"${sourceType}"`), sourceType);
  requireText("crop knowledge API SourceRecord sourceType", cropApi, new RegExp(`"${sourceType}"`), sourceType);
});

[
  "backend/models/ProductIngredient.js",
  "backend/models/NutrientRecipe.js",
  "backend/models/CropProfile.js",
  "backend/models/OrganismProfile.js",
  "backend/models/PlantGrowthProfile.js",
  "backend/models/PlantTaxon.js",
  "backend/models/RegionalAlert.js"
].forEach((relPath) => {
  const contents = read(relPath);
  requireText(relPath, contents, /SourceRecordSchema/, "SourceRecordSchema import/use");
  requireText(relPath, contents, /sourceRecords:\s*\{\s*type:\s*\[SourceRecordSchema\]/, "typed sourceRecords array");
});

[
  ["tools ingredient patch", toolsRoute, /"sourceRecords"/],
  ["tools recipe patch", toolsRoute, /const allowed = \[[\s\S]*"sourceRecords"[\s\S]*\]/],
  ["tools recipe create", toolsRoute, /sourceRecords: Array\.isArray\(req\.body\?\.sourceRecords\)/],
  ["crop knowledge route fields", cropRoute, /sourceRecords/],
  ["crop knowledge allowedPatch", cropRoute, /allowedPatch\(req\.body, (taxonFields|cropProfileFields|organismFields|alertFields|growthFields)\)/],
  ["nutrient recipe API type", recipeApi, /sourceRecords\?: SourceRecord\[\]/],
  ["tools route tests", toolsTest, /sourceRecords[\s\S]*sourceName/],
  ["crop knowledge route tests", cropTest, /sourceRecords[\s\S]*sourceName/]
].forEach(([label, contents, pattern]) => {
  requireText(label, contents, pattern, "sourceRecords contract coverage");
});

if (!process.exitCode) {
  console.log("[source-record-contract] canonical SourceRecord/provenance contract verified");
}
