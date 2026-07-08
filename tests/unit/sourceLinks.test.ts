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
        workspaceType: "personal"
      })
    ).toBe("/store?q=batch-1");
  });
});
