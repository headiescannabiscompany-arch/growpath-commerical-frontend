import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import PlantIdentificationResultDetails from "@/features/personal/tools/PlantIdentificationResultDetails";
import {
  bestStructuredPlantCandidateName,
  isCannabisPlantIdentification,
  plantIdentificationCandidates,
  plantIdentificationEvidence,
  safePlantIdentificationOutputs
} from "@/features/personal/tools/plantIdentificationCandidates";
import type {
  ToolResultAction,
  ToolResultMetric
} from "@/features/personal/tools/ToolResultSurface";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import PrivateLocationPicker from "@/components/fieldStudies/PrivateLocationPicker";
import {
  extractEvidenceVideoFrames,
  getEvidenceAssetsByIds,
  getEvidenceVideoFrameExtraction,
  providerEvidencePayload,
  type EvidenceFrameExtraction,
  type EvidenceFrameExtractionResult,
  type EvidenceWorkspaceScope
} from "@/api/evidence";
import { savePersonalGrowCropIdentity } from "@/api/grows";
import { savePersonalPlantCropIdentity } from "@/api/plants";
import {
  createFieldStudy,
  createFieldObservation,
  FieldStudy,
  listFieldStudies,
  ObservationLocationPrivacy,
  updateFieldObservation,
  updateFieldStudy
} from "@/api/fieldStudies";
import {
  requestCurrentCoordinates,
  type PublicCoordinates
} from "@/utils/locationSearch";
import {
  updateGrowpathModuleRecord,
  type GrowpathModuleRecord,
  type GrowpathModuleUserDecision
} from "@/api/growpathModules";
import {
  getToolRun,
  listToolRuns,
  updatePlantIdCorrection,
  updateToolRun,
  type ToolRun,
  type ToolRunWorkspaceScope
} from "@/api/toolRuns";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import type { EvidenceAsset } from "@/types/evidence";
import { useEntitlements } from "@/entitlements";
import {
  resolveToolWorkspaceType,
  toolWorkspaceIdentity
} from "@/features/personal/tools/toolWorkspaceScope";

const PLANT_ID_REVIEW_POLICY_VERSION = "plant-id-night-light-detail-v2";
const FRAME_EXTRACTION_POLL_DELAYS_MS = [1500, 3000, 5000, 8000, 12000, 20000, 30000];
const FRAME_EXTRACTION_MAX_AUTOMATIC_POLLS = 20;
const DIRECT_NATURE_COLLECTION_TITLE = "My Nature Finds";
const DIRECT_NATURE_COLLECTION_DESCRIPTION =
  "Plant IDs deliberately shared from the direct Discovery Nature workflow.";
// Plant ID uploads used the generic `other` purpose before the dedicated evidence
// purpose shipped. Keep that finite legacy window recoverable without allowing a
// modern run (or a diagnosis/IPM asset) to cross workflow boundaries.
const LEGACY_PLANT_ID_PURPOSE_CUTOFF_MS = Date.parse("2026-08-07T00:00:00.000Z");

function directNatureCollection(studies: FieldStudy[]) {
  return (
    studies.find(
      (study) =>
        study.title === DIRECT_NATURE_COLLECTION_TITLE &&
        study.description === DIRECT_NATURE_COLLECTION_DESCRIPTION &&
        study.purpose === "biodiversity_survey"
    ) || null
  );
}

function routeParam(value?: string | string[]) {
  return String(Array.isArray(value) ? value[0] || "" : value || "").trim();
}

export function plantIdResultFollowUpQuestions({
  outputs,
  payload
}: {
  outputs: Record<string, any>;
  payload: Record<string, any>;
}) {
  const explicitCropContext = [
    payload.userEnteredName,
    payload.scientificName,
    payload.cropCommonName,
    payload.cropContext,
    payload.selectedPlantContext?.cropCommonName,
    payload.selectedPlantContext?.scientificName
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const cannabisContext =
    isCannabisPlantIdentification(outputs) ||
    explicitCropContext.some((value) => /\b(?:cannabis|marijuana|hemp)\b/i.test(value));
  return [
    ...(cannabisContext
      ? [
          "Male, female, intersex, or unclear from this evidence?",
          "What node or preflower photo would confirm plant sex?"
        ]
      : []),
    "What visible traits support this identification?",
    "What photo should I add next to separate the leading candidates?"
  ];
}

const PLANT_ID_AI_PROMPT = `You are GrowPathAI's plant identification assistant. Act like a cautious field botanist, not a one-photo image-matching toy.

Inspect the attached image pixels first. Use user-entered context and selected private grow/plant context only when supplied. Narrow in this order: broad plant group, morphology, likely family, possible genera, then species only when diagnostic evidence supports it. Consider growth habit, leaf arrangement/type/margin/venation, stems, flower symmetry and parts, inflorescence, fruit/seed, special structures, habitat, geography, season, and whether the plant is wild or cultivated.

Assess the usable plant detail before naming a crop. Nighttime, a dark background, phone-light illumination, or direct flash is not automatically a failed image. Treat those conditions as a quality risk, then decide whether the illuminated areas still preserve sharp diagnostic leaf, stem, flower, fruit, inflorescence, or trichome structure and sufficiently reliable color. Evaluate every submitted photo or extracted video frame separately and base the set-level result on the compatible usable views; one bad frame must not invalidate clearer evidence. Mark the evidence limited or unusable only when clipped highlights, deep shadow, glare, color distortion, blur, or a small target actually hides the characters needed for the proposed identification. In that state set imageQuality to "limited" or "unusable", visualConfidence to "low", leave userEnteredName and scientificName blank, retain only cautious broader candidates, and request targeted replacements. Do not upgrade the identity merely because the same unchanged images are submitted again.

Only populate growing setting, habitat, visible surface substrate, or nearby associated plants when the photos directly support them or the user supplied them. Do not populate cultivar, wild-versus-cultivated provenance, location or region, observation date or season, sensory traits, or plant-size measurements from image analysis. Leave unsupported and user-only fields blank instead of inventing them.

Return useful broader candidates when exact species is unresolved. Cannabis is an allowed crop candidate from deliberately submitted evidence. A clear cannabis flower or harvested bud may support a crop-level Cannabis draft from visible bracts/calyxes, pistils, resinous sugar leaves, trichome coverage, and inflorescence structure. Never infer cultivar or strain from appearance.

Do not claim that GBIF, USDA PLANTS, Kew POWO, iNaturalist, a flora, herbarium, or extension source was checked; this image step has no botanical-database lookup. Do not invent source records, range matches, or expert confirmation. If the evidence supports a genus but not an exact species, use a genus-level scientific draft such as "Mandevilla spp." and keep nursery or common synonyms such as "Dipladenia" in commonNames. Never put an English common-name phrase such as "rose plant" in scientificName. If names conflict, a proposed name is unusable, or the current views cannot separate lookalikes, set visualConfidence and candidate confidence to low and request a new whole-plant view, full leaf and underside with stem node, open flower, and any fruit or seed structure present. If pixels are unavailable, set imageAnalysisPerformed to "false". Every result remains a draft until the user confirms it.

Return JSON only with exactly these keys:
{
  "userEnteredName": "string",
  "scientificName": "string",
  "cultivar": "",
  "commonNames": "comma-separated string",
  "setting": "outdoor, indoor, greenhouse, unknown, or blank when unsupported",
  "habitat": "visible or user-provided habitat, otherwise blank",
  "substrate": "visible surface substrate or user-provided substrate, otherwise blank",
  "associatedPlants": "comma-separated visible or user-provided nearby plants, otherwise blank",
  "plantSize": "",
  "broadGroup": "flowering_plant, conifer, fern, moss_or_ally, fungus_or_lichen, or unknown",
  "likelyFamily": "string",
  "possibleGenera": ["string"],
  "growthHabit": "tree, shrub, vine, herb, grasslike, succulent, fernlike, or unknown",
  "leafArrangement": "opposite, alternate, whorled, basal, rosette, or unknown",
  "leafType": "simple, compound, pinnate, palmate, scale_like, needle_like, or unknown",
  "leafMargin": "entire, serrated, lobed, spiny, wavy, or unknown",
  "venation": "parallel, pinnate, palmate, or unknown",
  "flowerPresent": "yes, no, or unknown",
  "flowerSymmetry": "radial, bilateral, or unknown",
  "fruitPresent": "yes, no, or unknown",
  "stemTraits": "comma-separated visible traits",
  "flowerPartsVisible": "comma-separated visible parts",
  "inflorescenceType": "string",
  "fruitType": "string",
  "specialStructures": "comma-separated visible structures",
  "identificationNotes": "visible observations and uncertainty",
  "imageAnalysisPerformed": "true or false",
  "imageQuality": "usable, limited, or unusable",
  "visualConfidence": "high, medium, or low",
  "identifyingVisualTraits": "string",
  "candidates": [
    {
      "scientificName": "string",
      "commonNames": ["string"],
      "rank": "family, genus, species, or working_candidate",
      "confidence": "high, medium, or low",
      "evidence": ["visible or user-provided evidence"],
      "counterEvidence": ["conflicts or unresolved lookalikes"],
      "missingEvidence": ["evidence needed to narrow further"]
    }
  ],
  "evidence": ["observations that support the draft"],
  "counterEvidence": ["observations that conflict or preserve lookalikes"],
  "missingEvidence": ["missing information"],
  "requiredNextPhotos": ["specific photo requests"],
  "requiredNextQuestions": ["specific context questions"]
}`;

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return String(value || "")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function compactValues(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => {
      const text = String(value || "").trim();
      return text && text !== "unknown";
    })
  );
}

function plantIdManualInputProvenance(userValues: Record<string, string>) {
  const pickEntered = (keys: string[]) =>
    Object.fromEntries(
      keys
        .map((key) => [key, String(userValues[key] || "").trim()] as const)
        .filter(([, value]) => value && value.toLowerCase() !== "unknown")
    );
  const morphology = pickEntered([
    "growthHabit",
    "leafArrangement",
    "leafType",
    "leafMargin",
    "venation",
    "flowerPresent",
    "flowerSymmetry",
    "fruitPresent",
    "stemTraits",
    "flowerPartsVisible",
    "inflorescenceType",
    "fruitType",
    "specialStructures",
    "sensoryTraits"
  ]);
  const observationContext = pickEntered([
    "cultivationStatus",
    "setting",
    "region",
    "observationDate",
    "habitat",
    "substrate",
    "associatedPlants",
    "plantSize"
  ]);
  const identificationNotes = String(userValues.identificationNotes || "").trim();
  return {
    source: "user_entry" as const,
    morphology,
    observationContext,
    ...(identificationNotes ? { identificationNotes } : {})
  };
}

function normalizeScientificName(value: unknown) {
  const name = String(value || "").trim();
  if (
    !name ||
    /^(not confirmed|not identified|unidentified|unknown(?: crop)?|unsure|uncertain|n\/a|none)$/i.test(
      name
    ) ||
    /\b(?:plant|tree|shrub|bush|flower|crop|weed|grass|vine)\b/i.test(name)
  ) {
    return "";
  }
  return name;
}

type PlantIdVisionAssessment = {
  policyVersion: string;
  previousPolicyVersion?: string;
  reassessedUnderUpdatedPolicy: boolean;
  performed: boolean;
  reportedQuality: "usable" | "limited" | "unusable";
  reportedConfidence: "high" | "medium" | "low";
  quality: "usable" | "limited" | "unusable";
  confidence: "high" | "medium" | "low";
  identityKey: string;
  sameEvidenceConflict: boolean;
  withholdIdentity: boolean;
  downgradeCandidates: boolean;
  limitations: string[];
};

export type VerifiedPlantIdFrameExtraction = {
  sourceId: string;
  version: string;
  attemptCount: number;
  frameIds: string[];
};

function plantIdVisionChoice<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return (allowed as readonly string[]).includes(normalized)
    ? (normalized as T)
    : fallback;
}

function plantIdIdentityKey(parsed: Record<string, any>) {
  const normalizeIdentityToken = (value: unknown) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  const normalizedNames = (values: unknown[]) =>
    Array.from(
      new Set(
        values
          .map(normalizeIdentityToken)
          .filter(Boolean)
          .filter((value) => !unresolvedCropName(value))
      )
    ).sort();
  const identityNames = normalizedNames([
    parsed.userEnteredName,
    normalizeScientificName(parsed.scientificName),
    ...stringList(parsed.commonNames),
    ...(Array.isArray(parsed.candidates)
      ? parsed.candidates.flatMap((candidate: any) => [
          normalizeScientificName(candidate?.scientificName),
          ...stringList(candidate?.commonNames)
        ])
      : [])
  ]);
  const likelyFamily = normalizedNames([parsed.likelyFamily]);
  const possibleGenera = normalizedNames(stringList(parsed.possibleGenera));
  if (!identityNames.length && !likelyFamily.length && !possibleGenera.length) {
    return "";
  }
  return JSON.stringify({ identityNames, likelyFamily, possibleGenera });
}

function evidenceReviewKey(evidenceAssetIds: unknown) {
  return Array.from(new Set(stringList(evidenceAssetIds).map(String)))
    .sort()
    .join("|");
}

function savedPlantIdEvidenceIds(run: ToolRun) {
  const inputs = run.inputs || run.input || run.params || {};
  const outputs = run.outputs || run.result || {};
  const mediaEvidence = Array.isArray(inputs.mediaEvidence) ? inputs.mediaEvidence : [];
  return Array.from(
    new Set([
      ...stringList(inputs.evidenceAssetIds),
      ...stringList(inputs.imageAnalysis?.evidenceUsed),
      ...stringList(outputs.imageAnalysis?.evidenceUsed),
      ...mediaEvidence
        .map((item: any) => String(item?.id || item?.assetId || "").trim())
        .filter(Boolean)
    ])
  );
}

function toolRunCreatedAtMs(run: ToolRun) {
  const explicit = Date.parse(String(run.createdAt || ""));
  if (Number.isFinite(explicit)) return explicit;
  const id = String(run.id || run._id || "").trim();
  if (!/^[0-9a-f]{24}$/i.test(id)) return Number.NaN;
  return Number.parseInt(id.slice(0, 8), 16) * 1000;
}

