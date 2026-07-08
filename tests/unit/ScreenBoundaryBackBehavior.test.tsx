import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import { ScreenBoundary } from "../../src/components/ScreenBoundary";

jest.mock("../../src/components/nav/BackButton", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockBackButton() {
    return <Text>Shared Boundary Back</Text>;
  };
});

describe("ScreenBoundary back behavior", () => {
  it("does not show a back button by default for root-style screens", () => {
    const screen = render(
      <ScreenBoundary title="Root">
        <Text>Root screen</Text>
      </ScreenBoundary>
    );

    expect(screen.queryByText("Shared Boundary Back")).toBeNull();
    expect(screen.getByText("Root screen")).toBeTruthy();
  });

  it("shows the shared back button when nested pages opt in", () => {
    const screen = render(
      <ScreenBoundary title="Detail" showBack backFallbackHref="/home/facility/tasks">
        <Text>Detail screen</Text>
      </ScreenBoundary>
    );

    expect(screen.getByText("Shared Boundary Back")).toBeTruthy();
    expect(screen.getByText("Detail screen")).toBeTruthy();
  });
});
