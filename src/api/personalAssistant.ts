import { apiRequest } from "./apiRequest";

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

export type PersonalAssistantResponse = {
  success: boolean;
  intent?: string;
  reply?: string;
  actions?: { label: string; href: string }[];
  contextSummary?: Record<string, any>;
  referencedData?: AssistantReference[];
  proposedWrites?: AssistantProposedWrite[];
  provider?: string;
  providerLabel?: string;
  conversationId?: string;
  evidenceUsed?: string[];
  missingInformation?: string[];
  limitations?: string[];
  methodIds?: string[];
  sourceIds?: string[];
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
  conversationId?: string;
  evidenceAssetIds?: string[];
}): Promise<PersonalAssistantResponse> {
  return apiRequest<PersonalAssistantResponse>("/api/ai/assistant/personal", {
    method: "POST",
    body: payload
  });
}
