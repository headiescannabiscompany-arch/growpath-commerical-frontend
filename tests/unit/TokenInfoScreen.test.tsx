import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import TokenInfoScreen, { createStyles } from "@/screens/TokenInfoScreen";
import { getThemePalette } from "@/theme/appTheme";

const mockGetTokenBalance = jest.fn();
let mockSearchParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockSearchParams
}));

jest.mock("@/api/tokens", () => ({
  getTokenBalance: (...args: any[]) => mockGetTokenBalance(...args)
}));

jest.mock("@/components/ScreenContainer", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockScreenContainer({ children }: { children: React.ReactNode }) {
    return React.createElement(View, null, children);
  };
});

describe("TokenInfoScreen action costs", () => {
  beforeEach(() => {
    mockSearchParams = {};
    mockGetTokenBalance.mockReset();
    mockGetTokenBalance.mockResolvedValue({
      aiTokens: 5,
      maxTokens: 5,
      refillDescription: "Refreshes every Monday (UTC)."
    });
  });

  it("uses the active palette and exposes one page heading", async () => {
    const palette = getThemePalette("night", "dark");
    const styles = createStyles(palette);
    const screen = render(<TokenInfoScreen />);

    expect(styles.balanceCard.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.estimateCard.backgroundColor).toBe(palette.surface);
    expect(styles.estimateCard.borderColor).toBe(palette.border);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.bodyText.color).toBe(palette.textMuted);
    expect(
      screen.getByRole("header", { name: "How GrowPathAI works" }).props["aria-level"]
    ).toBe(1);
    expect(
      screen.getAllByRole("header").filter((node) => node.props["aria-level"] === 1)
    ).toHaveLength(1);
    expect(
      screen.getByRole("header", { name: "What actions cost" }).props["aria-level"]
    ).toBe(2);
    await waitFor(() => expect(screen.getByText("5 / 5")).toBeTruthy());
  });

  it("shows the exact customer token cost for each action", async () => {
    const screen = render(<TokenInfoScreen />);

    expect(screen.getByText("What actions cost")).toBeTruthy();
    expect(screen.getByText("Rule-based calculators and fallbacks")).toBeTruthy();
    expect(screen.getByText("Text symptom analysis")).toBeTruthy();
    expect(screen.getByText("Ask AI")).toBeTruthy();
    expect(screen.getByText("Facility form help")).toBeTruthy();
    expect(screen.getByText("Plant Diagnose")).toBeTruthy();
    expect(screen.getAllByText("0 tokens")).toHaveLength(2);
    expect(screen.getAllByText("1 token")).toHaveLength(2);
    expect(screen.getByText("3 tokens")).toBeTruthy();
    expect(screen.queryByText("What 10 tokens buys")).toBeNull();

    expect(screen.getByText(/Free accounts receive 5 AI credits each week/)).toBeTruthy();
    expect(screen.getAllByText(/\$0\.002 of metered usage value/)).toHaveLength(2);
    expect(screen.getByText(/\$0\.02 of metered usage value/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText("5 / 5")).toBeTruthy());
  });

  it("loads the selected Facility balance when opened from Facility mode", async () => {
    mockSearchParams = {
      workspaceType: "facility",
      facilityId: "facility-123"
    };
    mockGetTokenBalance.mockResolvedValue({
      aiTokens: 1999,
      maxTokens: 2000,
      plan: "facility",
      subscriptionStatus: "active"
    });

    const screen = render(<TokenInfoScreen />);

    await waitFor(() => expect(screen.getByText("1999 / 2000")).toBeTruthy());
    expect(screen.getByText("Selected Facility's live AI-credit balance")).toBeTruthy();
    expect(mockGetTokenBalance).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        params: {
          workspaceType: "facility",
          facilityId: "facility-123"
        }
      })
    );
  });

  it("loads the selected Commercial balance when opened from Commercial mode", async () => {
    mockSearchParams = {
      workspaceType: "commercial"
    };
    mockGetTokenBalance.mockResolvedValue({
      aiTokens: 1800,
      maxTokens: 2000,
      plan: "commercial",
      subscriptionStatus: "active",
      allowanceSource: "plan"
    });

    const screen = render(<TokenInfoScreen />);

    await waitFor(() => expect(screen.getByText("1800 / 2000")).toBeTruthy());
    expect(
      screen.getByText("Commercial workspace's live AI-credit balance")
    ).toBeTruthy();
    expect(mockGetTokenBalance).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        params: {
          workspaceType: "commercial"
        }
      })
    );
  });
});
