import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import TokenBalanceWidget from "@/components/TokenBalanceWidget";

const mockGetTokenBalance = jest.fn();
let mockAuthState: any;
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => mockAuthState
}));

jest.mock("@/api/tokens", () => ({
  getTokenBalance: () => mockGetTokenBalance()
}));

describe("TokenBalanceWidget", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockGetTokenBalance.mockReset();
    mockGetTokenBalance.mockRejectedValue(new Error("offline"));
    mockAuthState = {
      token: "authenticated-token",
      user: { plan: "free", subscriptionStatus: "free" },
      ctx: { plan: "free", subscriptionStatus: "free" },
      retryMe: jest.fn()
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { hostname: "localhost", search: "" }
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("does not invent a fallback balance when the API is unavailable", async () => {
    const screen = render(<TokenBalanceWidget />);

    await waitFor(() =>
      expect(
        screen.getByText(
          "Live balance is unavailable. No estimated balance is being shown."
        )
      ).toBeTruthy()
    );
    expect(screen.getByText("0 / -")).toBeTruthy();
  });

  it("does not invent a paid balance from the local preview flag", async () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { hostname: "localhost", search: "?paid=1" }
    });

    const screen = render(<TokenBalanceWidget />);

    await waitFor(() => expect(screen.getByText("0 / -")).toBeTruthy());
    expect(screen.queryByText("100 / 100")).toBeNull();
  });

  it("renders the authenticated paid balance returned by the server", async () => {
    mockGetTokenBalance.mockResolvedValue({
      aiTokens: 100,
      maxTokens: 100,
      refreshInterval: "weekly",
      refillDescription: "Your configured AI allowance refreshes every Monday (UTC)."
    });

    const screen = render(<TokenBalanceWidget />);

    await waitFor(() => expect(screen.getByText("100 / 100")).toBeTruthy());
    expect(
      screen.getByText("Your configured AI allowance refreshes every Monday (UTC).")
    ).toBeTruthy();
    expect(
      screen.queryByText(
        "Live balance is unavailable. No estimated balance is being shown."
      )
    ).toBeNull();
  });

  it("refreshes a stale free balance after the account becomes paid", async () => {
    mockGetTokenBalance
      .mockResolvedValueOnce({ aiTokens: 5, maxTokens: 5 })
      .mockResolvedValueOnce({ aiTokens: 100, maxTokens: 100 });

    const screen = render(<TokenBalanceWidget />);
    await waitFor(() => expect(screen.getByText("5 / 5")).toBeTruthy());

    mockAuthState = {
      ...mockAuthState,
      user: { plan: "pro", subscriptionStatus: "active" },
      ctx: { plan: "pro", subscriptionStatus: "active" }
    };
    screen.rerender(<TokenBalanceWidget />);

    await waitFor(() => expect(screen.getByText("100 / 100")).toBeTruthy());
    expect(mockGetTokenBalance).toHaveBeenCalledTimes(2);
  });

  it("rechecks and flags a stale free allowance on an active paid trial", async () => {
    mockAuthState = {
      token: "paid-trial-token",
      user: { plan: "facility", subscriptionStatus: "trialing" },
      ctx: { plan: "facility", subscriptionStatus: "trialing" },
      retryMe: jest.fn().mockResolvedValue(undefined)
    };
    mockGetTokenBalance.mockResolvedValue({ aiTokens: 5, maxTokens: 5 });

    const screen = render(<TokenBalanceWidget />);

    await waitFor(() =>
      expect(
        screen.getByText(/server is still reporting the free 5-credit allowance/)
      ).toBeTruthy()
    );
    expect(mockAuthState.retryMe).toHaveBeenCalledTimes(1);
    expect(mockGetTokenBalance).toHaveBeenCalledTimes(2);
  });
});
