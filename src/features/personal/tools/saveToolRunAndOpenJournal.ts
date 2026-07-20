import { createPersonalTask } from "@/api/tasks";
import { createPersonalLog } from "@/api/logs";
import { createToolRun } from "@/api/toolRuns";

import { getCalculatorVersion } from "./calculatorVersions";

type SaveAndOpenArgs = {
  router: { push: (href: string) => void };
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
  toolKey?: string;
  toolType?: string;
  toolRunId?: string;
  input: Record<string, any>;
  output: Record<string, any>;
  calculatorVersion?: string;
};

type SaveAndOpenResult = { ok: true; toolRunId: string } | { ok: false; error: string };
type CreateTaskArgs = Omit<SaveAndOpenArgs, "router"> & {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
  endAt?: string | null;
  allDay?: boolean;
  reminderPlan?: Record<string, any> | null;
  recurrence?: Record<string, any> | string | null;
  calendarType?: string | null;
  sourceStage?: string | null;
};
type CreateTaskResult =
  | { ok: true; toolRunId: string; taskId: string }
  | { ok: false; error: string };
export type LinkedTaskDraft = {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
  endAt?: string | null;
  allDay?: boolean;
  reminderPlan?: Record<string, any> | null;
  recurrence?: Record<string, any> | null;
  calendarType?: string | null;
  sourceStage?: string | null;
};
type CreateTasksArgs = Omit<SaveAndOpenArgs, "router"> & {
  tasks: LinkedTaskDraft[];
};
type CreateTasksResult =
  | { ok: true; toolRunId: string; taskIds: string[] }
  | { ok: false; error: string };
type CreateLogArgs = Omit<SaveAndOpenArgs, "router"> & {
  title: string;
  notes?: string;
  type?: string;
  date?: string;
  tags?: string[];
};
type CreateLogResult =
  | { ok: true; toolRunId: string; logId: string }
  | { ok: false; error: string };

async function ensureToolRun(args: Omit<SaveAndOpenArgs, "router">) {
  const growId = String(args.growId || "").trim();
  const toolType = String(args.toolKey || args.toolType || "").trim();
  if (!growId) {
    return { ok: false as const, error: "A grow is required to save this tool run." };
  }
  if (!toolType) {
    return { ok: false as const, error: "A tool key is required to save a run." };
  }

  let toolRunId = String(args.toolRunId || "").trim();
  if (!toolRunId) {
    const created = await createToolRun({
      toolType,
      growId,
      plantId: args.plantId,
      facilityId: args.facilityId,
      roomId: args.roomId,
      productId: args.productId,
      batchId: args.batchId,
      courseId: args.courseId,
      cropProfileId: args.cropProfileId,
      cropIdentity: args.cropIdentity,
      selectedPlantContext: args.selectedPlantContext,
      plantGrowthProfile: args.plantGrowthProfile,
      input: args.input,
      output: args.output,
      calculatorVersion: args.calculatorVersion || getCalculatorVersion(toolType)
    });
    toolRunId = String(created?._id || created?.id || "").trim();
  }
  if (!toolRunId) {
    return { ok: false as const, error: "Unable to save tool run." };
  }
  return { ok: true as const, toolRunId };
}

export async function saveToolRunResult(
  args: Omit<SaveAndOpenArgs, "router">
): Promise<SaveAndOpenResult> {
  return ensureToolRun(args);
}

export async function saveToolRunAndOpenJournal(
  args: SaveAndOpenArgs
): Promise<SaveAndOpenResult> {
  const growId = String(args.growId || "").trim();
  const toolType = String(args.toolKey || args.toolType || "").trim();
  if (!growId) {
    return { ok: false, error: "A grow is required to open journal entry flow." };
  }
  if (!toolType) {
    return { ok: false, error: "A tool key is required to save a run." };
  }

  const ensured = await ensureToolRun(args);
  if (!ensured.ok) return ensured;

  args.router.push(
    `/home/personal/logs/new?growId=${encodeURIComponent(growId)}&toolRunId=${encodeURIComponent(ensured.toolRunId)}`
  );

  return { ok: true, toolRunId: ensured.toolRunId };
}

