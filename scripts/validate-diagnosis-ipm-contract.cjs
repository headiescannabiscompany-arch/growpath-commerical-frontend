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

function forbidText(label, contents, pattern, description) {
  if (pattern.test(contents)) fail(`${label} must not contain ${description}`);
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
const evidenceApi = read("src/api/evidence.ts");
const mediaPicker = read("src/components/media/MediaEvidencePicker.tsx");
const videoFrameExtraction = read(
  "src/features/personal/harvest/videoFrameExtraction.ts"
);
const diagnosisMethod = read("docs/knowledge/methods/plant-diagnosis-etgu-method.md");
const sourceRegistry = read("src/knowledge/sourceRegistry.ts");

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
const evidenceApiTest = read("tests/unit/evidence-api.test.ts");
const mediaPickerTest = read("tests/unit/MediaEvidencePicker.test.tsx");
const videoFrameTest = read("tests/unit/videoFrameExtraction.test.ts");

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
  ["structured progression", /context\.pattern\?\.progression/],
  ["temperature units", /tempUnit/],
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
  ["diagnosis readiness", /Diagnosis readiness[\s\S]*readinessMessage/],
  ["progression control", /Diagnosis progression/],
  ["temperature unit control", /Diagnosis temperature unit degrees/],
  ["follow-up preserves structured evidence", /\.\.\.currentDiagnosisContext\(\)/],
  ["image analysis disclosure", /imageAnalysis[\s\S]*performed/],
  ["outcome feedback", /submitDiagnosisFeedback/],
  ["safety language", /not a guaranteed lab diagnosis/]
].forEach(([description, pattern]) => {
  requireText("diagnosis screen", diagnosisScreen, pattern, description);
});

