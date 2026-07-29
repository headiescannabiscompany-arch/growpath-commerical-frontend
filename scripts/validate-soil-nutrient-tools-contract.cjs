#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  console.error(`[soil-nutrient-tools-contract] ${message}`);
  process.exitCode = 1;
}

function requireText(label, contents, pattern, description) {
  if (!pattern.test(contents)) fail(`${label} missing ${description}`);
}

const toolsRoute = read("backend/routes/tools.js");
const calculators = read("backend/services/toolCalculators.js");
const chemistry = read("backend/services/nutrientChemistry.js");
const toolRunsApi = read("src/api/toolRuns.ts");
const feedingApi = read("src/api/feeding.js");
const backendTest = read("backend/routes/tools.test.js");
const featureStatus = read("src/config/featureStatus.ts");
const mixChooser = read("src/app/home/personal/(tabs)/tools/recipe-builder.tsx");
const scienceBasis = read("src/features/personal/tools/MixBuilderScienceBasis.tsx");

const screens = {
  npk: read("src/app/home/personal/(tabs)/tools/npk.tsx"),
  nutrientChemistry: read("src/app/home/personal/(tabs)/tools/nutrient-chemistry.tsx"),
  nutrientSourceComparison: read(
    "src/app/home/personal/(tabs)/tools/nutrient-source-comparison.tsx"
  ),
  soilBuilder: read("src/app/home/personal/(tabs)/tools/soil-builder.tsx"),
  dryAmendmentMix: read("src/app/home/personal/(tabs)/tools/dry-amendment-mix.tsx"),
  topdress: read("src/app/home/personal/(tabs)/tools/topdress.tsx"),
  phEc: read("src/app/home/personal/(tabs)/tools/ph-ec.tsx"),
  feedingSchedule: read("src/app/home/personal/(tabs)/tools/feeding-schedule.tsx")
};

const tests = {
  npk: read("tests/unit/NpkToolScreen.test.tsx"),
  chemistry: read("tests/unit/NutrientChemistryToolScreen.test.tsx"),
  sourceComparison: read(
    "src/features/personal/tools/__tests__/BackendCalculatorToolScreen.test.tsx"
  ),
  soilBuilder: read("tests/unit/SoilBuilderToolScreen.test.tsx"),
  dryAmendmentMix: read("tests/unit/DryAmendmentMixToolScreen.test.tsx"),
  topdress: read("tests/unit/TopdressToolScreen.test.tsx"),
  feedingApi: read("tests/unit/feeding-api.test.ts"),
  feedingSchedule: read("tests/unit/FeedingScheduleToolScreen.test.tsx"),
  feedingReview: read("tests/unit/feeding-schedule-review.test.ts")
};

[
  ["/npk-recipe", "npk_recipe", "calculateNpkRecipe"],
  ["/ph-ec-check", "ph_ec_check", "calculatePhEcCheck"],
  ["/topdress-plan", "topdress_plan", "calculateTopdressPlan"],
  [
    "/feeding-schedule-review",
    "feeding_schedule_review",
    "calculateFeedingScheduleReview"
  ],
  ["/dry-amendment-mix", "dry_amendment_mix", "calculateDryAmendmentMix"],
  ["/soil-builder", "soil_builder", "calculateSoilBuilder"],
  [
    "/nutrient-source-comparison",
    "nutrient_source_comparison",
    "calculateNutrientSourceComparison"
  ]
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
  requireText(
    "tool calculators export",
    calculators,
    new RegExp(`\\b${fn}\\b`),
    `${fn} export`
  );
});

