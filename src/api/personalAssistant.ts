import { apiRequest } from "./apiRequest";

// Allow the existing 150-second provider deadline plus preparation/receipt time.
// A client timeout does not cancel the server operation or establish its charge.
export const PLANT_ID_REQUEST_TIMEOUT_MS = 180_000;
const PLANT_ID_PHOTO_WORKFLOWS = new Set([
  "species-crop-id", "species_crop_id", "species_crop_identification",
  "species-crop-identification"
]);

export type AssistantReference = {
  type: string;
  id?: string | null;
  title: string;
  timestamp?: string | null;
};

export type AssistantProposedWrite = {
  type: "create_task" | "draft_log" | string;
  payload: Record<string, any>;
};

export type AssistantSopRecommendation = {
  key: string;
  sourceVersion: number;
  title: string;
  category: string;
  summary: string;
  whyRecommended: string;
  checklist: string[];
  safetyNotes?: string;
  missingInformation: string[];
  reviewStatus: "review_required";
};

export type PersonalAssistantResponse = {
  success: boolean;
  intent?: string;
  reply?: string;
  actions?: { label: string; href: string }[];
  contextSummary?: Record<string, any>;
  referencedData?: AssistantReference[];
  proposedWrites?: AssistantProposedWrite[];
  sopRecommendations?: AssistantSopRecommendation[];
  provider?: string;
  providerLabel?: string;
  conversationId?: string;
  evidenceUsed?: string[];
  mediaAnalysis?: {
    requested?: boolean;
    photosAttached?: number;
    photosAnalyzed?: number;
    diagnosticViewsAnalyzed?: number;
    status?: string;
    provider?: string;
    providerModel?: string;
    providerLabel?: string;
  };
  analysisReceipt?: {
    aiUsageEventId: string;
    normalizedPlantIdResultDigest?: string;
    normalizedIpmResultDigest?: string;
    evidenceFingerprint: string;
    reviewPolicyVersion: string;
  };
  missingInformation?: string[];
  limitations?: string[];
  methodIds?: string[];
  sourceIds?: string[];
  citations?: Array<Record<string, any>>;
  disagreements?: Array<Record<string, any>>;
  agreementStatus?: string;
  aiCreditsUsed?: number;
  aiTokensRemaining?: number;
  creditNotice?: string;
};

export async function askPersonalAssistant(payload: {
  message: string;
  context: Record<string, any>;
  growId?: string;
  facilityId?: string;
  workspaceType?: "personal" | "commercial" | "facility";
  plantId?: string;
  sourceToolRunId?: string;
  conversationId?: string;
  evidenceAssetIds?: string[];
}): Promise<PersonalAssistantResponse> {
  const plantIdPhotos = Boolean(payload.evidenceAssetIds?.length) &&
    PLANT_ID_PHOTO_WORKFLOWS.has(String(payload.context?.workflow || "").trim().toLowerCase());
  return apiRequest<PersonalAssistantResponse>("/api/ai/assistant/personal", {
    method: "POST",
    body: payload,
    ...(plantIdPhotos ? { timeoutMs: PLANT_ID_REQUEST_TIMEOUT_MS, retries: 0 } : {})
  });
}
