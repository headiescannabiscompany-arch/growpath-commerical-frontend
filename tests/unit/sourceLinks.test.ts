import { sourceObjectHref } from "@/utils/sourceLinks";

describe("sourceObjectHref", () => {
  it("keeps facility operational source links inside facility workflows", () => {
    expect(
      sourceObjectHref({
        sourceType: "recipe",
        sourceId: "recipe-1",
        workspaceType: "facility"
      })
    ).toBe("/home/facility/ai-tools?toolRunId=recipe-1");

    expect(
      sourceObjectHref({
        sourceType: "toolrun",
        sourceId: "run-1",
        workspaceType: "facility"
      })
    ).toBe("/home/facility/ai-tools?toolRunId=run-1");

    expect(
      sourceObjectHref({
        sourceType: "course",
        sourceId: "sop-run-1",
        workspaceType: "facility"
      })
    ).toBe("/home/facility/sop-runs/sop-run-1");

    expect(
      sourceObjectHref({
        sourceType: "product_trial",
        sourceId: "trial-run-1",
        workspaceType: "facility"
      })
    ).toBe("/home/facility/grows/trial-run-1");

    expect(
      sourceObjectHref({
        sourceType: "room",
        sourceId: "flower-1",
        workspaceType: "facility"
      })
    ).toBe("/home/facility/rooms?roomId=flower-1");
  });

  it("recognizes personal task aliases used by grow tools and AI diagnosis", () => {
    expect(
      sourceObjectHref({
        sourceType: "tool_run",
        sourceId: "run-1",
        workspaceType: "personal"
      })
    ).toBe("/home/personal/tools/saved-runs?toolRunId=run-1");

    expect(
      sourceObjectHref({
        sourceType: "ai_diagnosis",
        sourceId: "diag-1",
        growId: "grow-1",
        workspaceType: "personal"
      })
    ).toBe("/home/personal/diagnose?growId=grow-1");

    expect(
      sourceObjectHref({
        sourceType: "live_replay",
        sourceId: "live-1",
        workspaceType: "personal"
      })
    ).toBe("/feed?liveId=live-1");

    expect(
      sourceObjectHref({
        sourceType: "product_batch",
        sourceId: "batch-1",
        workspaceType: "commercial"
      })
    ).toBe("/home/commercial/batch-planner/batch-1");

    expect(
      sourceObjectHref({
        sourceType: "recipe",
        sourceId: "recipe-1",
        workspaceType: "commercial"
      })
    ).toBe("/home/commercial/batch-planner/recipe-1");

    expect(
      sourceObjectHref({
        sourceType: "product_batch",
        sourceId: "batch-1",
        workspaceType: "personal"
      })
    ).toBe("/store?q=batch-1");

    expect(
      sourceObjectHref({
        sourceType: "grow_log",
        sourceId: "log-1",
        growId: "grow-1",
        workspaceType: "personal"
      })
    ).toBe("/home/personal/logs/log-1");

    expect(
      sourceObjectHref({
        sourceType: "plant",
        sourceId: "plant-1",
        growId: "grow-1",
        workspaceType: "personal"
      })
    ).toBe("/home/personal/grows/grow-1/plants?plantId=plant-1");

    expect(
      sourceObjectHref({
        sourceType: "automation",
        sourceId: "automation-1",
        growId: "grow-1",
        workspaceType: "personal"
      })
    ).toBe("/home/personal/grows/grow-1/automation");

    expect(
      sourceObjectHref({
        sourceType: "automation_policy",
        sourceId: "automation-policy-1",
        growId: "grow-1",
        workspaceType: "personal"
      })
    ).toBe("/home/personal/grows/grow-1/automation");

    expect(
      sourceObjectHref({
        sourceType: "order",
        sourceId: "order-1",
        workspaceType: "personal"
      })
    ).toBe("/home/personal/profile");

    expect(
      sourceObjectHref({
        sourceType: "storefront",
        storefrontSlug: "living-soil-labs",
        workspaceType: "personal"
      })
    ).toBe("/store/living-soil-labs");

    expect(
      sourceObjectHref({
        sourceType: "storefront",
        sourceId: "living soil labs",
        workspaceType: "personal"
      })
    ).toBe("/store/living%20soil%20labs");

    expect(
      sourceObjectHref({
        sourceType: "storefront",
        sourceId: "storefront-1",
        workspaceType: "commercial"
      })
    ).toBe("/home/commercial/storefront");

    expect(
      sourceObjectHref({
        sourceType: "order",
        sourceId: "order-1",
        workspaceType: "commercial"
      })
    ).toBe("/home/commercial/orders?orderId=order-1");

    expect(
      sourceObjectHref({
        sourceType: "order",
        sourceId: "order-1",
        workspaceType: "facility"
      })
    ).toBe("/home/facility/InventoryItemDetailScreen?id=order-1");

    expect(
      sourceObjectHref({
        sourceType: "inventory",
        sourceId: "inventory-1",
        workspaceType: "commercial"
      })
    ).toBe("/home/commercial/inventory-item/inventory-1");

    expect(
      sourceObjectHref({
        sourceType: "inventory",
        sourceId: "inventory-1",
        workspaceType: "facility"
      })
    ).toBe("/home/facility/InventoryItemDetailScreen?id=inventory-1");

    expect(
      sourceObjectHref({
        sourceType: "notification",
        sourceId: "notification-1",
        workspaceType: "personal"
      })
    ).toBe("/home/notifications?notificationId=notification-1");
  });

  it("recognizes schedule and calendar item aliases across workspaces", () => {
    expect(
      sourceObjectHref({
        itemType: "lesson_release",
        sourceId: "course-1",
        workspaceType: "commercial"
      })
    ).toBe("/home/commercial/courses/course-1");

    expect(
      sourceObjectHref({
        sourceType: "course_release",
        sourceId: "course-1",
        workspaceType: "personal"
      })
    ).toBe("/home/personal/courses?courseId=course-1");

    expect(
      sourceObjectHref({
        sourceType: "product_launch",
        sourceId: "product-1",
        workspaceType: "commercial"
      })
    ).toBe("/home/commercial/products/product-1");

    expect(
      sourceObjectHref({
        sourceType: "live_reminder",
        sourceId: "live-1",
        workspaceType: "personal"
      })
    ).toBe("/feed?liveId=live-1");

    expect(
      sourceObjectHref({
        sourceType: "live",
        sourceId: "live-1",
        workspaceType: "commercial"
      })
    ).toBe("/home/commercial/lives?liveId=live-1");

    expect(
      sourceObjectHref({
        sourceType: "scheduled_feed_post",
        sourceId: "campaign-1",
        workspaceType: "facility"
      })
    ).toBe("/home/facility/feed?campaignId=campaign-1");

    expect(
      sourceObjectHref({
        sourceType: "feed_campaign",
        sourceId: "campaign-1",
        workspaceType: "commercial"
      })
    ).toBe("/home/commercial/feed?campaignId=campaign-1");

    expect(
      sourceObjectHref({
        sourceType: "feed_campaign",
        sourceId: "campaign-1",
        workspaceType: "personal"
      })
    ).toBe("/feed?campaignId=campaign-1");

    expect(
      sourceObjectHref({
        sourceType: "alert_snooze",
        sourceId: "alert-1",
        workspaceType: "commercial"
      })
    ).toBe("/home/alerts?alertId=alert-1");

    expect(
      sourceObjectHref({
        sourceType: "facility_sop",
        sourceId: "sop-1",
        workspaceType: "facility"
      })
    ).toBe("/home/facility/sop-runs/sop-1");

    expect(
      sourceObjectHref({
        sourceType: "sop_task",
        linkedSopId: "sop-linked-1",
        workspaceType: "facility"
      })
    ).toBe("/home/facility/sop-runs/sop-linked-1");

    expect(
      sourceObjectHref({
        sourceType: "grow_milestone",
        sourceId: "grow-1",
        workspaceType: "personal"
      })
    ).toBe("/home/personal/grows/grow-1");
  });
});
