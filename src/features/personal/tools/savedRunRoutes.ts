export type SavedRunSourceContext = "journal" | "task" | "timeline";

export function savedRunSourceHref({
  toolRunId,
  growId = "",
  sourceContext,
  sourceTaskId = "",
  workspaceType = "personal"
}: {
  toolRunId: string;
  growId?: string;
  sourceContext?: SavedRunSourceContext;
  sourceTaskId?: string;
  workspaceType?: "personal" | "commercial";
}) {
  if (!toolRunId) return "";
  const query = new URLSearchParams({ toolRunId });
  if (growId) query.set("growId", growId);
  if (sourceContext) query.set("sourceContext", sourceContext);
  if (sourceContext === "task" && sourceTaskId) {
    query.set("sourceTaskId", sourceTaskId);
  }
  const basePath = workspaceType === "commercial" ? "/home/commercial" : "/home/personal";
  return `${basePath}/tools/saved-runs?${query.toString()}`;
}

export function savedRunBackTarget({
  growId = "",
  sourceContext = "",
  sourceTaskId = "",
  workspaceType = "personal"
}: {
  growId?: string;
  sourceContext?: string;
  sourceTaskId?: string;
  workspaceType?: "personal" | "commercial";
}) {
  const basePath = workspaceType === "commercial" ? "/home/commercial" : "/home/personal";
  if (!growId) return `${basePath}/tools`;
  const encodedGrowId = encodeURIComponent(growId);
  if (sourceContext === "journal") {
    return `${basePath}/grows/${encodedGrowId}/journal`;
  }
  if (sourceContext === "timeline") {
    return `${basePath}/grows/${encodedGrowId}/timeline`;
  }
  if (sourceContext === "task") {
    const taskQuery = sourceTaskId ? `?taskId=${encodeURIComponent(sourceTaskId)}` : "";
    return `${basePath}/grows/${encodedGrowId}/tasks${taskQuery}`;
  }
  return `${basePath}/grows/${encodedGrowId}/tools`;
}
