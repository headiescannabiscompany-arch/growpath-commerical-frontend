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
      "/home/alerts?alertId=alert-1"
    );
    expect(
      getRouteForItem(
        item({
          id: "log-1",
          type: "log",
          entityLinks: { growId: "grow-1" }
        })
      )
    ).toBe("/home/facility/logs/log-1");
  });

  it("keeps commercial activity out of dead root task URLs", () => {
    expect(
      getRouteForItem(item({ id: "task-2", type: "task", scope: { facilityId: "" } }))
    ).toBe("/home/commercial/tasks/task-2");
  });

  it("routes storefront metadata aliases to the public storefront, not the legacy brand profile", () => {
    expect(
      getRouteForItem(
        item({
          id: "campaign-1",
          type: "alert",
          metadata: { storefrontSlug: "living-soil-labs" }
        })
      )
    ).toBe("/store/living-soil-labs");

    expect(
      getRouteForItem(
        item({
          id: "campaign-2",
          type: "alert",
          metadata: { brandSlug: "living-soil-labs" }
        })
      )
    ).toBe("/store/living-soil-labs");

    expect(
      getRouteForItem(
        item({
          id: "campaign-3",
          type: "alert",
          metadata: { linkedStorefrontSlug: "linked-soil-labs" }
        })
      )
    ).toBe("/store/linked-soil-labs");

    expect(
      getRouteForItem(
        item({
          id: "campaign-4",
          type: "alert",
          metadata: { publicSlug: "public-soil-labs" }
        })
      )
    ).toBe("/store/public-soil-labs");
  });

  it("routes product and course metadata to exact storefront destinations", () => {
    expect(
      getRouteForItem(
        item({
          id: "campaign-product",
          type: "alert",
          metadata: {
            storefrontSlug: "living-soil-labs",
            linkedProductId: "veg-mix-1"
          }
        })
      )
    ).toBe("/store/living-soil-labs/products/veg-mix-1");

    expect(
      getRouteForItem(
        item({
          id: "campaign-course",
          type: "alert",
          metadata: {
            storefrontSlug: "living-soil-labs",
            linkedCourseId: "course-1"
          }
        })
      )
    ).toBe("/store/living-soil-labs/courses/course-1");

    expect(
      getRouteForItem(
        item({
          id: "campaign-product-alias",
          type: "alert",
          metadata: {
            brandSlug: "soil-school",
            linkedProductId: "veg-mix-1"
          }
        })
      )
    ).toBe("/store/soil-school/products/veg-mix-1");

    expect(
      getRouteForItem(
        item({
          id: "campaign-course-alias",
          type: "alert",
          metadata: {
            publicSlug: "soil-school",
            linkedCourseId: "course-1"
          }
        })
      )
    ).toBe("/store/soil-school/courses/course-1");
  });

  it("falls back to public discovery when product or course metadata lacks a storefront", () => {
    expect(
      getRouteForItem(
        item({
          id: "campaign-product",
          type: "alert",
          metadata: { productId: "veg-mix-1" }
        })
      )
    ).toBe("/store?q=veg-mix-1");

    expect(
      getRouteForItem(
        item({
          id: "campaign-course",
          type: "alert",
          metadata: { courseId: "course-1" }
        })
      )
    ).toBe("/courses?courseId=course-1");
  });

  it("preserves plant ids for facility source cards", () => {
    expect(
      getRouteForItem(
        item({
          id: "note-1",
          type: "note",
          entityLinks: { plantId: "plant-1" }
        })
      )
    ).toBe("/home/facility/plants/plant-1");
  });
});
