import React from "react";
import { Alert, StyleSheet } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import Profile, { createPersonalProfileStyles } from "@/app/home/personal/(tabs)/profile";
import { getThemePalette } from "@/theme/appTheme";

const mockDeleteAccount = jest.fn();
const mockExportPrivacyData = jest.fn();
const mockLogout = jest.fn();
const mockRetryMe = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockUpdateContentControls = jest.fn();
const mockGetVideoQuota = jest.fn();
let mockEntitlementsPlan = "free";
const mockUser = {
  id: "user-1",
  email: "grower@example.com",
  displayName: "Grower",
  role: "user",
  plan: "free",
  subscriptionStatus: "free",
  emailVerified: true,
  ageBand: "21_plus",
  cannabisEligible: true,
  cannabisVisibility: "show",
  parentalLockEnabled: true
};

jest.mock("@/api/users", () => ({
  deleteAccount: (...args: any[]) => mockDeleteAccount(...args),
  exportPrivacyData: (...args: any[]) => mockExportPrivacyData(...args),
  updateProfile: jest.fn()
}));

jest.mock("@/api/auth", () => ({
  requestEmailVerification: jest.fn(),
  updateContentControls: (...args: any[]) => mockUpdateContentControls(...args)
}));

jest.mock("@/api/videos", () => ({
  getVideoQuota: (...args: any[]) => mockGetVideoQuota(...args)
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    logout: (...args: any[]) => mockLogout(...args),
    retryMe: (...args: any[]) => mockRetryMe(...args)
  })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    plan: mockEntitlementsPlan,
    mode: "personal"
  })
}));

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({
      mode: "night",
      resolvedMode: "night",
      palette: actual.getThemePalette("night", "dark"),
      hydrated: true,
      systemScheme: "night",
      autoUsesLocation: false,
      themeLocation: null,
      setThemeMode: jest.fn(),
      enableLocationAuto: jest.fn(),
      disableLocationAuto: jest.fn()
    })
  };
});

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush
  }),
  usePathname: () => "/profile"
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppPage({ children, header }: any) {
    return React.createElement(View, null, header, children);
  };
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppCard({ children }: any) {
    return React.createElement(View, null, children);
  };
});

jest.mock("@/components/TokenBalanceWidget", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockTokenBalanceWidget() {
    return React.createElement(Text, null, "10 of 10 AI tokens");
  };
});