export async function saveToolRunAndCreateTask(
  args: CreateTaskArgs
): Promise<CreateTaskResult> {
  const growId = String(args.growId || "").trim();
  const ensured = await ensureToolRun(args);
  if (!ensured.ok) return ensured;

  const task = await createPersonalTask({
    growId,
    plantId: args.plantId,
    title: args.title,
    description:
      args.description ||
      `Follow up on ${String(args.toolKey || args.toolType || "tool")} result.`,
    priority: args.priority || "medium",
    dueDate: args.dueDate,
    ...(args.endAt !== undefined ? { endAt: args.endAt } : {}),
    allDay: args.allDay ?? true,
    calendarType:
      args.calendarType ||
      `${String(args.toolKey || args.toolType || "tool_run")
        .replace(/[^a-z0-9]+/gi, "_")
        .toLowerCase()}_followup`,
    sourceStage: args.sourceStage || "tool_run_followup",
    reminderPlan: args.reminderPlan || {
      label: "12 hours before",
      channels: ["in_app"]
    },
    ...(args.recurrence
      ? {
          recurrence:
            typeof args.recurrence === "string"
              ? { rule: args.recurrence }
              : args.recurrence
        }
      : {}),
    sourceType: "tool_run",
    sourceObjectId: ensured.toolRunId,
    sourceToolRunId: ensured.toolRunId,
    linkedGrowId: growId,
    linkedPlantId: args.plantId,
    linkedToolRunId: ensured.toolRunId
  });
  const taskId = String((task as any)?._id || task?.id || "").trim();
  if (!taskId) return { ok: false, error: "Unable to create task from tool run." };
  return { ok: true, toolRunId: ensured.toolRunId, taskId };
}

export async function saveToolRunAndCreateTasks(
  args: CreateTasksArgs
): Promise<CreateTasksResult> {
  const growId = String(args.growId || "").trim();
  const ensured = await ensureToolRun(args);
  if (!ensured.ok) return ensured;

  const taskIds: string[] = [];
  for (const draft of args.tasks) {
    const task = await createPersonalTask({
      growId,
      plantId: args.plantId,
      title: draft.title,
      description:
        draft.description ||
        `Follow up on ${String(args.toolKey || args.toolType || "tool")} result.`,
      priority: draft.priority || "medium",
      dueDate: draft.dueDate,
      endAt: draft.endAt,
      allDay: draft.allDay,
      reminderPlan: draft.reminderPlan,
      recurrence: draft.recurrence,
      calendarType: draft.calendarType,
      sourceStage: draft.sourceStage,
      sourceType: "tool_run",
      sourceObjectId: ensured.toolRunId,
      sourceToolRunId: ensured.toolRunId,
      linkedGrowId: growId,
      linkedPlantId: args.plantId,
      linkedToolRunId: ensured.toolRunId
    });
    const taskId = String((task as any)?._id || task?.id || "").trim();
    if (!taskId) return { ok: false, error: "Unable to create task from tool run." };
    taskIds.push(taskId);
  }

  return { ok: true, toolRunId: ensured.toolRunId, taskIds };
}

export async function saveToolRunAndCreateLog(
  args: CreateLogArgs
): Promise<CreateLogResult> {
  const growId = String(args.growId || "").trim();
  const ensured = await ensureToolRun(args);
  if (!ensured.ok) return ensured;

  const log = await createPersonalLog({
    growId,
    linkedGrowId: growId,
    plantId: args.plantId,
    linkedPlantId: args.plantId,
    toolRunId: ensured.toolRunId,
    linkedToolRunId: ensured.toolRunId,
    type: args.type,
    date: args.date,
    title: args.title,
    notes: args.notes,
    tags: args.tags
  });
  const logId = String((log as any)?._id || log?.id || "").trim();
  if (!logId) return { ok: false, error: "Unable to save tool run to grow log." };
  return { ok: true, toolRunId: ensured.toolRunId, logId };
}
