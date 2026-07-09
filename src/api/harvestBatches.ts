import { apiRequest } from "./apiRequest";

export type DryCureRecordInput = {
  recordedAt?: string;
  stage?: "harvested" | "drying" | "trim" | "curing" | "stored" | "quality_review";
  tempF?: number | null;
  rh?: number | null;
  jarRh?: number | null;
  dewPointF?: number | null;
  waterActivity?: number | null;
  weight?: number | null;
  weightUnit?: string;
  aromaNotes?: string;
  textureNotes?: string;
  qualityNotes?: string;
  linkedToolRunId?: string | null;
};

export type HarvestBatchInput = {
  growId: string;
  plantIds?: string[];
  batchCode?: string;
  name: string;
  harvestedAt?: string;
  wetWeight?: number | null;
  dryWeight?: number | null;
  weightUnit?: string;
  dryStartedAt?: string | null;
  dryEndedAt?: string | null;
  cureStartedAt?: string | null;
  status?: "harvested" | "drying" | "curing" | "stored" | "archived";
  dryCureRecords?: DryCureRecordInput[];
  qualityNotes?: string;
  linkedToolRunIds?: string[];
};

export type HarvestBatch = HarvestBatchInput & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};

function normalizeHarvestBatch(response: any): HarvestBatch | null {
  const row =
    response?.harvestBatch ??
    response?.data?.harvestBatch ??
    response?.item ??
    response?.data?.item ??
    response;
  return row && typeof row === "object" ? (row as HarvestBatch) : null;
}

export async function listHarvestBatches(options?: {
  growId?: string;
}): Promise<HarvestBatch[]> {
  try {
    const response: any = await apiRequest("/api/personal/harvest-batches", {
      params: options?.growId ? { growId: options.growId } : undefined
    });
    const rows =
      response?.harvestBatches ?? response?.data?.harvestBatches ?? response?.items;
    return Array.isArray(rows) ? (rows as HarvestBatch[]) : [];
  } catch (_error) {
    return [];
  }
}

export async function createHarvestBatch(
  input: HarvestBatchInput
): Promise<HarvestBatch | null> {
  try {
    const response: any = await apiRequest("/api/personal/harvest-batches", {
      method: "POST",
      body: input
    });
    return normalizeHarvestBatch(response);
  } catch (_error) {
    return null;
  }
}

export async function getHarvestBatch(id: string): Promise<HarvestBatch | null> {
  try {
    const response: any = await apiRequest(
      `/api/personal/harvest-batches/${encodeURIComponent(id)}`
    );
    return normalizeHarvestBatch(response);
  } catch (_error) {
    return null;
  }
}

export async function updateHarvestBatch(
  id: string,
  patch: Partial<HarvestBatchInput>
): Promise<HarvestBatch | null> {
  try {
    const response: any = await apiRequest(
      `/api/personal/harvest-batches/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: patch
      }
    );
    return normalizeHarvestBatch(response);
  } catch (_error) {
    return null;
  }
}

export async function archiveHarvestBatch(id: string): Promise<boolean> {
  try {
    const response: any = await apiRequest(
      `/api/personal/harvest-batches/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );
    return Boolean(response?.archived ?? response?.deleted ?? response?.success);
  } catch (_error) {
    return false;
  }
}
