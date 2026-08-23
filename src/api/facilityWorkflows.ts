import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type EquipmentItem = {
  id?: string;
  _id?: string;
  name?: string;
  type?: string;
  roomId?: string;
  status?: string;
  version?: number;
  serviceIntervalDays?: number;
  calibrationIntervalDays?: number;
  nextMaintenance?: string;
  nextMaintenanceAt?: string;
  nextCalibrationAt?: string;
  spareParts?: string[];
  maintenanceLogs?: Array<{
    date?: string;
    details?: string;
    result?: string;
    nextDueAt?: string;
  }>;
  calibrationLogs?: Array<{
    date?: string;
    details?: string;
    result?: string;
    nextDueAt?: string;
  }>;
  provider?: string;
  metrics?: string[];
  integrationMapping?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

export type BatchCycle = {
  id?: string;
  _id?: string;
  name?: string;
  roomId?: string;
  stage?: string;
  status?: string;
  estimatedPlantCount?: number;
  startedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

function rows<T>(response: any, keys: string[]): T[] {
  if (Array.isArray(response)) return response as T[];
  for (const key of keys) {
    const value = response?.[key] ?? response?.data?.[key];
    if (Array.isArray(value)) return value as T[];
  }
  const items = response?.items ?? response?.data?.items;
  return Array.isArray(items) ? (items as T[]) : [];
}

export async function listEquipment(facilityId: string): Promise<EquipmentItem[]> {
  const response = await apiRequest(endpoints.equipment(facilityId), { method: "GET" });
  return rows<EquipmentItem>(response, ["equipment", "items"]);
}

export async function createEquipment(
  facilityId: string,
  data: {
    name: string;
    type?: string;
    roomId?: string;
    status?: string;
    serviceIntervalDays?: number;
    calibrationIntervalDays?: number;
    nextMaintenanceAt?: string;
    nextCalibrationAt?: string;
    spareParts?: string[];
    provider?: string;
    metrics?: string[];
    integrationMapping?: Record<string, any>;
  }
): Promise<EquipmentItem> {
  const response = await apiRequest(endpoints.equipment(facilityId), {
    method: "POST",
    body: data
  });
  return response?.created ?? response?.equipment ?? response?.item ?? response;
}

export async function recordEquipmentMaintenance(
  facilityId: string,
  equipmentId: string,
  data: {
    details: string;
    result?: string;
    nextDueAt?: string;
    sparePartsUsed?: string[];
  }
): Promise<EquipmentItem> {
  const response = await apiRequest(
    `${endpoints.equipmentItem(facilityId, equipmentId)}/maintenance`,
    {
      method: "POST",
      body: data
    }
  );
  return response?.equipment ?? response;
}

export async function recordEquipmentCalibration(
  facilityId: string,
  equipmentId: string,
  data: { details: string; result?: string; nextDueAt?: string }
): Promise<EquipmentItem> {
  const response = await apiRequest(
    `${endpoints.equipmentItem(facilityId, equipmentId)}/calibration`,
    {
      method: "POST",
      body: data
    }
  );
  return response?.equipment ?? response;
}

export async function archiveEquipment(
  facilityId: string,
  equipmentId: string,
  expectedVersion?: number
): Promise<void> {
  await apiRequest(endpoints.equipmentItem(facilityId, equipmentId), {
    method: "DELETE",
    body: expectedVersion ? { expectedVersion } : {}
  });
}

export async function listBatchCycles(
  facilityId: string,
  roomId?: string
): Promise<BatchCycle[]> {
  try {
    const response = await apiRequest(endpoints.batchCycles(facilityId), {
      method: "GET",
      params: roomId ? { roomId } : undefined
    });
    return rows<BatchCycle>(response, ["batchCycles", "cycles", "items"]);
  } catch {
    const fallback = await apiRequest("/api/batch-cycles", {
      method: "GET",
      params: { facility: facilityId, room: roomId }
    });
    return rows<BatchCycle>(fallback, ["batchCycles", "cycles", "items"]);
  }
}

export async function createBatchCycle(
  facilityId: string,
  data: {
    name: string;
    roomId: string;
    stage?: string;
    status?: string;
    estimatedPlantCount?: number;
    startedAt?: string;
  }
): Promise<BatchCycle> {
  try {
    const response = await apiRequest(endpoints.batchCycles(facilityId), {
      method: "POST",
      body: data
    });
    return response?.created ?? response?.batchCycle ?? response?.cycle ?? response;
  } catch {
    const fallback = await apiRequest("/api/batch-cycles", {
      method: "POST",
      body: { facilityId, ...data }
    });
    return fallback?.created ?? fallback?.batchCycle ?? fallback?.cycle ?? fallback;
  }
}

export async function deleteBatchCycle(facilityId: string, id: string) {
  try {
    const response = await apiRequest(endpoints.batchCycle(facilityId, id), {
      method: "DELETE"
    });
    return response?.deleted ?? response?.ok ?? response;
  } catch {
    const fallback = await apiRequest(`/api/batch-cycles/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    return fallback?.deleted ?? fallback?.ok ?? fallback;
  }
}
