import { getRouteForItem } from "@/features/feed/components/FeedItemCard";
import type { FeedItem } from "@/features/feed/types/feed";

function item(overrides: Partial<FeedItem>): FeedItem {
  return {
    id: "item-1",
    type: "task",
    scope: { facilityId: "facility-1" },
    actor: { id: "actor-1", name: "Facility" },
    status: "open",
    createdAt: "2026-07-07T12:00:00Z",
    ...overrides
  };
}

describe("FeedItemCard route helper", () => {
  it("routes facility activity to canonical workspace pages", () => {
    expect(getRouteForItem(item({ id: "task-1", type: "task" }))).toBe(
      "/home/facility/tasks/task-1"
    );
    expect(getRouteForItem(item({ id: "alert-1", type: "alert" }))).toBe(
      "/home/alerts"
    );
    expect(
      getRouteForItem(
        item({
          id: "log-1",
          type: "log",
          entityLinks: { growId: "grow-1" }
        })
      )
    ).toBe("/home/facility/grows/grow-1");
  });

  it("keeps commercial activity out of dead root task URLs", () => {
    expect(
      getRouteForItem(item({ id: "task-2", type: "task", scope: { facilityId: "" } }))
    ).toBe("/home/commercial/tasks/task-2");
  });
});
