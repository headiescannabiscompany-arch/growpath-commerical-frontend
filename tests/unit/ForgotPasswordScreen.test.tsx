import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ForgotPasswordScreen from "@/app/forgot-password";

const mockForgotPassword = jest.fn();
const mockReplace = jest.fn();

jest.mock("@/api/auth", () => ({
  forgotPassword: (...args: any[]) => mockForgotPassword(...args)
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    canGoBack: () => false,
    back: jest.fn()
  })
}));

describe("ForgotPasswordScreen", () => {
  beforeEach(() => {
    mockForgotPassword.mockReset();
    mockReplace.mockReset();
  });

  it("shows a support message when reset email delivery is unavailable", async () => {
    mockForgotPassword.mockResolvedValueOnce({
      ok: true,
      message: "If an account exists, password reset instructions will be sent.",
      emailSent: false
    });

    const screen = render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "free@growpathai.com");
    fireEvent.press(screen.getByLabelText("Send password reset email"));

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith("free@growpathai.com");
      expect(
        screen.getByText(
          "Password reset email is not available right now. Contact support to reset this account."
        )
      ).toBeTruthy();
    });
  });
});
