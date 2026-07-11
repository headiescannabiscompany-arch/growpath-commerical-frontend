#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  console.error(`[ownership-contract] ${message}`);
  process.exitCode = 1;
}

function requireText(label, contents, pattern, description) {
  if (!pattern.test(contents)) fail(`${label} missing ${description}`);
}

const personalRoute = read("backend/routes/personal.js");
const toolsRoute = read("backend/routes/tools.js");
const cropRoute = read("backend/routes/cropKnowledge.js");
const telemetryRoute = read("backend/routes/telemetry.js");
const integrationsRoute = read("backend/routes/integrations.js");

const growModel = read("backend/models/Grow.js");
const plantModel = read("backend/models/Plant.js");
const taskModel = read("backend/models/Task.js");
const logModel = read("backend/models/GrowLog.js");
const diagnosisModel = read("backend/models/Diagnosis.js");
const toolRunModel = read("backend/models/ToolRun.js");
const telemetrySourceModel = read("backend/models/TelemetrySource.js");
const integrationConnectionModel = read("backend/models/IntegrationConnection.js");
const integrationAccessRequestModel = read("backend/models/IntegrationAccessRequest.js");

const personalTest = read("backend/routes/personal.test.js");
const growsTest = read("backend/routes/grows.personal.test.js");
const toolsTest = read("backend/routes/tools.test.js");
const cropTest = read("backend/routes/cropKnowledge.test.js");
const telemetryTest = read("backend/routes/telemetry.test.js");
const integrationsTest = read("backend/routes/integrations.test.js");
const telemetryApi = read("src/api/telemetry.ts");
const integrationsApi = read("src/api/integrations.ts");

[
  ["Grow model", growModel, /\buserId\b[\s\S]*\buser\b/, "user/userId ownership fields"],
  ["Plant model", plantModel, /\buser\b/, "user ownership field"],
  ["Task model", taskModel, /\buserId\b/, "userId ownership field"],
  ["GrowLog model", logModel, /\buserId\b/, "userId ownership field"],
  ["Diagnosis model", diagnosisModel, /\buser\b/, "user ownership field"],
  ["ToolRun model", toolRunModel, /\buser\b/, "user ownership field"],
  [
    "TelemetrySource model",
    telemetrySourceModel,
    /\bownerUserId\b[\s\S]*"ubibot"/,
    "ownerUserId field and UbiBot source enum"
  ],
  [
    "IntegrationConnection model",
    integrationConnectionModel,
    /\bownerUserId\b[\s\S]*\bcredentialsEncrypted\b[\s\S]*\bdeletedAt\b/,
    "ownerUserId, stored credentials marker, and archive field"
  ],
  [
    "IntegrationAccessRequest model",
    integrationAccessRequestModel,
    /\bownerUserId\b[\s\S]*\bprovider\b[\s\S]*\bstatus\b/,
    "owner-scoped provider access requests"
  ]
].forEach(([label, contents, pattern, description]) => {
  requireText(label, contents, pattern, description);
});

