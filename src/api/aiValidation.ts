import { apiRequest } from "./apiRequest";

export type AiVerifyRequest = {
  inferenceRunId: string;
  tool: string;
  fn: string;
  normalizedInput: Record<string, unknown>;
};

export type AiVerifyResponse = {
  verifierRunId: string;
  provider: string;
  modelVersion: string;
  output: Record<string, unknown>;
  confidence: number;
};

export type AiCompareRequest = {
  inferenceRunId: string;
  verifierRunId: string;
};

export type AiCompareResponse = {
  agreementScore: number;
  divergenceType: string;
  escalationRequired: boolean;
  normalizedComparison: Record<string, unknown>;
};

export type AiFeedbackRequest = {
  inferenceRunId: string;
  userDecision: "accepted" | "modified" | "rejected";
  actualAction: string;
  observedOutcome: string;
  notes?: string;
};

export type AiFeedbackResponse = {
  ok: boolean;
  feedbackId: string;
};

export type AiTrainingExportRequest = {
  facilityId?: string;
  startDate?: string;
  endDate?: string;
};

export function aiVerify(payload: AiVerifyRequest) {
  return apiRequest<AiVerifyResponse>("/api/ai/verify", {
    method: "POST",
    body: payload
  });
}

export function aiCompare(payload: AiCompareRequest) {
  return apiRequest<AiCompareResponse>("/api/ai/compare", {
    method: "POST",
    body: payload
  });
}

export function aiFeedback(payload: AiFeedbackRequest) {
  return apiRequest<AiFeedbackResponse>("/api/ai/feedback", {
    method: "POST",
    body: payload
  });
}

export function aiTrainingExport(payload: AiTrainingExportRequest = {}) {
  return apiRequest<Record<string, unknown>>("/api/ai/training/export", {
    method: "POST",
    body: payload
  });
}
