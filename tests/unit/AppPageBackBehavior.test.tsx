import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import AppPage from "@/components/layout/AppPage";

jest.mock("@/components/nav/BackButton", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockBackButton() {
    return <Text>Shared Back</Text>;
  };
});

jest.mock("@/components/feed/FeedBanner", () => () => null);
jest.mock("@/components/feed/FeedRail", () => () => null);
jest.mock("@/components/feed/ForumHighlights", () => () => null);

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    mode: "commercial",
    plan: "commercial"
  })
}));

jest.mock("@/utils/feedPolicy", () => ({
  getFeedPolicy: () => ({ includeForumHighlights: false, slots: 0 }),
  getFeedBannerPolicy: () => ({
    top: false,
    middle: false,
    bottom: false,
    slotsByPlacement: { top: 0, middle: 0, bottom: 0 },
    railMode: "compact"
  })
}));

describe("AppPage back behavior", () => {
  it("hides the shared back button on workspace root pages", () => {
    const screen = render(
      <AppPage routeKey="commercial-products">
        <Text>Products root</Text>
      </AppPage>
    );

    expect(screen.queryByText("Shared Back")).toBeNull();
    expect(screen.getByText("Products root")).toBeTruthy();
  });

  it("shows the shared back button on nested pages by default", () => {
    const screen = render(
      <AppPage routeKey="commercial-product-detail">
        <Text>Product detail</Text>
      </AppPage>
    );

    expect(screen.getByText("Shared Back")).toBeTruthy();
    expect(screen.getByText("Product detail")).toBeTruthy();
  });

  it("shows the shared back button on commercial create pages", () => {
    const productScreen = render(
      <AppPage routeKey="commercial-product-create">
        <Text>Create product</Text>
      </AppPage>
    );
    expect(productScreen.getByText("Shared Back")).toBeTruthy();

    const growScreen = render(
      <AppPage routeKey="commercial-grow-create">
        <Text>Create evidence run</Text>
      </AppPage>
    );
    expect(growScreen.getByText("Shared Back")).toBeTruthy();
  });
});
