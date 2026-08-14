import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import SearchRoute, { searchHref } from "@/app/search";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ ctx: { mode: "commercial" } })
}));

jest.mock("@/screens/SearchScreen", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return ({ navigation }: any) =>
    React.createElement(
      Pressable,
      {
        accessibilityLabel: "Open mocked Tools result",
        accessibilityRole: "button",
        onPress: () => navigation.navigate("Tools")
      },
      React.createElement(Text, null, "Open Tools")
    );
});

describe("Search web route mapping", () => {
  it("maps shared and workspace-specific destinations to canonical web routes", () => {
    expect(searchHref("Storefront", "personal")).toBe("/store");
    expect(searchHref("Feed", "commercial")).toBe("/feed");
    expect(searchHref("Tools", "personal")).toBe("/home/personal/tools");
    expect(searchHref("Tools", "commercial")).toBe("/home/commercial/tools");
    expect(searchHref("Tools", "facility")).toBe("/home/facility/ai-tools");
    expect(searchHref("Forum", "commercial")).toBe("/home/commercial/community");
    expect(searchHref("Plants", "facility")).toBe("/home/facility/grows");
    expect(searchHref("Subscription", "personal")).toBe("/offers");
  });

  it("routes results from the authenticated workspace context", () => {
    const screen = render(<SearchRoute />);

    fireEvent.press(screen.getByLabelText("Open mocked Tools result"));

    expect(mockPush).toHaveBeenCalledWith("/home/commercial/tools");
  });
});
