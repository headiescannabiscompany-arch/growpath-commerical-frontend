import { apiRequest } from "./apiRequest";

export type FormSuggestion = {
  field: string;
  value: unknown;
  confidence: "low" | "medium" | "high";
  source: "stated" | "calculated" | "inferred";
  rationale: string;
};

export type FormAssistantResponse = {
  success: true;
  suggestions: FormSuggestion[];
  questions: string[];
  assumptions: FormSuggestion[];
  warnings: string[];
  provider: string;
};

export function askFormAssistant(input: {
  formType: "facility_room";
  description: string;
  facilityId?: string;
  existingValues?: Record<string, unknown>;
  knownContext?: Record<string, unknown>;
}) {
  return apiRequest<FormAssistantResponse>("/api/ai/assistant/form", {
    method: "POST",
    body: input
  });
}
