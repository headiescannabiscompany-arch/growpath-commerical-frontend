import { apiRequest } from "./apiRequest";

export interface ToolRun {
  id?: string;
  _id?: string;
  growId?: string;
  toolType?: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
  createdAt?: string;
}

function normalizeToolRun(row: any): ToolRun {
  if (!row || typeof row !== "object") return {};
  if (row.id && !row._id) return { ...row, _id: row.id };
  if (row._id && !row.id) return { ...row, id: row._id };
  return row;
}

export async function listToolRuns(options?: { growId?: string }): Promise<ToolRun[]> {
  try {
    const res: any = await apiRequest("/api/tools", {
      method: "GET",
      params: options?.growId ? { growId: options.growId } : undefined
    });
    const rows = Array.isArray(res)
      ? res
      : Array.isArray(res?.tools)
        ? res.tools
        : Array.isArray(res?.data?.tools)
          ? res.data.tools
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
    const res: any = await apiRequest("/api/tools", { method: "POST", body: payload });
    const row = res?.tool ?? res?.created ?? res?.data?.tool ?? res;
    return normalizeToolRun(row);
  } catch (_err) {
    return null;
  }
}
