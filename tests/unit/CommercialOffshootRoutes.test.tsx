import React from "react";
import { render } from "@testing-library/react-native";

import CommercialLinksRoute from "@/app/home/commercial/links";
import CommercialSocialToolsRoute from "@/app/home/commercial/social-tools";

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppPage(props: any) {
    return <View testID={`page-${props.routeKey}`}>{props.children}</View>;
  };
});

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
  it("mounts the Commercial public-links destination in the shared page shell", () => {
    const screen = render(<CommercialLinksRoute />);

    expect(screen.getByTestId("page-commercial-links")).toBeTruthy();
    expect(screen.getByText("Links screen")).toBeTruthy();
  });

  it("mounts External Channels in the shared page shell", () => {
    const screen = render(<CommercialSocialToolsRoute />);

    expect(screen.getByTestId("page-commercial-social-tools")).toBeTruthy();
    expect(screen.getByText("External channels screen")).toBeTruthy();
  });
});
