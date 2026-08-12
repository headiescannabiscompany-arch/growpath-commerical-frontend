import { notificationHrefFromData } from "@/notifications/useNotificationDeepLinks";

describe("notificationHrefFromData", () => {
  it("routes nested task payloads through the canonical workspace source resolver", () => {
    expect(
      notificationHrefFromData({
        data: {
          sourceType: "task",
          sourceId: "task-1",
          workspaceType: "facility"
        }
      })
    ).toBe("/home/facility/tasks/task-1");
  });

  it("routes courses, lives, products, and tool runs with their source context", () => {
    expect(notificationHrefFromData({ sourceType: "course", sourceId: "course-1" })).toBe(
      "/home/personal/courses?courseId=course-1"
    );
    expect(notificationHrefFromData({ sourceType: "live", sourceId: "live-1" })).toBe(
      "/live-session?sessionId=live-1"
    );
    expect(
      notificationHrefFromData({
        sourceType: "product",
        sourceId: "product-1",
        storefrontSlug: "soil-lab"
      })
    ).toBe("/store/soil-lab/products/product-1");
    expect(notificationHrefFromData({ sourceType: "tool_run", sourceId: "run-1" })).toBe(
      "/home/personal/tools/saved-runs?toolRunId=run-1"
    );
    expect(notificationHrefFromData({ sourceType: "video", sourceId: "video-1" })).toBe(
      "/videos/video-1"
    );
    expect(notificationHrefFromData({ sourceType: "upload" })).toBe(
      "/videos?tab=library"
    );
  });

  it("keeps legacy forum pushes useful and rejects external action URLs", () => {
    expect(notificationHrefFromData({ postId: "post 1" })).toBe(
      "/forum/post?id=post%201"
    );
    expect(
      notificationHrefFromData({
        actionUrl: "https://malicious.example/redirect",
        notificationId: "notification-1"
      })
    ).toBe("/home/notifications?notificationId=notification-1");
  });

  it("accepts app-relative action URLs and ignores empty payloads", () => {
    expect(notificationHrefFromData({ actionUrl: "/home/personal/grows" })).toBe(
      "/home/personal/grows"
    );
    expect(notificationHrefFromData({})).toBeNull();
    expect(notificationHrefFromData(null)).toBeNull();
  });
});
