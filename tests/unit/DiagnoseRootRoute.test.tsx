import React from "react";
import { render } from "@testing-library/react-native";

import DiagnoseRootRoute from "@/app/diagnose";

const mockEntitlements = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Redirect: ({ href }: any) =>
      React.createElement(Text, { accessibilityLabel: `Redirect ${href}` }, href)
  };
});

jest.mock("@/entitlements", () => ({
  useEntitlements: () => mockEntitlements()
}));

describe("DiagnoseRootRoute", () => {
  beforeEach(() => {
    mockEntitlements.mockReset();
  });

  it("redirects personal users to the personal diagnosis workspace", () => {
    mockEntitlements.mockReturnValue({ ready: true, mode: "personal" });

    const screen = render(<DiagnoseRootRoute />);

    expect(screen.getByLabelText("Redirect /home/personal/diagnose")).toBeTruthy();
  });

  it("redirects facility users to facility diagnosis intake", () => {
    mockEntitlements.mockReturnValue({ ready: true, mode: "facility" });

    const screen = render(<DiagnoseRootRoute />);

    expect(
      screen.getByLabelText("Redirect /home/facility/ai-diagnosis-photo")
    ).toBeTruthy();
  });

  it("keeps commercial users out of personal diagnosis", () => {
    mockEntitlements.mockReturnValue({ ready: true, mode: "commercial" });

    const screen = render(<DiagnoseRootRoute />);

    expect(screen.getByLabelText("Redirect /home/commercial")).toBeTruthy();
    expect(screen.queryByLabelText("Redirect /home/personal/diagnose")).toBeNull();
  });
});
