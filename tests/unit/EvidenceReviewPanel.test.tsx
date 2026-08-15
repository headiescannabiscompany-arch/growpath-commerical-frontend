import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import EvidenceReviewPanel from "@/components/personal/EvidenceReviewPanel";
import type { EvidenceReview } from "@/features/personal/evidence/evidenceReview";
import { getThemePalette } from "@/theme/appTheme";

let mockThemeMode: "day" | "night" = "night";
const mockLoadAiInspectionView = jest.fn();
const mockSaveAiInspectionImage = jest.fn();
const mockExportAiInspectionEvidence = jest.fn();

jest.mock("@/api/evidence", () => ({
  loadAiInspectionView: (...args: any[]) => mockLoadAiInspectionView(...args)
}));

jest.mock("@/utils/aiInspectionEvidenceExport", () => ({
  saveAiInspectionImage: (...args: any[]) => mockSaveAiInspectionImage(...args),
  exportAiInspectionEvidence: (...args: any[]) => mockExportAiInspectionEvidence(...args)
}));

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
    mockLoadAiInspectionView.mockReset();
    mockSaveAiInspectionImage.mockReset();
    mockExportAiInspectionEvidence.mockReset();
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
      const action = screen.getByLabelText("How to add requested evidence");

      expect(screen.getByRole("header", { name: "Evidence review" })).toBeTruthy();
      expect(screen.getByRole("header", { name: "Evidence used" })).toBeTruthy();
      expect(warning.props.accessibilityRole).toBe("alert");

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
          borderColor: palette.accent,
          minHeight: 44
        })
      );
      expect(
        StyleSheet.flatten(screen.getByText("How to add requested evidence").props.style)
          .color
      ).toBe(palette.link);

      fireEvent.press(action);
      expect(onAddEvidence).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText(
          /Requested next evidence: Leaf underside; Stem close-up; No macro image/
        )
      ).toBeTruthy();
      expect(
        screen.getByText(
          /This guidance did not upload evidence, rerun the tool, or change the current result/
        )
      ).toBeTruthy();
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
    expect(screen.queryByLabelText("How to add requested evidence")).toBeNull();
  });

  it("clears guidance when the requested evidence changes after rerender", () => {
    const onAddEvidence = jest.fn();
    const screen = render(
      <EvidenceReviewPanel review={incompleteReview} onAddEvidence={onAddEvidence} />
    );

    fireEvent.press(screen.getByLabelText("How to add requested evidence"));
    expect(screen.getByText(/Requested next evidence: Leaf underside/)).toBeTruthy();

    screen.rerender(
      <EvidenceReviewPanel
        review={{
          ...incompleteReview,
          missingInformation: ["Whole-plant context"],
          requiredNextPhotos: ["Sharp stem-node photo"]
        }}
        onAddEvidence={onAddEvidence}
      />
    );

    expect(screen.queryByText(/Requested next evidence: Leaf underside/)).toBeNull();
    expect(screen.getByText(/Sharp stem-node photo/)).toBeTruthy();
    expect(screen.getByText(/Whole-plant context/)).toBeTruthy();
  });

  it("shows source-bound inspection views with view, save, and export actions", async () => {
    const inspectionView = {
      sourceEvidenceAssetId: "evidence-1",
      sourceImageIndex: 1,
      kind: "center",
      cropStrategy: "focus" as const,
      sourceBounds: null,
      width: 900,
      height: 900,
      mimeType: "image/jpeg" as const,
      sha256: "a".repeat(64),
      workspaceType: "personal" as const,
      workspaceId: "user-1"
    };
    mockLoadAiInspectionView.mockResolvedValue({
      ...inspectionView,
      dataUrl: "data:image/jpeg;base64,ZmFrZQ=="
    });
    const screen = render(
      <EvidenceReviewPanel
        review={{
          ...incompleteReview,
          performed: true,
          inspectionViews: [inspectionView]
        }}
      />
    );

    expect(screen.getByRole("header", { name: "AI inspection views" })).toBeTruthy();
    expect(screen.getByText(/not extra photos or independent evidence/i)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("View center from source photo 1"));
    expect(mockLoadAiInspectionView).toHaveBeenCalledWith(
      inspectionView,
      expect.objectContaining({ workspaceType: "personal", workspaceId: "user-1" })
    );
    expect(
      await screen.findByLabelText("Full-size center from source photo 1")
    ).toBeTruthy();
    expect(screen.getByTestId("ai-inspection-full-size-viewer")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Save full-size center from source photo 1"));
    await screen.findByText(
      "Inspection image saved or opened in the device share sheet."
    );
    expect(mockSaveAiInspectionImage).toHaveBeenCalledWith(
      expect.objectContaining({ dataUrl: expect.stringContaining("base64") })
    );
    fireEvent.press(screen.getByLabelText("Close full-size inspection view"));
    expect(screen.queryByTestId("ai-inspection-full-size-viewer")).toBeNull();

    fireEvent.press(screen.getByLabelText("Export all AI inspection views"));
    await screen.findByText("Inspection evidence package exported.");
    expect(mockExportAiInspectionEvidence).toHaveBeenCalledWith(
      "GrowPathAI inspection evidence",
      [expect.objectContaining({ dataUrl: expect.stringContaining("base64") })],
      expect.objectContaining({
        analysisId: undefined,
        reviewPolicyVersion: undefined
      })
    );
  });
});
