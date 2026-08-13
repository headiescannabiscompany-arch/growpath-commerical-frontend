import React from "react";
import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href }: any) => React.cloneElement(children, { href })
  };
});

describe("GrowWorkspaceNav accessibility", () => {
  it("exposes one selected, touch-sized tab in the grow workspace", () => {
    const screen = render(<GrowWorkspaceNav growId="grow-1" active="tasks" />);

    expect(screen.getByLabelText("Grow workspace sections")).toBeTruthy();
    expect(screen.getByLabelText("Tasks grow section").props.accessibilityState).toEqual({
      selected: true
    });
    expect(screen.getByLabelText("Plants grow section").props.accessibilityState).toEqual(
      {
        selected: false
      }
    );
    expect(
      StyleSheet.flatten(screen.getByLabelText("Tasks grow section").props.style)
    ).toEqual(expect.objectContaining({ minHeight: 44 }));
  });
});
