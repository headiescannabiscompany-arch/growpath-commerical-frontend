import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityPulseConnectionRoute, {
  canConfigureFacilityIntegration,
  createFacilityPulseStyles
} from "@/app/home/facility/(tabs)/tools/pulse";
import { getThemePalette } from "@/theme/appTheme";

const mockCreate = jest.fn();
const mockTest = jest.fn();
const mockDevices = jest.fn();
let mockFacilityRole = "OWNER";

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href }: any) => React.cloneElement(children, { href })
  };
});
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ facilityRole: mockFacilityRole })
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
    mockFacilityRole = "OWNER";
    mockCreate.mockResolvedValue({ id: "connection-1" });
    mockTest.mockResolvedValue({ id: "connection-1", status: "connected" });
    mockDevices.mockResolvedValue([{ id: "device-1", name: "Flower Room Temp/RH" }]);
  });

  it("uses the active Night palette and restricts setup to owners and managers", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createFacilityPulseStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.card.backgroundColor).toBe(palette.card);
    expect(styles.input.backgroundColor).toBe(palette.surface);
    expect(styles.input.color).toBe(palette.text);
    expect(canConfigureFacilityIntegration("OWNER")).toBe(true);
    expect(canConfigureFacilityIntegration("MANAGER")).toBe(true);
    expect(canConfigureFacilityIntegration("VIEWER")).toBe(false);
  });

  it("does not expose provider credentials or verification to a Viewer", () => {
    mockFacilityRole = "VIEWER";
    const screen = render(<FacilityPulseConnectionRoute />);

    expect(screen.getByText("Pulse connection setup is read-only")).toBeTruthy();
    expect(screen.queryByLabelText("Pulse API key")).toBeNull();
    expect(screen.queryByText("Verify and discover devices")).toBeNull();
    expect(screen.getByLabelText("Return to Facility integrations").props.href).toBe(
      "/home/facility/integrations"
    );
  });

  it("verifies a grow-scoped key, discovers devices, and prefills room mapping", async () => {
    const screen = render(<FacilityPulseConnectionRoute />);

    fireEvent.changeText(screen.getByLabelText("Pulse API key"), "pulse-secret");
    fireEvent.press(
      screen.getByRole("button", {
        name: "Verify Pulse connection and discover devices"
      })
    );

    await waitFor(() => expect(screen.getByText("Flower Room Temp/RH")).toBeTruthy());
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "pulse",
        credentials: { apiKey: "pulse-secret" },
        config: { facilityId: "facility-1" }
      })
    );

    expect(
      screen.getByRole("header", { name: "Discovered devices" }).props["aria-level"]
    ).toBe(2);
    expect(
      screen.getByRole("link", { name: "Review Pulse room mappings" }).props.href
    ).toEqual({
      pathname: "/home/facility/rooms",
      params: {
        importProvider: "Pulse",
        importDevices: "Flower Room Temp/RH"
      }
    });
  });

  it("requires a key and ignores duplicate submissions while verification is running", async () => {
    let resolveCreate: ((value: any) => void) | undefined;
    mockCreate.mockImplementation(
      () => new Promise((resolve) => (resolveCreate = resolve))
    );
    const screen = render(<FacilityPulseConnectionRoute />);
    const submit = screen.getByRole("button", {
      name: "Verify Pulse connection and discover devices"
    });

    fireEvent.press(submit);
    expect(
      screen.getByText("Enter the API key created in the Pulse grow account.")
    ).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText("Pulse API key"), "pulse-secret");
    fireEvent.press(submit);
    fireEvent.press(submit);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText("Verifying the Pulse key and discovering devices...")
    ).toBeTruthy();

    resolveCreate?.({ id: "connection-1" });
    await waitFor(() => expect(screen.getByText("Flower Room Temp/RH")).toBeTruthy());
  });

  it("keeps the key available for correction when verification fails", async () => {
    mockTest.mockRejectedValue(new Error("Pulse rejected this key."));
    const screen = render(<FacilityPulseConnectionRoute />);

    fireEvent.changeText(screen.getByLabelText("Pulse API key"), "wrong-key");
    fireEvent.press(
      screen.getByRole("button", {
        name: "Verify Pulse connection and discover devices"
      })
    );

    await waitFor(() =>
      expect(screen.getByText("Pulse rejected this key.")).toBeTruthy()
    );
    expect(screen.getByLabelText("Pulse API key").props.value).toBe("wrong-key");
  });
});