[
  ["NPK elemental conversion", /P2O5[\s\S]*K2O[\s\S]*elemental/],
  ["NPK release timing", /buildAvailabilityEstimate[\s\S]*releaseTimeline/],
  ["pH/EC retest task", /retestTaskSuggestion[\s\S]*Retest pH\s*\/?\s*EC/],
  ["topdress follow-up tasks", /followUpTasks[\s\S]*Water in topdress/],
  [
    "feeding schedule risk review",
    /calculateFeedingScheduleReview[\s\S]*riskLevel[\s\S]*tasksToCreate/
  ],
  [
    "dry amendment guaranteed analysis",
    /calculateDryAmendmentMix[\s\S]*totalAnalysis[\s\S]*achievedRatio/
  ],
  [
    "soil builder release timeline",
    /calculateSoilBuilder[\s\S]*releaseTimeline[\s\S]*stageTimingWarnings/
  ],
  [
    "nutrient source speed groups",
    /calculateNutrientSourceComparison[\s\S]*fastSources[\s\S]*mediumSources[\s\S]*slowSources/
  ]
].forEach(([description, pattern]) => {
  requireText("tool calculators", calculators, pattern, description);
});

[
  ["chemistry presets", /CHEMISTRY_PRESETS/],
  ["release timeline", /buildReleaseTimeline/],
  ["compatibility warnings", /compatibilityWarnings/],
  ["stage timing warnings", /stageTimingWarnings/]
].forEach(([description, pattern]) => {
  requireText("nutrient chemistry service", chemistry, pattern, description);
});

[
  ["CalculatorTool includes npk", /\|\s*"npk-recipe"/],
  ["CalculatorTool includes ph-ec", /\|\s*"ph-ec-check"/],
  ["CalculatorTool includes topdress", /\|\s*"topdress-plan"/],
  ["CalculatorTool includes feeding review", /\|\s*"feeding-schedule-review"/],
  ["CalculatorTool includes dry amendment", /\|\s*"dry-amendment-mix"/],
  ["CalculatorTool includes soil builder", /\|\s*"soil-builder"/],
  ["CalculatorTool includes source comparison", /\|\s*"nutrient-source-comparison"/]
].forEach(([description, pattern]) => {
  requireText("toolRuns API", toolRunsApi, pattern, description);
});

