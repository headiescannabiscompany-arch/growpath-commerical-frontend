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

export type EvidenceSourceCaptureMetadata = {
  latitude?: number;
  longitude?: number;
  /** Absolute instant only when the source supplied a timezone or offset. */
  capturedAt?: string;
  /** Camera-local calendar date retained without inventing a timezone. */
  capturedLocalDate?: string;
  captureDatePrecision?: "date" | "instant";
  /** Private picker/file metadata offered back to the owner for confirmation. */
  source: "picker_exif";
};

export type AiInspectionView = {
  sourceEvidenceAssetId: string;
  workspaceType?: EvidenceWorkspaceType;
  workspaceId?: string;
  facilityId?: string;
  sourceImageIndex: number;
  kind: string;
  cropStrategy: "focus" | "coverage" | "macro_coverage";
  sourceBounds?: {
    left: number;
    top: number;
    width: number;
    height: number;
    sourceWidth: number;
    sourceHeight: number;
  } | null;
  width: number;
  height: number;
  mimeType: "image/jpeg";
  sha256: string;
  dataUrl?: string;
  limitation?: string;
};

export type EvidenceFrameExtractionStatus =
  | "idle"
  | "processing"
  | "completed"
  | "partial"
  | "failed";

export type EvidenceFramePreselectionRecord = {
  policyVersion: string;
  candidateIntervalSeconds?: number;
  candidateLimit: number;
  sampledCount: number;
  qualityUsableCount: number;
  qualityRejectedCount: number;
  rejectedReasons: {
    decodeError: number;
    invalidMetrics: number;
    obviousBlur: number;
    underexposed: number;
    overexposedOrGlare: number;
  };
  distinctCandidateCount: number;
  duplicateCandidateCount: number;
  duplicateClusterCount: number;
  targetFrameCount: number;
  selectedCount: number;
  coveredBucketCount: number;
  selectedBytesTotal: number;
  selectedByteLimit: number;
  selected: Array<{
    frameIndex: number;
    evidenceAssetId: string;
    candidateIndex: number;
    requestedTimeSeconds: number;
    qualityScore: number;
    coverageBucket: number;
    sequenceGroupId?: string;
    sequenceRole: "anchor" | "adjacent" | "standalone";
    countingEligible: boolean;
  }>;
};

export type EvidenceFrameExtractionRecord = {
  status: EvidenceFrameExtractionStatus;
  attemptCount?: number;
  /** Exact user-selected retained-frame request ceiling for retry/reload fidelity. */
  requestedFrameCount?: number;
  version?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  errorMessage?: string;
  errorCode?: string;
  retryable?: boolean;
  cleanupPending?: boolean;
  frameAssetIds?: string[];
  frameCount?: number;
  partialFrameCount?: number;
  /** Bounded audit summary; rejected ephemeral candidates are never retained as assets. */
  preselection?: EvidenceFramePreselectionRecord;
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
  /** Private original-capture metadata retained before any upload normalization. */
  sourceCaptureMetadata?: EvidenceSourceCaptureMetadata;
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
