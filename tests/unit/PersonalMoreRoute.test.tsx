import React from "react";
import { render } from "@testing-library/react-native";

import PersonalMoreRoute from "@/app/home/personal/(tabs)/more";

const mockUseAuth = jest.fn();

jest.mock("expo-router", () => ({
  Link: ({ children, href }: any) => require("react").cloneElement(children, { href })
}));
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockUseAuth() }));
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

describe("PersonalMoreRoute", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { role: "user" } });
  });

  it("keeps overflow tools and learning routes reachable", () => {
    const screen = render(<PersonalMoreRoute />);

    expect(screen.getByText("More Personal Workspaces")).toBeTruthy();
    expect(screen.getByLabelText("Open AI Tools")).toBeTruthy();
    expect(screen.getByLabelText("Open Create and manage courses")).toBeTruthy();
    expect(screen.getByLabelText("Open Manage videos")).toBeTruthy();
    expect(screen.getByLabelText("Open Field Studies")).toBeTruthy();
    expect(screen.getByLabelText("Open Discovery Nature")).toBeTruthy();
    expect(screen.getByLabelText("Open Switch workspace")).toBeTruthy();
    expect(screen.queryByLabelText("Open Admin Tools")).toBeNull();
  });

  it("groups existing creator destinations without requiring another signup or activation", () => {
    const screen = render(<PersonalMoreRoute />);

    expect(screen.getByRole("header", { name: "Creator tools" })).toBeTruthy();
    expect(screen.getByText(/No separate creator signup is needed/)).toBeTruthy();
    expect(
      screen.getByText(/Your plan's permissions and storage limits still apply/)
    ).toBeTruthy();
    expect(screen.getByText(/Optional for eligible paid sales/)).toBeTruthy();
    expect(screen.getByText(/This is not creator activation/)).toBeTruthy();
    expect(
      screen.getByText(/Opening the studio does not start a broadcast/)
    ).toBeTruthy();

    const destinations = [
      ["Create and manage courses", "/courses"],
      ["Manage videos", "/videos?tab=library"],
      ["Live Studio", "/live-studio"],
      ["Billing and seller payouts", "/home/personal/profile/billing"]
    ];
    for (const [label, href] of destinations) {
      const links = screen.getAllByRole("link", { name: `Open ${label}` });
      expect(links).toHaveLength(1);
      expect(links[0].props.href).toBe(href);
    }
    expect(screen.queryByLabelText("Open Courses")).toBeNull();
    expect(screen.queryByLabelText("Open Videos")).toBeNull();
    expect(screen.queryByLabelText("Open Profile links")).toBeNull();
  });

  it("preserves every unrelated destination", () => {
    const screen = render(<PersonalMoreRoute />);
    const destinations = [
      ["AI Tools", "/home/personal/tools"],
      ["Diagnose", "/home/personal/diagnose"],
      ["Field Studies", "/home/personal/field-studies"],
      ["Discovery Nature", "/field-observations"],
      ["Logs", "/home/personal/grows"],
      ["Tasks", "/home/personal/tasks"],
      ["Profile", "/home/personal/profile"],
      ["Switch workspace", "/account/mode"]
    ];
    for (const [label, href] of destinations) {
      const links = screen.getAllByRole("link", { name: `Open ${label}` });
      expect(links).toHaveLength(1);
      expect(links[0].props.href).toBe(href);
    }
  });

  it("exposes platform administration to an admin on compact navigation", () => {
    mockUseAuth.mockReturnValue({ user: { role: "admin" } });

    const screen = render(<PersonalMoreRoute />);

    expect(screen.getByText("Platform administration")).toBeTruthy();
    expect(screen.getByLabelText("Open Admin Tools")).toBeTruthy();
  });
});
