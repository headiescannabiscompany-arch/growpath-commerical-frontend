import { buildGrowTimeline } from "../timeline";

describe("buildGrowTimeline", () => {
  it("merges logs, tool runs, and tasks in descending time order", () => {
    const timeline = buildGrowTimeline({
      logs: [
        {
          id: "log-1",
          date: "2026-06-18T10:00:00.000Z",
          title: "Watered",
          type: "watering"
        }
      ],
      toolRuns: [
        {
          _id: "run-1",
          createdAt: "2026-06-19T10:00:00.000Z",
          toolType: "vpd"
        }
      ],
      tasks: [
        {
          id: "task-1",
          dueDate: "2026-06-20T10:00:00.000Z",
          title: "Check runoff",
          completed: false
        }
      ]
    });

    expect(timeline.map((item) => `${item.kind}:${item.id}`)).toEqual([
      "task:task-1",
      "tool_run:run-1",
      "log:log-1"
    ]);
    expect(timeline[0]).toEqual(
      expect.objectContaining({ category: "task", completed: false })
    );
  });

  it("uses deterministic fallback identifiers for incomplete legacy rows", () => {
    const timeline = buildGrowTimeline({ logs: [{}], toolRuns: [{}], tasks: [{}] });

    expect(timeline.map((item) => item.id).sort()).toEqual([
      "log-0",
      "task-0",
      "tool-run-0"
    ]);
  });
});
