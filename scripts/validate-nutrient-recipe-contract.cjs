#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  console.error(`[nutrient-recipe-contract] ${message}`);
  process.exitCode = 1;
}

function requireText(label, contents, pattern, description) {
  if (!pattern.test(contents)) fail(`${label} missing ${description}`);
}

const model = read("backend/models/NutrientRecipe.js");
const route = read("backend/routes/tools.js");
const api = read("src/api/nutrientRecipes.ts");
const screen = read("src/app/home/personal/(tabs)/tools/npk.tsx");
const featureStatus = read("src/config/featureStatus.ts");
const scienceBasis = read("src/features/personal/tools/MixBuilderScienceBasis.tsx");
const routeTest = read("backend/routes/tools.test.js");
const uiTest = read("tests/unit/NpkToolScreen.test.tsx");

[
  "user",
  "growId",
  "name",
  "description",
  "version",
  "rootRecipeId",
  "previousVersionId",
  "clonedFromRecipeId",
  "stage",
  "medium",
  "batchVolume",
  "batchUnit",
  "products",
  "releaseEnvironment",
  "waterBaseline",
  "measuredEC",
  "measuredPH",
  "sourceConfidence",
  "sourceRecords",
  "mixingOrder",
  "calculation",
  "notes",
  "active",
  "archivedAt",
  "lastUsedAt",
  "useCount"
].forEach((field) => {
  requireText("NutrientRecipe model", model, new RegExp(`\\b${field}\\b`), field);
  requireText("NutrientRecipe API type", api, new RegExp(`\\b${field}\\b`), field);
});

[
  ["list route", /router\.get\("\/recipes"/],
  ["detail route", /router\.get\("\/recipes\/:id"/],
  ["update route", /router\.patch\("\/recipes\/:id"/],
  ["create route", /router\.post\("\/recipes"/],
  ["revision route", /router\.post\("\/recipes\/:id\/revisions"/],
  ["clone route", /router\.post\("\/recipes\/:id\/clone"/],
  ["archive route", /router\.delete\("\/recipes\/:id"/],
  ["use route", /router\.post\("\/recipes\/:id\/use"/],
  ["active list filter", /active: true/],
  ["grow ownership check", /if \(growId && !\(await ownsGrow\(uid, growId\)\)\)/],
  [
    "update recalculates",
    /recipe\.calculation = calculators\.calculateNpkRecipe\(input\)/
  ],
  [
    "revision versioning",
    /version: previous\.version \+ 1[\s\S]*previousVersionId: String\(previous\._id\)/
  ],
  ["clone provenance", /clonedFromRecipeId: String\(source\._id\)/],
  [
    "use creates ToolRun",
    /const toolRun = await createRun\(req, "npk_recipe", input, outputs\)/
  ],
  [
    "use count update",
    /recipe\.lastUsedAt = new Date\(\)[\s\S]*recipe\.useCount = Number\(recipe\.useCount \|\| 0\) \+ 1/
  ]
].forEach(([description, pattern]) => {
  requireText("tools recipe route", route, pattern, description);
});

[
  "listNutrientRecipes",
  "createNutrientRecipe",
  "reviseNutrientRecipe",
  "updateNutrientRecipe",
  "cloneNutrientRecipe",
  "recordNutrientRecipeUse",
  "archiveNutrientRecipe"
].forEach((helper) => {
  requireText("NutrientRecipe API", api, new RegExp(`\\b${helper}\\b`), helper);
  requireText("NPK tool screen", screen, new RegExp(`\\b${helper}\\b`), helper);
});

[
  "Saved recipes",
  "Update Selected Recipe",
  "Archive Selected Recipe",
  "Save New Revision",
  "Save Recipe",
  "Clone Recipe",
  "Recipe use saved to grow history",
  "Create Recipe Task Plan",
  "Convert to Product Draft"
].forEach((text) => {
  requireText(
    "NPK tool screen",
    screen,
    new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    text
  );
});

requireText(
  "NPK tool screen",
  screen,
  /Nutrient Mix Builder[\s\S]*MixBuilderScienceBasis variant="nutrient"/,
  "canonical Nutrient Mix Builder with shared science basis"
);
requireText(
  "personal tool manifest",
  featureStatus,
  /key: "tools\.npk_recipe"[\s\S]*title: "Nutrient Mix Builder"[\s\S]*href: "\/home\/personal\/tools\/npk"/,
  "canonical nutrient builder route"
);
requireText(
  "mix builder science basis",
  scienceBasis,
  /verified product labels[\s\S]*water analysis[\s\S]*does not prove product superiority[\s\S]*Unknown values remain assumptions/,
  "nutrient evidence and uncertainty policy"
);

[
  ["update/archive test", /updates and archives nutrient recipes/],
  ["create test", /creates a nutrient recipe/],
  ["revision test", /revises a recipe using authenticated ownership/],
  ["clone test", /clones a recipe using authenticated ownership/],
  [
    "use test",
    /records nutrient recipe use as a linked ToolRun and feeding history event/
  ]
].forEach(([description, pattern]) => {
  requireText("backend recipe tests", routeTest, pattern, description);
});

[
  "createNutrientRecipe",
  "reviseNutrientRecipe",
  "updateNutrientRecipe",
  "archiveNutrientRecipe",
  "cloneNutrientRecipe",
  "recordNutrientRecipeUse",
  "creates a source-linked NPK recipe task plan",
  "converts calculated recipes into commercial-ready product draft fields"
].forEach((text) => {
  requireText(
    "NPK UI tests",
    uiTest,
    new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    text
  );
});

if (!process.exitCode) {
  console.log("[nutrient-recipe-contract] NutrientRecipe contract verified");
}
