import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialAlertDetailRoute from "@/app/(commercial)/alerts/[id]";

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockApiRequest = jest.fn();
const mockApiErrorHandler = Object.assign(
  jest.fn(() => null),
  {
    toInlineError: jest.fn(() => null)
  }
);
let alertPayload: Record<string, any>;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "alert-1" }),
  useRouter: () => ({ back: mockBack, push: mockPush })
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => mockApiErrorHandler
}));

describe("CommercialAlertDetailRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    alertPayload = {
      id: "alert-1",
      title: "Product missing Stripe price",
      message: "Connect Stripe before publishing this campaign.",
      severity: "warning",
      sourceType: "product",
      sourceId: "product-1"
    };
    mockApiRequest.mockImplementation((url: string, options?: any) => {
      if (url === "/api/alerts/alert-1" && options?.method === "GET") {
        return Promise.resolve(alertPayload);
      }
      if (url === "/api/tasks" && options?.method === "POST") {
        return Promise.resolve({ id: "task-1", ...options.body });
      }
      return Promise.resolve(null);
    });
  });

  it("creates a source-linked task from an alert", async () => {
    const screen = render(<CommercialAlertDetailRoute />);

    await waitFor(() =>
      expect(screen.getAllByText("Product missing Stripe price").length).toBeGreaterThan(
        0
      )
    );

    fireEvent.press(screen.getByLabelText("Create task from alert"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            title: "Product missing Stripe price",
            description: "Connect Stripe before publishing this campaign.",
            priority: "medium",
            sourceType: "alert",
            sourceId: "alert-1",
            sourceObjectId: "alert-1",
            linkedAlertId: "alert-1",
            alertSourceType: "product",
            alertSourceId: "product-1",
            linkedProductId: "product-1",
            status: "open"
          })
        })
      )
    );
    expect(screen.getByText("Task created from this alert.")).toBeTruthy();
  });

  it("opens the alert-linked commercial source object", async () => {
    const screen = render(<CommercialAlertDetailRoute />);

    await waitFor(() =>
      expect(screen.getAllByText("Product missing Stripe price").length).toBeGreaterThan(
        0
      )
    );

    fireEvent.press(screen.getByLabelText("View commercial alert linked object"));

    expect(mockPush).toHaveBeenCalledWith("/home/commercial/products/product-1");
  });

  it("creates a task from a linked-only product batch alert source", async () => {
    alertPayload = {
      id: "alert-1",
      title: "Batch QA review",
      message: "Review the latest product batch.",
      severity: "warning",
      sourceType: "product_batch",
      linkedProductBatchId: "batch-linked-1"
    };

    const screen = render(<CommercialAlertDetailRoute />);

    await waitFor(() =>
      expect(screen.getAllByText("Batch QA review").length).toBeGreaterThan(0)
    );

    fireEvent.press(screen.getByLabelText("Create task from alert"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            title: "Batch QA review",
            description: "Review the latest product batch.",
            priority: "medium",
            sourceType: "alert",
            sourceId: "alert-1",
            sourceObjectId: "alert-1",
            linkedAlertId: "alert-1",
            alertSourceType: "product_batch",
            alertSourceId: "batch-linked-1",
            linkedProductBatchId: "batch-linked-1",
            status: "open"
          })
        })
      )
    );

    fireEvent.press(screen.getByLabelText("View commercial alert linked object"));

    expect(mockPush).toHaveBeenCalledWith(
      "/home/commercial/batch-planner/batch-linked-1"
    );
  });

  it("creates a task from a linked-only feed campaign alert source", async () => {
    alertPayload = {
      id: "alert-1",
      title: "Campaign destination review",
      message: "Fix the campaign destination before publishing.",
      severity: "warning",
      sourceType: "feed_campaign",
      linkedFeedCampaignId: "campaign-linked-1"
    };

    const screen = render(<CommercialAlertDetailRoute />);

    await waitFor(() =>
      expect(screen.getAllByText("Campaign destination review").length).toBeGreaterThan(0)
    );

    fireEvent.press(screen.getByLabelText("Create task from alert"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            title: "Campaign destination review",
            description: "Fix the campaign destination before publishing.",
            priority: "medium",
            sourceType: "alert",
            sourceId: "alert-1",
            sourceObjectId: "alert-1",
            linkedAlertId: "alert-1",
            alertSourceType: "feed_campaign",
            alertSourceId: "campaign-linked-1",
            linkedFeedCampaignId: "campaign-linked-1",
            status: "open"
          })
        })
      )
    );

    fireEvent.press(screen.getByLabelText("View commercial alert linked object"));

    expect(mockPush).toHaveBeenCalledWith(
      "/home/commercial/feed?campaignId=campaign-linked-1"
    );
  });
});
