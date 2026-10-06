import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import AppPage from "@/components/layout/AppPage";
import { Text } from "react-native";

import CommercialLinksRoute from "@/app/home/commercial/links";
import CommercialSocialToolsRoute from "@/app/home/commercial/social-tools";

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: mockCanGoBack })
}));
jest.mock("@/components/feed/FeedBanner", () => () => null);
jest.mock("@/components/feed/FeedRail", () => () => null);
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ mode: "commercial", plan: "commercial" })
}));
jest.mock("@/utils/feedPolicy", () => ({
  getFeedPolicy: () => ({ slots: 0 }),
  getFeedBannerPolicy: () => ({ top: false, middle: false, bottom: false })
}));

jest.mock("@/screens/LinksScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockLinksScreen() {
    return <Text>Links screen</Text>;
  };
});

jest.mock("@/screens/SocialToolsScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockSocialToolsScreen() {
    return <Text>External channels screen</Text>;
  };
});

describe("Commercial offshoot routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
  });

  it("mounts the Commercial public-links destination in the shared page shell", () => {
    const screen = render(<CommercialLinksRoute />);

    expect(screen.getByTestId("app-page-main")).toBeTruthy();
    expect(screen.getByText("Links screen")).toBeTruthy();
  });

  it("mounts External Channels in the shared page shell", () => {
    const screen = render(<CommercialSocialToolsRoute />);

    expect(screen.getByTestId("app-page-main")).toBeTruthy();
    expect(screen.getByText("External channels screen")).toBeTruthy();
  });

  it.each([
    ["Public Links", CommercialLinksRoute],
    ["External Channels", CommercialSocialToolsRoute]
  ] as const)("returns %s to More instead of unrelated tab history", (_name, Route) => {
    const screen = render(<Route />);
    fireEvent.press(screen.getByLabelText("Back"));
    expect(mockReplace).toHaveBeenCalledWith("/home/commercial/more");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it.each([CommercialLinksRoute, CommercialSocialToolsRoute])(
    "returns a directly opened offshoot to More without history",
    (Route) => {
      mockCanGoBack.mockReturnValue(false);
      const screen = render(<Route />);
      fireEvent.press(screen.getByLabelText("Back"));
      expect(mockReplace).toHaveBeenCalledWith("/home/commercial/more");
      expect(mockBack).not.toHaveBeenCalled();
    }
  );

  it("preserves ordinary AppPage history navigation", () => {
    const screen = render(
      <AppPage routeKey="ordinary" backFallbackHref="/account/workspace">
        <Text>Ordinary page</Text>
      </AppPage>
    );
    fireEvent.press(screen.getByLabelText("Back"));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
