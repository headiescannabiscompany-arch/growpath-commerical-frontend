#!/usr/bin/env node

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(
  ROOT,
  "tests",
  "fixtures",
  "plant-identification-qa-catalog.json"
);
const CANDIDATE_PATH = path.join(
  ROOT,
  "tmp",
  "spec",
  "plant-identification-qa-candidates.json"
);
const REVIEW_PATH = path.join(ROOT, "tmp", "spec", "plant-identification-qa-review.json");
const CULTIVATED_REVIEW_GROUPS = new Set([
  "cannabisHemp",
  "foodCrops",
  "ornamentals",
  "lookalikes"
]);
const TIER_A_CROSS_CHECK_IDS = new Set([
  "usda-plants-database",
  "kew-powo",
  "gbif-species-api",
  "regional-flora",
  "herbarium-record",
  "qualified-botanist"
]);
const ALLOWED_EXACT_LICENSES = new Set([
  "CC0-1.0",
  "CC-BY-4.0",
  "US-PUBLIC-DOMAIN",
  "OWNER_PERMISSION",
  "GROWPATH_OWNED"
]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const options = { execute: false, replace: false };
  for (const argument of argv) {
    if (argument === "--execute") options.execute = true;
    else if (argument === "--replace") options.replace = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (options.replace && !options.execute) {
    throw new Error("--replace requires --execute.");
  }
  return options;
}

function flattenCases(catalog) {
  return Object.entries(catalog.caseGroups || {}).flatMap(([groupName, definitions]) =>
    (definitions || []).map((definition) => ({ ...definition, groupName }))
  );
}

function stableCandidates(candidates) {
  return [...candidates].sort((left, right) =>
    String(left.candidateId).localeCompare(String(right.candidateId))
  );
}

function takeUnique(candidates, count, selectedIds) {
  const chosen = [];
  for (const candidate of stableCandidates(candidates)) {
    if (chosen.length >= count) break;
    if (selectedIds.has(candidate.photoId)) continue;
    chosen.push(candidate);
    selectedIds.add(candidate.photoId);
  }
  return chosen;
}

function deriveSourceQueries(scientificName) {
  return String(scientificName || "")
    .split(/\s+or\s+/i)
    .map((value) =>
      value
        .trim()
        .replace(/\s+species$/i, "")
        .replace(/\s+/g, " ")
    )
    .filter(Boolean);
}

function balancedTargets(values, quota) {
  const uniqueValues = [...new Set(values)].sort();
  return new Map(
    uniqueValues.map((value, index) => [
      value,
      Math.floor(quota / uniqueValues.length) +
        (index < quota % uniqueValues.length ? 1 : 0)
    ])
  );
}

function selectCaseCandidates(caseDefinition, candidates, selectedIds) {
  const eligible = stableCandidates(
    candidates.filter((candidate) => candidate.caseId === caseDefinition.caseId)
  );
  const quota = Number(caseDefinition.quota || 0);
  if (!CULTIVATED_REVIEW_GROUPS.has(caseDefinition.groupName)) {
    return takeUnique(eligible, quota, selectedIds);
  }

  const expectedQueries = deriveSourceQueries(caseDefinition.scientificName);
  const queryValues = expectedQueries.length
    ? expectedQueries
    : [...new Set(eligible.map((candidate) => candidate.sourceQuery))];
  const modeTargets = balancedTargets(["cultivated", "research_wild"], quota);
  const queryTargets = balancedTargets(queryValues, quota);
  const modeCounts = new Map([...modeTargets.keys()].map((mode) => [mode, 0]));
  const queryCounts = new Map([...queryTargets.keys()].map((query) => [query, 0]));
  const selected = [];

  while (selected.length < quota) {
    const available = eligible.filter(
      (candidate) =>
        !selectedIds.has(candidate.photoId) &&
        !selected.some((current) => current.candidateId === candidate.candidateId)
    );
    if (!available.length) break;
    const remainingModeAvailability = new Map(
      [...modeTargets.keys()].map((mode) => [
        mode,
        available.filter((candidate) => candidate.collectionMode === mode).length
      ])
    );
    const remainingQueryAvailability = new Map(
      [...queryTargets.keys()].map((query) => [
        query,
        available.filter((candidate) => candidate.sourceQuery === query).length
      ])
    );
    available.sort((left, right) => {
      const score = (candidate) => {
        const modeNeed = Math.max(
          0,
          (modeTargets.get(candidate.collectionMode) || 0) -
            (modeCounts.get(candidate.collectionMode) || 0)
        );
        const queryNeed = Math.max(
          0,
          (queryTargets.get(candidate.sourceQuery) || 0) -
            (queryCounts.get(candidate.sourceQuery) || 0)
        );
        const remainingMode =
          remainingModeAvailability.get(candidate.collectionMode) || 0;
        const remainingQuery = remainingQueryAvailability.get(candidate.sourceQuery) || 0;
        return (
          (remainingMode ? modeNeed / remainingMode : 0) +
          (remainingQuery ? queryNeed / remainingQuery : 0)
        );
      };
      return (
        score(right) - score(left) ||
        String(left.candidateId).localeCompare(String(right.candidateId))
      );
    });
    const candidate = available[0];
    selected.push(candidate);
    selectedIds.add(candidate.photoId);
    modeCounts.set(
      candidate.collectionMode,
      (modeCounts.get(candidate.collectionMode) || 0) + 1
    );
    queryCounts.set(
      candidate.sourceQuery,
      (queryCounts.get(candidate.sourceQuery) || 0) + 1
    );
  }
  return selected;
}

function pendingReviewItem(caseDefinition, candidate, sequence) {
  return {
    reviewId: `${caseDefinition.caseId}-${String(sequence).padStart(3, "0")}`,
    caseId: caseDefinition.caseId,
    plantCategory: caseDefinition.groupName,
    targetAcceptedName: caseDefinition.acceptedName,
    targetScientificName: caseDefinition.scientificName,
    targetLifeStage: caseDefinition.lifeStage,
    expectedAlternatives: caseDefinition.expectedAlternatives,
    distinguishingFocus: caseDefinition.distinguishingFocus,
    candidate: {
      candidateId: candidate.candidateId,
      photoId: candidate.photoId,
      sourceId: candidate.sourceId,
      sourceUrl: candidate.sourceUrl,
      mediaUrl: candidate.mediaUrl,
      previewUrl: candidate.previewUrl,
      creator: candidate.creator,
      attributionText: candidate.attributionText,
      sourceLicenseCode: candidate.sourceLicenseCode,
      sourceQuery: candidate.sourceQuery,
      collectionMode: candidate.collectionMode,
      qualityGrade: candidate.qualityGrade,
      captiveOrCultivated: candidate.captiveOrCultivated,
      observedTaxonId: candidate.observedTaxonId,
      observedTaxonName: candidate.observedTaxonName,
      observedTaxonRank: candidate.observedTaxonRank,
      identificationAgreementCount: candidate.identificationAgreementCount,
      identificationDisagreementCount: candidate.identificationDisagreementCount,
      ownerIdentificationUsedComputerVision:
        candidate.ownerIdentificationUsedComputerVision,
      reviewStatus: candidate.reviewStatus,
      identityApproved: candidate.identityApproved,
      lifeStageApproved: candidate.lifeStageApproved,
      rightsReviewedAt: candidate.rightsReviewedAt,
      intendedUseApproved: candidate.intendedUseApproved
    },
    review: {
      status: "pending",
      reviewedBy: "",
      reviewedAt: "",
      identityApproved: null,
      lifeStageApproved: null,
      visibleMorphology: [],
      distinguishingFeatures: [],
      expectedConfidenceRange: { minimum: null, maximum: null },
      expectedResult: "",
      taxonomyCrossChecks: [],
      exactLicenseId: "",
      licenseUrl: "",
      rightsReviewedAt: "",
      intendedUseApproved: null,
      rejectionReason: "",
      notes: ""
    }
  };
}

function candidateSafetyBlockers(candidate) {
  const blockers = [];
  const blockedLocationKeys = new Set([
    "geojson",
    "location",
    "latitude",
    "longitude",
    "lat",
    "lng",
    "private_geojson"
  ]);
  if (
    Object.keys(candidate || {}).some((key) =>
      blockedLocationKeys.has(String(key).toLowerCase())
    )
  ) {
    blockers.push("candidate contains location data");
  }
  if (!String(candidate?.candidateId || "").trim() || candidate?.photoId == null) {
    blockers.push("candidate or photo identifier is missing");
  }
  if (candidate?.sourceId !== "inaturalist") {
    blockers.push("candidate source is unsupported");
  }
  if (!String(candidate?.sourceQuery || "").trim()) {
    blockers.push("candidate source taxon query is missing");
  }
  if (!/^https:\/\//.test(String(candidate?.sourceUrl || ""))) {
    blockers.push("candidate source URL is missing or invalid");
  }
  if (!/^https:\/\//.test(String(candidate?.mediaUrl || ""))) {
    blockers.push("candidate media URL is missing or invalid");
  }
  if (!String(candidate?.creator || "").trim()) blockers.push("creator is missing");
  if (!String(candidate?.attributionText || "").trim()) {
    blockers.push("attribution is missing");
  }
  if (!["cc0", "cc-by"].includes(candidate?.sourceLicenseCode)) {
    blockers.push("candidate source license is blocked");
  }
  if (
    candidate?.collectionMode === "cultivated" &&
    (candidate?.qualityGrade !== "casual" || candidate?.captiveOrCultivated !== true)
  ) {
    blockers.push("cultivated candidate metadata is inconsistent");
  }
  if (
    candidate?.collectionMode === "research_wild" &&
    (candidate?.qualityGrade !== "research" || candidate?.captiveOrCultivated !== false)
  ) {
    blockers.push("research-wild candidate metadata is inconsistent");
  }
  if (!["cultivated", "research_wild"].includes(candidate?.collectionMode)) {
    blockers.push("candidate collection mode is invalid");
  }
  if (
    candidate?.reviewStatus !== "pending_image_taxonomy_stage_and_rights_review" ||
    candidate?.identityApproved !== false ||
    candidate?.lifeStageApproved !== false ||
    candidate?.intendedUseApproved !== false ||
    candidate?.rightsReviewedAt !== null
  ) {
    blockers.push("candidate bypassed pending review gates");
  }
  return blockers;
}

function reviewDecisionBlockers(item) {
  const review = item?.review || {};
  const candidate = item?.candidate || {};
  const blockers = candidateSafetyBlockers(candidate);
  if (review.status !== "approved") blockers.push("status is not approved");
  if (!String(review.reviewedBy || "").trim()) blockers.push("reviewedBy is missing");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt || "")) {
    blockers.push("reviewedAt is missing or invalid");
  }
  if (review.identityApproved !== true) blockers.push("identity is not approved");
  if (review.lifeStageApproved !== true) blockers.push("life stage is not approved");
  if (!Array.isArray(review.visibleMorphology) || !review.visibleMorphology.length) {
    blockers.push("visible morphology is missing");
  }
  if (
    !Array.isArray(review.distinguishingFeatures) ||
    !review.distinguishingFeatures.length
  ) {
    blockers.push("distinguishing features are missing");
  }
  const range = review.expectedConfidenceRange || {};
  if (
    !Number.isFinite(range.minimum) ||
    !Number.isFinite(range.maximum) ||
    range.minimum < 0 ||
    range.maximum > 1 ||
    range.minimum > range.maximum
  ) {
    blockers.push("expected confidence range is invalid");
  }
  if (!String(review.expectedResult || "").trim()) {
    blockers.push("expected result is missing");
  }
  const crossChecks = Array.isArray(review.taxonomyCrossChecks)
    ? review.taxonomyCrossChecks
    : [];
  if (
    !crossChecks.some(
      (crossCheck) =>
        TIER_A_CROSS_CHECK_IDS.has(crossCheck?.sourceId) &&
        /^https:\/\//.test(String(crossCheck?.recordUrl || "")) &&
        String(crossCheck?.outcome || "").trim()
    )
  ) {
    blockers.push("Tier A taxonomy or morphology cross-check is missing");
  }
  if (!ALLOWED_EXACT_LICENSES.has(review.exactLicenseId)) {
    blockers.push("exact license is not approved");
  }
  const compatibleExactLicense =
    (candidate.sourceLicenseCode === "cc0" && review.exactLicenseId === "CC0-1.0") ||
    (candidate.sourceLicenseCode === "cc-by" && review.exactLicenseId === "CC-BY-4.0");
  if (!compatibleExactLicense) {
    blockers.push("exact license does not match candidate source license");
  }
  if (!/^https:\/\//.test(String(review.licenseUrl || ""))) {
    blockers.push("license URL is missing or invalid");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(review.rightsReviewedAt || "")) {
    blockers.push("rights review date is missing or invalid");
  }
  if (review.intendedUseApproved !== true) {
    blockers.push("intended QA use is not approved");
  }
  return blockers;
}

