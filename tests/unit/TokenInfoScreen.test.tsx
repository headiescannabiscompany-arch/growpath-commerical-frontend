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

describe("TokenInfoScreen action estimates", () => {
  beforeEach(() => {
    mockGetTokenBalance.mockResolvedValue({
      aiTokens: 10,
      maxTokens: 10,
      refillDescription: "Refreshes every Monday (UTC)."
    });
  });

  it("separates AI credits from estimated provider-token usage", async () => {
    const screen = render(<TokenInfoScreen />);

    expect(screen.getByText("Action estimates")).toBeTruthy();
    expect(screen.getByText("Rule-based calculators and fallbacks")).toBeTruthy();
    expect(screen.getByText("Ask AI")).toBeTruthy();
    expect(screen.getByText("Facility form help")).toBeTruthy();
    expect(screen.getByText("Plant Diagnose")).toBeTruthy();
    expect(screen.getByText("0 provider tokens")).toBeTruthy();
    expect(
      screen.getByText("Roughly 3,000–50,000 input + up to 1,800 output tokens")
    ).toBeTruthy();

    await waitFor(() => expect(screen.getByText("10 / 10")).toBeTruthy());
  });
});
