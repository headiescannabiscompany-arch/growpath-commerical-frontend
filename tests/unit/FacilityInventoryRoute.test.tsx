import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityInventoryTab from "@/app/home/facility/(tabs)/inventory";

const mockApiRequest = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockApiErrorHandler = (error: any) => error;
const mockRouter = { push: mockPush, replace: mockReplace };
let mockCapabilities = new Set(["inventory_write", "audit_read"]);

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
  CAPABILITY_KEYS: {
    INVENTORY_WRITE: "inventory_write",
    AUDIT_READ: "audit_read"
  },
  useEntitlements: () => ({ can: (key: string) => mockCapabilities.has(key) })
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
    mockCapabilities = new Set(["inventory_write", "audit_read"]);
  });

  it("does not show AI stock-risk review before inventory exists", async () => {
    mockApiRequest.mockResolvedValue({ items: [] });

    const screen = render(<FacilityInventoryTab />);

    expect(
      screen.getByLabelText("Loading facility inventory").props.accessibilityRole
    ).toBe("progressbar");

    await waitFor(() => {
      expect(
        screen.getByRole("header", { name: "Facility Inventory" }).props["aria-level"]
      ).toBe(1);
      expect(
        screen.getByRole("header", { name: "No inventory items yet." }).props[
          "aria-level"
        ]
      ).toBe(2);
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
    expect(screen.getByLabelText("Search facility inventory").props.placeholder).toBe(
      "Search SKU, name, category, vendor, or location"
    );
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
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
          unit: "lb",
          vendor: "Coastal Inputs",
          authorizedUnitCost: 12.5,
          currency: "USD",
          alerts: {
            lowStock: true,
            outOfStock: false,
            held: true,
            expiredLots: 0,
            expiringSoonLots: 1,
            lotQuantityExceedsItem: false,
            unallocatedQuantity: 0,
            sourceAgeDays: 21
          }
        }
      ]
    });

    const screen = render(<FacilityInventoryTab />);

    await waitFor(() => {
      expect(screen.getByText("Kelp Meal")).toBeTruthy();
      expect(screen.getByLabelText("Create inventory item")).toBeTruthy();
      expect(screen.getByLabelText("Open inventory AI review")).toBeTruthy();
      expect(screen.getAllByText("low stock").length).toBeGreaterThan(0);
      expect(screen.getByText("Vendor: Coastal Inputs")).toBeTruthy();
      expect(screen.getByText("Authorized unit cost: USD 12.5")).toBeTruthy();
      expect(screen.getByText("1 items | 2 lb")).toBeTruthy();
      expect(screen.getByText("Inventory held")).toBeTruthy();
      expect(screen.getByText("1 lot expires within 30 days")).toBeTruthy();
      expect(screen.getByText("Source evidence age: 21 days")).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Create inventory item"));
    expect(mockPush).toHaveBeenCalledWith("/home/facility/inventory/new");

    fireEvent.press(screen.getByLabelText("Open inventory item Kelp Meal"));
    expect(
      screen.getByLabelText("Open inventory item Kelp Meal").props.accessibilityRole
    ).toBe("link");
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/home/facility/inventory/[id]",
      params: { id: "item-1" }
    });
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
  });

  it("hides the full audit export without AUDIT_READ", async () => {
    mockCapabilities = new Set(["inventory_write"]);
    mockApiRequest.mockResolvedValue({
      items: [{ id: "item-1", name: "Kelp Meal", quantity: 2, unit: "lb" }]
    });

    const screen = render(<FacilityInventoryTab />);
    await screen.findByText("Kelp Meal");

    expect(screen.queryByLabelText("Export facility inventory full audit CSV")).toBeNull();
    expect(screen.getByLabelText("Export facility inventory CSV")).toBeTruthy();
  });

  it("searches SKU, name, category, vendor, and location without hiding the true no-match state", async () => {
    mockApiRequest.mockResolvedValue({
      items: [
        {
          id: "item-1",
          name: "Kelp Meal",
          sku: "KELP-01",
          quantity: 2,
          reorderPoint: 5,
          unit: "lb",
          category: "amendment",
          vendor: "Coastal Inputs",
          location: "Shelf A"
        },
        {
          id: "item-2",
          name: "Coir Brick",
          sku: "COIR-09",
          quantity: 8,
          reorderPoint: 2,
          unit: "ea",
          category: "substrate",
          vendor: "Tropic Supply",
          location: "Bay 7"
        }
      ]
    });
    const screen = render(<FacilityInventoryTab />);

    await screen.findByText("Kelp Meal");
    expect(screen.getByText("Coir Brick")).toBeTruthy();

    for (const query of [
      "kElP-01",
      "KeLp MeAl",
      "AMENDMENT",
      "cOaStAl InPuTs",
      "sHeLf A"
    ]) {
      fireEvent.changeText(screen.getByLabelText("Search facility inventory"), query);
      await waitFor(() => {
        expect(screen.getByText("Kelp Meal")).toBeTruthy();
        expect(screen.queryByText("Coir Brick")).toBeNull();
      });
    }

    fireEvent.changeText(
      screen.getByLabelText("Search facility inventory"),
      "not stocked"
    );
    await waitFor(() =>
      expect(
        screen.getByRole("header", {
          name: "No inventory items match “not stocked”."
        }).props["aria-level"]
      ).toBe(2)
    );
    expect(
      screen.getByText("Try another SKU, name, category, vendor, or location.")
    ).toBeTruthy();
    expect(screen.queryByText("No inventory items yet.")).toBeNull();
    expect(screen.getByText("Showing 0 of 2 inventory items.")).toBeTruthy();
  });
});
