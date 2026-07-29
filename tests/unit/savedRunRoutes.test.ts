import {
  savedRunBackTarget,
  savedRunSourceHref
} from "@/features/personal/tools/savedRunRoutes";

describe("saved run source routes", () => {
  it("preserves exact Journal, Timeline, and task return context", () => {
    expect(
      savedRunSourceHref({
        toolRunId: "run/1",
        growId: "grow 1",
        sourceContext: "task",
        sourceTaskId: "task/1"
      })
    ).toBe(
      "/home/personal/tools/saved-runs?toolRunId=run%2F1&growId=grow+1&sourceContext=task&sourceTaskId=task%2F1"
    );
    expect(savedRunBackTarget({ growId: "grow 1", sourceContext: "journal" })).toBe(
      "/home/personal/grows/grow%201/journal"
    );
    expect(savedRunBackTarget({ growId: "grow 1", sourceContext: "timeline" })).toBe(
      "/home/personal/grows/grow%201/timeline"
    );
    expect(
      savedRunBackTarget({
        growId: "grow 1",
        sourceContext: "task",
        sourceTaskId: "task/1"
      })
    ).toBe("/home/personal/grows/grow%201/tasks?taskId=task%2F1");
  });

  it("falls back to Personal tools for unknown or incomplete context", () => {
    expect(savedRunSourceHref({ toolRunId: "" })).toBe("");
    expect(savedRunBackTarget({ sourceContext: "journal" })).toBe("/home/personal/tools");
    expect(savedRunBackTarget({ growId: "grow-1", sourceContext: "outside" })).toBe(
      "/home/personal/tools"
    );
  });
});
