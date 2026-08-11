import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityTransfersScreen from "@/app/home/facility/(tabs)/transfers";

const mockApiRequest = jest.fn();
const mockListFacilityTransfers = jest.fn();
const mockCreateFacilityTransfer = jest.fn();
const mockTransitionFacilityTransfer = jest.fn();
let mockFacilityRole = "VIEWER";

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/api/facilityTransfers", () => ({
  createFacilityTransfer: (...args: any[]) => mockCreateFacilityTransfer(...args),
  listFacilityTransfers: (...args: any[]) => mockListFacilityTransfers(...args),
  transitionFacilityTransfer: (...args: any[]) => mockTransitionFacilityTransfer(...args)
}));

jest.mock("@/components/InlineError", () => ({ InlineError: () => null }));
jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ facilityRole: mockFacilityRole })
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

describe("FacilityTransfersScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFacilityRole = "VIEWER";
    mockApiRequest.mockResolvedValue({ items: [] });
    mockListFacilityTransfers.mockResolvedValue([]);
  });

  it("owns one accurate level-one workflow heading for a Viewer", async () => {
    const screen = render(<FacilityTransfersScreen />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(
        screen.getByRole("header", { name: "Licensed Sales & Transfers" }).props[
          "aria-level"
        ]
      ).toBe(1)
    );
    expect(screen.getByText("Your viewer role can view shipment records.")).toBeTruthy();
    expect(screen.queryByText("New licensed transfer")).toBeNull();
    expect(
      screen.getByRole("header", { name: "Verification stays with your facility" }).props[
        "aria-level"
      ]
    ).toBe(2);
    expect(
      screen.getByRole("header", { name: "Transfer history" }).props["aria-level"]
    ).toBe(2);
  });

  it("names the owner transfer, lot-selection, save, and approval controls", async () => {
    mockFacilityRole = "OWNER";
    mockApiRequest.mockResolvedValue({
      items: [
        {
          id: "inventory-1",
          name: "Flower lot A",
          lotNumber: "LOT-A",
          quantity: 12,
          unit: "units"
        }
      ]
    });
    mockListFacilityTransfers.mockResolvedValue([
      {
        id: "transfer-1",
        facilityId: "facility-1",
        itemName: "Flower lot A",
        status: "draft",
        quantity: 2,
        unit: "units",
        total: 40,
        recipientName: "Licensed store",
        recipientLicense: "LIC-1",
        recipientState: "MD"
      }
    ]);

    const screen = render(<FacilityTransfersScreen />);

    const newTransfer = await screen.findByRole("button", {
      name: "Create a new licensed transfer"
    });
    fireEvent.press(newTransfer);

    const lot = screen.getByRole("button", {
      name: "Select inventory lot Flower lot A"
    });
    expect(lot.props.accessibilityState).toEqual({ selected: false });
    fireEvent.press(lot);
    expect(
      screen.getByRole("button", { name: "Select inventory lot Flower lot A" }).props
        .accessibilityState
    ).toEqual({ selected: true });
    expect(
      screen.getByRole("button", { name: "Save licensed transfer as draft" }).props
        .accessibilityState
    ).toEqual({ disabled: false });
    expect(
      screen.getByRole("button", { name: "Approve transfer for Flower lot A" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close new transfer form" })).toBeTruthy();
  });
});
