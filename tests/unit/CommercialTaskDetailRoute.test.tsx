import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialTaskDetailRoute from "@/app/(commercial)/tasks/[id]";

const mockBack = jest.fn();
const mockApiRequest = jest.fn();
const mockApiErrorHandler = Object.assign(jest.fn(() => null), {
  toInlineError: jest.fn(() => null)
});

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "task-1" }),
  useRouter: () => ({ back: mockBack })
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
          sourceId: "product-1"
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
});
