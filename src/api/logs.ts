// src/api/logs.ts
import { api } from "./client";

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
  const query = options?.growId ? `?growId=${encodeURIComponent(options.growId)}` : "";

  try {
    const res: any = await api.get(`/api/personal/logs${query}`);
    const logs = res?.data?.logs;
    return Array.isArray(logs) ? (logs as PersonalLog[]) : [];
  } catch (err) {
    console.error("[listPersonalLogs] Error:", err);
    return [];
  }
}
