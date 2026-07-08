import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialTaskDetailRoute from "@/app/(commercial)/tasks/[id]";

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockApiRequest = jest.fn();
const mockApiErrorHandler = Object.assign(jest.fn(() => null), {
  toInlineError: jest.fn(() => null)
});

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "task-1" }),
  useRouter: () => ({ back: mockBack, push: mockPush })
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => mockApiErrorHandler
}));

describe("CommercialTaskDetailRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApiRequest.mockImplementation((url: string, options?: any) => {
      if (url === "/api/tasks/task-1" && options?.method === "GET") {
        return Promise.resolve({
          id: "task-1",
          title: "Connect Stripe price",
          description: "Product cannot publish until Stripe is ready.",
          priority: "high",
          status: "open",
          sourceType: "product",
          sourceId: "product-1",
          linkedStorefrontSlug: "grow-shop",
          actionItemType: "product_missing_batch",
          actionItemTitle: "Bloom Topdress",
          setupItemLabel: "Stripe price",
          setupItemHelper: "Paid storefront products need checkout before publishing.",
          campaignKind: "live_ad",
          campaignTitle: "Friday mix demo",
          alertSourceType: "product",
          alertSourceId: "product-1",
          growInterests: ["living soil", "dry amendments"],
          linkedProductIds: [],
          linkedProductId: "product-1",
          linkedProductLineId: "line-1",
          linkedRecipeId: "recipe-1",
          linkedProductBatchId: "batch-1",
          linkedCourseIds: [],
          linkedCourseId: "course-1",
          linkedLiveIds: [],
          linkedLiveId: "live-1",
          linkedFeedPostIds: [],
          linkedFeedPostId: "campaign-1",
          linkedForumThreadId: "thread-product",
          linkedGrowIds: [],
          linkedGrowId: "grow-1",
          linkedFacilityId: "facility-1",
          linkedRoomId: "room-1",
          linkedOrderId: "order-1",
          linkedAlertId: "alert-1",
          campaignStartsAt: "2026-07-17T21:00:00Z",
          campaignEndsAt: "2026-07-24T21:00:00Z",
          recurrenceRule: "weekly",
          reminderPlan: { label: "1 hour before", channels: ["in_app"] }
        });
      }
      if (url === "/api/tasks/task-1" && options?.method === "PATCH") {
        return Promise.resolve({
          id: "task-1",
          title: "Connect Stripe price",
          description: "Product cannot publish until Stripe is ready.",
          priority: "high",
          status: "complete",
          completed: true,
          completedAt: options.body.completedAt
        });
      }
      return Promise.resolve(null);
    });
  });

  it("marks a commercial task complete through the global task endpoint", async () => {
    const screen = render(<CommercialTaskDetailRoute />);

    await waitFor(() =>
      expect(screen.getAllByText("Connect Stripe price").length).toBeGreaterThan(0)
    );

    fireEvent.press(screen.getByLabelText("Complete commercial task"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/tasks/task-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            status: "complete",
            completed: true,
            completedAt: expect.any(String)
          })
        })
      )
    );
    expect(screen.getByText("Task marked complete.")).toBeTruthy();
  });

  it("opens the linked source object from the task detail", async () => {
    const screen = render(<CommercialTaskDetailRoute />);

    await waitFor(() =>
      expect(screen.getAllByText("Connect Stripe price").length).toBeGreaterThan(0)
    );
    expect(screen.getByText("Task context")).toBeTruthy();
    expect(screen.getByText("living soil, dry amendments")).toBeTruthy();
    expect(screen.getAllByText("grow-shop").length).toBeGreaterThan(0);
    expect(screen.getByText("Action item type")).toBeTruthy();
    expect(screen.getAllByText("product_missing_batch").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bloom Topdress").length).toBeGreaterThan(0);
    expect(screen.getByText("Campaign type")).toBeTruthy();
    expect(screen.getAllByText("live_ad").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Friday mix demo").length).toBeGreaterThan(0);
    expect(screen.getByText("Alert source type")).toBeTruthy();
    expect(screen.getByText("Alert source ID")).toBeTruthy();
    expect(
      screen.getAllByText("Paid storefront products need checkout before publishing.").length
    ).toBeGreaterThan(0);
    expect(screen.getByText("Products")).toBeTruthy();
    expect(screen.getByText("Courses")).toBeTruthy();
    expect(screen.getByText("Lives")).toBeTruthy();
    expect(screen.getByText("Feed campaigns")).toBeTruthy();
    expect(screen.getByText("Grow evidence")).toBeTruthy();
    expect(screen.getAllByText("product-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("line-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("recipe-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("batch-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("course-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("live-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("campaign-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("thread-product").length).toBeGreaterThan(0);
    expect(screen.getAllByText("grow-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("facility-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("room-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("order-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("alert-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2026-07-17T21:00:00Z").length).toBeGreaterThan(0);
    expect(screen.getAllByText("weekly").length).toBeGreaterThan(0);
    expect(screen.getByText("1 hour before")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("View commercial task source"));

    expect(mockPush).toHaveBeenCalledWith("/home/commercial/products/product-1");
  });
});
