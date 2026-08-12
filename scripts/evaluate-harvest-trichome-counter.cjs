#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
  compareCandidate,
  evaluateCounter,
  validateEvaluationDataset
} = require("./lib/harvest-trichome-counter-metrics.cjs");

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function readJson(label, suppliedPath) {
  if (!suppliedPath) throw new Error(`Missing ${label} path.`);
  return JSON.parse(fs.readFileSync(path.resolve(suppliedPath), "utf8"));
}

function main() {
  const annotations = readJson("--annotations", argumentValue("--annotations"));
  const baselinePredictions = readJson("--baseline", argumentValue("--baseline"));
  const candidatePredictions = readJson("--candidate", argumentValue("--candidate"));
  const readiness = validateEvaluationDataset(annotations);
  if (!readiness.ready) {
    throw new Error(
      `Harvest counter dataset is not eligible: ${readiness.reasons.join("; ")}`
    );
  }
  const baseline = evaluateCounter(annotations, baselinePredictions);
  const candidate = evaluateCounter(annotations, candidatePredictions);
  const comparison = compareCandidate(baseline, candidate);
  console.log(JSON.stringify({ baseline, candidate, comparison }, null, 2));
  if (!comparison.accepted) process.exitCode = 2;
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
