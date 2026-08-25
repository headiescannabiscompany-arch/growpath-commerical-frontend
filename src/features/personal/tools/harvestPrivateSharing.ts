import { Platform, Share } from "react-native";
import * as Sharing from "expo-sharing";

import type { EvidenceFrameExtraction, EvidenceWorkspaceScope } from "@/api/evidence";
import { getEvidenceUploadPlayback } from "@/api/uploads";
import {
  isSupportedHarvestReviewPolicy,
  type TrichomeVisionResult
} from "@/api/harvestVision";
import type { EvidenceAsset } from "@/types/evidence";
import type { ToolRun } from "@/api/toolRuns";

declare const require: ((id: string) => any) | undefined;

const HARVEST_AGGREGATE_POLICY =
  "harvest-trichome-server-attestation-v4-batched-evidence";
const HARVEST_SHAREABLE_HEAD_DEVELOPMENT_SIGNALS = new Set([
  "small_developing_heads",
  "intact_turgid_heads",
  "visibly_swollen_heads",
  "wrinkled_heads",
  "collapsed_heads",
  "resin_exudation",
  "fused_heads",
  "ruptured_heads",
  "bare_stalks",
  "detached_or_missing_heads"
]);
export const HARVEST_PRIVATE_FRAME_EXPORT_LIMIT = 12;
export const HARVEST_PRIVATE_FRAME_EXPORT_BYTE_LIMIT = 24 * 1024 * 1024;
const PROTECTED_UPLOAD_OBJECT =
  /\/api\/evidence-assets\/uploads\/([^/?#]+)\/object(?:[?#].*)?$/i;

export type HarvestRetainedFrameExportCandidate = {
  asset: EvidenceAsset;
  frameNumber: number;
  frameTimeSeconds: number;
  sequenceRole: "anchor" | "adjacent" | "standalone";
  countingEligible: boolean;
};

type ExportDependencies = {
  fetchImpl?: typeof fetch;
  getPlayback?: typeof getEvidenceUploadPlayback;
  platform?: string;
  documentObject?: Document;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
  sharing?: Pick<typeof Sharing, "isAvailableAsync" | "shareAsync">;
  fileSystem?: any;
};

function persistedAssetId(asset: EvidenceAsset | null | undefined) {
  return String(asset?._id || asset?.id || "").trim();
}

function protectedUploadId(asset: EvidenceAsset) {
  const match = String(asset.durableUrl || asset.originalUri || "").match(
    PROTECTED_UPLOAD_OBJECT
  );
  if (!match?.[1]) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

function hex64(value: unknown) {
  return /^[a-f0-9]{64}$/i.test(String(value || ""));
}

export function harvestBatchSummariesCoverEvidence(
  value: unknown,
  expectedGlobalIndexes: readonly number[],
  expectedBatchCount: number
) {
  if (!Array.isArray(value) || value.length !== expectedBatchCount) return false;
  const expectedIndexes = new Set(expectedGlobalIndexes);
  if (
    !expectedGlobalIndexes.length ||
    expectedIndexes.size !== expectedGlobalIndexes.length ||
    expectedGlobalIndexes.some((index) => !Number.isInteger(index) || index < 1)
  ) {
    return false;
  }
  const coveredIndexes = new Set<number>();
  const seenBatchIndexes = new Set<number>();
  for (const summary of value) {
    const batchIndex = Number(summary?.batchIndex);
    const imageCount = Number(summary?.imageCount);
    const globalIndexes = Array.isArray(summary?.globalImageIndexes)
      ? summary.globalImageIndexes.map(Number)
      : [];
    if (
      !Number.isInteger(batchIndex) ||
      batchIndex < 0 ||
      batchIndex >= expectedBatchCount ||
      seenBatchIndexes.has(batchIndex) ||
      !Number.isInteger(imageCount) ||
      imageCount < 1 ||
      imageCount > 12 ||
      imageCount !== globalIndexes.length ||
      !/^[a-f0-9]{64}$/i.test(String(summary?.inputDigest || "")) ||
      !/^[a-f0-9]{64}$/i.test(String(summary?.resultDigest || ""))
    ) {
      return false;
    }
    seenBatchIndexes.add(batchIndex);
    for (const globalIndex of globalIndexes) {
      if (
        !Number.isInteger(globalIndex) ||
        globalIndex < 1 ||
        !expectedIndexes.has(globalIndex) ||
        coveredIndexes.has(globalIndex)
      ) {
        return false;
      }
      coveredIndexes.add(globalIndex);
    }
  }
  return (
    coveredIndexes.size === expectedIndexes.size &&
    expectedGlobalIndexes.every((index) => coveredIndexes.has(index))
  );
}

export function harvestAnalyzedGlobalIndexes(
  selectedEvidenceAssetIds: readonly string[],
  analyzedEvidenceAssetIds: readonly string[]
) {
  const selectedIndexById = new Map<string, number>();
  for (const [index, rawId] of selectedEvidenceAssetIds.entries()) {
    const id = String(rawId || "").trim();
    if (!id || selectedIndexById.has(id)) return null;
    selectedIndexById.set(id, index + 1);
  }
  const indexes = analyzedEvidenceAssetIds.map((rawId) =>
    selectedIndexById.get(String(rawId || "").trim())
  );
  if (
    indexes.some((index) => index === undefined) ||
    new Set(indexes).size !== indexes.length
  ) {
    return null;
  }
  return indexes as number[];
}

export function savedHarvestAnalysis(run: ToolRun | null): TrichomeVisionResult | null {
  const outputs = (run?.outputs || run?.result || {}) as Record<string, any>;
  const photoAnalysis = outputs.photoAnalysis;
  if (!photoAnalysis || typeof photoAnalysis !== "object") return null;

  const receipt =
    photoAnalysis.analysisReceipt && typeof photoAnalysis.analysisReceipt === "object"
      ? photoAnalysis.analysisReceipt
      : {
          aiUsageEventId: photoAnalysis.aiUsageEventId,
          normalizedHarvestResultDigest: photoAnalysis.normalizedHarvestResultDigest,
          evidenceFingerprint: photoAnalysis.evidenceFingerprint,
          reviewPolicyVersion: photoAnalysis.reviewPolicyVersion
        };
  const v4Policy = receipt?.reviewPolicyVersion === HARVEST_AGGREGATE_POLICY;
  const selectedIds = Array.isArray(photoAnalysis.selectedEvidenceAssetIds)
    ? photoAnalysis.selectedEvidenceAssetIds.map(String)
    : [];
  const analyzedIds = Array.isArray(photoAnalysis.evidenceUsed)
    ? photoAnalysis.evidenceUsed.map(String)
    : [];
  const aggregate = photoAnalysis.aggregateReceipt;
  const analyzedGlobalIndexes = harvestAnalyzedGlobalIndexes(selectedIds, analyzedIds);
  const v4DeepReplaySecure =
    !v4Policy ||
    Boolean(
      photoAnalysis.analysisMode === "deep" &&
      selectedIds.length >= 13 &&
      selectedIds.length <= 80 &&
      analyzedIds.length >= 13 &&
      analyzedIds.length <= selectedIds.length &&
      new Set(analyzedIds).size === analyzedIds.length &&
      receipt?.evidenceFingerprint === [...selectedIds].sort().join("|") &&
      Number(photoAnalysis.imagesAnalyzed) === analyzedIds.length &&
      Number.isInteger(Number(photoAnalysis.batchCount)) &&
      Number(photoAnalysis.batchCount) >= 2 &&
      Number(photoAnalysis.batchCount) <= 7 &&
      Number(photoAnalysis.creditsQuoted) === Number(photoAnalysis.aiCreditsUsed) &&
      analyzedGlobalIndexes !== null &&
      harvestBatchSummariesCoverEvidence(
        photoAnalysis.batchSummaries,
        analyzedGlobalIndexes,
        Number(photoAnalysis.batchCount)
      ) &&
      aggregate?.kind === "harvest_vision_aggregate" &&
      aggregate?.version === 2 &&
      /^[a-f0-9]{64}$/.test(String(aggregate?.signature || "")) &&
      /^[A-Za-z0-9][A-Za-z0-9._:-]{2,79}$/.test(String(aggregate?.keyId || "")) &&
      receipt?.kind === aggregate.kind &&
      receipt?.version === aggregate.version &&
      receipt?.signature === aggregate.signature &&
      receipt?.keyId === aggregate.keyId &&
      /^[a-f0-9]{64}$/.test(String(aggregate?.manifestDigest || "")) &&
      aggregate?.manifestDigest === photoAnalysis.manifestDigest &&
      receipt?.manifestDigest === aggregate.manifestDigest &&
      /^[a-f0-9]{64}$/.test(String(aggregate?.selectedEvidenceDigest || "")) &&
      aggregate?.selectedEvidenceDigest === photoAnalysis.selectedEvidenceDigest &&
      receipt?.selectedEvidenceDigest === aggregate.selectedEvidenceDigest &&
      /^[a-f0-9]{64}$/.test(String(aggregate?.analyzedEvidenceDigest || "")) &&
      aggregate?.analyzedEvidenceDigest === photoAnalysis.analyzedEvidenceDigest &&
      receipt?.analyzedEvidenceDigest === aggregate.analyzedEvidenceDigest
    );
  const securelyAttested = Boolean(
    typeof photoAnalysis.photoUsable === "boolean" &&
    String(photoAnalysis.analysisId || "").trim() &&
    String(receipt?.aiUsageEventId || "").trim() &&
    /^[a-f0-9]{64}$/i.test(String(receipt?.normalizedHarvestResultDigest || "").trim()) &&
    String(receipt?.evidenceFingerprint || "").trim() &&
    isSupportedHarvestReviewPolicy(receipt?.reviewPolicyVersion) &&
    v4DeepReplaySecure
  );
  return securelyAttested
    ? ({ ...photoAnalysis, analysisReceipt: receipt } as TrichomeVisionResult)
    : null;
}

export function savedHarvestAnalysisOperationId(run: ToolRun | null) {
  const outputs = (run?.outputs || run?.result || {}) as Record<string, any>;
  const photoAnalysis = outputs.photoAnalysis;
  const restoredAnalysis = savedHarvestAnalysis(run);
  const operationId = String(photoAnalysis?.operationId || "").trim();
  return restoredAnalysis?.analysisMode === "deep" &&
    /^[A-Za-z0-9_-]{8,160}$/.test(operationId)
    ? operationId
    : "";
}

function percent(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric * 100)}%` : "unknown";
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] || character
  );
}

function arrayBufferBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const BufferConstructor = (globalThis as any)?.Buffer;
  if (BufferConstructor?.from) {
    return BufferConstructor.from(bytes).toString("base64");
  }
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  const encoder = (globalThis as any)?.btoa;
  if (typeof encoder !== "function") {
    throw new Error("This device could not prepare the selected private frame.");
  }
  return encoder(binary);
}

function normalizedJpegMimeType(value: unknown) {
  const mimeType = String(value || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  return mimeType === "image/jpeg" || mimeType === "image/jpg" ? "image/jpeg" : "";
}

export function harvestRetainedFrameExportCandidates(input: {
  sourceVideo: EvidenceAsset | null | undefined;
  extraction: EvidenceFrameExtraction | null | undefined;
  frames: readonly EvidenceAsset[];
}) {
  const { sourceVideo, extraction } = input;
  const sourceVideoId = persistedAssetId(sourceVideo);
  const preselection = extraction?.preselection;
  const selectedManifest = Array.isArray(preselection?.selected)
    ? preselection.selected
    : [];
  if (
    !sourceVideoId ||
    sourceVideo?.assetType !== "video" ||
    sourceVideo?.purpose !== "harvest" ||
    extraction?.status !== "completed" ||
    !String(extraction.version || "").trim() ||
    !Number.isInteger(extraction.attemptCount) ||
    extraction.attemptCount < 1 ||
    !selectedManifest.length ||
    selectedManifest.length !== Number(preselection?.selectedCount) ||
    input.frames.length !== selectedManifest.length ||
    selectedManifest.length > 80
  ) {
    return [] as HarvestRetainedFrameExportCandidate[];
  }

  const framesById = new Map<string, EvidenceAsset>();
  for (const asset of input.frames) {
    const id = persistedAssetId(asset);
    if (!id || framesById.has(id)) return [];
    framesById.set(id, asset);
  }
  const seenManifestIds = new Set<string>();
  const candidates: HarvestRetainedFrameExportCandidate[] = [];
  for (const selected of selectedManifest) {
    const id = String(selected?.evidenceAssetId || "").trim();
    const asset = framesById.get(id);
    if (
      !id ||
      seenManifestIds.has(id) ||
      !asset ||
      asset.assetType !== "photo" ||
      asset.source !== "generated" ||
      asset.purpose !== "harvest" ||
      asset.uploadStatus !== "uploaded" ||
      asset.aiUsable !== true ||
      normalizedJpegMimeType(asset.mimeType) !== "image/jpeg" ||
      String(asset.sourceVideoEvidenceAssetId || "") !== sourceVideoId ||
      String(asset.frameExtractionVersion || "") !== extraction.version ||
      Number(asset.frameExtractionAttempt) !== extraction.attemptCount ||
      Number(asset.frameIndex) !== Number(selected.frameIndex) ||
      !["anchor", "adjacent", "standalone"].includes(
        String(selected.sequenceRole || "")
      ) ||
      typeof selected.countingEligible !== "boolean" ||
      !protectedUploadId(asset)
    ) {
      return [];
    }
    const frameTimeSeconds = Number(
      asset.frameTimeSeconds ?? selected.requestedTimeSeconds
    );
    if (!Number.isFinite(frameTimeSeconds) || frameTimeSeconds < 0) return [];
    seenManifestIds.add(id);
    candidates.push({
      asset,
      frameNumber: Number(selected.frameIndex) + 1,
      frameTimeSeconds,
      sequenceRole: selected.sequenceRole,
      countingEligible: selected.countingEligible === true
    });
  }
  return candidates;
}

export function isShareableSignedHarvestResult(value: unknown) {
  const result = value as TrichomeVisionResult & { errorCode?: string };
  const receipt = result?.analysisReceipt;
  const revalidatedResult = savedHarvestAnalysis({
    outputs: { photoAnalysis: result }
  } as ToolRun);
  if (
    !result ||
    !revalidatedResult ||
    result.errorCode === "HARVEST_RESULT_DELETED" ||
    typeof result.photoUsable !== "boolean" ||
    result.creditStatus !== "charged" ||
    !Number.isInteger(Number(result.imagesAnalyzed)) ||
    Number(result.imagesAnalyzed) < 1 ||
    Number(result.imagesAnalyzed) > 80 ||
    !String(result.analysisId || "").trim() ||
    String(receipt?.aiUsageEventId || "") !== String(result.analysisId || "") ||
    !hex64(receipt?.normalizedHarvestResultDigest) ||
    !String(receipt?.evidenceFingerprint || "").trim() ||
    !isSupportedHarvestReviewPolicy(receipt?.reviewPolicyVersion)
  ) {
    return false;
  }

  if (receipt?.reviewPolicyVersion !== HARVEST_AGGREGATE_POLICY) return true;
  const aggregate = result.aggregateReceipt;
  return Boolean(
    result.analysisMode === "deep" &&
    aggregate?.kind === "harvest_vision_aggregate" &&
    aggregate?.version === 2 &&
    /^[a-f0-9]{64}$/.test(String(aggregate.signature || "")) &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{2,79}$/.test(String(aggregate.keyId || "")) &&
    hex64(aggregate.manifestDigest) &&
    aggregate.manifestDigest === result.manifestDigest &&
    hex64(aggregate.selectedEvidenceDigest) &&
    aggregate.selectedEvidenceDigest === result.selectedEvidenceDigest &&
    hex64(aggregate.analyzedEvidenceDigest) &&
    aggregate.analyzedEvidenceDigest === result.analyzedEvidenceDigest
  );
}

export function buildSignedHarvestResultShareText(result: TrichomeVisionResult) {
  if (!isShareableSignedHarvestResult(result)) {
    throw new Error("Only a completed, securely attested Harvest review can be shared.");
  }
  const qualityChecks = result.qualityChecks;
  const headDevelopmentSignals = Array.isArray(result.headDevelopmentSignals)
    ? result.headDevelopmentSignals
        .map(String)
        .filter((signal) => HARVEST_SHAREABLE_HEAD_DEVELOPMENT_SIGNALS.has(signal))
        .map((signal) => signal.replaceAll("_", " "))
    : [];
  const lines = [
    "GrowPathAI Harvest Readiness — server-attested image review",
    `Review status: ${
      result.photoUsable
        ? "qualified macro evidence"
        : result.visibleSampleEstimateUsable
          ? "visible sampled-area evidence only"
          : "better evidence needed"
    }`,
    `Images inspected: ${result.imagesAnalyzed} private stills or retained frames`,
    `Image quality: ${result.imageQuality}`,
    `Confidence: ${Math.round(Number(result.confidence || 0) * 100)}%`,
    result.photoUsable
      ? `Visible sampled areas: ${percent(result.clear)} clear, ${percent(
          result.cloudy
        )} cloudy, ${percent(result.amber)} amber`
      : "",
    result.visibleSampleEstimateUsable
      ? `Counted visible sampled heads: ${percent(result.sampleClear)} clear, ${percent(
          result.sampleCloudy
        )} cloudy, ${percent(
          result.sampleAmberMin ?? result.sampleAmber
        )} directly confirmed amber, up to ${percent(
          result.sampleAmberMax ?? result.sampleAmber
        )} possible amber`
      : "",
    qualityChecks
      ? `Evidence checks: focus ${qualityChecks.focus}; glare ${qualityChecks.glare}; lighting ${qualityChecks.lighting}; head detail ${qualityChecks.headVisibility}; site roles ${qualityChecks.roleCoverage}`
      : "",
    result.cloudinessObservation
      ? `Cloudiness observation: ${result.cloudinessObservation.replaceAll("_", " ")}`
      : "",
    result.headDevelopmentObservation
      ? `Visible head development: ${result.headDevelopmentObservation.replaceAll(
          "_",
          " "
        )}`
      : "",
    headDevelopmentSignals.length
      ? `Visible head-development signals: ${headDevelopmentSignals.join(", ")}`
      : "",
    "These percentages describe only the intact heads visible in the photographed sampled areas, not the whole plant and not chemistry or potency.",
    "This owner-selected share includes no source video, image files, rejected or unselected frames, notes, location/date metadata, evidence IDs, provider IDs, or receipt secrets.",
    "GrowPathAI evidence review — combine it with timing, pistils, calyx swelling, aroma, whole-plant maturity, and your own judgment.",
    "Learn more at https://growpathai.com"
  ];
  return lines.filter(Boolean).join("\n");
}

export async function shareSignedHarvestResult(result: TrichomeVisionResult) {
  const title = "GrowPathAI Harvest Readiness review";
  const message = buildSignedHarvestResultShareText(result);
  const navigatorObject = (globalThis as any)?.navigator;
  if (Platform.OS === "web") {
    if (typeof navigatorObject?.share === "function") {
      await navigatorObject.share({ title, text: message });
      return "web-share" as const;
    }
    if (typeof navigatorObject?.clipboard?.writeText === "function") {
      await navigatorObject.clipboard.writeText(message);
      return "web-clipboard" as const;
    }
  }
  await Share.share({ title, message });
  return "native-share" as const;
}

async function selectedFrameDataUrl(
  candidate: HarvestRetainedFrameExportCandidate,
  workspace: EvidenceWorkspaceScope,
  dependencies: ExportDependencies,
  remainingBytes: number
) {
  const uploadId = protectedUploadId(candidate.asset);
  if (!uploadId) {
    throw new Error("One selected retained frame is no longer available for export.");
  }
  const getPlayback = dependencies.getPlayback || getEvidenceUploadPlayback;
  const playback = await getPlayback(uploadId, workspace);
  const playbackUrl = String(playback?.playbackUrl || "").trim();
  if (!playbackUrl) {
    throw new Error("GrowPath could not authorize one selected retained frame.");
  }
  const fetchImpl = dependencies.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("This device cannot load the selected private frame for export.");
  }
  const response = await fetchImpl(playbackUrl);
  if (!response.ok) {
    throw new Error("One selected retained frame could not be loaded securely.");
  }
  const contentType = normalizedJpegMimeType(
    response.headers?.get?.("content-type") || candidate.asset.mimeType
  );
  if (contentType !== "image/jpeg") {
    throw new Error(
      "One selected retained frame was not the normalized JPEG retained by GrowPath."
    );
  }
  const declaredBytes = Number(response.headers?.get?.("content-length") || 0);
  if (Number.isFinite(declaredBytes) && declaredBytes > remainingBytes) {
    throw new Error(
      "This private package would exceed 24 MiB. Choose fewer retained frames and export another package afterward."
    );
  }
  const frameBytes = await response.arrayBuffer();
  if (frameBytes.byteLength > remainingBytes) {
    throw new Error(
      "This private package would exceed 24 MiB. Choose fewer retained frames and export another package afterward."
    );
  }
  return {
    dataUrl: `data:${contentType};base64,${arrayBufferBase64(frameBytes)}`,
    byteLength: frameBytes.byteLength
  };
}

export async function exportSelectedHarvestFrames(input: {
  candidates: readonly HarvestRetainedFrameExportCandidate[];
  selectedAssetIds: readonly string[];
  workspace: EvidenceWorkspaceScope;
  dependencies?: ExportDependencies;
}) {
  const dependencies = input.dependencies || {};
  const requestedIds = Array.from(
    new Set(
      input.selectedAssetIds
        .map(String)
        .map((id) => id.trim())
        .filter(Boolean)
    )
  );
  if (!requestedIds.length) {
    throw new Error("Select at least one retained frame to save or share.");
  }
  if (requestedIds.length > HARVEST_PRIVATE_FRAME_EXPORT_LIMIT) {
    throw new Error(
      `Choose no more than ${HARVEST_PRIVATE_FRAME_EXPORT_LIMIT} retained frames per private package. Export another package afterward for additional frames.`
    );
  }
  const candidateById = new Map(
    input.candidates.map((candidate) => [persistedAssetId(candidate.asset), candidate])
  );
  if (requestedIds.some((id) => !candidateById.has(id))) {
    throw new Error(
      "The selected frame set changed. Review the retained frames and select them again."
    );
  }
  const requestedSet = new Set(requestedIds);
  const selected = input.candidates.filter((candidate) =>
    requestedSet.has(persistedAssetId(candidate.asset))
  );
  if (
    !selected.length ||
    selected.length !== requestedIds.length ||
    selected.length > HARVEST_PRIVATE_FRAME_EXPORT_LIMIT
  ) {
    throw new Error("The selected retained-frame export is invalid.");
  }

  const declaredSelectedBytes = selected.reduce((total, candidate) => {
    const fileSizeBytes = Number(candidate.asset.fileSizeBytes || 0);
    return (
      total + (Number.isFinite(fileSizeBytes) && fileSizeBytes > 0 ? fileSizeBytes : 0)
    );
  }, 0);
  if (declaredSelectedBytes > HARVEST_PRIVATE_FRAME_EXPORT_BYTE_LIMIT) {
    throw new Error(
      "This private package would exceed 24 MiB. Choose fewer retained frames and export another package afterward."
    );
  }

  const rows: string[] = [];
  let exportedBytes = 0;
  for (const [index, candidate] of selected.entries()) {
    const loaded = await selectedFrameDataUrl(
      candidate,
      input.workspace,
      dependencies,
      HARVEST_PRIVATE_FRAME_EXPORT_BYTE_LIMIT - exportedBytes
    );
    exportedBytes += loaded.byteLength;
    rows.push(
      `<figure><img src="${loaded.dataUrl}" alt="Owner-selected retained frame ${
        index + 1
      }"><figcaption><strong>Selected frame ${index + 1}</strong> · video frame ${
        candidate.frameNumber
      } · ${candidate.frameTimeSeconds.toFixed(1)} seconds · ${escapeHtml(
        candidate.sequenceRole.replaceAll("_", " ")
      )}${
        candidate.countingEligible
          ? " · eligible as an independent counting anchor"
          : " · comparison-only; not an independent head tally"
      }</figcaption></figure>`
    );
  }

  const title = "GrowPathAI private Harvest retained frames";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:980px;margin:auto;padding:28px;color:#17231b}header,figure{border:1px solid #ccd8cf;border-radius:14px;padding:18px;margin:0 0 18px}img{display:block;max-width:100%;max-height:760px;object-fit:contain;margin:auto;border-radius:10px;background:#111}figcaption{margin-top:12px;line-height:1.5}.notice{background:#eef7f0}</style></head><body><header><h1>${title}</h1><p class="notice">This private package contains only the ${selected.length} retained video frame${
    selected.length === 1 ? "" : "s"
  } the owner explicitly selected. It contains no source video, rejected candidates, unselected frames, GPS/EXIF, private record IDs, storage URLs, AI receipt secrets, or unrelated account data. Exporting this file did not publish a GrowPath post or public link.</p><p>Retained frames remain sampled evidence. A comparison-only adjacent frame must not be counted as an independent head sample.</p></header>${rows.join(
    ""
  )}</body></html>`;
  const filename = `growpath-harvest-selected-frames-${selected.length}.html`;
  const platform = dependencies.platform || Platform.OS;
  if (platform === "web") {
    const documentObject = dependencies.documentObject || globalThis.document;
    const createObjectUrl = dependencies.createObjectUrl || URL.createObjectURL;
    const revokeObjectUrl = dependencies.revokeObjectUrl || URL.revokeObjectURL;
    if (!documentObject?.createElement || typeof createObjectUrl !== "function") {
      throw new Error("This browser cannot save the private frame package.");
    }
    const url = createObjectUrl(new Blob([html], { type: "text/html;charset=utf-8" }));
    const anchor = documentObject.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    documentObject.body?.appendChild(anchor);
    anchor.click();
    anchor.remove();
    revokeObjectUrl?.(url);
    return {
      method: "web-download" as const,
      exportedCount: selected.length,
      exportedBytes
    };
  }

  const fileSystem =
    dependencies.fileSystem ||
    (typeof require === "function" ? require("expo-file-system") : null);
  const sharing = dependencies.sharing || Sharing;
  if (
    !fileSystem?.cacheDirectory ||
    !fileSystem?.writeAsStringAsync ||
    !(await sharing.isAvailableAsync())
  ) {
    throw new Error(
      "Private file sharing is unavailable on this device. Open GrowPath in a browser to download the selected-frame package."
    );
  }
  const uri = `${fileSystem.cacheDirectory}${filename}`;
  await fileSystem.writeAsStringAsync(uri, html, {
    encoding: fileSystem.EncodingType?.UTF8
  });
  await sharing.shareAsync(uri, { mimeType: "text/html", dialogTitle: title });
  return {
    method: "native-share-file" as const,
    exportedCount: selected.length,
    exportedBytes
  };
}
