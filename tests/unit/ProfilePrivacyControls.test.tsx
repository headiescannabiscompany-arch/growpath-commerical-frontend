import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import Profile from "@/app/home/personal/(tabs)/profile";

const mockDeleteAccount = jest.fn();
const mockExportPrivacyData = jest.fn();
const mockLogout = jest.fn();
const mockRetryMe = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockUpdateContentControls = jest.fn();

jest.mock("@/api/users", () => ({
  deleteAccount: (...args: any[]) => mockDeleteAccount(...args),
  exportPrivacyData: (...args: any[]) => mockExportPrivacyData(...args),
  updateProfile: jest.fn()
}));

jest.mock("@/api/auth", () => ({
  requestEmailVerification: jest.fn(),
  updateContentControls: (...args: any[]) => mockUpdateContentControls(...args)
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
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
    },
    logout: (...args: any[]) => mockLogout(...args),
    retryMe: (...args: any[]) => mockRetryMe(...args)
  })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    plan: "free",
    mode: "personal"
  })
}));

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
  return ({ children, header }: any) => React.createElement(View, null, header, children);
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});

jest.mock("@/components/TokenBalanceWidget", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => React.createElement(Text, null, "10 of 10 AI tokens");
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

  it("opens the workspace mode switcher from the personal profile", () => {
    const screen = render(<Profile />);

    fireEvent.press(screen.getByLabelText("Switch workspace mode"));

    expect(mockPush).toHaveBeenCalledWith("/account/mode");
  });

  it("lets an adult account hide cannabis without entering the parental PIN", async () => {
    const screen = render(<Profile />);
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
