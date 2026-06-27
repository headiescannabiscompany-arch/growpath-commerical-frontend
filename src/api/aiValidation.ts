import { apiRequest } from "./apiRequest";

export type AiVerifyRequest = {
  prediction: Record<string, unknown>;
  observed: Record<string, unknown>;
};

export type AiVerifyResponse = {
  success: boolean;
  status: string;
  confidence: number;
  checks: Array<Record<string, unknown>>;
};

export type AiCompareRequest = {
  baseline: Record<string, unknown>;
  candidate: Record<string, unknown>;
};

export type AiCompareResponse = {
  success: boolean;
  summary: Record<string, unknown>;
  comparisons: Array<Record<string, unknown>>;
};

export type AiFeedbackRequest = {
  targetType: string;
  targetId: string;
  rating: number;
  comment?: string;
  labels?: string[];
};

export type AiFeedbackResponse = {
  success: boolean;
  feedbackId: string;
  queueStatus: string;
  received: Record<string, unknown>;
};

export type AiTrainingExportRequest = {
  format?: "json" | "csv";
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
  const format = payload.format ? `?format=${encodeURIComponent(payload.format)}` : "";
  return apiRequest<Record<string, unknown>>(`/api/ai/training/export${format}`);
}
