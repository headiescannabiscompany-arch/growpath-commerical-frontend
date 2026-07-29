import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityPulseConnectionRoute from "@/app/home/facility/(tabs)/tools/pulse";

const mockPush = jest.fn();
const mockCreate = jest.fn();
const mockTest = jest.fn();
const mockDevices = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));
jest.mock("@/api/integrations", () => ({
  createIntegrationConnection: (...args: any[]) => mockCreate(...args),
  testIntegrationConnection: (...args: any[]) => mockTest(...args),
  listIntegrationDevices: (...args: any[]) => mockDevices(...args)
}));
jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});

describe("FacilityPulseConnectionRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({ id: "connection-1" });
    mockTest.mockResolvedValue({ id: "connection-1", status: "connected" });
    mockDevices.mockResolvedValue([{ id: "device-1", name: "Flower Room Temp/RH" }]);
  });

  it("verifies a grow-scoped key, discovers devices, and prefills room mapping", async () => {
    const screen = render(<FacilityPulseConnectionRoute />);

    fireEvent.changeText(screen.getByLabelText("Pulse API key"), "pulse-secret");
    fireEvent.press(screen.getByText("Verify and discover devices"));

    await waitFor(() => expect(screen.getByText("Flower Room Temp/RH")).toBeTruthy());
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "pulse",
        credentials: { apiKey: "pulse-secret" },
        config: { facilityId: "facility-1" }
      })
    );

    fireEvent.press(screen.getByText("Review room mappings"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/home/facility/rooms",
      params: {
        importProvider: "Pulse",
        importDevices: "Flower Room Temp/RH"
      }
    });
  });
});
