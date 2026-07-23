import React from "react";
import { render } from "@testing-library/react-native";

import PersonalTabsLayout from "@/app/home/personal/(tabs)/_layout";

const mockTabs = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  const Tabs = (props: any) => {
    mockTabs(props);
    return React.createElement(React.Fragment, null, props.children);
  };
  Tabs.Screen = () => null;
  return {
    Tabs,
    Redirect: () => null,
    usePathname: () => "/home/personal"
  };
});

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ ready: true, mode: "personal" })
}));

describe("PersonalTabsLayout", () => {
  it("uses readable active and inactive tab labels", () => {
    render(<PersonalTabsLayout />);

    expect(mockTabs).toHaveBeenCalledWith(
      expect.objectContaining({
        screenOptions: expect.objectContaining({
          tabBarActiveTintColor: "#0056B3",
          tabBarInactiveTintColor: "#475569",
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700" }
        })
      })
    );
  });
});
