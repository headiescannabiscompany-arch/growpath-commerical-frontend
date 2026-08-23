import { apiRequest } from "@/api/apiRequest";
import {
  requireBusinessDeskWorkspace,
  type BusinessDeskWorkspace
} from "@/api/businessDesk";

export type HorticultureEvidenceLink = {
  type:
    | "photo"
    | "video"
    | "plant_id"
    | "diagnosis"
    | "product_label"
    | "external_reference";
  id: string;
  label?: string;
  observedAt?: string | null;
};

export type HorticultureRecord = {
  _id: string;
  title: string;
  recordType: "plant_intake" | "product_help" | "nursery_batch";
  lifecycleStatus: "draft" | "active" | "held" | "complete" | "archived";
  crop: {
    commonName?: string;
    scientificName?: string;
    cultivar?: string;
    environment?: string;
    observedSymptoms?: string[];
  };
  inventoryItemId?: string | null;
  inventoryLotId?: string | null;
  nursery: {
    propagationBatchCode?: string;
    benchZone?: string;
    stage?: string;
    quarantineStatus: "not_assessed" | "clear" | "held" | "released";
  };
  productLabel: {
    present: boolean;
    reviewed: boolean;
    productName?: string;
    guaranteedAnalysis?: string;
    ingredients?: string;
    cropUseConstraints?: string;
    reviewedAt?: string | null;
  };
  fulfillment: {
    mediaComplete: boolean;
    careCardComplete: boolean;
    packingReviewComplete: boolean;
    readiness: "needs_review" | "blocked" | "ready_for_human_confirmation";
    reasons: string[];
    evaluatedAt?: string | null;
  };
  evidenceLinks: HorticultureEvidenceLink[];
  careHistory: Array<{
    _id?: string;
    eventType: string;
    occurredAt: string;
    notes: string;
    evidenceLinks: HorticultureEvidenceLink[];
  }>;
  __v: number;
  updatedAt?: string;
};

export type HorticultureRecordDraft = Omit<
  HorticultureRecord,
  "_id" | "careHistory" | "__v" | "updatedAt" | "fulfillment"
> & {
  fulfillment: Pick<
    HorticultureRecord["fulfillment"],
    "mediaComplete" | "careCardComplete" | "packingReviewComplete"
  >;
};

export function horticultureBase(workspace: BusinessDeskWorkspace) {
  const selected = requireBusinessDeskWorkspace(workspace);
  return selected.workspaceType === "facility"
    ? `/api/facility/${encodeURIComponent(selected.facilityId)}/horticulture`
    : "/api/horticulture";
}

export async function listHorticultureRecords(workspace: BusinessDeskWorkspace) {
  const response = await apiRequest(horticultureBase(workspace));
  return (response?.records || []) as HorticultureRecord[];
}

export async function createHorticultureRecord(
  workspace: BusinessDeskWorkspace,
  draft: HorticultureRecordDraft
) {
  const response = await apiRequest(horticultureBase(workspace), {
    method: "POST",
    body: draft
  });
  return response.record as HorticultureRecord;
}

export async function updateHorticultureRecord(
  workspace: BusinessDeskWorkspace,
  record: HorticultureRecord,
  patch: Partial<HorticultureRecordDraft>
) {
  const response = await apiRequest(
    `${horticultureBase(workspace)}/${encodeURIComponent(record._id)}`,
    { method: "PATCH", body: { ...patch, version: record.__v } }
  );
  return response.record as HorticultureRecord;
}

export async function addHorticultureCareEvent(
  workspace: BusinessDeskWorkspace,
  record: HorticultureRecord,
  event: { eventType: string; occurredAt: string; notes: string }
) {
  const response = await apiRequest(
    `${horticultureBase(workspace)}/${encodeURIComponent(record._id)}/care-events`,
    { method: "POST", body: { ...event, version: record.__v } }
  );
  return response.record as HorticultureRecord;
}

export async function evaluateHorticultureFulfillment(
  workspace: BusinessDeskWorkspace,
  record: HorticultureRecord
) {
  const response = await apiRequest(
    `${horticultureBase(workspace)}/${encodeURIComponent(record._id)}/evaluate-fulfillment`,
    { method: "POST", body: { version: record.__v } }
  );
  return response.record as HorticultureRecord;
}
