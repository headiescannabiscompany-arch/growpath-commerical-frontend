import { apiRequest } from "@/api/apiRequest";
import type {
  EvidenceAsset,
  EvidenceAssetCreateInput,
  EvidenceFrameExtractionStatus,
  EvidenceLinks,
  EvidenceWorkspaceType,
  ProviderEvidencePayload
} from "@/types/evidence";

export type EvidenceWorkspaceScope = {
  workspaceType: EvidenceWorkspaceType;
  workspaceId?: string;
  facilityId?: string;
};

export type EvidenceFrameExtraction = {
  status: EvidenceFrameExtractionStatus;
  attemptCount: number;
  version?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  retryable: boolean;
  frames: EvidenceAsset[];
};

export type EvidenceFrameExtractionResult = {
  sourceVideo: EvidenceAsset;
  extraction: EvidenceFrameExtraction;
};

export type ExtractEvidenceVideoFramesInput = EvidenceWorkspaceScope & {
  maxFrames?: number;
  purpose?: "crop_identification";
  growId?: string;
  plantId?: string;
};

const RETIRED_EVIDENCE_QUALITY_WARNINGS = new Set([
  "Harvest macro review may not resolve intact trichome heads at this resolution."
]);

function normalizeQualityWarnings(value: any) {
  if (!Array.isArray(value?.qualityWarnings)) return [];
  return value.qualityWarnings
    .map(String)
    .filter((warning: string) => !RETIRED_EVIDENCE_QUALITY_WARNINGS.has(warning));
}

function normalizeEvidenceAsset(value: any): EvidenceAsset {
  return {
    ...value,
    id: String(value?.id || value?._id || ""),
    _id: value?._id ? String(value._id) : undefined,
    // Persisted warnings describe the policy in effect when an asset was uploaded.
    // Retire only warnings that the current evidence policy has explicitly replaced;
    // preserve focus, glare, compression, lighting, and provenance findings.
    qualityWarnings: normalizeQualityWarnings(value)
  };
}

function normalizeFrameExtraction(value: any): EvidenceFrameExtraction {
  const status = String(value?.status || "idle") as EvidenceFrameExtractionStatus;
  const rawAttemptCount = Number(value?.attemptCount ?? 0);
  return {
    status: ["idle", "processing", "completed", "partial", "failed"].includes(status)
      ? status
      : "idle",
    attemptCount: Number.isFinite(rawAttemptCount)
      ? Math.max(0, Math.trunc(rawAttemptCount))
      : 0,
    version: value?.version ? String(value.version) : undefined,
    startedAt: value?.startedAt ? String(value.startedAt) : undefined,
    completedAt: value?.completedAt ? String(value.completedAt) : undefined,
    error: value?.error
      ? String(value.error)
      : value?.errorMessage
        ? String(value.errorMessage)
        : undefined,
    retryable: value?.retryable !== false,
    frames: (Array.isArray(value?.frames) ? value.frames : []).map(normalizeEvidenceAsset)
  };
}

function normalizeFrameExtractionResult(value: any): EvidenceFrameExtractionResult {
  const body = value?.data ?? value;
  return {
    sourceVideo: normalizeEvidenceAsset(body?.sourceVideo),
    extraction: normalizeFrameExtraction(body?.extraction)
  };
}

export function isTerminalEvidenceRegistrationError(error: any) {
  const status = Number(error?.status || 0);
  const code = String(error?.code || "").toUpperCase();
  if (
    code.includes("NETWORK") ||
    code === "TIMEOUT" ||
    code === "ABORTED" ||
    status >= 500
  ) {
    return false;
  }
  return [400, 413, 415, 422].includes(status);
}

export async function createEvidenceAsset(
  input: EvidenceAssetCreateInput,
  options: { signal?: AbortSignal } = {}
) {
  const response = await apiRequest<any>("/api/evidence-assets", {
    method: "POST",
    signal: options.signal,
    timeoutMs: 45000,
    body: input
  });
  return normalizeEvidenceAsset(response?.asset || response);
}

export async function listEvidenceAssets(
  links: EvidenceLinks & Partial<EvidenceWorkspaceScope> = {}
) {
  const response = await apiRequest<any>("/api/evidence-assets", { params: links });
  const rows = Array.isArray(response?.assets) ? response.assets : [];
  return rows.map(normalizeEvidenceAsset);
}

