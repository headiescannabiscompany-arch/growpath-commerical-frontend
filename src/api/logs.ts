// src/api/logs.ts
import { apiRequest } from "./apiRequest";

export interface PersonalLog {
  id: string;
  growId: string;
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
    const logs = res?.data?.logs;
    return Array.isArray(logs) ? (logs as PersonalLog[]) : [];
  } catch (err) {
    console.error("[listPersonalLogs] Error:", err);
    return [];
  }
}
