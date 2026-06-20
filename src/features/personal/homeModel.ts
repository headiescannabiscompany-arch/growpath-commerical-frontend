import type { PersonalGrow } from "@/api/grows";
import type { PersonalLog } from "@/api/logs";
import type { PersonalTask } from "@/api/tasks";
import type { ToolRun } from "@/api/toolRuns";

function timestamp(value?: string) {
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function growId(row: any) {
  return String(row?._id || row?.id || "");
}

export function buildPersonalHomeModel({
  grows,
  logs,
  tasks,
  toolRuns
}: {
  grows: PersonalGrow[];
  logs: PersonalLog[];
  tasks: PersonalTask[];
  toolRuns: ToolRun[];
}) {
  const activeGrow = [...grows]
    .filter((grow) => grow.status !== "harvested")
    .sort(
      (left, right) =>
        timestamp(right.updatedAt || right.createdAt) -
        timestamp(left.updatedAt || left.createdAt)
    )[0];
  const activeGrowId = growId(activeGrow);
  const growTasks = tasks.filter((task) => !activeGrowId || task.growId === activeGrowId);
  const openTasks = growTasks
    .filter((task) => !task.completed)
    .sort((left, right) => timestamp(left.dueDate) - timestamp(right.dueDate));
  const latestLog = [...logs]
    .filter((log) => !activeGrowId || log.growId === activeGrowId)
    .sort(
      (left, right) =>
        timestamp(right.date || right.createdAt) - timestamp(left.date || left.createdAt)
    )[0];
  const latestToolRun = [...toolRuns]
    .filter((run) => !activeGrowId || run.growId === activeGrowId)
    .sort((left, right) => timestamp(right.createdAt) - timestamp(left.createdAt))[0];

  return {
    activeGrow: activeGrow || null,
    activeGrowId,
    openTaskCount: openTasks.length,
    nextTask: openTasks[0] || null,
    latestLog: latestLog || null,
    latestToolRun: latestToolRun || null
  };
}
