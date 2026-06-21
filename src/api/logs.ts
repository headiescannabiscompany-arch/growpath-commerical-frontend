// src/api/logs.ts
import { apiRequest } from "./apiRequest";

export interface PersonalLog {
  id: string;
  growId: string;
  type?: string;
  date: string;
  title: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export async function listPersonalLogs(options?: {
  growId?: string;
}): Promise<PersonalLog[]> {
  try {
    const res: any = await apiRequest(`/api/personal/logs`, {
      params: options?.growId ? { growId: options.growId } : undefined
    });
    const logs = res?.data?.logs ?? res?.logs ?? res?.items;
    return Array.isArray(logs) ? (logs as PersonalLog[]) : [];
  } catch (err) {
    console.error("[listPersonalLogs] Error:", err);
    return [];
  }
}

export async function createPersonalLog(data: {
  growId: string;
  plantId?: string;
  diagnosisId?: string;
  type?: string;
  date?: string;
  title: string;
  notes?: string;
  tags?: string[];
}): Promise<PersonalLog | null> {
  try {
    const response: any = await apiRequest("/api/personal/logs", {
      method: "POST",
      body: data
    });
    return (response?.created ??
      response?.log ??
      response?.data?.log ??
      response) as PersonalLog;
  } catch (_error) {
    return null;
  }
}
