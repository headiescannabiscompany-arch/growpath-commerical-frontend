#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
  finalizeEvaluationDataset
} = require("./lib/harvest-trichome-counter-metrics.cjs");

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function main() {
  const inputPath = argumentValue("--input");
  const outputPath = argumentValue("--out");
  if (!inputPath || !outputPath) throw new Error("Both --input and --out are required.");
  const document = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"));
  const finalized = finalizeEvaluationDataset(document, {
    confirmation: argumentValue("--confirmation"),
    reviewedBy: argumentValue("--reviewed-by"),
    reviewedAt: argumentValue("--reviewed-at")
  });
  fs.writeFileSync(path.resolve(outputPath), `${JSON.stringify(finalized, null, 2)}\n`);
  console.log(
    `Finalized ${finalized.images.length} images for staging-only counter evaluation.`
  );
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
