import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import { ScreenBoundary } from "../../src/components/ScreenBoundary";

jest.mock("../../src/components/nav/BackButton", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockBackButton({ fallbackHref, preferFallback }: any) {
    return (
      <Text>
        Shared Boundary Back {fallbackHref} {preferFallback ? "preferred" : "history"}
      </Text>
    );
  };
});

describe("ScreenBoundary back behavior", () => {
  it("shows a back button by default for root-style screens", () => {
    const screen = render(
      <ScreenBoundary title="Root">
        <Text>Root screen</Text>
      </ScreenBoundary>
    );

    expect(
      screen.getByText(/Shared Boundary Back.*\/account\/workspace.*history/)
    ).toBeTruthy();
    expect(screen.getByText("Root screen")).toBeTruthy();
  });

  it("shows the shared back button when nested pages opt in", () => {
    const screen = render(
      <ScreenBoundary title="Detail" showBack backFallbackHref="/home/facility/tasks">
        <Text>Detail screen</Text>
      </ScreenBoundary>
    );

    expect(
      screen.getByText(/Shared Boundary Back.*\/home\/facility\/tasks.*history/)
    ).toBeTruthy();
    expect(screen.getByText("Detail screen")).toBeTruthy();
  });

  it("can prefer an exact source fallback over unrelated browser history", () => {
    const screen = render(
      <ScreenBoundary
        title="Detail"
        showBack
        preferBackFallback
        backFallbackHref="/home/personal/grows/grow-1/journal"
      >
        <Text>Source-linked screen</Text>
      </ScreenBoundary>
    );

    expect(
      screen.getByText(
        /Shared Boundary Back.*\/home\/personal\/grows\/grow-1\/journal.*preferred/
      )
    ).toBeTruthy();
  });

  it("keeps exception details out of the user-facing crash state", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    function BrokenScreen(): React.ReactNode {
      throw new Error("secret-internal-object-id stack detail");
    }

    const screen = render(
      <ScreenBoundary title="Sensitive screen">
        <BrokenScreen />
      </ScreenBoundary>
    );

    expect(
      screen.getByRole("header", { name: "Screen unavailable" }).props["aria-level"]
    ).toBe(1);
    expect(screen.getByText(/unexpected error.*contact support/i)).toBeTruthy();
    expect(screen.queryByText(/secret-internal-object-id/i)).toBeNull();
    expect(screen.queryByText("Stack")).toBeNull();
    consoleError.mockRestore();
  });
});
