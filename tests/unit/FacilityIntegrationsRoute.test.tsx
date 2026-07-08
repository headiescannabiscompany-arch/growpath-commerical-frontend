import React from "react";
import { render } from "@testing-library/react-native";

import FacilityIntegrationsRoute from "@/app/home/facility/(tabs)/integrations";

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: any) => React.createElement(React.Fragment, null, children)
  };
});

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});

describe("FacilityIntegrationsRoute", () => {
  it("surfaces read-only provider import guidance and room preview handoff", () => {
    const screen = render(<FacilityIntegrationsRoute />);

    expect(screen.getByText("Sensor Integrations")).toBeTruthy();
    expect(screen.getByText("Build rooms from controller data")).toBeTruthy();
    expect(screen.getByText("Open Room Import Preview")).toBeTruthy();

    for (const provider of ["Pulse", "TrolMaster", "AROYA", "Growlink"]) {
      expect(screen.getByText(provider)).toBeTruthy();
    }

    expect(screen.getByText("Read-only sync comes first.")).toBeTruthy();
    expect(
      screen.getByText(
        "Write/control endpoints stay disabled unless explicitly reviewed."
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        /Imported data should power rooms, alerts, VPD\/dew point review, AI summaries,/
      )
    ).toBeTruthy();
  });
});
