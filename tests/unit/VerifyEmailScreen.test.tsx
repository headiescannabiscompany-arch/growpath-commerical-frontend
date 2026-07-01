import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import VerifyEmailScreen from "@/app/verify-email";

const mockConfirmEmailVerification = jest.fn();
const mockReplace = jest.fn();
let mockParams: { token?: string | string[] } = { token: "verify-token-1" };

jest.mock("@/api/auth", () => ({
  confirmEmailVerification: (...args: any[]) => mockConfirmEmailVerification(...args)
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace })
}));

describe("VerifyEmailScreen", () => {
  beforeEach(() => {
    mockConfirmEmailVerification.mockReset();
    mockReplace.mockReset();
    mockParams = { token: "verify-token-1" };
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
      expect(screen.getByText("Your email is verified. You can sign in to GrowPathAI.")).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Go to sign in"));

    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("does not call the backend when the verification token is missing", async () => {
    mockParams = {};

    const screen = render(<VerifyEmailScreen />);

    await waitFor(() => {
      expect(screen.getByText("This verification link is missing a token.")).toBeTruthy();
    });

    expect(mockConfirmEmailVerification).not.toHaveBeenCalled();
  });
});
