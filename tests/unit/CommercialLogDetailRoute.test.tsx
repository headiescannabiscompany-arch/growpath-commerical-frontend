import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import CommercialLogDetailRoute from "@/app/(commercial)/logs/[id]";

const mockApiRequest = jest.fn();
const mockApiErrorHandler = {
  error: null,
  handleApiError: jest.fn(),
  clearError: jest.fn()
};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "log-1" }),
  useRouter: () => ({ back: jest.fn(), canGoBack: () => false, push: jest.fn() })
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => mockApiErrorHandler
}));

describe("CommercialLogDetailRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiRequest.mockResolvedValue({
      log: {
        id: "log-1",
        sourceType: "storefront",
        message: "Storefront setup was updated.",
        linkedStorefrontSlug: "grow-shop"
      }
    });
  });

  it("loads commercial log detail through the global log endpoint", async () => {
    const screen = render(<CommercialLogDetailRoute />);

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/logs/log-1", {
        method: "GET"
      })
    );

    expect(screen.getByText("Log")).toBeTruthy();
    expect(screen.getByText("id: log-1")).toBeTruthy();
    expect(screen.getByText("Storefront setup was updated.")).toBeTruthy();
    expect(screen.getByText("grow-shop")).toBeTruthy();
  });
});
