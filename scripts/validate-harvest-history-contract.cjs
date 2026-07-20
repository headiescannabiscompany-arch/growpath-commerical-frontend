#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  console.error(`[harvest-history-contract] ${message}`);
  process.exitCode = 1;
}

function requireText(label, contents, pattern, description) {
  if (!pattern.test(contents)) fail(`${label} missing ${description}`);
}

const toolsRoute = read("backend/routes/tools.js");
const calculators = read("backend/services/toolCalculators.js");
const harvestModel = read("backend/models/HarvestBatch.js");
const personalRoute = read("backend/routes/personal.js");
const harvestApi = read("src/api/harvestBatches.ts");
const moduleRoute = read("backend/routes/growpathModules.js");
const moduleApi = read("src/api/growpathModules.ts");
const modulePersistence = read("src/features/personal/tools/moduleRecordPersistence.ts");
const toolRunsApi = read("src/api/toolRuns.ts");
const exportScreen = read("src/app/home/personal/(tabs)/tools/pdf-export.tsx");
const advancedPlanning = read("src/features/personal/tools/advancedPlanning.ts");
const featureStatus = read("src/config/featureStatus.ts");
const productionWebExport = read("scripts/export-production-web.cjs");
const growOverview = read("src/app/home/personal/(tabs)/grows/[growId]/index.tsx");
const growTools = read("src/app/home/personal/(tabs)/grows/[growId]/tools.tsx");
const growRouteUtils = read("src/features/grows/routeUtils.ts");

const screens = {
  harvest: read("src/app/home/personal/(tabs)/tools/harvest-readiness.tsx"),
  dryCure: read("src/app/home/personal/(tabs)/tools/dry-cure-guard.tsx"),
  runComparison: read("src/app/home/personal/(tabs)/tools/run-comparison.tsx"),
  autoCalendar: read("src/app/home/personal/(tabs)/tools/auto-grow-calendar.tsx")
};

const tests = {
  backendTools: read("backend/routes/tools.test.js"),
  personalBackend: read("backend/routes/personal.test.js"),
  harvestApi: read("tests/unit/harvestBatches-api.test.ts"),
  harvest: read("tests/unit/HarvestReadinessToolScreen.test.tsx"),
  dryCure: read("tests/unit/DryCureGuardToolScreen.test.tsx"),
  runComparison: read("tests/unit/RunComparisonToolScreen.test.tsx"),
  autoCalendar: read("tests/unit/AutoGrowCalendarToolScreen.test.tsx"),
  exportRoute: read("tests/unit/PersonalToolSharedBackRoutes.test.tsx"),
  planning: read("src/features/personal/tools/__tests__/advancedPlanning.test.ts")
};

[
  ["/harvest-readiness", "harvest_readiness", "calculateHarvestReadiness"],
  ["/dry-cure-guard", "dry_cure_guard", "calculateDryCureGuard"],
  ["/run-comparison", "run_comparison", "calculateRunComparison"],
  ["/auto-grow-calendar", "auto_grow_calendar", "calculateAutoGrowCalendar"]
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
    "tool calculator exports",
    calculators,
    new RegExp(`\\b${fn}\\b`),
    `${fn} export`
  );
});

[
  ["harvest readiness status", /calculateHarvestReadiness[\s\S]*readinessStatus/],
  ["harvest estimated window", /calculateHarvestReadiness[\s\S]*estimatedWindow/],
  ["harvest maturity signals", /calculateHarvestReadiness[\s\S]*wholePlantMaturity/],
  ["harvest recheck task", /calculateHarvestReadiness[\s\S]*harvestTask/],
  ["dry/cure mold risk", /calculateDryCureGuard[\s\S]*moldRisk/],
  ["dry/cure overdry risk", /calculateDryCureGuard[\s\S]*overdryRisk/],
  ["dry/cure dew point", /calculateDryCureGuard[\s\S]*dewPointF/],
  ["dry/cure tasks", /calculateDryCureGuard[\s\S]*taskSuggestions/],
  ["run comparison best/worst", /calculateRunComparison[\s\S]*bestRun[\s\S]*worstRun/],
  ["run comparison missing data", /calculateRunComparison[\s\S]*missingData/],
  ["run comparison next-run tasks", /calculateRunComparison[\s\S]*tasksToCreate/],
  ["auto calendar stage timeline", /calculateAutoGrowCalendar[\s\S]*stageTimeline/],
  ["auto calendar task schedule", /calculateAutoGrowCalendar[\s\S]*taskSchedule/],
  [
    "auto calendar harvest windows",
    /calculateAutoGrowCalendar[\s\S]*plantSpecificHarvestWindows/
  ]
].forEach(([description, pattern]) => {
  requireText("tool calculators", calculators, pattern, description);
});

