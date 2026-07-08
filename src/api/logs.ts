// src/api/logs.ts
import { apiRequest } from "./apiRequest";

export interface PersonalLog {
  id: string;
  growId: string;
  plantId?: string;
  linkedPlantId?: string;
  diagnosisId?: string;
  toolRunId?: string;
  linkedToolRunId?: string;
  linkedGrowId?: string;
  type?: string;
  date: string;
  title: string;
  notes: string;
  photos?: string[];
  photoMetadata?: PersonalLogPhotoMetadata[];
  tags?: string[];
  rejectedTags?: string[];
  aiInsight?: {
    summary?: string;
    missingData?: string[];
    suggestedTask?: string;
    source?: string;
    acceptedTags?: string[];
    rejectedTags?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface PersonalLogPhotoMetadata {
  userId?: string;
  growId?: string;
  plantId?: string | null;
  logId?: string | null;
  url: string;
  storageKey?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  stage?: string | null;
  consentForAI?: boolean;
  consentForTraining?: boolean;
  createdAt?: string;
}

function normalizePersonalLog(response: any): PersonalLog | null {
  const log =
    response?.data?.log ??
    response?.data?.item ??
    response?.log ??
    response?.item ??
    response;
  if (!log || typeof log !== "object") return null;
  return log as PersonalLog;
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
  } catch (_err) {
    return [];
  }
}

export async function createPersonalLog(data: {
  growId: string;
  plantId?: string;
  linkedPlantId?: string;
  diagnosisId?: string;
  toolRunId?: string;
  linkedToolRunId?: string;
  linkedGrowId?: string;
  type?: string;
  date?: string;
  title: string;
  notes?: string;
  photos?: string[];
  photoMetadata?: PersonalLogPhotoMetadata[];
  tags?: string[];
  rejectedTags?: string[];
  aiInsight?: PersonalLog["aiInsight"];
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

export async function getPersonalLog(id: string): Promise<PersonalLog | null> {
  try {
    const response: any = await apiRequest(
      `/api/personal/logs/${encodeURIComponent(id)}`
    );
    return normalizePersonalLog(response);
  } catch (_error) {
    return null;
  }
}

export async function updatePersonalLog(
  id: string,
  patch: Partial<
    Pick<
      PersonalLog,
      | "title"
      | "date"
      | "notes"
      | "photos"
      | "photoMetadata"
      | "type"
      | "plantId"
      | "linkedPlantId"
      | "diagnosisId"
      | "toolRunId"
      | "linkedToolRunId"
      | "linkedGrowId"
      | "tags"
      | "rejectedTags"
      | "aiInsight"
    >
  >
): Promise<PersonalLog | null> {
  try {
    const response: any = await apiRequest(
      `/api/personal/logs/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: patch
      }
    );
    return normalizePersonalLog(response);
  } catch (_error) {
    return null;
  }
}

export async function deletePersonalLog(id: string): Promise<boolean> {
  try {
    await apiRequest(`/api/personal/logs/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    return true;
  } catch (_error) {
    return false;
  }
}
