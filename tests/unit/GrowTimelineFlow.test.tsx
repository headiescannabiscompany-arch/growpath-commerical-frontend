import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import GrowTimelineFlow from "@/components/grows/GrowTimelineFlow";

describe("GrowTimelineFlow", () => {
  it("scrolls horizontally and opens another point's full detail and photo", () => {
    const screen = render(
      <GrowTimelineFlow
        events={[
          {
            id: "event-1",
            title: "Seedling established",
            summary: "First saved detail",
            timestamp: "2026-08-01T12:00:00.000Z"
          },
          {
            id: "event-2",
            title: "Flowering photo",
            summary: "Second saved detail",
            timestamp: "2026-08-08T12:00:00.000Z",
            photos: ["/uploads/public-field-observations/flowering.jpg"]
          }
        ]}
      />
    );

    expect(screen.getByLabelText("Chronological grow milestones").props.horizontal).toBe(
      true
    );
    expect(
      screen.getByLabelText("Selected timeline entry: Seedling established")
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Open timeline entry 2: Flowering photo"));

    const selected = screen.getByLabelText("Selected timeline entry: Flowering photo");
    expect(selected).toBeTruthy();
    expect(screen.getByText("Second saved detail")).toBeTruthy();
    expect(screen.getByLabelText("Photo 1 for Flowering photo")).toBeTruthy();
    expect(
      screen.queryByLabelText("Selected timeline entry: Seedling established")
    ).toBeNull();
  });

  it("keeps midnight UTC calendar dates on the selected day and sorts by display time", () => {
    const calendarDate = new Date(2026, 8, 1);
    const priorEvening = new Date(calendarDate.getTime() - 30 * 60 * 1000);
    const dateFormat: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric"
    };
    const calendarLabel = calendarDate.toLocaleDateString(undefined, dateFormat);
    const priorEveningLabel = priorEvening.toLocaleDateString(undefined, dateFormat);
    const screen = render(
      <GrowTimelineFlow
        events={[
          {
            id: "calendar-day",
            title: "Calendar day",
            timestamp: "2026-09-01T00:00:00.000Z"
          },
          {
            id: "instant-before-calendar-day",
            title: "Late prior evening",
            timestamp: priorEvening.toISOString()
          }
        ]}
      />
    );

    expect(screen.getAllByText(calendarLabel)).toHaveLength(1);
    expect(screen.getAllByText(priorEveningLabel)).toHaveLength(2);
    expect(
      screen.getByLabelText("Open timeline entry 1: Late prior evening")
    ).toBeTruthy();
    expect(screen.getByLabelText("Open timeline entry 2: Calendar day")).toBeTruthy();
  });
});
