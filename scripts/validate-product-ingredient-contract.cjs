#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  console.error(`[product-ingredient-contract] ${message}`);
  process.exitCode = 1;
}

function requireText(label, contents, pattern, description) {
  if (!pattern.test(contents)) fail(`${label} missing ${description}`);
}

const model = read("backend/models/ProductIngredient.js");
const route = read("backend/routes/tools.js");
const api = read("src/api/productIngredients.ts");
const screen = read("src/app/home/personal/(tabs)/tools/ingredient-library.tsx");
const routeTest = read("backend/routes/tools.test.js");
const uiTest = read("tests/unit/IngredientLibraryRoute.test.tsx");

[
  "name",
  "brand",
  "category",
  "chemistryKey",
  "labelNPK",
  "elemental",
  "nutrientForms",
  "densityGml",
  "releaseSpeed",
  "releaseWindow",
  "cost",
  "supplier",
  "organicOrSynthetic",
  "documentUrl",
  "photoUrl",
  "applicationNotes",
  "micronutrientNotes",
  "sourceType",
  "confidence",
  "sourceUrl",
  "sourceRecords",
  "favorite",
  "archivedAt"
].forEach((field) => {
  requireText("ProductIngredient model", model, new RegExp(`\\b${field}\\b`), field);
  requireText("ProductIngredient API type", api, new RegExp(`\\b${field}\\b`), field);
});

[
  ["list route", /router\.get\("\/ingredients"/],
  ["create route", /router\.post\("\/ingredients"/],
  ["detail route", /router\.get\("\/ingredients\/:id"/],
  ["update route", /router\.patch\("\/ingredients\/:id"/],
  ["archive route", /router\.delete\("\/ingredients\/:id"/],
  ["auth scoped query", /user: toObjectId\(getRawUserId\(req\)\)/],
  ["default active filter", /archivedAt = null/],
  ["favorite sort", /sort\(\{ favorite: -1, name: 1 \}\)/],
  [
    "allowed update fields",
    /const allowed = \[[\s\S]*"labelNPK"[\s\S]*"sourceRecords"[\s\S]*"favorite"[\s\S]*\]/
  ],
  ["archive update", /\{ archivedAt: new Date\(\) \}/]
].forEach(([description, pattern]) => {
  requireText("tools ingredient route", route, pattern, description);
});

[
  "listProductIngredients",
  "getProductIngredient",
  "createProductIngredient",
  "updateProductIngredient",
  "archiveProductIngredient"
].forEach((helper) => {
  requireText("ProductIngredient API", api, new RegExp(`\\b${helper}\\b`), helper);
});

[
  "Products & Label Library",
  "payloadFromDraft",
  "sourceRecords",
  "commercialUseAllowed",
  "trainingUseAllowed",
  "archiveProductIngredient",
  "Favorite",
  "Document / COA / SDS URL",
  "Label photo URL",
  "Release speed",
  "Guaranteed analysis"
].forEach((text) => {
  requireText(
    "Ingredient Library UI",
    screen,
    new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    text
  );
});

[
  ["backend CRUD test", routeTest, /reads, updates, and archives product ingredients/],
  [
    "backend source record assertion",
    routeTest,
    /sourceRecords: \[expect\.objectContaining\(\{ sourceName: "Manufacturer label" \}\)\]/
  ],
  ["UI create test", uiTest, /saves reusable ingredient library fields for recipe math/],
  [
    "UI payload assertion",
    uiTest,
    /mockCreateProductIngredient[\s\S]*labelNPK[\s\S]*releaseSpeed[\s\S]*documentUrl[\s\S]*photoUrl/
  ]
].forEach(([label, contents, pattern]) => {
  requireText(label, contents, pattern, "test coverage");
});

if (!process.exitCode) {
  console.log("[product-ingredient-contract] Product/Ingredient contract verified");
}
