import type { EvidenceAsset } from "@/types/evidence";

function assetId(asset: EvidenceAsset) {
  return String(asset._id || asset.id || "");
}

function isRestorableHarvestAsset(asset: EvidenceAsset, growId: string) {
  return (
    asset.purpose === "harvest" &&
    String(asset.growId || "") === growId &&
    asset.uploadStatus === "uploaded" &&
    Boolean(asset.durableUrl)
  );
}

export function restorableHarvestEvidence(
  assets: readonly EvidenceAsset[],
  growId: string,
  maximumImages = 80
) {
  const eligible = assets.filter((asset) => isRestorableHarvestAsset(asset, growId));
  const sourceVideo = eligible.find((asset) => asset.assetType === "video");
  const sourceVideoId = sourceVideo ? assetId(sourceVideo) : "";
  const photos = eligible
    .filter((asset) => {
      if (asset.assetType !== "photo") return false;
      if (growId || !sourceVideoId) return true;
      return String(asset.sourceVideoEvidenceAssetId || "") === sourceVideoId;
    })
    .slice(0, maximumImages);

  return sourceVideo ? [...photos, sourceVideo] : photos;
}
