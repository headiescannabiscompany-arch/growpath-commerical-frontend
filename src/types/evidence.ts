export type EvidenceAssetType = "photo" | "video" | "document";

export type EvidenceUploadStatus = "local" | "uploading" | "uploaded" | "failed";

export type EvidencePurpose =
  | "diagnosis"
  | "ipm"
  | "clone"
  | "harvest"
  | "pheno"
  | "course"
  | "forum"
  | "product"
  | "grow_log"
  | "other";

export type EvidenceSource = "camera" | "library" | "upload" | "generated" | "external";

export type EvidenceLinks = {
  facilityId?: string;
  growId?: string;
  plantId?: string;
  phenoPlantId?: string;
  logId?: string;
  toolRunId?: string;
  diagnosisId?: string;
  courseId?: string;
  forumPostId?: string;
};

export type EvidenceAsset = EvidenceLinks & {
  id: string;
  _id?: string;
  assetType: EvidenceAssetType;
  originalUri: string;
  durableUrl?: string;
  thumbnailUrl?: string;
  mimeType?: string;
  fileName?: string;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  source: EvidenceSource;
  purpose: EvidencePurpose;
  uploadStatus: EvidenceUploadStatus;
  aiUsable?: boolean;
  qualityWarnings: string[];
  error?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EvidenceAssetCreateInput = Omit<
  EvidenceAsset,
  "id" | "_id" | "createdAt" | "updatedAt"
>;

export type ProviderEvidencePayload = {
  evidenceAssetIds: string[];
  images: string[];
  videos: string[];
  media: Array<{
    id: string;
    type: EvidenceAssetType;
    url: string;
    mimeType?: string;
    purpose: EvidencePurpose;
    qualityWarnings: string[];
  }>;
};
