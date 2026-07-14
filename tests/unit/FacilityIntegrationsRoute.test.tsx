import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import FacilityIntegrationsRoute from "@/app/home/facility/(tabs)/integrations";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ facilityRole: "OWNER" })
}));
jest.mock("@/api/integrations", () => ({
  listIntegrationConnections: jest.fn().mockResolvedValue([]),
  createIntegrationConnection: jest.fn(),
  testIntegrationConnection: jest.fn()
}));
jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});

describe("FacilityIntegrationsRoute", () => {
  it("makes Pulse and TrolMaster selectable and marks planned providers clearly", () => {
    const screen = render(<FacilityIntegrationsRoute />);

    expect(screen.getByText("Connect rooms and sensor data")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Select pulse integration"));
    expect(screen.getByText("Pulse read-only telemetry")).toBeTruthy();
    fireEvent.press(screen.getByText("Connect Pulse"));
    expect(mockPush).toHaveBeenCalledWith("/home/facility/tools/pulse");

    fireEvent.press(screen.getByLabelText("Select trolmaster integration"));
    expect(screen.getByText("TrolMaster controller connection")).toBeTruthy();
    expect(screen.getByLabelText("TrolMaster API key")).toBeTruthy();
    expect(screen.getAllByText("Email to request").length).toBeGreaterThan(1);
  });
});
