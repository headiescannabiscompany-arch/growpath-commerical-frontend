#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  console.error(`[business-production-contract] ${message}`);
  process.exitCode = 1;
}

function requireText(label, contents, pattern, description) {
  if (!pattern.test(contents)) fail(`${label} missing ${description}`);
}

const toolsRoute = read("backend/routes/tools.js");
const calculators = read("backend/services/toolCalculators.js");
const toolRunsApi = read("src/api/toolRuns.ts");
const moduleRoute = read("backend/routes/growpathModules.js");
const moduleApi = read("src/api/growpathModules.ts");
const modulePersistence = read("src/features/personal/tools/moduleRecordPersistence.ts");
const featureStatus = read("src/config/featureStatus.ts");
const soilBatchScreen = read(
  "src/app/home/personal/(tabs)/tools/soil-nutrient-batch.tsx"
);
const commercialSoilBatchRoute = read(
  "src/app/home/commercial/tools/soil-nutrient-batch.tsx"
);
const commercialToolsIndex = read("src/app/home/commercial/tools/index.tsx");
const facilityInventory = read("src/app/home/facility/(tabs)/inventory.tsx");
const facilityCreateInventory = read(
  "src/app/home/facility/(tabs)/CreateInventoryItemScreen.tsx"
);
const commercialInventory = read("src/app/home/commercial/inventory.tsx");
const commercialInventoryCreate = read("src/app/home/commercial/inventory-create.tsx");
const inventoryApi = read("src/api/inventory.ts");
const endpoints = read("src/api/endpoints.ts");

const tests = {
  backendTools: read("backend/routes/tools.test.js"),
  soilBatch: read("tests/unit/SoilNutrientBatchToolScreen.test.tsx"),
  featureStatus: read("src/config/__tests__/featureStatus.test.ts"),
  facilityInventory: read("tests/unit/FacilityInventoryRoute.test.tsx"),
  facilityCreate: read("tests/unit/FacilityInventoryCreateRoute.test.tsx"),
  commercialCreate: read("tests/unit/CommercialInventoryCreateRoute.test.tsx"),
  commercialWorkflow: read("tests/unit/CommercialWorkflowPages.test.tsx")
};

[
  ["/soil-nutrient-batch", "soil_nutrient_batch", "calculateLivingSoilBatch"],
  ["/personal-inventory", "personal_inventory", "calculatePersonalInventory"]
].forEach(([route, toolName, fn]) => {
  requireText(
    "tools route",
    toolsRoute,
    new RegExp(
      `calculatorRoute\\([\\s\\S]*"${route.replace(/\//g, "\\/")}"[\\s\\S]*"${toolName}"[\\s\\S]*calculators\\.${fn}`
    ),
    `${route} ToolRun-backed calculator route`
  );
  requireText("tool calculators", calculators, new RegExp(`function ${fn}\\b`), fn);
  requireText("tool calculator exports", calculators, new RegExp(`\\b${fn}\\b`), `${fn} export`);
});

[
  ["batch cost estimate", /calculateLivingSoilBatch[\s\S]*costEstimate/],
  ["batch cost per bag", /calculateLivingSoilBatch[\s\S]*costPerBag/],
  ["retail margin", /calculateLivingSoilBatch[\s\S]*retailPriceSuggestion[\s\S]*marginEstimate/],
  ["ingredient pull sheet", /calculateLivingSoilBatch[\s\S]*ingredientPullSheet/],
  ["guaranteed analysis estimate", /calculateLivingSoilBatch[\s\S]*guaranteedAnalysisEstimate/],
  ["release timeline", /calculateLivingSoilBatch[\s\S]*releaseTimeline/],
  ["mixing sheet", /calculateLivingSoilBatch[\s\S]*mixingSheet/],
  ["production tasks", /calculateLivingSoilBatch[\s\S]*tasksToCreate[\s\S]*Pull ingredients[\s\S]*Mix batch/],
  ["inventory low stock warnings", /calculatePersonalInventory[\s\S]*lowStockWarnings/],
  ["inventory reorder suggestions", /calculatePersonalInventory[\s\S]*reorderSuggestions/],
  ["inventory cost per use", /calculatePersonalInventory[\s\S]*costPerUse/]
].forEach(([description, pattern]) => {
  requireText("tool calculators", calculators, pattern, description);
});

[
  ["soil nutrient batch ToolRun type", /\|\s*"soil-nutrient-batch"/]
].forEach(([description, pattern]) => {
  requireText("toolRuns API", toolRunsApi, pattern, description);
});

[
  ["soil nutrient batch record type", /soil_nutrient_batch/]
].forEach(([description, pattern]) => {
  requireText("module record route", moduleRoute, pattern, description);
  requireText("module record API", moduleApi, pattern, description);
  requireText("frontend module persistence", modulePersistence, pattern, description);
});

