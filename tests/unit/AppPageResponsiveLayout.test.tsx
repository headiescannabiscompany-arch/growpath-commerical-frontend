import React from "react";
import { StyleSheet, Text } from "react-native";
import { render } from "@testing-library/react-native";

import AppPage from "@/components/layout/AppPage";

jest.mock("@/components/nav/BackButton", () => () => null);
jest.mock("@/components/feed/FeedBanner", () => () => null);
jest.mock("@/components/feed/FeedRail", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockFeedRail() {
    return <Text>Campaign rail</Text>;
  };
});

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    mode: "commercial",
    plan: "commercial"
  })
}));

jest.mock("@/utils/feedPolicy", () => ({
  getFeedPolicy: () => ({
    slots: 1,
    railMode: "standard"
  }),
  getFeedBannerPolicy: () => ({
    top: false,
    middle: false,
    bottom: false,
    slotsByPlacement: { top: 0, middle: 0, bottom: 0 },
    railMode: "standard"
  })
}));

describe("AppPage responsive layout", () => {
  it("keeps narrow main content and campaign rails in normal document flow", () => {
    const screen = render(
      <AppPage routeKey="commercial-inventory-create">
        <Text>Long commercial form</Text>
      </AppPage>
    );

    const mainStyle = StyleSheet.flatten(screen.getByTestId("app-page-main").props.style);
    const railStyle = StyleSheet.flatten(screen.getByTestId("app-page-rail").props.style);

    expect(screen.getByTestId("app-page-main").props.role).toBe("main");
    expect(mainStyle).toMatchObject({
      flexGrow: 0,
      flexShrink: 0,
      width: "100%"
    });
    expect(mainStyle.flex).toBeUndefined();
    expect(railStyle).toMatchObject({
      flexGrow: 0,
      flexShrink: 0,
      minWidth: 0,
      maxWidth: "100%",
      width: "100%"
    });
    expect(railStyle.flex).toBeUndefined();
  });
});