export async function getEvidenceAssetsByIds(
  ids: readonly string[],
  workspace: EvidenceWorkspaceScope,
  options: { signal?: AbortSignal } = {}
) {
  const exactIds = Array.from(
    new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))
  );
  if (!exactIds.length) return [];
  if (exactIds.length > 50) {
    throw new Error("No more than 50 evidence assets can be recovered at once.");
  }
  const response = await apiRequest<any>("/api/evidence-assets", {
    signal: options.signal,
    params: {
      ids: exactIds.join(","),
      workspaceType: workspace.workspaceType,
      ...(workspace.workspaceId ? { workspaceId: workspace.workspaceId } : {}),
      ...(workspace.facilityId ? { facilityId: workspace.facilityId } : {})
    }
  });
  const rows = Array.isArray(response?.assets) ? response.assets : [];
  return rows.map(normalizeEvidenceAsset);
}

export async function deleteEvidenceAsset(
  id: string,
  workspace: EvidenceWorkspaceScope,
  options: { signal?: AbortSignal; timeoutMs?: number } = {}
) {
  if (!id) return null;
  return apiRequest(`/api/evidence-assets/${encodeURIComponent(id)}`, {
    method: "DELETE",
    signal: options.signal,
    timeoutMs: options.timeoutMs ?? 5000,
    body: workspace
  });
}

export async function extractEvidenceVideoFrames(
  id: string,
  input: ExtractEvidenceVideoFramesInput,
  options: { signal?: AbortSignal } = {}
) {
  if (!String(id || "").trim()) {
    throw new Error("A saved source video is required before extracting still frames.");
  }
  const response = await apiRequest<any>(
    `/api/evidence-assets/${encodeURIComponent(id)}/extract-frames`,
    {
      method: "POST",
      signal: options.signal,
      timeoutMs: 45000,
      body: input
    }
  );
  return normalizeFrameExtractionResult(response);
}

export async function getEvidenceVideoFrameExtraction(
  id: string,
  workspace: EvidenceWorkspaceScope,
  options: { signal?: AbortSignal } = {}
) {
  if (!String(id || "").trim()) {
    throw new Error("A saved source video is required to check frame extraction.");
  }
  const response = await apiRequest<any>(
    `/api/evidence-assets/${encodeURIComponent(id)}/frame-extraction`,
    {
      signal: options.signal,
      timeoutMs: 30000,
      params: {
        workspaceType: workspace.workspaceType,
        ...(workspace.workspaceId ? { workspaceId: workspace.workspaceId } : {}),
        ...(workspace.facilityId ? { facilityId: workspace.facilityId } : {})
      }
    }
  );
  return normalizeFrameExtractionResult(response);
}

export function providerEvidencePayload(
  assets: EvidenceAsset[]
): ProviderEvidencePayload {
  const uploaded = assets.filter(
    (asset) => asset.uploadStatus === "uploaded" && Boolean(asset.durableUrl)
  );
  const media = uploaded.map((asset) => ({
    id: String(asset._id || asset.id),
    type: asset.assetType,
    url: String(asset.durableUrl),
    mimeType: asset.mimeType,
    source: asset.source,
    sourceVideoEvidenceAssetId: asset.sourceVideoEvidenceAssetId,
    frameExtractionVersion: asset.frameExtractionVersion,
    frameExtractionAttempt: asset.frameExtractionAttempt,
    frameIndex: asset.frameIndex,
    frameTimeSeconds: asset.frameTimeSeconds,
    frameTimeBasis: asset.frameTimeBasis,
    purpose: asset.purpose,
    qualityWarnings: asset.qualityWarnings || []
  }));
  return {
    evidenceAssetIds: media.map((asset) => asset.id).filter(Boolean),
    imageEvidenceAssetIds: media
      .filter((asset) => asset.type === "photo")
      .map((asset) => asset.id)
      .filter(Boolean),
    images: media.filter((asset) => asset.type === "photo").map((asset) => asset.url),
    videos: media.filter((asset) => asset.type === "video").map((asset) => asset.url),
    media
  };
}
