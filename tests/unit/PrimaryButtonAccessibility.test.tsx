import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import PrimaryButton from "@/components/PrimaryButton";

describe("PrimaryButton accessibility contract", () => {
  it("uses its title as its name and preserves a 44px target", () => {
    const screen = render(<PrimaryButton title="Save changes" onPress={jest.fn()} />);
    const button = screen.getByRole("button", { name: "Save changes" });

    expect(StyleSheet.flatten(button.props.style)).toMatchObject({
      minHeight: 44,
      minWidth: 44
    });
    expect(button.props.accessibilityState).toEqual({ disabled: false });
  });

  it("announces disabled state", () => {
    const screen = render(<PrimaryButton title="Publish" onPress={jest.fn()} disabled />);
    const button = screen.getByRole("button", { name: "Publish" });

    expect(button.props.accessibilityState).toEqual({ disabled: true });
  });

  it("exposes visible keyboard focus", () => {
    const screen = render(<PrimaryButton title="Publish" onPress={jest.fn()} />);
    const button = screen.getByRole("button", { name: "Publish" });

    fireEvent(button, "focus");
    expect(StyleSheet.flatten(screen.getByRole("button").props.style)).toMatchObject({
      outlineStyle: "solid",
      outlineWidth: 2
    });
  });
});
