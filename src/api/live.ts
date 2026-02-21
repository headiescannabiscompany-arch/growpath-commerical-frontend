import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";

export type LiveSession = any;

export async function hostLiveSession(input: { displayName: string }) {
  return apiRequest(endpoints.liveHost, { method: "POST", body: input });
}

export async function joinLiveSession(input: { code: string; displayName: string }) {
  return apiRequest(endpoints.liveJoin, { method: "POST", body: input });
}

export async function endLiveSession(input: { sessionId: string }) {
  return apiRequest(endpoints.liveEnd, { method: "POST", body: input });
}