function legacyGenericPlantIdAsset(run: ToolRun, asset: EvidenceAsset, id: string) {
  const toolType = String(run.toolType || run.toolName || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  const inputs = run.inputs || run.input || run.params || {};
  const outputs = run.outputs || run.result || {};
  const legacySourceToolRunId = String(inputs.legacySourceToolRunId || "").trim();
  const legacySourceCreatedAtMs = /^[0-9a-f]{24}$/i.test(legacySourceToolRunId)
    ? Number.parseInt(legacySourceToolRunId.slice(0, 8), 16) * 1000
    : Number.NaN;
  const createdAtMs = toolRunCreatedAtMs(run);
  const recordedIds = new Set([
    ...stringList(inputs.evidenceAssetIds),
    ...stringList(inputs.imageAnalysis?.evidenceUsed),
    ...stringList(outputs.imageAnalysis?.evidenceUsed),
    ...(Array.isArray(inputs.mediaEvidence)
      ? inputs.mediaEvidence.map((item: any) =>
          String(item?.id || item?.assetId || "").trim()
        )
      : [])
  ]);
  return (
    asset.purpose === "other" &&
    (toolType === "species_crop_id" || toolType === "species_crop_identification") &&
    Number.isFinite(createdAtMs) &&
    (createdAtMs < LEGACY_PLANT_ID_PURPOSE_CUTOFF_MS ||
      (Number.isFinite(legacySourceCreatedAtMs) &&
        legacySourceCreatedAtMs < LEGACY_PLANT_ID_PURPOSE_CUTOFF_MS)) &&
    recordedIds.has(id)
  );
}

function savedPlantIdRecoveryEligibilityError(run: ToolRun, assets: EvidenceAsset[]) {
  const inputs = run.inputs || run.input || run.params || {};
  const expectedTypes = new Map<string, "photo" | "video">();
  for (const id of stringList(inputs.imageAnalysis?.evidenceUsed)) {
    expectedTypes.set(id, "photo");
  }
  if (Array.isArray(inputs.mediaEvidence)) {
    for (const item of inputs.mediaEvidence) {
      const id = String(item?.id || item?.assetId || "").trim();
      const type = String(item?.type || item?.assetType || "")
        .trim()
        .toLowerCase();
      if (id && (type === "photo" || type === "video")) {
        expectedTypes.set(id, type);
      }
    }
  }

  const photos: EvidenceAsset[] = [];
  const videos: EvidenceAsset[] = [];
  for (const asset of assets) {
    const id = String(asset.id || asset._id || "").trim();
    if (
      asset.purpose !== "crop_identification" &&
      !legacyGenericPlantIdAsset(run, asset, id)
    ) {
      return "Saved Plant ID evidence belongs to another workflow. Nothing was loaded; add fresh Plant ID photos instead.";
    }
    if (asset.assetType !== "photo" && asset.assetType !== "video") {
      return "Saved Plant ID evidence contains an unsupported media type. Nothing was loaded; add fresh Plant ID photos instead.";
    }
    const expectedType = expectedTypes.get(id);
    if (expectedType && asset.assetType !== expectedType) {
      return `A saved Plant ID ${expectedType} no longer has the expected media type. Nothing was loaded; add fresh Plant ID photos instead.`;
    }
    if (asset.uploadStatus !== "uploaded" || !String(asset.durableUrl || "").trim()) {
      return "Saved Plant ID evidence is no longer fully uploaded and available. Nothing was loaded; add the media again before retrying.";
    }
    if (asset.assetType === "photo") {
      if (asset.aiUsable !== true) {
        return "A saved Plant ID photo is not approved for AI analysis. Nothing was loaded; add the photo again to approve it for a new Plant ID review.";
      }
      photos.push(asset);
    } else {
      // A source video stays private, non-AI evidence. Only its selected frames are
      // approved for image analysis, so the video itself does not require aiUsable.
      videos.push(asset);
    }
  }
  if (videos.length > 1) {
    return "This Saved Plant ID contains more than one private source video. Nothing was loaded; add fresh Plant ID photos instead.";
  }
  if (!photos.length && !videos.length) {
    return "This Saved Plant ID no longer contains uploaded photo or video evidence. Nothing was loaded; add fresh evidence before retrying.";
  }
  const videosById = new Map(
    videos.map((asset) => [String(asset.id || asset._id || "").trim(), asset])
  );
  for (const photo of photos) {
    if (String(photo.source || "").toLowerCase() !== "generated") continue;
    const sourceVideoId = String(photo.sourceVideoEvidenceAssetId || "").trim();
    const sourceVideo = videosById.get(sourceVideoId);
    if (!sourceVideoId || !sourceVideo || sourceVideo.purpose !== photo.purpose) {
      return "A saved extracted frame is missing its private source video association. Nothing was loaded; add the video or fresh photos again before retrying.";
    }
  }
  return "";
}

export function plantIdFrameMergeCapacityError(
  currentAssets: EvidenceAsset[],
  returnedFrameIds: readonly string[],
  returnedFrameCount: number,
  sourceVideoEvidenceAssetId = ""
) {
  const returnedIdSet = new Set(
    returnedFrameIds.map((id) => String(id || "").trim()).filter(Boolean)
  );
  const sourceId = String(sourceVideoEvidenceAssetId || "").trim();
  const nonReturnedPhotoCount = currentAssets.filter((asset) => {
    if (asset.assetType !== "photo") return false;
    const assetId = String(asset.id || asset._id || "").trim();
    if (returnedIdSet.has(assetId)) return false;
    return !(
      sourceId &&
      asset.source === "generated" &&
      String(asset.sourceVideoEvidenceAssetId || "").trim() === sourceId
    );
  }).length;
  if (nonReturnedPhotoCount + returnedFrameCount <= 12) return "";
  return `The completed frame set would exceed the 12-photo limit because ${nonReturnedPhotoCount} other photo${
    nonReturnedPhotoCount === 1 ? " is" : "s are"
  } now selected. Remove photos, then restore the saved frame set again.`;
}

export function plantIdProviderReadyEvidenceAssets(
  assets: EvidenceAsset[],
  verifiedExtraction: VerifiedPlantIdFrameExtraction | null,
  verifiedSetReady: boolean
) {
  const nonGeneratedAssets = assets.filter((asset) => asset.source !== "generated");
  if (!verifiedSetReady || !verifiedExtraction) return nonGeneratedAssets;

  const generatedFramesById = new Map<string, EvidenceAsset[]>();
  assets.forEach((asset) => {
    if (asset.source !== "generated" || asset.assetType !== "photo") return;
    const assetId = String(asset.id || asset._id || "").trim();
    if (!assetId) return;
    const matches = generatedFramesById.get(assetId) || [];
    matches.push(asset);
    generatedFramesById.set(assetId, matches);
  });

  const canonicalFrames: EvidenceAsset[] = [];
  for (const [expectedIndex, frameId] of verifiedExtraction.frameIds.entries()) {
    const matches = generatedFramesById.get(frameId) || [];
    if (matches.length !== 1) return nonGeneratedAssets;
    const frame = matches[0];
    if (
      String(frame.sourceVideoEvidenceAssetId || "").trim() !==
        verifiedExtraction.sourceId ||
      String(frame.frameExtractionVersion || "").trim() !== verifiedExtraction.version ||
      !Number.isInteger(frame.frameExtractionAttempt) ||
      frame.frameExtractionAttempt !== verifiedExtraction.attemptCount ||
      !Number.isInteger(frame.frameIndex) ||
      frame.frameIndex !== expectedIndex
    ) {
      return nonGeneratedAssets;
    }
    canonicalFrames.push(frame);
  }
  return [...nonGeneratedAssets, ...canonicalFrames];
}

function explicitUserIdentityClaim(payload: Record<string, any>) {
  const provenance = payload.identityInputProvenance || {};
  const providedFields = new Set(stringList(provenance.providedFields));
  const isUserEntry = provenance.source === "user_entry";
  const userEnteredName =
    isUserEntry && providedFields.has("userEnteredName")
      ? String(provenance.userEnteredName || "").trim()
      : "";
  const scientificName =
    isUserEntry && providedFields.has("scientificName")
      ? String(provenance.scientificName || "").trim()
      : "";
  const commonNames =
    isUserEntry && providedFields.has("commonNames")
      ? stringList(provenance.commonNames)
      : [];
  const cultivar =
    isUserEntry && providedFields.has("cultivar")
      ? String(provenance.cultivar || "").trim()
      : "";
  const primaryName = userEnteredName || commonNames[0] || scientificName;
  return {
    hasIdentity: Boolean(primaryName),
    primaryName,
    scientificName,
    commonNames,
    cultivar,
    invalidScientificName: Boolean(
      scientificName && !normalizeScientificName(scientificName)
    )
  };
}

function savedPlantIdAssessment(run: ToolRun): PlantIdVisionAssessment | null {
  const inputs = run.inputs || run.input || run.params || {};
  const outputs = run.outputs || run.output || run.result || {};
  const imageAnalysis = inputs.imageAnalysis || outputs.imageAnalysis || {};
  if (imageAnalysis.requested !== true) return null;
  const identificationDraft =
    inputs.identificationDraft || outputs.identificationDraft || {};
  const parsed = {
    // Hydrated comparison is AI-to-AI only. Never mix ordinary form inputs or
    // explicit user identity provenance into the prior AI identity signature.
    userEnteredName: "",
    scientificName: "",
    commonNames: "",
    likelyFamily: identificationDraft.likelyFamily || outputs.likelyFamily || "",
    possibleGenera: identificationDraft.possibleGenera || outputs.possibleGenera || [],
    candidates: identificationDraft.candidates || outputs.candidates || []
  };
  const quality = plantIdVisionChoice(
    imageAnalysis.quality,
    ["usable", "limited", "unusable"] as const,
    "limited"
  );
  const confidence = plantIdVisionChoice(
    imageAnalysis.confidence,
    ["high", "medium", "low"] as const,
    "low"
  );
  const performed = imageAnalysis.performed === true;
  const limitations = stringList(imageAnalysis.limitations);
  const sameEvidenceConflict = limitations.some((item) =>
    /same unchanged evidence produced a conflicting identity/i.test(item)
  );
  const identityKey = plantIdIdentityKey(parsed);
  return {
    policyVersion: String(imageAnalysis.reviewPolicyVersion || "legacy"),
    previousPolicyVersion: undefined,
    reassessedUnderUpdatedPolicy: false,
    performed,
    reportedQuality: quality,
    reportedConfidence: confidence,
    quality,
    confidence,
    identityKey,
    sameEvidenceConflict,
    withholdIdentity: !performed || quality !== "usable" || confidence !== "high",
    downgradeCandidates:
      !performed || quality !== "usable" || confidence === "low" || sameEvidenceConflict,
    limitations
  };
}

function assessPlantIdVisionReply({
  parsed,
  response,
  previous
}: {
  parsed: Record<string, any>;
  response: Record<string, any>;
  previous?: PlantIdVisionAssessment;
}): PlantIdVisionAssessment {
  const responseLimitations = Array.isArray(response.limitations)
    ? response.limitations.map(String)
    : [];
  const reportsNoVision = responseLimitations.some((item) =>
    /text[- ]only|cannot (inspect|analyze|view)|image pixels? (were )?not|visual analysis (was )?not/i.test(
      item
    )
  );
  const evidenceUsed = Array.isArray(response.evidenceUsed)
    ? response.evidenceUsed.filter(Boolean)
    : [];
  const photosAnalyzed = Number(response.mediaAnalysis?.photosAnalyzed || 0);
  const performed =
    String(parsed.imageAnalysisPerformed || "").toLowerCase() === "true" &&
    evidenceUsed.length > 0 &&
    photosAnalyzed > 0 &&
    !reportsNoVision;
  const reportedQuality = plantIdVisionChoice(
    parsed.imageQuality,
    ["usable", "limited", "unusable"] as const,
    "limited"
  );
  const reportedConfidence = plantIdVisionChoice(
    parsed.visualConfidence,
    ["high", "medium", "low"] as const,
    "low"
  );
  const identityKey = plantIdIdentityKey(parsed);
  const comparablePrevious =
    previous?.policyVersion === PLANT_ID_REVIEW_POLICY_VERSION ? previous : undefined;
  const reassessedUnderUpdatedPolicy = Boolean(
    previous && previous.policyVersion !== PLANT_ID_REVIEW_POLICY_VERSION
  );
  const identityChanged = Boolean(
    comparablePrevious?.identityKey &&
    identityKey &&
    comparablePrevious.identityKey !== identityKey
  );
  const unsupportedIdentityAppeared = Boolean(
    comparablePrevious &&
    !comparablePrevious.identityKey &&
    identityKey &&
    comparablePrevious.withholdIdentity
  );
  const confidenceRank: Record<"high" | "medium" | "low", number> = {
    low: 0,
    medium: 1,
    high: 2
  };
  const unchangedEvidenceQualityUpgrade = Boolean(
    comparablePrevious &&
    ((comparablePrevious.quality !== "usable" && reportedQuality === "usable") ||
      confidenceRank[reportedConfidence] > confidenceRank[comparablePrevious.confidence])
  );
  const sameEvidenceConflict =
    identityChanged || unsupportedIdentityAppeared || unchangedEvidenceQualityUpgrade;
  const quality = sameEvidenceConflict ? "limited" : reportedQuality;
  const confidence =
    !performed ||
    quality !== "usable" ||
    reportedConfidence === "low" ||
    sameEvidenceConflict
      ? "low"
      : reportedConfidence;
  const withholdIdentity = !performed || quality !== "usable" || confidence !== "high";
  const downgradeCandidates =
    !performed || quality !== "usable" || confidence === "low" || sameEvidenceConflict;
  const limitations = [
    ...responseLimitations,
    ...(reportedQuality !== "usable"
      ? [
          "The submitted views did not provide consistently usable diagnostic detail. Retake the whole plant and diagnostic structures in even daylight or diffuse light without direct-flash glare or deep shadow."
        ]
      : []),
    ...(performed && quality === "usable" && confidence !== "high"
      ? [
          "The image review supports only a candidate, not an identity-field prefill. Add the requested diagnostic views before promoting a plant name into the form."
        ]
      : []),
    ...(sameEvidenceConflict
      ? [
          "A repeated review of the same unchanged evidence produced a conflicting identity or unsupported quality/confidence upgrade. The working name was withheld until the evidence changes."
        ]
      : []),
    ...(reassessedUnderUpdatedPolicy
      ? [
          "This unchanged evidence was reassessed under an updated nighttime-lighting policy. Compare this result with the prior review and explicitly confirm or reject the new candidate."
        ]
      : [])
  ].filter((item, index, items) => item && items.indexOf(item) === index);
  return {
    policyVersion: PLANT_ID_REVIEW_POLICY_VERSION,
    previousPolicyVersion: reassessedUnderUpdatedPolicy
      ? previous?.policyVersion
      : undefined,
    reassessedUnderUpdatedPolicy,
    performed,
    reportedQuality,
    reportedConfidence,
    quality,
    confidence,
    identityKey,
    sameEvidenceConflict,
    withholdIdentity,
    downgradeCandidates,
    limitations
  };
}

function buildIdentificationDraft(
  parsed: Record<string, any>,
  assessment?: PlantIdVisionAssessment
) {
  const candidates = Array.isArray(parsed.candidates)
    ? parsed.candidates.slice(0, 5).map((candidate: any) => {
        const suppliedScientificName = String(candidate?.scientificName || "").trim();
        const scientificName = normalizeScientificName(suppliedScientificName);
        const scientificNameWithheld = Boolean(suppliedScientificName) && !scientificName;
        const suppliedRank = String(candidate?.rank || "working_candidate").trim();
        return {
          scientificName,
          commonNames: stringList(candidate?.commonNames),
          rank:
            suppliedRank === "species" && !scientificName
              ? "working_candidate"
              : suppliedRank,
          confidence:
            scientificNameWithheld || assessment?.downgradeCandidates
              ? "low"
              : String(candidate?.confidence || "low").trim(),
          evidence: stringList(candidate?.evidence),
          counterEvidence: [
            ...stringList(candidate?.counterEvidence),
            ...(scientificNameWithheld
              ? ["The supplied scientific-name output was not a usable botanical name."]
              : []),
            ...(assessment?.sameEvidenceConflict ? assessment.limitations : [])
          ],
          missingEvidence: stringList(candidate?.missingEvidence)
        };
      })
    : [];
  if (!candidates.length && assessment?.identityKey) {
    const suppliedName = String(parsed.userEnteredName || "").trim();
    const candidateCommonNames = [
      ...(!unresolvedCropName(suppliedName) ? [suppliedName] : []),
      ...stringList(parsed.commonNames)
    ].filter((item, index, items) => item && items.indexOf(item) === index);
    candidates.push({
      scientificName: normalizeScientificName(parsed.scientificName),
      commonNames: candidateCommonNames,
      rank: "working_candidate",
      confidence: assessment.downgradeCandidates ? "low" : assessment.confidence,
      evidence: stringList(parsed.evidence),
      counterEvidence: assessment.withholdIdentity ? assessment.limitations : [],
      missingEvidence: stringList(parsed.missingEvidence)
    });
  }
  const draft = {
    broadGroup: String(parsed.broadGroup || "unknown").trim(),
    likelyFamily: String(parsed.likelyFamily || "").trim(),
    possibleGenera: stringList(parsed.possibleGenera),
    candidates,
    evidence: stringList(parsed.evidence),
    counterEvidence: [
      ...stringList(parsed.counterEvidence),
      ...(assessment?.withholdIdentity ? assessment.limitations : [])
    ].filter((item, index, items) => item && items.indexOf(item) === index),
    missingEvidence: stringList(parsed.missingEvidence),
    requiredNextPhotos: [
      ...stringList(parsed.requiredNextPhotos),
      ...(assessment?.withholdIdentity
        ? [
            "Retake the whole plant and diagnostic leaf, stem, flower, or fruit views in even daylight or diffuse light without direct-flash glare or deep shadow."
          ]
        : [])
    ].filter((item, index, items) => item && items.indexOf(item) === index),
    requiredNextQuestions: stringList(parsed.requiredNextQuestions),
    sourceVerificationPerformed: false
  };
  if (assessment?.quality === "limited" || assessment?.quality === "unusable") {
    return safePlantIdentificationOutputs({
      imageAnalysis: {
        performed: assessment.performed,
        quality: assessment.quality
      },
      identifyingVisualTraits: String(parsed.identifyingVisualTraits || "").trim(),
      identificationDraft: draft
    }).identificationDraft;
  }
  return draft;
}

function normalizePriority(
  value: unknown,
  fallback: "low" | "medium" | "high" = "medium"
) {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

function unresolvedCropName(value: unknown) {
  return /^(not confirmed|not identified|unidentified|unknown(?: crop)?|unsure|uncertain|n\/a|none)$/i.test(
    String(value || "").trim()
  );
}

function plantIdImmediateResult(rawOutputs: Record<string, any>): {
  tone: "success" | "warning" | "error";
  title: string;
  description: string;
  details?: string[];
} | null {
  const outputs = safePlantIdentificationOutputs(rawOutputs);
  const imageAnalysis = outputs.imageAnalysis || {};
  if (imageAnalysis.requested !== true) return null;
  const performed = imageAnalysis.performed === true;
  const quality = String(imageAnalysis.quality || "").toLowerCase();
  const confidence = String(outputs.confidence || imageAnalysis.confidence || "low");
  const draft = outputs.identificationDraft || {};
  const directCandidate = String(outputs.likelyCrop || "").trim();
  const structuredCandidate = bestStructuredPlantCandidateName(outputs);
  const candidate =
    (quality === "usable" && directCandidate && !unresolvedCropName(directCandidate)
      ? directCandidate
      : structuredCandidate) || "";
  const limitations = [
    ...stringList(outputs.limitations),
    ...stringList(imageAnalysis.limitations)
  ].filter((item, index, items) => items.indexOf(item) === index);
  const nextPhotos = [
    ...stringList(outputs.requiredNextPhotos),
    ...stringList(draft.requiredNextPhotos)
  ].filter((item, index, items) => items.indexOf(item) === index);
  const reassessmentNote =
    imageAnalysis.reassessedUnderUpdatedPolicy === true ||
    limitations.some((item) =>
      /reassessed under an updated nighttime-lighting policy/i.test(item)
    )
      ? "This same evidence was reevaluated under the corrected lighting policy. Compare it with the prior result and explicitly confirm or reject the candidate."
      : "";

  if (imageAnalysis.requested === true && !performed) {
    return {
      tone: "error",
      title: "Images were not analyzed — try again",
      description:
        "GrowPath did not receive a completed image review. Your uploaded evidence is still attached; retry the identification.",
      details: [reassessmentNote, ...limitations].filter(Boolean).slice(0, 3)
    };
  }
  const retakeRequired =
    imageAnalysis.retakeRequired === true ||
    String(outputs.identityEvidenceStatus || "") === "retake_required" ||
    quality === "unusable" ||
    (quality === "limited" && !candidate);
  if (performed && retakeRequired) {
    return {
      tone: "warning",
      title: "Analysis finished — retake required",
      description:
        "The image pixels were inspected, but the diagnostic plant detail was hidden or unreliable. No plant name was accepted from this evidence.",
      details: (nextPhotos.length || reassessmentNote
        ? [reassessmentNote, ...nextPhotos].filter(Boolean)
        : [
            "Add a sharp whole-plant view and close views of leaves, stems, flowers, or fruit with the diagnostic structures clearly illuminated."
          ]
      ).slice(0, 3)
    };
  }
  if (performed && candidate) {
    return {
      tone: quality === "usable" ? "success" : "warning",
      title:
        quality === "usable"
          ? `Candidate found: ${candidate}`
          : `Candidate found: ${candidate} — more evidence needed`,
      description:
        quality === "usable"
          ? `Confidence: ${confidence}. Nighttime or phone-light evidence is accepted when the visible diagnostic structure remains usable. Review the detailed result below before confirming.`
          : `Confidence: ${confidence}. The visible diagnostic structure supports this cautious crop or genus candidate, but the lighting limits exact certainty. Add the requested views before confirming.`,
      details: [reassessmentNote, ...nextPhotos].filter(Boolean).slice(0, 3)
    };
  }
  return {
    tone: "warning",
    title: "Analysis finished — more evidence needed",
    description:
      "The images were reviewed, but they did not support a defensible plant candidate yet.",
    details: [reassessmentNote, ...(nextPhotos.length ? nextPhotos : limitations)]
      .filter(Boolean)
      .slice(0, 3)
  };
}

function plantIdMetrics(rawOutputs: Record<string, any>): ToolResultMetric[] {
  const outputs = safePlantIdentificationOutputs(rawOutputs);
  const imageAnalysis = outputs.imageAnalysis || {};
  const stillImagesAnalyzed = Number(
    imageAnalysis.stillImagesAnalyzed ??
      imageAnalysis.photosAnalyzed ??
      imageAnalysis.photoCount ??
      0
  );
  const videoFramesAnalyzed = Number(imageAnalysis.videoFramesAnalyzed || 0);
  const videosAttached = Number(imageAnalysis.videosAttached || 0);
  return [
    { key: "crop", label: "Working identity", value: outputs.likelyCrop },
    { key: "family", label: "Likely family", value: outputs.likelyFamily || "-" },
    {
      key: "scientific",
      label: "Scientific name",
      value: outputs.scientificName || "-"
    },
    { key: "confidence", label: "Confidence", value: outputs.confidence },
    {
      key: "vision",
      label: "Still images inspected",
      value: imageAnalysis.performed ? String(Math.max(0, stillImagesAnalyzed)) : "0"
    },
    ...(videoFramesAnalyzed > 0
      ? [
          {
            key: "video-frames",
            label: "Video frames inspected",
            value: String(videoFramesAnalyzed)
          }
        ]
      : []),
    ...(videosAttached > 0
      ? [
          {
            key: "source-video",
            label: "Source video",
            value:
              videoFramesAnalyzed > 0
                ? "Saved; extracted still frames analyzed"
                : "Saved; no extracted frame analyzed"
          }
        ]
      : []),
    {
      key: "verification",
      label: "External verification",
      value:
        outputs.sourceVerification?.status === "verified" ? "Recorded" : "Not performed"
    },
    {
      key: "confirm",
      label: "Needs confirmation",
      value: outputs.userConfirmationRequired ? "Yes" : "No"
    }
  ];
}

export function isCannabisGenusIdentification(outputs: Record<string, any>) {
  return isCannabisPlantIdentification(outputs);
}

function normalizeCropIdentityPrefillField({
  fieldKey,
  value,
  parsed,
  assessment
}: {
  fieldKey: string;
  value: unknown;
  parsed: Record<string, any>;
  assessment?: PlantIdVisionAssessment;
}) {
  if (
    [
      "cultivar",
      "cultivationStatus",
      "region",
      "observationDate",
      "season",
      "plantSize",
      "sensoryTraits"
    ].includes(fieldKey)
  ) {
    // These values require a label, device/user action, direct sensory observation,
    // date selection, or measurement. A model reply cannot establish them from pixels.
    return "";
  }
  if (fieldKey === "scientificName") {
    return assessment?.withholdIdentity ? "" : normalizeScientificName(value);
  }
  if (
    [
      "commonNames",
      "associatedPlants",
      "stemTraits",
      "flowerPartsVisible",
      "specialStructures"
    ].includes(fieldKey)
  ) {
    if (fieldKey === "commonNames" && assessment?.withholdIdentity) return "";
    return stringList(value).join(", ");
  }
  if (fieldKey !== "userEnteredName") return undefined;
  if (assessment?.withholdIdentity) return "";
  const suppliedName = String(value || "").trim();
  if (suppliedName && !unresolvedCropName(suppliedName)) return suppliedName;
  return String(parsed.commonNames || "")
    .split(/[,;\n]/)
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate && !unresolvedCropName(candidate));
}

async function recordCropIdentificationDecision({
  decision,
  toolRun,
  moduleRecord,
  workspaceScope
}: {
  decision: Extract<GrowpathModuleUserDecision, "accepted" | "rejected" | "uncertain">;
  toolRun: ToolRun | null;
  moduleRecord: GrowpathModuleRecord | null;
  workspaceScope: ToolRunWorkspaceScope;
}) {
  const recordedAt = new Date().toISOString();
  const toolRunId = String(toolRun?.id || toolRun?._id || "");
  const moduleRecordId = String(moduleRecord?.id || moduleRecord?._id || "");
  if (!toolRunId) {
    throw new Error(
      "This identification has no Saved Run. Run Plant ID again before recording a decision."
    );
  }
  const updatedToolRun = workspaceScope.workspaceType
    ? await updatePlantIdCorrection(toolRunId, { decision }, workspaceScope)
    : await updatePlantIdCorrection(toolRunId, { decision });
  if (!updatedToolRun) {
    throw new Error("Unable to save this identification decision.");
  }

  if (moduleRecordId) {
    try {
      await updateGrowpathModuleRecord(moduleRecordId, {
        title: moduleRecord?.title || "Species / Crop Identification",
        status: moduleRecord?.status || "active",
        userDecision: decision,
        outcome: {
          ...(moduleRecord?.outcome || {}),
          lastDecision: decision,
          decisionRecordedAt: recordedAt
        },
        warnings: moduleRecord?.warnings || [],
        recommendations: moduleRecord?.recommendations || [],
        limitations: moduleRecord?.limitations || [],
        tags: moduleRecord?.tags || [],
        linkedTaskIds: moduleRecord?.linkedTaskIds || [],
        tasksToCreate: moduleRecord?.tasksToCreate || []
      });
    } catch (_error: any) {
      // The scoped ToolRun is authoritative. A legacy Personal module record is
      // secondary and must never manufacture success or undo the saved decision.
    }
  }
}

function cropIdentityCalendarMetadata(sourceStage: string) {
  return {
    allDay: true,
    calendarType: "crop_identity_followup",
    sourceStage,
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -12 * 60 }]
    }
  };
}

