import { sourceObjectHref } from "@/utils/sourceLinks";

export type GrowTimelineKind = "log" | "tool_run" | "task";

export type GrowTimelineItem = {
  kind: GrowTimelineKind;
  id: string;
  at: string | null;
  title: string;
  subtitle: string;
  category: string;
  completed?: boolean;
  raw: unknown;
};

export function growJournalItemHref(item: GrowTimelineItem, growId: string) {
  const sourceTypeByKind = {
    log: "grow_log",
    tool_run: "tool_run",
    task: "task"
  } as const;

  return sourceObjectHref({
    sourceType: sourceTypeByKind[item.kind],
    sourceId: item.id,
    growId,
    workspaceType: "personal"
  });
}

function rowId(row: any, fallback: string) {
  return String(row?._id || row?.id || fallback);
}

function timestampValue(value: string | null) {
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildGrowTimeline({
  logs = [],
  toolRuns = [],
  tasks = []
}: {
  logs?: any[];
  toolRuns?: any[];
  tasks?: any[];
}): GrowTimelineItem[] {
  const items: GrowTimelineItem[] = [
    ...logs.map((log, index) => ({
      kind: "log" as const,
      id: rowId(log, `log-${index}`),
      at: log?.date || log?.createdAt || null,
      title: log?.title || "Journal entry",
      subtitle: log?.notes || "",
      category: String(log?.type || "other").toLowerCase(),
      raw: log
    })),
    ...toolRuns.map((run, index) => ({
      kind: "tool_run" as const,
      id: rowId(run, `tool-run-${index}`),
      at: run?.createdAt || null,
      title: `Tool: ${run?.toolType || run?.toolName || "unknown"}`,
      subtitle: run?.summary || "Saved tool result",
      category: "tool_result",
      raw: run
    })),
    ...tasks.map((task, index) => ({
      kind: "task" as const,
      id: rowId(task, `task-${index}`),
      at: task?.dueDate || task?.dueAt || task?.createdAt || null,
      title: task?.title || "Grow task",
      subtitle: task?.description || "",
      category: "task",
      completed: Boolean(task?.completed),
      raw: task
    }))
  ];

  return items.sort((left, right) => {
    const timeDifference = timestampValue(right.at) - timestampValue(left.at);
    if (timeDifference !== 0) return timeDifference;
    return `${left.kind}-${left.id}`.localeCompare(`${right.kind}-${right.id}`);
  });
}
