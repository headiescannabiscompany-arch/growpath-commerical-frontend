import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialAlertDetailRoute from "@/app/(commercial)/alerts/[id]";

const mockBack = jest.fn();
const mockApiRequest = jest.fn();
const mockApiErrorHandler = Object.assign(jest.fn(() => null), {
  toInlineError: jest.fn(() => null)
});

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "alert-1" }),
  useRouter: () => ({ back: mockBack })
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
    mockApiRequest.mockImplementation((url: string, options?: any) => {
      if (url === "/api/alerts/alert-1" && options?.method === "GET") {
        return Promise.resolve({
          id: "alert-1",
          title: "Product missing Stripe price",
          message: "Connect Stripe before publishing this campaign.",
          severity: "warning",
          sourceType: "product",
          sourceId: "product-1"
        });
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
      expect(screen.getAllByText("Product missing Stripe price").length).toBeGreaterThan(0)
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
});
