import React from "react";
import { render } from "@testing-library/react-native";

import CreatePostRoute from "@/app/create-post";

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

describe("CreatePostRoute", () => {
  beforeEach(() => {
    mockEntitlements.mockReset();
  });

  it("sends personal users to Forum/Q&A post creation", () => {
    mockEntitlements.mockReturnValue({ mode: "personal" });

    const screen = render(<CreatePostRoute />);

    expect(screen.getByLabelText("Redirect /home/personal/forum/new-post")).toBeTruthy();
  });

  it("sends commercial users to Feed / Campaigns", () => {
    mockEntitlements.mockReturnValue({ mode: "commercial" });

    const screen = render(<CreatePostRoute />);

    expect(screen.getByLabelText("Redirect /home/commercial/feed")).toBeTruthy();
  });

  it("sends facility users to facility outreach campaigns", () => {
    mockEntitlements.mockReturnValue({ mode: "facility" });

    const screen = render(<CreatePostRoute />);

    expect(screen.getByLabelText("Redirect /home/facility/feed")).toBeTruthy();
  });
});