[
  ["harvest batch model", /HarvestBatchSchema/],
  ["dry/cure record schema", /DryCureRecordSchema/],
  ["dry/cure records", /dryCureRecords/],
  ["linked ToolRuns", /linkedToolRunIds/],
  ["quality notes", /qualityNotes/],
  ["dry/cure stage enum", /"drying"[\s\S]*"curing"[\s\S]*"stored"[\s\S]*"quality_review"/]
].forEach(([description, pattern]) => {
  requireText("harvest batch model", harvestModel, pattern, description);
});

[
  ["harvest list route", /router\.get\("\/harvest-batches"/],
  ["harvest create route", /router\.post\("\/harvest-batches"/],
  ["harvest detail route", /router\.get\("\/harvest-batches\/:id"/],
  ["harvest update route", /router\.patch\("\/harvest-batches\/:id"/],
  ["harvest archive route", /router\.delete\("\/harvest-batches\/:id"/],
  ["harvest timeline events", /HarvestBatch[\s\S]*dryCureRecords[\s\S]*timelineEvent/]
].forEach(([description, pattern]) => {
  requireText("personal route", personalRoute, pattern, description);
});

[
  ["harvest API list", /listHarvestBatches/],
  ["harvest API create", /createHarvestBatch/],
  ["harvest API update", /updateHarvestBatch/],
  ["harvest API archive", /archiveHarvestBatch/],
  ["dry/cure API type", /DryCureRecordInput/],
  ["linked ToolRun API type", /linkedToolRunIds/]
].forEach(([description, pattern]) => {
  requireText("harvest API", harvestApi, pattern, description);
});

[
  ["harvest readiness records", /harvest_readiness_check/],
  ["harvest batch records", /harvest_batch/],
  ["dry/cure records", /dry_cure_check/],
  ["auto calendar records", /auto_grow_calendar/],
  ["run comparison records", /run_comparison/]
].forEach(([description, pattern]) => {
  requireText("module record route", moduleRoute, pattern, description);
  requireText("module record API", moduleApi, pattern, description);
});

[
  ["harvest ToolRun type", /\|\s*"harvest-readiness"/],
  ["dry/cure ToolRun type", /\|\s*"dry-cure-guard"/],
  ["run comparison ToolRun type", /\|\s*"run-comparison"/],
  ["auto calendar ToolRun type", /\|\s*"auto-grow-calendar"/]
].forEach(([description, pattern]) => {
  requireText("toolRuns API", toolRunsApi, pattern, description);
});

[
  ["harvest module persistence", /"harvest-readiness": "harvest_readiness_check"/],
  ["dry/cure module persistence", /"dry-cure-guard": "dry_cure_check"/],
  ["auto calendar module persistence", /"auto-grow-calendar": "auto_grow_calendar"/],
  ["run comparison module persistence", /"run-comparison": "run_comparison"/]
].forEach(([description, pattern]) => {
  requireText("frontend module persistence", modulePersistence, pattern, description);
});

[
  ["harvest ToolRun screen", screens.harvest, /tool="harvest-readiness"/],
  [
    "harvest photo checklist",
    screens.harvest,
    /HARVEST_PHOTO_CHECKLIST[\s\S]*Photo checklist before analysis/
  ],
  ["harvest photo failure status", screens.harvest, /Photo analysis did not run/],
  [
    "harvest photo failure leaves fields unchanged",
    screens.harvest,
    /No trichome fields were filled/
  ],
  ["harvest decision tasks", screens.harvest, /Create Harvest Decision Tasks/],
  ["harvest batch save", screens.harvest, /Save Harvest Review[\s\S]*updateHarvestBatch/],
  [
    "harvest schedule metadata",
    screens.harvest,
    /harvest_readiness_recheck[\s\S]*dry_cure_setup/
  ],
  ["dry/cure ToolRun screen", screens.dryCure, /tool="dry-cure-guard"/],
  ["dry/cure monitoring tasks", screens.dryCure, /Create Dry\/Cure Monitoring Tasks/],
  [
    "dry/cure harvest batch save",
    screens.dryCure,
    /Save to Harvest Batch[\s\S]*updateHarvestBatch/
  ],
  [
    "dry/cure schedule metadata",
    screens.dryCure,
    /dry_cure_condition_check[\s\S]*dry_cure_outcome_notes/
  ],
  ["run comparison ToolRun screen", screens.runComparison, /tool="run-comparison"/],
  ["run comparison next-run tasks", screens.runComparison, /Create Next-Run Tasks/],
  ["run comparison schedule metadata", screens.runComparison, /run_comparison_followup/],
  ["auto calendar ToolRun screen", screens.autoCalendar, /tool="auto-grow-calendar"/],
  ["auto calendar task action", screens.autoCalendar, /Create Calendar Tasks/],
  ["auto calendar schedule metadata", screens.autoCalendar, /grow_milestone/]
].forEach(([description, contents, pattern]) => {
  requireText("Phase 6 screen", contents, pattern, description);
});

[
  [
    "Personal Tools harvest calculator entry",
    featureStatus,
    /tools\.harvest_readiness_ai[\s\S]*title: "Harvest Readiness Calculator"[\s\S]*href: "\/home\/personal\/tools\/harvest-readiness"[\s\S]*hubVisible: true/
  ],
  [
    "production harvest readiness fallback",
    productionWebExport,
    /"home\/personal\/tools\/harvest-readiness"/
  ],
  [
    "cannabis grow overview harvest entry",
    growOverview,
    /cannabisGrow[\s\S]*grow_detail_harvest[\s\S]*workflows=\{\["harvest-readiness"\]\}/
  ],
  [
    "cannabis grow tools harvest entry",
    growTools,
    /Harvest readiness calculator[\s\S]*\/home\/personal\/tools\/harvest-readiness[\s\S]*cannabisOnly: true/
  ],
  [
    "attached cannabis workflow compatibility",
    growRouteUtils,
    /CANNABIS_WORKFLOW_IDS[\s\S]*harvest-readiness[\s\S]*hasCannabisWorkflowEvidence/
  ],
  [
    "legacy cannabis grow compatibility",
    growRouteUtils,
    /hasStructuredContext[\s\S]*grow\.strain[\s\S]*grow\.cultivar/
  ]
].forEach(([description, contents, pattern]) => {
  requireText("harvest discovery", contents, pattern, description);
});

[
  [
    "export screen loads records",
    /listPersonalLogs[\s\S]*listPersonalTasks[\s\S]*listPersonalPlants[\s\S]*listToolRuns/
  ],
  ["export rows", /buildExportRows/],
  ["CSV export", /exportToCsv[\s\S]*Export CSV/],
  ["export package copy", /Export package[\s\S]*CSV export is available now/],
  ["PDF limitation honesty", /PDF output is not exposed as a completed workflow/]
].forEach(([description, pattern]) => {
  requireText("PDF/export screen", exportScreen, pattern, description);
});

[
  ["export row builder", /export function buildExportRows/],
  ["log export rows", /type: "log"/],
  ["task export rows", /type: "task"/],
  ["plant export rows", /type: "plant"/],
  ["ToolRun export rows", /type: "tool_run"/],
  ["harvest timeline milestones", /Harvest window[\s\S]*Dry complete[\s\S]*Cure check/]
].forEach(([description, pattern]) => {
  requireText(
    "advanced planning export/report helpers",
    advancedPlanning,
    pattern,
    description
  );
});

[
  [
    "dry/cure backend test",
    tests.backendTools,
    /runs dry\/cure guard without treating temperatures above 68F as automatic failure/
  ],
  [
    "run/calendar backend test",
    tests.backendTools,
    /runs run comparison and auto grow calendar tools/
  ],
  [
    "harvest readiness backend test",
    tests.backendTools,
    /runs genetics inventory and harvest readiness tools[\s\S]*harvestTask/
  ],
  [
    "harvest batch backend test",
    tests.personalBackend,
    /creates, lists, updates, and archives harvest batches with dry\/cure records/
  ],
  [
    "harvest batch API test",
    tests.harvestApi,
    /creates, lists, updates, and archives harvest\/dry-cure records/
  ],
  [
    "harvest UI tests",
    tests.harvest,
    /Create Harvest Decision Tasks[\s\S]*saves harvest readiness review to a harvest batch record/
  ],
  [
    "dry/cure UI tests",
    tests.dryCure,
    /creates dry\/cure monitoring tasks[\s\S]*saves dry\/cure readings to a harvest batch record/
  ],
  [
    "run comparison UI tests",
    tests.runComparison,
    /creates next-run tasks from run comparison output/
  ],
  [
    "auto calendar UI tests",
    tests.autoCalendar,
    /creates tasks from the generated grow calendar schedule/
  ],
  ["export route test", tests.exportRoute, /uses shared back behavior on PDF \/ Export/],
  ["harvest helper tests", tests.planning, /estimates a harvest readiness window/]
].forEach(([description, contents, pattern]) => {
  requireText("Phase 6 tests", contents, pattern, description);
});

if (!process.exitCode) {
  console.log("[harvest-history-contract] Harvest/dry-cure/history contract verified");
}
