import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import type {
  DeviationsSummaryResponse,
  SopsRecommendedResponse,
  Severity
} from "./complianceDashboardApi.contract";

function unwrapPayload(raw: any): any {
  if (!raw) return {};
  if (raw?.data && typeof raw.data === "object") return raw.data;
  return raw;
}

function isSeverity(x: any): x is Severity {
  return x === "LOW" || x === "MED" || x === "HIGH";
}

export function normalizeDeviationsSummary(
  rawAny: any,
  facilityId: string
): DeviationsSummaryResponse {
  const raw = unwrapPayload(rawAny);

  const recurring = Array.isArray(raw?.recurringDeviations)
    ? raw.recurringDeviations
    : [];

  // ALWAYS an array (never undefined)
  const open = Array.isArray(raw?.openDeviations) ? raw.openDeviations : [];

  return {
    success: true,
    facilityId: String(raw?.facilityId ?? facilityId),

    recurringDeviations: recurring
      .map((d: any) => ({
        code: String(d?.code ?? ""),
        label: String(d?.label ?? d?.code ?? ""),
        // Clamp count to >= 0
        count: Number.isFinite(d?.count) ? Math.max(0, Number(d.count)) : 0,
        lastSeenAt: String(d?.lastSeenAt ?? ""),
        severity: isSeverity(d?.severity) ? d.severity : "LOW"
      }))
      .filter((d: any) => d.code && d.lastSeenAt),

    openDeviations: open
      .map((d: any) => ({
        id: String(d?.id ?? ""),
        code: String(d?.code ?? ""),
        label: String(d?.label ?? d?.code ?? ""),
        openedAt: String(d?.openedAt ?? ""),
        severity: isSeverity(d?.severity) ? d.severity : "LOW"
      }))
      .filter((d: any) => d.id && d.code && d.openedAt),

    generatedAt: raw?.generatedAt ? String(raw.generatedAt) : undefined,
    window: raw?.window ? String(raw.window) : undefined
  };
}

export function normalizeSopsRecommended(
  rawAny: any,
  facilityId: string
): SopsRecommendedResponse {
  const rawPayload = unwrapPayload(rawAny);
  const sops = Array.isArray(rawPayload?.recommendedSops)
    ? rawPayload.recommendedSops
    : [];
  return {
    success: true,
    facilityId: String(rawPayload?.facilityId ?? facilityId),
    recommendedSops: sops
      .map((s: any) => ({
        sopId: String(s?.sopId ?? ""),
        title: String(s?.title ?? ""),
        reason: String(s?.reason ?? "")
      }))
      .filter((s: any) => s.sopId && s.title),
    generatedAt: rawPayload?.generatedAt ? String(rawPayload.generatedAt) : undefined,
    window: rawPayload?.window ? String(rawPayload.window) : undefined
  };
}

export async function fetchDeviationsSummary(
  facilityId: string
): Promise<DeviationsSummaryResponse> {
  const deviationsRes = await apiRequest(
    endpoints.compliance.deviationsSummary(facilityId),
    {
    method: "GET"
    }
  );
  return normalizeDeviationsSummary(deviationsRes, facilityId);
}

export async function fetchSopsRecommended(
  facilityId: string
): Promise<SopsRecommendedResponse> {
  const sopsRes = await apiRequest(endpoints.compliance.sopsRecommended(facilityId), {
    method: "GET"
  });
  return normalizeSopsRecommended(sopsRes, facilityId);
}