function buildReviewQueue({ catalog, catalogRaw, candidateManifest, candidateRaw }) {
  if (
    candidateManifest.schemaVersion !== "growpath-plant-identification-qa-candidates-v2"
  ) {
    throw new Error("Unsupported Plant ID candidate manifest schema.");
  }
  const catalogSha = sha256(catalogRaw);
  if (candidateManifest.catalogSnapshot?.sha256 !== catalogSha) {
    throw new Error("Candidate manifest does not match the current governed catalog.");
  }
  for (const candidate of candidateManifest.candidates || []) {
    const blockers = candidateSafetyBlockers(candidate);
    if (blockers.length) {
      throw new Error(
        `Candidate ${candidate.candidateId || "<unknown>"} failed safety validation: ${blockers.join(
          "; "
        )}.`
      );
    }
  }

  const caseDefinitions = flattenCases(catalog);
  const selectedPhotoIds = new Set();
  const reviewItems = [];
  const missingCases = [];
  for (const definition of caseDefinitions) {
    const selected = selectCaseCandidates(
      definition,
      candidateManifest.candidates || [],
      selectedPhotoIds
    );
    selected.forEach((candidate, index) =>
      reviewItems.push(pendingReviewItem(definition, candidate, index + 1))
    );
    if (selected.length < definition.quota) {
      missingCases.push({
        caseId: definition.caseId,
        requested: definition.quota,
        queued: selected.length,
        missing: definition.quota - selected.length,
        acquisitionRequirement:
          definition.groupName === "failureCases"
            ? "owned_or_commissioned_failure_media"
            : "additional_rights_compatible_candidates"
      });
    }
  }

  return {
    schemaVersion: "growpath-plant-identification-qa-review-v1",
    status: "review_pending",
    purpose: "Human-reviewed Plant ID inference QA only; never model training.",
    generatedAt: new Date().toISOString(),
    catalogSnapshot: {
      sha256: catalogSha,
      targetRecordCount: catalog.targetRecordCount
    },
    candidateSnapshot: {
      sha256: sha256(candidateRaw),
      candidateCount: candidateManifest.candidates?.length || 0
    },
    safeguards: {
      copiesMedia: false,
      storesCoordinates: false,
      automaticallyApprovesReviews: false,
      automaticallyPromotesCatalogRecords: false,
      requiresTierACrossCheck: true,
      requiresExactPerImageLicenseReview: true
    },
    targetReviewCount: catalog.targetRecordCount,
    queuedReviewCount: reviewItems.length,
    missingReviewCount: catalog.targetRecordCount - reviewItems.length,
    promotableReviewCount: reviewItems.filter(
      (item) => reviewDecisionBlockers(item).length === 0
    ).length,
    missingCases,
    reviewItems
  };
}

