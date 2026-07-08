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

function inferSourceType(source: SourceLike) {
  if (firstText(source?.linkedTaskId, source?.taskId)) return "task";
  if (firstText(source?.linkedAlertId, source?.linkedSensorAlertId, source?.alertId))
    return "alert";
  if (firstText(source?.linkedNotificationId, source?.notificationId))
    return "notification";
  if (firstText(source?.linkedForumThreadId, source?.forumThreadId)) return "forum";
  if (firstText(source?.linkedLogId, source?.linkedGrowLogId, source?.logId))
    return "grow_log";
  if (firstText(source?.linkedToolRunId, source?.toolRunId, source?.sourceToolRunId))
    return "tool_run";
  if (firstText(source?.linkedRecipeId, source?.recipeId)) return "recipe";
  if (firstText(source?.linkedLiveId, source?.liveId)) return "live";
  if (firstText(source?.linkedLessonId, source?.lessonId)) return "lesson";
  if (firstText(source?.linkedCourseId, source?.courseId)) return "course";
  if (firstText(source?.linkedProductBatchId, source?.productBatchId))
    return "product_batch";
  if (
    firstText(source?.linkedProductTrialId, source?.linkedTrialId, source?.productTrialId)
  )
    return "product_trial";
  if (firstText(source?.linkedProductId, source?.productId)) return "product";
  if (
    firstText(
      source?.storefrontSlug,
      source?.linkedStorefrontSlug,
      source?.linkedStorefrontId
    )
  )
    return "storefront";
  if (
    firstText(
      source?.linkedFeedCampaignId,
      source?.feedCampaignId,
      source?.campaignId,
      source?.linkedFeedPostId
    )
  )
    return "feed_campaign";
  if (firstText(source?.linkedOrderId, source?.orderId)) return "order";
  if (firstText(source?.linkedRoomId, source?.roomId)) return "room";
  if (firstText(source?.linkedSopId, source?.sopId)) return "sop";
  if (firstText(source?.linkedFacilityRunId, source?.facilityRunId))
    return "facility_run";
  if (firstText(source?.linkedPlantId, source?.plantId)) return "plant";
  if (firstText(source?.linkedGrowId, source?.growId)) return "grow";
  return "";
}

