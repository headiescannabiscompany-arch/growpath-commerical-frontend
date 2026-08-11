import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import FacilityCreateInventoryItemRoute from "@/app/home/facility/inventory/new";

let mockCanWriteInventory = true;

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn() })
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

jest.mock("@/api/apiRequest", () => ({
  apiRequest: jest.fn()
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
    ).toEqual({ disabled: false });
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