[
  ["soil batch ToolRun screen", /tool="soil-nutrient-batch"/],
  ["batch planner title", /Soil & Nutrient Batch Planner/],
  ["ingredient rows", /Ingredients as lines: name, quantity, unit, cost, N, P2O5, K2O/],
  ["labor cost field", /Labor cost/],
  ["packaging cost field", /Packaging cost/],
  ["margin field", /Target margin %/],
  ["cost metric", /Cost \/ bag/],
  ["AI brief", /AI-guided, calculator-verified[\s\S]*Ask AI to Plan Batch/],
  ["production tasks action", /Create Batch Task Plan/],
  ["ingredient pull task", /ingredient_pull/],
  ["mixing actuals task", /batch_mixing_actuals/],
  ["QA label task", /batch_qa_label_review/],
  ["inventory/product update task", /batch_inventory_product_update/]
].forEach(([description, pattern]) => {
  requireText("soil nutrient batch screen", soilBatchScreen, pattern, description);
});

[
  ["commercial soil batch route", /CommercialSoilNutrientBatchToolRoute as default/],
  ["commercial tools listing", /Soil & Nutrient Batch Planner[\s\S]*\/home\/commercial\/tools\/soil-nutrient-batch/]
].forEach(([description, pattern], index) => {
  requireText(
    "commercial soil nutrient batch surface",
    index === 0 ? commercialSoilBatchRoute : commercialToolsIndex,
    pattern,
    description
  );
});

[
  ["personal inventory removed", /key: "tools\.inventory"[\s\S]*status: "remove_from_user_app"[\s\S]*href: undefined/],
  ["inventory decision note", /Inventory belongs to commercial and facility surfaces, not the personal tools hub/],
  ["soil batch commercial-only route", /tools\.soil_nutrient_batch_planner[\s\S]*href: "\/home\/commercial\/tools\/soil-nutrient-batch"[\s\S]*hubVisible: false[\s\S]*Commercial-only beta production workflow/]
].forEach(([description, pattern]) => {
  requireText("feature status", featureStatus, pattern, description);
});

[
  ["facility inventory list", /apiRequest\(endpoints\.inventory\(facilityId\)\)/],
  ["facility inventory create route", /router\.push\("\/home\/facility\/inventory\/new"\)/],
  ["facility inventory detail route", /\/home\/facility\/inventory\/\[id\]/],
  ["facility low stock display", /low stock|stockStatus/],
  ["facility create inventory API", /apiRequest\(endpoints\.inventory\(facilityId\),[\s\S]*method: "POST"/],
  ["commercial inventory support list", /Commercial Inventory Support/],
  ["commercial inventory create route", /\/home\/commercial\/inventory\/new/],
  ["commercial inventory support copy", /inventory support tracks stock/i],
  ["commercial inventory create API", /apiRequest\(path,[\s\S]*method: "POST"/]
].forEach(([description, pattern]) => {
  const contents = description.startsWith("facility create")
    ? facilityCreateInventory
    : description.startsWith("facility")
      ? facilityInventory
      : description.startsWith("commercial inventory create API") ||
          description.startsWith("commercial inventory support copy")
        ? commercialInventoryCreate
        : commercialInventory;
  requireText("inventory surfaces", contents, pattern, description);
});

[
  ["inventory API list", /getInventory/],
  ["inventory API create", /createInventoryItem/],
  ["inventory API update", /updateInventoryItem/],
  ["inventory API delete", /deleteInventoryItem/],
  ["facility inventory endpoint", /inventory: \(facilityId: string\) => facilityPath\(facilityId, "\/inventory"\)/],
  ["commercial inventory endpoint", /commercial:[\s\S]*inventory: `\$\{BASE\}\/commercial\/inventory`/]
].forEach(([description, pattern]) => {
  requireText("inventory API/endpoints", `${inventoryApi}\n${endpoints}`, pattern, description);
});

[
  ["backend soil batch test", tests.backendTools, /runs tissue culture and soil nutrient batch tools[\s\S]*costPerBag[\s\S]*ingredientPullSheet/],
  ["backend personal inventory test", tests.backendTools, /runs inventory, crop steering project, and pheno hunt tools[\s\S]*lowStockWarnings[\s\S]*reorderSuggestions/],
  ["soil batch UI tests", tests.soilBatch, /creates production tasks from soil nutrient batch output[\s\S]*builds an AI soil batch brief/],
  ["feature status inventory test", tests.featureStatus, /keeps removed\/internal-only tools out of the user-facing app[\s\S]*tools\.inventory/],
  ["feature status soil batch test", tests.featureStatus, /keeps the soil and nutrient batch planner in Commercial only[\s\S]*\/home\/commercial\/tools\/soil-nutrient-batch/],
  ["commercial soil batch UI route test", tests.soilBatch, /\/home\/commercial\/tools\/soil-nutrient-batch/],
  ["facility inventory tests", tests.facilityInventory, /does not show AI stock-risk review before inventory exists[\s\S]*uses canonical facility inventory routes/],
  ["facility inventory create tests", tests.facilityCreate, /Create Inventory Item[\s\S]*Inventory item name/],
  ["commercial inventory create tests", tests.commercialCreate, /creates commercial inventory with item type, location, and linked records/],
  ["commercial inventory detail tests", tests.commercialWorkflow, /Inventory Support Record[\s\S]*linked inventory|inventory support/i]
].forEach(([description, contents, pattern]) => {
  requireText("Phase 7 tests", contents, pattern, description);
});

if (!process.exitCode) {
  console.log("[business-production-contract] Business/production contract verified");
}
