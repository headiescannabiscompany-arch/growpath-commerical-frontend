#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  console.error(`[genetics-pheno-contract] ${message}`);
  process.exitCode = 1;
}

function requireText(label, contents, pattern, description) {
  if (!pattern.test(contents)) fail(`${label} missing ${description}`);
}

const toolsRoute = read("backend/routes/tools.js");
const calculators = read("backend/services/toolCalculators.js");
const moduleModel = read("backend/models/GrowpathModuleRecord.js");
const moduleRoute = read("backend/routes/growpathModules.js");
const plantGrowthModel = read("backend/models/PlantGrowthProfile.js");
const cropApi = read("src/api/cropKnowledge.ts");
const toolRunsApi = read("src/api/toolRuns.ts");
const modulePersistence = read("src/features/personal/tools/moduleRecordPersistence.ts");
const phenoMatrixLogic = read("src/features/personal/tools/phenoMatrix.ts");

const screens = {
  genetics: read("src/app/home/personal/(tabs)/tools/genetics-inventory.tsx"),
  phenoMatrix: read("src/app/home/personal/(tabs)/tools/pheno-matrix.tsx"),
  phenoHunt: read("src/app/home/personal/(tabs)/tools/pheno-hunt.tsx"),
  stress: read("src/app/home/personal/(tabs)/tools/stress-test.tsx"),
  cropSteering: read("src/app/home/personal/(tabs)/tools/crop-steering-project.tsx")
};

const tests = {
  backendTools: read("backend/routes/tools.test.js"),
  backendModules: read("backend/routes/growpathModules.test.js"),
  cropKnowledge: read("backend/routes/cropKnowledge.test.js"),
  genetics: read("tests/unit/GeneticsInventoryToolScreen.test.tsx"),
  phenoMatrix: read("tests/unit/PhenoMatrixToolScreen.test.tsx"),
  phenoHunt: read("tests/unit/PhenoHuntToolScreen.test.tsx"),
  stress: read("tests/unit/StressTestToolScreen.test.tsx"),
  cropSteering: read("tests/unit/CropSteeringProjectToolScreen.test.tsx"),
  phenoMatrixLogic: read("src/features/personal/tools/__tests__/phenoMatrix.test.ts"),
  modulePersistence: read(
    "src/features/personal/tools/__tests__/moduleRecordPersistence.test.ts"
  )
};

[
  ["/genetics-inventory", "genetics_inventory", "calculateGeneticsInventory"],
  ["/pheno-hunt", "pheno_hunt", "calculatePhenoHunt"],
  ["/stress-test", "stress_test", "calculateStressTest"],
  ["/crop-steering-project", "crop_steering_project", "calculateCropSteeringProject"]
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
  ["genetics item persistence", /calculateGeneticsInventory[\s\S]*geneticsInventoryItem/],
  ["keeper signals", /calculateGeneticsInventory[\s\S]*keeperSignals/],
  ["preservation recommendations", /calculateGeneticsInventory[\s\S]*preservationRecommendations/],
  ["breeding watch", /breedingWatch/],
  ["pheno comparison matrix", /calculatePhenoHunt[\s\S]*comparisonMatrix/],
  ["keeper recommendations", /calculatePhenoHunt[\s\S]*keeperRecommendations/],
  ["retest recommendations", /calculatePhenoHunt[\s\S]*retestRecommendations/],
  ["stress response scoring", /calculateStressTest[\s\S]*stressResponseScore/],
  ["stress recovery scoring", /calculateStressTest[\s\S]*recoveryScore/],
  ["stress stability scoring", /calculateStressTest[\s\S]*stabilityScore/],
  ["keeper impact", /calculateStressTest[\s\S]*keeperImpact/],
  ["selection signals", /calculateStressTest[\s\S]*selectionSignals/],
  ["reject or retest signal", /calculateStressTest[\s\S]*rejectOrRetest/],
  ["crop steering candidate signal", /calculateStressTest[\s\S]*cropSteeringCandidate/],
  ["steering intent", /calculateCropSteeringProject[\s\S]*steeringIntent/],
  ["dryback steering", /calculateCropSteeringProject[\s\S]*dryback/],
  ["pheno impact", /calculateCropSteeringProject[\s\S]*phenoImpact/],
  ["pheno score notes", /calculateCropSteeringProject[\s\S]*notesForPhenoScore/],
  ["steering task plan", /calculateCropSteeringProject[\s\S]*tasksToCreate/]
].forEach(([description, pattern]) => {
  requireText("tool calculators", calculators, pattern, description);
});

[
  ["pheno plant id", /phenoPlantId/],
  ["genetics id", /geneticsId/],
  ["user decision", /userDecision/],
  ["outcome", /outcome/],
  ["source records", /sourceRecords/],
  ["linked ToolRun", /linkedToolRunId/]
].forEach(([description, pattern]) => {
  requireText("module record model", moduleModel, pattern, description);
});

[
  ["pheno hunt records", /pheno_hunt/],
  ["stress test records", /stress_test/],
  ["genetics note records", /genetics_note/],
  ["crop steering project records", /crop_steering_project/],
  ["crop steering entry records", /crop_steering_entry/]
].forEach(([description, pattern]) => {
  requireText("module record route", moduleRoute, pattern, description);
});

