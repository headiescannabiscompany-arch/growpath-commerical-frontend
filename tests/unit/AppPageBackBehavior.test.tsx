import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import AppPage from "@/components/layout/AppPage";

jest.mock("@/components/nav/BackButton", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockBackButton(props: { fallbackHref?: string }) {
    return <Text>Shared Back {props.fallbackHref || "default"}</Text>;
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

  it("keeps the commercial dashboard as a root page", () => {
    const screen = render(
      <AppPage routeKey="commercial_home">
        <Text>Commercial dashboard</Text>
      </AppPage>
    );

    expect(screen.queryByText("Shared Back")).toBeNull();
    expect(screen.getByText("Commercial dashboard")).toBeTruthy();
  });

  it("hides the shared back button on commercial orders root page", () => {
    const screen = render(
      <AppPage routeKey="orders">
        <Text>Orders root</Text>
      </AppPage>
    );

    expect(screen.queryByText("Shared Back")).toBeNull();
    expect(screen.getByText("Orders root")).toBeTruthy();
  });

  it("shows the shared back button on nested pages by default", () => {
    const screen = render(
      <AppPage routeKey="commercial-product-detail">
        <Text>Product detail</Text>
      </AppPage>
    );

    expect(screen.getByText("Shared Back default")).toBeTruthy();
    expect(screen.getByText("Product detail")).toBeTruthy();
  });

  it("passes nested fallback destinations into the shared back button", () => {
    const screen = render(
      <AppPage
        routeKey="commercial-product-detail"
        backFallbackHref="/home/commercial/products"
      >
        <Text>Product detail</Text>
      </AppPage>
    );

    expect(screen.getByText("Shared Back /home/commercial/products")).toBeTruthy();
  });

  it("shows the shared back button on commercial create pages", () => {
    const productScreen = render(
      <AppPage routeKey="commercial-product-create">
        <Text>Create product</Text>
      </AppPage>
    );
    expect(productScreen.getByText("Shared Back default")).toBeTruthy();

    const growScreen = render(
      <AppPage routeKey="commercial-grow-create">
        <Text>Create evidence run</Text>
      </AppPage>
    );
    expect(growScreen.getByText("Shared Back default")).toBeTruthy();
  });
});