[
  ["private video frame extraction", /extractFramesFromVideo/],
  ["12 video candidate frames", /maxExtractedVideoFrames=\{PLANT_REVIEW_PHOTO_LIMIT\}/],
  ["under-ten-minute video limit", /maxVideoSeconds=\{599\}/]
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
    "field-botany candidate contract",
    /candidates[\s\S]*counterEvidence[\s\S]*requiredNextPhotos[\s\S]*requiredNextQuestions/
  ],
  [
    "honest source-verification contract",
    /sourceVerification[\s\S]*required_not_performed[\s\S]*verifiedSourceRecords: \[\]/
  ],
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
  [
    "IPM blank observation defaults",
    /label: "Damage or symptom pattern"[\s\S]*defaultValue: ""/
  ],
  ["IPM honest photo status", /Photo pixels analyzed/],
  ["IPM likely decision", /Mark as Likely Match/],
  ["IPM uncertain decision", /Mark as Not Sure/],
  ["IPM rejected decision", /Mark as Doesn't Match/],
  ["structured morphology intake", /key: "growthHabit"[\s\S]*key: "leafArrangement"/],
  [
    "private place context",
    /key: "cultivationStatus"[\s\S]*key: "region"[\s\S]*key: "habitat"/
  ],
  ["candidate comparison details", /PlantIdentificationResultDetails/],
  ["no-grow confirmation decision", /Confirm in Saved Run/],
  ["uncertain identity decision", /Mark as Not Sure/],
  ["rejected identity decision", /Mark as Doesn't Match/],
  ["species screen route", /tool="species-crop-id"/],
  ["grow-optional crop identity", /growOptional/],
  ["one-step photo identification", /runAfterPrefill: true/],
  ["cannabis flower recognition", /clear cannabis flower or harvested bud/],
  ["honest image analysis status", /imageAnalysisPerformed/],
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
  ["private video frame extraction", /extractFramesFromVideo/],
  ["12 video candidate frames", /maxExtractedVideoFrames=\{PLANT_REVIEW_PHOTO_LIMIT\}/],
  ["under-ten-minute video limit", /maxVideoSeconds=\{599\}/]
].forEach(([description, pattern]) => {
  requireText("IPM screen", ipmScreen, pattern, description);
});

[
  ["12-photo ceiling", /maxPhotos=\{12\}/],
  ["server-only private video mode", /serverFrameExtractionOnly/],
  ["durable extraction start", /extractEvidenceVideoFrames/],
  ["persisted extraction status", /getEvidenceVideoFrameExtraction/],
  ["abortable exact evidence reload", /getEvidenceAssetsByIds\([\s\S]*signal: guard\.signal/],
  ["persisted processing poll", /FRAME_EXTRACTION_POLL_DELAYS_MS[\s\S]*FRAME_EXTRACTION_MAX_AUTOMATIC_POLLS/],
  ["completed source ordered IDs", /sameOrderedIds[\s\S]*sourceExtraction\?\.status !== "completed"/],
  ["exact frame source lineage", /sourceVideoEvidenceAssetId[\s\S]*guard\.sourceId/],
  ["exact frame extraction version", /frameExtractionVersion[\s\S]*extractionVersion/],
  ["mandatory frame extraction attempt", /Number\.isInteger\(frame\.frameExtractionAttempt\)[\s\S]*frame\.frameExtractionAttempt === extractionAttempt/],
  ["mandatory ordered frame index", /Number\.isInteger\(frame\.frameIndex\)[\s\S]*frame\.frameIndex === index/],
  ["canonical provider frame order", /for \(const \[expectedIndex, frameId\] of verifiedExtraction\.frameIds\.entries\(\)\)/],
  ["provider frames require completed verification", /plantIdProviderReadyEvidenceAssets\(\s*currentEvidenceAssets,\s*verifiedFrameExtraction,\s*currentSourceVideoFramesVerified\s*\)/],
  ["under-ten-minute video limit", /maxVideoSeconds=\{599\}/]
].forEach(([description, pattern]) => {
  requireText("species screen", speciesScreen, pattern, description);
});

forbidText(
  "species screen",
  speciesScreen,
  /\bextractFramesFromVideo\b/,
  "client-side video-frame extraction"
);
forbidText(
  "species screen",
  speciesScreen,
  /\bmaxExtractedVideoFrames\b/,
  "client-side candidate-frame configuration"
);

[
  [
    "abortable exact evidence lookup",
    /getEvidenceAssetsByIds[\s\S]*options: \{ signal\?: AbortSignal \}[\s\S]*signal: options\.signal/
  ],
  [
    "durable frame extraction POST",
    /extractEvidenceVideoFrames[\s\S]*extract-frames[\s\S]*method: "POST"[\s\S]*signal: options\.signal/
  ],
  [
    "persisted frame extraction GET",
    /getEvidenceVideoFrameExtraction[\s\S]*frame-extraction[\s\S]*signal: options\.signal/
  ],
  [
    "provider frame provenance",
    /frameExtractionVersion[\s\S]*frameExtractionAttempt[\s\S]*frameIndex/
  ]
].forEach(([description, pattern]) => {
  requireText("evidence API", evidenceApi, pattern, description);
});

[
  [
    "source video stays non-AI in client and server extraction modes",
    /extractFramesFromVideo \|\| serverFrameExtractionOnly \? false : aiUsable/
  ],
  [
    "only client-extracted frames receive workflow AI approval",
    /toVideoFrameAsset\(\s*frame,\s*purpose,\s*sourceContext,\s*aiUsable,\s*sourceVideoEvidenceAssetId\s*\)/
  ],
  [
    "client private source and no-motion disclosure",
    /kept as private evidence[\s\S]*does not guess from motion/
  ],
  [
    "server mode exits before client frame extraction",
    /serverFrameExtractionOnly[\s\S]*savedVideo\?\.uploadStatus === "uploaded"[\s\S]*did not create or upload local frames[\s\S]*return;[\s\S]*!extractFramesFromVideo/
  ],
  [
    "server extraction action guidance",
    /serverFrameExtractionOnly[\s\S]*Extract Video Frames action[\s\S]*durable server job/
  ]
].forEach(([description, pattern]) => {
  requireText("media evidence picker", mediaPicker, pattern, description);
});

requireText(
  "video frame extraction",
  videoFrameExtraction,
  /Math\.min\(12, Math\.floor\(maxFrames\)\)/,
  "12-frame extraction ceiling"
);

[
  [
    "shared diagnosis/IPM/Crop ID video contract",
    /Diagnosis, IPM Scout, and Crop Identification[\s\S]*9 minutes 59 seconds[\s\S]*12 timestamped candidate still frames/
  ],
  [
    "workflow-specific client and server extraction boundary",
    /Diagnosis and IPM Scout may use the established device extraction path[\s\S]*Crop Identification must save only the private source video[\s\S]*durable server extraction path[\s\S]*must not create or upload client thumbnail frames/
  ],
  [
    "durable server extraction state and exact lineage",
    /Persist `idle`, `processing`,[\s\S]*`completed`, `partial`, or `failed` extraction state[\s\S]*Re-fetch the exact completed source and ordered frame IDs[\s\S]*nonblank extraction[\s\S]*version, extraction attempt, ordered frame index[\s\S]*exact canonical frame-ID allowlist/
  ],
  [
    "field-botany identification workflow",
    /Field-botany identification workflow[\s\S]*broad group[\s\S]*likely family[\s\S]*possible genera[\s\S]*required_not_performed/
  ],
  [
    "Crime Pays educational-only boundary",
    /Crime Pays But Botany Doesn't[\s\S]*Tier C educational and QA context[\s\S]*Do not copy or retain/
  ]
].forEach(([description, pattern]) => {
  requireText("diagnosis method", diagnosisMethod, pattern, description);
});

[
  [
    "Crime Pays governed source",
    /id: "crime-pays-but-botany-doesnt"[\s\S]*reliabilityTier: "C"[\s\S]*notTrustedFor:[\s\S]*"plant_identification"/
  ],
  [
    "Kew POWO cross-check",
    /id: "kew-powo"[\s\S]*reliabilityTier: "A"[\s\S]*trustedFor: \["plant_identification", "education"\]/
  ],
  [
    "GBIF cross-check",
    /id: "gbif-species-api"[\s\S]*reliabilityTier: "A"[\s\S]*requiresCrossCheck: true/
  ],
  [
    "iNaturalist lead-only boundary",
    /id: "inaturalist-observations"[\s\S]*reliabilityTier: "C"[\s\S]*requiresCrossCheck: true/
  ],
  [
    "USDA PLANTS cross-check",
    /id: "usda-plants-database"[\s\S]*reliabilityTier: "A"[\s\S]*trustedFor: \["plant_identification", "education"\]/
  ]
].forEach(([description, pattern]) => {
  requireText("source registry", sourceRegistry, pattern, description);
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
    /identifies a cannabis flower without requiring a grow[\s\S]*creates crop identity tasks[\s\S]*explicitly confirms and saves/
  ],
  [
    "organism/crop profile tests",
    cropTest,
    /updates and archives organism profiles[\s\S]*starter crop profiles/
  ],
  [
    "private source video test",
    mediaPickerTest,
    /keeps a Facility source video and generated frames in the same explicit workspace[\s\S]*assetType: "video"[\s\S]*aiUsable: false[\s\S]*sourceVideoEvidenceAssetId: "saved-macro-scan\.mov"[\s\S]*diagnostic plant structure/
  ],
  [
    "Plant ID server-only source video test",
    mediaPickerTest,
    /saves a Plant ID source video without client thumbnail extraction or frame uploads[\s\S]*serverFrameExtractionOnly[\s\S]*mockExtractVideoFrames[\s\S]*not\.toHaveBeenCalled/
  ],
  [
    "Diagnosis/IPM partial client-frame upload test",
    mediaPickerTest,
    /reports only successfully uploaded extracted frames and discloses partial failure[\s\S]*extractFramesFromVideo[\s\S]*purpose="ipm"/
  ],
  [
    "Plant ID durable extraction and exact allowlist tests",
    speciesTest,
    /extracts server frames from a recovered source-video-only run without reuploading[\s\S]*polls persisted processing to an exactly validated completed frame set[\s\S]*keeps unverified completed frames out of AI when exact reload validation fails[\s\S]*allows only the exact ordered verified server-frame IDs and metadata/
  ],
  [
    "Plant ID failed-source extraction gate test",
    speciesTest,
    /disables extraction with retry guidance when the source video upload failed/
  ],
  [
    "server extraction API tests",
    evidenceApiTest,
    /starts scoped server frame extraction with expected Plant ID lineage[\s\S]*loads persisted partial extraction with normalized uploaded frame rows/
  ],
  [
    "12-frame timeline test",
    videoFrameTest,
    /caps candidate frames at twelve for longer evidence videos/
  ]
].forEach(([description, contents, pattern]) => {
  requireText("Phase 3 tests", contents, pattern, description);
});

if (!process.exitCode) {
  console.log("[diagnosis-ipm-contract] Diagnosis/IPM/crop ID contract verified");
}
