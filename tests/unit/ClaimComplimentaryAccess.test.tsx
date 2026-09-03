import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { ApiError } from "@/api/apiRequest";
import ClaimComplimentaryAccessScreen from "@/app/claim-complimentary-access";
import {
  browserComplimentaryClaimToken,
  clearComplimentaryClaimToken,
  readComplimentaryClaimToken,
  writeComplimentaryClaimToken
} from "@/utils/complimentaryClaimTokenStore";

const mockPreview = jest.fn();
const mockClaim = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRetryMe = jest.fn();
const mockLogout = jest.fn();
let mockToken: string | null = null;
let mockParams: { token?: string | string[] } = { token: "complimentary-token-1" };
const originalWindow = (globalThis as any).window;

jest.mock("@/api/complimentaryGrants", () => ({
  previewComplimentaryGrant: (...args: any[]) => mockPreview(...args),
  claimComplimentaryGrant: (...args: any[]) => mockClaim(...args)
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

const summary = {
  recipientEmail: "r*******t@example.com",
  recipientName: "Recipient",
  plan: "commercial",
  duration: "year",
  message: "Welcome to GrowPathAI",
  complimentary: true,
  paymentState: "nonpaid",
  renews: false
} as const;

describe("ClaimComplimentaryAccessScreen", () => {
  beforeEach(async () => {
    (globalThis as any).window = undefined;
    await clearComplimentaryClaimToken();
    jest.clearAllMocks();
    mockToken = null;
    mockParams = { token: "complimentary-token-1" };
    mockPreview.mockResolvedValue(summary);
    mockLogout.mockResolvedValue(undefined);
    mockRetryMe.mockResolvedValue(undefined);
  });

  afterAll(() => {
    (globalThis as any).window = originalWindow;
  });

  it("stores an incoming token and uses tokenless sign-in and registration routes", async () => {
    const screen = render(<ClaimComplimentaryAccessScreen />);

    await waitFor(() => expect(screen.getByText("One year of commercial")).toBeTruthy());
    expect(mockPreview).toHaveBeenCalledWith("complimentary-token-1");
    expect(
      screen.getByText(
        "This is Admin-issued access. No payment was made, no card is required, and it will not renew automatically."
      )
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Sign in to claim complimentary access"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/login",
      params: { next: "/claim-complimentary-access" }
    });
    fireEvent.press(
      screen.getByLabelText("Create account to claim complimentary access")
    );
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: "/register",
      params: { next: "/claim-complimentary-access" }
    });
    expect(JSON.stringify(mockPush.mock.calls)).not.toContain("complimentary-token-1");
    await expect(readComplimentaryClaimToken()).resolves.toBe("complimentary-token-1");
  });

  it("captures a fragment token and removes it from the visible browser URL", async () => {
    mockParams = {};
    const values = new Map<string, string>();
    const replaceState = jest.fn();
    (globalThis as any).window = {
      history: { replaceState, state: null },
      location: {
        hash: "#token=fragment-claim-token",
        pathname: "/claim-complimentary-access",
        search: ""
      },
      sessionStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value)
      }
    };

    expect(browserComplimentaryClaimToken()).toBe("fragment-claim-token");

    const screen = render(<ClaimComplimentaryAccessScreen />);

    await waitFor(() => expect(mockPreview).toHaveBeenCalledWith("fragment-claim-token"));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/claim-complimentary-access");
    expect(JSON.stringify(replaceState.mock.calls)).not.toContain("fragment-claim-token");
    screen.unmount();
    (globalThis as any).window = undefined;
  });

  it("does not accept a web claim token from the logged query string", async () => {
    mockParams = { token: "query-claim-token" };
    const replaceState = jest.fn();
    (globalThis as any).window = {
      history: { replaceState, state: null },
      location: {
        hash: "",
        pathname: "/claim-complimentary-access",
        search: "?token=query-claim-token"
      },
      sessionStorage: {
        getItem: () => null,
        removeItem: jest.fn(),
        setItem: jest.fn()
      },
      localStorage: {
        getItem: () => null,
        removeItem: jest.fn(),
        setItem: jest.fn()
      }
    };

    const screen = render(<ClaimComplimentaryAccessScreen />);

    await waitFor(() =>
      expect(
        screen.getByText(
          "This complimentary access link is missing its secure claim token."
        )
      ).toBeTruthy()
    );
    expect(mockPreview).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/claim-complimentary-access");
    expect(
      screen.getByText(/reopen the original complimentary-access email/i)
    ).toBeTruthy();
    expect(JSON.stringify(replaceState.mock.calls)).not.toContain("query-claim-token");
  });

  it("activates access, clears the token, and refreshes account truth", async () => {
    mockToken = "signed-in-token";
    mockClaim.mockResolvedValue({ plan: "commercial", complimentary: true });
    const screen = render(<ClaimComplimentaryAccessScreen />);

    await waitFor(() => expect(screen.getByText("One year of commercial")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Activate complimentary access"));

    await waitFor(() => {
      expect(mockClaim).toHaveBeenCalledWith("complimentary-token-1");
      expect(mockRetryMe).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText(
          "Your complimentary commercial access is active and will not renew."
        )
      ).toBeTruthy();
    });
    await expect(readComplimentaryClaimToken()).resolves.toBe("");
    expect(screen.queryByLabelText("Activate complimentary access")).toBeNull();
  });

  it("offers a safe account switch for a recipient email mismatch", async () => {
    mockToken = "wrong-account-token";
    const mismatch = new ApiError("COMPLIMENTARY_RECIPIENT_EMAIL_MISMATCH", 403);
    mismatch.message = "Sign in with the email address that received this access.";
    mockClaim.mockRejectedValue(mismatch);
    const screen = render(<ClaimComplimentaryAccessScreen />);

    await waitFor(() => expect(screen.getByText("One year of commercial")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Activate complimentary access"));

    await waitFor(() =>
      expect(
        screen.getByLabelText("Use a different account for complimentary access")
      ).toBeTruthy()
    );
    fireEvent.press(
      screen.getByLabelText("Use a different account for complimentary access")
    );

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: "/login",
        params: { next: "/claim-complimentary-access" }
      });
    });
    await expect(readComplimentaryClaimToken()).resolves.toBe("complimentary-token-1");
  });

  it("clears a terminal token but retains a retryable claim token", async () => {
    mockParams = {};
    await writeComplimentaryClaimToken("expired-token");
    const invalid = new ApiError("COMPLIMENTARY_CLAIM_INVALID", 404);
    invalid.message = "This complimentary access link is invalid or expired.";
    mockPreview.mockRejectedValueOnce(invalid);
    const terminal = render(<ClaimComplimentaryAccessScreen />);

    await waitFor(() =>
      expect(
        terminal.getByText("This complimentary access link is invalid or expired.")
      ).toBeTruthy()
    );
    await expect(readComplimentaryClaimToken()).resolves.toBe("");
    terminal.unmount();

    await writeComplimentaryClaimToken("retry-token");
    mockPreview.mockResolvedValue(summary);
    mockClaim.mockRejectedValueOnce(new Error("Temporary network failure"));
    mockToken = "signed-in-token";
    const retryable = render(<ClaimComplimentaryAccessScreen />);
    await waitFor(() => expect(mockPreview).toHaveBeenLastCalledWith("retry-token"));
    fireEvent.press(retryable.getByLabelText("Activate complimentary access"));

    await waitFor(() =>
      expect(retryable.getByText("Temporary network failure")).toBeTruthy()
    );
    await expect(readComplimentaryClaimToken()).resolves.toBe("retry-token");
  });
});
