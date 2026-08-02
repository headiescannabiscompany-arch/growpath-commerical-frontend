import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { ApiError } from "@/api/apiRequest";
import ClaimGiftScreen from "@/app/claim-gift";
import {
  clearGiftClaimToken,
  readGiftClaimToken,
  writeGiftClaimToken
} from "@/utils/giftClaimTokenStore";

const mockGetGiftClaim = jest.fn();
const mockClaimGift = jest.fn();
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
    mockParams = { token: "gift-token-1" };
    mockGetGiftClaim.mockResolvedValue(gift);
  });

  afterAll(() => {
    (globalThis as any).window = originalWindow;
  });

  it("stores a legacy query token and uses a tokenless sign-in continuation", async () => {
    const screen = render(<ClaimGiftScreen />);

    await waitFor(() => expect(screen.getByText("One year of pro")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Sign in to claim gift"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/login",
      params: { next: "/claim-gift" }
    });
    fireEvent.press(screen.getByLabelText("Create account to claim gift"));
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
