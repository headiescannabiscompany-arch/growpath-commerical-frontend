import { apiRequest } from "./apiRequest";

export type GrowpathModuleRecordType =
  | "soil_builder_recipe"
  | "dry_amendment_mix"
  | "topdress_plan"
  | "nutrient_source_comparison"
  | "soil_nutrient_batch"
  | "crop_steering_project"
  | "crop_steering_entry"
  | "ph_ec_check"
  | "pheno_hunt"
  | "stress_test"
  | "genetics_note"
  | "tissue_culture_project"
  | "ipm_scout"
  | "species_crop_id"
  | "harvest_readiness_check"
  | "harvest_batch"
  | "dry_cure_check"
  | "auto_grow_calendar"
  | "clone_batch"
  | "clone_batch_check"
  | "run_comparison";

export type GrowpathModuleAgreementStatus =
  | "agrees"
  | "partially_agrees"
  | "conflicts"
  | "insufficient_data"
  | "not_run";

export type GrowpathModuleUserDecision =
  | "accepted"
  | "rejected"
  | "uncertain"
  | "needs_follow_up"
  | "not_decided";

export type GrowpathModuleTaskDraft = {
  title: string;
  description?: string;
  dueDate?: string | null;
  priority?: "low" | "medium" | "high" | string;
  status?: string;
  sourceType?: string;
  sourceId?: string;
};

export type GrowpathModuleRecord = {
  id?: string;
  _id?: string;
  recordType: GrowpathModuleRecordType;
  title: string;
  status?: string;
  growId?: string | null;
  plantId?: string | null;
  phenoPlantId?: string | null;
  geneticsId?: string | null;
  facilityId?: string | null;
  harvestBatchId?: string | null;
  cloneBatchId?: string | null;
  cropProfileId?: string | null;
  cropIdentity?: Record<string, any> | null;
  selectedPlantContext?: Record<string, any> | null;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  payload?: Record<string, any>;
  localRuleResult?: Record<string, any> | null;
  aiVerificationResult?: Record<string, any> | null;
  agreementStatus?: GrowpathModuleAgreementStatus;
  userDecision?: GrowpathModuleUserDecision;
  outcome?: Record<string, any> | null;
  warnings?: string[];
  recommendations?: string[];
  confidence?: string | null;
  limitations?: string[];
  tags?: string[];
  tasksToCreate?: GrowpathModuleTaskDraft[];
  linkedTaskIds?: string[];
  linkedLogId?: string | null;
  linkedTimelineEventId?: string | null;
  linkedToolRunId?: string | null;
  linkedRecipeId?: string | null;
  sourceRecords?: Array<Record<string, any>>;
  sourceConfidence?: string;
  schemaVersion?: number;
  moduleVersion?: string;
  immutableSnapshot?: Record<string, any> | null;
  createdAt?: string;
  updatedAt?: string;
};

export type GrowpathModuleListParams = {
  recordType?: GrowpathModuleRecordType;
  growId?: string;
  plantId?: string;
  phenoPlantId?: string;
  geneticsId?: string;
  facilityId?: string;
  harvestBatchId?: string;
  cloneBatchId?: string;
  status?: string;
  tag?: string;
  limit?: number;
};

export type GrowpathModuleRecordInput = Omit<
  Partial<GrowpathModuleRecord>,
  "id" | "_id" | "createdAt" | "updatedAt" | "immutableSnapshot"
> & {
  recordType: GrowpathModuleRecordType;
  title: string;
};

function normalizeModuleRecord(row: any): GrowpathModuleRecord {
  const id = String(row?._id || row?.id || "");
  return {
    ...(row || {}),
    id: id || row?.id,
    _id: id || row?._id,
    inputs: row?.inputs && typeof row.inputs === "object" ? row.inputs : {},
    outputs: row?.outputs && typeof row.outputs === "object" ? row.outputs : {},
    payload: row?.payload && typeof row.payload === "object" ? row.payload : {},
    warnings: Array.isArray(row?.warnings) ? row.warnings.map(String) : [],
    recommendations: Array.isArray(row?.recommendations)
      ? row.recommendations.map(String)
      : [],
    limitations: Array.isArray(row?.limitations) ? row.limitations.map(String) : [],
    tags: Array.isArray(row?.tags) ? row.tags.map(String) : [],
    tasksToCreate: Array.isArray(row?.tasksToCreate) ? row.tasksToCreate : [],
    linkedTaskIds: Array.isArray(row?.linkedTaskIds) ? row.linkedTaskIds.map(String) : []
  };
}

export async function listGrowpathModuleTypes(): Promise<GrowpathModuleRecordType[]> {
  const res: any = await apiRequest("/api/growpath-modules/types", { method: "GET" });
  const rows = res?.items ?? res?.data?.items ?? [];
  return Array.isArray(rows) ? rows : [];
}

export async function listGrowpathModuleRecords(
  params: GrowpathModuleListParams = {}
): Promise<GrowpathModuleRecord[]> {
  const res: any = await apiRequest("/api/growpath-modules", {
    method: "GET",
    params
  });
  const rows = res?.items ?? res?.data?.items ?? [];
  return Array.isArray(rows) ? rows.map(normalizeModuleRecord) : [];
}

export async function createGrowpathModuleRecord(
  payload: GrowpathModuleRecordInput
): Promise<GrowpathModuleRecord> {
  const res: any = await apiRequest("/api/growpath-modules", {
    method: "POST",
    body: payload
  });
  return normalizeModuleRecord(res?.item ?? res?.data?.item ?? res);
}

export async function getGrowpathModuleRecord(
  id: string
): Promise<GrowpathModuleRecord | null> {
  try {
    const res: any = await apiRequest(`/api/growpath-modules/${encodeURIComponent(id)}`, {
      method: "GET"
    });
    return normalizeModuleRecord(res?.item ?? res?.data?.item ?? res);
  } catch (_error) {
    return null;
  }
}

export async function updateGrowpathModuleRecord(
  id: string,
  payload: Partial<GrowpathModuleRecordInput>
): Promise<GrowpathModuleRecord | null> {
  try {
    const res: any = await apiRequest(`/api/growpath-modules/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload
    });
    return normalizeModuleRecord(res?.item ?? res?.data?.item ?? res);
  } catch (_error) {
    return null;
  }
}
