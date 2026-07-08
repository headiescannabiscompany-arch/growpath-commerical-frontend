import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import SchedulePicker from "@/components/schedule/SchedulePicker";

describe("SchedulePicker", () => {
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
});
