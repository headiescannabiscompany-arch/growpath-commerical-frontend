import React from "react";
import { render } from "@testing-library/react-native";

import CommercialTabsLayout from "@/app/home/commercial/_layout";
import FacilityTabsLayout from "@/app/home/facility/(tabs)/_layout";

const mockTabs = jest.fn();
const mockUseWindowDimensions = jest.fn();
let mockMode: "commercial" | "facility" = "commercial";

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return new Proxy(actual, {
    get(target, property, receiver) {
      if (property === "useWindowDimensions") {
        return () => mockUseWindowDimensions();
      }
      return Reflect.get(target, property, receiver);
    }
  });
});

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text, View } = require("react-native");

  const Screen = () => null;
  const Tabs = (props: any) => {
    mockTabs(props);
    const visibleScreens = React.Children.toArray(props.children).filter(
      (child: any) => child.props.options?.href !== null
    );

    return React.createElement(
      View,
      { testID: "rendered-tab-bar" },
      visibleScreens.map((child: any) => {
        const options = child.props.options || {};
        const label = options.tabBarLabel || options.title || child.props.name;
        return React.createElement(
          Text,
          {
            key: child.props.name,
            accessibilityRole: "tab",
            accessibilityLabel: String(label),
            testID: `rendered-tab-${child.props.name}`
          },
          String(label)
        );
      })
    );
  };
  Tabs.Screen = Screen;

  return {
    Tabs,
    Redirect: ({ href }: { href: string }) =>
      React.createElement(Text, { testID: "redirect" }, href),
    usePathname: () =>
      mockMode === "commercial" ? "/home/commercial" : "/home/facility/dashboard"
  };
});

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    ready: true,
    mode: mockMode,
    facilityId: mockMode === "facility" ? "facility-1" : null
  })
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({
    palette: {
      page: "#F1F7F2",
      accent: "#166534",
      surface: "#FFFFFF",
      text: "#122012",
      tabBar: "#FFFFFF",
      tabBarBorder: "#D7DDD2",
      tabActive: "#166534",
      tabInactive: "#5F6F5F"
    }
  })
}));

function renderedTabNames(screen: ReturnType<typeof render>) {
  return screen.getAllByRole("tab").map((tab) => tab.props.testID);
}

describe("workspace bottom tabs at narrow widths", () => {
  beforeEach(() => {
    mockTabs.mockReset();
    mockUseWindowDimensions.mockReset();
  });

  it("renders exactly the six intended Commercial tabs at 375px", () => {
    mockMode = "commercial";
    mockUseWindowDimensions.mockReturnValue({
      width: 375,
      height: 812,
      scale: 3,
      fontScale: 1
    });

    const screen = render(<CommercialTabsLayout />);

    expect(renderedTabNames(screen)).toEqual([
      "rendered-tab-index",
      "rendered-tab-storefront/index",
      "rendered-tab-feed",
      "rendered-tab-community",
      "rendered-tab-more",
      "rendered-tab-profile"
    ]);
    expect(screen.getAllByRole("tab")).toHaveLength(6);
    expect(screen.getAllByRole("tab").map((tab) => tab.props.children)).toEqual([
      "Dashboard",
      "Storefront",
      "Feed",
      "Forum",
      "More",
      "Profile"
    ]);
    expect(screen.queryByTestId("rendered-tab-grows/index")).toBeNull();
    expect(screen.queryByTestId("rendered-tab-tools/index")).toBeNull();
    expect(screen.queryByTestId("rendered-tab-products/index")).toBeNull();
    expect(screen.queryByTestId("rendered-tab-tools/report")).toBeNull();
    expect(screen.queryByTestId("redirect")).toBeNull();

    const { screenOptions } = mockTabs.mock.calls[0][0];
    expect(screenOptions.tabBarActiveTintColor).toBe("#166534");
    expect(screenOptions.tabBarInactiveTintColor).toBe("#5F6F5F");
    expect(screenOptions.tabBarLabelStyle.fontSize).toBe(9);
    expect(screenOptions.tabBarStyle).toEqual(
      expect.objectContaining({ height: 72, paddingBottom: 22, paddingTop: 4 })
    );
  });

  it("renders exactly the six intended Facility tabs at 390px", () => {
    mockMode = "facility";
    mockUseWindowDimensions.mockReturnValue({
      width: 390,
      height: 844,
      scale: 3,
      fontScale: 1
    });

    const screen = render(<FacilityTabsLayout />);

    expect(renderedTabNames(screen)).toEqual([
      "rendered-tab-dashboard",
      "rendered-tab-grows",
      "rendered-tab-tasks",
      "rendered-tab-compliance",
      "rendered-tab-more",
      "rendered-tab-profile"
    ]);
    expect(screen.getAllByRole("tab")).toHaveLength(6);
    expect(screen.getAllByRole("tab").map((tab) => tab.props.children)).toEqual([
      "Dashboard",
      "Grows",
      "Tasks",
      "Compliance",
      "More",
      "Profile"
    ]);
    expect(screen.queryByTestId("rendered-tab-rooms")).toBeNull();
    expect(screen.queryByTestId("rendered-tab-logs")).toBeNull();
    expect(screen.queryByTestId("rendered-tab-ai-tools")).toBeNull();
    expect(screen.queryByTestId("rendered-tab-tools/harvest-readiness")).toBeNull();
    expect(screen.queryByTestId("redirect")).toBeNull();

    const { children, screenOptions } = mockTabs.mock.calls[0][0];
    const allScreens = React.Children.toArray(children) as React.ReactElement<any>[];
    expect(
      allScreens.find((child) => child.props.name === "sop-runs")?.props.options
        ?.headerShown
    ).toBe(false);
    expect(
      allScreens.find((child) => child.props.name === "audit-logs")?.props.options
        ?.headerShown
    ).toBe(false);
    expect(screenOptions.tabBarActiveTintColor).toBe("#166534");
    expect(screenOptions.tabBarInactiveTintColor).toBe("#5F6F5F");
    expect(screenOptions.tabBarLabelStyle.fontSize).toBe(9);
    expect(screenOptions.tabBarStyle).toEqual(
      expect.objectContaining({ height: 72, paddingBottom: 22, paddingTop: 4 })
    );
  });
});
