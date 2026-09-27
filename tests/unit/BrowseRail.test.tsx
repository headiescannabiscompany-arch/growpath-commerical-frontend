import React from "react";
import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import BrowseRail from "@/components/commercial/BrowseRail";

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("day", "light") })
  };
});

it("exposes named controls only for overflowing rows and updates boundary states", () => {
  const screen = render(
    <BrowseRail label="Products">
      <Text>Hat</Text>
    </BrowseRail>
  );
  const row = screen.getByLabelText("Products browsing row");
  expect(screen.queryByLabelText("Next Products")).toBeNull();
  fireEvent(row, "layout", { nativeEvent: { layout: { width: 300 } } });
  fireEvent(row, "contentSizeChange", 900, 200);
  expect(
    screen.getByLabelText("Previous Products").props.accessibilityState.disabled
  ).toBe(true);
  expect(screen.getByLabelText("Next Products").props.accessibilityState.disabled).toBe(
    false
  );
  fireEvent.scroll(row, { nativeEvent: { contentOffset: { x: 600 } } });
  expect(screen.getByLabelText("Next Products").props.accessibilityState.disabled).toBe(
    true
  );
  expect(
    screen.getByLabelText("Previous Products").props.accessibilityState.disabled
  ).toBe(false);
  fireEvent(row, "layout", { nativeEvent: { layout: { width: 1000 } } });
  expect(screen.queryByLabelText("Next Products")).toBeNull();
});
