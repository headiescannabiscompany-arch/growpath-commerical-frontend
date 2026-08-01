import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import GuildOnboardingScreen, {
  createGuildOnboardingStyles
} from "@/app/onboarding/guilds";
import { createPickFacilityStyles } from "@/app/onboarding/pick-facility";
import WalkthroughsScreen, {
  createWalkthroughStyles
} from "@/app/onboarding/walkthroughs";
import { getThemePalette } from "@/theme/appTheme";

const mockListGuilds = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, any> = {};
let mockAuthState: any;
let mockEntitlements: any;

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

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => mockAuthState
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => mockEntitlements
}));

describe("onboarding Forum/Q&A copy", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockParams = {};
    mockAuthState = {
      user: { growInterests: {}, subscriptionStatus: "inactive" },
      retryMe: jest.fn()
    };
    mockEntitlements = { mode: "personal" };
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
    expect(screen.getByRole("header", { name: "Select your forum groups" })).toBeTruthy();
    expect(screen.getByRole("header", { name: "Recommended forum groups" })).toBeTruthy();
    expect(screen.getByLabelText("Continue after selecting forum groups")).toBeTruthy();
    expect(screen.queryByText("Community routing")).toBeNull();
    expect(screen.queryByText("Select your guilds")).toBeNull();
  });

  it("uses forum group fallback copy for unnamed onboarding groups", async () => {
    mockListGuilds.mockResolvedValue([
      {
        id: "unnamed-group",
        name: "",
        description: "Sparse group row.",
        memberCount: 0
      }
    ]);

    const screen = render(<GuildOnboardingScreen />);

    await waitFor(() => expect(mockListGuilds).toHaveBeenCalled());
    expect(screen.getByText("Forum group")).toBeTruthy();
    expect(screen.queryByText("Guild")).toBeNull();
  });

  it("keeps the Pro walkthrough explicit about Forum/Q&A separation", () => {
    mockParams = { plan: "pro" };
    const screen = render(<WalkthroughsScreen />);

    expect(screen.getByText("Keep Forum/Q&A separated")).toBeTruthy();
    expect(screen.getByText(/forum-group selections shape Feed campaigns/)).toBeTruthy();
    expect(screen.queryByText("Keep community separated")).toBeNull();
  });

  it("uses canonical Facility trial state instead of offering a direct Pro checkout", () => {
    mockEntitlements = { mode: "facility" };
    mockAuthState = {
      ...mockAuthState,
      user: { ...mockAuthState.user, subscriptionStatus: "trialing" }
    };
    const screen = render(<WalkthroughsScreen />);

    expect(screen.getByRole("header", { name: "Facility walkthrough" })).toBeTruthy();
    expect(screen.getByText("Available in this workspace")).toBeTruthy();
    expect(screen.getByLabelText("Open Facility workspace")).toBeTruthy();
    expect(screen.queryByText("Pro grower walkthrough")).toBeNull();
    expect(screen.queryByLabelText("Continue to Pro checkout")).toBeNull();
  });

  it("uses the active Night palette across walkthrough and checkout states", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createWalkthroughStyles(palette);

    expect(styles.root.backgroundColor).toBe(palette.page);
    expect(styles.main.backgroundColor).toBe(palette.surface);
    expect(styles.main.borderColor).toBe(palette.border);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.stepTitle.color).toBe(palette.text);
    expect(styles.side.backgroundColor).toBe(palette.surfaceStrong);
    expect(styles.sideTitle.color).toBe(palette.text);
    expect(styles.button.backgroundColor).toBe(palette.accent);
  });

  it("uses the active Night palette for forum interests and facility selection", () => {
    const palette = getThemePalette("night", "dark");
    const guildStyles = createGuildOnboardingStyles(palette);
    const facilityStyles = createPickFacilityStyles(palette);

    expect(guildStyles.root.backgroundColor).toBe(palette.page);
    expect(guildStyles.panel.backgroundColor).toBe(palette.surface);
    expect(guildStyles.title.color).toBe(palette.text);
    expect(guildStyles.chip.backgroundColor).toBe(palette.surfaceMuted);
    expect(facilityStyles.container.backgroundColor).toBe(palette.page);
    expect(facilityStyles.card.backgroundColor).toBe(palette.surface);
    expect(facilityStyles.cardTitle.color).toBe(palette.text);
    expect(facilityStyles.primaryButton.backgroundColor).toBe(palette.accent);
  });
});
