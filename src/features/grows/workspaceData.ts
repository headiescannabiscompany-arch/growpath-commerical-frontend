import { apiRequest } from "@/api/apiRequest";
import {
  appendGrowPhotos,
  getPersonalGrowTimeline,
  listPersonalGrows,
  type PersonalGrow,
  type PersonalGrowTimelineEvent
} from "@/api/grows";
import { createPersonalLog, listPersonalLogs, type PersonalLog } from "@/api/logs";
import {
  createPersonalPlant,
  listPersonalPlants,
  type PersonalPlant
} from "@/api/plants";
import {
  createPersonalTask,
  deletePersonalTask,
  listPersonalTasks,
  updatePersonalTask,
  type PersonalTask
} from "@/api/tasks";
import { listToolRuns, type ToolRun } from "@/api/toolRuns";
import { withFreshnessParam } from "@/api/freshRequest";

export type GrowWorkspace = "personal" | "commercial";

type RecordInput = Record<string, any>;

type CommercialGrowChildContainer = {
  id?: string;
  _id?: string;
  plants?: unknown[];
  logs?: unknown[];
  tasks?: unknown[];
};

function entityId(value: { id?: unknown; _id?: unknown } | null | undefined) {
  return String(value?.id || value?._id || "").trim();
}

function normalizeGrow(value: any): PersonalGrow | null {
  if (!value || typeof value !== "object") return null;
  const id = entityId(value);
  if (!id) return null;
  return { ...value, id, _id: value._id || id } as PersonalGrow;
}

function normalizeRows(response: any, keys: string[]) {
  if (Array.isArray(response)) return response;
  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
    if (Array.isArray(response?.data?.[key])) return response.data[key];
  }
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

export function growWorkspaceBasePath(workspace: GrowWorkspace) {
  return workspace === "commercial" ? "/home/commercial" : "/home/personal";
}

function commercialGrowChildPath(
  growId: string,
  child: "plants" | "logs" | "tasks",
  childId?: string
) {
  const base = `/api/commercial/grows/${encodeURIComponent(growId)}/${child}`;
  return childId ? `${base}/${encodeURIComponent(childId)}` : base;
}

export async function listWorkspaceGrows(
  workspace: GrowWorkspace
): Promise<PersonalGrow[]> {
  if (workspace === "personal") return listPersonalGrows();
  const response = await apiRequest("/api/commercial/grows", {
    method: "GET",
    cache: "no-store",
    params: withFreshnessParam()
  });
  return normalizeRows(response, ["grows", "commercialGrows"])
    .map(normalizeGrow)
    .filter(Boolean) as PersonalGrow[];
}

export async function getWorkspaceGrow(
  workspace: GrowWorkspace,
  growId: string
): Promise<PersonalGrow | null> {
  const id = String(growId || "").trim();
  if (!id) return null;
  if (workspace === "personal") {
    const rows = await listPersonalGrows();
    return rows.find((grow) => entityId(grow as any) === id) || null;
  }
  const response: any = await apiRequest(
    `/api/commercial/grows/${encodeURIComponent(id)}`,
    { method: "GET", cache: "no-store", params: withFreshnessParam() }
  );
  return normalizeGrow(
    response?.grow ?? response?.commercialGrow ?? response?.data?.grow ?? response?.data
  );
}

export async function createWorkspaceGrow(
  workspace: GrowWorkspace,
  data: RecordInput
): Promise<PersonalGrow | null> {
  const response: any = await apiRequest(
    workspace === "commercial" ? "/api/commercial/grows" : "/api/personal/grows",
    {
      method: "POST",
      body: workspace === "commercial" ? { ...data, workspaceType: "commercial" } : data
    }
  );
  return normalizeGrow(
    response?.grow ??
      response?.commercialGrow ??
      response?.created ??
      response?.data?.grow ??
      response
  );
}

