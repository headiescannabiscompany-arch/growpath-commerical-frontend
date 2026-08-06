import { apiRequest } from "@/api/apiRequest";
import type {
  EvidenceAsset,
  EvidenceAssetCreateInput,
  EvidenceLinks,
  ProviderEvidencePayload
} from "@/types/evidence";

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

export async function deleteEvidenceAsset(
  id: string,
  workspace: {
    workspaceType: "personal" | "commercial" | "facility";
    workspaceId?: string;
    facilityId?: string;
  },
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
