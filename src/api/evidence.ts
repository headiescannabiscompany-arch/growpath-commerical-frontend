import { apiRequest } from "@/api/apiRequest";
import type {
  EvidenceAsset,
  EvidenceAssetCreateInput,
  EvidenceLinks,
  EvidenceWorkspaceType,
  ProviderEvidencePayload
} from "@/types/evidence";

export type EvidenceWorkspaceScope = {
  workspaceType: EvidenceWorkspaceType;
  workspaceId?: string;
  facilityId?: string;
};

function normalizeEvidenceAsset(value: any): EvidenceAsset {
  return {
    ...value,
    id: String(value?.id || value?._id || ""),
    _id: value?._id ? String(value._id) : undefined,
    qualityWarnings: Array.isArray(value?.qualityWarnings)
      ? value.qualityWarnings.map(String)
      : []
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

export async function listEvidenceAssets(links: EvidenceLinks = {}) {
  const response = await apiRequest<any>("/api/evidence-assets", { params: links });
  const rows = Array.isArray(response?.assets) ? response.assets : [];
  return rows.map(normalizeEvidenceAsset);
}

export async function getEvidenceAssetsByIds(
  ids: readonly string[],
  workspace: EvidenceWorkspaceScope
) {
  const exactIds = Array.from(
    new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))
  );
  if (!exactIds.length) return [];
  if (exactIds.length > 50) {
    throw new Error("No more than 50 evidence assets can be recovered at once.");
  }
  const response = await apiRequest<any>("/api/evidence-assets", {
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
