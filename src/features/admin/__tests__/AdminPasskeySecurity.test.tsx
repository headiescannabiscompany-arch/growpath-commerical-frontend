import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import AdminPasskeySecurity from "../AdminPasskeySecurity";
import {
  adminPasskeysSupported,
  getAdminPasskeyStatus,
  registerAdminPasskey,
  verifyAdminPasskey
} from "@/api/adminPasskeys";

jest.mock("@/api/adminPasskeys", () => ({
  adminPasskeysSupported: jest.fn(),
  getAdminPasskeyStatus: jest.fn(),
  getAdminSecurityIdentityEpoch: () => 0,
  getAdminStepUpExpiry: jest.fn(),
  lockAdminSecurity: jest.fn(),
  registerAdminPasskey: jest.fn(),
  revokeAdminPasskey: jest.fn(),
  subscribeAdminSecurity: () => () => {},
  verifyAdminPasskey: jest.fn()
}));
jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({
    palette: {
      text: "#102010",
      textMuted: "#555",
      surface: "#fff",
      border: "#ccc",
      link: "#166534",
      accent: "#166534"
    }
  })
}));

beforeEach(() => {
  (adminPasskeysSupported as jest.Mock).mockReturnValue(true);
  (getAdminPasskeyStatus as jest.Mock).mockResolvedValue({
    ok: true,
    configured: true,
    enrollmentEnabled: true,
    enforcementEnabled: true,
    enrolled: false,
    passkeys: [],
    stepUpExpiresAt: null
  });
});

test("security section is compact until explicitly opened", () => {
  const screen = render(<AdminPasskeySecurity />);
  expect(screen.getByText("Admin security")).toBeTruthy();
  expect(
    screen.queryByLabelText("Current Admin password for passkey changes")
  ).toBeNull();
  expect(getAdminPasskeyStatus).not.toHaveBeenCalled();
});

test("first enrollment clears the password field during the device ceremony", async () => {
  const screen = render(<AdminPasskeySecurity />);
  fireEvent.press(screen.getByText("Set up or verify a passkey"));
  await waitFor(() => screen.getByLabelText("Admin passkey label"));
  fireEvent.changeText(screen.getByLabelText("Admin passkey label"), "My phone");
  fireEvent.changeText(
    screen.getByLabelText("Current Admin password for passkey changes"),
    "synthetic-password"
  );
  (registerAdminPasskey as jest.Mock).mockResolvedValue({ ok: true });
  fireEvent.press(screen.getByText("Add a passkey"));
  await waitFor(() =>
    expect(registerAdminPasskey).toHaveBeenCalledWith("synthetic-password", "My phone")
  );
  expect(
    screen.getByLabelText("Current Admin password for passkey changes").props.value
  ).toBe("");
  expect(
    screen.getByLabelText("Current Admin password for passkey changes").props
      .secureTextEntry
  ).toBe(true);
});

test("unsupported browser explains the secure path without a password fallback", async () => {
  (adminPasskeysSupported as jest.Mock).mockReturnValue(false);
  const screen = render(<AdminPasskeySecurity />);
  fireEvent.press(screen.getByText("Set up or verify a passkey"));
  await waitFor(() => expect(getAdminPasskeyStatus).toHaveBeenCalled());
  expect(screen.getByText(/No password-only bypass/)).toBeTruthy();
  expect(screen.queryByText("Add a passkey")).toBeNull();
  fireEvent.press(screen.getByText("Verify passkey"));
  expect(verifyAdminPasskey).not.toHaveBeenCalled();
});
