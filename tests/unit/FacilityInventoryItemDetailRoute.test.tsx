import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import InventoryItemDetailScreen from "@/app/home/facility/inventory/[id]";

const mockApiRequest = jest.fn();
const mockReplace = jest.fn();
const mockHandleApiError = jest.fn();
const mockClearError = jest.fn();
const mockRouter = { replace: mockReplace };

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "input-1" }),
  useRouter: () => mockRouter
}));

jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: ({ children, showBack, backFallbackHref, title }: any) => {
    const React = require("react");
    const { Text, View } = require("react-native");
    return (
      <View>
        <Text>{title}</Text>
        {showBack ? <Text>Shared Back {backFallbackHref}</Text> : null}
        {children}
      </View>
    );
  }
}));

jest.mock("@/components/InlineError", () => ({
  InlineError: () => null
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { INVENTORY_WRITE: "inventory_write" },
  useEntitlements: () => ({ can: () => true })
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => ({
    error: null,
    handleApiError: mockHandleApiError,
    clearError: mockClearError
  })
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/api/endpoints", () => ({
  endpoints: {
    inventoryItem: (facilityId: string, itemId: string) =>
      `/api/facilities/${facilityId}/inventory/${itemId}`
  }
}));

describe("InventoryItemDetailScreen", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockReplace.mockReset();
    mockHandleApiError.mockReset();
    mockClearError.mockReset();
    mockApiRequest.mockResolvedValue({
      item: {
        id: "input-1",
        facilityId: "facility-1",
        sku: "KELP-001",
        name: "Kelp Meal",
        quantity: 8,
        unit: "lb",
        reorderPoint: 2,
        createdAt: "2026-07-22T12:00:00.000Z",
        updatedAt: "2026-07-22T13:00:00.000Z"
      }
    });
  });

  it("uses the shared back control for the nested facility inventory detail page", async () => {
    const screen = render(<InventoryItemDetailScreen />);

    await waitFor(() => expect(screen.getByText("Kelp Meal")).toBeTruthy());

    expect(screen.getByText("Shared Back /home/facility/inventory")).toBeTruthy();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/facilities/facility-1/inventory/input-1"
    );
    expect(screen.queryByText("facilityId")).toBeNull();
    expect(screen.queryByText("facility-1")).toBeNull();
    expect(screen.queryByText("id: input-1")).toBeNull();
    expect(screen.getByText("Record information")).toBeTruthy();
    expect(screen.getByText("KELP-001")).toBeTruthy();
  });

  it("confirms and removes an inventory item through the canonical endpoint", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const screen = render(<InventoryItemDetailScreen />);

    await waitFor(() => expect(screen.getByText("Kelp Meal")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Remove inventory item"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Remove inventory item?",
      expect.stringContaining("active facility inventory"),
      expect.any(Array)
    );

    const actions = alertSpy.mock.calls[0][2] as any[];
    await act(async () => {
      await actions.find((action) => action.text === "Remove item").onPress();
    });

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/facilities/facility-1/inventory/input-1",
        { method: "DELETE" }
      )
    );
    expect(mockReplace).toHaveBeenCalledWith("/home/facility/inventory");
    alertSpy.mockRestore();
  });
});
