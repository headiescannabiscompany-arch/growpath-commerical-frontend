import React from "react";
import { render } from "@testing-library/react-native";

import FacilityCreateInventoryItemRoute from "@/app/home/facility/inventory/new";

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
  useEntitlements: () => ({ can: () => true })
}));

describe("FacilityCreateInventoryItemRoute", () => {
  it("uses the shared back control for the canonical nested create route", () => {
    const screen = render(<FacilityCreateInventoryItemRoute />);

    expect(screen.getAllByText("Create Inventory Item").length).toBeGreaterThan(0);
    expect(screen.getByText("Shared Back /home/facility/inventory")).toBeTruthy();
    expect(screen.getByLabelText("Inventory item name")).toBeTruthy();
  });
});