describe("Profile privacy controls", () => {
  beforeEach(() => {
    mockDeleteAccount.mockReset();
    mockExportPrivacyData.mockReset();
    mockLogout.mockReset();
    mockRetryMe.mockReset();
    mockReplace.mockReset();
    mockPush.mockReset();
    mockUpdateContentControls.mockReset();
    mockGetVideoQuota.mockReset();
    mockEntitlementsPlan = "free";
    mockDeleteAccount.mockResolvedValue({ ok: true, deleted: true });
    mockLogout.mockResolvedValue(undefined);
    mockUpdateContentControls.mockResolvedValue({
      ok: true,
      contentControls: {
        cannabisVisibility: "hide",
        parentalLockEnabled: true,
        cannabisEligible: true
      }
    });
    mockGetVideoQuota.mockReturnValue(new Promise(() => {}));
  });

  it("requires typed confirmation before initiating account deletion", async () => {
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation((_title, _message, buttons) => {
        const destructive = buttons?.find((button) => button.style === "destructive");
        destructive?.onPress?.();
      });

    const screen = render(<Profile />);

    expect(screen.getByLabelText("Delete account").props.accessibilityState).toEqual({
      disabled: true
    });
    expect(mockDeleteAccount).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText("Delete account confirmation"), "DELETE");
    expect(screen.getByLabelText("Delete account").props.accessibilityState).toEqual({
      disabled: false
    });
    fireEvent.press(screen.getByLabelText("Delete account"));

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith("user_requested_from_profile");
      expect(mockLogout).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });

    alertSpy.mockRestore();
  });

  it("uses the active Night palette for sensitive fields and account actions", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createPersonalProfileStyles(palette);
    const screen = render(<Profile />);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.card).toEqual(
      expect.objectContaining({
        backgroundColor: palette.card,
        borderColor: palette.border
      })
    );
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.feedback.color).toBe(palette.success);
    expect(styles.error.color).toBe(palette.danger);
    expect(styles.buttonDanger.backgroundColor).toBe(palette.surface);

    const emailInput = screen.getByPlaceholderText("email@example.com");
    const pinInput = screen.getByLabelText("Parental content control PIN");
    const deleteInput = screen.getByLabelText("Delete account confirmation");
    const workspaceAction = screen.getByLabelText("Switch workspace mode");

    for (const input of [emailInput, pinInput, deleteInput]) {
      expect(input.props.placeholderTextColor).toBe(palette.textMuted);
      expect(StyleSheet.flatten(input.props.style)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.border,
          color: palette.text
        })
      );
    }
    expect(StyleSheet.flatten(workspaceAction.props.style)).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(screen.getByLabelText("Device push")).toBeTruthy();
  });

  it("opens the workspace mode switcher from the personal profile", () => {
    const screen = render(<Profile />);

    fireEvent.press(screen.getByLabelText("Switch workspace mode"));

    expect(mockPush).toHaveBeenCalledWith("/account/mode");
  });

  it("shows the real Personal workspace video-storage allowance", async () => {
    mockGetVideoQuota.mockResolvedValue({
      plan: "free",
      limitBytes: 500 * 1024 * 1024,
      usedBytes: 25 * 1024 * 1024,
      remainingBytes: 475 * 1024 * 1024,
      externalSourcesConsumeStorage: false,
      growPathUploadsConsumeStorage: true
    });
    const screen = render(<Profile />);

    await waitFor(() => {
      expect(mockGetVideoQuota).toHaveBeenCalledWith("personal");
      expect(screen.getByText("25.0 MB used of 500.0 MB")).toBeTruthy();
      expect(screen.getByText(/475.0 MB remains/)).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Open video storage library"));
    expect(mockPush).toHaveBeenCalledWith("/videos?tab=library");
  });

  it("logs out through an in-page confirmation that can be cancelled", async () => {
    const screen = render(<Profile />);

    fireEvent.press(screen.getByLabelText("Log out"));
    expect(screen.getByLabelText("Log out confirmation")).toBeTruthy();
    expect(mockLogout).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Cancel logout"));
    expect(screen.queryByLabelText("Log out confirmation")).toBeNull();
    expect(mockLogout).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Log out"));
    fireEvent.press(screen.getByLabelText("Confirm logout"));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("shows a Pro account the shared upgrade action for higher plans", () => {
    mockEntitlementsPlan = "pro";
    const screen = render(<Profile />);
    expect(screen.getByText("Upgrade Plans")).toBeTruthy();
    expect(screen.getByText("Manage Billing")).toBeTruthy();
  });

  it("shows a Free account the shared upgrade action", () => {
    const screen = render(<Profile />);

    expect(screen.getByText("Upgrade Plans")).toBeTruthy();
    expect(screen.getByText("Manage Billing")).toBeTruthy();
  });

  it("describes push delivery as device-based rather than phone-based", () => {
    const screen = render(<Profile />);

    expect(screen.getByText(/registered device/)).toBeTruthy();
  });

  it("lets an adult account hide cannabis without entering the parental PIN", async () => {
    const screen = render(<Profile />);
    expect(screen.getByLabelText("Parental content control PIN").props).toMatchObject({
      autoComplete: "one-time-code",
      textContentType: "oneTimeCode",
      importantForAutofill: "no"
    });
    fireEvent.press(screen.getByLabelText("Hide cannabis content"));

    await waitFor(() =>
      expect(mockUpdateContentControls).toHaveBeenCalledWith({
        cannabisVisibility: "hide",
        currentPin: ""
      })
    );
    expect(mockRetryMe).toHaveBeenCalled();
  });
});
