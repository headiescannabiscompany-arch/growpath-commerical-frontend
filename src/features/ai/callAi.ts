import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";

/**
 * Contract: facility-scoped AI call.
 * Canonical backend path: POST /api/facility/:facilityId/ai/call
 *
 * This helper prefers endpoints.* if present; otherwise falls back to the canonical path.
 */
function getAiCallUrl(facilityId: string): string {
  const anyEndpoints: any = endpoints as any;

  if (typeof anyEndpoints.aiCall === "function") return anyEndpoints.aiCall(facilityId);
  if (typeof anyEndpoints.facilityAiCall === "function")
    return anyEndpoints.facilityAiCall(facilityId);

  return `/api/facility/${facilityId}/ai/call`;
}

export type AiCallPayload = {
  tool: string;
  fn: string;
  args: any;
  context?: {
    facilityId?: string;
    growId?: string | null;
    roomId?: string | null;
    mediaId?: string | null;
    notes?: string | null;
  };
};

export async function callAiTool(facilityId: string, payload: AiCallPayload) {
  const url = getAiCallUrl(facilityId);

  return apiRequest(url, { method: "POST", body: payload });
}
