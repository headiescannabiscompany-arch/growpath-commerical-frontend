import { sourceObjectHref } from "@/utils/sourceLinks";

describe("sourceObjectHref", () => {
  it("keeps facility operational source links inside facility workflows", () => {
    expect(
      sourceObjectHref({
        sourceType: "recipe",
        sourceId: "recipe-1",
        workspaceType: "facility"
      })
    ).toBe("/home/facility/ai-tools");

    expect(
      sourceObjectHref({
        sourceType: "toolrun",
        sourceId: "run-1",
        workspaceType: "facility"
      })
    ).toBe("/home/facility/ai-tools");

    expect(
      sourceObjectHref({
        sourceType: "product_trial",
        sourceId: "trial-run-1",
        workspaceType: "facility"
      })
    ).toBe("/home/facility/grows/trial-run-1");
  });

  it("recognizes personal task aliases used by grow tools and AI diagnosis", () => {
    expect(
      sourceObjectHref({
        sourceType: "tool_run",
        sourceId: "run-1",
        workspaceType: "personal"
      })
    ).toBe("/home/personal/tools/saved-runs");

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
        sourceType: "order",
        sourceId: "order-1",
        workspaceType: "commercial"
      })
    ).toBe("/home/commercial/orders");

    expect(
      sourceObjectHref({
        sourceType: "order",
        sourceId: "order-1",
        workspaceType: "facility"
      })
    ).toBe("/home/facility/inventory");

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
    ).toBe("/home/facility/inventory");
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
    ).toBe("/home/personal/courses");

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
        sourceType: "scheduled_feed_post",
        sourceId: "campaign-1",
        workspaceType: "facility"
      })
    ).toBe("/home/facility/feed");

    expect(
      sourceObjectHref({
        sourceType: "alert_snooze",
        sourceId: "alert-1",
        workspaceType: "commercial"
      })
    ).toBe("/home/alerts");

    expect(
      sourceObjectHref({
        sourceType: "facility_sop",
        sourceId: "sop-1",
        workspaceType: "facility"
      })
    ).toBe("/home/facility/sop-runs");

    expect(
      sourceObjectHref({
        sourceType: "grow_milestone",
        sourceId: "grow-1",
        workspaceType: "personal"
      })
    ).toBe("/home/personal/grows/grow-1");
  });
});
