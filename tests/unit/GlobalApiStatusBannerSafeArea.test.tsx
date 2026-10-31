import React from "react";
import { Platform, StyleSheet } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { act, cleanup, fireEvent, render } from "@testing-library/react-native";
import { GlobalApiStatusBanner, connectionBannerInsets, createGlobalApiStatusBannerStyles } from "@/components/GlobalApiStatusBanner";
import { getThemePalette } from "@/theme/appTheme";
let mockListener: (event: any) => void;
const mockUnsubscribe = jest.fn();
jest.mock("@/api/apiRequest", () => ({ subscribeToApiTransport: (fn: any) => { mockListener = fn; return mockUnsubscribe; } }));
const error = { type: "error", error: { code: "NETWORK_ERROR", message: "Unable to reach the server.", requestId: "synthetic-reference", status: null } };
afterEach(() => { cleanup(); jest.restoreAllMocks(); });

test("banner clears the phone status inset and retains wrapping and dismiss hit area", () => {
  jest.replaceProperty(Platform, "OS", "ios");
  const screen = render(<SafeAreaInsetsContext.Provider value={{ top: 47, bottom: 34, left: 0, right: 0 }}><GlobalApiStatusBanner /></SafeAreaInsetsContext.Provider>);
  act(() => mockListener(error));
  expect(StyleSheet.flatten(screen.getByTestId("global-api-status-banner").props.style)).toMatchObject({ paddingTop: 57, paddingLeft: 16, paddingRight: 16 });
  const styles = createGlobalApiStatusBannerStyles(getThemePalette("night", "dark"));
  expect(styles.copy).toMatchObject({ flex: 1, minWidth: 0, flexShrink: 1 });
  expect(styles.dismiss.minHeight).toBeGreaterThanOrEqual(44);
  expect(screen.getByText("Reference: synthetic-reference")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Dismiss connection message"));
  expect(screen.queryByTestId("global-api-status-banner")).toBeNull();
});

test("web banner uses browser safe-area insets before provider measurement without adding them twice", () => {
  jest.replaceProperty(Platform, "OS", "web");
  expect(connectionBannerInsets(null)).toEqual({ paddingTop: "calc(10px + max(0px, env(safe-area-inset-top, 0px)))", paddingLeft: "calc(16px + max(0px, env(safe-area-inset-left, 0px)))", paddingRight: "calc(16px + max(0px, env(safe-area-inset-right, 0px)))" });
  expect(connectionBannerInsets({ top: 47, left: 44, right: 0 })).toMatchObject({ paddingTop: "calc(10px + max(47px, env(safe-area-inset-top, 0px)))", paddingLeft: "calc(16px + max(44px, env(safe-area-inset-left, 0px)))" });
});

test("native banner tolerates missing measurement and protects landscape side insets", () => {
  jest.replaceProperty(Platform, "OS", "ios");
  expect(connectionBannerInsets(null)).toEqual({ paddingTop: 10, paddingLeft: 16, paddingRight: 16 });
  expect(connectionBannerInsets({ top: 0, left: 47, right: 47 })).toEqual({ paddingTop: 10, paddingLeft: 63, paddingRight: 63 });
});

test("banner retains normal recovery and subscription cleanup without triggering a request", () => {
  const screen = render(<GlobalApiStatusBanner />);
  act(() => mockListener(error));
  expect(screen.getByTestId("global-api-status-banner").props.accessibilityRole).toBe("alert");
  act(() => mockListener({ type: "recovered" }));
  expect(screen.queryByTestId("global-api-status-banner")).toBeNull();
  screen.unmount();
  expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
});
