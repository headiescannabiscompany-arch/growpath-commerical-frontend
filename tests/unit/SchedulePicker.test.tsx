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
    fireEvent.press(screen.getByLabelText("Task workflow quick date Next week"));

    expect(onDueDateChange).toHaveBeenCalledWith(expect.stringMatching(/T18:00$/));
    expect(onDueDateChange).toHaveBeenCalledTimes(3);
  });
});
