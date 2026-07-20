#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  console.error(`[diagnosis-ipm-contract] ${message}`);
  process.exitCode = 1;
}

function requireText(label, contents, pattern, description) {
  if (!pattern.test(contents)) fail(`${label} missing ${description}`);
}

const diagnoseRoute = read("backend/routes/diagnose.js");
const toolsRoute = read("backend/routes/tools.js");
const calculators = read("backend/services/toolCalculators.js");
const cropRoute = read("backend/routes/cropKnowledge.js");
const diagnoseApi = read("src/api/diagnose.js");
const diagnosisScreen = read("src/app/home/personal/(tabs)/diagnose.tsx");
const ipmScreen = read("src/app/home/personal/(tabs)/tools/ipm-scout.tsx");
const speciesScreen = read("src/app/home/personal/(tabs)/tools/species-crop-id.tsx");
const cropApi = read("src/api/cropKnowledge.ts");

const diagnoseTest = read("backend/routes/diagnose.test.js");
const toolsTest = read("backend/routes/tools.test.js");
const cropTest = read("backend/routes/cropKnowledge.test.js");
const diagnoseApiTest = read("tests/unit/diagnose-api.test.ts");
const diagnosisContextTest = read("tests/unit/diagnosis-crop-context.test.ts");
const normalizeTest = read(
  "src/features/personal/diagnosis/__tests__/normalizeDiagnosis.test.ts"
);
const ipmTest = read("tests/unit/IpmScoutToolScreen.test.tsx");
const speciesTest = read("tests/unit/SpeciesCropIdToolScreen.test.tsx");

