"use strict";

const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const Module = require("module");

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function extractJsonBlock(md) {
  const m = String(md).match(/```json\s*([\s\S]*?)\s*```/);
  if (!m) throw new Error("Expected JSON block ```json ... ``` in dewpoint_sample_expected.md");
  return JSON.parse(m[1]);
}

function assertNear(name, actual, expected, tol) {
  const a = Number(actual);
  const e = Number(expected);
  const t = Number(tol);
  if (!Number.isFinite(a) || !Number.isFinite(e) || !Number.isFinite(t)) {
    throw new Error(`${name}: non-numeric compare actual=${actual} expected=${expected} tol=${tol}`);
  }
  if (Math.abs(a - e) > t) {
    throw new Error(`${name}: ${a} not within ${t} of ${e}`);
  }
}

function loadTsModule(tsPath) {
  const source = fs.readFileSync(tsPath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true
    },
    fileName: tsPath
  }).outputText;

  const mod = new Module(tsPath, module.parent || module);
  mod.filename = tsPath;
  mod.paths = Module._nodeModulePaths(path.dirname(tsPath));
  mod._compile(transpiled, tsPath);
  return mod.exports;
}

function main() {
  const ROOT = path.resolve(__dirname, "..");
  const csvPath = path.join(ROOT, "docs", "fixtures", "dewpoint_sample.csv");
  const expPath = path.join(ROOT, "docs", "fixtures", "dewpoint_sample_expected.md");
  const enginePath = path.join(
    ROOT,
    "src",
    "features",
    "personal",
    "tools",
    "dewPointGuard",
    "engine.ts"
  );

  const csvText = read(csvPath);
  const expectedMd = read(expPath);
  const expected = extractJsonBlock(expectedMd);
  const engine = loadTsModule(enginePath);

  const parsed = engine.parseCsvText(csvText);
  const points = engine.mapCsvToPoints(parsed, expected.mapping);
  const assumedLeafAirDeltaC = engine.deltaFToC(expected.assumedLeafAirDeltaF ?? 1.0);
  const marginCThreshold = expected.marginCThreshold ?? 0.5;
  const summary = engine.computeTelemetryRisk(points, assumedLeafAirDeltaC, marginCThreshold);
  if (!summary) throw new Error("Expected non-null summary");

  if (summary.riskBand !== expected.summary.riskBand) {
    throw new Error(`riskBand mismatch: got=${summary.riskBand} expected=${expected.summary.riskBand}`);
  }

  const tol = expected.tolerances || {};
  assertNear(
    "timeAtRiskMinutes",
    summary.timeAtRiskMinutes,
    expected.summary.timeAtRiskMinutes,
    tol.timeAtRiskMinutes ?? 0
  );
  assertNear(
    "minCondensationMarginC",
    summary.extremes.minCondensationMarginC,
    expected.summary.minCondensationMarginC,
    tol.minCondensationMarginC ?? 0.01
  );

  console.log("Dewpoint fixture verification passed.");
}

try {
  main();
} catch (e) {
  console.error(String(e && e.stack ? e.stack : e));
  process.exit(1);
}

