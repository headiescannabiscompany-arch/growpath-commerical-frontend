import React from "react";
import { render } from "@testing-library/react-native";

import GuildCodeScreen from "@/screens/GuildCodeScreen";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    addListener: jest.fn(() => jest.fn())
  })
}));

describe("GuildCodeScreen forum copy", () => {
  it("keeps forum rules separate from storefront and feed sales flows", () => {
    const screen = render(<GuildCodeScreen />);

    expect(screen.getByText(/The Forum is not a Storefront/)).toBeTruthy();
    expect(
      screen.getByText(
        /Product and course sales belong in approved Storefront and Stripe flows/
      )
    ).toBeTruthy();
    expect(screen.queryByText("The Forum is not a marketplace.")).toBeNull();
  });
});
