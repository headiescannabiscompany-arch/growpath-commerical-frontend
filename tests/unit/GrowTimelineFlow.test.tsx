import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import GrowTimelineFlow from "@/components/grows/GrowTimelineFlow";

describe("GrowTimelineFlow", () => {
  it("lets the heading wrap beside a stable count while long timelines keep every point selectable", () => {
    const events = Array.from({ length: 40 }, (_, index) => ({
      id: `point-${index}`,
      title: `Milestone ${index + 1}`,
      timestamp: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      summary: `Detail for milestone ${index + 1}`
    }));
    const screen = render(<GrowTimelineFlow events={events} />);
    expect(
      StyleSheet.flatten(screen.getByTestId("grow-timeline-heading-copy").props.style)
    ).toMatchObject({
      flex: 1,
      minWidth: 0
    });
    expect(StyleSheet.flatten(screen.getByText("40 points").props.style)).toMatchObject({
      flexShrink: 0
    });
    fireEvent.press(screen.getByLabelText("Open timeline entry 40: Milestone 40"));
    expect(screen.getByText("Detail for milestone 40")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Open timeline entry 1: Milestone 1"));
    expect(screen.getByText("Detail for milestone 1")).toBeTruthy();
  });

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
