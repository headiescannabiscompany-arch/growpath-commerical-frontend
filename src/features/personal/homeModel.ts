import type { PersonalGrow } from "@/api/grows";
import type { PersonalLog } from "@/api/logs";
import type { PersonalPlant } from "@/api/plants";
import type { PersonalTask } from "@/api/tasks";
import type { ToolRun } from "@/api/toolRuns";

type PersonalDiagnosis = {
  id?: string;
  _id?: string;
  growId?: string;
  plantId?: string;
  issueSummary?: string;
  diagnosisClass?: string;
  overallHealth?: string;
  urgency?: string;
  createdAt?: string;
  updatedAt?: string;
};

function timestamp(value?: string) {
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function growId(row: any) {
  return String(row?._id || row?.id || "");
}

function endOfTodayMs() {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  ).getTime();
}

function taskSourceLabel(task: PersonalTask) {
  if (task.sourceType) return task.sourceType.replace(/_/g, " ");
  if (task.sourceToolRunId) return "tool run";
  if (task.sourceDiagnosisId) return "AI diagnosis";
  if (task.linkedLogId) return "journal";
  return "manual";
}

function taskSourceHref(task: PersonalTask, activeGrowId: string) {
  const growPath = activeGrowId
    ? `/home/personal/grows/${encodeURIComponent(activeGrowId)}`
    : "/home/personal/grows";
  if (task.linkedLogId) {
    return `/home/personal/logs/${encodeURIComponent(task.linkedLogId)}`;
  }
  if (task.sourceToolRunId || task.sourceType === "tool_run") {
    return `${growPath}/tools`;
  }
  if (task.sourceDiagnosisId || task.sourceType === "ai_diagnosis") {
    return `${growPath}/timeline`;
  }
  return `${growPath}/tasks`;
}

function summarizeTask(task: PersonalTask, activeGrowId: string) {
  return {
    ...task,
    sourceLabel: taskSourceLabel(task),
    sourceHref: taskSourceHref(task, activeGrowId)
  };
}

export function buildPersonalHomeModel({
  grows,
  logs,
  plants = [],
  tasks,
  toolRuns,
  diagnoses = []
}: {
  grows: PersonalGrow[];
  logs: PersonalLog[];
  plants?: PersonalPlant[];
  tasks: PersonalTask[];
  toolRuns: ToolRun[];
  diagnoses?: PersonalDiagnosis[];
}) {
  const activeGrows = grows.filter((grow) => grow.status !== "harvested");
  const activeGrow = [...grows]
    .filter((grow) => grow.status !== "harvested")
    .sort(
      (left, right) =>
        timestamp(right.updatedAt || right.createdAt) -
        timestamp(left.updatedAt || left.createdAt)
    )[0];
  const activeGrowId = growId(activeGrow);
  const growPlants = plants.filter(
    (plant) => !activeGrowId || plant.growId === activeGrowId
  );
  const growTasks = tasks.filter((task) => !activeGrowId || task.growId === activeGrowId);
  const openTasks = growTasks
    .filter((task) => !task.completed)
    .sort((left, right) => timestamp(left.dueDate) - timestamp(right.dueDate));
  const todayCutoff = endOfTodayMs();
  const todayTasks = openTasks
    .filter((task) => {
      const dueAt = timestamp(task.dueDate);
      return dueAt > 0 && dueAt <= todayCutoff;
    })
    .slice(0, 5)
    .map((task) => summarizeTask(task, activeGrowId));
  const latestLog = [...logs]
    .filter((log) => !activeGrowId || log.growId === activeGrowId)
    .sort(
      (left, right) =>
        timestamp(right.date || right.createdAt) - timestamp(left.date || left.createdAt)
    )[0];
  const latestToolRun = [...toolRuns]
    .filter((run) => !activeGrowId || run.growId === activeGrowId)
    .sort((left, right) => timestamp(right.createdAt) - timestamp(left.createdAt))[0];
  const scopedLogs = logs.filter((log) => !activeGrowId || log.growId === activeGrowId);
  const recentPhotos = scopedLogs
    .flatMap((log) =>
      (log.photos || []).map((url, index) => ({
        id: `${log.id || (log as any)._id || "log"}-${index}`,
        url,
        logId: String(log.id || (log as any)._id || ""),
        title: log.title || "Grow photo",
        createdAt:
          log.photoMetadata?.[index]?.createdAt || log.date || log.createdAt || "",
        plantId: log.photoMetadata?.[index]?.plantId || log.plantId || ""
      }))
    )
    .sort((left, right) => timestamp(right.createdAt) - timestamp(left.createdAt));
  const scopedDiagnoses = diagnoses.filter(
    (diagnosis) => !activeGrowId || diagnosis.growId === activeGrowId
  );
  const latestDiagnosis = [...scopedDiagnoses].sort(
    (left, right) =>
      timestamp(right.updatedAt || right.createdAt) -
      timestamp(left.updatedAt || left.createdAt)
  )[0];

  return {
    activeGrow: activeGrow || null,
    activeGrowId,
    stats: {
      totalGrows: grows.length,
      activeGrowCount: activeGrows.length,
      plantCount: growPlants.length,
      logCount: logs.filter((log) => !activeGrowId || log.growId === activeGrowId).length,
      taskCount: growTasks.length,
      openTaskCount: openTasks.length,
      completedTaskCount: growTasks.filter((task) => task.completed).length,
      toolRunCount: toolRuns.filter((run) => !activeGrowId || run.growId === activeGrowId)
        .length,
      photoCount: recentPhotos.length,
      diagnosisCount: scopedDiagnoses.length
    },
    plants: growPlants,
    openTaskCount: openTasks.length,
    nextTask: openTasks[0] || null,
    todayTasks,
    latestLog: latestLog || null,
    latestToolRun: latestToolRun || null,
    latestDiagnosis: latestDiagnosis || null,
    recentPhotos: recentPhotos.slice(0, 5)
  };
}
