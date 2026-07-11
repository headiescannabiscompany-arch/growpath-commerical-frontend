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

  it("uses the stronger gardener-platform tagline", () => {
    const screen = render(<LoginScreen />);

    expect(
      screen.getByText(
        "A gardener-built hub for grows, soil, tools, courses, and community."
      )
    ).toBeTruthy();
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
      expect(
        screen.getByText("Please verify your email address before signing in.")
      ).toBeTruthy();
      expect(
        screen.getByText("Check your inbox for the GrowPath verification link.")
      ).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Resend verification email"));

    await waitFor(() => {
      expect(mockRequestEmailVerification).toHaveBeenCalledWith("grower@example.com");
      expect(
        screen.getByText("A new verification email was accepted for delivery.")
      ).toBeTruthy();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not claim resend delivery when backend email delivery is unavailable", async () => {
    mockLogin.mockRejectedValueOnce(
      new ApiError("EMAIL_NOT_VERIFIED", 403, {
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Please verify your email address before signing in."
        }
      })
    );
    mockRequestEmailVerification.mockResolvedValueOnce({ ok: true, emailSent: false });

    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "grower@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "password123");
    fireEvent.press(screen.getByLabelText("Sign in"));

    await waitFor(() => {
      expect(screen.getByLabelText("Resend verification email")).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Resend verification email"));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Verification email delivery is not available right now. Email support@growpathai.com for account access help."
        )
      ).toBeTruthy();
    });
  });

  it("normalizes email and routes to the app after a successful login", async () => {
    mockLogin.mockResolvedValueOnce({ ok: true });

    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), " Grower@Example.com ");
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "password123");
    fireEvent.press(screen.getByLabelText("Sign in"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("grower@example.com", "password123");
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  it("shows an actionable failed-login message without navigating", async () => {
    mockLogin.mockRejectedValueOnce(
      new ApiError("BAD_LOGIN", 401, {
        message: "Invalid email or password."
      })
    );

    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "grower@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "wrong-password");
    fireEvent.press(screen.getByLabelText("Sign in"));

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password.")).toBeTruthy();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it("separates server connectivity failures from bad credentials", async () => {
    const networkError = new ApiError("NETWORK_ERROR", null, {
      message: "Unable to reach the server."
    });
    networkError.message = "Unable to reach the server.";
    mockLogin.mockRejectedValueOnce(networkError);

    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "grower@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "password123");
    fireEvent.press(screen.getByLabelText("Sign in"));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Unable to reach GrowPath right now. Check your connection and try again. If it keeps happening, email support@growpathai.com."
        )
      ).toBeTruthy();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
