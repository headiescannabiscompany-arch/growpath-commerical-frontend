import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import CalendarDateField from "@/components/forms/CalendarDateField";

describe("CalendarDateField", () => {
  it("selects year, month, and day without typed date text", () => {
    const onChange = jest.fn();
    const screen = render(
      <CalendarDateField
        accessibilityLabel="Birth date"
        label="Date of birth"
        value=""
        onChange={onChange}
        initialYear={1990}
        minYear={1900}
        maxYear={2026}
        maximumDate="2026-07-25"
        optional={false}
      />
    );

    fireEvent.press(screen.getByLabelText("Birth date"));
    expect(screen.getByRole("header", { name: "Date of birth" })).toBeTruthy();
    expect(screen.getByLabelText("Birth date previous month").props.style).toEqual(
      expect.objectContaining({ minHeight: 44, minWidth: 44 })
    );
    expect(screen.getByLabelText("Birth date cancel").props.style).toEqual(
      expect.objectContaining({ minHeight: 44 })
    );
    expect(screen.getByLabelText("Birth date use selected date").props.style).toEqual(
      expect.objectContaining({ minHeight: 44 })
    );
    fireEvent(screen.getByLabelText("Birth date year"), "valueChange", 1991, 91);
    fireEvent(screen.getByLabelText("Birth date month"), "valueChange", 2, 1);
    fireEvent.press(screen.getByLabelText("Birth date day 1991-02-14"));
    fireEvent.press(screen.getByLabelText("Birth date use selected date"));

    expect(onChange).toHaveBeenCalledWith("1991-02-14");
    expect(screen.queryByLabelText("Birth date calendar")).toBeNull();
  });

  it("selects date and time through named controls", () => {
    const onChange = jest.fn();
    const screen = render(
      <CalendarDateField
        accessibilityLabel="Live start"
        value="2026-07-19T09:00"
        onChange={onChange}
        mode="datetime"
        timeZoneLabel="America/New_York"
      />
    );

    fireEvent.press(screen.getByLabelText("Live start"));
    expect(screen.getByText(/Timezone: America\/New_York/i)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Live start day 2026-07-23"));
    fireEvent(screen.getByLabelText("Live start hour"), "valueChange", 18, 18);
    fireEvent(screen.getByLabelText("Live start minute"), "valueChange", 30, 30);
    fireEvent.press(screen.getByLabelText("Live start use selected date"));

    expect(onChange).toHaveBeenCalledWith("2026-07-23T18:30");
  });
});
