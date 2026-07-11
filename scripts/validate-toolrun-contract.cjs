#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  console.error(`[toolrun-contract] ${message}`);
  process.exitCode = 1;
}

function requireText(label, contents, pattern, description) {
  if (!pattern.test(contents)) {
    fail(`${label} missing ${description}`);
  }
}

const model = read("backend/models/ToolRun.js");
const route = read("backend/routes/tools.js");
const api = read("src/api/toolRuns.ts");

[
  "toolName",
  "toolType",
  "schemaVersion",
  "calculatorVersion",
  "inputs",
  "input",
  "params",
  "outputs",
  "output",
  "result",
  "status",
  "growId",
  "plantId",
  "sourceType",
  "sourceObjectId",
  "linkedLogId",
  "linkedTaskIds",
  "linkedRecipeId",
  "immutableSnapshot",
  "archivedAt"
].forEach((field) => {
  requireText("ToolRun model", model, new RegExp(`\\b${field}\\b`), field);
});

[
  ["tool aliases", /this\.toolType = this\.toolType \|\| this\.toolName[\s\S]*this\.toolName = this\.toolName \|\| this\.toolType/],
  ["input aliases", /this\.inputs[\s\S]*this\.input[\s\S]*this\.params/],
  ["output aliases", /this\.outputs[\s\S]*this\.output[\s\S]*this\.result/],
  ["immutable snapshot defaults", /if \(!this\.immutableSnapshot\)[\s\S]*inputs: this\.inputs[\s\S]*outputs: this\.outputs/]
].forEach(([description, pattern]) => {
  requireText("ToolRun model", model, pattern, description);
});

[
  ["DTO exposes id", /id: String\(value\._id\)/],
  ["DTO normalizes tool aliases", /toolName: value\.toolName \|\| value\.toolType[\s\S]*toolType: value\.toolType \|\| value\.toolName/],
  ["DTO normalizes input aliases", /const inputs = value\.inputs \|\| value\.input \|\| value\.params \|\| \{\}/],
  ["DTO normalizes output aliases", /const outputs = value\.outputs \|\| value\.output \|\| value\.result \|\| \{\}/],
  ["create validates grow ownership", /if \(growId && !\(await ownsGrow\(uid, growId\)\)\)/],
  ["list excludes archived by default", /query\.archivedAt = null[\s\S]*query\.status = \{ \$ne: "archived" \}/],
  ["save-log links ToolRun", /linkedToolRunId: String\(run\._id\)/],
  ["create-task links ToolRun source", /sourceType: "tool_run"[\s\S]*sourceObjectId: String\(run\._id\)/]
].forEach(([description, pattern]) => {
  requireText("tools route", route, pattern, description);
});

[
  ["frontend normalizer", /export function normalizeToolRun/],
  ["frontend id aliases", /normalized\.id = id[\s\S]*normalized\._id = id/],
  ["frontend tool aliases", /normalized\.toolName[\s\S]*normalized\.toolType/],
  ["frontend input aliases", /normalized\.inputs = inputs[\s\S]*normalized\.input = inputs[\s\S]*normalized\.params = inputs/],
  ["frontend output aliases", /normalized\.outputs = outputs[\s\S]*normalized\.output = outputs[\s\S]*normalized\.result = outputs/],
  ["frontend immutable snapshot fallback", /normalized\.immutableSnapshot[\s\S]*inputs,[\s\S]*outputs/],
  ["frontend save-log helper", /saveToolRunToLog/],
  ["frontend task helper", /createTaskFromToolRun/],
  ["frontend archive helper", /archiveToolRun/]
].forEach(([description, pattern]) => {
  requireText("toolRuns API", api, pattern, description);
});

if (!process.exitCode) {
  console.log("[toolrun-contract] canonical ToolRun contract verified");
}
