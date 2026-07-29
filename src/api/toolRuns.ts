import { apiRequest } from "./apiRequest";
import { withFreshnessParam } from "./freshRequest";

export interface ToolRun {
  id?: string;
  _id?: string;
  growId?: string;
  plantId?: string | null;
  facilityId?: string | null;
  roomId?: string | null;
  productId?: string | null;
  batchId?: string | null;
  courseId?: string | null;
  cropProfileId?: string | null;
  cropIdentity?: Record<string, any> | null;
  selectedPlantContext?: Record<string, any> | null;
  plantGrowthProfile?: Record<string, any> | null;
  toolName?: string;
  toolType?: string;
  params?: Record<string, any>;
  input?: Record<string, any>;
  inputs?: Record<string, any>;
  result?: Record<string, any>;
  output?: Record<string, any>;
  outputs?: Record<string, any>;
  schemaVersion?: number;
  calculatorVersion?: string;
  status?: string;
  formulas?: string[];
  uncertainty?: any;
  sourceType?: string;
  sourceObjectId?: string | null;
  summary?: string;
  recommendations?: string[];
  warnings?: string[];
  confidence?: string | null;
  methodIds?: string[];
  sourceIds?: string[];
  citations?: Array<Record<string, any>>;
  disagreements?: Array<Record<string, any>>;
  limitations?: string[];
  linkedLogId?: string | null;
  linkedTimelineEventId?: string | null;
  linkedTaskIds?: string[];
  linkedTaskId?: string | null;
  linkedDiagnosisId?: string | null;
  linkedRecipeId?: string | null;
  linkedModuleRecordId?: string | null;
  immutableSnapshot?: Record<string, any> | null;
  createdAt?: string;
}

export type CalculatorTool =
  | "vpd"
  | "ppfd-dli"
  | "dew-point-guard"
  | "watering"
  | "bud-rot-risk"
  | "npk-recipe"
  | "ph-ec-check"
  | "topdress-plan"
  | "feeding-schedule-review"
  | "dry-amendment-mix"
  | "dry-cure-guard"
  | "soil-builder"
  | "nutrient-source-comparison"
  | "stress-test"
  | "clone-rooting"
  | "run-comparison"
  | "auto-grow-calendar"
  | "tissue-culture"
  | "soil-nutrient-batch"
  | "ipm-scout"
  | "genetics-inventory"
  | "harvest-readiness"
  | "species-crop-id"
  | "crop-steering-project"
  | "pheno-hunt";

export type RunComparisonScope =
  | "whole_run"
  | "vegetative"
  | "flowering_fruiting"
  | "harvest_final"
  | "post_harvest";

export type RunComparisonObjective =
  | "balanced_review"
  | "yield"
  | "final_quality"
  | "issue_reduction"
  | "task_execution"
  | "cycle_time";

export type SavedGrowComparisonInput = {
  growIds: string[];
  referenceGrowId?: string;
  scope?: RunComparisonScope;
  objective?: RunComparisonObjective;
  title?: string;
  notes?: string;
};

export async function compareSavedGrows(input: SavedGrowComparisonInput) {
  const response: any = await apiRequest("/api/tools/run-comparison/from-grows", {
    method: "POST",
    body: {
      ...input,
      growId: input.referenceGrowId || input.growIds[0]
    }
  });
  return {
    toolRun: normalizeToolRun(response?.toolRun || response?.data?.toolRun),
    outputs: response?.outputs || response?.data?.outputs || {}
  };
}