[
  ["personal ownsGrow helper", /async function ownsGrow/],
  ["grow ownership filter", /\$or: \[\{ user: uid \}, \{ userId: uid \}\]/],
  ["task source ownership validation", /validateTaskSourceOwnership/],
  ["tool run task source ownership", /sourceToolRunId/],
  ["diagnosis task source ownership", /sourceDiagnosisId/],
  ["log task source ownership", /linkedLogId/],
  ["timeline telemetry owner filter", /TelemetrySource\.find\(\{\s*ownerUserId: uid/]
].forEach(([description, pattern]) => {
  requireText("personal route", personalRoute, pattern, description);
});

[
  ["ToolRun route user filter", /ToolRun\.findOne\(\{\s*_id: req\.params\.id,\s*user: toObjectId\(uid\)/],
  ["ToolRun route active filter", /archivedAt: null/],
  ["recipe route user filter", /NutrientRecipe\.findOne\(\{\s*_id: req\.params\.id,\s*user/],
  ["recipe active filter", /active: true/],
  ["recipe grow ownership check", /Grow\.exists\(\{\s*\$or: growFilters/]
].forEach(([description, pattern]) => {
  requireText("tools route", toolsRoute, pattern, description);
});

[
  ["plant growth user ownership", /user: objectUser/],
  ["plant growth archive owner filter", /PlantGrowthProfile\.findOneAndUpdate\(\s*\{\s*_id: req\.params\.id,\s*user: objectUser/]
].forEach(([description, pattern]) => {
  requireText("crop knowledge route", cropRoute, pattern, description);
});

[
  ["telemetry requireUser", /function requireUser/],
  ["telemetry grow owner validation", /await ownsGrow\(userId, growId\)/],
  ["telemetry owner source lookup", /ownerUserId: userId,\s*deletedAt: null/],
  ["telemetry points owned source gate", /loadOwnedSource\(userId, req\.(body|query)\?\.sourceId\)/],
  ["telemetry redacts Pulse secret", /delete config\.pulse\.apiKey/],
  ["telemetry redacts UbiBot account key", /delete config\.ubibot\.accountKey/],
  ["telemetry redacts Growlink password", /delete config\.growlink\.password/],
  ["telemetry UbiBot live route", /router\.post\("\/ubibot\/verify"/]
].forEach(([description, pattern]) => {
  requireText("telemetry route", telemetryRoute, pattern, description);
});

[
  ["integrations provider list", /const PROVIDERS = \[/],
  ["integrations owner list query", /ownerUserId: userId,\s*deletedAt: null/],
  ["integrations creates owned connection", /IntegrationConnection\.create\(\{\s*ownerUserId: userId/],
  ["integrations credentials placeholder", /credentialsEncrypted: encryptPlaceholder/],
  ["integrations owned test query", /_id: req\.params\.id,\s*ownerUserId: userId,\s*deletedAt: null/],
  ["integrations owned access request", /IntegrationAccessRequest\.create\(\{\s*ownerUserId: userId/]
].forEach(([description, pattern]) => {
  requireText("integrations route", integrationsRoute, pattern, description);
});

[
  ["grows ownership route test", growsTest, /lists current user's personal grows/, "owned grow list test"],
  [
    "personal route tests",
    personalTest,
    /creates grow-scoped logs[\s\S]*links source records[\s\S]*creates grow-scoped source-linked tasks[\s\S]*merged grow timeline/,
    "log/task/timeline ownership coverage"
  ],
  [
    "tools route tests",
    toolsTest,
    /creates a canonical ToolRun snapshot owned by the authenticated user[\s\S]*loads one ToolRun only when it belongs to the authenticated user[\s\S]*revises a recipe using authenticated ownership[\s\S]*clones a recipe using authenticated ownership/,
    "tool run and recipe ownership coverage"
  ],
  [
    "crop route tests",
    cropTest,
    /user-owned plant growth profiles/,
    "plant growth ownership test"
  ],
  [
    "telemetry route tests",
    telemetryTest,
    /only for a grow owned by the authenticated user[\s\S]*source owned by another user/,
    "telemetry ownership tests"
  ],
  [
    "integration route tests",
    integrationsTest,
    /owned connection[\s\S]*only connections owned by the authenticated user[\s\S]*only an owned integration connection/,
    "integration ownership tests"
  ],
  [
    "telemetry frontend API",
    telemetryApi,
    /TELEMETRY_ROUTES[\s\S]*\/api\/telemetry\/sources[\s\S]*delete config\.ubibot\.accountKey/,
    "centralized telemetry routes and frontend redaction"
  ],
  [
    "integrations frontend API",
    integrationsApi,
    /\/api\/integrations\/providers[\s\S]*\/api\/integrations\/connections[\s\S]*\/api\/integrations\/access-requests/,
    "centralized integration routes"
  ]
].forEach(([label, contents, pattern, description]) => {
  requireText(label, contents, pattern, description);
});

if (!process.exitCode) {
  console.log("[ownership-contract] Ownership contract verified");
}
