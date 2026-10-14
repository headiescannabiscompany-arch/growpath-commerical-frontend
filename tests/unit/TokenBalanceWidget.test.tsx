import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import TokenBalanceWidget from "@/components/TokenBalanceWidget";
import { publishTokenBalanceChange } from "@/utils/tokenBalanceEvents";

const mockGetTokenBalance = jest.fn();
const mockPush = jest.fn();
let mockAuthState: any;
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => mockAuthState
}));

jest.mock("@/api/tokens", () => ({
  getTokenBalance: (...args: any[]) => mockGetTokenBalance(...args)
}));

describe("TokenBalanceWidget", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockGetTokenBalance.mockReset();
    mockPush.mockReset();
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

  it.each(["personal", "commercial", "facility"] as const)(
    "does not invent a %s fallback balance when the API is unavailable",
    async (workspaceType) => {
      const screen = render(
        <TokenBalanceWidget workspaceType={workspaceType} facilityId="facility-123" />
      );

      await waitFor(() =>
        expect(
          screen.getByText(
            "Live balance is unavailable. No estimated balance is being shown."
          )
        ).toBeTruthy()
      );
      expect(screen.getByText("Balance unavailable")).toBeTruthy();
      expect(screen.queryByText("0 / -")).toBeNull();
      expect(screen.queryByTestId("token-balance-meter")).toBeNull();
      fireEvent.press(screen.getByText("See how AI credits work"));
      expect(mockPush).toHaveBeenCalledWith(
        workspaceType === "facility"
          ? "/ai/how-it-works?workspaceType=facility&facilityId=facility-123"
          : workspaceType === "commercial"
            ? "/ai/how-it-works?workspaceType=commercial"
            : "/ai/how-it-works"
      );
      expect(mockGetTokenBalance).toHaveBeenCalledTimes(1);
    }
  );

  it("shows a checking state without an empty meter until the balance loads", async () => {
    let resolveBalance: (balance: any) => void = () => {};
    mockGetTokenBalance.mockImplementation(() => new Promise((resolve) => {
      resolveBalance = resolve;
    }));
    const screen = render(<TokenBalanceWidget />);

    expect(screen.getByText("Checking balance...")).toBeTruthy();
    expect(screen.queryByText("0 / -")).toBeNull();
    expect(screen.queryByText("Balance unavailable")).toBeNull();
    expect(screen.queryByTestId("token-balance-meter")).toBeNull();

    await act(async () => resolveBalance({ aiTokens: 100, maxTokens: 100 }));
    expect(screen.getByText("100 / 100")).toBeTruthy();
    expect(screen.getByTestId("token-balance-meter")).toBeTruthy();
    expect(screen.queryByText("Checking balance...")).toBeNull();
  });

  it.each([0, "0"])("preserves a confirmed zero balance (%p)", async (aiTokens) => {
    mockGetTokenBalance.mockResolvedValue({ aiTokens, maxTokens: 100 });
    const screen = render(<TokenBalanceWidget />);

    await waitFor(() => expect(screen.getByText("0 / 100")).toBeTruthy());
    expect(screen.getByTestId("token-balance-meter")).toBeTruthy();
    expect(screen.queryByText("Balance unavailable")).toBeNull();
  });

  it.each([undefined, null, "", " ", false, [], -1, NaN, Infinity].map(
    (aiTokens) => ({ aiTokens })
  ))("does not coerce an invalid current balance into zero: $aiTokens", async ({ aiTokens }) => {
    mockGetTokenBalance.mockResolvedValue({ aiTokens, maxTokens: 100 });
    const screen = render(<TokenBalanceWidget />);

    await waitFor(() => expect(screen.getByText("Balance unavailable")).toBeTruthy());
    expect(screen.queryByText("0 / 100")).toBeNull();
    expect(screen.queryByTestId("token-balance-meter")).toBeNull();
  });

  it.each([undefined, null, "", true, [], 0, -1, "invalid"].map(
    (maxTokens) => ({ maxTokens })
  ))("does not present a known allowance when it is invalid: $maxTokens", async ({ maxTokens }) => {
    mockGetTokenBalance.mockResolvedValue({ aiTokens: 0, maxTokens });
    const screen = render(<TokenBalanceWidget />);

    await waitFor(() => expect(screen.getByText("Balance unavailable")).toBeTruthy());
    expect(screen.queryByText("0 / -")).toBeNull();
    expect(screen.queryByTestId("token-balance-meter")).toBeNull();
  });

  it("clears an unavailable state after an existing balance-refresh event", async () => {
    mockGetTokenBalance
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ aiTokens: 2000, maxTokens: 2000 });
    const screen = render(
      <TokenBalanceWidget workspaceType="facility" facilityId="facility-123" />
    );
    await waitFor(() => expect(screen.getByText("Balance unavailable")).toBeTruthy());

    act(() => publishTokenBalanceChange(2000));

    await waitFor(() => expect(screen.getByText("2000 / 2000")).toBeTruthy());
    expect(screen.queryByText("Balance unavailable")).toBeNull();
    expect(mockGetTokenBalance).toHaveBeenCalledTimes(2);
  });

  it("does not invent a paid balance from the local preview flag", async () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { hostname: "localhost", search: "?paid=1" }
    });

    const screen = render(<TokenBalanceWidget />);

    await waitFor(() => expect(screen.getByText("Balance unavailable")).toBeTruthy());
    expect(screen.queryByText("0 / -")).toBeNull();
    expect(screen.queryByText("100 / 100")).toBeNull();
  });

  it("renders the authenticated paid balance returned by the server", async () => {
    mockGetTokenBalance.mockResolvedValue({
      aiTokens: 100,
      maxTokens: 100,
      plan: "pro",
      subscriptionStatus: "trialing",
      allowanceSource: "plan",
      usage: {
        creditsUsed: 0,
        creditsRefunded: 3,
        billedRequests: 0,
        ledgerDifference: 0,
        reconciled: true
      },
      refreshInterval: "weekly",
      refillDescription: "Your configured AI allowance refreshes every Monday (UTC)."
    });

    const screen = render(<TokenBalanceWidget />);

    await waitFor(() => expect(screen.getByText("100 / 100")).toBeTruthy());
    expect(
      screen.getByText("Your configured AI allowance refreshes every Monday (UTC).")
    ).toBeTruthy();
    expect(
      screen.getByText(/Server plan: PRO \(trialing\); 100 weekly credits/)
    ).toBeTruthy();
    expect(
      screen.getByText(
        /Used this week: 0 credits across 0 billed requests; 3 credits refunded/
      )
    ).toBeTruthy();
    expect(
      screen.queryByText(
        "Live balance is unavailable. No estimated balance is being shown."
      )
    ).toBeNull();
  });

  it("refreshes a 100-credit trial balance after paid AI usage", async () => {
    mockGetTokenBalance
      .mockResolvedValueOnce({
        aiTokens: 100,
        maxTokens: 100,
        plan: "pro",
        subscriptionStatus: "trialing"
      })
      .mockResolvedValueOnce({
        aiTokens: 99,
        maxTokens: 100,
        plan: "pro",
        subscriptionStatus: "trialing"
      });

    const screen = render(<TokenBalanceWidget />);
    await waitFor(() => expect(screen.getByText("100 / 100")).toBeTruthy());

    act(() => publishTokenBalanceChange(99));

    await waitFor(() => expect(screen.getByText("99 / 100")).toBeTruthy());
    expect(mockGetTokenBalance).toHaveBeenCalledTimes(2);
  });

  it("surfaces a balance-to-ledger mismatch instead of hiding it", async () => {
    mockGetTokenBalance.mockResolvedValue({
      aiTokens: 95,
      maxTokens: 100,
      plan: "pro",
      subscriptionStatus: "active",
      allowanceSource: "plan",
      usage: {
        creditsUsed: 2,
        creditsRefunded: 0,
        billedRequests: 2,
        ledgerDifference: 3,
        reconciled: false
      }
    });

    const screen = render(<TokenBalanceWidget />);

    await waitFor(() =>
      expect(
        screen.getByText(/Balance and usage ledger differ by 3 credits/)
      ).toBeTruthy()
    );
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

  it("loads and labels the selected Facility balance instead of the member balance", async () => {
    mockAuthState = {
      token: "facility-member-token",
      user: { plan: "pro", subscriptionStatus: "active" },
      ctx: {
        plan: "pro",
        subscriptionStatus: "active",
        facilityPlan: "facility",
        facilitySubscriptionStatus: "active"
      },
      retryMe: jest.fn()
    };
    mockGetTokenBalance.mockResolvedValue({
      aiTokens: 1997,
      maxTokens: 2000,
      plan: "facility",
      subscriptionStatus: "active",
      allowanceSource: "facility_plan",
      creditOwner: "facility"
    });

    const screen = render(
      <TokenBalanceWidget
        workspaceType="facility"
        facilityId="facility-123"
        workspaceName="Headies Facility"
      />
    );

    await waitFor(() => expect(screen.getByText("1997 / 2000")).toBeTruthy());
    expect(screen.getByText("Facility AI Credits")).toBeTruthy();
    expect(screen.getByText("Balance owner: Headies Facility.")).toBeTruthy();
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

  it("loads and labels the commercial balance instead of the personal balance", async () => {
    mockAuthState = {
      token: "commercial-token",
      user: { plan: "commercial", subscriptionStatus: "active" },
      ctx: { plan: "commercial", subscriptionStatus: "active" },
      retryMe: jest.fn()
    };
    mockGetTokenBalance.mockResolvedValue({
      aiTokens: 1800,
      maxTokens: 2000,
      plan: "commercial",
      subscriptionStatus: "active",
      allowanceSource: "plan",
      creditOwner: "commercial"
    });

    const screen = render(<TokenBalanceWidget workspaceType="commercial" />);

    await waitFor(() => expect(screen.getByText("Commercial AI Credits")).toBeTruthy());
    expect(screen.getByText("1800 / 2000")).toBeTruthy();
    expect(
      screen.getByText(/Commercial plan: COMMERCIAL \(active\); 2000 weekly credits/)
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

  it("never falls back to an individual balance when no Facility is selected", async () => {
    const screen = render(<TokenBalanceWidget workspaceType="facility" />);

    await waitFor(() =>
      expect(
        screen.getByText("Select a Facility to view and use its AI-credit balance.")
      ).toBeTruthy()
    );
    expect(screen.getByText("Select a Facility")).toBeTruthy();
    expect(screen.queryByText("0 / -")).toBeNull();
    expect(screen.queryByText("Balance unavailable")).toBeNull();
    expect(screen.queryByTestId("token-balance-meter")).toBeNull();
    expect(mockGetTokenBalance).not.toHaveBeenCalled();
  });
});
