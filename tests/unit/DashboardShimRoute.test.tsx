import React from "react";
import { render, screen } from "@testing-library/react-native";

let mockSelectedFacilityId: string | null = null;

jest.mock("expo-router", () => ({
  Redirect: ({ href }: any) => {
    const React = require("react");
    const { Text } = require("react-native");
    return <Text>Redirect {href}</Text>;
  }
}));

jest.mock("@/facility/FacilityProvider", () => ({
  useFacility: () => ({ selectedId: mockSelectedFacilityId })
}));

describe("legacy dashboard shim", () => {
  beforeEach(() => {
    mockSelectedFacilityId = null;
  });

  it("sends unselected facility users to facility selection", () => {
    const DashboardShim = require("@/app/dashboard").default;

    render(<DashboardShim />);

    expect(screen.getByText("Redirect /home/facility/select")).toBeTruthy();
  });

  it("sends selected facility users directly to the canonical dashboard tab", () => {
    mockSelectedFacilityId = "facility-1";
    const DashboardShim = require("@/app/dashboard").default;

    render(<DashboardShim />);

    expect(screen.getByText("Redirect /home/facility/dashboard")).toBeTruthy();
  });
});
