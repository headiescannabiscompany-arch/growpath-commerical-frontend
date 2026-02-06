import { api } from "@/api/client";
import { endpoints } from "@/api/endpoints";

export type LiveSession = any;

export async function hostLiveSession(input: { displayName: string }) {
  return api.post(endpoints.liveHost, input);
}

export async function joinLiveSession(input: { code: string; displayName: string }) {
  return api.post(endpoints.liveJoin, input);
}

export async function endLiveSession(input: { sessionId: string }) {
  return api.post(endpoints.liveEnd, input);
}