export async function updateWorkspaceGrow(
  workspace: GrowWorkspace,
  growId: string,
  patch: RecordInput
): Promise<PersonalGrow | null> {
  const id = String(growId || "").trim();
  if (!id) return null;
  const response: any = await apiRequest(
    workspace === "commercial"
      ? `/api/commercial/grows/${encodeURIComponent(id)}`
      : `/api/personal/grows/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: workspace === "commercial" ? { ...patch, workspaceType: "commercial" } : patch
    }
  );
  return normalizeGrow(
    response?.grow ??
      response?.commercialGrow ??
      response?.updated ??
      response?.data?.grow
  );
}

export async function appendWorkspaceGrowPhotos(
  workspace: GrowWorkspace,
  growId: string,
  photos: string[]
) {
  if (workspace === "personal") return appendGrowPhotos(growId, photos);
  const current = await getWorkspaceGrow(workspace, growId);
  const merged = Array.from(
    new Set([
      ...(Array.isArray(current?.photos) ? current.photos : []),
      ...(Array.isArray(photos) ? photos : [])
    ])
  ).filter(Boolean);
  return updateWorkspaceGrow(workspace, growId, { photos: merged });
}

function commercialPlants(grow: CommercialGrowChildContainer | null): PersonalPlant[] {
  const rows = Array.isArray(grow?.plants) ? grow.plants : [];
  return rows
    .map((plant: any, index: number) => {
      if (!plant || typeof plant !== "object") return null;
      const id = entityId(plant) || `plant-${index + 1}`;
      return { ...plant, id, _id: plant._id || id } as PersonalPlant;
    })
    .filter(Boolean) as PersonalPlant[];
}

function commercialLogs(grow: CommercialGrowChildContainer | null): PersonalLog[] {
  const rows = Array.isArray(grow?.logs) ? grow.logs : [];
  return rows
    .map((log: any, index: number) => {
      if (!log || typeof log !== "object") return null;
      const id = entityId(log) || `log-${index + 1}`;
      const createdAt = String(log.createdAt || log.date || new Date(0).toISOString());
      return {
        ...log,
        id,
        _id: log._id || id,
        growId: String(log.growId || log.linkedGrowId || entityId(grow)),
        date: String(log.date || createdAt),
        title: String(log.title || "Journal entry"),
        notes: String(log.notes || log.note || ""),
        createdAt,
        updatedAt: String(log.updatedAt || createdAt),
        workspaceType: "commercial"
      } as PersonalLog;
    })
    .filter(Boolean) as PersonalLog[];
}

function commercialTasks(
  grow: CommercialGrowChildContainer | null,
  options: { includeArchived?: boolean } = {}
): PersonalTask[] {
  const rows = Array.isArray((grow as any)?.tasks) ? (grow as any).tasks : [];
  return rows
    .map((task: any, index: number) => {
      if (!task || typeof task !== "object") return null;
      const id = entityId(task) || `task-${index + 1}`;
      const createdAt = String(task.createdAt || new Date(0).toISOString());
      const status = String(task.status || "OPEN");
      const archived =
        status.toUpperCase() === "ARCHIVED" ||
        Boolean(task.archivedAt || task.deletedAt) ||
        task.isActive === false;
      if (archived && !options.includeArchived) return null;
      return {
        ...task,
        id,
        _id: task._id || id,
        growId: String(task.growId || task.linkedGrowId || entityId(grow)),
        description: String(task.description || task.notes || ""),
        dueDate: String(task.dueDate || task.dueAt || ""),
        completed: task.completed === true || status.toUpperCase() === "DONE",
        status,
        createdAt,
        workspaceType: "commercial"
      } as PersonalTask;
    })
    .filter(Boolean) as PersonalTask[];
}

export async function listWorkspacePlants(
  workspace: GrowWorkspace,
  growId: string
): Promise<PersonalPlant[]> {
  if (workspace === "personal") return listPersonalPlants({ growId });
  const response = await apiRequest(commercialGrowChildPath(growId, "plants"), {
    method: "GET",
    cache: "no-store",
    params: withFreshnessParam()
  });
  return commercialPlants({
    id: growId,
    plants: normalizeRows(response, ["plants"])
  });
}

export async function createWorkspacePlant(
  workspace: GrowWorkspace,
  data: Parameters<typeof createPersonalPlant>[0]
): Promise<PersonalPlant | null> {
  if (workspace === "personal") return createPersonalPlant(data);
  const response: any = await apiRequest(commercialGrowChildPath(data.growId, "plants"), {
    method: "POST",
    body: data
  });
  const row = response?.plant ?? response?.item ?? response?.data?.plant;
  return (
    commercialPlants({
      id: data.growId,
      plants: row ? [row] : []
    })[0] || null
  );
}

export async function listWorkspaceLogs(
  workspace: GrowWorkspace,
  growId: string
): Promise<PersonalLog[]> {
  if (workspace === "personal") return listPersonalLogs({ growId });
  const response = await apiRequest(commercialGrowChildPath(growId, "logs"), {
    method: "GET",
    cache: "no-store",
    params: withFreshnessParam()
  });
  return commercialLogs({
    id: growId,
    logs: normalizeRows(response, ["logs"])
  });
}

export async function createWorkspaceLog(
  workspace: GrowWorkspace,
  data: Parameters<typeof createPersonalLog>[0]
): Promise<PersonalLog | null> {
  if (workspace === "personal") return createPersonalLog(data);
  const response: any = await apiRequest(commercialGrowChildPath(data.growId, "logs"), {
    method: "POST",
    body: data
  });
  const row = response?.log ?? response?.item ?? response?.data?.log;
  return (
    commercialLogs({
      id: data.growId,
      logs: row ? [row] : []
    })[0] || null
  );
}

export async function listWorkspaceTasks(
  workspace: GrowWorkspace,
  growId: string
): Promise<PersonalTask[]> {
  if (workspace === "personal") return listPersonalTasks({ growId });
  const response = await apiRequest(commercialGrowChildPath(growId, "tasks"), {
    method: "GET",
    cache: "no-store",
    params: withFreshnessParam()
  });
  return commercialTasks({
    id: growId,
    tasks: normalizeRows(response, ["tasks"])
  });
}

export async function createWorkspaceTask(
  workspace: GrowWorkspace,
  data: Parameters<typeof createPersonalTask>[0]
): Promise<PersonalTask | null> {
  if (workspace === "personal") return createPersonalTask(data);
  const response: any = await apiRequest(commercialGrowChildPath(data.growId, "tasks"), {
    method: "POST",
    body: data
  });
  const row = response?.task ?? response?.item ?? response?.data?.task;
  return (
    commercialTasks({
      id: data.growId,
      tasks: row ? [row] : []
    })[0] || null
  );
}

export async function updateWorkspaceTask(
  workspace: GrowWorkspace,
  taskId: string,
  patch: Parameters<typeof updatePersonalTask>[1],
  growId?: string
): Promise<PersonalTask | null> {
  if (workspace === "personal") return updatePersonalTask(taskId, patch);
  if (!growId) return null;
  const completionPatch =
    patch.completed === undefined
      ? {}
      : {
          status: patch.completed ? "DONE" : "OPEN",
          completedAt: patch.completed ? new Date().toISOString() : null
        };
  const response: any = await apiRequest(
    commercialGrowChildPath(growId, "tasks", taskId),
    { method: "PATCH", body: { ...patch, ...completionPatch } }
  );
  const row = response?.task ?? response?.item ?? response?.data?.task;
  return (
    commercialTasks({
      id: growId,
      tasks: row ? [row] : []
    })[0] || null
  );
}

export async function deleteWorkspaceTask(
  workspace: GrowWorkspace,
  taskId: string,
  growId?: string
) {
  if (workspace === "personal") return deletePersonalTask(taskId);
  if (!growId) return false;
  const response: any = await apiRequest(
    commercialGrowChildPath(growId, "tasks", taskId),
    { method: "DELETE" }
  );
  return Boolean(response?.archived ?? response?.data?.archived);
}

export type CommercialGrowTask = PersonalTask & {
  workspaceStorage: "commercial_grow";
  workspaceGrowId: string;
};

export async function listCommercialGrowTasks(): Promise<CommercialGrowTask[]> {
  const grows = await listWorkspaceGrows("commercial");
  const taskGroups = await Promise.all(
    grows.map(async (grow) => {
      const growId = entityId(grow as any);
      const tasks = growId ? await listWorkspaceTasks("commercial", growId) : [];
      return tasks.map(
        (task) =>
          ({
            ...task,
            growId: String(task.growId || growId),
            linkedGrowId: String(task.linkedGrowId || task.growId || growId),
            workspaceStorage: "commercial_grow",
            workspaceGrowId: growId
          }) as CommercialGrowTask
      );
    })
  );
  return taskGroups.flat();
}

function timestamp(value: any) {
  return String(value || new Date(0).toISOString());
}

function commercialTimelineEvent(
  row: RecordInput,
  kind: "grow_log" | "plant" | "task" | "tool_run",
  index: number
): PersonalGrowTimelineEvent {
  const id = entityId(row) || `${kind}-${index}`;
  const isTask = kind === "task";
  const isRun = kind === "tool_run";
  const isPlant = kind === "plant";
  return {
    id: `${kind}-${id}`,
    growId: String(row.growId || row.linkedGrowId || "") || null,
    plantId: String(row.plantId || row.linkedPlantId || "") || null,
    type: kind,
    sourceModel: isTask ? "Task" : isRun ? "ToolRun" : isPlant ? "Plant" : "GrowLog",
    sourceId: id,
    title: String(
      row.title ||
        (isRun ? row.toolType || row.toolName : "") ||
        (isTask ? "Grow task" : isPlant ? row.name || "Plant added" : "Journal entry")
    ),
    summary: String(row.summary || row.notes || row.description || ""),
    timestamp: timestamp(row.date || row.updatedAt || row.createdAt || row.dueDate),
    tags: Array.isArray(row.tags) ? row.tags : [],
    payload: {
      ...row,
      sourceType: kind,
      workspaceType: "commercial",
      ...(isTask ? { linkedTaskId: id } : {}),
      ...(isRun ? { linkedToolRunId: id } : {}),
      ...(isPlant ? { linkedPlantId: id } : {}),
      ...(!isTask && !isRun && !isPlant ? { linkedLogId: id } : {})
    }
  };
}

export async function getWorkspaceGrowTimeline(
  workspace: GrowWorkspace,
  growId: string
): Promise<PersonalGrowTimelineEvent[]> {
  if (workspace === "personal") return getPersonalGrowTimeline(growId);
  const [logs, plants, tasks, runs] = await Promise.all([
    listWorkspaceLogs(workspace, growId),
    listWorkspacePlants(workspace, growId),
    listWorkspaceTasks(workspace, growId),
    listToolRuns({ growId, workspaceType: "commercial" })
  ]);
  return [
    ...logs.map((row, index) => commercialTimelineEvent(row, "grow_log", index)),
    ...plants.map((row, index) => commercialTimelineEvent(row, "plant", index)),
    ...tasks.map((row, index) => commercialTimelineEvent(row, "task", index)),
    ...runs.map((row: ToolRun, index) =>
      commercialTimelineEvent(row as RecordInput, "tool_run", index)
    )
  ].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
  );
}
