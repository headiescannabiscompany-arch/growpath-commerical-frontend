import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import EvidenceReviewPanel from "@/components/personal/EvidenceReviewPanel";
import type { EvidenceReview } from "@/features/personal/evidence/evidenceReview";
import { getThemePalette } from "@/theme/appTheme";

let mockThemeMode: "day" | "night" = "night";

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({
      palette: actual.getThemePalette(
        mockThemeMode,
        mockThemeMode === "night" ? "dark" : "light"
      )
    })
  };
});

const incompleteReview: EvidenceReview = {
  requested: true,
  performed: false,
  photoCount: 2,
  photosAnalyzed: 0,
  quality: "limited",
  confidence: "low",
  providerLabel: "Text-only provider",
  evidenceUsed: ["Leaf overview"],
  counterEvidence: ["Lighting obscures the margins"],
  missingInformation: ["Stem close-up"],
  requiredNextPhotos: ["Leaf underside"],
  limitations: ["No macro image"]
};

describe("EvidenceReviewPanel", () => {
  beforeEach(() => {
    mockThemeMode = "night";
  });

  it.each(["day", "night"] as const)(
    "renders the evidence warning and action with the active %s palette",
    (mode) => {
      mockThemeMode = mode;
      const palette = getThemePalette(mode, mode === "night" ? "dark" : "light");
      const onAddEvidence = jest.fn();
      const screen = render(
        <EvidenceReviewPanel review={incompleteReview} onAddEvidence={onAddEvidence} />
      );

      const card = screen.getByLabelText("Evidence review summary");
      const warning = screen.getByText(/files are attached/);
      const action = screen.getByLabelText("Add requested evidence");

      expect(StyleSheet.flatten(card.props.style)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.border
        })
      );
      expect(
        StyleSheet.flatten(screen.getByText("Evidence review").props.style).color
      ).toBe(palette.text);
      expect(
        StyleSheet.flatten(screen.getByText("Pixels not analyzed").props.style).color
      ).toBe(palette.link);
      expect(StyleSheet.flatten(warning.props.style)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surfaceMuted,
          borderColor: palette.warning,
          color: palette.warning
        })
      );
      expect(
        StyleSheet.flatten(screen.getByText("Evidence used").props.style).color
      ).toBe(palette.text);
      expect(
        StyleSheet.flatten(screen.getByText(/Leaf overview/).props.style).color
      ).toBe(palette.textMuted);
      expect(StyleSheet.flatten(action.props.style)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.accent
        })
      );
      expect(
        StyleSheet.flatten(
          screen.getByText("Add requested evidence and re-run").props.style
        ).color
      ).toBe(palette.link);

      fireEvent.press(action);
      expect(onAddEvidence).toHaveBeenCalledTimes(1);
    }
  );

  it("hides the warning and add action after evidence was performed with no next checks", () => {
    const screen = render(
      <EvidenceReviewPanel
        review={{
          ...incompleteReview,
          performed: true,
          photosAnalyzed: 2,
          missingInformation: [],
          requiredNextPhotos: [],
          limitations: []
        }}
        onAddEvidence={jest.fn()}
      />
    );

    expect(screen.getByText("2 photos inspected")).toBeTruthy();
    expect(screen.queryByText(/files are attached/)).toBeNull();
    expect(screen.queryByLabelText("Add requested evidence")).toBeNull();
  });
});
