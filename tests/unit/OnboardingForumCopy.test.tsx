import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import GuildOnboardingScreen from "@/app/onboarding/guilds";
import WalkthroughsScreen from "@/app/onboarding/walkthroughs";

const mockListGuilds = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, any> = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace })
}));

jest.mock("@/api/communitySocial", () => ({
  listGuilds: (...args: any[]) => mockListGuilds(...args),
  joinGuild: jest.fn()
}));

jest.mock("@/api/users", () => ({
  updateGrowInterests: jest.fn()
}));

describe("onboarding Forum/Q&A copy", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockParams = {};
    mockListGuilds.mockResolvedValue([
      {
        id: "soil-group",
        name: "Living Soil Q&A",
        description: "Soil recipes and amendment timing.",
        memberCount: 8
      }
    ]);
  });

  it("labels onboarding group selection as Forum/Q&A routing", async () => {
    const screen = render(<GuildOnboardingScreen />);

    await waitFor(() => expect(mockListGuilds).toHaveBeenCalled());
    expect(screen.getByText("Forum/Q&A routing")).toBeTruthy();
    expect(screen.getByText("Select your forum groups")).toBeTruthy();
    expect(screen.getByText("Recommended forum groups")).toBeTruthy();
    expect(screen.getByLabelText("Continue after selecting forum groups")).toBeTruthy();
    expect(screen.queryByText("Community routing")).toBeNull();
    expect(screen.queryByText("Select your guilds")).toBeNull();
  });

  it("keeps the Pro walkthrough explicit about Forum/Q&A separation", () => {
    mockParams = { plan: "pro" };
    const screen = render(<WalkthroughsScreen />);

    expect(screen.getByText("Keep Forum/Q&A separated")).toBeTruthy();
    expect(
      screen.getByText(/forum-group selections shape Feed campaigns/)
    ).toBeTruthy();
    expect(screen.queryByText("Keep community separated")).toBeNull();
  });
});
