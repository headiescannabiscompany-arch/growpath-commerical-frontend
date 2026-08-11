#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const fixturePath = path.join(
  ROOT,
  "tests",
  "fixtures",
  "plant-identification-qa-catalog.json"
);
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

function requireCondition(condition, message, errors) {
  if (!condition) errors.push(message);
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
    fixture.schemaVersion === "growpath-plant-identification-qa-v1",
    "Unexpected plant-identification QA schema version.",
    errors
  );
  requireCondition(
    fixture.masterItem === 50,
    "Plant-identification catalog must map to master item 50.",
    errors
  );
  requireCondition(
    fixture.targetRecordCount >= 300 && fixture.targetRecordCount <= 500,
    "Target record count must stay within 300-500.",
    errors
  );

  const rights = fixture.rightsPolicy || {};
  requireCondition(
    rights.useForModelTraining === false,
    "Plant-identification QA media must never be model-training data.",
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
    allowedLicenses.has("CC0-1.0") &&
      allowedLicenses.has("CC-BY-4.0") &&
      allowedLicenses.has("US-PUBLIC-DOMAIN") &&
      allowedLicenses.has("OWNER_PERMISSION") &&
      allowedLicenses.has("GROWPATH_OWNED"),
    "Allowed copied-media licenses are incomplete.",
    errors
  );
  requireCondition(
    blockedLicenses.has("ALL-RIGHTS-RESERVED") &&
      blockedLicenses.has("CC-BY-NC") &&
      blockedLicenses.has("UNKNOWN"),
    "Blocked copied-media licenses are incomplete.",
    errors
  );

  const groups = fixture.caseGroups || {};
  const groupTargets = fixture.groupTargets || {};
  const expectedGroupNames = [
    "cannabisHemp",
    "foodCrops",
    "ornamentals",
    "weeds",
    "lookalikes",
    "failureCases"
  ];
  requireCondition(
    expectedGroupNames.every((name) => Array.isArray(groups[name])),
    "One or more required case groups are missing.",
    errors
  );

  const caseDefinitions = expectedGroupNames.flatMap((groupName) =>
    (groups[groupName] || []).map((definition) => ({ ...definition, groupName }))
  );
  const caseIds = caseDefinitions.map((definition) => definition.caseId);
  requireCondition(
    new Set(caseIds).size === caseIds.length,
    "Plant-identification case ids must be unique.",
    errors
  );

  for (const definition of caseDefinitions) {
    requireCondition(
      typeof definition.caseId === "string" && definition.caseId.length > 0,
      `A ${definition.groupName} case is missing caseId.`,
      errors
    );
    requireCondition(
      typeof definition.acceptedName === "string" && definition.acceptedName.length > 0,
      `Case ${definition.caseId || "<missing>"} needs acceptedName.`,
      errors
    );
    requireCondition(
      typeof definition.scientificName === "string",
      `Case ${definition.caseId || "<missing>"} needs scientificName, even when intentionally blank.`,
      errors
    );
    requireCondition(
      Number.isInteger(definition.quota) && definition.quota > 0,
      `Case ${definition.caseId || "<missing>"} needs a positive integer quota.`,
      errors
    );
    requireCondition(
      Array.isArray(definition.expectedAlternatives) &&
        definition.expectedAlternatives.length > 0,
      `Case ${definition.caseId || "<missing>"} needs expected alternatives.`,
      errors
    );
    requireCondition(
      Array.isArray(definition.distinguishingFocus) &&
        definition.distinguishingFocus.length > 0,
      `Case ${definition.caseId || "<missing>"} needs distinguishing focus.`,
      errors
    );
  }

  let allocatedTotal = 0;
  for (const groupName of expectedGroupNames) {
    const allocated = (groups[groupName] || []).reduce(
      (sum, definition) => sum + Number(definition.quota || 0),
      0
    );
    allocatedTotal += allocated;
    requireCondition(
      allocated === groupTargets[groupName],
      `Group ${groupName} allocates ${allocated}, expected ${groupTargets[groupName]}.`,
      errors
    );
  }
  requireCondition(
    allocatedTotal === fixture.targetRecordCount,
    `Case quotas allocate ${allocatedTotal}, expected ${fixture.targetRecordCount}.`,
    errors
  );

  const sourcePlan = fixture.sourcePlan || [];
  const sourceIds = new Set(sourcePlan.map((source) => source.sourceId));
  requireCondition(
    sourceIds.has("inaturalist") &&
      sourceIds.has("usda_ars_image_gallery") &&
      sourceIds.has("wikimedia_commons") &&
      sourceIds.has("growpath_owner_media") &&
      sourceIds.has("commissioned_failure_cases") &&
      sourceIds.has("crime_pays_botany_youtube"),
    "Source plan must retain iNaturalist, USDA ARS, Wikimedia Commons, owner media, commissioned failure cases, and the governed Crime Pays educational lead.",
    errors
  );
  const crimePaysSource = sourcePlan.find(
    (source) => source.sourceId === "crime_pays_botany_youtube"
  );
  requireCondition(
    crimePaysSource?.status === "external_lead_only_pending_creator_permission" &&
      crimePaysSource?.qaReferenceApproved === false &&
      crimePaysSource?.allowedLicenseFilter?.length === 1 &&
      crimePaysSource.allowedLicenseFilter[0] === "OWNER_PERMISSION" &&
      crimePaysSource?.runtimeSourceRegistryId === "crime-pays-but-botany-doesnt",
    "Crime Pays must remain lead-only, creator-permission gated, and linked to its governed runtime source.",
    errors
  );
  requireCondition(
    (crimePaysSource?.requirements || []).some((requirement) =>
      /do not treat.*gold labels/i.test(requirement)
    ) &&
      (crimePaysSource?.requirements || []).some((requirement) =>
        /cross-check.*Tier A/i.test(requirement)
      ) &&
      (crimePaysSource?.requirements || []).some((requirement) =>
        /never use copied media for model training/i.test(requirement)
      ),
    "Crime Pays source requirements must block gold labels/training and require Tier A cross-checking.",
    errors
  );
  for (const source of sourcePlan) {
    requireCondition(
      Array.isArray(source.requirements) && source.requirements.length > 0,
      `Source ${source.sourceId || "<missing>"} needs requirements.`,
      errors
    );
    requireCondition(
      typeof source.qaReferenceApproved === "boolean",
      `Source ${source.sourceId || "<missing>"} needs qaReferenceApproved.`,
      errors
    );
  }

  const requiredFields = fixture.requiredMediaRecordFields || [];
  const mediaRecords = fixture.mediaRecords || [];
  const recordIds = new Set();
  const mediaUrls = new Set();
  const recordsByCase = new Map(caseIds.map((caseId) => [caseId, 0]));

  for (const [index, record] of mediaRecords.entries()) {
    const label = record.recordId || `index ${index}`;
    for (const field of requiredFields) {
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
      sourceIds.has(record.sourceId),
      `Media record ${label} references unknown source ${record.sourceId}.`,
      errors
    );
    const source = sourcePlan.find((candidate) => candidate.sourceId === record.sourceId);
    requireCondition(
      source?.qaReferenceApproved === true,
      `Media record ${label} uses source ${record.sourceId} before that source is approved for QA references.`,
      errors
    );
    requireCondition(
      isUrl(record.sourceUrl) && isUrl(record.mediaUrl),
      `Media record ${label} needs valid sourceUrl and mediaUrl.`,
      errors
    );
    requireCondition(
      !mediaUrls.has(record.mediaUrl),
      `Media URL is duplicated for record ${label}.`,
      errors
    );
    mediaUrls.add(record.mediaUrl);
    requireCondition(
      typeof record.creator === "string" && record.creator.trim().length > 0,
      `Media record ${label} needs creator attribution.`,
      errors
    );
    requireCondition(
      typeof record.attributionText === "string" &&
        record.attributionText.trim().length > 0,
      `Media record ${label} needs attributionText.`,
      errors
    );
    requireCondition(
      /^\d{4}-\d{2}-\d{2}$/.test(record.retrievedAt || "") &&
        /^\d{4}-\d{2}-\d{2}$/.test(record.rightsReviewedAt || ""),
      `Media record ${label} needs retrieval and rights-review dates.`,
      errors
    );
    requireCondition(
      record.intendedUseApproved === true,
      `Media record ${label} is not approved for intended QA use.`,
      errors
    );
    requireCondition(
      ["external_reference", "copied_fixture"].includes(record.handling),
      `Media record ${label} has invalid handling mode.`,
      errors
    );
    const license = normalizeLicense(record.licenseId);
    requireCondition(
      allowedLicenses.has(license) && !blockedLicenses.has(license),
      `Media record ${label} has an unapproved copied-media license ${record.licenseId}.`,
      errors
    );
    requireCondition(
      record.expectedConfidenceRange &&
        Number.isFinite(record.expectedConfidenceRange.minimum) &&
        Number.isFinite(record.expectedConfidenceRange.maximum) &&
        record.expectedConfidenceRange.minimum >= 0 &&
        record.expectedConfidenceRange.maximum <= 1 &&
        record.expectedConfidenceRange.minimum <= record.expectedConfidenceRange.maximum,
      `Media record ${label} has an invalid expectedConfidenceRange.`,
      errors
    );
    if (record.handling === "copied_fixture") {
      requireCondition(
        /^tests\/fixtures\/media\/plant-id\//.test(record.localFixturePath || "") &&
          /^[a-f0-9]{64}$/i.test(record.sha256 || ""),
        `Copied media record ${label} needs a scoped fixture path and SHA-256.`,
        errors
      );
    }
  }

  if (mediaRecords.length !== fixture.targetRecordCount) {
    blockers.push(
      `Catalog has ${mediaRecords.length}/${fixture.targetRecordCount} reviewed media records.`
    );
  }
  for (const definition of caseDefinitions) {
    const count = recordsByCase.get(definition.caseId) || 0;
    if (count !== definition.quota) {
      blockers.push(
        `Case ${definition.caseId} has ${count}/${definition.quota} reviewed media records.`
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
    reviewedMediaRecordCount: mediaRecords.length,
    caseDefinitionCount: caseDefinitions.length,
    sourceCount: sourcePlan.length,
    errorCount: errors.length,
    blockerCount: blockers.length
  };
  console.log(JSON.stringify(summary, null, 2));

  if (errors.length) {
    console.error("Plant-identification QA catalog errors:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }
  if (!allowPlanning && blockers.length) {
    console.error("Plant-identification QA catalog is not seed-ready:");
    blockers.slice(0, 25).forEach((blocker) => console.error(`- ${blocker}`));
    if (blockers.length > 25) {
      console.error(`- ... ${blockers.length - 25} more blockers`);
    }
    process.exit(1);
  }
  if (allowPlanning && blockers.length) {
    console.log(
      `Planning blockers retained: ${blockers.length}. Strict mode stays blocked until all reviewed media records are present.`
    );
  }
}

main();
