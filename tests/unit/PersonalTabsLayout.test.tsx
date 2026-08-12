import React from "react";
import { render } from "@testing-library/react-native";

import PersonalTabsLayout from "@/app/home/personal/(tabs)/_layout";
import { getThemePalette } from "@/theme/appTheme";

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
    const palette = getThemePalette("auto", "light");

    expect(mockTabs).toHaveBeenCalledWith(
      expect.objectContaining({
        screenOptions: expect.objectContaining({
          tabBarActiveTintColor: palette.tabActive,
          tabBarInactiveTintColor: palette.tabInactive,
          tabBarIconStyle: { display: "none" },
          tabBarLabelPosition: "beside-icon",
          tabBarStyle: expect.objectContaining({
            backgroundColor: palette.tabBar,
            borderTopColor: palette.tabBarBorder
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
    const discoverScreen = React.Children.toArray(props.children).find(
      (child: any) => child.props.name === "discover"
    ) as any;
    expect(discoverScreen.props.options.tabBarLabel).toBe("Discover");
    expect(discoverScreen.props.options.title).toBe("Discover");
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
