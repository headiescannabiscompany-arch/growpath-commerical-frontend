#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const fixturePath = path.join(ROOT, "tests", "fixtures", "growpath-qa-seed-system.json");
const allowPlanning = process.argv.includes("--allow-planning");

function isUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isPlaceholder(value) {
  return typeof value === "string" && value.startsWith("TODO_");
}

function collectValues(value, pointer = "", result = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectValues(item, `${pointer}/${index}`, result));
    return result;
  }
  if (!value || typeof value !== "object") {
    result.push({ path: pointer, value });
    return result;
  }
  for (const [key, child] of Object.entries(value)) {
    collectValues(child, `${pointer}/${key}`, result);
  }
  return result;
}

function requireCondition(condition, message, errors) {
  if (!condition) errors.push(message);
}

function main() {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const errors = [];
  const blockers = [];

  requireCondition(
    fixture.schemaVersion === "growpath-qa-seed-system-v1",
    "Unexpected QA seed-system schema version.",
    errors
  );
  requireCondition(
    fixture.environments?.productionAllowed === false,
    "Production seeding must remain prohibited.",
    errors
  );
  requireCondition(
    Array.isArray(fixture.environments?.allowed) &&
      fixture.environments.allowed.includes("test") &&
      fixture.environments.allowed.includes("staging") &&
      !fixture.environments.allowed.includes("production"),
    "Allowed environments must be test/staging only.",
    errors
  );

  for (const key of [
    "qaSeedNamespaceRequired",
    "idempotent",
    "dryRunRequired",
    "verifyRequired",
    "cleanupRequired"
  ]) {
    requireCondition(
      fixture.executionContract?.[key] === true,
      `executionContract.${key} must be true.`,
      errors
    );
  }
  requireCondition(
    fixture.executionContract?.plaintextCredentialsAllowed === false,
    "Plaintext credentials must not be allowed.",
    errors
  );
  requireCondition(
    fixture.executionContract?.productionIdentifiersAllowed === false,
    "Production identifiers must not be allowed.",
    errors
  );

  for (const key of [
    "imageLevelLicenseRequired",
    "creatorRequired",
    "attributionRequired",
    "commercialProductQaUseMustBeAllowed"
  ]) {
    requireCondition(
      fixture.dataRights?.[key] === true,
      `dataRights.${key} must be true.`,
      errors
    );
  }
  requireCondition(
    fixture.dataRights?.useForModelTraining === false,
    "QA seed media must not be used for model training.",
    errors
  );
  requireCondition(
    fixture.dataRights?.allowAllRightsReservedCopies === false &&
      fixture.dataRights?.allowNonCommercialLicenseCopies === false,
    "All-rights-reserved and noncommercial-license copies must remain blocked.",
    errors
  );

  const sources = fixture.sourceCandidates || [];
  requireCondition(
    sources.length >= 3,
    "Expected at least three source candidates.",
    errors
  );
  for (const source of sources) {
    requireCondition(Boolean(source.id), "Every source candidate needs an id.", errors);
    requireCondition(
      source.licenseReviewRequired === true,
      `Source ${source.id || "<missing>"} must require license review.`,
      errors
    );
    requireCondition(
      typeof source.reliabilityTier === "string" && source.reliabilityTier.length > 0,
      `Source ${source.id || "<missing>"} needs a reliabilityTier.`,
      errors
    );
    requireCondition(
      source.crossCheckRequired === true,
      `Source ${source.id || "<missing>"} must require cross-checking.`,
      errors
    );
    requireCondition(
      /^\d{4}-\d{2}-\d{2}$/.test(source.lastReviewedAt || ""),
      `Source ${source.id || "<missing>"} needs a YYYY-MM-DD lastReviewedAt.`,
      errors
    );
    requireCondition(
      Array.isArray(source.trustedFor) && source.trustedFor.length > 0,
      `Source ${source.id || "<missing>"} needs trustedFor rules.`,
      errors
    );
    requireCondition(
      Array.isArray(source.notTrustedFor) && source.notTrustedFor.length > 0,
      `Source ${source.id || "<missing>"} needs notTrustedFor rules.`,
      errors
    );
    if (!isUrl(source.sourceUrl)) {
      if (isPlaceholder(source.sourceUrl)) {
        blockers.push(`Source ${source.id} still has a placeholder sourceUrl.`);
      } else {
        errors.push(`Source ${source.id} has an invalid sourceUrl.`);
      }
    }
    if (source.status !== "approved") {
      blockers.push(`Source ${source.id} is not approved (${source.status}).`);
    }
  }

  const packs = fixture.packs || [];
  requireCondition(packs.length === 4, "Expected exactly four QA seed packs.", errors);
  const packIds = packs.map((pack) => pack.id);
  requireCondition(
    new Set(packIds).size === packIds.length,
    "QA seed pack ids must be unique.",
    errors
  );
  requireCondition(
    [
      "plant-identification",
      "diagnosis-ipm",
      "living-soil-labs-commerce",
      "facility-simulator"
    ].every((id) => packIds.includes(id)),
    "One or more required QA seed packs are missing.",
    errors
  );

  for (const pack of packs) {
    requireCondition(
      Number.isInteger(pack.masterItem) && pack.masterItem >= 50 && pack.masterItem <= 53,
      `Pack ${pack.id || "<missing>"} must map to master item 50-53.`,
      errors
    );
    requireCondition(
      Array.isArray(pack.requiredRecordFields) && pack.requiredRecordFields.length > 0,
      `Pack ${pack.id || "<missing>"} needs requiredRecordFields.`,
      errors
    );
    if (pack.status !== "seed_ready") {
      blockers.push(`Pack ${pack.id} is not seed_ready (${pack.status}).`);
    }
  }

  const plantPack = packs.find((pack) => pack.id === "plant-identification");
  requireCondition(
    plantPack?.targetRecordCount?.minimum >= 300 &&
      plantPack?.targetRecordCount?.maximum <= 500,
    "Plant-identification target must remain within 300-500 records.",
    errors
  );
  requireCondition(
    plantPack?.expectedBehavior?.growRequired === false &&
      plantPack?.expectedBehavior?.cultivarInferenceAllowed === false,
    "Plant identification must stay grow-optional and forbid cultivar inference.",
    errors
  );

  const diagnosisPack = packs.find((pack) => pack.id === "diagnosis-ipm");
  requireCondition(
    JSON.stringify(diagnosisPack?.evidenceContract?.decisionOrder) ===
      JSON.stringify([
        "pattern",
        "medium_root_zone",
        "environment",
        "measured_values",
        "cause_ranking"
      ]),
    "Diagnosis/IPM must preserve ETGU evidence order.",
    errors
  );
  requireCondition(
    diagnosisPack?.evidenceContract?.sameReviewedEnvelopeForGrowPathAndGpt === true &&
      diagnosisPack?.evidenceContract?.pesticideProductOrRateOutputAllowed === false,
    "Diagnosis/IPM must share reviewed evidence and block pesticide products/rates.",
    errors
  );

  const commercePack = packs.find((pack) => pack.id === "living-soil-labs-commerce");
  requireCondition(
    commercePack?.applicationModuleName === "Soil & Nutrient Batch Planner",
    "The application module must remain Soil & Nutrient Batch Planner.",
    errors
  );
  const proposedFormulaProducts = (commercePack?.productDrafts || []).filter(
    (product) => product.proposedLabelRatio
  );
  requireCondition(
    proposedFormulaProducts.length === 5 &&
      proposedFormulaProducts.every(
        (product) => product.requiresOwnerOrLabelVerification === true
      ),
    "Every proposed nutrient ratio must require owner or label verification.",
    errors
  );

  const facilityPack = packs.find((pack) => pack.id === "facility-simulator");
  requireCondition(
    JSON.stringify(facilityPack?.canonicalRoles) ===
      JSON.stringify(["owner", "manager", "staff", "viewer"]),
    "Facility simulator must use canonical owner/manager/staff/viewer roles.",
    errors
  );
  requireCondition(
    (facilityPack?.incidents || []).length >= 13,
    "Facility simulator must retain the full incident set.",
    errors
  );

  const secretPatterns = [
    /\bsk-(?:proj-)?[A-Za-z0-9_-]{12,}/,
    /\bBearer\s+[A-Za-z0-9._-]{12,}/i,
    /mongodb(?:\+srv)?:\/\/[^\s:@]+:[^\s@]+@/i,
    /\b(?:password|api[_-]?key|access[_-]?token)\s*[:=]\s*["'][^"']{8,}/i
  ];
  const exposedSecrets = collectValues(fixture).filter(
    (item) =>
      typeof item.value === "string" &&
      secretPatterns.some((pattern) => pattern.test(item.value))
  );
  requireCondition(
    exposedSecrets.length === 0,
    `Fixture appears to contain plaintext credential material at ${exposedSecrets
      .map((item) => item.path)
      .join(", ")}.`,
    errors
  );

  if (fixture.status !== "seed_ready") {
    blockers.unshift(`Manifest is not seed_ready (${fixture.status}).`);
  }

  const summary = {
    fixture: path.relative(ROOT, fixturePath),
    mode: allowPlanning ? "planning" : "strict",
    schemaVersion: fixture.schemaVersion,
    manifestStatus: fixture.status,
    packStatuses: packs.map((pack) => ({ id: pack.id, status: pack.status })),
    sourceStatuses: sources.map((source) => ({
      id: source.id,
      status: source.status
    })),
    errorCount: errors.length,
    blockerCount: blockers.length
  };
  console.log(JSON.stringify(summary, null, 2));

  if (errors.length) {
    console.error("QA seed-system contract errors:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  if (!allowPlanning && blockers.length) {
    console.error("QA seed system is structurally valid but not seed-ready:");
    blockers.forEach((blocker) => console.error(`- ${blocker}`));
    process.exit(1);
  }

  if (allowPlanning && blockers.length) {
    console.log("Planning blockers retained:");
    blockers.forEach((blocker) => console.log(`- ${blocker}`));
  }
}

main();
