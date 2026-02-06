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

interface PersonalLogsResponse {
  ok: boolean;
  data: {
    logs: PersonalLog[];
  };
}

/**
 * Fetch logs for the authenticated personal mode user.
 * Optionally filter by growId.
 */
export async function listPersonalLogs(options?: {
  growId?: string;
}): Promise<PersonalLog[]> {
  try {
    const query = options?.growId ? `?growId=${encodeURIComponent(options.growId)}` : "";
    const res = await api.get(`/api/personal/logs${query}`);

    if (
      typeof res === "object" &&
      res !== null &&
      "data" in res &&
      res.data &&
      "logs" in res.data
    ) {
      return res.data.logs as PersonalLog[];
    }
    return [];
  } catch (err) {
    console.error("[listPersonalLogs] Error:", err);
    return [];
  }
}
