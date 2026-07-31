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
  it("uses readable active and inactive tab labels and hides field study routes", () => {
    render(<PersonalTabsLayout />);

    expect(mockTabs).toHaveBeenCalledWith(
      expect.objectContaining({
        screenOptions: expect.objectContaining({
          tabBarActiveTintColor: "#166534",
          tabBarInactiveTintColor: "#5F6F5F",
          tabBarStyle: expect.objectContaining({
            backgroundColor: "#FFFFFF",
            borderTopColor: "#D7DDD2"
          }),
          tabBarLabelStyle: expect.objectContaining({
            fontWeight: "700",
            textAlign: "center"
          })
        })
      })
    );

    const props = mockTabs.mock.calls[0][0];
    expect(props.screenOptions.tabBarLabelStyle.fontSize).toBeGreaterThanOrEqual(10);
    const names = React.Children.toArray(props.children).map(
      (child: any) => child.props.name
    );

    expect(names).toEqual(
      expect.arrayContaining(["field-studies/index", "field-studies/[studyId]"])
    );

    const visibleNames = React.Children.toArray(props.children)
      .filter((child: any) => child.props.options?.href !== null)
      .map((child: any) => child.props.name);
    expect(visibleNames).toEqual([
      "index",
      "grows",
      "community",
      "discover",
      "more",
      "profile"
    ]);
    for (const child of React.Children.toArray(props.children) as any[]) {
      if (child.props.options?.href === null) {
        expect(child.props.options.tabBarButton).toBeUndefined();
      }
    }

    const fieldStudiesScreen = React.Children.toArray(props.children).find(
      (child: any) => child.props.name === "field-studies/index"
    ) as any;
    const fieldStudyDetailScreen = React.Children.toArray(props.children).find(
      (child: any) => child.props.name === "field-studies/[studyId]"
    ) as any;

    expect(fieldStudiesScreen.props.options).toEqual({
      href: null,
      title: "Field Studies"
    });
    expect(fieldStudyDetailScreen.props.options).toEqual({
      href: null,
      title: "Field Study"
    });
  });
});
