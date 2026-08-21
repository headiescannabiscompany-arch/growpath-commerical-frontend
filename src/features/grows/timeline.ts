import { sourceObjectHref } from "@/utils/sourceLinks";
import { savedRunSourceHref } from "@/features/personal/tools/savedRunRoutes";

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

export type GrowTimelineZoom = "lifecycle" | "month" | "week" | "day";

const PHOTO_KEYS = [
  "photos",
  "photoUrls",
  "imageUrls",
  "attachments",
  "photoUrl",
  "imageUrl",
  "thumbnailUrl"
] as const;

function addPhotoCandidate(target: string[], value: unknown) {
  if (Array.isArray(value)) {
    value.forEach((item) => addPhotoCandidate(target, item));
    return;
  }
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    addPhotoCandidate(
      target,
      row.url || row.uri || row.src || row.photoUrl || row.imageUrl
    );
    return;
  }
  const candidate = String(value || "").trim();
  if (/^(https?:|data:image\/|blob:)/i.test(candidate) && !target.includes(candidate))
    target.push(candidate);
}

export function timelineEventPhotos(event: Record<string, any>): string[] {
  const photos: string[] = [];
  [event, event?.payload, event?.raw].filter(Boolean).forEach((source) => {
    PHOTO_KEYS.forEach((key) => addPhotoCandidate(photos, source?.[key]));
  });
  return photos.slice(0, 12);
}

export function timelinePeriodKey(timestamp: string, zoom: GrowTimelineZoom) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return "unknown";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  if (zoom === "lifecycle") return String(year);
  if (zoom === "month") return `${year}-${month}`;
  if (zoom === "day")
    return `${year}-${month}-${String(date.getDate()).padStart(2, "0")}`;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}

export function groupTimelineEvents<T extends { timestamp: string }>(
  events: T[],
  zoom: GrowTimelineZoom
) {
  const groups = new Map<string, T[]>();
  events.forEach((event) => {
    const key = timelinePeriodKey(event.timestamp, zoom);
    groups.set(key, [...(groups.get(key) || []), event]);
  });
  return Array.from(groups, ([key, items]) => ({ key, items }));
}

export function buildCommercialGrowTimeline(grow: Record<string, any>) {
  const id = String(grow?.id || grow?._id || "commercial-grow");
  const rows: Array<Record<string, any>> = [];
  const add = (
    suffix: string,
    timestamp: unknown,
    title: string,
    summary: unknown,
    photos: string[] = []
  ) => {
    const detail = String(summary || "").trim();
    if (!detail && !photos.length) return;
    rows.push({
      id: `${id}-${suffix}`,
      timestamp: String(timestamp || grow?.updatedAt || grow?.createdAt || ""),
      title,
      summary: detail,
      type: "commercial_milestone",
      sourceModel: "CommercialGrow",
      sourceId: id,
      payload: { photos }
    });
  };
  add(
    "created",
    grow?.createdAt,
    "Evidence run started",
    [grow?.purpose, grow?.cropType, grow?.cultivar].filter(Boolean).join(" • "),
    timelineEventPhotos(grow)
  );
  add("measurement", grow?.createdAt, "Measurement plan", grow?.measurementPlan);
  add("quality", grow?.updatedAt, "Harvest and quality notes", grow?.harvestQualityNotes);
  add("summary", grow?.updatedAt, "Commercial crop summary", grow?.commercialCropSummary);
  add("notes", grow?.updatedAt, "Important notes", grow?.notes);
  if (grow?.updatedAt && grow?.updatedAt !== grow?.createdAt)
    add(
      "updated",
      grow.updatedAt,
      "Evidence run updated",
      `Status: ${String(grow?.status || "active").replace(/_/g, " ")}`
    );
  return rows.sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
  );
}

export function growJournalItemHref(
  item: GrowTimelineItem,
  growId: string,
  workspace: "personal" | "commercial" = "personal"
) {
  if (item.kind === "tool_run") {
    return savedRunSourceHref({
      toolRunId: item.id,
      growId,
      sourceContext: "journal",
      workspaceType: workspace
    });
  }

  const sourceTypeByKind = {
    log: "grow_log",
    task: "task"
  } as const;

  return sourceObjectHref({
    sourceType: sourceTypeByKind[item.kind],
    sourceId: item.id,
    growId,
    workspaceType: workspace
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
