import React, { useState } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";

jest.mock("@/components/nav/BackButton", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => React.createElement(Text, null, "Back");
});

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({
    palette: {
      page: "#ffffff",
      text: "#111111",
      textMuted: "#666666"
    }
  })
}));

function StatefulChild() {
  const [count, setCount] = useState(0);
  return (
    <Pressable accessibilityRole="button" onPress={() => setCount((value) => value + 1)}>
      <Text>Count {count}</Text>
    </Pressable>
  );
}

describe("ScreenBoundary state persistence", () => {
  it("does not remount page content when the Back control is hidden", () => {
    const screen = render(
      <ScreenBoundary showBack>
        <StatefulChild />
      </ScreenBoundary>
    );

    fireEvent.press(screen.getByRole("button"));
    expect(screen.getByText("Count 1")).toBeTruthy();

    screen.rerender(
      <ScreenBoundary showBack={false}>
        <StatefulChild />
      </ScreenBoundary>
    );

    expect(screen.getByText("Count 1")).toBeTruthy();
    expect(screen.queryByText("Back")).toBeNull();
  });
});