[
  ["pheno hunt records", /"pheno-hunt": "pheno_hunt"/],
  ["stress test records", /"stress-test": "stress_test"/],
  ["genetics note records", /"genetics-inventory": "genetics_note"/],
  ["crop steering entries", /"crop-steering-project": "crop_steering_entry"/]
].forEach(([description, pattern]) => {
  requireText("frontend module persistence", modulePersistence, pattern, description);
});

[
  ["pheno label", /phenoLabel/],
  ["keeper status", /keeperStatus/],
  ["keeper reason", /keeperReason/],
  ["clone status", /cloneStatus/],
  ["mother status", /motherStatus/],
  ["pheno scores", /phenoScores/],
  ["stage scorecards", /stageScorecards/],
  ["stress sensitivities", /stressSensitivities/]
].forEach(([description, pattern]) => {
  requireText("plant growth profile model", plantGrowthModel, pattern, description);
  requireText("crop knowledge API", cropApi, pattern, description);
});

[
  ["CalculatorTool includes genetics", /\|\s*"genetics-inventory"/],
  ["CalculatorTool includes pheno hunt", /\|\s*"pheno-hunt"/],
  ["CalculatorTool includes stress", /\|\s*"stress-test"/],
  ["CalculatorTool includes crop steering", /\|\s*"crop-steering-project"/]
].forEach(([description, pattern]) => {
  requireText("toolRuns API", toolRunsApi, pattern, description);
});

[
  ["weighted scoring", /rankPhenoCandidates[\s\S]*weights/],
  ["ranked recommendations", /recommendation[\s\S]*keeper[\s\S]*watch[\s\S]*cull/],
  ["score clamping", /clampScore/]
].forEach(([description, pattern]) => {
  requireText("pheno matrix logic", phenoMatrixLogic, pattern, description);
});

[
  ["genetics ToolRun screen", screens.genetics, /tool="genetics-inventory"/],
  ["genetics follow-up tasks", screens.genetics, /Create Genetics Follow-up Tasks/],
  ["genetics preservation task", screens.genetics, /genetics_preservation_followup/],
  ["genetics record linking", screens.genetics, /genetics_record_linking/],
  ["pheno matrix scoring", screens.phenoMatrix, /rankPhenoCandidates/],
  ["pheno matrix saves growth profile", screens.phenoMatrix, /savePlantGrowthProfile/],
  ["pheno matrix scores", screens.phenoMatrix, /phenoScores/],
  ["pheno matrix stage scorecards", screens.phenoMatrix, /stageScorecards/],
  ["pheno matrix keeper status", screens.phenoMatrix, /keeperStatus/],
  ["pheno matrix decision tasks", screens.phenoMatrix, /Create Pheno Decision Tasks/],
  ["pheno hunt ToolRun screen", screens.phenoHunt, /tool="pheno-hunt"/],
  ["pheno hunt decision tasks", screens.phenoHunt, /Create Pheno Decision Tasks/],
  ["pheno hunt keeper task", screens.phenoHunt, /Preserve keeper candidate/],
  ["pheno hunt retest task", screens.phenoHunt, /Retest pheno/],
  ["stress ToolRun screen", screens.stress, /tool="stress-test"/],
  ["stress follow-up tasks", screens.stress, /Create Stress Follow-up Tasks/],
  ["stress keeper decision", screens.stress, /keeper_retest_decision/],
  ["stress crop steering candidate", screens.stress, /crop_steering_candidate/],
  ["crop steering ToolRun screen", screens.cropSteering, /tool="crop-steering-project"/],
  ["crop steering task plan", screens.cropSteering, /Create Steering Task Plan/],
  ["crop steering follow-up metadata", screens.cropSteering, /crop_steering_followup/],
  ["crop steering pheno note", screens.cropSteering, /notesForPhenoScore|phenoImpact/]
].forEach(([description, contents, pattern]) => {
  requireText("Phase 4 screen", contents, pattern, description);
});

[
  ["stress backend tests", tests.backendTools, /runs stress testing and clone rooting tools/],
  ["genetics backend tests", tests.backendTools, /runs genetics inventory and harvest readiness tools/],
  ["crop steering backend tests", tests.backendTools, /runs inventory, crop steering project, and pheno hunt tools/],
  ["module record backend tests", tests.backendModules, /lists owned module records with filters[\s\S]*creates an owned module record from a tool output[\s\S]*updates and archives owned module records/],
  ["plant growth pheno backend tests", tests.cropKnowledge, /upserts, updates, and archives user-owned plant growth profiles[\s\S]*keeperStatus[\s\S]*stageScorecards/],
  ["genetics UI tests", tests.genetics, /genetics provenance and preservation follow-up tasks/],
  ["pheno matrix UI tests", tests.phenoMatrix, /source-linked pheno decision task plan[\s\S]*ranked keeper decisions/],
  ["pheno hunt UI tests", tests.phenoHunt, /keeper and retest tasks/],
  ["stress UI tests", tests.stress, /stress follow-up tasks[\s\S]*default stress follow-up task/],
  ["crop steering UI tests", tests.cropSteering, /creates crop steering tasks from calculator task output/],
  ["pheno matrix logic tests", tests.phenoMatrixLogic, /weighted trait averages[\s\S]*clamps out-of-range trait scores/],
  ["module persistence tests", tests.modulePersistence, /pheno_hunt[\s\S]*ipm_scout/]
].forEach(([description, contents, pattern]) => {
  requireText("Phase 4 tests", contents, pattern, description);
});

if (!process.exitCode) {
  console.log("[genetics-pheno-contract] Genetics/pheno/stress/crop steering contract verified");
}
