import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { ApiError } from "@/api/apiRequest";
import LoginScreen from "@/app/login";

const mockLogin = jest.fn();
const mockRequestEmailVerification = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    login: (...args: any[]) => mockLogin(...args)
  })
}));

jest.mock("@/api/auth", () => ({
  requestEmailVerification: (...args: any[]) => mockRequestEmailVerification(...args)
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush
  })
}));

describe("LoginScreen email verification", () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockRequestEmailVerification.mockReset();
    mockReplace.mockReset();
    mockPush.mockReset();
    mockRequestEmailVerification.mockResolvedValue({ ok: true, emailSent: true });
  });

  it("shows resend verification when the backend rejects an unverified email", async () => {
    mockLogin.mockRejectedValueOnce(
      new ApiError("EMAIL_NOT_VERIFIED", 403, {
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Please verify your email address before signing in."
        }
      })
    );

    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "Grower@Example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "password123");
    fireEvent.press(screen.getByLabelText("Sign in"));

    await waitFor(() => {
      expect(screen.getByText("Please verify your email address before signing in.")).toBeTruthy();
      expect(screen.getByText("Check your inbox for the GrowPathAI verification link.")).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Resend verification email"));

    await waitFor(() => {
      expect(mockRequestEmailVerification).toHaveBeenCalledWith("grower@example.com");
      expect(
        screen.getByText("If that account exists, a new verification email has been sent.")
      ).toBeTruthy();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