[
  ["provider status", /router\.get\("\/provider-status"/],
  ["analysis create route", /router\.post\("\/analyze", createDiagnosis\)/],
  ["photo/form create route", /router\.post\("\/", createDiagnosis\)/],
  ["history route", /router\.get\("\/history"/],
  ["detail route", /router\.get\("\/:id"/],
  ["feedback route", /router\.post\("\/:id\/feedback"/],
  ["grow ownership", /await ownsGrow\(uid, growId\)/],
  ["ETGU evidence", /evidenceObserved/],
  ["ETGU counter evidence", /counterEvidence/],
  ["ETGU missing data", /missingData/],
  ["cautious provider", /deterministic-etgu-v1/],
  ["feedback improvement loop", /DiagnosisFeedback\.create[\s\S]*feedbackCount/]
].forEach(([description, pattern]) => {
  requireText("diagnose route", diagnoseRoute, pattern, description);
});

[
  ["diagnose analyze API", /apiRoutes\.DIAGNOSE\.ANALYZE/],
  ["diagnose create API", /apiRoutes\.DIAGNOSE\.CREATE/],
  ["provider status API", /getDiagnosisProviderStatus/],
  ["feedback API", /submitDiagnosisFeedback/],
  ["durable photo URL", /persistImageUri/],
  ["grow attachment prompt", /maybePromptAttachPhotosToGrow/]
].forEach(([description, pattern]) => {
  requireText("diagnose API", diagnoseApi, pattern, description);
});

[
  ["crop context", /diagnosisCropContextState/],
  ["normalize provider output", /normalizeDiagnosisResponse/],
  ["save diagnosis log", /createPersonalLog/],
  ["create diagnosis task", /createPersonalTask/],
  ["source diagnosis link", /sourceDiagnosisId/],
  ["follow-up metadata", /ai_diagnosis_followup/],
  ["grow selector", /listPersonalGrows[\s\S]*Select diagnosis grow/],
  ["text-only photo warning", /Photo analysis is not connected yet/],
  ["image analysis disclosure", /imageAnalysis[\s\S]*performed/],
  ["outcome feedback", /submitDiagnosisFeedback/],
  ["safety language", /not a guaranteed lab diagnosis/]
].forEach(([description, pattern]) => {
  requireText("diagnosis screen", diagnosisScreen, pattern, description);
});

[
  ["IPM route", /router\.post\("\/ipm-scout"/],
  ["GPT verification", /applyIpmGptVerification/],
  ["species route", /calculatorRoute\([\s\S]*"\/species-crop-id"[\s\S]*"species_crop_id"/]
].forEach(([description, pattern]) => {
  requireText("tools route", toolsRoute, pattern, description);
});

[
  ["IPM calculator", /function calculateIpmScout/],
  ["IPM organism output", /suspectedOrganism/],
  ["IPM task suggestions", /taskSuggestions/],
  ["species calculator", /function calculateSpeciesCropIdentification/],
  [
    "crop identity warning",
    /Confirm crop identity before relying on crop-specific recommendations/
  ]
].forEach(([description, pattern]) => {
  requireText("tool calculators", calculators, pattern, description);
});

[
  ["IPM screen route", /tool="ipm-scout"/],
  ["IPM follow-up tasks", /Create IPM Task Plan/],
  ["IPM treatment decision", /ipm_treatment_decision/],
  ["species screen route", /tool="species-crop-id"/],
  ["explicit grow identity save", /savePersonalGrowCropIdentity/],
  ["explicit plant identity save", /savePersonalPlantCropIdentity/],
  ["explicit confirmation action", /Confirm & Save to/],
  ["species confirmation tasks", /Create Crop Identity Tasks/],
  ["crop identity metadata", /crop_identity_confirmation/]
].forEach(([description, pattern]) => {
  requireText(
    description.startsWith("IPM") ? "IPM screen" : "species screen",
    description.startsWith("IPM") ? ipmScreen : speciesScreen,
    pattern,
    description
  );
});

[
  ["organism CRUD route", /router\.post\("\/organisms"/],
  ["regional alert route", /router\.post\("\/regional-alerts"/],
  ["crop profile CRUD", /router\.post\("\/crop-profiles"/],
  ["starter seed route", /starter-seed/],
  ["source provenance", /sourceRecords/]
].forEach(([description, pattern]) => {
  requireText("crop knowledge route", cropRoute, pattern, description);
});

[
  [
    "organism API helpers",
    /createOrganismProfile[\s\S]*updateOrganismProfile[\s\S]*archiveOrganismProfile/
  ],
  [
    "crop profile API helpers",
    /listCropProfiles[\s\S]*createCropProfile[\s\S]*updateCropProfile/
  ],
  ["regional alert helpers", /createRegionalAlert[\s\S]*archiveRegionalAlert/]
].forEach(([description, pattern]) => {
  requireText("crop knowledge API", cropApi, pattern, description);
});

[
  [
    "diagnose backend tests",
    diagnoseTest,
    /creates cautious ETGU diagnosis records[\s\S]*records diagnosis feedback/
  ],
  [
    "diagnose API tests",
    diagnoseApiTest,
    /pre-uploads image diagnosis photos[\s\S]*provider readiness/
  ],
  ["diagnosis crop context tests", diagnosisContextTest, /Confirmed crop context/],
  [
    "normalizer tests",
    normalizeTest,
    /softens absolute provider summaries[\s\S]*legacy analyze details envelope/
  ],
  [
    "IPM backend tests",
    toolsTest,
    /runs IPM scout and species crop identification tools/
  ],
  [
    "IPM screen tests",
    ipmTest,
    /creates an IPM follow-up task[\s\S]*creates an IPM task plan/
  ],
  [
    "species screen tests",
    speciesTest,
    /creates crop identity tasks[\s\S]*explicitly confirms and saves/
  ],
  [
    "organism/crop profile tests",
    cropTest,
    /updates and archives organism profiles[\s\S]*starter crop profiles/
  ]
].forEach(([description, contents, pattern]) => {
  requireText("Phase 3 tests", contents, pattern, description);
});

if (!process.exitCode) {
  console.log("[diagnosis-ipm-contract] Diagnosis/IPM/crop ID contract verified");
}
