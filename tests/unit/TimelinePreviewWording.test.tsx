import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import TimelinePreviewWording from "@/features/grows/screens/TimelinePreviewWording";
import type { GrowTimelinePublicEvent } from "@/api/growTimelineCopies";

const entry: GrowTimelinePublicEvent = {
  id: "GrowLog:first",
  title: "Day one",
  summary: "A published caption",
  type: "log_created",
  timestamp: "2026-08-01",
  tags: []
};

it("edits the exact reviewed public fields and keeps blank captions explicit", () => {
  const apply = jest.fn(),
    editing = jest.fn();
  const screen = render(
    <TimelinePreviewWording event={entry} onApply={apply} onEditingChange={editing} />
  );
  fireEvent.press(screen.getByLabelText("Edit wording: Day one"));
  expect(editing).toHaveBeenLastCalledWith(true);
  expect(screen.getByLabelText("Public entry caption").props.value).toBe(entry.summary);
  fireEvent.changeText(screen.getByLabelText("Public entry caption"), "");
  fireEvent.press(screen.getByLabelText("Update preview wording"));
  expect(apply).toHaveBeenCalledWith({ eventId: entry.id, summary: "" });
  expect(editing).toHaveBeenLastCalledWith(false);
});

it("requires a nonempty title, cancels cleanly, and restores the underlying wording on request", () => {
  const apply = jest.fn();
  const screen = render(
    <TimelinePreviewWording
      event={entry}
      override={{ eventId: entry.id, title: "Public name" }}
      onApply={apply}
    />
  );
  fireEvent.press(screen.getByLabelText("Edit wording: Day one"));
  expect(screen.getByLabelText("Public entry title").props.value).toBe("Public name");
  fireEvent.changeText(screen.getByLabelText("Public entry title"), "  ");
  expect(screen.getByRole("button", { name: "Update preview wording" })).toBeDisabled();
  fireEvent.press(screen.getByRole("button", { name: "Cancel wording edit" }));
  expect(apply).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText("Edit wording: Day one"));
  fireEvent.press(screen.getByLabelText("Use journal wording"));
  expect(apply).toHaveBeenCalledWith({ eventId: entry.id });
});

it("releases the pending editor when selecting a different entry and never reuses its draft", () => {
  const apply = jest.fn(),
    editing = jest.fn();
  const screen = render(
    <TimelinePreviewWording event={entry} onApply={apply} onEditingChange={editing} />
  );
  fireEvent.press(screen.getByLabelText("Edit wording: Day one"));
  fireEvent.changeText(screen.getByLabelText("Public entry title"), "Unconfirmed draft");
  screen.rerender(
    <TimelinePreviewWording
      event={{ ...entry, id: "GrowLog:next", title: "Day two" }}
      onApply={apply}
      onEditingChange={editing}
    />
  );
  expect(editing).toHaveBeenLastCalledWith(false);
  expect(screen.queryByLabelText("Public entry title")).toBeNull();
  expect(apply).not.toHaveBeenCalled();
});
