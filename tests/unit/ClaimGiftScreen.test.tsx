import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { ApiError } from "@/api/apiRequest";
import ClaimGiftScreen from "@/app/claim-gift";
import {
  clearGiftClaimToken,
  readGiftClaimToken,
  writeGiftClaimToken
} from "@/utils/giftClaimTokenStore";

const mockGetGiftClaim = jest.fn();
const mockClaimGift = jest.fn();
const mockAccept = jest.fn();
let mockIsHydrating = false;
jest.mock("@/api/guestGiftAcceptance", () => ({
  acceptGuestGift: (...args: any[]) => mockAccept(...args)
}));
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRetryMe = jest.fn();
const mockLogout = jest.fn();
let mockToken: string | null = null;
let mockParams: { token?: string | string[] } = { token: "gift-token-1" };
const originalWindow = (globalThis as any).window;

jest.mock("@/api/subscription", () => ({
  getGiftClaim: (...args: any[]) => mockGetGiftClaim(...args),
  claimGift: (...args: any[]) => mockClaimGift(...args)
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    token: mockToken,
    isHydrating: mockIsHydrating,
    retryMe: (...args: any[]) => mockRetryMe(...args),
    logout: (...args: any[]) => mockLogout(...args)
  })
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: mockPush, replace: mockReplace })
}));

const gift = {
  recipientEmail: "f*****@example.com",
  recipientName: "Friend",
  plan: "pro",
  interval: "yearly",
  message: "Happy growing!"
};

