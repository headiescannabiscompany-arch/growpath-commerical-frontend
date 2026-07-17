import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import TokenInfoScreen from "@/screens/TokenInfoScreen";

const mockGetTokenBalance = jest.fn();

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
    mockGetTokenBalance.mockResolvedValue({
      aiTokens: 5,
      maxTokens: 5,
      refillDescription: "Refreshes every Monday (UTC)."
    });
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
});
