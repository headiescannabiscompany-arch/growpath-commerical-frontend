import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityInventoryTab from "@/app/home/facility/(tabs)/inventory";

const mockApiRequest = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockApiErrorHandler = { handleApiError: (error: any) => error };
const mockRouter = { push: mockPush, replace: mockReplace };

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: any) => {
    const React = require("react");
    React.useEffect(() => cb(), [cb]);
  }
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/components/InlineError", () => ({
  InlineError: () => null
}));

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { INVENTORY_WRITE: "inventory_write" },
  useEntitlements: () => ({ can: () => true })
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => mockApiErrorHandler
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

describe("FacilityInventoryTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not show AI stock-risk review before inventory exists", async () => {
    mockApiRequest.mockResolvedValue({ items: [] });

    const screen = render(<FacilityInventoryTab />);

    await waitFor(() => {
      expect(screen.getByText("No inventory items yet.")).toBeTruthy();
      expect(
        screen.getByText(
          "Add real inputs, products, packaging, tools, or facility supplies before running AI reorder or stock-risk review."
        )
      ).toBeTruthy();
    });
    expect(screen.queryByLabelText("Open inventory AI review")).toBeNull();
    expect(screen.queryByText("out of stock")).toBeNull();
    expect(screen.queryByText("low stock")).toBeNull();
    expect(screen.queryByText("missing SKU")).toBeNull();
  });

  it("uses canonical facility inventory routes for create and detail", async () => {
    mockApiRequest.mockResolvedValue({
      items: [
        {
          id: "item-1",
          name: "Kelp Meal",
          sku: "KELP-01",
          quantity: 2,
          reorderPoint: 5,
          unit: "lb"
        }
      ]
    });

    const screen = render(<FacilityInventoryTab />);

    await waitFor(() => {
      expect(screen.getByText("Kelp Meal")).toBeTruthy();
      expect(screen.getByLabelText("Create inventory item")).toBeTruthy();
      expect(screen.getByLabelText("Open inventory AI review")).toBeTruthy();
      expect(screen.getAllByText("low stock").length).toBeGreaterThan(0);
    });

    fireEvent.press(screen.getByLabelText("Create inventory item"));
    expect(mockPush).toHaveBeenCalledWith("/home/facility/inventory/new");

    fireEvent.press(screen.getByLabelText("Open inventory item Kelp Meal"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/home/facility/inventory/[id]",
      params: { id: "item-1" }
    });
  });
});
