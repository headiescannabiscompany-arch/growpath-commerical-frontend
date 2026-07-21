export type SavedRunSourceContext = "journal" | "task" | "timeline";

export function savedRunSourceHref({
  toolRunId,
  growId = "",
  sourceContext,
  sourceTaskId = ""
}: {
  toolRunId: string;
  growId?: string;
  sourceContext?: SavedRunSourceContext;
  sourceTaskId?: string;
}) {
  if (!toolRunId) return "";
  const query = new URLSearchParams({ toolRunId });
  if (growId) query.set("growId", growId);
  if (sourceContext) query.set("sourceContext", sourceContext);
  if (sourceContext === "task" && sourceTaskId) {
    query.set("sourceTaskId", sourceTaskId);
  }
  return `/home/personal/tools/saved-runs?${query.toString()}`;
}

export function savedRunBackTarget({
  growId = "",
  sourceContext = "",
  sourceTaskId = ""
}: {
  growId?: string;
  sourceContext?: string;
  sourceTaskId?: string;
}) {
  if (!growId) return "/home/personal/tools";
  const encodedGrowId = encodeURIComponent(growId);
  if (sourceContext === "journal") {
    return `/home/personal/grows/${encodedGrowId}/journal`;
  }
  if (sourceContext === "timeline") {
    return `/home/personal/grows/${encodedGrowId}/timeline`;
  }
  if (sourceContext === "task") {
    const taskQuery = sourceTaskId ? `?taskId=${encodeURIComponent(sourceTaskId)}` : "";
    return `/home/personal/grows/${encodedGrowId}/tasks${taskQuery}`;
  }
  return "/home/personal/tools";
}
