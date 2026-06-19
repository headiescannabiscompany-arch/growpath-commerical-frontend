import { apiRequest } from "./apiRequest";

export interface ToolRun {
  id?: string;
  _id?: string;
  growId?: string;
  toolName?: string;
  toolType?: string;
  params?: Record<string, any>;
  input?: Record<string, any>;
  result?: Record<string, any>;
  output?: Record<string, any>;
  summary?: string;
  recommendations?: string[];
  linkedLogId?: string | null;
  linkedTaskId?: string | null;
  createdAt?: string;
}

export type CalculatorTool =
  | "vpd"
  | "ppfd-dli"
  | "dew-point-guard"
  | "watering"
  | "bud-rot-risk"
  | "npk-recipe";

function normalizeToolRun(row: any): ToolRun {
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
  normalized.params = (row?.params ?? row?.input ?? normalized.params ?? {}) as Record<
    string,
    any
  >;
  normalized.input = (row?.input ?? row?.params ?? normalized.input ?? {}) as Record<
    string,
    any
  >;
  normalized.result = (row?.result ?? row?.output ?? normalized.result ?? {}) as Record<
    string,
    any
  >;
  normalized.output = (row?.output ?? row?.result ?? normalized.output ?? {}) as Record<
    string,
    any
  >;

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
  payload: { title?: string; notes?: string } = {}
) {
  return apiRequest(`/api/tools/runs/${encodeURIComponent(toolRunId)}/save-log`, {
    method: "POST",
    body: payload
  });
}

export async function createTaskFromToolRun(
  toolRunId: string,
  payload: {
    title?: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    dueDate?: string;
  } = {}
) {
  return apiRequest(`/api/tools/runs/${encodeURIComponent(toolRunId)}/create-task`, {
    method: "POST",
    body: payload
  });
}

export async function listToolRuns(options?: { growId?: string }): Promise<ToolRun[]> {
  try {
    const res: any = await apiRequest("/api/tools", {
      method: "GET",
      params: options?.growId ? { growId: options.growId } : undefined
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

export async function createToolRun(payload: {
  toolType: string;
  growId?: string;
  input: Record<string, any>;
  output: Record<string, any>;
}): Promise<ToolRun | null> {
  try {
    const body = {
      // Backend canonical contract
      toolName: payload.toolType,
      params: payload.input,
      result: payload.output,
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
