import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityIntegrationsRoute from "@/app/home/facility/(tabs)/integrations";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ facilityRole: "OWNER" })
}));
jest.mock("@/api/integrations", () => ({
  listIntegrationConnections: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});

describe("FacilityIntegrationsRoute", () => {
  it("makes Pulse and TrolMaster selectable and marks planned providers clearly", async () => {
    const screen = render(<FacilityIntegrationsRoute />);

    expect(screen.getByText("Connect rooms and sensor data")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Select pulse integration"));
    expect(screen.getByText("Pulse read-only telemetry")).toBeTruthy();
    fireEvent.press(screen.getByText("Connect Pulse"));
    expect(mockPush).toHaveBeenCalledWith("/home/facility/tools/pulse");

    fireEvent.press(screen.getByLabelText("Select trolmaster integration"));
    expect(screen.getByText("TrolMaster developer access")).toBeTruthy();
    expect(screen.getByText("Developer access required")).toBeTruthy();
    expect(screen.getByText("Open developer portal")).toBeTruthy();
    expect(screen.queryByLabelText("TrolMaster API key")).toBeNull();
    expect(screen.getAllByText("Email to request").length).toBeGreaterThan(1);
    await waitFor(() =>
      expect(screen.queryByText("Connected sources")).toBeNull()
    );
  });
});
