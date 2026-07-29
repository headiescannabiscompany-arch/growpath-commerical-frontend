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

export async function createEvidenceAsset(input: EvidenceAssetCreateInput) {
  const response = await apiRequest<any>("/api/evidence-assets", {
    method: "POST",
    body: input
  });
  return normalizeEvidenceAsset(response?.asset || response);
}

export async function listEvidenceAssets(links: EvidenceLinks = {}) {
  const response = await apiRequest<any>("/api/evidence-assets", { params: links });
  const rows = Array.isArray(response?.assets) ? response.assets : [];
  return rows.map(normalizeEvidenceAsset);
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
    images: media.filter((asset) => asset.type === "photo").map((asset) => asset.url),
    videos: media.filter((asset) => asset.type === "video").map((asset) => asset.url),
    media
  };
}
