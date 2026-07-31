import React from "react";
import { render } from "@testing-library/react-native";

import PersonalMoreRoute from "@/app/home/personal/(tabs)/more";

jest.mock("expo-router", () => ({ Link: ({ children }: any) => children }));
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
  it("keeps overflow tools and learning routes reachable", () => {
    const screen = render(<PersonalMoreRoute />);

    expect(screen.getByText("More Personal Workspaces")).toBeTruthy();
    expect(screen.getByLabelText("Open AI Tools")).toBeTruthy();
    expect(screen.getByLabelText("Open Courses")).toBeTruthy();
    expect(screen.getByLabelText("Open Videos")).toBeTruthy();
    expect(screen.getByLabelText("Open Switch workspace")).toBeTruthy();
  });
});
