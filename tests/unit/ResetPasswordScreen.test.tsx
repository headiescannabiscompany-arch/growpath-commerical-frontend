import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ResetPasswordScreen from "@/app/reset-password";

const mockResetPassword = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, any> = {};

jest.mock("@/api/auth", () => ({
  resetPassword: (...args: any[]) => mockResetPassword(...args)
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({
    replace: mockReplace,
    canGoBack: () => false,
    back: jest.fn()
  })
}));

describe("ResetPasswordScreen", () => {
  beforeEach(() => {
    mockResetPassword.mockReset();
    mockReplace.mockReset();
    mockParams = { token: "reset-token" };
  });

  it("submits a valid reset token and password", async () => {
    mockResetPassword.mockResolvedValueOnce({ ok: true });
    const screen = render(<ResetPasswordScreen />);

    fireEvent.changeText(screen.getByLabelText("New password"), "new-password");
    fireEvent.changeText(screen.getByLabelText("Confirm new password"), "new-password");
    fireEvent.press(screen.getByLabelText("Update password"));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith("reset-token", "new-password");
      expect(
        screen.getByText("Your password has been updated. You can sign in now.")
      ).toBeTruthy();
    });
  });

  it("accepts resetToken and code aliases from email links", async () => {
    mockResetPassword.mockResolvedValue({ ok: true });

    mockParams = { resetToken: "reset-alias" };
    const aliasScreen = render(<ResetPasswordScreen />);
    fireEvent.changeText(aliasScreen.getByLabelText("New password"), "new-password");
    fireEvent.changeText(
      aliasScreen.getByLabelText("Confirm new password"),
      "new-password"
    );
    fireEvent.press(aliasScreen.getByLabelText("Update password"));
    await waitFor(() =>
      expect(mockResetPassword).toHaveBeenCalledWith("reset-alias", "new-password")
    );
    aliasScreen.unmount();

    mockParams = { code: ["code-alias"] };
    const codeScreen = render(<ResetPasswordScreen />);
    fireEvent.changeText(codeScreen.getByLabelText("New password"), "new-password");
    fireEvent.changeText(
      codeScreen.getByLabelText("Confirm new password"),
      "new-password"
    );
    fireEvent.press(codeScreen.getByLabelText("Update password"));
    await waitFor(() =>
      expect(mockResetPassword).toHaveBeenCalledWith("code-alias", "new-password")
    );
  });

  it("shows actionable validation errors before calling the API", async () => {
    mockParams = {};
    const screen = render(<ResetPasswordScreen />);

    fireEvent.changeText(screen.getByLabelText("New password"), "short");
    fireEvent.changeText(screen.getByLabelText("Confirm new password"), "different");
    fireEvent.press(screen.getByLabelText("Update password"));

    expect(screen.getByText("This reset link is missing a token.")).toBeTruthy();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it("routes back to sign in after reset", () => {
    const screen = render(<ResetPasswordScreen />);

    fireEvent.press(screen.getByLabelText("Go to sign in"));

    expect(mockReplace).toHaveBeenCalledWith("/login");
  });
});
