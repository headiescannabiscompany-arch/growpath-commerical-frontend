#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  console.error(`[propagation-tc-contract] ${message}`);
  process.exitCode = 1;
}

function requireText(label, contents, pattern, description) {
  if (!pattern.test(contents)) fail(`${label} missing ${description}`);
}

const toolsRoute = read("backend/routes/tools.js");
const calculators = read("backend/services/toolCalculators.js");
const moduleRoute = read("backend/routes/growpathModules.js");
const moduleModel = read("backend/models/GrowpathModuleRecord.js");
const moduleApi = read("src/api/growpathModules.ts");
const modulePersistence = read("src/features/personal/tools/moduleRecordPersistence.ts");
const toolRunsApi = read("src/api/toolRuns.ts");

const cloneScreen = read("src/app/home/personal/(tabs)/tools/clone-rooting.tsx");
const tcScreen = read("src/app/home/personal/(tabs)/tools/tissue-culture.tsx");

const tests = {
  backendTools: read("backend/routes/tools.test.js"),
  backendModules: read("backend/routes/growpathModules.test.js"),
  clone: read("tests/unit/CloneRootingToolScreen.test.tsx"),
  tc: read("tests/unit/TissueCultureToolScreen.test.tsx"),
  modulePersistence: read(
    "src/features/personal/tools/__tests__/moduleRecordPersistence.test.ts"
  )
};

[
  ["/clone-rooting", "clone_rooting", "calculateCloneRooting"],
  ["/tissue-culture", "tissue_culture", "calculateTissueCulture"]
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
  ["clone rooting progress", /calculateCloneRooting[\s\S]*rootingProgress/],
  ["clone performance summary", /calculateCloneRooting[\s\S]*clonePerformanceSummary/],
  ["clone bottlenecks", /calculateCloneRooting[\s\S]*likelyBottlenecks/],
  ["clone follow-up task", /calculateCloneRooting[\s\S]*followUpTask/],
  ["TC project status", /calculateTissueCulture[\s\S]*projectStatus/],
  ["TC batch summary", /calculateTissueCulture[\s\S]*batchSummary/],
  ["TC vessel tracking", /calculateTissueCulture[\s\S]*vesselStatus/],
  ["TC contamination diagnosis", /calculateTissueCulture[\s\S]*diagnosisRecord/],
  ["TC calendar", /calculateTissueCulture[\s\S]*generatedCalendar/],
  ["TC media recipe", /calculateTissueCulture[\s\S]*mediaRecipe/],
  ["TC SOP version", /calculateTissueCulture[\s\S]*SOPVersion/],
  ["TC storage reminders", /calculateTissueCulture[\s\S]*storageReminders/],
  ["TC cost tracking", /calculateTissueCulture[\s\S]*costTracking/],
  ["TC acclimation tracking", /calculateTissueCulture[\s\S]*acclimationRate/]
].forEach(([description, pattern]) => {
  requireText("tool calculators", calculators, pattern, description);
});

[
  ["tissue culture project records", /tissue_culture_project/],
  ["clone batch records", /clone_batch/],
  ["clone batch check records", /clone_batch_check/]
].forEach(([description, pattern]) => {
  requireText("module record route", moduleRoute, pattern, description);
  requireText("module record API", moduleApi, pattern, description);
});

[
  ["clone batch id", /cloneBatchId/],
  ["genetics id", /geneticsId/],
  ["linked ToolRun", /linkedToolRunId/],
  ["tasks to create", /tasksToCreate/],
  ["outcome", /outcome/],
  ["source records", /sourceRecords/]
].forEach(([description, pattern]) => {
  requireText("module record model", moduleModel, pattern, description);
});

[
  ["clone tool persistence", /"clone-rooting": "clone_batch_check"/],
  ["TC tool persistence", /"tissue-culture": "tissue_culture_project"/]
].forEach(([description, pattern]) => {
  requireText("frontend module persistence", modulePersistence, pattern, description);
});

[
  ["CalculatorTool includes clone rooting", /\|\s*"clone-rooting"/],
  ["CalculatorTool includes tissue culture", /\|\s*"tissue-culture"/]
].forEach(([description, pattern]) => {
  requireText("toolRuns API", toolRunsApi, pattern, description);
});

[
  ["clone ToolRun screen", cloneScreen, /tool="clone-rooting"/],
  ["clone follow-up tasks", cloneScreen, /Create Clone Follow-up Tasks/],
  ["clone schedule metadata", cloneScreen, /clone_rooting_followup/],
  ["clone photo review", cloneScreen, /clone_photo_review/],
  ["clone environment adjustment", cloneScreen, /clone_environment_adjustment/],
  ["clone transplant decision", cloneScreen, /clone_transplant_decision/],
  ["TC ToolRun screen", tcScreen, /tool="tissue-culture"/],
  ["TC batch/vessel fields", tcScreen, /Batch number[\s\S]*Total vessels[\s\S]*Contaminated vessels/],
  ["TC media/SOP fields", tcScreen, /Media recipe[\s\S]*SOP version/],
  ["TC acclimation field", tcScreen, /Acclimated plants/],
  ["TC cost fields", tcScreen, /Media cost[\s\S]*Vessel \/ supply cost[\s\S]*Labor cost/],
  ["TC workflow tasks", tcScreen, /Create TC Workflow Tasks/],
  ["TC calendar metadata", tcScreen, /tissue_culture_workflow/],
  ["TC contamination review", tcScreen, /Review contamination and browning/],
  ["TC rooting/acclimation review", tcScreen, /rooting_acclimation_review/],
  ["TC SOP/media review", tcScreen, /sop_media_review/]
].forEach(([description, contents, pattern]) => {
  requireText("Phase 5 screen", contents, pattern, description);
});

[
  ["clone backend test", tests.backendTools, /runs stress testing and clone rooting tools[\s\S]*clonePerformanceSummary/],
  ["TC backend test", tests.backendTools, /runs tissue culture and soil nutrient batch tools[\s\S]*costTracking[\s\S]*generatedCalendar/],
  ["module record backend tests", tests.backendModules, /lists supported module record types[\s\S]*updates and archives owned module records/],
  ["clone UI test", tests.clone, /creates clone rooting follow-up tasks from the saved ToolRun[\s\S]*clone_transplant_decision/],
  ["TC UI test", tests.tc, /creates tissue culture workflow tasks from the saved ToolRun[\s\S]*Vessel \/ supply cost[\s\S]*creates default tissue culture follow-up task/],
  ["module persistence tests", tests.modulePersistence, /maps approved real tools[\s\S]*run_comparison/]
].forEach(([description, contents, pattern]) => {
  requireText("Phase 5 tests", contents, pattern, description);
});

if (!process.exitCode) {
  console.log("[propagation-tc-contract] Propagation/tissue culture contract verified");
}
