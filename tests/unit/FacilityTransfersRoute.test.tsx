import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";

import FacilityTransfersScreen from "@/app/home/facility/(tabs)/transfers";

const mockApiRequest = jest.fn();
const mockListFacilityTransfers = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/api/facilityTransfers", () => ({
  createFacilityTransfer: jest.fn(),
  listFacilityTransfers: (...args: any[]) => mockListFacilityTransfers(...args),
  transitionFacilityTransfer: jest.fn()
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
  useEntitlements: () => ({ facilityRole: "VIEWER" })
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

describe("FacilityTransfersScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
