import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import CommercialMoreRoute from "@/app/home/commercial/more";

const mockPush = jest.fn();
const mockUseAuth = jest.fn();
const mockCan = jest.fn();

jest.mock("expo-router", () => ({
  Link: ({ children, href }: any) =>
    require("react").cloneElement(children, { href, onPress: () => mockPush(href) })
}));
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockUseAuth() }));
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { BUSINESS_DESK_READ: "business_desk_read" },
  useEntitlements: () => ({ can: mockCan })
}));
jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ header, children }: any) => React.createElement(View, null, header, children);
});
jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});

describe("Commercial sales navigation", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockUseAuth.mockReturnValue({ user: { role: "user" } });
    mockCan.mockReturnValue(true);
  });

  it.each([
    ["Storefront", "/home/commercial/storefront"],
    ["Products", "/home/commercial/products"],
    ["My Storefront Offers", "/home/commercial/storefront/offers"],
    ["Orders", "/home/commercial/orders"],
    ["Billing and seller payouts", "/account/billing"]
  ])("opens the existing %s destination only on deliberate navigation", (label, href) => {
    const screen = render(<CommercialMoreRoute />);
    expect(mockPush).not.toHaveBeenCalled();
    const links = screen.getAllByRole("link", { name: `Open ${label}` });
    expect(links).toHaveLength(1);
    expect(links[0].props.href).toBe(href);
    fireEvent.press(links[0]);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(href);
  });

  it("distinguishes product orders, digital aggregates and bank settlement", () => {
    const screen = render(<CommercialMoreRoute />);
    expect(
      screen.getByText(/Product orders and downloadable offers use separate sales views/)
    ).toBeTruthy();
    expect(
      screen.getByText(/recorded sales are not bank payout confirmation/)
    ).toBeTruthy();
    expect(screen.getByText(/Sales and Analytics tabs/)).toBeTruthy();
    expect(screen.getByText(/net sales before fees/)).toBeTruthy();
    expect(screen.getByText(/This is not creator activation/)).toBeTruthy();
    expect(
      screen.queryByText(/Interactive Framework Builders|bank-approved|instant payout/i)
    ).toBeNull();
  });

  it("retains all existing destinations and their capability boundary", () => {
    mockCan.mockReturnValue(false);
    const screen = render(<CommercialMoreRoute />);
    for (const label of [
      "Dashboard",
      "Grows",
      "Videos",
      "Discover",
      "Notifications",
      "Tasks",
      "Courses",
      "Lives",
      "Forum / Q&A",
      "External Channels",
      "Analytics",
      "Product Lines",
      "Product Batches",
      "Product Trials",
      "Inventory Support",
      "Profile",
      "Public Links",
      "Tools"
    ]) {
      expect(screen.getByRole("link", { name: `Open ${label}` })).toBeTruthy();
    }
    expect(screen.queryByRole("link", { name: "Open Business Desk" })).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Open Horticulture Operations" })
    ).toBeNull();
    expect(screen.queryByRole("link", { name: "Open Admin Tools" })).toBeNull();
  });
});
