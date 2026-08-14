#!/usr/bin/env node

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  catalogDefinitionProjection,
  candidateSafetyBlockers,
  reviewDecisionBlockers
} = require("./prepare-plant-id-qa-review.cjs");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_CATALOG_PATH = path.join(
  ROOT,
  "tests",
  "fixtures",
  "plant-identification-qa-catalog.json"
);
const DEFAULT_CANDIDATE_PATH = path.join(
  ROOT,
  "tmp",
  "spec",
  "plant-identification-qa-candidates.json"
);
const DEFAULT_REVIEW_PATH = path.join(
  ROOT,
  "tmp",
  "spec",
  "plant-identification-qa-review.json"
);
const HASH_PATTERN = /^[a-f0-9]{64}$/i;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readOption(argument, name) {
  const prefix = `${name}=`;
  return argument.startsWith(prefix) ? argument.slice(prefix.length) : null;
}

function parseArgs(argv) {
  const options = {
    execute: false,
    catalogPath: DEFAULT_CATALOG_PATH,
    candidatePath: DEFAULT_CANDIDATE_PATH,
    reviewPath: DEFAULT_REVIEW_PATH,
    expectedCatalogSha256: "",
    expectedCandidateSha256: "",
    expectedReviewSha256: ""
  };
  for (const argument of argv) {
    if (argument === "--execute") options.execute = true;
    else if (readOption(argument, "--catalog-path") !== null) {
      options.catalogPath = path.resolve(readOption(argument, "--catalog-path"));
    } else if (readOption(argument, "--candidate-path") !== null) {
      options.candidatePath = path.resolve(readOption(argument, "--candidate-path"));
    } else if (readOption(argument, "--review-path") !== null) {
      options.reviewPath = path.resolve(readOption(argument, "--review-path"));
    } else if (readOption(argument, "--expected-catalog-sha256") !== null) {
      options.expectedCatalogSha256 = readOption(argument, "--expected-catalog-sha256");
    } else if (readOption(argument, "--expected-candidate-sha256") !== null) {
      options.expectedCandidateSha256 = readOption(
        argument,
        "--expected-candidate-sha256"
      );
    } else if (readOption(argument, "--expected-review-sha256") !== null) {
      options.expectedReviewSha256 = readOption(argument, "--expected-review-sha256");
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (options.execute) {
    for (const [label, value] of [
      ["catalog", options.expectedCatalogSha256],
      ["candidate", options.expectedCandidateSha256],
      ["review", options.expectedReviewSha256]
    ]) {
      if (!HASH_PATTERN.test(value)) {
        throw new Error(`--expected-${label}-sha256 is required with --execute.`);
      }
    }
  }
  return options;
}

function flattenCases(catalog) {
  return Object.entries(catalog.caseGroups || {}).flatMap(([groupName, definitions]) =>
    (definitions || []).map((definition) => ({ ...definition, groupName }))
  );
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function candidateProjection(candidate) {
  return {
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
  };
}

function expectedReviewTarget(definition) {
  return {
    caseId: definition.caseId,
    plantCategory: definition.groupName,
    targetAcceptedName: definition.acceptedName,
    targetScientificName: definition.scientificName,
    targetLifeStage: definition.lifeStage,
    expectedAlternatives: definition.expectedAlternatives,
    distinguishingFocus: definition.distinguishingFocus
  };
}

function actualReviewTarget(item) {
  return {
    caseId: item.caseId,
    plantCategory: item.plantCategory,
    targetAcceptedName: item.targetAcceptedName,
    targetScientificName: item.targetScientificName,
    targetLifeStage: item.targetLifeStage,
    expectedAlternatives: item.expectedAlternatives,
    distinguishingFocus: item.distinguishingFocus
  };
}

function validateSnapshots({ catalog, candidateManifest, candidateRaw, reviewManifest }) {
  const blockers = [];
  const candidateHash = sha256(candidateRaw);
  if (catalog.schemaVersion !== "growpath-plant-identification-qa-v1") {
    blockers.push("catalog schema is unsupported");
  }
  if (
    candidateManifest.schemaVersion !== "growpath-plant-identification-qa-candidates-v2"
  ) {
    blockers.push("candidate manifest schema is unsupported");
  }
  if (reviewManifest.schemaVersion !== "growpath-plant-identification-qa-review-v1") {
    blockers.push("review manifest schema is unsupported");
  }
  if (
    candidateManifest.catalogSnapshot?.sha256 !== reviewManifest.catalogSnapshot?.sha256
  ) {
    blockers.push(
      "candidate and review manifests do not share the same catalog snapshot"
    );
  }
  const definitionHash = sha256(JSON.stringify(catalogDefinitionProjection(catalog)));
  if (reviewManifest.catalogDefinitionSnapshot?.sha256 !== definitionHash) {
    blockers.push("review manifest is not bound to the current catalog definitions");
  }
  if (reviewManifest.candidateSnapshot?.sha256 !== candidateHash) {
    blockers.push("review manifest is not bound to the candidate manifest");
  }
  if (reviewManifest.targetReviewCount !== catalog.targetRecordCount) {
    blockers.push("review target count does not match the catalog");
  }
  if (!/^\d{4}-\d{2}-\d{2}T/.test(candidateManifest.generatedAt || "")) {
    blockers.push("candidate retrieval timestamp is missing or invalid");
  }
  if (
    reviewManifest.safeguards?.automaticallyApprovesReviews !== false ||
    reviewManifest.safeguards?.automaticallyPromotesCatalogRecords !== false ||
    reviewManifest.safeguards?.copiesMedia !== false ||
    reviewManifest.safeguards?.storesCoordinates !== false
  ) {
    blockers.push("review safeguards are missing or unsafe");
  }
  return blockers;
}

function reviewIntegrityBlockers({ item, definition, sourceCandidate }) {
  const blockers = [];
  if (!definition) blockers.push("review references an unknown case");
  if (!sourceCandidate) blockers.push("review references an unknown candidate");
  if (sourceCandidate && sourceCandidate.caseId !== item.caseId) {
    blockers.push("review candidate belongs to a different case");
  }
  if (
    sourceCandidate &&
    definition &&
    (sourceCandidate.plantCategory !== definition.groupName ||
      sourceCandidate.catalogAcceptedName !== definition.acceptedName ||
      sourceCandidate.catalogScientificName !== definition.scientificName ||
      sourceCandidate.catalogLifeStage !== definition.lifeStage ||
      !sameJson(
        sourceCandidate.catalogExpectedAlternatives,
        definition.expectedAlternatives
      ) ||
      !sameJson(
        sourceCandidate.catalogDistinguishingFocus,
        definition.distinguishingFocus
      ))
  ) {
    blockers.push("candidate catalog context differs from the governed case definition");
  }
  if (
    definition &&
    !sameJson(actualReviewTarget(item), expectedReviewTarget(definition))
  ) {
    blockers.push("review target differs from the governed case definition");
  }
  if (
    sourceCandidate &&
    !sameJson(item.candidate, candidateProjection(sourceCandidate))
  ) {
    blockers.push("review candidate differs from the bound candidate manifest");
  }
  if (sourceCandidate) {
    blockers.push(...candidateSafetyBlockers(sourceCandidate));
  }
  return blockers;
}

function toMediaRecord({ item, definition, candidateManifest }) {
  const review = item.review;
  const candidate = item.candidate;
  const retrievedAt = String(candidateManifest.generatedAt || "").slice(0, 10);
  return {
    recordId: `plant-id-${item.reviewId}`,
    caseId: item.caseId,
    acceptedName: definition.acceptedName,
    scientificName: definition.scientificName,
    plantCategory: definition.groupName,
    lifeStage: definition.lifeStage,
    expectedAlternatives: definition.expectedAlternatives,
    distinguishingFeatures: review.distinguishingFeatures,
    expectedConfidenceRange: review.expectedConfidenceRange,
    expectedResult: review.expectedResult,
    sourceId: candidate.sourceId,
    sourceUrl: candidate.sourceUrl,
    mediaUrl: candidate.mediaUrl,
    creator: candidate.creator,
    licenseId: review.exactLicenseId,
    licenseUrl: review.licenseUrl,
    attributionText: candidate.attributionText,
    retrievedAt,
    rightsReviewedAt: review.rightsReviewedAt,
    intendedUseApproved: true,
    handling: "external_reference",
    reviewProvenance: {
      reviewId: item.reviewId,
      reviewedBy: review.reviewedBy,
      reviewedAt: review.reviewedAt,
      visibleMorphology: review.visibleMorphology,
      taxonomyCrossChecks: review.taxonomyCrossChecks,
      notes: review.notes || ""
    },
    candidateProvenance: {
      candidateId: candidate.candidateId,
      photoId: candidate.photoId,
      sourceQuery: candidate.sourceQuery,
      collectionMode: candidate.collectionMode,
      observedTaxonId: candidate.observedTaxonId,
      observedTaxonName: candidate.observedTaxonName,
      observedTaxonRank: candidate.observedTaxonRank
    }
  };
}

function buildPromotionPlan({
  catalog,
  catalogRaw,
  candidateManifest,
  candidateRaw,
  reviewManifest,
  reviewRaw
}) {
  const snapshotBlockers = validateSnapshots({
    catalog,
    candidateManifest,
    candidateRaw,
    reviewManifest
  });
  if (snapshotBlockers.length) {
    throw new Error(
      `Promotion snapshot validation failed: ${snapshotBlockers.join("; ")}.`
    );
  }

  const definitions = flattenCases(catalog);
  const definitionsById = new Map(
    definitions.map((definition) => [definition.caseId, definition])
  );
  const candidatesById = new Map();
  for (const candidate of candidateManifest.candidates || []) {
    if (candidatesById.has(candidate.candidateId)) {
      throw new Error(`Candidate id ${candidate.candidateId} is duplicated.`);
    }
    candidatesById.set(candidate.candidateId, candidate);
  }

  const reviewIds = new Set();
  const reviewPhotoIds = new Set();
  const blockedReviews = [];
  const promotableRecords = [];
  for (const item of reviewManifest.reviewItems || []) {
    const integrityBlockers = reviewIntegrityBlockers({
      item,
      definition: definitionsById.get(item.caseId),
      sourceCandidate: candidatesById.get(item.candidate?.candidateId)
    });
    if (!String(item.reviewId || "").trim() || reviewIds.has(item.reviewId)) {
      integrityBlockers.push("review id is missing or duplicated");
    }
    if (!new RegExp(`^${item.caseId}-\\d{3}$`).test(item.reviewId || "")) {
      integrityBlockers.push("review id is not scoped to its case");
    }
    reviewIds.add(item.reviewId);
    if (item.candidate?.photoId == null || reviewPhotoIds.has(item.candidate?.photoId)) {
      integrityBlockers.push("review photo id is missing or duplicated");
    }
    reviewPhotoIds.add(item.candidate?.photoId);
    if (integrityBlockers.length) {
      throw new Error(
        `Review ${item.reviewId || "<unknown>"} failed integrity validation: ${integrityBlockers.join("; ")}.`
      );
    }

    const decisionBlockers = reviewDecisionBlockers(item);
    if (decisionBlockers.length) {
      blockedReviews.push({ reviewId: item.reviewId, blockers: decisionBlockers });
      continue;
    }
    promotableRecords.push(
      toMediaRecord({
        item,
        definition: definitionsById.get(item.caseId),
        candidateManifest
      })
    );
  }

  const existingRecords = catalog.mediaRecords || [];
  const existingById = new Map();
  const existingByMedia = new Map();
  for (const record of existingRecords) {
    if (!String(record.recordId || "").trim() || existingById.has(record.recordId)) {
      throw new Error(
        `Existing catalog record id ${record.recordId || "<unknown>"} is missing or duplicated.`
      );
    }
    if (!String(record.mediaUrl || "").trim() || existingByMedia.has(record.mediaUrl)) {
      throw new Error(
        `Existing catalog media URL for ${record.recordId} is missing or duplicated.`
      );
    }
    existingById.set(record.recordId, record);
    existingByMedia.set(record.mediaUrl, record);
  }
  const newRecords = [];
  const alreadyPromoted = [];
  for (const record of promotableRecords) {
    const existingId = existingById.get(record.recordId);
    if (existingId) {
      if (!sameJson(existingId, record)) {
        throw new Error(
          `Existing record ${record.recordId} differs from the reviewed promotion.`
        );
      }
      alreadyPromoted.push(record.recordId);
      continue;
    }
    const existingMedia = existingByMedia.get(record.mediaUrl);
    if (existingMedia) {
      throw new Error(
        `Media URL for ${record.recordId} is already used by ${existingMedia.recordId}.`
      );
    }
    existingById.set(record.recordId, record);
    existingByMedia.set(record.mediaUrl, record);
    newRecords.push(record);
  }

  const nextRecords = [...existingRecords, ...newRecords].sort((left, right) =>
    String(left.recordId).localeCompare(String(right.recordId))
  );
  const countsByCase = new Map(definitions.map((definition) => [definition.caseId, 0]));
  for (const record of nextRecords) {
    if (!countsByCase.has(record.caseId)) {
      throw new Error(`Catalog record ${record.recordId} references an unknown case.`);
    }
    countsByCase.set(record.caseId, countsByCase.get(record.caseId) + 1);
  }
  for (const definition of definitions) {
    const count = countsByCase.get(definition.caseId) || 0;
    if (count > definition.quota) {
      throw new Error(
        `Case ${definition.caseId} would contain ${count}/${definition.quota} records.`
      );
    }
  }
  if (nextRecords.length > catalog.targetRecordCount) {
    throw new Error(
      `Catalog would contain ${nextRecords.length}/${catalog.targetRecordCount} records.`
    );
  }

  const complete =
    nextRecords.length === catalog.targetRecordCount &&
    definitions.every(
      (definition) => countsByCase.get(definition.caseId) === definition.quota
    );
  const nextCatalog = {
    ...catalog,
    status: complete ? "seed_ready" : "planning",
    mediaRecords: nextRecords
  };
  return {
    schemaVersion: "growpath-plant-identification-qa-promotion-plan-v1",
    catalogSha256: sha256(catalogRaw),
    candidateSha256: sha256(candidateRaw),
    reviewSha256: sha256(reviewRaw),
    reviewedItemCount: (reviewManifest.reviewItems || []).length,
    promotableReviewCount: promotableRecords.length,
    blockedReviewCount: blockedReviews.length,
    newRecordCount: newRecords.length,
    alreadyPromotedCount: alreadyPromoted.length,
    nextCatalogRecordCount: nextRecords.length,
    nextCatalogStatus: nextCatalog.status,
    blockedReviews,
    alreadyPromoted,
    newRecords,
    nextCatalog
  };
}

function verifyExpectedHashes(options, plan) {
  for (const [label, expected, actual] of [
    ["catalog", options.expectedCatalogSha256, plan.catalogSha256],
    ["candidate", options.expectedCandidateSha256, plan.candidateSha256],
    ["review", options.expectedReviewSha256, plan.reviewSha256]
  ]) {
    if (expected.toLowerCase() !== actual.toLowerCase()) {
      throw new Error(`Expected ${label} SHA-256 does not match the current input.`);
    }
  }
}

function writeAtomically(targetPath, value) {
  const temporaryPath = `${targetPath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, value, "utf8");
  fs.renameSync(temporaryPath, targetPath);
}

function renderCatalogUpdate(catalogRaw, nextCatalog) {
  const mediaJson = JSON.stringify(nextCatalog.mediaRecords, null, 2)
    .split("\n")
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join("\n");
  let rendered = catalogRaw.replace(
    / {2}"mediaRecords": \[[\s\S]*\]\r?\n}\s*$/,
    `  "mediaRecords": ${mediaJson}\n}\n`
  );
  rendered = rendered.replace(/("status":\s*")[^"]+("\s*,)/, `$1${nextCatalog.status}$2`);
  if (JSON.stringify(JSON.parse(rendered)) !== JSON.stringify(nextCatalog)) {
    throw new Error(
      "Rendered catalog update does not match the validated promotion plan."
    );
  }
  return rendered;
}

function readRequired(targetPath, label) {
  if (!fs.existsSync(targetPath)) throw new Error(`${label} is missing: ${targetPath}`);
  return fs.readFileSync(targetPath, "utf8");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const catalogRaw = readRequired(options.catalogPath, "Plant ID catalog");
  const candidateRaw = readRequired(options.candidatePath, "Plant ID candidate manifest");
  const reviewRaw = readRequired(options.reviewPath, "Plant ID review manifest");
  const plan = buildPromotionPlan({
    catalog: JSON.parse(catalogRaw),
    catalogRaw,
    candidateManifest: JSON.parse(candidateRaw),
    candidateRaw,
    reviewManifest: JSON.parse(reviewRaw),
    reviewRaw
  });

  if (options.execute) {
    verifyExpectedHashes(options, plan);
    if (!plan.newRecordCount) {
      throw new Error(
        "No newly approved Plant ID review records are available to promote."
      );
    }
    writeAtomically(
      options.catalogPath,
      renderCatalogUpdate(catalogRaw, plan.nextCatalog)
    );
  }
  console.log(
    JSON.stringify(
      {
        mode: options.execute ? "catalog_updated" : "dry_run",
        catalogSha256: plan.catalogSha256,
        candidateSha256: plan.candidateSha256,
        reviewSha256: plan.reviewSha256,
        reviewedItemCount: plan.reviewedItemCount,
        promotableReviewCount: plan.promotableReviewCount,
        blockedReviewCount: plan.blockedReviewCount,
        newRecordCount: plan.newRecordCount,
        alreadyPromotedCount: plan.alreadyPromotedCount,
        nextCatalogRecordCount: plan.nextCatalogRecordCount,
        nextCatalogStatus: plan.nextCatalogStatus,
        guarantees: {
          requiresExplicitExecution: true,
          requiresExactInputHashes: true,
          writesAtomically: true,
          copiesMedia: false,
          promotesPendingReviews: false
        }
      },
      null,
      2
    )
  );
}

module.exports = {
  buildPromotionPlan,
  candidateProjection,
  parseArgs,
  sha256,
  toMediaRecord,
  renderCatalogUpdate,
  verifyExpectedHashes,
  writeAtomically
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
