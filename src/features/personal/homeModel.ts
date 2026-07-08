import type { PersonalGrow } from "@/api/grows";
import type { PersonalLog } from "@/api/logs";
import type { PersonalPlant } from "@/api/plants";
import type { PersonalTask } from "@/api/tasks";
import type { ToolRun } from "@/api/toolRuns";
import type { TelemetrySource } from "@/types/telemetry";
import { sourceObjectHref } from "@/utils/sourceLinks";

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

export type PersonalHomeAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  href: string;
};

function timestamp(value?: string) {
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function growId(row: any) {
  return String(row?._id || row?.id || "");
}

function endOfTodayMs(now = new Date()) {
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

function startOfTodayMs(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
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
  let sourceType = String(task.sourceType || "");
  if (!sourceType && task.linkedLogId) sourceType = "grow_log";
  else if (!sourceType && (task.sourceToolRunId || task.linkedToolRunId)) {
    sourceType = "tool_run";
  } else if (!sourceType && task.sourceDiagnosisId) sourceType = "ai_diagnosis";
  else if (!sourceType && task.linkedForumThreadId) sourceType = "forum";

  if (!sourceType || sourceType === "manual") return `${growPath}/tasks`;

  const sourceId = String(
    task.sourceObjectId ||
      task.linkedForumThreadId ||
      task.linkedLogId ||
      task.sourceToolRunId ||
      task.linkedToolRunId ||
      task.sourceDiagnosisId ||
      activeGrowId ||
      ""
  );
  return (
    sourceObjectHref({
      ...task,
      sourceType,
      sourceId,
      growId: activeGrowId,
      workspaceType: "personal"
    }) || `${growPath}/tasks`
  );
}

function summarizeTask(task: PersonalTask, activeGrowId: string) {
  return {
    ...task,
    sourceLabel: taskSourceLabel(task),
    sourceHref: taskSourceHref(task, activeGrowId)
  };
}

function telemetrySourceName(source: TelemetrySource) {
  return source.name || source.type || "Telemetry source";
}

function telemetryLastUpdated(source: TelemetrySource) {
  const raw = source as any;
  return String(
    raw.lastPointIso ||
      raw.lastReadingAt ||
      raw.lastTelemetryAt ||
      raw.lastIngestedAt ||
      source.updatedAt ||
      source.createdAt ||
      ""
  );
}

function buildAlerts({
  activeGrow,
  activeGrowId,
  openTasks,
  latestDiagnosis,
  latestToolRun,
  telemetrySources,
  telemetryUnavailable,
  now
}: {
  activeGrow: PersonalGrow | undefined;
  activeGrowId: string;
  openTasks: PersonalTask[];
  latestDiagnosis?: PersonalDiagnosis;
  latestToolRun?: ToolRun;
  telemetrySources: TelemetrySource[];
  telemetryUnavailable?: boolean;
  now?: Date;
}): PersonalHomeAlert[] {
  const alerts: PersonalHomeAlert[] = [];
  const current = now || new Date();
  const todayStart = startOfTodayMs(current);
  const todayEnd = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate(),
    23,
    59,
    59,
    999
  ).getTime();
  const growPath = activeGrowId
    ? `/home/personal/grows/${encodeURIComponent(activeGrowId)}`
    : "/home/personal/grows";

  const overdueTasks = openTasks.filter((task) => {
    const dueAt = timestamp(task.dueDate);
    return dueAt > 0 && dueAt < todayStart;
  });
  if (overdueTasks.length) {
    alerts.push({
      id: "overdue-tasks",
      severity: "critical",
      title: "Overdue tasks",
      message: `${overdueTasks.length} open task${overdueTasks.length === 1 ? "" : "s"} past due for ${activeGrow?.name || "this grow"}.`,
      href: `${growPath}/tasks`
    });
  }

  const highPriorityDueToday = openTasks.filter((task) => {
    const dueAt = timestamp(task.dueDate);
    return task.priority === "high" && dueAt >= todayStart && dueAt <= todayEnd;
  });
  if (highPriorityDueToday.length) {
    alerts.push({
      id: "high-priority-today",
      severity: "warning",
      title: "High priority today",
      message: `${highPriorityDueToday.length} high priority task${highPriorityDueToday.length === 1 ? "" : "s"} due today.`,
      href: `${growPath}/tasks`
    });
  }

  const urgency = String(latestDiagnosis?.urgency || "").toLowerCase();
  const health = String(latestDiagnosis?.overallHealth || "").toLowerCase();
  if (
    latestDiagnosis &&
    (["critical", "urgent", "high"].includes(urgency) ||
      ["critical", "poor", "unhealthy"].includes(health))
  ) {
    alerts.push({
      id: "diagnosis-urgency",
      severity: urgency === "critical" || health === "critical" ? "critical" : "warning",
      title: "Diagnosis follow-up",
      message:
        latestDiagnosis.issueSummary ||
        latestDiagnosis.diagnosisClass ||
        "Recent diagnosis needs review.",
      href: `${growPath}/timeline`
    });
  }

  const toolWarning = latestToolRun?.warnings?.[0];
  if (toolWarning) {
    alerts.push({
      id: "tool-warning",
      severity: "warning",
      title: "Latest tool warning",
      message: String(toolWarning),
      href: `${growPath}/tools`
    });
  }

  if (activeGrow) {
    const activeSources = telemetrySources.filter((source) => source.isActive !== false);
    if (telemetryUnavailable) {
      alerts.push({
        id: "telemetry-unavailable",
        severity: "warning",
        title: "Telemetry unavailable",
        message: "Telemetry sources could not be refreshed for this grow.",
        href: "/home/personal/tools/integrations"
      });
    } else if (!telemetrySources.length) {
      alerts.push({
        id: "telemetry-not-connected",
        severity: "info",
        title: "No telemetry source",
        message: "Connect read-only telemetry to surface environment warnings here.",
        href: "/home/personal/tools/integrations"
      });
    } else if (!activeSources.length) {
      alerts.push({
        id: "telemetry-disabled",
        severity: "warning",
        title: "Telemetry source disabled",
        message: "All telemetry sources for this grow are inactive.",
        href: "/home/personal/tools/integrations"
      });
    } else {
      const staleSource = activeSources.find((source) => {
        const lastUpdated = timestamp(telemetryLastUpdated(source));
        return lastUpdated > 0 && current.getTime() - lastUpdated > 1000 * 60 * 60 * 24;
      });
      if (staleSource) {
        alerts.push({
          id: "telemetry-stale",
          severity: "warning",
          title: "Telemetry stale",
          message: `${telemetrySourceName(staleSource)} has not updated in more than 24 hours.`,
          href: "/home/personal/tools/integrations"
        });
      }
    }
  }

  return alerts.slice(0, 5);
}

export function buildPersonalHomeModel({
  grows,
  logs,
  plants = [],
  tasks,
  toolRuns,
  diagnoses = [],
  telemetrySources = [],
  telemetryUnavailable = false,
  now
}: {
  grows: PersonalGrow[];
  logs: PersonalLog[];
  plants?: PersonalPlant[];
  tasks: PersonalTask[];
  toolRuns: ToolRun[];
  diagnoses?: PersonalDiagnosis[];
  telemetrySources?: TelemetrySource[];
  telemetryUnavailable?: boolean;
  now?: Date;
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
  const todayCutoff = endOfTodayMs(now);
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
    recentPhotos: recentPhotos.slice(0, 5),
    telemetrySources,
    alerts: buildAlerts({
      activeGrow,
      activeGrowId,
      openTasks,
      latestDiagnosis,
      latestToolRun,
      telemetrySources,
      telemetryUnavailable,
      now
    })
  };
}
