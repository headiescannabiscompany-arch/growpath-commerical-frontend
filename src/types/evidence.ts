export type EvidenceAssetType = "photo" | "video" | "document";

export type EvidenceUploadStatus = "local" | "uploading" | "uploaded" | "failed";

export type EvidencePurpose =
  | "diagnosis"
  | "crop_identification"
  | "ipm"
  | "clone"
  | "tissue_culture"
  | "harvest"
  | "pheno"
  | "course"
  | "forum"
  | "product"
  | "grow_log"
  | "other";

export type EvidenceSource = "camera" | "library" | "upload" | "generated" | "external";

export type EvidenceWorkspaceType = "personal" | "commercial" | "facility";

export type EvidenceFrameExtractionStatus =
  | "idle"
  | "processing"
  | "completed"
  | "partial"
  | "failed";

export type EvidenceFrameExtractionRecord = {
  status: EvidenceFrameExtractionStatus;
  attemptCount?: number;
  version?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  errorMessage?: string;
  frameAssetIds?: string[];
  frameCount?: number;
};

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
  /** Parent private source-video EvidenceAsset for an extracted still frame. */
  sourceVideoEvidenceAssetId?: string;
};

export type EvidenceAsset = EvidenceLinks & {
  id: string;
  _id?: string;
  workspaceType?: EvidenceWorkspaceType;
  workspaceId?: string;
  clientUploadKey?: string;
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
  /** Durable server-side still-frame extraction state for a private source video. */
  frameExtraction?: EvidenceFrameExtractionRecord;
  /** Canonical server extraction metadata for a generated still frame. */
  frameExtractionVersion?: string;
  frameExtractionAttempt?: number;
  frameIndex?: number;
  frameTimeSeconds?: number;
  frameTimeBasis?: "requested" | "actual";
  createdAt?: string;
  updatedAt?: string;
};

export type EvidenceAssetCreateInput = Omit<
  EvidenceAsset,
  "id" | "_id" | "createdAt" | "updatedAt"
>;

export type ProviderEvidencePayload = {
  /** All durable uploaded evidence IDs. Use this for persistence and audit trails. */
  evidenceAssetIds: string[];
  /** Durable uploaded photo IDs only. Use this for photo-analysis API requests. */
  imageEvidenceAssetIds: string[];
  images: string[];
  videos: string[];
  media: Array<{
    id: string;
    type: EvidenceAssetType;
    url: string;
    mimeType?: string;
    source?: EvidenceSource;
    sourceVideoEvidenceAssetId?: string;
    frameExtractionVersion?: string;
    frameExtractionAttempt?: number;
    frameIndex?: number;
    frameTimeSeconds?: number;
    frameTimeBasis?: "requested" | "actual";
    purpose: EvidencePurpose;
    qualityWarnings: string[];
  }>;
};