export function normalizeToolRun(row: any): ToolRun {
  if (!row || typeof row !== "object") return {};

  const normalized: ToolRun = { ...row };

  const id = String(row?._id || row?.id || "");
  if (id) {
    normalized.id = id;
    normalized._id = id;
  }

  // Backend canonical naming (toolName/params/result) with frontend aliases.
  normalized.toolName = String(
    row?.toolName || row?.toolType || normalized.toolName || ""
  );
  normalized.toolType = String(
    row?.toolType || row?.toolName || normalized.toolType || ""
  );
  const inputs = (row?.inputs ?? row?.input ?? row?.params ?? {}) as Record<string, any>;
  const outputs = (row?.outputs ?? row?.output ?? row?.result ?? {}) as Record<
    string,
    any
  >;
  normalized.inputs = inputs;
  normalized.input = inputs;
  normalized.params = inputs;
  normalized.outputs = outputs;
  normalized.output = outputs;
  normalized.result = outputs;
  normalized.plantId = row?.plantId ? String(row.plantId) : (row?.plantId ?? null);
  normalized.cropProfileId = row?.cropProfileId
    ? String(row.cropProfileId)
    : (row?.cropProfileId ?? null);
  normalized.cropIdentity =
    row?.cropIdentity && typeof row.cropIdentity === "object" ? row.cropIdentity : null;
  normalized.selectedPlantContext =
    row?.selectedPlantContext && typeof row.selectedPlantContext === "object"
      ? row.selectedPlantContext
      : null;
  normalized.plantGrowthProfile =
    row?.plantGrowthProfile && typeof row.plantGrowthProfile === "object"
      ? row.plantGrowthProfile
      : normalized.selectedPlantContext?.growthProfile &&
          typeof normalized.selectedPlantContext.growthProfile === "object"
        ? normalized.selectedPlantContext.growthProfile
        : null;
  normalized.schemaVersion = Number.isFinite(Number(row?.schemaVersion))
    ? Number(row.schemaVersion)
    : 1;
  normalized.calculatorVersion = String(row?.calculatorVersion || "legacy");
  normalized.status = String(row?.status || "completed");
  normalized.formulas = Array.isArray(row?.formulas) ? row.formulas : [];
  normalized.linkedTaskIds = Array.isArray(row?.linkedTaskIds)
    ? row.linkedTaskIds.map(String)
    : row?.linkedTaskId
      ? [String(row.linkedTaskId)]
      : [];
  normalized.immutableSnapshot =
    row?.immutableSnapshot && typeof row.immutableSnapshot === "object"
      ? row.immutableSnapshot
      : {
          toolName: normalized.toolName,
          toolType: normalized.toolType,
          growId: row?.growId || null,
          plantId: normalized.plantId || null,
          facilityId: row?.facilityId || null,
          roomId: row?.roomId || null,
          productId: row?.productId || null,
          batchId: row?.batchId || null,
          courseId: row?.courseId || null,
          cropProfileId: normalized.cropProfileId || null,
          cropIdentity: normalized.cropIdentity || null,
          selectedPlantContext: normalized.selectedPlantContext || null,
          plantGrowthProfile: normalized.plantGrowthProfile || null,
          schemaVersion: normalized.schemaVersion,
          calculatorVersion: normalized.calculatorVersion,
          inputs,
          outputs
        };

  return normalized;
}

export async function runCalculator<TOutput extends Record<string, any>>(
  tool: CalculatorTool,
  payload: Record<string, any>
): Promise<{ toolRun: ToolRun; outputs: TOutput }> {
  const res: any = await apiRequest(`/api/tools/${tool}`, {
    method: "POST",
    body: payload
  });
  const body = res?.data ?? res;
  return {
    toolRun: normalizeToolRun(body?.toolRun),
    outputs: (body?.outputs ?? {}) as TOutput
  };
}

export async function saveToolRunToLog(
  toolRunId: string,
  payload: {
    title?: string;
    notes?: string;
    growId?: string;
    plantId?: string | null;
    linkedGrowId?: string;
    linkedPlantId?: string | null;
    linkedToolRunId?: string;
  } = {}
) {
  return apiRequest(`/api/tools/runs/${encodeURIComponent(toolRunId)}/save-log`, {
    method: "POST",
    body: {
      toolRunId,
      linkedToolRunId: toolRunId,
      ...payload
    }
  });
}

export async function createTaskFromToolRun(
  toolRunId: string,
  payload: {
    title?: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    dueDate?: string;
    growId?: string;
    plantId?: string | null;
    linkedGrowId?: string;
    linkedPlantId?: string | null;
    linkedToolRunId?: string;
    sourceType?: string;
    sourceObjectId?: string;
    sourceToolRunId?: string;
  } = {}
) {
  return apiRequest(`/api/tools/runs/${encodeURIComponent(toolRunId)}/create-task`, {
    method: "POST",
    body: {
      sourceType: "tool_run",
      sourceObjectId: toolRunId,
      sourceToolRunId: toolRunId,
      linkedToolRunId: toolRunId,
      ...payload
    }
  });
}

export async function getToolRun(toolRunId: string): Promise<ToolRun | null> {
  try {
    const res: any = await apiRequest(
      `/api/tools/runs/${encodeURIComponent(toolRunId)}`,
      { method: "GET" }
    );
    const row = res?.toolRun ?? res?.data?.toolRun ?? res;
    return normalizeToolRun(row);
  } catch (_err) {
    return null;
  }
}

