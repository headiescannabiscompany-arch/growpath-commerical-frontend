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
      aiTokens: 10,
      maxTokens: 10,
      refillDescription: "Refreshes every Monday (UTC)."
    });
  });

  it("shows exact customer token costs and a ten-token example", async () => {
    const screen = render(<TokenInfoScreen />);

    expect(screen.getByText("What actions cost")).toBeTruthy();
    expect(screen.getByText("Rule-based calculators and fallbacks")).toBeTruthy();
    expect(screen.getByText("Ask AI")).toBeTruthy();
    expect(screen.getByText("Facility form help")).toBeTruthy();
    expect(screen.getByText("Plant Diagnose")).toBeTruthy();
    expect(screen.getByText("0 tokens")).toBeTruthy();
    expect(screen.getAllByText("1 token")).toHaveLength(2);
    expect(screen.getByText("3 tokens")).toBeTruthy();
    expect(screen.getByText("What 10 tokens buys")).toBeTruthy();

    await waitFor(() => expect(screen.getByText("10 / 10")).toBeTruthy());
  });
});