function writeAtomically(value) {
  fs.mkdirSync(path.dirname(REVIEW_PATH), { recursive: true });
  const temporaryPath = `${REVIEW_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, REVIEW_PATH);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(CANDIDATE_PATH)) {
    throw new Error(
      "Plant ID candidate manifest is missing. Run the governed candidate collector first."
    );
  }
  if (options.execute && fs.existsSync(REVIEW_PATH) && !options.replace) {
    throw new Error(
      "Review queue exists. Use --replace explicitly after preserving reviews."
    );
  }
  const catalogRaw = fs.readFileSync(CATALOG_PATH, "utf8");
  const candidateRaw = fs.readFileSync(CANDIDATE_PATH, "utf8");
  const reviewQueue = buildReviewQueue({
    catalog: JSON.parse(catalogRaw),
    catalogRaw,
    candidateManifest: JSON.parse(candidateRaw),
    candidateRaw
  });
  if (options.execute) writeAtomically(reviewQueue);
  console.log(
    JSON.stringify(
      {
        mode: options.execute ? "review_queue_written" : "dry_run",
        targetReviewCount: reviewQueue.targetReviewCount,
        queuedReviewCount: reviewQueue.queuedReviewCount,
        missingReviewCount: reviewQueue.missingReviewCount,
        promotableReviewCount: reviewQueue.promotableReviewCount,
        missingCases: reviewQueue.missingCases,
        guarantees: reviewQueue.safeguards
      },
      null,
      2
    )
  );
}

module.exports = {
  ALLOWED_EXACT_LICENSES,
  TIER_A_CROSS_CHECK_IDS,
  buildReviewQueue,
  candidateSafetyBlockers,
  deriveSourceQueries,
  parseArgs,
  reviewDecisionBlockers,
  selectCaseCandidates
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
