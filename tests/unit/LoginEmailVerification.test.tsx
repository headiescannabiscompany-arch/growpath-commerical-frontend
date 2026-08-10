import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { ApiError } from "@/api/apiRequest";
import LoginScreen from "@/app/login";

const mockLogin = jest.fn();
const mockRequestEmailVerification = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    login: (...args: any[]) => mockLogin(...args)
  })
}));

jest.mock("@/api/auth", () => ({
  requestEmailVerification: (...args: any[]) => mockRequestEmailVerification(...args)
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
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
    mockParams = {};
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

  it("shows the reset-success handoff and prefills the account email", () => {
    mockParams = { email: "grower@example.com", reset: "success" };

    const screen = render(<LoginScreen />);

    expect(screen.getByDisplayValue("grower@example.com")).toBeTruthy();
    expect(
      screen.getByText("Password updated. Sign in with your new password.")
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

  it("normalizes email and routes to workspace choice after a successful login", async () => {
    mockLogin.mockResolvedValueOnce({ ok: true });

    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), " Grower@Example.com ");
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "password123");
    fireEvent.press(screen.getByLabelText("Sign in"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("grower@example.com", "password123");
      expect(mockReplace).toHaveBeenCalledWith("/account/workspace");
    });
  });

  it("returns a successful gift-recipient login only to a validated claim path", async () => {
    mockParams = { next: "/claim-gift?token=gift-token-1" };
    mockLogin.mockResolvedValueOnce({ ok: true });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "friend@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "password123");
    fireEvent.press(screen.getByLabelText("Sign in"));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/claim-gift"));
    expect(JSON.stringify(mockReplace.mock.calls)).not.toContain("gift-token-1");
  });

  it("returns a purchaser login to one validated checkout identity", async () => {
    const next =
      "/account/gift-checkout/cancel?checkout_attempt_id=123e4567-e89b-42d3-a456-426614174000";
    mockParams = { next };
    mockLogin.mockResolvedValueOnce({ ok: true });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "buyer@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "password123");
    fireEvent.press(screen.getByLabelText("Sign in"));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(next));
  });

  it("returns a signed-in purchaser only to the exact gift offers continuation", async () => {
    const next = "/offers?gift=1";
    mockParams = { next };
    mockLogin.mockResolvedValueOnce({ ok: true });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "buyer@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "password123");
    fireEvent.press(screen.getByLabelText("Sign in"));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(next));
  });

  it("never passes a purchaser checkout continuation into registration", () => {
    mockParams = {
      next: "/account/gift-checkout/success?session_id=cs_test_valid_session"
    };
    const screen = render(<LoginScreen />);

    fireEvent.press(screen.getByLabelText("Create account"));

    expect(mockPush).toHaveBeenCalledWith({ pathname: "/register", params: undefined });
  });

  it("preserves a validated purchaser return through forgot-password", () => {
    const next =
      "/account/gift-checkout/cancel?checkout_attempt_id=123e4567-e89b-42d3-a456-426614174000";
    mockParams = { next };
    const screen = render(<LoginScreen />);

    fireEvent.press(screen.getByLabelText("Forgot password"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/forgot-password",
      params: { next }
    });
  });

  it("drops an untrusted next route from account creation", () => {
    mockParams = { next: "https://evil.example/steal" };
    const screen = render(<LoginScreen />);

    fireEvent.press(screen.getByLabelText("Create account"));

    expect(mockPush).toHaveBeenCalledWith({ pathname: "/register", params: undefined });
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
