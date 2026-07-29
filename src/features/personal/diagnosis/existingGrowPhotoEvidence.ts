import type { PersonalLog } from "@/api/logs";
import type { EvidenceAssetCreateInput, EvidencePurpose } from "@/types/evidence";

export type ExistingGrowPhotoCandidate = {
  id: string;
  url: string;
  title: string;
  capturedAt: string;
  growId: string;
  plantId?: string;
  logId: string;
  mimeType?: string;
  width?: number;
  height?: number;
};

function logId(log: PersonalLog) {
  return String(log.id || (log as PersonalLog & { _id?: string })._id || "");
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function existingGrowPhotoCandidates(
  logs: PersonalLog[],
  growId: string,
  limit = 12
): ExistingGrowPhotoCandidate[] {
  if (!growId) return [];
  const candidates = logs
    .filter((log) => String(log.growId || "") === growId)
    .flatMap((log) => {
      const sourceLogId = logId(log);
      return (log.photos || []).flatMap((photo, index) => {
        const metadata = log.photoMetadata?.[index];
        const url = clean(metadata?.url) || clean(photo);
        if (!sourceLogId || !url) return [];
        return [
          {
            id: `${sourceLogId}:${index}`,
            url,
            title: clean(log.title) || `Grow photo ${index + 1}`,
            capturedAt:
              clean(metadata?.createdAt) || clean(log.date) || clean(log.createdAt),
            growId,
            plantId: clean(metadata?.plantId) || clean(log.plantId) || undefined,
            logId: sourceLogId,
            mimeType: clean(metadata?.mimeType) || undefined,
            width:
              Number.isFinite(Number(metadata?.width)) && Number(metadata?.width) > 0
                ? Number(metadata?.width)
                : undefined,
            height:
              Number.isFinite(Number(metadata?.height)) && Number(metadata?.height) > 0
                ? Number(metadata?.height)
                : undefined
          }
        ];
      });
    })
    .sort(
      (a, b) =>
        new Date(b.capturedAt || 0).getTime() - new Date(a.capturedAt || 0).getTime()
    );
  const seen = new Set<string>();
  return candidates
    .filter((candidate) => {
      if (seen.has(candidate.url)) return false;
      seen.add(candidate.url);
      return true;
    })
    .slice(0, Math.max(0, limit));
}

export function existingGrowPhotoEvidenceInput(
  candidate: ExistingGrowPhotoCandidate,
  selectedPlantId = "",
  purpose: EvidencePurpose = "diagnosis"
): EvidenceAssetCreateInput {
  return {
    growId: candidate.growId,
    plantId: candidate.plantId || selectedPlantId || undefined,
    logId: candidate.logId,
    assetType: "photo",
    originalUri: candidate.url,
    durableUrl: candidate.url,
    mimeType: candidate.mimeType,
    width: candidate.width,
    height: candidate.height,
    source: "upload",
    purpose,
    uploadStatus: "uploaded",
    aiUsable: true,
    qualityWarnings: []
  };
}
