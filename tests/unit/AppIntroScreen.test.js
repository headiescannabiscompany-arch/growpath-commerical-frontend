import React from "react";
import { render } from "@testing-library/react-native";

import AppIntroScreen from "@/screens/AppIntroScreen";

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve())
}));

describe("AppIntroScreen copy", () => {
  it("separates workspaces, Feed/Campaigns, and Forum/Q&A in onboarding", () => {
    const screen = render(<AppIntroScreen onDone={jest.fn()} />);

    expect(screen.getByText("Cultivation workspaces, connected.")).toBeTruthy();
    expect(screen.getByText(/Commercial brands run storefronts/i)).toBeTruthy();
    expect(screen.getByText(/Feed\/Campaigns/i)).toBeTruthy();
    expect(screen.getByText(/Forum\/Q&A stays focused on discussion and support/i)).toBeTruthy();
    expect(screen.queryByText("Cultivation community, united.")).toBeNull();
  });
});
