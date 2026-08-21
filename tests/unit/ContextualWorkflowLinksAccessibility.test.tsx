import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush })
}));

import ContextualWorkflowLinks from "@/components/personal/ContextualWorkflowLinks";

describe("ContextualWorkflowLinks accessibility", () => {
  beforeEach(() => mockPush.mockReset());

  it("exposes a headed, named, touch-sized workflow link", () => {
    const screen = render(
      <ContextualWorkflowLinks
        title="Continue this grow workflow"
        workflows={["harvest-readiness"]}
        source="grow overview"
        growId="grow-1"
      />
    );

    expect(
      screen.getByRole("header", { name: "Continue this grow workflow" })
    ).toBeTruthy();
    const link = screen.getByLabelText("Harvest Readiness from grow overview");
    expect(link.props.accessibilityHint).toBe(
      "Review maturity signals and create recheck tasks."
    );
    expect(StyleSheet.flatten(link.props.style)).toEqual(
      expect.objectContaining({ minHeight: 44 })
    );

    fireEvent.press(link);
    expect(mockPush).toHaveBeenCalledWith(
      "/home/personal/tools/harvest-readiness?source=grow+overview&growId=grow-1"
    );
  });

  it("keeps direct and unsupported workflows inside Commercial", () => {
    const screen = render(
      <ContextualWorkflowLinks
        title="Commercial workflow links"
        workflows={["harvest-readiness", "watering"]}
        source="commercial grow"
        growId="grow-2"
        workspace="commercial"
      />
    );

    fireEvent.press(screen.getByLabelText("Harvest Readiness from commercial grow"));
    expect(mockPush).toHaveBeenLastCalledWith(
      "/home/commercial/tools/harvest-readiness?source=commercial+grow&growId=grow-2"
    );

    fireEvent.press(screen.getByLabelText("Watering Planner from commercial grow"));
    expect(mockPush).toHaveBeenLastCalledWith(
      "/home/commercial/tools?source=commercial+grow&growId=grow-2&recommendedTool=watering"
    );
  });
});
