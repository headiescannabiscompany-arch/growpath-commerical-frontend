import { growJournalItemHref, type GrowTimelineItem } from "@/features/grows/timeline";

function item(kind: GrowTimelineItem["kind"], id: string): GrowTimelineItem {
  return {
    kind,
    id,
    at: null,
    title: "Source item",
    subtitle: "",
    category: "",
    raw: {}
  };
}

describe("growJournalItemHref", () => {
  it("opens the exact journal entry, saved run, and task", () => {
    expect(growJournalItemHref(item("log", "log/1"), "grow 1")).toBe(
      "/home/personal/logs/log%2F1"
    );
    expect(growJournalItemHref(item("tool_run", "run/1"), "grow 1")).toBe(
      "/home/personal/tools/saved-runs?toolRunId=run%2F1"
    );
    expect(growJournalItemHref(item("task", "task/1"), "grow 1")).toBe(
      "/home/personal/grows/grow%201/tasks?taskId=task%2F1"
    );
  });
});
