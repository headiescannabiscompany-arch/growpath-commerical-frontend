#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  console.error(`[crop-profile-contract] ${message}`);
  process.exitCode = 1;
}

function requireText(label, contents, pattern, description) {
  if (!pattern.test(contents)) fail(`${label} missing ${description}`);
}

const taxonModel = read("backend/models/PlantTaxon.js");
const cropModel = read("backend/models/CropProfile.js");
const growthModel = read("backend/models/PlantGrowthProfile.js");
const route = read("backend/routes/cropKnowledge.js");
const api = read("src/api/cropKnowledge.ts");
const routeTest = read("backend/routes/cropKnowledge.test.js");
const apiTest = read("tests/unit/cropKnowledge-api.test.ts");

[
  "scientificName",
  "commonNames",
  "family",
  "genus",
  "species",
  "synonyms",
  "gbifTaxonKey",
  "usdaSymbol",
  "powoId",
  "nativeRange",
  "introducedRange",
  "cropCategory",
  "curationStatus",
  "sourceRecords",
  "submittedBy",
  "archivedAt"
].forEach((field) => {
  requireText("PlantTaxon model", taxonModel, new RegExp(`\\b${field}\\b`), field);
  requireText("PlantTaxon API input", api, new RegExp(`\\b${field}\\b`), field);
});

[
  "cropKey",
  "displayName",
  "plantTaxon",
  "scientificName",
  "commonNames",
  "cropCategory",
  "growthHabit",
  "productionSystems",
  "stages",
  "environmentTargets",
  "nutritionTargets",
  "symptomPatterns",
  "ipmRiskNotes",
  "cultivarSensitivity",
  "recommendationCautions",
  "sourceRecords",
  "curationStatus",
  "reviewedBy",
  "reviewedAt",
  "archivedAt"
].forEach((field) => {
  requireText("CropProfile model", cropModel, new RegExp(`\\b${field}\\b`), field);
  requireText("CropProfile API input", api, new RegExp(`\\b${field}\\b`), field);
});

[
  "user",
  "growId",
  "plantId",
  "cropProfile",
  "confirmedScientificName",
  "cultivarName",
  "phenoLabel",
  "keeperStatus",
  "cloneStatus",
  "motherStatus",
  "confirmationStatus",
  "phenoScores",
  "stageScorecards",
  "sizeMetrics",
  "timingAdjustments",
  "waterUseProfile",
  "stressSensitivities",
  "pestDiseaseSensitivities",
  "sourceRecords"
].forEach((field) => {
  requireText("PlantGrowthProfile model", growthModel, new RegExp(`\\b${field}\\b`), field);
  requireText("PlantGrowthProfile API input", api, new RegExp(`\\b${field}\\b`), field);
});

[
  ["taxa list", /router\.get\("\/taxa"/],
  ["taxa create", /router\.post\("\/taxa"/],
  ["taxa detail", /router\.get\("\/taxa\/:id"/],
  ["taxa update", /router\.patch\("\/taxa\/:id"/],
  ["taxa archive", /router\.delete\("\/taxa\/:id"/],
  ["crop profile list", /router\.get\("\/crop-profiles"/],
  ["crop profile starter seed", /router\.post\("\/crop-profiles\/starter-seed"/],
  ["crop profile create", /router\.post\("\/crop-profiles"/],
  ["crop profile update", /router\.patch\("\/crop-profiles\/:id"/],
  ["plant growth upsert", /router\.post\("\/plant-growth-profiles"/],
  ["plant growth user ownership", /user: objectUser/],
  ["source records allowed", /sourceRecords/],
  ["archive behavior", /\{ archivedAt: new Date\(\) \}/]
].forEach(([description, pattern]) => {
  requireText("cropKnowledge route", route, pattern, description);
});

[
  "listPlantTaxa",
  "createPlantTaxon",
  "getPlantTaxon",
  "updatePlantTaxon",
  "archivePlantTaxon",
  "listCropProfiles",
  "createCropProfile",
  "updateCropProfile",
  "archiveCropProfile",
  "seedStarterCropProfiles",
  "savePlantGrowthProfile",
  "updatePlantGrowthProfile",
  "archivePlantGrowthProfile"
].forEach((helper) => {
  requireText("cropKnowledge API", api, new RegExp(`\\b${helper}\\b`), helper);
});

[
  ["taxa route test", /creates, updates, and archives plant taxa with source provenance intact/],
  ["crop profile provenance test", /lists and creates crop profiles with source provenance intact/],
  ["starter seed test", /seeds starter crop profiles as license-review drafts/],
  ["plant growth ownership test", /upserts, updates, and archives user-owned plant growth profiles/]
].forEach(([description, pattern]) => {
  requireText("cropKnowledge route tests", routeTest, pattern, description);
});

[
  ["crop profile API test", /creates crop profiles with source provenance intact/],
  ["starter seed API test", /starter crop profile seed endpoint/],
  ["plant growth API test", /saves plant growth overlays for size, pheno, timing, and water use/]
].forEach(([description, pattern]) => {
  requireText("cropKnowledge API tests", apiTest, pattern, description);
});

if (!process.exitCode) {
  console.log("[crop-profile-contract] Crop profile/taxon contract verified");
}
