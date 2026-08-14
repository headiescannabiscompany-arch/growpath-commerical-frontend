import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import SearchScreen, { createSearchStyles } from "@/screens/SearchScreen";
import { getThemePalette } from "@/theme/appTheme";

let mockSearchEnabled = true;

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { SEARCH: "search" },
  useEntitlements: () => ({
    can: () => mockSearchEnabled
  })
}));

jest.mock("@/components/AppShell.js", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ placement, routeKey }: any) =>
    React.createElement(Text, null, `Feed placement ${placement} ${routeKey}`);
});

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") })
  };
});

describe("SearchScreen", () => {
  beforeEach(() => {
    mockSearchEnabled = true;
  });

  it("routes storefront discovery to Storefront instead of pricing", () => {
    const navigate = jest.fn();
    const screen = render(<SearchScreen navigation={{ navigate }} />);

    expect(screen.getByRole("header", { name: "Search" })).toHaveProp("aria-level", 1);

    expect(
      screen.getByText(
        "Find storefronts, Feed / Campaigns, courses, Forum/Q&A, and grow records."
      )
    ).toBeTruthy();
    expect(screen.getByText("Storefront")).toBeTruthy();
    expect(
      screen.getByText("Public brand storefronts, products, courses, lives, and offers")
    ).toBeTruthy();
    expect(screen.getByText("Tools")).toBeTruthy();
    expect(
      screen.getByText("NPK, soil builder, IPM, VPD, crop steering, and grow calculators")
    ).toBeTruthy();
    expect(screen.getByText("Feed placement top personal_search")).toBeTruthy();
    expect(screen.getByText("Feed placement bottom personal_search")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Open Tools"));
    fireEvent.press(screen.getByLabelText("Open Storefront"));
    fireEvent.press(screen.getByLabelText("Open Feed / Campaigns"));
    fireEvent.press(screen.getByLabelText("Open Forum"));

    expect(navigate).toHaveBeenCalledWith("Tools");
    expect(navigate).toHaveBeenCalledWith("Storefront");
    expect(navigate).toHaveBeenCalledWith("Feed");
    expect(navigate).toHaveBeenCalledWith("Forum");
    expect(navigate).not.toHaveBeenCalledWith("PricingMatrix");
  });

  it("uses the active palette instead of fixed light surfaces", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createSearchStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.input.backgroundColor).toBe(palette.surface);
    expect(styles.input.color).toBe(palette.text);
    expect(styles.row.backgroundColor).toBe(palette.surface);
    expect(styles.arrow.color).toBe(palette.link);
  });

  it("matches grow-interest and workflow keywords that are not visible titles", () => {
    const navigate = jest.fn();
    const screen = render(<SearchScreen navigation={{ navigate }} />);

    fireEvent.changeText(screen.getByLabelText("Search GrowPath"), "npk");

    expect(screen.getByText("Tools")).toBeTruthy();
    expect(screen.queryByText("Storefront")).toBeNull();

    fireEvent.changeText(screen.getByLabelText("Search GrowPath"), "advertising");

    expect(screen.getByText("Feed / Campaigns")).toBeTruthy();
    expect(screen.queryByText("Forum")).toBeNull();

    fireEvent.changeText(screen.getByLabelText("Search GrowPath"), "brands");

    expect(screen.getByText("Storefront")).toBeTruthy();
    expect(screen.queryByText("Feed / Campaigns")).toBeNull();
  });

  it("keeps navigation shortcuts usable while the full search upgrade is locked", () => {
    mockSearchEnabled = false;
    const navigate = jest.fn();
    const screen = render(<SearchScreen navigation={{ navigate }} />);

    fireEvent.press(screen.getByLabelText("Upgrade to unlock search"));
    fireEvent.press(screen.getByLabelText("Open Storefront"));

    expect(navigate).toHaveBeenCalledWith("Subscription");
    expect(navigate).toHaveBeenCalledWith("Storefront");
  });
});
