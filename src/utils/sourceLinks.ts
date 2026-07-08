type SourceLike = Record<string, any>;

function text(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const next = text(value);
    if (next) return next;
  }
  return "";
}

function encoded(value: string) {
  return encodeURIComponent(value);
}

export function sourceObjectHref(source: SourceLike) {
  if (source?.actionUrl) return String(source.actionUrl);

  const sourceType = text(source?.sourceType || source?.itemType).toLowerCase();
  const workspace = text(source?.workspaceType || source?.ownerType).toLowerCase();
  const sourceId = firstText(
    source?.sourceId,
    source?.sourceObjectId,
    source?.linkedObjectId
  );
  const growId = firstText(source?.linkedGrowId, source?.growId);
  const productId = firstText(sourceId, source?.linkedProductId);
  const productTrialId = firstText(sourceId, source?.linkedProductTrialId);
  const forumId = firstText(sourceId, source?.linkedForumThreadId);
  const courseId = firstText(source?.linkedCourseId, source?.courseId, sourceId);
  const roomId = firstText(source?.linkedRoomId, source?.roomId, sourceId);

  if (sourceType === "task") {
    if (!sourceId) return "/home/schedule";
    if (workspace === "commercial") return `/home/commercial/tasks/${sourceId}`;
    if (workspace === "facility") return `/home/facility/tasks/${sourceId}`;
    return growId
      ? `/home/personal/grows/${encoded(growId)}/tasks`
      : "/home/personal/tasks";
  }

  if (sourceType === "grow") {
    if (workspace === "commercial")
      return sourceId ? `/home/commercial/grows/${sourceId}` : "/home/commercial/grows";
    if (workspace === "facility")
      return sourceId ? `/home/facility/grows/${sourceId}` : "/home/facility/grows";
    return sourceId ? `/home/personal/grows/${sourceId}` : "/home/personal/grows";
  }

  if (sourceType === "plant") {
    if (workspace === "facility")
      return sourceId ? `/home/facility/plants/${sourceId}` : "/home/facility/plants";
    return growId
      ? `/home/personal/grows/${encoded(growId)}/plants`
      : "/home/personal/grows";
  }

  if (sourceType === "grow_log") {
    if (sourceId) return `/home/personal/logs/${encoded(sourceId)}`;
    return growId
      ? `/home/personal/grows/${encoded(growId)}/journal`
      : "/home/personal/grows";
  }

  if (sourceType === "product") {
    if (workspace === "commercial" && productId)
      return `/home/commercial/products/${productId}`;
    if (workspace === "facility") return "/home/facility/inventory";
    return productId ? `/store?q=${encoded(productId)}` : "/store";
  }

  if (sourceType === "product_batch") {
    if (workspace === "facility") return "/home/facility/inventory";
    if (workspace === "commercial") return "/home/commercial/batch-planner";
    return productId ? `/store?q=${encoded(productId)}` : "/store";
  }

  if (sourceType === "product_trial") {
    if (workspace === "commercial")
      return productTrialId
        ? `/home/commercial/trials/${productTrialId}`
        : "/home/commercial/trials";
    if (workspace === "facility")
      return productTrialId
        ? `/home/facility/grows/${productTrialId}`
        : "/home/facility/grows";
    return "/home/personal/tools/saved-runs";
  }

  if (
    sourceType === "course" ||
    sourceType === "lesson" ||
    sourceType === "course_assignment"
  ) {
    if (workspace === "commercial" && courseId)
      return `/home/commercial/courses/${courseId}`;
    if (workspace === "facility") return "/home/facility/sop-runs";
    return "/home/personal/courses";
  }

  if (
    sourceType === "live" ||
    sourceType === "live_event" ||
    sourceType === "replay" ||
    sourceType === "live_replay"
  ) {
    return workspace === "commercial"
      ? "/home/commercial/lives"
      : `/feed${sourceId ? `?liveId=${encoded(sourceId)}` : ""}`;
  }

  if (sourceType === "feed_campaign" || sourceType === "campaign") {
    if (workspace === "facility") return "/home/facility/feed";
    if (workspace === "commercial") return "/home/commercial/feed";
    return "/feed";
  }

  if (sourceType === "storefront") {
    return workspace === "commercial" ? "/home/commercial/storefront" : "/store";
  }

  if (sourceType === "order") return "/home/commercial/orders";
  if (sourceType === "room")
    return roomId ? "/home/facility/rooms" : "/home/facility/rooms";
  if (sourceType === "facility") return "/home/facility";
  if (sourceType === "facility_run") {
    return sourceId ? `/home/facility/grows/${sourceId}` : "/home/facility/grows";
  }
  if (sourceType === "automation" || sourceType === "automation_policy") {
    return growId
      ? `/home/personal/grows/${encoded(growId)}/automation`
      : "/home/personal/grows";
  }
  if (sourceType === "sop") return "/home/facility/sop-runs";
  if (sourceType === "sensor_alert" || sourceType === "alert") return "/home/alerts";
  if (sourceType === "ai_diagnosis") {
    return growId
      ? `/home/personal/diagnose?growId=${encoded(growId)}`
      : "/home/personal/diagnose";
  }

  if (sourceType === "toolrun" || sourceType === "tool_run" || sourceType === "recipe") {
    if (workspace === "commercial") return "/home/commercial/batch-planner";
    if (workspace === "facility") return "/home/facility/ai-tools";
    return "/home/personal/tools/saved-runs";
  }
  if (sourceType === "forum") return forumId ? `/forum/post/${forumId}` : "/forum";

  return "";
}