function speciesCropTaskPlan(outputs: Record<string, any>) {
  const planned = Array.isArray(outputs.tasksToCreate) ? outputs.tasksToCreate : [];
  if (planned.length) {
    return planned.slice(0, 8).map((task: any, index: number) => ({
      title: String(task?.title || `Crop identity follow-up ${index + 1}`),
      priority: normalizePriority(task?.priority),
      dueDate: tomorrow(Number(task?.dueInDays || index + 1)),
      ...cropIdentityCalendarMetadata(
        String(task?.sourceStage || `crop_identity_followup_${index + 1}`)
      ),
      description:
        task?.description ||
        "Follow up on crop identity before applying crop-specific diagnosis, nutrition, IPM, or environment guidance."
    }));
  }

  const needsConfirm = Boolean(outputs.userConfirmationRequired);
  const crop = outputs.likelyCrop || outputs.scientificName || "crop";

  return [
    {
      title: needsConfirm ? "Confirm crop identity" : "Save crop identity to profile",
      priority: needsConfirm ? ("high" as const) : ("medium" as const),
      dueDate: tomorrow(1),
      ...cropIdentityCalendarMetadata("crop_identity_confirmation"),
      description:
        outputs.recommendationContext ||
        `Confirm ${crop} identity and save the crop profile before using crop-specific guidance.`
    },
    {
      title: "Review crop-specific tool targets",
      priority: "medium" as const,
      dueDate: tomorrow(2),
      ...cropIdentityCalendarMetadata("crop_tool_target_review"),
      description:
        "Check whether diagnosis prompts, pH/EC ranges, VPD targets, nutrient assumptions, and IPM context should change for this crop identity."
    },
    {
      title: "Update grow or plant tags",
      priority: "medium" as const,
      dueDate: tomorrow(3),
      ...cropIdentityCalendarMetadata("crop_profile_tag_update"),
      description:
        "Attach confirmed common names, scientific name, cultivar, grow interests, and privacy-safe notes to the grow or plant record."
    }
  ];
}