describe("ClaimGiftScreen", () => {
  beforeEach(async () => {
    (globalThis as any).window = undefined;
    await clearGiftClaimToken();
    jest.clearAllMocks();
    mockToken = null;
    mockIsHydrating = false;
    mockAccept.mockReset();
    mockParams = { token: "gift-token-1" };
    mockGetGiftClaim.mockResolvedValue(gift);
  });

  afterAll(() => {
    (globalThis as any).window = originalWindow;
  });

  it("accepts from the email link with no login, signup or optimistic activation", async () => {
    const screen = render(<ClaimGiftScreen />);
    await screen.findByText(/One year|One month/, {}, { timeout: 6000 });
    const acceptButton = screen.getByRole("button", { name: "Accept my gift" });
    expect(mockAccept).not.toHaveBeenCalled();
    let complete!: () => void;
    mockAccept.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        })
    );
    act(() => {
      fireEvent.press(acceptButton);
      fireEvent.press(acceptButton);
    });
    expect(mockAccept).toHaveBeenCalledTimes(1);
    expect(mockAccept).toHaveBeenCalledWith("prepaid", "gift-token-1");
    expect(screen.queryByText(/Gift accepted for/)).toBeNull();
    await act(async () => complete());
    expect(
      await screen.findByText("Gift accepted for the invited email address.")
    ).toBeTruthy();
    expect(mockClaimGift).not.toHaveBeenCalled();
    expect(mockRetryMe).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole("button", { name: "Create a free account" }));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: "/register",
      params: { plan: "free" }
    });
    fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(mockPush).toHaveBeenLastCalledWith("/login");
  });

  it("recovers a lost acceptance reply and requires a tap to retry", async () => {
    mockAccept
      .mockRejectedValueOnce(new Error("Lost reply"))
      .mockResolvedValueOnce(undefined);
    const screen = render(<ClaimGiftScreen />);
    fireEvent.press(await screen.findByRole("button", { name: "Accept my gift" }));
    expect(await screen.findByText(/couldn’t confirm your acceptance/)).toBeTruthy();
    expect(screen.queryByText(/Gift accepted for/)).toBeNull();
    expect(mockAccept).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByRole("button", { name: "Accept my gift" }));
    await screen.findByText(/Gift accepted for/);
    expect(mockAccept).toHaveBeenCalledTimes(2);
    expect(mockClaimGift).not.toHaveBeenCalled();
  });

  it.each([
    ["GIFT_RECIPIENT_EMAIL_MISMATCH", 403],
    ["SESSION_EXPIRED", 401]
  ] as const)(
    "accepts for the invited address after %s without switching the current account",
    async (code, status) => {
      mockToken = "different-or-expired-session";
      mockClaimGift.mockRejectedValueOnce(new ApiError(code, status));
      mockAccept.mockResolvedValueOnce(undefined);
      const screen = render(<ClaimGiftScreen />);
      fireEvent.press(await screen.findByLabelText("Claim prepaid access gift"));
      fireEvent.press(
        await screen.findByRole("button", { name: "Accept for the invited address" })
      );
      await screen.findByText("Gift accepted for the invited email address.");
      expect(mockClaimGift).toHaveBeenCalledTimes(1);
      expect(mockAccept).toHaveBeenCalledTimes(1);
      expect(mockLogout).not.toHaveBeenCalled();
      expect(mockRetryMe).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    }
  );

  it("waits for session hydration and preserves the signed-in claim path", async () => {
    mockIsHydrating = true;
    const screen = render(<ClaimGiftScreen />);
    await screen.findByText(/One year|One month/);
    expect(screen.queryByRole("button", { name: "Accept my gift" })).toBeNull();
    mockIsHydrating = false;
    mockToken = "signed-in";
    screen.rerender(<ClaimGiftScreen />);
    expect(screen.queryByRole("button", { name: "Accept my gift" })).toBeNull();
    expect(mockAccept).not.toHaveBeenCalled();
  });

  it("stores a legacy query token and uses a tokenless sign-in continuation", async () => {
    const screen = render(<ClaimGiftScreen />);

    await waitFor(() => expect(screen.getByText("One year of pro")).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/login",
      params: { next: "/claim-gift" }
    });
    fireEvent.press(screen.getByRole("button", { name: "Create a free account" }));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: "/register",
      params: { next: "/claim-gift" }
    });
    expect(JSON.stringify(mockPush.mock.calls)).not.toContain("gift-token-1");
    await expect(readGiftClaimToken()).resolves.toBe("gift-token-1");
    expect(screen.queryByText("friend@example.com")).toBeNull();
  });

  it("captures a fragment token and scrubs it from the visible browser URL", async () => {
    mockParams = {};
    const values = new Map<string, string>();
    const replaceState = jest.fn();
    (globalThis as any).window = {
      history: { replaceState, state: null },
      location: { hash: "#token=fragment-token-1", pathname: "/claim-gift", search: "" },
      sessionStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value)
      }
    };

    const screen = render(<ClaimGiftScreen />);
    await waitFor(() =>
      expect(mockGetGiftClaim).toHaveBeenCalledWith("fragment-token-1")
    );
    expect(replaceState).toHaveBeenCalledWith(null, "", "/claim-gift");
    expect(replaceState.mock.calls[0][2]).not.toContain("fragment-token-1");
    await expect(readGiftClaimToken()).resolves.toBe("fragment-token-1");
    screen.unmount();
    (globalThis as any).window = undefined;
  });

  it("keeps a successful claim durable when the account refresh fails", async () => {
    mockToken = "signed-in-token";
    mockClaimGift.mockResolvedValue({ plan: "pro", interval: "yearly" });
    mockRetryMe.mockRejectedValue(new Error("refresh failed"));
    const screen = render(<ClaimGiftScreen />);

    await waitFor(() => expect(screen.getByText("One year of pro")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Claim prepaid access gift"));

    await waitFor(() => {
      expect(mockClaimGift).toHaveBeenCalledWith("gift-token-1");
      expect(screen.getByLabelText("Choose workspace after claiming gift")).toBeTruthy();
      expect(
        screen.getByText(
          "Your prepaid pro access was claimed, but account details could not refresh yet."
        )
      ).toBeTruthy();
    });
    expect(screen.queryByLabelText("Claim prepaid access gift")).toBeNull();
    await expect(readGiftClaimToken()).resolves.toBe("");
  });

  it("offers a safe account switch without dropping the claim return path", async () => {
    mockToken = "wrong-account-token";
    const mismatch = new ApiError("GIFT_RECIPIENT_EMAIL_MISMATCH", 403);
    mismatch.message = "Sign in with the recipient account.";
    mockClaimGift.mockRejectedValue(mismatch);
    mockLogout.mockResolvedValue(undefined);
    const screen = render(<ClaimGiftScreen />);

    await waitFor(() => expect(screen.getByText("One year of pro")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Claim prepaid access gift"));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Sign in with a different account to claim gift")
      ).toBeTruthy()
    );
    fireEvent.press(
      screen.getByLabelText("Sign in with a different account to claim gift")
    );

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: "/login",
        params: { next: "/claim-gift" }
      });
    });
    await expect(readGiftClaimToken()).resolves.toBe("gift-token-1");
  });

  it("keeps the stored token after a retryable claim failure", async () => {
    mockToken = "signed-in-token";
    mockParams = {};
    await writeGiftClaimToken("stored-retry-token");
    mockClaimGift.mockRejectedValueOnce(new Error("Temporary network failure"));
    const screen = render(<ClaimGiftScreen />);

    await waitFor(() =>
      expect(mockGetGiftClaim).toHaveBeenCalledWith("stored-retry-token")
    );
    fireEvent.press(screen.getByLabelText("Claim prepaid access gift"));

    await waitFor(() =>
      expect(screen.getByText("Temporary network failure")).toBeTruthy()
    );
    await expect(readGiftClaimToken()).resolves.toBe("stored-retry-token");
    expect(screen.getByLabelText("Claim prepaid access gift")).toBeTruthy();
  });

  it("clears the stored token after a terminal preview response", async () => {
    mockParams = {};
    await writeGiftClaimToken("expired-token");
    const expired = new ApiError("GIFT_CLAIM_INVALID", 404);
    expired.message = "This gift link is invalid or expired.";
    mockGetGiftClaim.mockRejectedValueOnce(expired);
    const screen = render(<ClaimGiftScreen />);

    await waitFor(() =>
      expect(screen.getByText("This gift link is invalid or expired.")).toBeTruthy()
    );
    await expect(readGiftClaimToken()).resolves.toBe("");
  });

  it.each(["GIFT_CLAIM_INVALID", "GIFT_ALREADY_CLAIMED"])(
    "offers signed-in billing guidance after %s without asserting access or retrying a claim",
    async (code) => {
      mockToken = "signed-in-token";
      const terminal = new ApiError(code, 404);
      terminal.message = "This gift link is invalid or expired.";
      mockGetGiftClaim.mockRejectedValueOnce(terminal);
      const screen = render(<ClaimGiftScreen />);

      await waitFor(() =>
        expect(screen.getByLabelText("Check account billing")).toBeTruthy()
      );
      expect(
        screen.getByText(
          "This message is about the claim link, not your account's access. If you already claimed a gift, check Billing for its status and end date."
        )
      ).toBeTruthy();
      expect(screen.queryByText("Your prepaid pro access is active.")).toBeNull();
      expect(screen.queryByText(/Recipient:/)).toBeNull();
      expect(screen.queryByLabelText("Go to GrowPathAI sign in")).toBeNull();
      expect(screen.queryByLabelText("Claim prepaid access gift")).toBeNull();
      fireEvent.press(screen.getByLabelText("Check account billing"));
      expect(mockReplace).toHaveBeenCalledWith("/account/billing");
      expect(mockClaimGift).not.toHaveBeenCalled();
      expect(mockRetryMe).not.toHaveBeenCalled();
      expect(mockLogout).not.toHaveBeenCalled();
      await expect(readGiftClaimToken()).resolves.toBe("");
    }
  );

  it("returns a signed-out recipient to Billing after sign-in, without the expired token", async () => {
    mockGetGiftClaim.mockRejectedValueOnce(new ApiError("GIFT_CLAIM_INVALID", 404));
    const screen = render(<ClaimGiftScreen />);

    await waitFor(() =>
      expect(screen.getByLabelText("Sign in to check account billing")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Sign in to check account billing"));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/login",
      params: { next: "/account/billing" }
    });
    expect(JSON.stringify(mockReplace.mock.calls)).not.toContain("gift-token-1");
    expect(mockClaimGift).not.toHaveBeenCalled();
    await expect(readGiftClaimToken()).resolves.toBe("");
  });

  it("offers billing guidance after a terminal claim response without retaining gift details", async () => {
    mockToken = "signed-in-token";
    mockClaimGift.mockRejectedValueOnce(new ApiError("GIFT_ALREADY_CLAIMED", 409));
    const screen = render(<ClaimGiftScreen />);
    await waitFor(() => expect(screen.getByText("One year of pro")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Claim prepaid access gift"));

    await waitFor(() =>
      expect(screen.getByLabelText("Check account billing")).toBeTruthy()
    );
    expect(screen.queryByText(/Recipient:/)).toBeNull();
    expect(screen.queryByLabelText("Claim prepaid access gift")).toBeNull();
    fireEvent.press(screen.getByLabelText("Check account billing"));
    expect(mockReplace).toHaveBeenCalledWith("/account/billing");
    expect(mockClaimGift).toHaveBeenCalledTimes(1);
    expect(mockRetryMe).not.toHaveBeenCalled();
    await expect(readGiftClaimToken()).resolves.toBe("");
  });

  it("resets preview state when the route token changes", async () => {
    const screen = render(<ClaimGiftScreen />);
    await waitFor(() =>
      expect(screen.getByText("Recipient: f*****@example.com")).toBeTruthy()
    );

    mockParams = { token: "gift-token-2" };
    mockGetGiftClaim.mockResolvedValue({ ...gift, recipientEmail: "s*****@example.com" });
    screen.rerender(<ClaimGiftScreen />);

    await waitFor(() => {
      expect(mockGetGiftClaim).toHaveBeenLastCalledWith("gift-token-2");
      expect(screen.getByText("Recipient: s*****@example.com")).toBeTruthy();
    });
    expect(screen.queryByText("Recipient: f*****@example.com")).toBeNull();
  });

  it("renders a terminal non-writing state when the token is missing", async () => {
    mockParams = {};
    const screen = render(<ClaimGiftScreen />);

    await waitFor(() =>
      expect(screen.getByText("This gift link is missing its claim token.")).toBeTruthy()
    );
    expect(mockGetGiftClaim).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Claim prepaid access gift")).toBeNull();
  });
});
