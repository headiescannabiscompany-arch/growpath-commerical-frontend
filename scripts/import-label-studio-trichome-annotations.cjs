#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { convertLabelStudioExport } = require("./lib/label-studio-trichome-import.cjs");

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function readJson(label, value) {
  if (!value) throw new Error(`Missing ${label} path.`);
  return JSON.parse(fs.readFileSync(path.resolve(value), "utf8"));
}

function main() {
  const exportTasks = readJson("--export", argumentValue("--export"));
  const metadata = readJson("--metadata", argumentValue("--metadata"));
  const outputPath = argumentValue("--out");
  if (!outputPath) throw new Error("Missing --out path.");
  const converted = convertLabelStudioExport(exportTasks, metadata);
  fs.writeFileSync(path.resolve(outputPath), `${JSON.stringify(converted, null, 2)}\n`);
  console.log(
    `Imported ${converted.images.length} adjudicated images. evaluationReady remains false pending final eligibility review.`
  );
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
