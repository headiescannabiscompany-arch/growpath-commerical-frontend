import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityIntegrationsRoute from "@/app/home/facility/(tabs)/integrations";

const mockPush = jest.fn();
const mockList = jest.fn();
const mockTest = jest.fn();
const mockFetchStructure = jest.fn();
const mockPreview = jest.fn();
const mockConfirm = jest.fn();
const mockAutoBuild = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ facilityRole: "OWNER", selectedFacilityId: "facility-1" })
}));
jest.mock("@/api/integrations", () => ({
  listIntegrationConnections: (...args: any[]) => mockList(...args),
  testIntegrationConnection: (...args: any[]) => mockTest(...args),
  fetchIntegrationStructure: (...args: any[]) => mockFetchStructure(...args),
  previewIntegrationMapping: (...args: any[]) => mockPreview(...args),
  confirmIntegrationMapping: (...args: any[]) => mockConfirm(...args),
  autoBuildIntegrationSpaces: (...args: any[]) => mockAutoBuild(...args)
}));
jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});

describe("FacilityIntegrationsRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockList.mockResolvedValue([]);
  });

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
    await waitFor(() => expect(screen.queryByText("Connected sources")).toBeNull());
  });

  it("tests, previews, edits, and confirms a discovered device mapping", async () => {
    const connection = {
      id: "connection-1",
      provider: "pulse",
      label: "Flower sensors",
      status: "configured",
      capabilities: ["telemetry", "devices"],
      lastSync: { at: null, status: "never", summary: null },
      error: null
    };
    const mapping = {
      deviceId: "device-1",
      deviceName: "Canopy sensor",
      roomName: "Canopy sensor",
      zoneName: "",
      metrics: ["temperature", "humidity"]
    };
    mockList.mockResolvedValue([connection]);
    mockTest.mockResolvedValue({ ...connection, status: "connected" });
    mockFetchStructure.mockResolvedValue({ devices: [{}], suggestedMappings: [mapping] });
    mockPreview.mockResolvedValue({
      provider: "pulse",
      permissionLevel: "read_only",
      deviceCount: 1,
      roomCount: 1,
      zoneCount: 1,
      mappings: [{ ...mapping, roomName: "Flower 1", zoneName: "Canopy" }]
    });
    mockConfirm.mockResolvedValue({ ...connection, status: "connected" });
    mockAutoBuild.mockResolvedValue({ createdOrUpdated: 1, spaces: [] });
    const screen = render(<FacilityIntegrationsRoute />);

    await waitFor(() => expect(screen.getByText("Flower sensors")).toBeTruthy());
    fireEvent.press(screen.getByText("Test + fetch structure"));
    await waitFor(() => expect(screen.getByText("Canopy sensor")).toBeTruthy());
    fireEvent.changeText(screen.getByPlaceholderText("Room"), "Flower 1");
    fireEvent.changeText(screen.getByPlaceholderText("Zone (optional)"), "Canopy");
    fireEvent.press(screen.getByText("Confirm mapping"));

    await waitFor(() =>
      expect(mockConfirm).toHaveBeenCalledWith(
        "connection-1",
        expect.arrayContaining([
          expect.objectContaining({ roomName: "Flower 1", zoneName: "Canopy" })
        ])
      )
    );
    expect(screen.getByText(/Auto-build remains a separate reviewed step/)).toBeTruthy();
    const buildButton = screen.getByRole("button", {
      name: "Build confirmed Facility integration spaces"
    });
    await waitFor(() => expect(buildButton.props.disabled).not.toBe(true));
    fireEvent.press(buildButton);
    await waitFor(() =>
      expect(mockAutoBuild).toHaveBeenCalledWith("connection-1", {
        mode: "facility",
        targetRef: "facility-1"
      })
    );
    expect(screen.getByText(/Built 1 read-only Facility spaces/)).toBeTruthy();
  });
});
