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
});
