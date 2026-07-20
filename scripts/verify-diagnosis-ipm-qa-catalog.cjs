#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const fixturePath = path.join(ROOT, "tests", "fixtures", "diagnosis-ipm-qa-catalog.json");
const allowPlanning = process.argv.includes("--allow-planning");

function requireCondition(condition, message, errors) {
  if (!condition) errors.push(message);
}

function isUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeLicense(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function main() {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const errors = [];
  const blockers = [];

  requireCondition(
    fixture.schemaVersion === "growpath-diagnosis-ipm-qa-v1",
    "Unexpected diagnosis/IPM QA schema version.",
    errors
  );
  requireCondition(
    fixture.masterItem === 51,
    "Diagnosis/IPM catalog must map to master item 51.",
    errors
  );
  requireCondition(
    JSON.stringify(fixture.diagnosticSequence) ===
      JSON.stringify([
        "pattern",
        "medium_root_zone",
        "environment",
        "measured_values",
        "cause_ranking"
      ]),
    "Diagnosis/IPM catalog must preserve the ETGU diagnostic order.",
    errors
  );

  const envelope = fixture.evidenceEnvelopeContract || {};
  for (const key of [
    "identicalEnvelopeForGrowPathAndGpt",
    "photoBytesIncludedOnlyWhenPixelAnalysisIsSupported",
    "textOnlySecondOpinionMustDiscloseNoPixelInspection",
    "persistBothAnswers",
    "persistDisagreements"
  ]) {
    requireCondition(
      envelope[key] === true,
      `evidenceEnvelopeContract.${key} must be true.`,
      errors
    );
  }
  requireCondition(
    JSON.stringify(envelope.linkedRecordTypesWhenContextExists) ===
      JSON.stringify(["Plant", "Grow", "Log", "ToolRun", "Task", "Facility"]),
    "Evidence write-back record types are incomplete or out of order.",
    errors
  );
  requireCondition(
    typeof envelope.pesticideRule === "string" &&
      envelope.pesticideRule.includes("No invented pesticide"),
    "Pesticide safety rule is missing.",
    errors
  );

  const rights = fixture.rightsPolicy || {};
  requireCondition(
    rights.useForModelTraining === false,
    "Diagnosis/IPM media must never be model-training data.",
    errors
  );
  for (const key of [
    "imageLevelReviewRequired",
    "commercialQaUseApprovalRequired",
    "creatorAndAttributionRequired",
    "licenseRecheckBeforeExecution"
  ]) {
    requireCondition(rights[key] === true, `rightsPolicy.${key} must be true.`, errors);
  }
  const allowedLicenses = new Set(
    (rights.allowedCopiedMediaLicenses || []).map(normalizeLicense)
  );
  const blockedLicenses = new Set(
    (rights.blockedCopiedMediaLicenses || []).map(normalizeLicense)
  );
  requireCondition(
    ["CC0-1.0", "CC-BY-4.0", "OWNER_PERMISSION", "GROWPATH_OWNED"].every((license) =>
      allowedLicenses.has(license)
    ),
    "Allowed diagnosis/IPM media licenses are incomplete.",
    errors
  );
  requireCondition(
    ["ALL-RIGHTS-RESERVED", "CC-BY-NC", "UNKNOWN"].every((license) =>
      blockedLicenses.has(license)
    ),
    "Blocked diagnosis/IPM media licenses are incomplete.",
    errors
  );

  const expectedGroupNames = [
    "diseases",
    "pestsAndBeneficialLookalikes",
    "abioticMimics"
  ];
  const groups = fixture.caseGroups || {};
  const targets = fixture.groupTargets || {};
  requireCondition(
    expectedGroupNames.every((name) => Array.isArray(groups[name])),
    "One or more diagnosis/IPM case groups are missing.",
    errors
  );
  const caseDefinitions = expectedGroupNames.flatMap((groupName) =>
    (groups[groupName] || []).map((definition) => ({ ...definition, groupName }))
  );
  const caseIds = caseDefinitions.map((definition) => definition.caseId);
  requireCondition(
    new Set(caseIds).size === caseIds.length,
    "Diagnosis/IPM case ids must be unique.",
    errors
  );

  const requiredCases = [
    "powdery_mildew",
    "botrytis_gray_mold_bud_rot",
    "downy_mildew",
    "septoria_and_leaf_spots",
    "fusarium",
    "pythium_root_rot",
    "damping_off",
    "rust",
    "bacterial_leaf_spot",
    "mosaic_virus_symptoms",
    "two_spotted_spider_mites",
    "broad_mites",
    "russet_mites",
    "thrips",
    "aphids",
    "whiteflies",
    "fungus_gnats",
    "mealybugs",
    "scale_insects",
    "leafminers",
    "caterpillars",
    "root_aphids",
    "beneficial_and_harmless_lookalikes",
    "nutrient_deficiency",
    "nutrient_excess",
    "nutrient_lockout",
    "nutrient_antagonism",
    "overwatering",
    "underwatering",
    "light_stress",
    "heat_stress",
    "wind_burn",
    "cold_damage",
    "edema",
    "spray_burn",
    "ph_problem",
    "ec_problem",
    "calcium_root_environment",
    "normal_senescence",
    "physical_damage",
    "organic_release_timing"
  ];
  requireCondition(
    requiredCases.every((caseId) => caseIds.includes(caseId)),
    "One or more requested diagnosis/IPM cases are missing.",
    errors
  );

  let allocatedTotal = 0;
  for (const groupName of expectedGroupNames) {
    const allocated = (groups[groupName] || []).reduce(
      (sum, definition) => sum + Number(definition.quota || 0),
      0
    );
    allocatedTotal += allocated;
    requireCondition(
      allocated === targets[groupName],
      `Group ${groupName} allocates ${allocated}, expected ${targets[groupName]}.`,
      errors
    );
  }
  requireCondition(
    allocatedTotal === fixture.targetRecordCount,
    `Case quotas allocate ${allocatedTotal}, expected ${fixture.targetRecordCount}.`,
    errors
  );
  for (const definition of caseDefinitions) {
    requireCondition(
      Number.isInteger(definition.quota) && definition.quota > 0,
      `Case ${definition.caseId || "<missing>"} needs a positive integer quota.`,
      errors
    );
    requireCondition(
      (fixture.causeRankingClasses || []).includes(definition.expectedClass),
      `Case ${definition.caseId || "<missing>"} has an invalid expected class.`,
      errors
    );
    requireCondition(
      Array.isArray(definition.requiredSigns) && definition.requiredSigns.length >= 3,
      `Case ${definition.caseId || "<missing>"} needs at least three diagnostic signs or checks.`,
      errors
    );
  }

  const sourcePlan = fixture.sourcePlan || [];
  const sourceIds = new Set(sourcePlan.map((source) => source.sourceId));
  requireCondition(
    [
      "growpath_owner_media",
      "plantvillage",
      "extension_ipm_media",
      "commissioned_mimic_cases"
    ].every((sourceId) => sourceIds.has(sourceId)),
    "Diagnosis/IPM source plan is incomplete.",
    errors
  );
  for (const source of sourcePlan) {
    requireCondition(
      Array.isArray(source.requirements) && source.requirements.length > 0,
      `Source ${source.sourceId || "<missing>"} needs requirements.`,
      errors
    );
    if (source.status !== "approved") {
      blockers.push(`Source ${source.sourceId} is not approved (${source.status}).`);
    }
  }

  const requiredRecordFields = fixture.requiredMediaRecordFields || [];
  const requiredImageFields = fixture.requiredImageFields || [];
  const mediaRecords = fixture.mediaRecords || [];
  const recordIds = new Set();
  const imageIds = new Set();
  const mediaUrls = new Set();
  const recordsByCase = new Map(caseIds.map((caseId) => [caseId, 0]));

  for (const [index, record] of mediaRecords.entries()) {
    const label = record.recordId || `index ${index}`;
    for (const field of requiredRecordFields) {
      requireCondition(
        Object.prototype.hasOwnProperty.call(record, field),
        `Media record ${label} is missing ${field}.`,
        errors
      );
    }
    requireCondition(
      typeof record.recordId === "string" && !recordIds.has(record.recordId),
      `Media record id ${label} is missing or duplicated.`,
      errors
    );
    recordIds.add(record.recordId);
    requireCondition(
      caseIds.includes(record.caseId),
      `Media record ${label} references unknown case ${record.caseId}.`,
      errors
    );
    if (recordsByCase.has(record.caseId)) {
      recordsByCase.set(record.caseId, recordsByCase.get(record.caseId) + 1);
    }
    requireCondition(
      Array.isArray(record.imageSet) && record.imageSet.length >= 2,
      `Media record ${label} needs at least two reviewed images.`,
      errors
    );
    requireCondition(
      Array.isArray(record.expectedCauseRanking) &&
        record.expectedCauseRanking.length > 0 &&
        record.expectedCauseRanking.every((cause) =>
          (fixture.causeRankingClasses || []).includes(cause)
        ),
      `Media record ${label} has an invalid expected cause ranking.`,
      errors
    );

    for (const [imageIndex, media] of (record.imageSet || []).entries()) {
      const imageLabel = media.imageId || `${label} image ${imageIndex}`;
      for (const field of requiredImageFields) {
        requireCondition(
          Object.prototype.hasOwnProperty.call(media, field),
          `Image ${imageLabel} is missing ${field}.`,
          errors
        );
      }
      requireCondition(
        typeof media.imageId === "string" && !imageIds.has(media.imageId),
        `Image id ${imageLabel} is missing or duplicated.`,
        errors
      );
      imageIds.add(media.imageId);
      requireCondition(
        sourceIds.has(media.sourceId),
        `Image ${imageLabel} references unknown source ${media.sourceId}.`,
        errors
      );
      requireCondition(
        isUrl(media.sourceUrl) && isUrl(media.mediaUrl),
        `Image ${imageLabel} needs valid source and media URLs.`,
        errors
      );
      requireCondition(
        !mediaUrls.has(media.mediaUrl),
        `Media URL is duplicated for image ${imageLabel}.`,
        errors
      );
      mediaUrls.add(media.mediaUrl);
      requireCondition(
        typeof media.creator === "string" &&
          media.creator.trim().length > 0 &&
          typeof media.attributionText === "string" &&
          media.attributionText.trim().length > 0,
        `Image ${imageLabel} needs creator and attribution.`,
        errors
      );
      requireCondition(
        /^\d{4}-\d{2}-\d{2}$/.test(media.retrievedAt || "") &&
          /^\d{4}-\d{2}-\d{2}$/.test(media.rightsReviewedAt || ""),
        `Image ${imageLabel} needs retrieval and rights-review dates.`,
        errors
      );
      requireCondition(
        media.intendedUseApproved === true,
        `Image ${imageLabel} is not approved for intended QA use.`,
        errors
      );
      const license = normalizeLicense(media.licenseId);
      requireCondition(
        allowedLicenses.has(license) && !blockedLicenses.has(license),
        `Image ${imageLabel} has an unapproved license ${media.licenseId}.`,
        errors
      );
      requireCondition(
        ["external_reference", "copied_fixture"].includes(media.handling),
        `Image ${imageLabel} has invalid handling mode.`,
        errors
      );
      if (media.handling === "copied_fixture") {
        requireCondition(
          /^tests\/fixtures\/media\/diagnosis-ipm\//.test(media.localFixturePath || "") &&
            /^[a-f0-9]{64}$/i.test(media.sha256 || ""),
          `Copied image ${imageLabel} needs a scoped fixture path and SHA-256.`,
          errors
        );
      }
    }
  }

  if (mediaRecords.length !== fixture.targetRecordCount) {
    blockers.push(
      `Catalog has ${mediaRecords.length}/${fixture.targetRecordCount} reviewed case records.`
    );
  }
  for (const definition of caseDefinitions) {
    const count = recordsByCase.get(definition.caseId) || 0;
    if (count !== definition.quota) {
      blockers.push(
        `Case ${definition.caseId} has ${count}/${definition.quota} reviewed records.`
      );
    }
  }
  if (fixture.status !== "seed_ready") {
    blockers.unshift(`Catalog is not seed_ready (${fixture.status}).`);
  }

  const summary = {
    fixture: path.relative(ROOT, fixturePath),
    mode: allowPlanning ? "planning" : "strict",
    status: fixture.status,
    targetRecordCount: fixture.targetRecordCount,
    allocatedRecordCount: allocatedTotal,
    reviewedCaseRecordCount: mediaRecords.length,
    reviewedImageCount: mediaRecords.reduce(
      (sum, record) => sum + (record.imageSet || []).length,
      0
    ),
    caseDefinitionCount: caseDefinitions.length,
    sourceCount: sourcePlan.length,
    errorCount: errors.length,
    blockerCount: blockers.length
  };
  console.log(JSON.stringify(summary, null, 2));

  if (errors.length) {
    console.error("Diagnosis/IPM QA catalog errors:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }
  if (!allowPlanning && blockers.length) {
    console.error("Diagnosis/IPM QA catalog is not seed-ready:");
    blockers.slice(0, 25).forEach((blocker) => console.error(`- ${blocker}`));
    if (blockers.length > 25) {
      console.error(`- ... ${blockers.length - 25} more blockers`);
    }
    process.exit(1);
  }
  if (allowPlanning && blockers.length) {
    console.log(
      `Planning blockers retained: ${blockers.length}. Strict mode stays blocked until all reviewed case records and image sets are present.`
    );
  }
}

main();
