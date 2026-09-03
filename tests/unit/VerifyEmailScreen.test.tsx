import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import VerifyEmailScreen from "@/app/verify-email";
import {
  clearComplimentaryClaimToken,
  readComplimentaryClaimToken,
  writeComplimentaryClaimToken
} from "@/utils/complimentaryClaimTokenStore";

const mockConfirmEmailVerification = jest.fn();
const mockReplace = jest.fn();
let mockParams: { token?: string | string[]; next?: string | string[] } = {
  token: "verify-token-1"
};
const originalWindow = (globalThis as any).window;

jest.mock("@/api/auth", () => ({
  confirmEmailVerification: (...args: any[]) => mockConfirmEmailVerification(...args)
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace })
}));

describe("VerifyEmailScreen", () => {
  beforeEach(async () => {
    (globalThis as any).window = undefined;
    await clearComplimentaryClaimToken();
    mockConfirmEmailVerification.mockReset();
    mockReplace.mockReset();
    mockParams = { token: "verify-token-1" };
  });

  afterAll(() => {
    (globalThis as any).window = originalWindow;
  });

  it("confirms a verification token and sends the user back to sign in", async () => {
    mockConfirmEmailVerification.mockResolvedValueOnce({
      ok: true,
      user: {
        id: "user-1",
        email: "grower@example.com",
        displayName: "Grower",
        role: "user",
        plan: "free",
        subscriptionStatus: "free",
        emailVerified: true
      }
    });

    const screen = render(<VerifyEmailScreen />);

    await waitFor(() => {
      expect(mockConfirmEmailVerification).toHaveBeenCalledWith("verify-token-1");
      expect(
        screen.getByText("Your email is verified. You can sign in to GrowPath.")
      ).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Go to sign in"));

    expect(mockReplace).toHaveBeenCalledWith("/login?email=grower%40example.com");
  });

  it("does not call the backend when the verification token is missing", async () => {
    mockParams = {};

    const screen = render(<VerifyEmailScreen />);

    await waitFor(() => {
      expect(screen.getByText("This verification link is missing a token.")).toBeTruthy();
    });

    expect(mockConfirmEmailVerification).not.toHaveBeenCalled();
  });

  it("keeps a legacy gift token out of the sign-in continuation", async () => {
    mockParams = {
      token: "verify-token-1",
      next: "/claim-gift?token=private-gift-token"
    };
    mockConfirmEmailVerification.mockResolvedValueOnce({
      ok: true,
      user: { email: "friend@example.com" }
    });
    const screen = render(<VerifyEmailScreen />);

    await waitFor(() =>
      expect(
        screen.getByText("Your email is verified. You can sign in to GrowPath.")
      ).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Go to sign in"));

    expect(mockReplace).toHaveBeenCalledWith(
      "/login?email=friend%40example.com&next=%2Fclaim-gift"
    );
    expect(JSON.stringify(mockReplace.mock.calls)).not.toContain("private-gift-token");
  });

  it("resumes a pending complimentary claim after verification opens a new tab", async () => {
    const sharedLocal = new Map<string, string>();
    const firstSession = new Map<string, string>();
    const verificationSession = new Map<string, string>();
    const storage = (values: Map<string, string>) => ({
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value)
    });
    const tab = (session: Map<string, string>) => ({
      location: { hash: "", pathname: "/verify-email", search: "" },
      localStorage: storage(sharedLocal),
      sessionStorage: storage(session)
    });

    (globalThis as any).window = tab(firstSession);
    await writeComplimentaryClaimToken("cross-tab-claim-token");
    (globalThis as any).window = tab(verificationSession);
    mockConfirmEmailVerification.mockResolvedValueOnce({
      ok: true,
      user: { email: "recipient@example.com" }
    });

    const screen = render(<VerifyEmailScreen />);

    await waitFor(() =>
      expect(
        screen.getByText(
          "Your pending complimentary-access claim will resume after sign-in."
        )
      ).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Go to sign in"));

    expect(mockReplace).toHaveBeenCalledWith(
      "/login?email=recipient%40example.com&next=%2Fclaim-complimentary-access"
    );
    await expect(readComplimentaryClaimToken()).resolves.toBe("cross-tab-claim-token");
    expect(sharedLocal.size).toBe(0);
  });
});