export async function listToolRuns(options?: {
  growId?: string;
  toolType?: string;
  includeArchived?: boolean;
}): Promise<ToolRun[]> {
  try {
    const params: Record<string, string> = {};
    if (options?.growId) params.growId = options.growId;
    if (options?.toolType) params.toolType = options.toolType;
    if (options?.includeArchived) params.includeArchived = "true";
    const res: any = await apiRequest("/api/tools", {
      method: "GET",
      cache: "no-store",
      params: withFreshnessParam(params)
    });
    const rows = Array.isArray(res)
      ? res
      : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.tools)
          ? res.tools
          : Array.isArray(res?.data?.tools)
            ? res.data.tools
            : Array.isArray(res?.data?.items)
              ? res.data.items
              : [];
    return rows.map(normalizeToolRun);
  } catch (_err) {
    return [];
  }
}

export async function updateToolRun(
  toolRunId: string,
  payload: Partial<{
    growId: string | null;
    plantId: string | null;
    inputs: Record<string, any>;
    input: Record<string, any>;
    params: Record<string, any>;
    outputs: Record<string, any>;
    output: Record<string, any>;
    result: Record<string, any>;
    status: string;
    summary: string;
    recommendations: string[];
    warnings: string[];
    confidence: string | null;
    sourceType: string;
    sourceObjectId: string | null;
    linkedRecipeId: string | null;
  }>
): Promise<ToolRun | null> {
  try {
    const res: any = await apiRequest(
      `/api/tools/runs/${encodeURIComponent(toolRunId)}`,
      { method: "PATCH", body: payload }
    );
    const row = res?.toolRun ?? res?.data?.toolRun ?? res;
    return normalizeToolRun(row);
  } catch (_err) {
    return null;
  }
}

export async function archiveToolRun(toolRunId: string): Promise<boolean> {
  try {
    const res: any = await apiRequest(
      `/api/tools/runs/${encodeURIComponent(toolRunId)}`,
      { method: "DELETE" }
    );
    return Boolean(res?.archived ?? res?.data?.archived ?? true);
  } catch (_err) {
    return false;
  }
}

export async function createToolRun(payload: {
  toolType: string;
  growId?: string;
  plantId?: string;
  facilityId?: string;
  roomId?: string;
  productId?: string;
  batchId?: string;
  courseId?: string;
  cropProfileId?: string | null;
  cropIdentity?: Record<string, any> | null;
  selectedPlantContext?: Record<string, any> | null;
  plantGrowthProfile?: Record<string, any> | null;
  input: Record<string, any>;
  output: Record<string, any>;
  calculatorVersion?: string;
  sourceType?: string;
  sourceObjectId?: string;
}): Promise<ToolRun | null> {
  try {
    const body = {
      // Backend canonical contract
      toolName: payload.toolType,
      params: payload.input,
      result: payload.output,
      inputs: payload.input,
      outputs: payload.output,
      schemaVersion: 1,
      calculatorVersion: payload.calculatorVersion || "1",
      sourceType: payload.sourceType || "manual_tool_run",
      sourceObjectId: payload.sourceObjectId || null,
      plantId: payload.plantId || payload.selectedPlantContext?.id || undefined,
      facilityId: payload.facilityId || undefined,
      roomId: payload.roomId || undefined,
      productId: payload.productId || undefined,
      batchId: payload.batchId || undefined,
      courseId: payload.courseId || undefined,
      cropProfileId:
        payload.cropProfileId ||
        payload.selectedPlantContext?.cropProfileId ||
        payload.plantGrowthProfile?.cropProfile ||
        null,
      cropIdentity: payload.cropIdentity || payload.selectedPlantContext || null,
      selectedPlantContext: payload.selectedPlantContext || null,
      plantGrowthProfile:
        payload.plantGrowthProfile || payload.selectedPlantContext?.growthProfile || null,
      // Frontend/backward compatibility aliases
      toolType: payload.toolType,
      input: payload.input,
      output: payload.output,
      growId: payload.growId
    };
    const res: any = await apiRequest("/api/tools", { method: "POST", body });
    const row = res?.created ?? res?.tool ?? res?.data?.created ?? res?.data?.tool ?? res;
    return normalizeToolRun(row);
  } catch (_err) {
    return null;
  }
}
