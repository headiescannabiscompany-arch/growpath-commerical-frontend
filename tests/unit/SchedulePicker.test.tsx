import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import SchedulePicker from "@/components/schedule/SchedulePicker";

describe("SchedulePicker", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([0, 23])(
    "uses the local calendar for opt-in timed quick dates at hour %s",
    (hour) => {
      jest.useFakeTimers();
      const now = new Date(2026, 9, 9, hour, 30);
      jest.setSystemTime(now);
      const onDueDateChange = jest.fn();
      const screen = render(
        <SchedulePicker
          dueDate=""
          reminder=""
          recurrence=""
          dateTime
          localDateTimeQuickDates
          lightsOnTime="00:15"
          lightsOffTime="23:45"
          onDueDateChange={onDueDateChange}
          onReminderChange={jest.fn()}
          onRecurrenceChange={jest.fn()}
          accessibilityPrefix="Campaign"
        />
      );

      const choices = [
        ["Today", "2026-10-09T00:00"],
        ["This evening", "2026-10-09T18:00"],
        ["Tomorrow", "2026-10-10T00:00"],
        ["Next lights on", "2026-10-10T00:15"],
        ["Next lights off", "2026-10-09T23:45"],
        ["In 3 days", "2026-10-12T00:00"],
        ["In 7 days", "2026-10-16T00:00"],
        ["In 14 days", "2026-10-23T00:00"],
        ["In 21 days", "2026-10-30T00:00"],
        ["Next week", "2026-10-12T00:00"]
      ];
      for (const [label, expected] of choices) {
        fireEvent.press(screen.getByLabelText(`Campaign quick date ${label}`));
        expect(onDueDateChange).toHaveBeenLastCalledWith(expected);
      }
      // Local constructors keep these assertions independent of the runner's zone.
      // In a non-UTC zone one edge also differs from the UTC calendar date.
      expect(onDueDateChange.mock.calls[0][0].slice(0, 10)).toBe("2026-10-09");
      if (now.toISOString().slice(0, 10) !== "2026-10-09") {
        expect(onDueDateChange.mock.calls[0][0].slice(0, 10)).not.toBe(
          now.toISOString().slice(0, 10)
        );
      }
    }
  );

  it("keeps the chosen lights time on its next local day for opted-in timed dates", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 9, 7, 30));
    const onDueDateChange = jest.fn();
    const screen = render(
      <SchedulePicker
        dueDate=""
        reminder=""
        recurrence=""
        dateTime
        localDateTimeQuickDates
        lightsOnTime="06:15"
        lightsOffTime="18:45"
        onDueDateChange={onDueDateChange}
        onReminderChange={jest.fn()}
        onRecurrenceChange={jest.fn()}
        accessibilityPrefix="Campaign"
      />
    );

    fireEvent.press(screen.getByLabelText("Campaign quick date Next lights on"));
    expect(onDueDateChange).toHaveBeenLastCalledWith("2026-10-10T06:15");
    fireEvent.press(screen.getByLabelText("Campaign quick date Next lights off"));
    expect(onDueDateChange).toHaveBeenLastCalledWith("2026-10-09T18:45");
  });

  it.each([
    { dateTime: true },
    { dateTime: true, localDateTimeQuickDates: false },
    { dateTime: false, localDateTimeQuickDates: true },
    { dateTime: true, allDay: true, localDateTimeQuickDates: true }
  ])("preserves existing quick dates when the opt-in is inactive: %j", (options) => {
    jest.useFakeTimers();
    const now = new Date(2026, 9, 9, 23, 30);
    jest.setSystemTime(now);
    const onDueDateChange = jest.fn();
    const screen = render(
      <SchedulePicker
        dueDate=""
        reminder=""
        recurrence=""
        {...options}
        onDueDateChange={onDueDateChange}
        onReminderChange={jest.fn()}
        onRecurrenceChange={jest.fn()}
        accessibilityPrefix="Existing workflow"
      />
    );
    const nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);

    fireEvent.press(screen.getByLabelText("Existing workflow quick date Today"));
    expect(onDueDateChange).toHaveBeenLastCalledWith(now.toISOString().slice(0, 10));
    fireEvent.press(screen.getByLabelText("Existing workflow quick date Tomorrow"));
    expect(onDueDateChange).toHaveBeenLastCalledWith(nextDay.toISOString().slice(0, 10));
    fireEvent.press(screen.getByLabelText("Existing workflow quick date This evening"));
    expect(onDueDateChange).toHaveBeenLastCalledWith(
      `${now.toISOString().slice(0, 10)}T18:00`
    );
  });

  it("supports the shared quick schedule chips from task workflows", () => {
    const onDueDateChange = jest.fn();
    const screen = render(
      <SchedulePicker
        dueDate=""
        reminder=""
        recurrence=""
        onDueDateChange={onDueDateChange}
        onReminderChange={jest.fn()}
        onRecurrenceChange={jest.fn()}
        accessibilityPrefix="Task workflow"
      />
    );

    fireEvent.press(screen.getByLabelText("Task workflow quick date This evening"));
    fireEvent.press(screen.getByLabelText("Task workflow quick date In 3 days"));
    fireEvent.press(screen.getByLabelText("Task workflow quick date In 21 days"));
    fireEvent.press(screen.getByLabelText("Task workflow quick date Next week"));

    expect(onDueDateChange).toHaveBeenCalledWith(expect.stringMatching(/T18:00$/));
    expect(onDueDateChange.mock.calls[2][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(onDueDateChange).toHaveBeenCalledTimes(4);
  });

  it("supports shared clear, reminder, recurrence, all-day, and lights-cycle controls", () => {
    const onDueDateChange = jest.fn();
    const onReminderChange = jest.fn();
    const onRecurrenceChange = jest.fn();
    const onAllDayChange = jest.fn();
    const screen = render(
      <SchedulePicker
        dueDate="2026-07-07"
        reminder="24 hours before"
        recurrence="weekly"
        allDay={false}
        timezone="America/New_York"
        lightsOnTime="06:00"
        lightsOffTime="18:00"
        onDueDateChange={onDueDateChange}
        onReminderChange={onReminderChange}
        onRecurrenceChange={onRecurrenceChange}
        onAllDayChange={onAllDayChange}
        accessibilityPrefix="Grow task"
      />
    );

    expect(screen.getByText(/Timezone: America\/New_York/)).toBeTruthy();
    expect(
      screen.getByLabelText("Grow task all day toggle").props.accessibilityRole
    ).toBe("switch");
    expect(
      screen.getByLabelText("Grow task all day toggle").props.accessibilityState
    ).toEqual({ checked: false });
    expect(
      screen.getByLabelText("Grow task reminder preset 24 hours before").props
        .accessibilityState
    ).toEqual({ checked: true });
    expect(
      screen.getByLabelText("Grow task recurrence preset weekly").props.accessibilityState
    ).toEqual({ checked: true });
    expect(screen.getByLabelText("Grow task clear schedule").props.style).toEqual(
      expect.objectContaining({ minHeight: 44 })
    );
    expect(
      screen.getByLabelText("Grow task quick date Next lights on").props.style
    ).toEqual(expect.arrayContaining([expect.objectContaining({ minHeight: 44 })]));

    fireEvent.press(screen.getByLabelText("Grow task quick date Next lights on"));
    fireEvent.press(screen.getByLabelText("Grow task reminder preset no reminder"));
    fireEvent.press(screen.getByLabelText("Grow task recurrence preset monthly"));
    fireEvent.press(screen.getByLabelText("Grow task recurrence preset every 21 days"));
    fireEvent.press(screen.getByLabelText("Grow task all day toggle"));
    fireEvent.press(screen.getByLabelText("Grow task clear schedule"));

    expect(onDueDateChange).toHaveBeenCalledWith(expect.stringMatching(/T06:00$/));
    expect(onReminderChange).toHaveBeenCalledWith("");
    expect(onRecurrenceChange).toHaveBeenCalledWith("monthly");
    expect(onRecurrenceChange).toHaveBeenCalledWith("every 21 days");
    expect(onAllDayChange).toHaveBeenCalledWith(true);
    expect(onDueDateChange).toHaveBeenLastCalledWith("");
    expect(onRecurrenceChange).toHaveBeenLastCalledWith("");
    expect(onAllDayChange).toHaveBeenLastCalledWith(false);
  });

  it("opens a shared calendar modal and selects an exact date", () => {
    const onDueDateChange = jest.fn();
    const screen = render(
      <SchedulePicker
        dueDate="2026-07-19"
        reminder=""
        recurrence=""
        onDueDateChange={onDueDateChange}
        onReminderChange={jest.fn()}
        onRecurrenceChange={jest.fn()}
        accessibilityPrefix="Recipe timeline"
      />
    );

    fireEvent.press(screen.getByLabelText("Recipe timeline due date"));
    expect(screen.getByLabelText("Recipe timeline due date calendar")).toBeTruthy();
    expect(screen.getByText("July 2026")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Recipe timeline due date day 2026-07-23"));
    fireEvent.press(screen.getByLabelText("Recipe timeline due date use selected date"));
    expect(onDueDateChange).toHaveBeenCalledWith("2026-07-23");
    expect(screen.queryByLabelText("Recipe timeline due date calendar")).toBeNull();
  });
});