requireText(
  "feeding API",
  feedingApi,
  /apiRequest\("\/api\/tools\/feeding-schedule-review"/,
  "ToolRun-backed feeding schedule review endpoint"
);
requireText(
  "feeding API",
  feedingApi,
  /defaultScheduleRows[\s\S]*review: outputs/,
  "schedule row normalization around backend review output"
);

[
  ["NPK screen ToolRun calculator", screens.npk, /runCalculator<any>\("npk-recipe"/],
  ["NPK task plan", screens.npk, /Create Recipe Task Plan[\s\S]*npkRecipeTasks/],
  ["NPK product draft", screens.npk, /Convert to Product Draft[\s\S]*createProduct/],
  [
    "nutrient chemistry compatibility",
    screens.nutrientChemistry,
    /compatibilityAnalysis[\s\S]*Create Review Task/
  ],
  [
    "source comparison task plan",
    screens.nutrientSourceComparison,
    /tool="nutrient-source-comparison"[\s\S]*Create Source Review Tasks/
  ],
  [
    "soil builder tasks",
    screens.soilBuilder,
    /tool="soil-builder"[\s\S]*Create Recipe Timeline Tasks/
  ],
  [
    "soil builder product draft",
    screens.soilBuilder,
    /Convert to Product Draft[\s\S]*createProduct/
  ],
  [
    "dry amendment batch tasks",
    screens.dryAmendmentMix,
    /tool="dry-amendment-mix"[\s\S]*Create Blend Batch Tasks/
  ],
  [
    "dry amendment product draft",
    screens.dryAmendmentMix,
    /Convert to Product Draft[\s\S]*createProduct/
  ],
  [
    "topdress task plan",
    screens.topdress,
    /tool="topdress-plan"[\s\S]*Create Topdress Follow-up Tasks/
  ],
  ["pH/EC task plan", screens.phEc, /tool="ph-ec-check"[\s\S]*Create pH \/ EC Task Plan/],
  [
    "feeding schedule saves review",
    screens.feedingSchedule,
    /generateSchedule[\s\S]*Create Feeding Review Task/
  ]
].forEach(([description, contents, pattern]) => {
  requireText("Phase 2 screen", contents, pattern, description);
});

requireText(
  "NPK screen",
  screens.npk,
  /Nutrient Mix Builder[\s\S]*MixBuilderScienceBasis variant="nutrient"/,
  "canonical nutrient mix builder science basis"
);
requireText(
  "soil builder screen",
  screens.soilBuilder,
  /title="Soil Mix Builder"[\s\S]*MixBuilderScienceBasis variant="soil"/,
  "canonical soil mix builder science basis"
);
requireText(
  "mix chooser",
  mixChooser,
  /Nutrient Mix Builder[\s\S]*Soil Mix Builder[\s\S]*only two primary mix builders/,
  "two canonical mix builder choices"
);
requireText(
  "personal tool manifest",
  featureStatus,
  /key: "tools\.mix_builders"[\s\S]*title: "Soil & Nutrient Mix Builders"[\s\S]*href: "\/home\/personal\/tools\/recipe-builder"/,
  "single mix-builder hub entry"
);
requireText(
  "personal tool manifest",
  featureStatus,
  /key: "tools\.npk_recipe"[\s\S]*title: "Nutrient Mix Builder"[\s\S]*href: "\/home\/personal\/tools\/npk"[\s\S]*hubVisible: false/,
  "canonical nutrient mix builder catalog entry"
);
requireText(
  "personal tool manifest",
  featureStatus,
  /key: "tools\.soil_builder"[\s\S]*title: "Soil Mix Builder"[\s\S]*href: "\/home\/personal\/tools\/soil-builder"[\s\S]*hubVisible: false/,
  "canonical soil mix builder catalog entry"
);
requireText(
  "personal tool manifest",
  featureStatus,
  /key: "tools\.product_ingredient_library"[\s\S]*href: "\/home\/personal\/tools\/ingredient-library"[\s\S]*hubVisible: false/,
  "supporting label library hidden from the primary hub"
);
requireText(
  "mix builder science basis",
  scienceBasis,
  /verified product labels[\s\S]*soil\/substrate lab tests[\s\S]*Lab and measured grow evidence take precedence/,
  "shared source and uncertainty policy"
);

[
  ["NPK route test", backendTest, /runs NPK recipe with elemental conversion/],
  [
    "pH/EC route test",
    backendTest,
    /runs pH\/EC range check and saves a canonical ToolRun/
  ],
  [
    "feeding route test",
    backendTest,
    /reviews feeding schedules for stage, medium, pH, and EC risk/
  ],
  ["topdress route test", backendTest, /runs topdress planner with late flower warning/],
  [
    "dry amendment route test",
    backendTest,
    /runs dry amendment mix builder with guaranteed-analysis output/
  ],
  [
    "soil/source route test",
    backendTest,
    /runs soil builder and nutrient source comparison foundations/
  ],
  [
    "NPK UI tests",
    tests.npk,
    /source-linked NPK recipe task plan[\s\S]*commercial-ready product draft/
  ],
  [
    "chemistry UI test",
    tests.chemistry,
    /creates nutrient review tasks with shared Schedule metadata/
  ],
  [
    "soil builder UI tests",
    tests.soilBuilder,
    /target profile, release timing[\s\S]*soil recipe task timeline/
  ],
  [
    "dry amendment UI tests",
    tests.dryAmendmentMix,
    /source-linked dry amendment batch tasks[\s\S]*commercial product drafts/
  ],
  [
    "topdress UI tests",
    tests.topdress,
    /topdress application and follow-up task schedule/
  ],
  ["feeding API test", tests.feedingApi, /ToolRun-backed review route/],
  [
    "feeding schedule UI test",
    tests.feedingSchedule,
    /feeding review tasks with shared Schedule metadata/
  ],
  [
    "feeding review unit test",
    tests.feedingReview,
    /flags high-risk late flower schedules/
  ]
].forEach(([description, contents, pattern]) => {
  requireText("Phase 2 tests", contents, pattern, description);
});

if (!process.exitCode) {
  console.log("[soil-nutrient-tools-contract] Soil and nutrient tools contract verified");
}
