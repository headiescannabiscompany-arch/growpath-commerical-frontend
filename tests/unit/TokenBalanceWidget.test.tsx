import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import TokenBalanceWidget from "@/components/TokenBalanceWidget";

const mockGetTokenBalance = jest.fn();
let mockPlan = "free";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() })
}));

jest.mock("@/api/tokens", () => ({
  getTokenBalance: () => mockGetTokenBalance()
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    plan: mockPlan
  })
}));

describe("TokenBalanceWidget", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockPlan = "free";
    mockGetTokenBalance.mockReset();
    mockGetTokenBalance.mockRejectedValue(new Error("offline"));
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { hostname: "localhost", search: "" }
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("shows free fallback token limits for free accounts", async () => {
    const screen = render(<TokenBalanceWidget />);

    await waitFor(() => expect(screen.getByText("10 / 10")).toBeTruthy());
  });

  it("shows paid fallback token limits with the local paid preview flag", async () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { hostname: "localhost", search: "?paid=1" }
    });

    const screen = render(<TokenBalanceWidget />);

    await waitFor(() => expect(screen.getByText("100 / 100")).toBeTruthy());
  });
});