export default function SpeciesCropIdToolRoute({
  backFallbackHref = "/home/personal/tools"
}: {
  backFallbackHref?: string;
} = {}) {
  const { palette } = useAppTheme();
  const router = useRouter();
  const entitlements = useEntitlements();
  const styles = useMemo(() => createSpeciesCropIdStyles(palette), [palette]);
  const params = useLocalSearchParams<{
    fieldStudyId?: string | string[];
    facilityId?: string | string[];
    commercialAccountId?: string | string[];
    retryToolRunId?: string | string[];
    workspace?: string | string[];
    workspaceType?: string | string[];
  }>();
  const routeFacilityId = routeParam(params.facilityId);
  const commercialAccountId = routeParam(params.commercialAccountId);
  const retryToolRunId = routeParam(params.retryToolRunId);
  const requestedWorkspaceType = String(
    routeParam(params.workspaceType) || routeParam(params.workspace)
  )
    .trim()
    .toLowerCase();
  const workspaceType = resolveToolWorkspaceType({
    entitlementMode: entitlements.mode,
    requestedWorkspaceType,
    facilityId: routeFacilityId,
    commercialAccountId
  });
  const facilityId =
    workspaceType === "facility"
      ? entitlements.mode === "facility" && entitlements.facilityId
        ? String(entitlements.facilityId)
        : routeFacilityId
      : "";
  const workspaceIdentityKey = toolWorkspaceIdentity({
    workspaceType,
    facilityId,
    commercialAccountId
  });
  const toolRunScope = useMemo<ToolRunWorkspaceScope>(
    () =>
      workspaceType === "personal"
        ? {}
        : {
            workspaceType,
            ...(workspaceType === "facility" && facilityId ? { facilityId } : {})
          },
    [facilityId, workspaceType]
  );
  const evidenceWorkspaceScope = useMemo<EvidenceWorkspaceScope>(
    () => ({
      workspaceType,
      ...(workspaceType === "facility" && facilityId
        ? { workspaceId: facilityId, facilityId }
        : {})
    }),
    [facilityId, workspaceType]
  );
  const [evidenceAssets, setEvidenceAssets] = useState<EvidenceAsset[]>([]);
  const [fieldStudies, setFieldStudies] = useState<FieldStudy[]>([]);
  const [selectedFieldStudyId, setSelectedFieldStudyId] = useState(
    workspaceType === "personal" ? routeParam(params.fieldStudyId) : ""
  );
  const [observationLocation, setObservationLocation] =
    useState<PublicCoordinates | null>(null);
  const [locationPrivacy, setLocationPrivacy] =
    useState<ObservationLocationPrivacy>("private");
  const [publishObservation, setPublishObservation] = useState(false);
  const [sensitiveSpecies, setSensitiveSpecies] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [identificationBusy, setIdentificationBusy] = useState(false);
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const [newStudyTitle, setNewStudyTitle] = useState("");
  const [creatingStudy, setCreatingStudy] = useState(false);
  const [publishingStudy, setPublishingStudy] = useState(false);
  const [confirmPublicStudy, setConfirmPublicStudy] = useState(false);
  const [cannabisMapConsent, setCannabisMapConsent] = useState(false);
  const [naturePublicNotes, setNaturePublicNotes] = useState("");
  const [observationDate, setObservationDate] = useState("");
  const [showLocationAndSharing, setShowLocationAndSharing] = useState(
    workspaceType === "personal" && Boolean(params.fieldStudyId)
  );
  const [savedFieldObservationId, setSavedFieldObservationId] = useState("");
  const [savedFieldObservationStudyId, setSavedFieldObservationStudyId] = useState("");
  const [savedFieldObservationPublished, setSavedFieldObservationPublished] =
    useState(false);
  const [activeToolRun, setActiveToolRun] = useState<ToolRun | null>(null);
  const activeToolRunRef = useRef<ToolRun | null>(null);
  const renderedWorkspaceIdentityRef = useRef(workspaceIdentityKey);
  const currentWorkspaceIdentityRef = useRef(workspaceIdentityKey);
  currentWorkspaceIdentityRef.current = workspaceIdentityKey;
  const workspaceChangedDuringRender =
    renderedWorkspaceIdentityRef.current !== workspaceIdentityKey;
  const aiReviewByEvidenceRef = useRef(new Map<string, PlantIdVisionAssessment>());
  const hydratedEvidenceReviewKeysRef = useRef(new Set<string>());
  const evidenceReviewHydrationPromisesRef = useRef(new Map<string, Promise<void>>());
  const [fieldStudyNotice, setFieldStudyNotice] = useState("");
  const [fieldStudyError, setFieldStudyError] = useState("");
  const [retryEvidenceNotice, setRetryEvidenceNotice] = useState("");
  const [retryEvidenceError, setRetryEvidenceError] = useState("");
  const [retryEvidenceLoading, setRetryEvidenceLoading] = useState(false);
  const [retryRetainedEvidenceIds, setRetryRetainedEvidenceIds] = useState<string[]>([]);
  const [frameExtraction, setFrameExtraction] = useState<EvidenceFrameExtraction | null>(
    null
  );
  const [frameExtractionStateSourceId, setFrameExtractionStateSourceId] = useState("");
  const [frameExtractionVerificationPending, setFrameExtractionVerificationPending] =
    useState(false);
  const [verifiedFrameExtractionKey, setVerifiedFrameExtractionKey] = useState("");
  const [verifiedFrameExtraction, setVerifiedFrameExtraction] =
    useState<VerifiedPlantIdFrameExtraction | null>(null);
  const [frameExtractionRequestBusy, setFrameExtractionRequestBusy] = useState(false);
  const [frameExtractionAutoPoll, setFrameExtractionAutoPoll] = useState(false);
  const [frameExtractionNotice, setFrameExtractionNotice] = useState("");
  const [frameExtractionError, setFrameExtractionError] = useState("");
  const hydratedRetryToolRunRef = useRef("");
  const hydratedFrameExtractionSourceRef = useRef("");
  const syncVideoFrameExtractionRef = useRef<
    ((options: { begin: boolean }) => Promise<void>) | null
  >(null);
  const frameExtractionRequestTokenRef = useRef(0);
  const frameExtractionRequestControllerRef = useRef<AbortController | null>(null);
  const frameExtractionPollAttemptRef = useRef(0);
  const currentEvidenceAssets = useMemo(
    () => (workspaceChangedDuringRender ? [] : evidenceAssets),
    [evidenceAssets, workspaceChangedDuringRender]
  );
  const sourceVideoEvidence = useMemo(
    () => currentEvidenceAssets.find((asset) => asset.assetType === "video") || null,
    [currentEvidenceAssets]
  );
  const sourceVideoEvidenceId = String(
    sourceVideoEvidence?.id || sourceVideoEvidence?._id || ""
  ).trim();
  const sourceVideoExtractionUnavailableReason = sourceVideoEvidence
    ? sourceVideoEvidence.uploadStatus === "failed"
      ? "The source video upload failed. Retry that video upload below, or remove it and add it again, before extracting server frames."
      : sourceVideoEvidence.uploadStatus !== "uploaded"
        ? "Wait for the source video upload to finish before extracting server frames."
        : !String(sourceVideoEvidence.durableUrl || "").trim()
          ? "The source video is missing its durable saved file. Remove it and add the video again before extracting server frames."
          : sourceVideoEvidence.purpose !== "crop_identification"
            ? "This video is not linked to Plant ID. Remove it and add it again from this screen."
            : ""
    : "";
  const currentSourceVideoEvidenceIdRef = useRef(sourceVideoEvidenceId);
  currentSourceVideoEvidenceIdRef.current = sourceVideoEvidenceId;
  const currentEvidenceAssetsRef = useRef(currentEvidenceAssets);
  currentEvidenceAssetsRef.current = currentEvidenceAssets;
  const selectedVideoFrames = useMemo(
    () =>
      sourceVideoEvidenceId
        ? currentEvidenceAssets.filter(
            (asset) =>
              asset.assetType === "photo" &&
              asset.source === "generated" &&
              String(asset.sourceVideoEvidenceAssetId || "").trim() ===
                sourceVideoEvidenceId
          )
        : [],
    [currentEvidenceAssets, sourceVideoEvidenceId]
  );
  const uploadedVideoFrames = selectedVideoFrames.filter(
    (asset) =>
      asset.uploadStatus === "uploaded" &&
      Boolean(String(asset.durableUrl || "").trim()) &&
      asset.aiUsable === true
  );
  const persistedFrameExtraction = sourceVideoEvidence?.frameExtraction;
  const localFrameExtraction =
    frameExtractionStateSourceId === sourceVideoEvidenceId ? frameExtraction : null;
  const effectiveFrameExtractionStatus =
    localFrameExtraction?.status ?? persistedFrameExtraction?.status ?? "idle";
  const rawEffectiveFrameExtractionAttemptCount = Number(
    localFrameExtraction?.attemptCount ?? persistedFrameExtraction?.attemptCount ?? 0
  );
  const effectiveFrameExtractionAttemptCount = Number.isFinite(
    rawEffectiveFrameExtractionAttemptCount
  )
    ? Math.max(0, Math.trunc(rawEffectiveFrameExtractionAttemptCount))
    : 0;
  const effectiveFrameExtractionVersion = String(
    localFrameExtraction?.version ?? persistedFrameExtraction?.version ?? ""
  ).trim();
  const effectiveFrameAssetIds =
    localFrameExtraction?.frames?.length && localFrameExtraction.status === "completed"
      ? localFrameExtraction.frames.map((asset) => String(asset.id || asset._id || ""))
      : Array.isArray(persistedFrameExtraction?.frameAssetIds)
        ? persistedFrameExtraction.frameAssetIds.map(String)
        : [];
  const completedExtractionValidationKey =
    sourceVideoEvidenceId && effectiveFrameExtractionStatus === "completed"
      ? [
          sourceVideoEvidenceId,
          effectiveFrameExtractionVersion,
          effectiveFrameAssetIds.join(",")
        ].join(":")
      : "";
  const verificationPendingForCurrentSource =
    frameExtractionStateSourceId === sourceVideoEvidenceId &&
    frameExtractionVerificationPending;
  const completedFramesMissing =
    Boolean(sourceVideoEvidenceId) &&
    effectiveFrameExtractionStatus === "completed" &&
    uploadedVideoFrames.length === 0;
  const verifiedFrameMetadataMatchesCurrent = Boolean(
    verifiedFrameExtraction &&
    verifiedFrameExtraction.sourceId === sourceVideoEvidenceId &&
    verifiedFrameExtraction.version === effectiveFrameExtractionVersion &&
    verifiedFrameExtraction.attemptCount === effectiveFrameExtractionAttemptCount &&
    verifiedFrameExtraction.frameIds.length === effectiveFrameAssetIds.length &&
    verifiedFrameExtraction.frameIds.every((id, index) => {
      if (id !== effectiveFrameAssetIds[index]) return false;
      const frame = uploadedVideoFrames.find(
        (candidate) => String(candidate.id || candidate._id || "").trim() === id
      );
      if (!frame) return false;
      if (
        String(frame.frameExtractionVersion || "").trim() !==
        verifiedFrameExtraction.version
      ) {
        return false;
      }
      if (
        !Number.isInteger(frame.frameExtractionAttempt) ||
        frame.frameExtractionAttempt !== verifiedFrameExtraction.attemptCount
      ) {
        return false;
      }
      return Number.isInteger(frame.frameIndex) && frame.frameIndex === index;
    })
  );
  const completedFramesUnverified =
    Boolean(completedExtractionValidationKey) &&
    (verifiedFrameExtractionKey !== completedExtractionValidationKey ||
      !verifiedFrameMetadataMatchesCurrent);
  const frameExtractionBusy =
    (frameExtractionRequestBusy &&
      frameExtractionStateSourceId === sourceVideoEvidenceId) ||
    effectiveFrameExtractionStatus === "processing" ||
    verificationPendingForCurrentSource ||
    completedFramesMissing ||
    completedFramesUnverified;
  const frameExtractionActionNonRetryable =
    (effectiveFrameExtractionStatus === "failed" ||
      effectiveFrameExtractionStatus === "partial") &&
    localFrameExtraction?.retryable === false;
  const frameExtractionActionUnavailable = Boolean(
    sourceVideoExtractionUnavailableReason
  );
  const evidenceMutationLocked =
    identificationBusy ||
    (frameExtractionRequestBusy &&
      frameExtractionStateSourceId === sourceVideoEvidenceId) ||
    effectiveFrameExtractionStatus === "processing";
  const evidenceMutationLockedRef = useRef(evidenceMutationLocked);
  evidenceMutationLockedRef.current = evidenceMutationLocked;
  const handleEvidencePickerChange = useCallback((nextAssets: EvidenceAsset[]) => {
    if (evidenceMutationLockedRef.current) return;
    setEvidenceAssets(nextAssets);
  }, []);

  useEffect(() => {
    if (renderedWorkspaceIdentityRef.current === workspaceIdentityKey) return;
    renderedWorkspaceIdentityRef.current = workspaceIdentityKey;
    activeToolRunRef.current = null;
    aiReviewByEvidenceRef.current.clear();
    hydratedEvidenceReviewKeysRef.current.clear();
    evidenceReviewHydrationPromisesRef.current.clear();
    setEvidenceAssets([]);
    setActiveToolRun(null);
    setObservationLocation(null);
    setLocationPrivacy("private");
    setPublishObservation(false);
    setSensitiveSpecies(false);
    setLocationBusy(false);
    setShowManualLocation(false);
    setIdentificationBusy(false);
    setEvidenceBusy(false);
    setFieldStudies([]);
    setSelectedFieldStudyId(
      workspaceType === "personal" ? routeParam(params.fieldStudyId) : ""
    );
    setShowLocationAndSharing(
      workspaceType === "personal" && Boolean(routeParam(params.fieldStudyId))
    );
    setNewStudyTitle("");
    setCreatingStudy(false);
    setPublishingStudy(false);
    setConfirmPublicStudy(false);
    setCannabisMapConsent(false);
    setNaturePublicNotes("");
    setSavedFieldObservationId("");
    setSavedFieldObservationStudyId("");
    setSavedFieldObservationPublished(false);
    setFieldStudyNotice("");
    setFieldStudyError("");
    setRetryEvidenceNotice("");
    setRetryEvidenceError("");
    setRetryEvidenceLoading(false);
    setRetryRetainedEvidenceIds([]);
    hydratedFrameExtractionSourceRef.current = "";
    frameExtractionRequestTokenRef.current += 1;
    frameExtractionRequestControllerRef.current?.abort();
    frameExtractionRequestControllerRef.current = null;
    frameExtractionPollAttemptRef.current = 0;
    setFrameExtraction(null);
    setFrameExtractionStateSourceId("");
    setFrameExtractionVerificationPending(false);
    setVerifiedFrameExtractionKey("");
    setVerifiedFrameExtraction(null);
    setFrameExtractionRequestBusy(false);
    setFrameExtractionAutoPoll(false);
    setFrameExtractionNotice("");
    setFrameExtractionError("");
  }, [params.fieldStudyId, workspaceIdentityKey, workspaceType]);

  useEffect(
    () => () => {
      frameExtractionRequestTokenRef.current += 1;
      frameExtractionRequestControllerRef.current?.abort();
      frameExtractionRequestControllerRef.current = null;
    },
    []
  );

  useEffect(() => {
    const hydrationKey = `${workspaceIdentityKey}:${retryToolRunId}`;
    if (!retryToolRunId) {
      setRetryEvidenceNotice("");
      setRetryEvidenceError("");
      setRetryEvidenceLoading(false);
      setRetryRetainedEvidenceIds([]);
      return;
    }
    if (hydratedRetryToolRunRef.current === hydrationKey) return;
    hydratedRetryToolRunRef.current = hydrationKey;
    const requestWorkspaceIdentity = workspaceIdentityKey;
    let active = true;
    setEvidenceAssets([]);
    setActiveToolRun(null);
    activeToolRunRef.current = null;
    setRetryEvidenceNotice("");
    setRetryEvidenceError("");
    setRetryEvidenceLoading(true);
    setRetryRetainedEvidenceIds([]);
    void (async () => {
      try {
        const savedRun = await getToolRun(retryToolRunId, {
          workspaceType,
          ...(workspaceType === "facility" && facilityId ? { facilityId } : {})
        });
        if (!active || currentWorkspaceIdentityRef.current !== requestWorkspaceIdentity) {
          return;
        }
        if (
          !savedRun ||
          !/species[_-]crop[_-]id/i.test(
            String(savedRun.toolType || savedRun.toolName || "")
          )
        ) {
          throw new Error("The requested Saved Run is not a Plant ID result.");
        }
        const evidenceIds = savedPlantIdEvidenceIds(savedRun);
        if (!evidenceIds.length) {
          throw new Error(
            "This Saved Plant ID does not contain reusable photo evidence."
          );
        }
        const ownedAssets = await getEvidenceAssetsByIds(evidenceIds, {
          ...evidenceWorkspaceScope
        });
        if (!active || currentWorkspaceIdentityRef.current !== requestWorkspaceIdentity) {
          return;
        }
        const byId = new Map(
          ownedAssets.map((asset: EvidenceAsset) => [
            String(asset.id || asset._id || ""),
            asset
          ])
        );
        const recovered = evidenceIds
          .map((id) => byId.get(id))
          .filter((asset): asset is EvidenceAsset => Boolean(asset));
        if (recovered.length !== evidenceIds.length) {
          throw new Error(
            "Some saved evidence is no longer available. Nothing was loaded for retry."
          );
        }
        const recoveryEligibilityError = savedPlantIdRecoveryEligibilityError(
          savedRun,
          recovered
        );
        if (recoveryEligibilityError) {
          throw new Error(recoveryEligibilityError);
        }
        setEvidenceAssets(recovered);
        setRetryRetainedEvidenceIds(
          Array.from(
            new Set(
              recovered
                .flatMap((asset: EvidenceAsset) => [asset.id, asset._id])
                .filter(Boolean)
            )
          ).map(String)
        );
        const photoCount = recovered.filter(
          (asset) => asset.assetType === "photo"
        ).length;
        const videoCount = recovered.filter(
          (asset) => asset.assetType === "video"
        ).length;
        setRetryEvidenceNotice(
          photoCount
            ? `Recovered ${photoCount} saved photo${photoCount === 1 ? "" : "s"}${
                videoCount
                  ? ` and ${videoCount} private source video${videoCount === 1 ? "" : "s"}`
                  : ""
              }. Review the still images, then press Identify Plant from Photos to start a new analysis.`
            : `Recovered 1 private source video. Extract timestamped still frames on the server before starting a new Plant ID analysis; the video itself remains private and is not analyzed for motion.`
        );
      } catch (error: any) {
        if (!active || currentWorkspaceIdentityRef.current !== requestWorkspaceIdentity) {
          return;
        }
        setEvidenceAssets([]);
        setRetryRetainedEvidenceIds([]);
        setRetryEvidenceError(
          error?.message || "The saved Plant ID evidence could not be recovered."
        );
      } finally {
        if (active && currentWorkspaceIdentityRef.current === requestWorkspaceIdentity) {
          setRetryEvidenceLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [
    evidenceWorkspaceScope,
    facilityId,
    retryToolRunId,
    workspaceIdentityKey,
    workspaceType
  ]);

  function extractionRequestIsCurrent(
    requestToken: number,
    requestSourceId: string,
    requestWorkspaceIdentity: string
  ) {
    return (
      frameExtractionRequestTokenRef.current === requestToken &&
      currentSourceVideoEvidenceIdRef.current === requestSourceId &&
      currentWorkspaceIdentityRef.current === requestWorkspaceIdentity
    );
  }

  async function refreshServerExtractedFrames(
    result: EvidenceFrameExtractionResult,
    guard: {
      requestToken: number;
      sourceId: string;
      workspaceIdentity: string;
      workspaceScope: EvidenceWorkspaceScope;
      signal: AbortSignal;
      sourceLineage: { purpose: string; growId: string; plantId: string };
    }
  ) {
    if (
      !extractionRequestIsCurrent(
        guard.requestToken,
        guard.sourceId,
        guard.workspaceIdentity
      )
    ) {
      return null;
    }
    const responseSourceId = String(
      result.sourceVideo?.id || result.sourceVideo?._id || ""
    ).trim();
    const returnedFrameIds = result.extraction.frames.map((asset) =>
      String(asset.id || asset._id || "").trim()
    );
    const extractionVersion = String(result.extraction.version || "").trim();
    if (
      result.extraction.status !== "completed" ||
      responseSourceId !== guard.sourceId ||
      !extractionVersion ||
      !returnedFrameIds.length ||
      returnedFrameIds.some((id) => !id) ||
      new Set(returnedFrameIds).size !== returnedFrameIds.length
    ) {
      throw new Error(
        "GrowPath did not return one complete, versioned still-frame set. Retry the saved video or add sharp photos instead."
      );
    }
    const exactIds = [guard.sourceId, ...returnedFrameIds];
    const refreshed: EvidenceAsset[] = await getEvidenceAssetsByIds(
      exactIds,
      guard.workspaceScope,
      { signal: guard.signal }
    );
    if (
      !extractionRequestIsCurrent(
        guard.requestToken,
        guard.sourceId,
        guard.workspaceIdentity
      )
    ) {
      return null;
    }
    const refreshedById = new Map<string, EvidenceAsset>(
      refreshed.map((asset) => [String(asset.id || asset._id || "").trim(), asset])
    );
    const exactRefreshed = exactIds
      .map((id) => refreshedById.get(id))
      .filter((asset): asset is EvidenceAsset => Boolean(asset));
    if (exactRefreshed.length !== exactIds.length) {
      throw new Error(
        "Frame extraction finished, but the complete saved frame set could not be reloaded. Restore the frames again before identifying the plant."
      );
    }
    const refreshedSource = exactRefreshed[0];
    const refreshedFrames = exactRefreshed.slice(1);
    const sourceExtraction = refreshedSource.frameExtraction;
    const sourceFrameIds = Array.isArray(sourceExtraction?.frameAssetIds)
      ? sourceExtraction.frameAssetIds.map(String)
      : [];
    const sameOrderedIds =
      sourceFrameIds.length === returnedFrameIds.length &&
      sourceFrameIds.every((id, index) => id === returnedFrameIds[index]);
    const lineageValue = (value: unknown) => String(value || "").trim();
    const sourceLineageMatches =
      refreshedSource.assetType === "video" &&
      lineageValue(refreshedSource.purpose) === guard.sourceLineage.purpose &&
      lineageValue(refreshedSource.growId) === guard.sourceLineage.growId &&
      lineageValue(refreshedSource.plantId) === guard.sourceLineage.plantId;
    const extractionAttempt = result.extraction.attemptCount;
    const sourceExtractionAttempt = sourceExtraction?.attemptCount;
    const extractionAttemptMatches =
      Number.isInteger(extractionAttempt) &&
      Number.isInteger(sourceExtractionAttempt) &&
      sourceExtractionAttempt === extractionAttempt;
    const framesMatchLineage = refreshedFrames.every(
      (frame, index) =>
        String(frame.id || frame._id || "").trim() === returnedFrameIds[index] &&
        frame.assetType === "photo" &&
        frame.source === "generated" &&
        String(frame.sourceVideoEvidenceAssetId || "").trim() === guard.sourceId &&
        lineageValue(frame.purpose) === guard.sourceLineage.purpose &&
        lineageValue(frame.growId) === guard.sourceLineage.growId &&
        lineageValue(frame.plantId) === guard.sourceLineage.plantId &&
        String(frame.frameExtractionVersion || "").trim() === extractionVersion &&
        Number.isInteger(frame.frameExtractionAttempt) &&
        frame.frameExtractionAttempt === extractionAttempt &&
        Number.isInteger(frame.frameIndex) &&
        frame.frameIndex === index
    );
    if (
      sourceExtraction?.status !== "completed" ||
      String(sourceExtraction.version || "").trim() !== extractionVersion ||
      !extractionAttemptMatches ||
      !sameOrderedIds ||
      !sourceLineageMatches ||
      !framesMatchLineage
    ) {
      throw new Error(
        "The saved source video and completed frame set did not pass version, order, or Plant ID lineage checks. Restore the frames again before identifying the plant."
      );
    }
    const eligibilityError = savedPlantIdRecoveryEligibilityError(
      {
        inputs: {
          mediaEvidence: exactRefreshed.map((asset) => ({
            id: String(asset.id || asset._id || ""),
            type: asset.assetType
          }))
        }
      },
      exactRefreshed
    );
    if (eligibilityError) throw new Error(eligibilityError);

    const currentBeforeMerge = currentEvidenceAssetsRef.current;
    const capacityError = plantIdFrameMergeCapacityError(
      currentBeforeMerge,
      returnedFrameIds,
      refreshedFrames.length,
      guard.sourceId
    );
    if (capacityError) throw new Error(capacityError);
    if (
      !extractionRequestIsCurrent(
        guard.requestToken,
        guard.sourceId,
        guard.workspaceIdentity
      )
    ) {
      return null;
    }
    const nextAssets = [
      ...currentBeforeMerge.filter((asset) => {
        const id = String(asset.id || asset._id || "").trim();
        return (
          id !== guard.sourceId &&
          String(asset.sourceVideoEvidenceAssetId || "").trim() !== guard.sourceId
        );
      }),
      refreshedSource,
      ...refreshedFrames
    ];
    if (nextAssets.filter((asset) => asset.assetType === "photo").length > 12) {
      throw new Error(
        "The completed frame set would exceed the 12-photo limit. Remove photos, then restore the saved frame set again."
      );
    }
    setEvidenceAssets(nextAssets);
    setRetryRetainedEvidenceIds((current) =>
      Array.from(new Set([...current, ...exactIds]))
    );
    setFrameExtractionNotice(
      `${refreshedFrames.length} timestamped still frame${
        refreshedFrames.length === 1 ? " is" : "s are"
      } uploaded and selected for image review. The private source video itself will not be analyzed for motion.`
    );
    setRetryEvidenceNotice((current) =>
      current
        ? `${current} Server-extracted still frames are now ready.`
        : "Server-extracted still frames are ready for Plant ID."
    );
    return {
      sourceId: guard.sourceId,
      version: extractionVersion,
      attemptCount: Math.trunc(extractionAttempt),
      frameIds: returnedFrameIds
    } satisfies VerifiedPlantIdFrameExtraction;
  }

  async function syncVideoFrameExtraction({ begin }: { begin: boolean }) {
    if (
      !sourceVideoEvidence ||
      !sourceVideoEvidenceId ||
      frameExtractionRequestBusy ||
      evidenceBusy ||
      identificationBusy
    ) {
      return;
    }
    if (sourceVideoExtractionUnavailableReason) {
      setFrameExtractionError(sourceVideoExtractionUnavailableReason);
      return;
    }
    const requestSourceId = sourceVideoEvidenceId;
    const requestWorkspaceIdentity = workspaceIdentityKey;
    const requestWorkspaceScope = { ...evidenceWorkspaceScope };
    const sourceLineage = {
      purpose: String(sourceVideoEvidence.purpose || "").trim(),
      growId: String(sourceVideoEvidence.growId || "").trim(),
      plantId: String(sourceVideoEvidence.plantId || "").trim()
    };
    if (sourceLineage.purpose !== "crop_identification") {
      setFrameExtractionError(
        "This saved video is not linked to the Plant ID workflow. Remove it and add the video again."
      );
      return;
    }
    const selectedUploadedPhotos = currentEvidenceAssets.filter(
      (asset) =>
        asset.assetType === "photo" &&
        asset.uploadStatus === "uploaded" &&
        Boolean(String(asset.durableUrl || "").trim()) &&
        asset.aiUsable === true &&
        !(
          asset.source === "generated" &&
          String(asset.sourceVideoEvidenceAssetId || "").trim() === requestSourceId
        )
    );
    const availableFrameSlots = Math.max(0, 12 - selectedUploadedPhotos.length);
    if (begin && !availableFrameSlots) {
      setFrameExtractionError(
        "All 12 photo slots are already in use. Remove a photo before extracting video frames."
      );
      return;
    }
    frameExtractionRequestControllerRef.current?.abort();
    const requestController = new AbortController();
    frameExtractionRequestControllerRef.current = requestController;
    const requestToken = frameExtractionRequestTokenRef.current + 1;
    frameExtractionRequestTokenRef.current = requestToken;
    setFrameExtractionStateSourceId(requestSourceId);
    setFrameExtractionRequestBusy(true);
    setFrameExtractionError("");
    if (begin) {
      frameExtractionPollAttemptRef.current = 0;
      setFrameExtractionVerificationPending(false);
      setVerifiedFrameExtractionKey("");
      setVerifiedFrameExtraction(null);
    }
    setFrameExtractionNotice(
      begin
        ? "GrowPath is extracting timestamped still frames from the saved private video. The server job is durable, so you can leave this page and return to check it."
        : "Checking the saved video-frame extraction status..."
    );
    let validatingCompletedFrames = false;
    try {
      const result = begin
        ? await extractEvidenceVideoFrames(
            requestSourceId,
            {
              ...requestWorkspaceScope,
              maxFrames: availableFrameSlots,
              purpose: "crop_identification",
              ...(sourceLineage.growId ? { growId: sourceLineage.growId } : {}),
              ...(sourceLineage.plantId ? { plantId: sourceLineage.plantId } : {})
            },
            { signal: requestController.signal }
          )
        : await getEvidenceVideoFrameExtraction(requestSourceId, requestWorkspaceScope, {
            signal: requestController.signal
          });
      if (
        !extractionRequestIsCurrent(
          requestToken,
          requestSourceId,
          requestWorkspaceIdentity
        )
      ) {
        return;
      }
      setFrameExtractionStateSourceId(requestSourceId);
      if (result.extraction.status === "processing") {
        setFrameExtraction(result.extraction);
        setFrameExtractionVerificationPending(false);
        if (!begin) frameExtractionPollAttemptRef.current += 1;
        setFrameExtractionAutoPoll(true);
        setFrameExtractionNotice(
          `Video frame extraction is processing on GrowPath${
            result.extraction.attemptCount
              ? ` (attempt ${result.extraction.attemptCount})`
              : ""
          }. Plant identification stays disabled until uploaded still frames are ready. You can leave this page and return later.`
        );
        return;
      }
      setFrameExtractionAutoPoll(false);
      if (result.extraction.status === "completed") {
        validatingCompletedFrames = true;
        setFrameExtractionVerificationPending(true);
        setFrameExtractionNotice(
          "Frame extraction completed. GrowPath is verifying the exact saved frame version, order, and Plant ID links before enabling analysis."
        );
        const verifiedExtraction = await refreshServerExtractedFrames(result, {
          requestToken,
          sourceId: requestSourceId,
          workspaceIdentity: requestWorkspaceIdentity,
          workspaceScope: requestWorkspaceScope,
          signal: requestController.signal,
          sourceLineage
        });
        if (
          !verifiedExtraction ||
          !extractionRequestIsCurrent(
            requestToken,
            requestSourceId,
            requestWorkspaceIdentity
          )
        ) {
          return;
        }
        setVerifiedFrameExtraction(verifiedExtraction);
        setVerifiedFrameExtractionKey(
          [
            verifiedExtraction.sourceId,
            verifiedExtraction.version,
            verifiedExtraction.frameIds.join(",")
          ].join(":")
        );
        setFrameExtraction(result.extraction);
        setFrameExtractionVerificationPending(false);
        frameExtractionPollAttemptRef.current = 0;
        return;
      }
      setFrameExtraction(result.extraction);
      setFrameExtractionVerificationPending(false);
      setVerifiedFrameExtractionKey("");
      setVerifiedFrameExtraction(null);
      if (
        result.extraction.status === "failed" ||
        result.extraction.status === "partial"
      ) {
        setFrameExtractionNotice("");
        setFrameExtractionError(
          result.extraction.error ||
            "GrowPath could not finish every still frame. Retry the saved video or add sharp photos instead."
        );
        return;
      }
      setFrameExtractionNotice(
        "The private source video is saved. Extract timestamped still frames before starting Plant ID."
      );
    } catch (error: any) {
      const aborted =
        requestController.signal.aborted ||
        error?.name === "AbortError" ||
        String(error?.code || "").toUpperCase() === "ABORT_ERR";
      if (
        aborted ||
        !extractionRequestIsCurrent(
          requestToken,
          requestSourceId,
          requestWorkspaceIdentity
        )
      ) {
        return;
      }
      setFrameExtractionAutoPoll(false);
      if (validatingCompletedFrames) {
        setFrameExtractionVerificationPending(true);
        setFrameExtractionNotice("");
      }
      setFrameExtractionError(
        error?.message ||
          "GrowPath could not check the saved video-frame extraction. Try again without reuploading the video."
      );
    } finally {
      if (
        extractionRequestIsCurrent(
          requestToken,
          requestSourceId,
          requestWorkspaceIdentity
        )
      ) {
        setFrameExtractionRequestBusy(false);
        if (frameExtractionRequestControllerRef.current === requestController) {
          frameExtractionRequestControllerRef.current = null;
        }
      }
    }
  }
  syncVideoFrameExtractionRef.current = syncVideoFrameExtraction;

  useEffect(() => {
    const sourceKey = sourceVideoEvidenceId
      ? `${workspaceIdentityKey}:${sourceVideoEvidenceId}`
      : "";
    if (!sourceKey) {
      if (hydratedFrameExtractionSourceRef.current) {
        frameExtractionRequestTokenRef.current += 1;
        frameExtractionRequestControllerRef.current?.abort();
        frameExtractionRequestControllerRef.current = null;
      }
      hydratedFrameExtractionSourceRef.current = "";
      frameExtractionPollAttemptRef.current = 0;
      setFrameExtraction(null);
      setFrameExtractionStateSourceId("");
      setFrameExtractionVerificationPending(false);
      setVerifiedFrameExtractionKey("");
      setVerifiedFrameExtraction(null);
      setFrameExtractionRequestBusy(false);
      setFrameExtractionAutoPoll(false);
      setFrameExtractionNotice("");
      setFrameExtractionError("");
      return;
    }
    if (hydratedFrameExtractionSourceRef.current === sourceKey) return;
    frameExtractionRequestTokenRef.current += 1;
    frameExtractionRequestControllerRef.current?.abort();
    frameExtractionRequestControllerRef.current = null;
    frameExtractionPollAttemptRef.current = 0;
    hydratedFrameExtractionSourceRef.current = sourceKey;
    const persisted = sourceVideoEvidence?.frameExtraction;
    const rawAttemptCount = Number(persisted?.attemptCount ?? 0);
    const persistedExtraction: EvidenceFrameExtraction | null = persisted
      ? {
          status: persisted.status,
          attemptCount: Number.isFinite(rawAttemptCount)
            ? Math.max(0, Math.trunc(rawAttemptCount))
            : 0,
          version: persisted.version,
          startedAt: persisted.startedAt,
          completedAt: persisted.completedAt,
          error: persisted.error || persisted.errorMessage,
          retryable: persisted.status !== "completed",
          frames: []
        }
      : null;
    setFrameExtractionStateSourceId(sourceVideoEvidenceId);
    setFrameExtractionRequestBusy(false);
    setVerifiedFrameExtractionKey("");
    setVerifiedFrameExtraction(null);
    setFrameExtraction(persisted?.status === "completed" ? null : persistedExtraction);
    setFrameExtractionVerificationPending(persisted?.status === "completed");
    setFrameExtractionError(
      persisted?.status === "failed" || persisted?.status === "partial"
        ? String(
            persisted.error ||
              persisted.errorMessage ||
              "Video frame extraction needs to be retried."
          )
        : ""
    );
    if (persisted?.status === "processing") {
      setFrameExtractionAutoPoll(true);
      setFrameExtractionNotice(
        "Video frame extraction is still processing on GrowPath. Plant identification stays disabled until uploaded still frames are ready. You can leave this page and return later."
      );
    } else if (persisted?.status === "completed") {
      setFrameExtractionAutoPoll(false);
      setFrameExtractionNotice(
        uploadedVideoFrames.length
          ? "GrowPath previously completed frame extraction. Restore and verify the exact saved still-frame set before identifying the plant."
          : "GrowPath previously completed frame extraction. Restore the saved still frames before identifying the plant."
      );
    } else if (
      uploadedVideoFrames.length &&
      persisted?.status !== "failed" &&
      persisted?.status !== "partial"
    ) {
      setFrameExtractionNotice(
        `${uploadedVideoFrames.length} timestamped still frame${
          uploadedVideoFrames.length === 1 ? " is" : "s are"
        } selected for image review. The source video itself is not analyzed for motion.`
      );
    } else {
      setFrameExtractionAutoPoll(false);
      setFrameExtractionNotice("");
    }
  }, [
    sourceVideoEvidence,
    sourceVideoEvidenceId,
    uploadedVideoFrames.length,
    workspaceIdentityKey
  ]);

  useEffect(() => {
    if (
      !frameExtractionAutoPoll ||
      effectiveFrameExtractionStatus !== "processing" ||
      frameExtractionRequestBusy ||
      !sourceVideoEvidenceId
    ) {
      return;
    }
    if (frameExtractionPollAttemptRef.current >= FRAME_EXTRACTION_MAX_AUTOMATIC_POLLS) {
      setFrameExtractionAutoPoll(false);
      setFrameExtractionNotice(
        "Video frame extraction is still processing. Automatic checks paused; use Check Video Frame Progress later. The server job will continue without this page."
      );
      return;
    }
    const delayIndex = Math.min(
      frameExtractionPollAttemptRef.current,
      FRAME_EXTRACTION_POLL_DELAYS_MS.length - 1
    );
    const timer = setTimeout(() => {
      void syncVideoFrameExtractionRef.current?.({ begin: false });
    }, FRAME_EXTRACTION_POLL_DELAYS_MS[delayIndex]);
    return () => clearTimeout(timer);
  }, [
    effectiveFrameExtractionAttemptCount,
    effectiveFrameExtractionStatus,
    frameExtractionAutoPoll,
    frameExtractionRequestBusy,
    sourceVideoEvidenceId
  ]);

  const currentSourceVideoFramesVerified =
    effectiveFrameExtractionStatus === "completed" &&
    !verificationPendingForCurrentSource &&
    !completedFramesMissing &&
    !completedFramesUnverified &&
    verifiedFrameMetadataMatchesCurrent;
  const evidenceInputKey = useMemo(() => {
    const assetKey = currentEvidenceAssets
      .map((asset) =>
        [
          asset.id || asset._id || "",
          asset.uploadStatus,
          asset.durableUrl || "",
          asset.updatedAt || "",
          asset.aiUsable === false ? "not-ai-usable" : "ai-usable",
          (asset.qualityWarnings || []).join(",")
        ].join(":")
      )
      .join("|");
    return `${assetKey}|frame-extraction:${effectiveFrameExtractionStatus}:${effectiveFrameExtractionAttemptCount}:${
      verificationPendingForCurrentSource ? "verifying" : "not-verifying"
    }:${verifiedFrameExtractionKey || "unverified"}`;
  }, [
    currentEvidenceAssets,
    effectiveFrameExtractionAttemptCount,
    effectiveFrameExtractionStatus,
    verificationPendingForCurrentSource,
    verifiedFrameExtractionKey
  ]);
  const providerReadyEvidenceAssets = useMemo(
    () =>
      plantIdProviderReadyEvidenceAssets(
        currentEvidenceAssets,
        verifiedFrameExtraction,
        currentSourceVideoFramesVerified
      ),
    [currentEvidenceAssets, currentSourceVideoFramesVerified, verifiedFrameExtraction]
  );
  const uploadedEvidence = useMemo(
    () => providerEvidencePayload(providerReadyEvidenceAssets),
    [providerReadyEvidenceAssets]
  );
  const assistantEvidenceAssetIds = useMemo(() => {
    const requiredSourceVideoIds = new Set(
      uploadedEvidence.media
        .filter((asset) => asset.type === "photo" && asset.source === "generated")
        .map((asset) => String(asset.sourceVideoEvidenceAssetId || "").trim())
        .filter(Boolean)
    );
    return uploadedEvidence.media
      .filter(
        (asset) =>
          asset.type === "photo" ||
          (asset.type === "video" && requiredSourceVideoIds.has(String(asset.id)))
      )
      .map((asset) => String(asset.id))
      .filter(Boolean);
  }, [uploadedEvidence.media]);
  const activeEvidenceReviewKey = useMemo(
    () => evidenceReviewKey(uploadedEvidence.imageEvidenceAssetIds),
    [uploadedEvidence.imageEvidenceAssetIds]
  );

  async function hydratePriorPlantIdReview() {
    const key = activeEvidenceReviewKey;
    const requestWorkspaceIdentity = workspaceIdentityKey;
    if (
      !key ||
      aiReviewByEvidenceRef.current.has(key) ||
      hydratedEvidenceReviewKeysRef.current.has(key)
    ) {
      return;
    }
    const pending = evidenceReviewHydrationPromisesRef.current.get(key);
    if (pending) return pending;
    const hydration = (async () => {
      const runs = await listToolRuns({
        toolType: "species-crop-id",
        ...toolRunScope
      });
      if (currentWorkspaceIdentityRef.current !== requestWorkspaceIdentity) return;
      const previousRun = runs.find((run) => {
        const inputs = run.inputs || run.input || run.params || {};
        const storedFingerprint = String(
          inputs.imageAnalysis?.evidenceFingerprint || ""
        ).trim();
        if (storedFingerprint) return storedFingerprint === key;
        const priorIds =
          inputs.imageAnalysis?.evidenceUsed?.length > 0
            ? inputs.imageAnalysis.evidenceUsed
            : inputs.evidenceAssetIds;
        return evidenceReviewKey(priorIds) === key;
      });
      const priorAssessment = previousRun ? savedPlantIdAssessment(previousRun) : null;
      if (priorAssessment && !aiReviewByEvidenceRef.current.has(key)) {
        aiReviewByEvidenceRef.current.set(key, priorAssessment);
      }
      hydratedEvidenceReviewKeysRef.current.add(key);
    })().finally(() => {
      evidenceReviewHydrationPromisesRef.current.delete(key);
    });
    evidenceReviewHydrationPromisesRef.current.set(key, hydration);
    return hydration;
  }

  const selectedFieldStudy = useMemo(
    () =>
      fieldStudies.find(
        (study) => String(study.id || study._id || "") === selectedFieldStudyId
      ) || null,
    [fieldStudies, selectedFieldStudyId]
  );
  const wantsNatureMap = publishObservation && locationPrivacy === "public_approximate";
  const automaticNatureCollection = directNatureCollection(fieldStudies);
  const natureMapChecks = [
    {
      ready: Boolean(selectedFieldStudy) || wantsNatureMap,
      label: selectedFieldStudy
        ? "Field Study selected"
        : "Personal Nature collection will be prepared automatically"
    },
    {
      ready: selectedFieldStudy
        ? selectedFieldStudy.visibility === "public"
        : wantsNatureMap,
      label: selectedFieldStudy
        ? "Field Study is public"
        : "Deliberate approximate-pin sharing selected"
    },
    { ready: Boolean(observationLocation), label: "Plant location added" },
    {
      ready: Boolean(observationDate),
      label: "Observation date added"
    },
    {
      ready: uploadedEvidence.images.length > 0,
      label: "Uploaded photo evidence added"
    }
  ];
  const natureMapReady = natureMapChecks.every((check) => check.ready);
  const handleValuesChange = useCallback((values: Record<string, string>) => {
    setObservationDate(String(values.observationDate || "").trim());
  }, []);

  useEffect(() => {
    setSavedFieldObservationId("");
    setSavedFieldObservationStudyId("");
    setSavedFieldObservationPublished(false);
    setFieldStudyNotice("");
  }, [selectedFieldStudyId]);

  useEffect(() => {
    setSavedFieldObservationId("");
    setSavedFieldObservationStudyId("");
    setSavedFieldObservationPublished(false);
    setFieldStudyNotice("");
  }, [evidenceInputKey]);

  useEffect(() => {
    if (workspaceType !== "personal") {
      setFieldStudies([]);
      setSelectedFieldStudyId("");
      setShowLocationAndSharing(false);
      return;
    }
    if (!showLocationAndSharing && !params.fieldStudyId) return;
    let active = true;
    listFieldStudies()
      .then((studies) => {
        if (!active) return;
        const editable = studies.filter(
          (study) => study.accessRole === "owner" || study.accessRole === "editor"
        );
        setFieldStudies(editable);
        const requested = routeParam(params.fieldStudyId);
        if (
          requested &&
          editable.some((study) => String(study.id || study._id) === requested)
        ) {
          setSelectedFieldStudyId(requested);
        }
      })
      .catch(() => {
        if (active) {
          setFieldStudyError(
            "Field Studies could not be loaded. Plant ID still works normally."
          );
        }
      });
    return () => {
      active = false;
    };
  }, [params.fieldStudyId, showLocationAndSharing, workspaceType]);

  async function syncSavedRunLocation(
    nextLocation: PublicCoordinates | null,
    requestWorkspaceIdentity = workspaceIdentityKey
  ) {
    if (currentWorkspaceIdentityRef.current !== requestWorkspaceIdentity) return;
    const sourceToolRun = activeToolRunRef.current;
    const toolRunId = String(sourceToolRun?.id || sourceToolRun?._id || "");
    if (!toolRunId) {
      setObservationLocation(nextLocation);
      return;
    }
    const existingInput =
      sourceToolRun?.inputs || sourceToolRun?.input || sourceToolRun?.params || {};
    const capturedLocation = nextLocation
      ? {
          ...nextLocation,
          privacy: "private",
          userAuthorized: true
        }
      : null;
    const nextInput = { ...existingInput, capturedLocation };
    const locationPatch = {
      inputs: nextInput,
      input: nextInput,
      params: nextInput
    };
    const updated = toolRunScope.workspaceType
      ? await updateToolRun(toolRunId, locationPatch, toolRunScope)
      : await updateToolRun(toolRunId, locationPatch);
    if (currentWorkspaceIdentityRef.current !== requestWorkspaceIdentity) return;
    if (!updated) {
      throw new Error(
        nextLocation
          ? "The location could not be added to the Saved Run. It was not retained."
          : "The location could not be removed from the Saved Run. Nothing changed."
      );
    }
    const currentToolRunId = String(
      activeToolRunRef.current?.id || activeToolRunRef.current?._id || ""
    );
    // The coordinate change is the user's latest explicit intent for the current
    // form, even if evidence edits invalidated the saved result while it was pending.
    setObservationLocation(nextLocation);
    if (currentToolRunId !== toolRunId) {
      return;
    }
    activeToolRunRef.current = updated;
    setActiveToolRun(updated);
  }

  function handleToolRunChange(toolRun: ToolRun | null) {
    activeToolRunRef.current = toolRun;
    setActiveToolRun(toolRun);
  }

  async function captureCurrentLocation() {
    if (identificationBusy) return;
    const requestWorkspaceIdentity = workspaceIdentityKey;
    setLocationBusy(true);
    setFieldStudyError("");
    setFieldStudyNotice("");
    try {
      const coordinates = await requestCurrentCoordinates();
      await syncSavedRunLocation(coordinates, requestWorkspaceIdentity);
    } catch (locationError: any) {
      if (currentWorkspaceIdentityRef.current !== requestWorkspaceIdentity) return;
      setFieldStudyError(
        locationError?.message ||
          "Current location is unavailable. You can still enter a general region."
      );
    } finally {
      if (currentWorkspaceIdentityRef.current === requestWorkspaceIdentity) {
        setLocationBusy(false);
      }
    }
  }

  async function removeCurrentLocation() {
    if (locationBusy || identificationBusy) return;
    const requestWorkspaceIdentity = workspaceIdentityKey;
    setLocationBusy(true);
    setFieldStudyError("");
    try {
      await syncSavedRunLocation(null, requestWorkspaceIdentity);
      if (currentWorkspaceIdentityRef.current !== requestWorkspaceIdentity) return;
      setFieldStudyNotice(
        "The private location was removed from this Plant ID only. Field Studies and Nature were not changed."
      );
    } catch (locationError: any) {
      if (currentWorkspaceIdentityRef.current !== requestWorkspaceIdentity) return;
      setFieldStudyError(
        locationError?.message || "The private Plant ID location could not be removed."
      );
    } finally {
      if (currentWorkspaceIdentityRef.current === requestWorkspaceIdentity) {
        setLocationBusy(false);
      }
    }
  }

  async function applyManualLocation(coordinates: PublicCoordinates) {
    if (locationBusy || identificationBusy) return;
    const requestWorkspaceIdentity = workspaceIdentityKey;
    setLocationBusy(true);
    setFieldStudyError("");
    setFieldStudyNotice("");
    try {
      await syncSavedRunLocation(coordinates, requestWorkspaceIdentity);
      if (currentWorkspaceIdentityRef.current !== requestWorkspaceIdentity) return;
      setShowManualLocation(false);
      setFieldStudyNotice(
        activeToolRunRef.current
          ? "The selected point was saved privately with this Plant ID."
          : "The selected point is ready to save privately when identification completes."
      );
    } catch (locationError: any) {
      if (currentWorkspaceIdentityRef.current !== requestWorkspaceIdentity) return;
      setFieldStudyError(
        locationError?.message || "The selected private location could not be saved."
      );
    } finally {
      if (currentWorkspaceIdentityRef.current === requestWorkspaceIdentity) {
        setLocationBusy(false);
      }
    }
  }

  function selectFieldStudy(study: FieldStudy) {
    if (workspaceType !== "personal") return;
    const id = String(study.id || study._id || "");
    if (selectedFieldStudyId === id) {
      setSelectedFieldStudyId("");
      setPublishObservation(false);
      setLocationPrivacy("private");
      setConfirmPublicStudy(false);
      setCannabisMapConsent(false);
      return;
    }
    setSelectedFieldStudyId(id);
    setPublishObservation(false);
    setLocationPrivacy("private");
    setConfirmPublicStudy(false);
    setCannabisMapConsent(false);
  }

  async function createFieldStudyHere() {
    if (workspaceType !== "personal") {
      setFieldStudyError(
        "Field Studies and Nature publishing are available only from a Personal workspace."
      );
      return;
    }
    const title = newStudyTitle.trim();
    if (!title || creatingStudy) {
      setFieldStudyError("Enter a Field Study name first.");
      return;
    }
    setCreatingStudy(true);
    setFieldStudyError("");
    try {
      const study = await createFieldStudy({
        title,
        visibility: "private",
        defaultLocationPrivacy: "private"
      });
      setFieldStudies((current) => [study, ...current]);
      setSelectedFieldStudyId(String(study.id || study._id || ""));
      setNewStudyTitle("");
    } catch (studyError: any) {
      setFieldStudyError(studyError?.message || "The Field Study could not be created.");
    } finally {
      setCreatingStudy(false);
    }
  }

  async function makeSelectedStudyPublic() {
    if (workspaceType !== "personal") return;
    if (
      !selectedFieldStudy ||
      selectedFieldStudy.accessRole !== "owner" ||
      publishingStudy
    ) {
      return;
    }
    setPublishingStudy(true);
    setFieldStudyError("");
    try {
      const updated = await updateFieldStudy(selectedFieldStudyId, {
        visibility: "public"
      });
      setFieldStudies((current) =>
        current.map((study) =>
          String(study.id || study._id || "") === selectedFieldStudyId
            ? { ...study, ...updated, visibility: "public" }
            : study
        )
      );
      setConfirmPublicStudy(false);
    } catch (studyError: any) {
      setFieldStudyError(
        studyError?.message || "The Field Study could not be made public."
      );
    } finally {
      setPublishingStudy(false);
    }
  }

  return (
    <BackendCalculatorToolScreen
      backFallbackHref={backFallbackHref}
      tool="species-crop-id"
      toolKey="species-crop-id"
      externalInputKey={evidenceInputKey}
      onToolRunChange={handleToolRunChange}
      onValuesChange={handleValuesChange}
      executionBlocked={
        locationBusy || evidenceBusy || retryEvidenceLoading || frameExtractionBusy
      }
      executionBlockedMessage={
        retryEvidenceLoading
          ? "Finish recovering the saved Plant ID evidence before starting identification."
          : frameExtractionBusy
            ? "Wait for GrowPath to finish extracting and uploading still frames from the private source video before starting identification."
            : evidenceBusy
              ? "Finish uploading and saving every selected photo or video before identifying this plant."
              : "Finish the active location request before identifying this plant."
      }
      onExecutionBusyChange={setIdentificationBusy}
      title="Species / Crop Identification"
      subtitle="Narrow an unknown plant by combining photos, morphology, habitat, geography, and season. A grow is optional."
      growOptional
      noGrowContextMessage="This identification and your confirmation decision remain in Saved Runs. Attach a grow only to add the confirmed identity to grow or plant history."
      formHeader={({ growId, facilityId: activeFacilityId, workspaceType }) => (
        <View style={styles.evidenceSection}>
          <Text style={styles.evidenceTitle}>Step 1 — Add identification evidence</Text>
          <Text style={styles.evidenceGuidance}>
            Start with the whole plant and its habitat, then add sharp leaf-top,
            leaf-underside, stem/node, flower, and fruit or seed views when available. You
            can use up to 12 photos or extract still frames from one short video. Location
            is optional and can remain private. Use even daylight or diffuse neutral
            light; direct flash against a dark background can hide color and diagnostic
            structure in glare, clipped highlights, and deep shadow.
          </Text>
          {retryEvidenceLoading ? (
            <Text accessibilityLiveRegion="polite" style={styles.evidenceGuidance}>
              Recovering saved Plant ID evidence...
            </Text>
          ) : null}
          {retryEvidenceError ? (
            <Text accessibilityRole="alert" style={styles.fieldStudyError}>
              {retryEvidenceError}
            </Text>
          ) : null}
          {retryEvidenceNotice ? (
            <Text accessibilityLiveRegion="polite" style={styles.statusGood}>
              {retryEvidenceNotice}
            </Text>
          ) : null}
          {sourceVideoEvidence ? (
            <View style={styles.frameExtractionPanel}>
              <Text style={styles.evidenceTitle}>Video still frames</Text>
              <Text style={styles.evidenceGuidance}>
                The saved source video stays private and is not sent as motion analysis.
                GrowPath identifies plants only from uploaded timestamped still frames.
              </Text>
              {frameExtractionNotice ? (
                <Text accessibilityLiveRegion="polite" style={styles.statusGood}>
                  {frameExtractionNotice}
                </Text>
              ) : null}
              {frameExtractionError ? (
                <Text accessibilityRole="alert" style={styles.fieldStudyError}>
                  {frameExtractionError}
                </Text>
              ) : null}
              {sourceVideoExtractionUnavailableReason ? (
                <Text accessibilityRole="alert" style={styles.fieldStudyError}>
                  {sourceVideoExtractionUnavailableReason}
                </Text>
              ) : null}
              {!currentSourceVideoFramesVerified ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    frameExtractionActionUnavailable
                      ? "Video frame extraction unavailable"
                      : frameExtractionActionNonRetryable
                        ? "Video frame extraction cannot be retried"
                        : verificationPendingForCurrentSource && frameExtractionError
                          ? "Retry restoring extracted video frames"
                          : verificationPendingForCurrentSource ||
                              effectiveFrameExtractionStatus === "completed"
                            ? "Restore extracted video frames"
                            : effectiveFrameExtractionStatus === "processing"
                              ? "Check video frame extraction progress"
                              : effectiveFrameExtractionStatus === "failed" ||
                                  effectiveFrameExtractionStatus === "partial"
                                ? "Retry video frame extraction"
                                : "Extract video frames"
                  }
                  disabled={
                    frameExtractionRequestBusy ||
                    evidenceBusy ||
                    identificationBusy ||
                    frameExtractionActionUnavailable ||
                    frameExtractionActionNonRetryable
                  }
                  onPress={() =>
                    void syncVideoFrameExtraction({
                      begin:
                        verificationPendingForCurrentSource ||
                        effectiveFrameExtractionStatus !== "processing"
                    })
                  }
                  style={[
                    styles.secondaryButton,
                    (frameExtractionRequestBusy ||
                      evidenceBusy ||
                      identificationBusy ||
                      frameExtractionActionUnavailable ||
                      frameExtractionActionNonRetryable) &&
                      styles.disabled
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {frameExtractionRequestBusy
                      ? "Checking Video Frames..."
                      : frameExtractionActionUnavailable
                        ? "Video Frames Unavailable"
                        : frameExtractionActionNonRetryable
                          ? "Video Frames Cannot Be Retried"
                          : verificationPendingForCurrentSource && frameExtractionError
                            ? "Retry Restoring Video Frames"
                            : verificationPendingForCurrentSource ||
                                effectiveFrameExtractionStatus === "completed"
                              ? "Restore Extracted Video Frames"
                              : effectiveFrameExtractionStatus === "processing"
                                ? "Check Video Frame Progress"
                                : effectiveFrameExtractionStatus === "failed" ||
                                    effectiveFrameExtractionStatus === "partial"
                                  ? "Retry Video Frames"
                                  : "Extract Video Frames"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <MediaEvidencePicker
            key={workspaceIdentityKey}
            aiUsable
            maxPhotos={12}
            allowVideo
            serverFrameExtractionOnly
            maxVideoSeconds={599}
            purpose="crop_identification"
            sourceContext={{
              growId: growId || undefined,
              ...(workspaceType === "facility" && activeFacilityId
                ? { facilityId: activeFacilityId }
                : {})
            }}
            videoWorkspaceType={workspaceType}
            videoWorkspaceId={
              workspaceType === "facility" ? activeFacilityId || undefined : undefined
            }
            value={currentEvidenceAssets}
            disabled={evidenceMutationLocked}
            onChange={handleEvidencePickerChange}
            onBusyChange={setEvidenceBusy}
            retainOnRemoveAssetIds={retryRetainedEvidenceIds}
          />
          <View style={styles.privateLocationPanel}>
            <Text style={styles.evidenceTitle}>Private plant location</Text>
            <Text style={styles.evidenceGuidance}>
              Add the device location directly to this Plant ID. A Field Study is not
              required, and the exact coordinates are never shared by this action.
            </Text>
            <View style={styles.choiceRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Include or update current location privately with this Plant ID"
                disabled={locationBusy || identificationBusy}
                onPress={captureCurrentLocation}
                style={[
                  styles.secondaryButton,
                  (locationBusy || identificationBusy) && styles.disabled
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  {locationBusy
                    ? "Reading location..."
                    : observationLocation
                      ? "Update Private Location"
                      : "Include Current Location Privately"}
                </Text>
              </Pressable>
              {observationLocation ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove private location from this Plant ID"
                  disabled={locationBusy || identificationBusy}
                  onPress={() => void removeCurrentLocation()}
                  style={[
                    styles.inlineLink,
                    (locationBusy || identificationBusy) && styles.disabled
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Remove Private Location</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showManualLocation }}
                disabled={locationBusy || identificationBusy}
                onPress={() => setShowManualLocation((value) => !value)}
                style={[
                  styles.inlineLink,
                  (locationBusy || identificationBusy) && styles.disabled
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  {showManualLocation ? "Close Map" : "Place Pin on Map"}
                </Text>
              </Pressable>
            </View>
            {showManualLocation ? (
              <PrivateLocationPicker
                value={observationLocation}
                onChange={(coordinates: PublicCoordinates) =>
                  void applyManualLocation(coordinates)
                }
              />
            ) : null}
            <Text
              accessibilityLiveRegion="polite"
              style={observationLocation ? styles.statusGood : styles.evidenceGuidance}
            >
              {observationLocation
                ? activeToolRun
                  ? `Exact location saved privately with this Plant ID${
                      Number.isFinite(observationLocation.accuracyMeters)
                        ? ` (about ${Math.round(
                            Number(observationLocation.accuracyMeters)
                          )} m accuracy)`
                        : ""
                    }. Not shared.`
                  : `Exact location is ready to save privately when identification completes${
                      Number.isFinite(observationLocation.accuracyMeters)
                        ? ` (about ${Math.round(
                            Number(observationLocation.accuracyMeters)
                          )} m accuracy)`
                        : ""
                    }. Not shared.`
                : "Optional. Plant ID works without a device location."}
            </Text>
          </View>
          {fieldStudyError ? (
            <Text accessibilityRole="alert" style={styles.fieldStudyError}>
              {fieldStudyError}
            </Text>
          ) : null}
          {fieldStudyNotice ? (
            <Text accessibilityLiveRegion="polite" style={styles.statusGood}>
              {fieldStudyNotice}
            </Text>
          ) : null}
          {workspaceType === "personal" ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showLocationAndSharing }}
                onPress={() => setShowLocationAndSharing((value) => !value)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  {showLocationAndSharing
                    ? "Hide Field Study & Nature sharing"
                    : "Optional: add to a Field Study or Nature"}
                </Text>
              </Pressable>
              {showLocationAndSharing ? (
                <View style={styles.fieldStudySection}>
                  <Text style={styles.evidenceTitle}>
                    Optional — Field Study and Nature sharing
                  </Text>
                  <Text style={styles.evidenceGuidance}>
                    After identification, this Plant ID can keep its private location in
                    Saved Runs without a Field Study. Use this section only for
                    collaboration or deliberate Nature publishing. Nothing is published by
                    default.
                  </Text>

                  <Text style={styles.fieldLabel}>Share this individual find</Text>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: wantsNatureMap }}
                    onPress={() => {
                      if (wantsNatureMap) {
                        setPublishObservation(false);
                        setLocationPrivacy("private");
                        setCannabisMapConsent(false);
                      } else {
                        setPublishObservation(true);
                        setLocationPrivacy("public_approximate");
                      }
                    }}
                    style={[
                      styles.choiceButton,
                      wantsNatureMap && styles.choiceButtonSelected
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        wantsNatureMap && styles.choiceTextSelected
                      ]}
                    >
                      Nature map — approximate pin
                    </Text>
                  </Pressable>
                  <Text style={styles.evidenceGuidance}>
                    No Field Study setup is required. After AI review, one deliberate
                    publish action shares a privacy-safe approximate pin and the selected
                    photos. Exact coordinates and Personal account details stay private.
                  </Text>
                  {wantsNatureMap ? (
                    <>
                      <Text style={styles.fieldLabel}>Public description (optional)</Text>
                      <TextInput
                        accessibilityLabel="Public Nature description"
                        maxLength={500}
                        multiline
                        onChangeText={setNaturePublicNotes}
                        placeholder="What did you observe here? Add habitat, visible features, or why this find matters."
                        placeholderTextColor={palette.textMuted}
                        style={styles.publicNoteInput}
                        value={naturePublicNotes}
                      />
                      <Text style={styles.evidenceGuidance}>
                        This text is shown with the public pin. Do not include a
                        person&apos;s name, exact address, private-property details, or
                        sensitive-species directions.
                      </Text>
                    </>
                  ) : null}

                  <Text style={styles.fieldLabel}>Optional named Field Study</Text>
                  {fieldStudies.length ? (
                    <View style={styles.choiceRow}>
                      {fieldStudies.map((study) => {
                        const id = String(study.id || study._id || "");
                        const selected = selectedFieldStudyId === id;
                        return (
                          <Pressable
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selected }}
                            key={id}
                            onPress={() => selectFieldStudy(study)}
                            style={[
                              styles.choiceButton,
                              selected && styles.choiceButtonSelected
                            ]}
                          >
                            <Text
                              style={[
                                styles.choiceText,
                                selected && styles.choiceTextSelected
                              ]}
                            >
                              {study.title} · {study.visibility}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.evidenceGuidance}>
                      You do not have an editable Field Study yet. Create one here without
                      leaving your uploaded photos.
                    </Text>
                  )}
                  <View style={styles.createStudyRow}>
                    <TextInput
                      accessibilityLabel="New Field Study name"
                      onChangeText={setNewStudyTitle}
                      placeholder="New Field Study name"
                      placeholderTextColor={palette.textMuted}
                      style={styles.studyInput}
                      value={newStudyTitle}
                    />
                    <Pressable
                      accessibilityRole="button"
                      disabled={creatingStudy}
                      onPress={createFieldStudyHere}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {creatingStudy ? "Creating..." : "Create & select"}
                      </Text>
                    </Pressable>
                  </View>
                  <Link href="/home/personal/field-studies" asChild>
                    <Pressable accessibilityRole="link" style={styles.inlineLink}>
                      <Text style={styles.secondaryButtonText}>Manage Field Studies</Text>
                    </Pressable>
                  </Link>

                  {selectedFieldStudy ? (
                    <>
                      <Text style={styles.fieldLabel}>
                        Save this Field Study observation as
                      </Text>
                      <View style={styles.choiceRow}>
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityState={{
                            checked: !publishObservation && locationPrivacy === "private"
                          }}
                          onPress={() => {
                            setPublishObservation(false);
                            setLocationPrivacy("private");
                            setConfirmPublicStudy(false);
                            setCannabisMapConsent(false);
                          }}
                          style={[
                            styles.choiceButton,
                            !publishObservation &&
                              locationPrivacy === "private" &&
                              styles.choiceButtonSelected
                          ]}
                        >
                          <Text
                            style={[
                              styles.choiceText,
                              !publishObservation &&
                                locationPrivacy === "private" &&
                                styles.choiceTextSelected
                            ]}
                          >
                            Private draft
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityState={{
                            checked:
                              !publishObservation && locationPrivacy === "collaborators"
                          }}
                          onPress={() => {
                            setPublishObservation(false);
                            setLocationPrivacy("collaborators");
                            setConfirmPublicStudy(false);
                            setCannabisMapConsent(false);
                          }}
                          style={[
                            styles.choiceButton,
                            !publishObservation &&
                              locationPrivacy === "collaborators" &&
                              styles.choiceButtonSelected
                          ]}
                        >
                          <Text
                            style={[
                              styles.choiceText,
                              !publishObservation &&
                                locationPrivacy === "collaborators" &&
                                styles.choiceTextSelected
                            ]}
                          >
                            Study-team draft
                          </Text>
                        </Pressable>
                      </View>
                      {wantsNatureMap && selectedFieldStudy.visibility !== "public" ? (
                        selectedFieldStudy.accessRole === "owner" ? (
                          <Pressable
                            accessibilityRole="button"
                            disabled={publishingStudy}
                            onPress={() => setConfirmPublicStudy(true)}
                            style={styles.secondaryButton}
                          >
                            <Text style={styles.secondaryButtonText}>
                              Review public Field Study sharing
                            </Text>
                          </Pressable>
                        ) : (
                          <Text style={styles.statusWarning}>
                            The Field Study owner must make this study public before its
                            published observations can appear on the Nature map.
                          </Text>
                        )
                      ) : null}
                      {confirmPublicStudy &&
                      selectedFieldStudy.visibility !== "public" ? (
                        <View style={styles.confirmationPanel}>
                          <Text style={styles.statusWarning}>
                            Making this Field Study public affects the whole study. Any
                            published observations already in it may become discoverable;
                            drafts remain private. Confirm only if that matches the
                            study&apos;s intended audience.
                          </Text>
                          <View style={styles.choiceRow}>
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => setConfirmPublicStudy(false)}
                              style={styles.secondaryButton}
                            >
                              <Text style={styles.secondaryButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              disabled={publishingStudy}
                              onPress={makeSelectedStudyPublic}
                              style={styles.secondaryButton}
                            >
                              <Text style={styles.secondaryButtonText}>
                                {publishingStudy
                                  ? "Making study public..."
                                  : "Confirm public Field Study"}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : null}
                    </>
                  ) : null}
                  {wantsNatureMap ? (
                    <View style={styles.readinessPanel}>
                      <Text style={styles.fieldLabel}>Nature map readiness</Text>
                      {natureMapChecks.map((check) => (
                        <Text
                          key={check.label}
                          style={check.ready ? styles.statusGood : styles.statusWarning}
                        >
                          {check.ready ? "Ready" : "Needed"}: {check.label}
                        </Text>
                      ))}
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: sensitiveSpecies }}
                        onPress={() => setSensitiveSpecies((value) => !value)}
                        style={[
                          styles.choiceButton,
                          sensitiveSpecies && styles.sensitiveButtonSelected
                        ]}
                      >
                        <Text style={styles.choiceText}>
                          {sensitiveSpecies
                            ? "Sensitive species protection: on"
                            : "Sensitive species protection: off"}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: cannabisMapConsent }}
                        onPress={() => setCannabisMapConsent((value) => !value)}
                        style={[
                          styles.choiceButton,
                          cannabisMapConsent && styles.choiceButtonSelected
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            cannabisMapConsent && styles.choiceTextSelected
                          ]}
                        >
                          {cannabisMapConsent
                            ? "Cannabis/hemp public-context confirmation: on"
                            : "This is Cannabis/hemp — review public-context sharing"}
                        </Text>
                      </Pressable>
                      {cannabisMapConsent ? (
                        <Text style={styles.evidenceGuidance}>
                          You confirm this is a Cannabis-genus observation and want an
                          eligible public pin shown only to viewers whose grow interests
                          and content controls allow Cannabis/hemp findings.
                        </Text>
                      ) : null}
                      <Text
                        style={natureMapReady ? styles.statusGood : styles.statusWarning}
                      >
                        {natureMapReady
                          ? "Ready to create an approximate map pin after AI review."
                          : "Complete the needed items above, then identify the plant and publish the pin from the result."}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.fieldMapLink}>
                    <Text style={styles.evidenceGuidance}>
                      See public, opt-in observations on the shared Nature map. Personal
                      account details are not placed on pins. Cannabis/hemp findings
                      follow deliberate publication and viewer grow-interest controls.
                    </Text>
                    <Link href="/field-observations" asChild>
                      <Pressable
                        accessibilityRole="link"
                        accessibilityLabel="Explore the public field observation map"
                        style={styles.secondaryButton}
                      >
                        <Text style={styles.secondaryButtonText}>
                          Explore public field map
                        </Text>
                      </Pressable>
                    </Link>
                  </View>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.fieldStudySection}>
              <Text style={styles.evidenceTitle}>Shared-workspace follow-ups</Text>
              <Text style={styles.evidenceGuidance}>
                This result remains in the current {workspaceType} workspace&apos;s Saved
                Runs. Personal Field Studies, Nature publishing, Personal grow or plant
                identity updates, and Personal follow-up tasks are not available from this
                shared-workspace result.
              </Text>
            </View>
          )}
        </View>
      )}
      aiPrefill={{
        buttonLabel: "Identify Plant from Photos",
        clearUnfilled: false,
        preserveAllExistingFields: true,
        evidenceAssetIds: () => assistantEvidenceAssetIds,
        sourceToolRunId: () =>
          currentEvidenceAssets.some(
            (asset) =>
              String(asset.purpose || "")
                .trim()
                .toLowerCase() === "other"
          )
            ? String(retryToolRunId || "").trim()
            : "",
        isReady: () =>
          uploadedEvidence.images.length > 0 &&
          !locationBusy &&
          !evidenceBusy &&
          !frameExtractionBusy,
        notReadyMessage:
          "Finish the photo upload, video-frame extraction, and any active location request before starting AI identification.",
        prepare: hydratePriorPlantIdReview,
        runAfterPrefill: true,
        buildImmediateResult: plantIdImmediateResult,
        buildMessage: ({ values }) =>
          `${PLANT_ID_AI_PROMPT}\n\nUser-entered context:\n${JSON.stringify(
            compactValues(values),
            null,
            2
          )}`,
        normalizeFieldValue: ({ fieldKey, value, parsed, response }) =>
          normalizeCropIdentityPrefillField({
            fieldKey,
            value,
            parsed,
            assessment: assessPlantIdVisionReply({
              parsed,
              response,
              previous: aiReviewByEvidenceRef.current.get(activeEvidenceReviewKey)
            })
          }),
        buildPayloadMetadata: ({ response, parsed }) => {
          const evidenceUsed = Array.isArray(response.evidenceUsed)
            ? response.evidenceUsed
            : [];
          const photosAnalyzed = Number(response.mediaAnalysis?.photosAnalyzed || 0);
          const usedEvidenceIds = new Set(evidenceUsed.map(String));
          const videoFramesAnalyzed = uploadedEvidence.media.filter(
            (asset) =>
              asset.type === "photo" &&
              asset.source === "generated" &&
              usedEvidenceIds.has(String(asset.id))
          ).length;
          const videosAttached = uploadedEvidence.media.filter(
            (asset) => asset.type === "video"
          ).length;
          const assessment = assessPlantIdVisionReply({
            parsed,
            response,
            previous: aiReviewByEvidenceRef.current.get(activeEvidenceReviewKey)
          });
          const analysisReceipt = response.analysisReceipt;
          if (activeEvidenceReviewKey) {
            aiReviewByEvidenceRef.current.set(activeEvidenceReviewKey, assessment);
            hydratedEvidenceReviewKeysRef.current.add(activeEvidenceReviewKey);
          }
          return {
            ...(currentEvidenceAssets.some(
              (asset) =>
                String(asset.purpose || "")
                  .trim()
                  .toLowerCase() === "other"
            ) && retryToolRunId
              ? { legacySourceToolRunId: String(retryToolRunId).trim() }
              : {}),
            identificationDraft: buildIdentificationDraft(parsed, assessment),
            imageAnalysis: {
              requested: uploadedEvidence.imageEvidenceAssetIds.length > 0,
              performed:
                uploadedEvidence.imageEvidenceAssetIds.length > 0 && assessment.performed,
              photoCount: uploadedEvidence.imageEvidenceAssetIds.length,
              photosAnalyzed,
              stillImagesAnalyzed: photosAnalyzed,
              diagnosticViewsAnalyzed: Number(
                response.mediaAnalysis?.diagnosticViewsAnalyzed || 0
              ),
              videoFramesAnalyzed,
              videosAttached,
              videosAnalyzed: 0,
              provider: response.provider || "assistant",
              providerModel: response.mediaAnalysis?.providerModel || null,
              providerLabel: response.providerLabel || "AI crop identity review",
              confidence: assessment.confidence,
              quality: assessment.quality,
              identifyingVisualTraits: String(
                parsed.identifyingVisualTraits || ""
              ).trim(),
              evidenceUsed,
              aiUsageEventId: analysisReceipt?.aiUsageEventId || null,
              normalizedPlantIdResultDigest:
                analysisReceipt?.normalizedPlantIdResultDigest || null,
              evidenceFingerprint:
                analysisReceipt?.evidenceFingerprint || activeEvidenceReviewKey,
              limitations: assessment.limitations,
              reviewPolicyVersion:
                analysisReceipt?.reviewPolicyVersion || PLANT_ID_REVIEW_POLICY_VERSION,
              previousReviewPolicyVersion: assessment.previousPolicyVersion,
              reassessedUnderUpdatedPolicy: assessment.reassessedUnderUpdatedPolicy
            }
          };
        }
      }}
      resultFollowUp={{
        workflow: "plant-id-follow-up",
        evidenceAssetIds: () => assistantEvidenceAssetIds,
        suggestions: plantIdResultFollowUpQuestions
      }}
      fields={[
        {
          key: "userEnteredName",
          label: "Plant or crop name",
          defaultValue: "",
          section: "Step 2 — Proposed identity",
          placeholder: "Leave blank if unknown"
        },
        {
          key: "scientificName",
          label: "Scientific name, if known",
          defaultValue: "",
          section: "Step 2 — Proposed identity"
        },
        {
          key: "cultivar",
          label: "Cultivar / variety from a label or source",
          defaultValue: "",
          section: "Step 2 — Proposed identity",
          helpText: "Do not enter a cultivar inferred from appearance."
        },
        {
          key: "commonNames",
          label: "Other common names",
          defaultValue: "",
          section: "Step 2 — Proposed identity"
        },
        {
          key: "cultivationStatus",
          label: "Wild or cultivated?",
          defaultValue: "",
          section: "Step 3 — Place and context",
          options: [
            { value: "wild", label: "Wild" },
            { value: "cultivated", label: "Cultivated" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "setting",
          label: "Growing setting",
          defaultValue: "",
          section: "Step 3 — Place and context",
          options: [
            { value: "outdoor", label: "Outdoor" },
            { value: "indoor", label: "Indoor" },
            { value: "greenhouse", label: "Greenhouse" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "region",
          label: "Location or region",
          defaultValue: "",
          section: "Step 3 — Place and context",
          placeholder: "City/state, county, or general region",
          helpText: "Optional. Use only the precision you are comfortable saving."
        },
        {
          key: "observationDate",
          label: "Observation date",
          defaultValue: "",
          inputType: "date",
          section: "Step 3 — Place and context"
        },
        {
          key: "habitat",
          label: "Habitat",
          defaultValue: "",
          section: "Step 3 — Place and context",
          placeholder: "Roadside, wetland, woodland shade, garden bed…"
        },
        {
          key: "substrate",
          label: "Soil, substrate, or geology",
          defaultValue: "",
          section: "Step 3 — Place and context",
          placeholder: "Sand, clay, limestone, potting mix…"
        },
        {
          key: "associatedPlants",
          label: "Nearby associated plants",
          defaultValue: "",
          section: "Step 3 — Place and context"
        },
        {
          key: "plantSize",
          label: "Approximate plant size",
          defaultValue: "",
          section: "Step 3 — Place and context",
          placeholder: "Height, spread, trunk or stem size"
        },
        {
          key: "growthHabit",
          label: "Growth habit",
          defaultValue: "",
          section: "Step 4 — Morphology",
          options: [
            { value: "tree", label: "Tree" },
            { value: "shrub", label: "Shrub" },
            { value: "vine", label: "Vine" },
            { value: "herb", label: "Herb" },
            { value: "grasslike", label: "Grass-like" },
            { value: "succulent", label: "Succulent" },
            { value: "fernlike", label: "Fern-like" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "leafArrangement",
          label: "Leaf arrangement",
          defaultValue: "",
          section: "Step 4 — Morphology",
          options: [
            { value: "opposite", label: "Opposite" },
            { value: "alternate", label: "Alternate" },
            { value: "whorled", label: "Whorled" },
            { value: "basal", label: "Basal" },
            { value: "rosette", label: "Rosette" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "leafType",
          label: "Leaf type",
          defaultValue: "",
          section: "Step 4 — Morphology",
          options: [
            { value: "simple", label: "Simple" },
            { value: "compound", label: "Compound" },
            { value: "pinnate", label: "Pinnate" },
            { value: "palmate", label: "Palmate" },
            { value: "scale_like", label: "Scale-like" },
            { value: "needle_like", label: "Needle-like" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "leafMargin",
          label: "Leaf edge / margin",
          defaultValue: "",
          section: "Step 4 — Morphology",
          options: [
            { value: "entire", label: "Smooth" },
            { value: "serrated", label: "Serrated" },
            { value: "lobed", label: "Lobed" },
            { value: "spiny", label: "Spiny" },
            { value: "wavy", label: "Wavy" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "venation",
          label: "Leaf veins",
          defaultValue: "",
          section: "Step 4 — Morphology",
          options: [
            { value: "parallel", label: "Parallel" },
            { value: "pinnate", label: "Pinnate" },
            { value: "palmate", label: "Palmate" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "flowerPresent",
          label: "Flowers visible?",
          defaultValue: "",
          section: "Step 4 — Morphology",
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "flowerSymmetry",
          label: "Flower symmetry",
          defaultValue: "",
          section: "Step 4 — Morphology",
          options: [
            { value: "radial", label: "Radial" },
            { value: "bilateral", label: "Bilateral" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "fruitPresent",
          label: "Fruit or seed visible?",
          defaultValue: "",
          section: "Step 4 — Morphology",
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "stemTraits",
          label: "Stem, bark, or node traits",
          defaultValue: "",
          section: "Step 4 — Morphology",
          multiline: true,
          placeholder: "Square stem, woody bark, hairs, latex, colored nodes…"
        },
        {
          key: "flowerPartsVisible",
          label: "Visible flower parts",
          defaultValue: "",
          section: "Step 4 — Morphology",
          placeholder: "Petals/tepals, sepals, stamens, pistil, spathe/spadix…"
        },
        {
          key: "inflorescenceType",
          label: "Flower-cluster / inflorescence shape",
          defaultValue: "",
          section: "Step 4 — Morphology"
        },
        {
          key: "fruitType",
          label: "Fruit or seed type",
          defaultValue: "",
          section: "Step 4 — Morphology"
        },
        {
          key: "specialStructures",
          label: "Special structures",
          defaultValue: "",
          section: "Step 4 — Morphology",
          multiline: true,
          placeholder:
            "Spines, tendrils, stipules, bulb, corm, rhizome, latex, hairs, succulent stem…"
        },
        {
          key: "sensoryTraits",
          label: "Smell, sap, texture, or other direct observations",
          defaultValue: "",
          section: "Step 4 — Morphology",
          multiline: true,
          helpText: "Do not taste an unknown plant."
        },
        {
          key: "identificationNotes",
          label: "Additional identification evidence",
          defaultValue: "",
          section: "Step 4 — Morphology",
          multiline: true
        }
      ]}
      validateValues={(values, validationContext) => {
        const useful = compactValues(values);
        if (
          validationContext?.source === "prefill" &&
          validationContext.metadata.imageAnalysis?.requested
        ) {
          // A weak but completed image review is itself a meaningful saved result:
          // preserve "unknown crop", low confidence, and exact retake guidance rather
          // than requiring the model to invent a form value just to pass validation.
          return null;
        }
        return Object.keys(useful).length
          ? null
          : "Enter at least one observed trait or proposed name, or use AI photo identification.";
      }}
      buildPayload={(
        values,
        { growId, facilityId, workspaceType, plantContext, userValues }
      ) => {
        const identityFields = {
          userEnteredName: String(userValues.userEnteredName || "").trim(),
          scientificName: String(userValues.scientificName || "").trim(),
          commonNames: stringList(userValues.commonNames),
          cultivar: String(userValues.cultivar || "").trim()
        };
        const providedFields = Object.entries(identityFields)
          .filter(([, value]) =>
            Array.isArray(value) ? value.length > 0 : Boolean(value)
          )
          .map(([key]) => key);
        return {
          growId,
          workspaceType,
          ...(workspaceType === "facility" && facilityId ? { facilityId } : {}),
          ...plantContext.toolRunContext,
          userEnteredName: values.userEnteredName,
          scientificName: values.scientificName,
          cultivar: values.cultivar,
          userConfirmed: false,
          commonNames: values.commonNames,
          identityInputProvenance: {
            source: "user_entry",
            providedFields,
            ...identityFields
          },
          manualInputProvenance: plantIdManualInputProvenance(userValues),
          identificationNotes: values.identificationNotes || undefined,
          observationContext: {
            cultivationStatus: values.cultivationStatus || "unknown",
            setting: values.setting || "unknown",
            region: values.region || "",
            observationDate: values.observationDate || "",
            habitat: values.habitat || "",
            substrate: values.substrate || "",
            associatedPlants: stringList(values.associatedPlants),
            plantSize: values.plantSize || ""
          },
          capturedLocation: observationLocation
            ? {
                ...observationLocation,
                privacy: "private",
                userAuthorized: true
              }
            : undefined,
          morphology: {
            growthHabit: values.growthHabit || "unknown",
            leafArrangement: values.leafArrangement || "unknown",
            leafType: values.leafType || "unknown",
            leafMargin: values.leafMargin || "unknown",
            venation: values.venation || "unknown",
            flowerPresent: values.flowerPresent || "unknown",
            flowerSymmetry: values.flowerSymmetry || "unknown",
            fruitPresent: values.fruitPresent || "unknown",
            stemTraits: stringList(values.stemTraits),
            flowerPartsVisible: stringList(values.flowerPartsVisible),
            inflorescenceType: values.inflorescenceType || "",
            fruitType: values.fruitType || "",
            specialStructures: stringList(values.specialStructures),
            sensoryTraits: stringList(values.sensoryTraits)
          },
          evidenceAssetIds: uploadedEvidence.evidenceAssetIds,
          mediaEvidence: uploadedEvidence.media
        };
      }}
      buildMetrics={plantIdMetrics}
      prepareOutputsForDisplay={safePlantIdentificationOutputs}
      buildNotices={(rawOutputs, { payload }) => {
        const outputs = safePlantIdentificationOutputs(rawOutputs);
        const warnings = Array.isArray(outputs.warnings) ? outputs.warnings : [];
        const confirmationBlockedReason = String(
          outputs.confirmationBlockedReason || ""
        ).trim();
        const userIdentityClaim = explicitUserIdentityClaim(payload);
        const payloadImageAnalysis = payload.imageAnalysis || {};
        const outputImageAnalysis = outputs.imageAnalysis || {};
        const stillImagesAnalyzed = Number(
          outputImageAnalysis.stillImagesAnalyzed ||
            outputImageAnalysis.photosAnalyzed ||
            outputImageAnalysis.photoCount ||
            1
        );
        const videoFramesAnalyzed = Number(outputImageAnalysis.videoFramesAnalyzed || 0);
        const videosAttached = Number(outputImageAnalysis.videosAttached || 0);
        const userIdentityNotVisuallyVerified =
          [payloadImageAnalysis, outputImageAnalysis].some(
            (analysis) =>
              analysis.requested === true &&
              (analysis.performed !== true ||
                analysis.quality !== "usable" ||
                analysis.confidence !== "high")
          ) ||
          [
            ...stringList(payloadImageAnalysis.limitations),
            ...stringList(outputImageAnalysis.limitations)
          ].some((item) => /same unchanged evidence/i.test(item));
        return [
          ...(outputs.confirmationAvailable === false
            ? [
                {
                  key: "confirmation-blocked",
                  severity: "high" as const,
                  message: confirmationBlockedReason
                    ? `Confirmation unavailable: ${confirmationBlockedReason}`
                    : "Confirmation is unavailable until the identification evidence meets the required quality and confidence checks."
                }
              ]
            : []),
          ...(userIdentityClaim.hasIdentity &&
          !userIdentityClaim.invalidScientificName &&
          outputs.confirmationAvailable === true &&
          userIdentityNotVisuallyVerified
            ? [
                {
                  key: "user-entered-not-visually-verified",
                  severity: "medium" as const,
                  message: `User-entered identity: ${userIdentityClaim.primaryName}. The attached images did not visually verify this identity. Confirmation saves the explicit user entry, not the AI candidate.`
                }
              ]
            : []),
          ...(outputs.identityConflictDetected || outputs.confidence === "low"
            ? [
                {
                  key: "identity-confidence",
                  severity: "high" as const,
                  message: outputs.identityConflictDetected
                    ? "Identity not verified: the proposed names conflicted or included an unusable scientific name. Treat this result as low confidence and provide clearer leaf, flower, fruit, stem, and whole-plant evidence before confirming it."
                    : "Low-confidence identity: do not rely on this plant name yet. Review the missing evidence and upload the requested views before confirming it."
                }
              ]
            : []),
          {
            key: "image-analysis-status",
            severity: outputs.imageAnalysis?.performed
              ? ("info" as const)
              : ("medium" as const),
            message: outputs.imageAnalysis?.performed
              ? `${outputs.imageAnalysis.providerLabel || "AI vision"} inspected ${stillImagesAnalyzed} still image${
                  stillImagesAnalyzed === 1 ? "" : "s"
                }${
                  videoFramesAnalyzed > 0
                    ? `, including ${videoFramesAnalyzed} frame${videoFramesAnalyzed === 1 ? "" : "s"} extracted from video`
                    : ""
                }.${
                  videosAttached > 0
                    ? " The private source video was saved but was not analyzed directly."
                    : ""
                } The result is still a draft until you confirm it.`
              : outputs.imageAnalysis?.requested
                ? "The uploaded photo pixels were not analyzed. Try again with image-capable AI, or enter visible traits manually."
                : "No photo was analyzed. This result uses only the information entered in the form."
          },
          ...warnings.map((message: unknown, index: number) => ({
            key: `warning-${index}`,
            severity: "medium" as const,
            message: String(message)
          }))
        ];
      }}
      buildDetails={(outputs) => (
        <PlantIdentificationResultDetails
          outputs={safePlantIdentificationOutputs(outputs)}
        />
      )}
      defaultLogTitle={(outputs) =>
        `Crop identity: ${
          safePlantIdentificationOutputs(outputs).likelyCrop || "unconfirmed crop"
        }`
      }
      defaultTask={(rawOutputs) => {
        const outputs = safePlantIdentificationOutputs(rawOutputs);
        return {
          title: outputs.userConfirmationRequired
            ? "Confirm crop identity"
            : "Review crop profile context",
          description:
            outputs.recommendationContext ||
            "Confirm species/crop profile before applying crop-specific guidance.",
          priority: outputs.userConfirmationRequired ? "high" : "medium",
          ...cropIdentityCalendarMetadata("crop_identity_confirmation")
        };
      }}
      buildActions={({
        outputs: rawOutputs,
        payload,
        toolRun,
        moduleRecord,
        growId,
        plantContext,
        workspaceType: activeWorkspaceType
      }) => {
        const outputs = safePlantIdentificationOutputs(rawOutputs);
        const userIdentityClaim = explicitUserIdentityClaim(payload);
        const useUserIdentityClaim =
          userIdentityClaim.hasIdentity && !userIdentityClaim.invalidScientificName;
        const userCorrectionCanConfirm =
          useUserIdentityClaim && outputs.confirmationAvailable === true;
        const cropCommonName = String(
          userIdentityClaim.hasIdentity
            ? userIdentityClaim.primaryName
            : outputs.likelyCrop || payload.userEnteredName || ""
        ).trim();
        const invalidIdentity =
          !cropCommonName || /^(unknown crop|not confirmed)$/i.test(cropCommonName);
        const payloadImageAnalysis = payload.imageAnalysis || {};
        const imageAnalysis = outputs.imageAnalysis || payloadImageAnalysis;
        const completedImageAnalyses = [payloadImageAnalysis, outputs.imageAnalysis]
          .filter(Boolean)
          .filter((analysis) => analysis.performed === true);
        const sameEvidenceConflict = [
          ...stringList(outputs.counterEvidence),
          ...stringList(outputs.identificationDraft?.counterEvidence),
          ...stringList(payload.identificationDraft?.counterEvidence),
          ...stringList(imageAnalysis.limitations),
          ...stringList(payloadImageAnalysis.limitations)
        ].some((item) =>
          /same unchanged evidence produced a conflicting identity/i.test(item)
        );
        const imageAnalysisRequested = [payloadImageAnalysis, outputs.imageAnalysis]
          .filter(Boolean)
          .some((analysis) => analysis.requested === true);
        const imageEvidenceBlocksConfirmation =
          imageAnalysisRequested &&
          (completedImageAnalyses.length === 0 ||
            completedImageAnalyses.some(
              (analysis) =>
                analysis.quality !== "usable" || analysis.confidence !== "high"
            ));
        const target = plantContext.plantId ? "Plant" : "Grow";
        const identity = {
          growId,
          cropCommonName,
          scientificName: useUserIdentityClaim
            ? userIdentityClaim.scientificName
            : String(outputs.scientificName || payload.scientificName || "").trim(),
          commonNames: useUserIdentityClaim
            ? userIdentityClaim.commonNames
            : stringList(outputs.commonNames || payload.commonNames),
          cultivar: useUserIdentityClaim
            ? userIdentityClaim.cultivar
            : String(
                outputs.cultivarOrStrain || outputs.cultivar || payload.cultivar || ""
              ).trim(),
          cropProfileId: useUserIdentityClaim
            ? null
            : outputs.cropProfileSuggestion?.cropProfileId || null,
          confidence: "user_confirmed",
          sourceToolRunId: String(toolRun?.id || toolRun?._id || "") || null,
          userConfirmed: true as const
        };
        const actions: ToolResultAction[] = [
          {
            key: "confirm-crop-identity",
            label: growId ? `Confirm & Save to ${target}` : "Confirm in Saved Run",
            pendingLabel: "Saving...",
            disabled:
              invalidIdentity ||
              userIdentityClaim.invalidScientificName ||
              outputs.confirmationAvailable === false ||
              (!userCorrectionCanConfirm &&
                (imageEvidenceBlocksConfirmation ||
                  sameEvidenceConflict ||
                  outputs.identityConflictDetected === true ||
                  payload.identityConflictDetected === true)),
            successMessage: growId
              ? `Confirmed crop identity saved to ${target.toLowerCase()}.`
              : "Confirmed identity saved to this run.",
            onPress: async () => {
              await recordCropIdentificationDecision({
                decision: "accepted",
                toolRun,
                moduleRecord,
                workspaceScope: toolRunScope
              });
              if (activeWorkspaceType === "personal" && growId && plantContext.plantId) {
                await savePersonalPlantCropIdentity(plantContext.plantId, identity);
              } else if (activeWorkspaceType === "personal" && growId) {
                await savePersonalGrowCropIdentity(growId, identity);
              }
            }
          },
          {
            key: "crop-identity-uncertain",
            label: "Mark as Not Sure",
            variant: "secondary" as const,
            pendingLabel: "Saving...",
            successMessage:
              "Saved as uncertain. Add the requested evidence before confirming.",
            onPress: () =>
              recordCropIdentificationDecision({
                decision: "uncertain",
                toolRun,
                moduleRecord,
                workspaceScope: toolRunScope
              })
          },
          {
            key: "crop-identity-rejected",
            label: "Mark as Doesn't Match",
            variant: "secondary" as const,
            pendingLabel: "Saving...",
            successMessage: "Saved as rejected for future outcome review.",
            onPress: () =>
              recordCropIdentificationDecision({
                decision: "rejected",
                toolRun,
                moduleRecord,
                workspaceScope: toolRunScope
              })
          }
        ];

        if (activeWorkspaceType === "personal" && !growId && !invalidIdentity) {
          actions.splice(1, 0, {
            key: "confirm-and-start-grow",
            label: "Confirm & Start a Grow",
            pendingLabel: "Preparing grow...",
            disabled:
              userIdentityClaim.invalidScientificName ||
              outputs.confirmationAvailable === false ||
              (!userCorrectionCanConfirm &&
                (imageEvidenceBlocksConfirmation ||
                  sameEvidenceConflict ||
                  outputs.identityConflictDetected === true ||
                  payload.identityConflictDetected === true)),
            onPress: async () => {
              await recordCropIdentificationDecision({
                decision: "accepted",
                toolRun,
                moduleRecord,
                workspaceScope: toolRunScope
              });
              const query = new URLSearchParams();
              query.set("source", "ai");
              query.set("name", `${cropCommonName} grow`);
              query.set("cropCommonName", cropCommonName);
              if (identity.scientificName) {
                query.set("scientificName", identity.scientificName);
              }
              if (identity.commonNames.length) {
                query.set("commonNames", identity.commonNames.join(","));
              }
              if (identity.cultivar) query.set("cultivar", identity.cultivar);
              if (identity.cropProfileId) {
                query.set("cropProfileId", identity.cropProfileId);
              }
              if (identity.sourceToolRunId) {
                query.set("sourceToolRunId", identity.sourceToolRunId);
              }
              router.push(`/home/personal/grows/new?${query.toString()}` as any);
            }
          });
        }

        if (activeWorkspaceType === "personal" && growId) {
          actions.push({
            key: "create-crop-identity-tasks",
            label: "Create Crop Identity Tasks",
            variant: "secondary" as const,
            pendingLabel: "Creating...",
            successMessage: "Created crop identity tasks.",
            onPress: async () => {
              const result = await saveToolRunAndCreateTasks({
                growId,
                ...plantContext.toolRunContext,
                toolKey: "species-crop-id",
                toolRunId: toolRun?.id || toolRun?._id,
                input: payload,
                output: outputs,
                tasks: speciesCropTaskPlan(outputs)
              });
              if (!result.ok) throw new Error(result.error);
            }
          });
        }
        if (
          activeWorkspaceType === "personal" &&
          (selectedFieldStudyId || savedFieldObservationId || wantsNatureMap)
        ) {
          actions.push({
            key: "save-field-observation",
            label: savedFieldObservationId
              ? wantsNatureMap
                ? "Update Approximate Nature Pin"
                : savedFieldObservationPublished
                  ? "Withdraw Nature Pin & Save Privately"
                  : "Update Field Study Draft"
              : wantsNatureMap
                ? "Publish Approximate Pin to Nature"
                : "Save Draft to Field Study",
            variant: "secondary" as const,
            pendingLabel: savedFieldObservationId
              ? "Updating observation..."
              : wantsNatureMap
                ? "Publishing pin..."
                : "Saving...",
            successMessage: wantsNatureMap
              ? "Observation published. Open Nature to verify its viewer-eligible public pin and photos."
              : savedFieldObservationPublished
                ? "The public pin was withdrawn and the observation was saved privately."
                : "Observation saved as a Field Study draft.",
            onPress: async () => {
              if (publishObservation && uploadedEvidence.images.length === 0) {
                throw new Error(
                  "Add at least one fully uploaded photo before publishing an observation."
                );
              }
              if (wantsNatureMap && !observationLocation) {
                throw new Error(
                  "Use Current Location before publishing an approximate Nature map pin."
                );
              }
              if (
                wantsNatureMap &&
                selectedFieldStudy &&
                selectedFieldStudy.visibility !== "public"
              ) {
                throw new Error(
                  "Make the selected Field Study public before publishing its Nature map pin."
                );
              }
              const draft = outputs.identificationDraft || {};
              const structuredCandidates = plantIdentificationCandidates(outputs);
              const structuredEvidence = plantIdentificationEvidence(outputs);
              const structuredCandidateName = bestStructuredPlantCandidateName(outputs);
              const primaryStructuredCandidate = structuredCandidates[0] || {};
              const directLikelyCrop = String(outputs.likelyCrop || "").trim();
              const primaryCandidateCommonName =
                stringList(primaryStructuredCandidate.commonNames)[0] || "";
              const observationCommonName =
                directLikelyCrop && !unresolvedCropName(directLikelyCrop)
                  ? directLikelyCrop
                  : primaryCandidateCommonName;
              const observationScientificName = String(
                outputs.scientificName || primaryStructuredCandidate.scientificName || ""
              ).trim();
              const observationDisplayName =
                observationCommonName ||
                observationScientificName ||
                structuredCandidateName;
              const media = uploadedEvidence.media;
              const confidence = ["low", "medium", "high"].includes(
                String(outputs.confidence || draft.confidence || "").toLowerCase()
              )
                ? String(outputs.confidence || draft.confidence).toLowerCase()
                : "low";
              const cannabisObservation = isCannabisGenusIdentification(outputs);
              if (wantsNatureMap && cannabisObservation && !cannabisMapConsent) {
                throw new Error(
                  "Confirm the Cannabis/hemp public-context choice before publishing this pin."
                );
              }
              if (wantsNatureMap && cannabisMapConsent && !cannabisObservation) {
                throw new Error(
                  "The AI candidate does not support Cannabis genus. Turn off the Cannabis/hemp confirmation or review the identity first."
                );
              }
              const cannabisContextConfirmed =
                wantsNatureMap && cannabisObservation && cannabisMapConsent;
              let targetStudy =
                selectedFieldStudy ||
                fieldStudies.find(
                  (study) =>
                    String(study.id || study._id || "") === savedFieldObservationStudyId
                ) ||
                automaticNatureCollection;
              let targetStudyId = String(
                selectedFieldStudyId ||
                  savedFieldObservationStudyId ||
                  targetStudy?.id ||
                  targetStudy?._id ||
                  ""
              );
              if (wantsNatureMap && !targetStudyId) {
                const latestStudies = await listFieldStudies();
                const latestNatureCollection = directNatureCollection(latestStudies);
                if (latestNatureCollection) {
                  targetStudy = latestNatureCollection;
                  targetStudyId = String(
                    latestNatureCollection.id || latestNatureCollection._id || ""
                  );
                  setFieldStudies(latestStudies);
                }
              }
              if (wantsNatureMap && !targetStudyId) {
                targetStudy = await createFieldStudy({
                  title: DIRECT_NATURE_COLLECTION_TITLE,
                  description: DIRECT_NATURE_COLLECTION_DESCRIPTION,
                  purpose: "biodiversity_survey",
                  visibility: "public",
                  defaultLocationPrivacy: "public_approximate",
                  obscureSensitiveSpecies: true
                });
                targetStudyId = String(targetStudy.id || targetStudy._id || "");
                if (!targetStudyId) {
                  throw new Error(
                    "The Personal Nature collection could not be prepared. Nothing was published."
                  );
                }
                setFieldStudies((current) => [targetStudy as FieldStudy, ...current]);
              } else if (
                wantsNatureMap &&
                !selectedFieldStudy &&
                targetStudy &&
                targetStudy.visibility !== "public"
              ) {
                targetStudy = await updateFieldStudy(targetStudyId, {
                  visibility: "public"
                });
                setFieldStudies((current) =>
                  current.map((study) =>
                    String(study.id || study._id || "") === targetStudyId
                      ? (targetStudy as FieldStudy)
                      : study
                  )
                );
              }
              if (!targetStudyId) {
                throw new Error(
                  "Choose a Field Study for a private draft, or select the Nature map option for a direct public pin."
                );
              }
              const observationDate = String(
                payload.observationContext?.observationDate || ""
              ).trim();
              if (publishObservation && !observationDate) {
                throw new Error(
                  "Add the date the plant was observed before publishing it to Nature."
                );
              }
              const observationInput = {
                sourceToolRunId: String(toolRun?.id || toolRun?._id || "") || null,
                growId: growId || null,
                title:
                  observationDisplayName ||
                  String(payload.userEnteredName || "").trim() ||
                  "Unconfirmed plant observation",
                observationDate,
                identity: {
                  commonName:
                    observationCommonName || String(payload.userEnteredName || "").trim(),
                  scientificName: observationScientificName,
                  family: String(outputs.likelyFamily || draft.likelyFamily || "").trim(),
                  confidence: confidence as "low" | "medium" | "high",
                  verificationStatus: "ai_candidate" as const,
                  evidence: structuredEvidence.evidence,
                  counterEvidence: structuredEvidence.counterEvidence,
                  missingEvidence: structuredEvidence.missingEvidence,
                  candidates: structuredCandidates.map((candidate: any) => ({
                    commonName: stringList(candidate.commonNames)[0] || "",
                    scientificName: String(candidate.scientificName || ""),
                    confidence: candidate.confidence || "low",
                    evidence: stringList(candidate.evidence),
                    counterEvidence: stringList(candidate.counterEvidence)
                  }))
                },
                observationContext: payload.observationContext || {},
                evidenceAssets: media.map((item) => ({
                  assetId: item.id,
                  url: item.url,
                  kind: item.type === "video" ? ("video" as const) : ("photo" as const),
                  label: item.purpose
                })),
                photoUrls: media
                  .filter((item) => item.type === "photo")
                  .map((item) => item.url),
                location: {
                  ...(observationLocation || {}),
                  label: wantsNatureMap
                    ? ""
                    : String(payload.observationContext?.region || ""),
                  privacy: locationPrivacy,
                  exactLocationPublicConfirmed: false
                },
                publication: {
                  status: publishObservation
                    ? ("published" as const)
                    : savedFieldObservationPublished
                      ? ("withdrawn" as const)
                      : ("draft" as const),
                  sensitiveSpecies,
                  cannabisContextConfirmed,
                  publicNotes: naturePublicNotes.trim()
                }
              };
              let observationId = savedFieldObservationId;
              let locationNotice = "";
              if (observationId) {
                const updated = await updateFieldObservation(
                  targetStudyId,
                  observationId,
                  observationInput
                );
                observationId = String(updated.id || updated._id || observationId);
              } else {
                const created = await createFieldObservation(
                  targetStudyId,
                  observationInput
                );
                observationId = String(
                  created.observation?.id || created.observation?._id || "saved"
                );
                locationNotice = created.locationNotice || "";
              }
              setSavedFieldObservationId(observationId);
              setSavedFieldObservationStudyId(targetStudyId);
              setSavedFieldObservationPublished(publishObservation);
              setFieldStudyNotice(
                locationNotice ||
                  (wantsNatureMap
                    ? "The observation was published. Open Nature to verify its public, viewer-eligible map card and photos."
                    : savedFieldObservationPublished
                      ? "The public Nature pin was withdrawn. The Field Study observation is no longer public."
                      : "The observation was saved to the selected Field Study.")
              );
            }
          });
        }
        return actions;
      }}
    />
  );
}

export function createSpeciesCropIdStyles(palette: ThemePalette) {
  return StyleSheet.create({
    evidenceSection: { gap: 8 },
    evidenceTitle: { color: palette.text, fontSize: 15, fontWeight: "800" },
    evidenceGuidance: { color: palette.textMuted, lineHeight: 19 },
    fieldStudySection: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: 12,
      borderWidth: 1,
      gap: 9,
      marginTop: 8,
      padding: 13
    },
    privateLocationPanel: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: 12,
      borderWidth: 1,
      gap: 8,
      padding: 12
    },
    frameExtractionPanel: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: 12,
      borderWidth: 1,
      gap: 8,
      padding: 12
    },
    fieldLabel: { color: palette.text, fontSize: 13, fontWeight: "800" },
    choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    choiceButton: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 7
    },
    choiceButtonSelected: {
      backgroundColor: palette.accent,
      borderColor: palette.accent
    },
    sensitiveButtonSelected: {
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.warning
    },
    choiceText: { color: palette.text, fontSize: 12, fontWeight: "700" },
    choiceTextSelected: { color: palette.accentText },
    createStudyRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    studyInput: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 10,
      borderWidth: 1,
      color: palette.text,
      flexGrow: 1,
      minHeight: 42,
      minWidth: 210,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    publicNoteInput: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 10,
      borderWidth: 1,
      color: palette.text,
      minHeight: 92,
      paddingHorizontal: 12,
      paddingVertical: 10,
      textAlignVertical: "top"
    },
    secondaryButton: {
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    secondaryButtonText: { color: palette.link, fontWeight: "800" },
    disabled: { opacity: 0.55 },
    inlineLink: { alignSelf: "flex-start", paddingVertical: 3 },
    readinessPanel: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 10,
      borderWidth: 1,
      gap: 7,
      padding: 11
    },
    confirmationPanel: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      borderRadius: 10,
      borderWidth: 1,
      gap: 9,
      padding: 11
    },
    statusGood: { color: palette.success, fontWeight: "700", lineHeight: 19 },
    statusWarning: { color: palette.warning, fontWeight: "700", lineHeight: 19 },
    fieldStudyError: { color: palette.danger, lineHeight: 19 },
    fieldMapLink: { gap: 8, marginTop: 4 }
  });
}