export function sourceObjectHref(source: SourceLike) {
  if (source?.actionUrl) return String(source.actionUrl);

  const sourceType =
    text(source?.sourceType || source?.itemType).toLowerCase() || inferSourceType(source);
  const workspace = text(source?.workspaceType || source?.ownerType).toLowerCase();
  const sourceId = firstText(
    source?.sourceId,
    source?.sourceObjectId,
    source?.linkedObjectId
  );
  const taskId = firstText(source?.linkedTaskId, source?.taskId, sourceId);
  const logId = firstText(
    source?.linkedLogId,
    source?.linkedGrowLogId,
    source?.logId,
    sourceId
  );
  const growId = firstText(source?.linkedGrowId, source?.growId);
  const plantId = firstText(source?.linkedPlantId, source?.plantId);
  const productId = firstText(source?.linkedProductId, source?.productId, sourceId);
  const productBatchId = firstText(
    source?.linkedProductBatchId,
    source?.productBatchId,
    sourceId
  );
  const productTrialId = firstText(
    source?.linkedProductTrialId,
    source?.linkedTrialId,
    source?.productTrialId,
    sourceId
  );
  const forumId = firstText(source?.linkedForumThreadId, source?.forumThreadId, sourceId);
  const courseId = firstText(source?.linkedCourseId, source?.courseId, sourceId);
  const liveId = firstText(source?.linkedLiveId, source?.liveId, sourceId);
  const campaignId = firstText(
    source?.linkedFeedCampaignId,
    source?.feedCampaignId,
    source?.campaignId,
    source?.linkedFeedPostId,
    sourceId
  );
  const orderId = firstText(source?.linkedOrderId, source?.orderId, sourceId);
  const alertId = firstText(
    source?.linkedAlertId,
    source?.linkedSensorAlertId,
    source?.alertId,
    sourceId
  );
  const notificationId = firstText(
    source?.linkedNotificationId,
    source?.notificationId,
    sourceId
  );
  const toolRunId = firstText(
    source?.linkedToolRunId,
    source?.toolRunId,
    source?.sourceToolRunId,
    source?.linkedRecipeId,
    source?.recipeId,
    sourceId
  );
  const roomId = firstText(source?.linkedRoomId, source?.roomId, sourceId);
  const sopId = firstText(source?.linkedSopId, source?.sopId, sourceId);
  const storefrontSlug = firstText(
    source?.storefrontSlug,
    source?.linkedStorefrontSlug,
    source?.linkedStorefrontId
  );
  const publicProductHref = (id: string) =>
    storefrontSlug && id
      ? `/store/${encoded(storefrontSlug)}/products/${encoded(id)}`
      : id
        ? `/store?q=${encoded(id)}`
        : "/store";

  if (sourceType === "task") {
    if (!taskId) return "/home/schedule";
    if (workspace === "commercial") return `/home/commercial/tasks/${taskId}`;
    if (workspace === "facility") return `/home/facility/tasks/${taskId}`;
    return growId
      ? `/home/personal/grows/${encoded(growId)}/tasks`
      : "/home/personal/tasks";
  }

  if (
    sourceType === "grow" ||
    sourceType === "grow_milestone" ||
    sourceType === "harvest_target" ||
    sourceType === "topdress" ||
    sourceType === "dry_cure_check"
  ) {
    if (workspace === "commercial")
      return sourceId ? `/home/commercial/grows/${sourceId}` : "/home/commercial/grows";
    if (workspace === "facility")
      return sourceId ? `/home/facility/grows/${sourceId}` : "/home/facility/grows";
    return sourceId ? `/home/personal/grows/${sourceId}` : "/home/personal/grows";
  }

  if (sourceType === "plant") {
    const targetPlantId = firstText(plantId, sourceId);
    if (workspace === "facility")
      return targetPlantId
        ? `/home/facility/plants/${targetPlantId}`
        : "/home/facility/plants";
    if (growId) {
      const plantQuery = targetPlantId ? `?plantId=${encoded(targetPlantId)}` : "";
      return `/home/personal/grows/${encoded(growId)}/plants${plantQuery}`;
    }
    return "/home/personal/grows";
  }

  if (sourceType === "grow_log") {
    if (logId) return `/home/personal/logs/${encoded(logId)}`;
    return growId
      ? `/home/personal/grows/${encoded(growId)}/journal`
      : "/home/personal/grows";
  }

  if (
    sourceType === "product" ||
    sourceType === "product_launch" ||
    sourceType === "product_restock"
  ) {
    if (workspace === "commercial" && productId)
      return `/home/commercial/products/${productId}`;
    if (workspace === "facility")
      return productId
        ? `/home/facility/inventory/${encoded(productId)}`
        : "/home/facility/inventory";
    return publicProductHref(productId);
  }

  if (sourceType === "product_batch") {
    if (workspace === "facility")
      return productBatchId
        ? `/home/facility/inventory/${encoded(productBatchId)}`
        : "/home/facility/inventory";
    if (workspace === "commercial")
      return productBatchId
        ? `/home/commercial/batch-planner/${encoded(productBatchId)}`
        : "/home/commercial/batch-planner";
    return publicProductHref(productId || productBatchId);
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
    sourceType === "course_assignment" ||
    sourceType === "course_release" ||
    sourceType === "lesson_release"
  ) {
    if (workspace === "commercial" && courseId)
      return `/home/commercial/courses/${courseId}`;
    if (workspace === "facility")
      return courseId
        ? `/home/facility/sop-runs/${encoded(courseId)}`
        : "/home/facility/sop-runs";
    return courseId
      ? `/home/personal/courses?courseId=${encoded(courseId)}`
      : "/home/personal/courses";
  }

  if (
    sourceType === "live" ||
    sourceType === "live_event" ||
    sourceType === "replay" ||
    sourceType === "live_replay" ||
    sourceType === "live_reminder" ||
    sourceType === "live_rsvp"
  ) {
    return workspace === "commercial"
      ? `/home/commercial/lives${liveId ? `?liveId=${encoded(liveId)}` : ""}`
      : `/feed${liveId ? `?liveId=${encoded(liveId)}` : ""}`;
  }

  if (
    sourceType === "feed_campaign" ||
    sourceType === "campaign" ||
    sourceType === "feed_post" ||
    sourceType === "scheduled_feed_post"
  ) {
    if (workspace === "facility")
      return `/home/facility/feed${campaignId ? `?campaignId=${encoded(campaignId)}` : ""}`;
    if (workspace === "commercial")
      return `/home/commercial/feed${campaignId ? `?campaignId=${encoded(campaignId)}` : ""}`;
    return `/feed${campaignId ? `?campaignId=${encoded(campaignId)}` : ""}`;
  }

  if (sourceType === "storefront") {
    if (workspace === "commercial") return "/home/commercial/storefront";
    const slug = firstText(storefrontSlug, sourceId);
    return slug ? `/store/${encoded(slug)}` : "/store";
  }

  if (sourceType === "order") {
    if (workspace === "commercial")
      return `/home/commercial/orders${orderId ? `?orderId=${encoded(orderId)}` : ""}`;
    if (workspace === "facility")
      return orderId
        ? `/home/facility/inventory/${encoded(orderId)}`
        : "/home/facility/inventory";
    return "/home/personal/profile";
  }
  if (sourceType === "inventory") {
    if (workspace === "commercial")
      return sourceId
        ? `/home/commercial/inventory-item/${encoded(sourceId)}`
        : "/home/commercial/inventory";
    if (workspace === "facility")
      return sourceId
        ? `/home/facility/inventory/${encoded(sourceId)}`
        : "/home/facility/inventory";
    return "/home/personal/profile";
  }
  if (sourceType === "room" || sourceType === "room_task")
    return roomId
      ? `/home/facility/rooms?roomId=${encoded(roomId)}`
      : "/home/facility/rooms";
  if (sourceType === "facility") return "/home/facility";
  if (sourceType === "facility_run") {
    return sourceId ? `/home/facility/grows/${sourceId}` : "/home/facility/grows";
  }
  if (sourceType === "automation" || sourceType === "automation_policy") {
    return growId
      ? `/home/personal/grows/${encoded(growId)}/automation`
      : "/home/personal/grows";
  }
  if (sourceType === "sop" || sourceType === "facility_sop" || sourceType === "sop_task")
    return sopId
      ? `/home/facility/sop-runs/${encoded(sopId)}`
      : "/home/facility/sop-runs";
  if (
    sourceType === "sensor_alert" ||
    sourceType === "alert" ||
    sourceType === "alert_snooze"
  )
    return `/home/alerts${alertId ? `?alertId=${encoded(alertId)}` : ""}`;
  if (sourceType === "notification")
    return `/home/notifications${
      notificationId ? `?notificationId=${encoded(notificationId)}` : ""
    }`;
  if (sourceType === "ai_diagnosis") {
    const params = new URLSearchParams();
    if (growId) params.set("growId", growId);
    if (plantId) params.set("plantId", plantId);
    const query = params.toString();
    return query ? `/home/personal/diagnose?${query}` : "/home/personal/diagnose";
  }

  if (sourceType === "toolrun" || sourceType === "tool_run" || sourceType === "recipe") {
    if (workspace === "commercial")
      return toolRunId
        ? `/home/commercial/batch-planner/${encoded(toolRunId)}`
        : "/home/commercial/batch-planner";
    if (workspace === "facility")
      return `/home/facility/ai-tools${
        toolRunId ? `?toolRunId=${encoded(toolRunId)}` : ""
      }`;
    return `/home/personal/tools/saved-runs${
      toolRunId ? `?toolRunId=${encoded(toolRunId)}` : ""
    }`;
  }
  if (sourceType === "forum") return forumId ? `/forum/post/${forumId}` : "/forum";

  return "";
}
