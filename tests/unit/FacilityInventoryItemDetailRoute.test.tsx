import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import InventoryItemDetailScreen from "@/app/home/facility/inventory/[id]";

const mockApiRequest = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "input-1" }),
  useRouter: () => ({ replace: mockReplace })
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
    handleApiError: jest.fn(),
    clearError: jest.fn()
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
    mockApiRequest.mockResolvedValue({
      item: {
        id: "input-1",
        sku: "KELP-001",
        name: "Kelp Meal",
        quantity: 8,
        unit: "lb",
        reorderPoint: 2
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
  });
});
