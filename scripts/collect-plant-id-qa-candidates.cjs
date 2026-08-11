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
const OUTPUT_PATH = path.join(
  ROOT,
  "tmp",
  "spec",
  "plant-identification-qa-candidates.json"
);
const INATURALIST_API = "https://api.inaturalist.org/v1/observations";
const ALLOWED_PHOTO_LICENSES = new Set(["cc0", "cc-by"]);
const REQUEST_DELAY_MS = 250;

function parseArgs(argv) {
  const options = {
    execute: false,
    resume: false,
    replace: false,
    caseIds: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--execute") options.execute = true;
    else if (argument === "--resume") options.resume = true;
    else if (argument === "--replace") options.replace = true;
    else if (argument === "--case") {
      const caseId = argv[index + 1];
      if (!caseId || caseId.startsWith("--")) {
        throw new Error("--case requires a catalog case id.");
      }
      options.caseIds.push(caseId);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (options.resume && options.replace) {
    throw new Error("Choose --resume or --replace, not both.");
  }
  if ((options.resume || options.replace) && !options.execute) {
    throw new Error("The selected resume or replace action requires --execute.");
  }
  return options;
}

function readCatalog() {
  const raw = fs.readFileSync(CATALOG_PATH, "utf8");
  return {
    catalog: JSON.parse(raw),
    sha256: crypto.createHash("sha256").update(raw).digest("hex")
  };
}

function flattenCaseDefinitions(catalog) {
  return Object.entries(catalog.caseGroups || {}).flatMap(([groupName, definitions]) =>
    (definitions || []).map((definition) => ({ ...definition, groupName }))
  );
}

function normalizeTaxonQuery(value) {
  return String(value || "")
    .trim()
    .replace(/\s+species$/i, "")
    .replace(/\s+/g, " ");
}

function deriveTaxonQueries(scientificName) {
  return String(scientificName || "")
    .split(/\s+or\s+/i)
    .map(normalizeTaxonQuery)
    .filter(Boolean);
}

function buildObservationUrl(taxonName, { page, perPage }) {
  const url = new URL(INATURALIST_API);
  url.searchParams.set("taxon_name", taxonName);
  url.searchParams.set("quality_grade", "research");
  url.searchParams.set("photos", "true");
  url.searchParams.set("photo_license", "cc0,cc-by");
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(Math.min(200, Math.max(1, perPage))));
  url.searchParams.set("order", "desc");
  url.searchParams.set("order_by", "created_at");
  return url;
}

function replacePhotoSize(urlValue, size) {
  const value = String(urlValue || "");
  if (!value) return "";
  return value.replace(
    /\/(square|small|medium|large|original)\.(jpe?g|png)$/i,
    `/${size}.$2`
  );
}

function chooseAllowedPhoto(observation) {
  const photos = (observation.observation_photos || [])
    .map((entry) => entry?.photo)
    .filter(Boolean);
  return photos.find((photo) =>
    ALLOWED_PHOTO_LICENSES.has(String(photo.license_code || "").toLowerCase())
  );
}

function candidateFromObservation({
  caseDefinition,
  observation,
  photo,
  taxonQuery,
  page
}) {
  const photoLicenseCode = String(photo.license_code || "").toLowerCase();
  if (!ALLOWED_PHOTO_LICENSES.has(photoLicenseCode)) {
    throw new Error(`Photo ${photo.id || "<unknown>"} has a blocked license.`);
  }

  const sourceUrl = String(
    observation.uri || `https://www.inaturalist.org/observations/${observation.id}`
  );
  const previewUrl = replacePhotoSize(photo.url, "medium");
  const mediaUrl = replacePhotoSize(photo.url, "original");
  if (!/^https:\/\//.test(sourceUrl) || !/^https:\/\//.test(mediaUrl)) {
    throw new Error(
      `Observation ${observation.id || "<unknown>"} lacks HTTPS media provenance.`
    );
  }

  return {
    candidateId: `inat-photo-${photo.id}`,
    caseId: caseDefinition.caseId,
    plantCategory: caseDefinition.groupName,
    catalogAcceptedName: caseDefinition.acceptedName,
    catalogScientificName: caseDefinition.scientificName,
    catalogLifeStage: caseDefinition.lifeStage,
    catalogExpectedAlternatives: caseDefinition.expectedAlternatives,
    catalogDistinguishingFocus: caseDefinition.distinguishingFocus,
    sourceId: "inaturalist",
    sourceQuery: taxonQuery,
    sourcePage: page,
    sourceUrl,
    observationId: observation.id,
    photoId: photo.id,
    previewUrl,
    mediaUrl,
    originalDimensions: photo.original_dimensions || null,
    creator: String(photo.attribution || observation.user?.login || "").trim(),
    attributionText: String(photo.attribution || "").trim(),
    sourceLicenseCode: photoLicenseCode,
    licenseVersionStatus: "pending_per-image_confirmation",
    observedTaxonId: observation.taxon?.id || null,
    observedTaxonName: String(observation.taxon?.name || "").trim(),
    observedTaxonRank: String(observation.taxon?.rank || "").trim(),
    qualityGrade: String(observation.quality_grade || "").trim(),
    identificationAgreementCount: Number(observation.num_identification_agreements || 0),
    identificationDisagreementCount: Number(
      observation.num_identification_disagreements || 0
    ),
    ownerIdentificationUsedComputerVision:
      observation.owners_identification_from_vision === true,
    observedOn: observation.observed_on || null,
    captiveOrCultivated: observation.captive === true,
    associatedPhotoCount: Array.isArray(observation.observation_photos)
      ? observation.observation_photos.length
      : 0,
    reviewStatus: "pending_image_taxonomy_stage_and_rights_review",
    identityApproved: false,
    lifeStageApproved: false,
    rightsReviewedAt: null,
    intendedUseApproved: false,
    handling: "external_reference"
  };
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchJson(url, fetchImpl = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "GrowPathAI-Plant-ID-QA-Candidate-Collector/1.0"
      },
      redirect: "error",
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`iNaturalist returned HTTP ${response.status}.`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function createManifest({ catalog, catalogSha256, existingManifest }) {
  if (existingManifest) {
    if (
      existingManifest.schemaVersion !== "growpath-plant-identification-qa-candidates-v1"
    ) {
      throw new Error("Existing candidate manifest has an unsupported schema version.");
    }
    if (existingManifest.catalogSnapshot?.sha256 !== catalogSha256) {
      throw new Error(
        "The Plant ID catalog changed after candidate collection. Review the diff and use --replace instead of mixing catalog versions."
      );
    }
    if (
      existingManifest.sourceId !== "inaturalist" ||
      !Array.isArray(existingManifest.candidates) ||
      !Array.isArray(existingManifest.collectionErrors)
    ) {
      throw new Error("Existing candidate manifest is malformed or from another source.");
    }
    return existingManifest;
  }
  return {
    schemaVersion: "growpath-plant-identification-qa-candidates-v1",
    status: "candidate_collection_pending_review",
    purpose: "QA inference and acceptance candidate review only; never model training.",
    sourceId: "inaturalist",
    generatedAt: new Date().toISOString(),
    catalogSnapshot: {
      schemaVersion: catalog.schemaVersion,
      sha256: catalogSha256,
      targetRecordCount: catalog.targetRecordCount
    },
    safety: {
      copiesMedia: false,
      storesCoordinates: false,
      automaticallyApprovesIdentity: false,
      automaticallyApprovesLifeStage: false,
      automaticallyApprovesRights: false,
      allowedSourcePhotoLicenses: ["cc0", "cc-by"]
    },
    collectionErrors: [],
    candidates: []
  };
}

function readExistingManifest(options) {
  if (!fs.existsSync(OUTPUT_PATH)) {
    if (options.resume) throw new Error("No candidate manifest exists to resume.");
    return null;
  }
  if (!options.resume && !options.replace) {
    throw new Error("Candidate manifest exists. Use --resume or --replace explicitly.");
  }
  if (options.replace) return null;
  return JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
}

function writeManifestAtomically(manifest) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  const temporaryPath = `${OUTPUT_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, OUTPUT_PATH);
}

function summarize(catalog, caseDefinitions, manifest) {
  const candidateCounts = Object.fromEntries(
    caseDefinitions.map((definition) => [
      definition.caseId,
      manifest
        ? manifest.candidates.filter(
            (candidate) => candidate.caseId === definition.caseId
          ).length
        : 0
    ])
  );
  return {
    mode: manifest ? "collected_candidates" : "dry_run",
    catalogStatus: catalog.status,
    targetRecordCount: catalog.targetRecordCount,
    selectedCaseCount: caseDefinitions.length,
    selectedQuota: caseDefinitions.reduce(
      (total, definition) => total + Number(definition.quota || 0),
      0
    ),
    candidateCount: manifest?.candidates.length || 0,
    collectionErrorCount: manifest?.collectionErrors.length || 0,
    candidateCounts,
    guarantees: {
      networkUsed: Boolean(manifest),
      catalogModified: false,
      mediaCopied: false,
      identityApproved: false,
      rightsApproved: false
    }
  };
}

async function collectCandidates({ catalog, catalogSha256, caseDefinitions, options }) {
  const existingManifest = readExistingManifest(options);
  const manifest = createManifest({ catalog, catalogSha256, existingManifest });
  const existingPhotoIds = new Set(
    manifest.candidates.map((candidate) => candidate.photoId)
  );
  const pageByQuery = new Map();
  for (const candidate of manifest.candidates) {
    pageByQuery.set(
      candidate.sourceQuery,
      Math.max(pageByQuery.get(candidate.sourceQuery) || 0, candidate.sourcePage || 0)
    );
  }

  for (const definition of caseDefinitions) {
    const currentCount = manifest.candidates.filter(
      (candidate) => candidate.caseId === definition.caseId
    ).length;
    const targetCandidateCount = Math.max(definition.quota * 2, 12);
    let remaining = Math.max(0, targetCandidateCount - currentCount);
    const taxonQueries = deriveTaxonQueries(definition.scientificName);
    if (!taxonQueries.length) continue;

    for (const taxonQuery of taxonQueries) {
      if (remaining === 0) break;
      const queryTarget = Math.ceil(remaining / taxonQueries.length);
      const perPage = Math.min(200, Math.max(queryTarget * 3, 25));
      const page = (pageByQuery.get(taxonQuery) || 0) + 1;
      pageByQuery.set(taxonQuery, page);
      const url = buildObservationUrl(taxonQuery, { page, perPage });

      try {
        const payload = await fetchJson(url);
        let addedForQuery = 0;
        for (const observation of payload.results || []) {
          if (addedForQuery >= queryTarget || remaining === 0) break;
          const photo = chooseAllowedPhoto(observation);
          if (!photo || existingPhotoIds.has(photo.id)) continue;
          const candidate = candidateFromObservation({
            caseDefinition: definition,
            observation,
            photo,
            taxonQuery,
            page
          });
          manifest.candidates.push(candidate);
          existingPhotoIds.add(photo.id);
          addedForQuery += 1;
          remaining -= 1;
        }
      } catch (error) {
        manifest.collectionErrors.push({
          caseId: definition.caseId,
          taxonQuery,
          page,
          message: error instanceof Error ? error.message : String(error)
        });
      }
      writeManifestAtomically(manifest);
      await sleep(REQUEST_DELAY_MS);
    }
  }

  manifest.generatedAt = new Date().toISOString();
  manifest.status = manifest.collectionErrors.length
    ? "partial_candidate_collection_pending_review"
    : "candidate_collection_pending_review";
  writeManifestAtomically(manifest);
  return manifest;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { catalog, sha256 } = readCatalog();
  const allCases = flattenCaseDefinitions(catalog);
  const selectedCases = options.caseIds.length
    ? allCases.filter((definition) => options.caseIds.includes(definition.caseId))
    : allCases;
  const unknownCaseIds = options.caseIds.filter(
    (caseId) => !allCases.some((definition) => definition.caseId === caseId)
  );
  if (unknownCaseIds.length) {
    throw new Error(`Unknown catalog case ids: ${unknownCaseIds.join(", ")}`);
  }

  if (!options.execute) {
    console.log(JSON.stringify(summarize(catalog, selectedCases, null), null, 2));
    return;
  }

  const manifest = await collectCandidates({
    catalog,
    catalogSha256: sha256,
    caseDefinitions: selectedCases,
    options
  });
  console.log(JSON.stringify(summarize(catalog, selectedCases, manifest), null, 2));
  if (manifest.collectionErrors.length) process.exitCode = 2;
}

module.exports = {
  ALLOWED_PHOTO_LICENSES,
  buildObservationUrl,
  candidateFromObservation,
  chooseAllowedPhoto,
  createManifest,
  deriveTaxonQueries,
  flattenCaseDefinitions,
  normalizeTaxonQuery,
  parseArgs,
  replacePhotoSize,
  summarize
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
