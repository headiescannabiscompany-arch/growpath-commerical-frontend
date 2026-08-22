import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityCreateInventoryItemRoute from "@/app/home/facility/inventory/new";

let mockCanWriteInventory = true;
const mockApiRequest = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace })
}));

jest.mock("@/components/forms/CalendarDateField", () => {
  const React = require("react");
  const { TextInput } = require("react-native");
  return ({ accessibilityLabel, disabled, onChange, value }: any) =>
    React.createElement(TextInput, {
      accessibilityLabel,
      editable: !disabled,
      onChangeText: onChange,
      value
    });
});

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

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/api/endpoints", () => ({
  endpoints: {
    inventory: (facilityId: string) => `/api/facilities/${facilityId}/inventory`
  }
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { INVENTORY_WRITE: "inventory_write" },
  useEntitlements: () => ({ can: () => mockCanWriteInventory })
}));

describe("FacilityCreateInventoryItemRoute", () => {
  beforeEach(() => {
    mockCanWriteInventory = true;
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue({ item: { id: "item-1" } });
    mockReplace.mockReset();
  });

  it("uses the shared back control for the canonical nested create route", () => {
    const screen = render(<FacilityCreateInventoryItemRoute />);

    expect(
      screen.getByRole("header", { name: "Create Inventory Item" }).props["aria-level"]
    ).toBe(1);
    expect(screen.getByText("Shared Back /home/facility/inventory")).toBeTruthy();
    expect(screen.getByLabelText("Inventory item name")).toBeTruthy();
    expect(
      screen.getByLabelText("Create inventory item").props.accessibilityState
    ).toEqual({ disabled: true });
    fireEvent.changeText(screen.getByLabelText("Inventory item name"), "Kelp meal");
    expect(
      screen.getByLabelText("Create inventory item").props.accessibilityState
    ).toEqual({ disabled: true });
    fireEvent.changeText(screen.getByLabelText("Inventory item unit"), "lb");
    expect(
      screen.getByLabelText("Create inventory item").props.accessibilityState
    ).toEqual({ disabled: false });
  });

  it("validates and sends canonical source and private workspace fields", async () => {
    const screen = render(<FacilityCreateInventoryItemRoute />);

    fireEvent.changeText(screen.getByLabelText("Inventory item name"), "Kelp meal");
    fireEvent.changeText(screen.getByLabelText("Inventory item SKU"), "KELP-1");
    fireEvent.changeText(screen.getByLabelText("Inventory item quantity"), "5");
    fireEvent.changeText(screen.getByLabelText("Inventory item unit"), "lb");
    fireEvent.changeText(screen.getByLabelText("Inventory item reorder point"), "2");
    fireEvent.changeText(screen.getByLabelText("Inventory item category"), "amendment");
    fireEvent.changeText(screen.getByLabelText("Inventory item vendor"), "Vendor A");
    fireEvent.changeText(screen.getByLabelText("Inventory item location"), "Shelf A");
    fireEvent.changeText(
      screen.getByLabelText("Inventory item authorized unit cost"),
      "12.50"
    );
    fireEvent.changeText(screen.getByLabelText("Inventory item currency"), "USD");
    fireEvent.changeText(
      screen.getByLabelText("Inventory item source freshness date"),
      "2026-08-01"
    );
    fireEvent.press(screen.getByLabelText("Create inventory item"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/facilities/facility-1/inventory",
        {
          method: "POST",
          body: {
            name: "Kelp meal",
            sku: "KELP-1",
            quantity: 5,
            unit: "lb",
            reorderPoint: 2,
            category: "amendment",
            vendor: "Vendor A",
            locationId: "Shelf A",
            authorizedUnitCost: 12.5,
            currency: "usd",
            sourceFreshnessAt: "2026-08-01"
          }
        }
      )
    );
    expect(mockReplace).toHaveBeenCalledWith("/home/facility/inventory");
  });

  it("renders a true read-only handoff without form fields for viewers", () => {
    mockCanWriteInventory = false;

    const screen = render(<FacilityCreateInventoryItemRoute />);

    expect(screen.getByText("Inventory is read-only")).toBeTruthy();
    expect(screen.getByLabelText("Return to facility inventory")).toBeTruthy();
    expect(screen.queryByLabelText("Inventory item name")).toBeNull();
    expect(screen.queryByLabelText("Create inventory item")).toBeNull();
  });
});
