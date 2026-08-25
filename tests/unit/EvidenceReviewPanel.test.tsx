import React from "react";
import { StyleSheet } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import EvidenceReviewPanel from "@/components/personal/EvidenceReviewPanel";
import type { EvidenceReview } from "@/features/personal/evidence/evidenceReview";
import { getThemePalette } from "@/theme/appTheme";
import { aiInspectionViewIdentityKey } from "@/types/evidence";

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
      derivationVersion: "retained-original-macro-jpeg-v1" as const,
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
      expect.objectContaining({ workspaceType: "personal", workspaceId: "user-1" }),
      expect.objectContaining({ signal: expect.anything() })
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

    fireEvent.press(screen.getByLabelText("View center from source photo 1"));
    expect(
      await screen.findByLabelText("Full-size center from source photo 1")
    ).toBeTruthy();
    screen.rerender(
      <EvidenceReviewPanel
        review={{
          ...incompleteReview,
          performed: true,
          analysisId: "different-review",
          inspectionViews: []
        }}
      />
    );
    expect(screen.queryByTestId("ai-inspection-full-size-viewer")).toBeNull();
  });

  it("lets the owner select exact inspected zooms for a private Feed draft", () => {
    const inspectionView = {
      sourceEvidenceAssetId: "evidence-1",
      sourceImageIndex: 1,
      kind: "center",
      cropStrategy: "focus" as const,
      derivationVersion: "retained-original-macro-jpeg-v1" as const,
      sourceBounds: null,
      width: 900,
      height: 900,
      mimeType: "image/jpeg" as const,
      sha256: "a".repeat(64)
    };
    const onChange = jest.fn();
    const screen = render(
      <EvidenceReviewPanel
        review={{
          ...incompleteReview,
          performed: true,
          inspectionViews: [inspectionView]
        }}
        feedDraftSelection={{
          selectedViewKeys: [],
          maxSelected: 8,
          onChange
        }}
      />
    );

    fireEvent.press(
      screen.getByLabelText(
        "Add center from source photo 1 to the private Feed review draft"
      )
    );
    expect(onChange).toHaveBeenCalledWith([aiInspectionViewIdentityKey(inspectionView)]);
  });

  it("keeps same-byte crops distinct by their full signed descriptor", () => {
    const base = {
      sourceEvidenceAssetId: "evidence-uniform",
      sourceImageIndex: 4,
      cropStrategy: "macro_coverage" as const,
      derivationVersion: "retained-original-macro-jpeg-v1" as const,
      width: 640,
      height: 640,
      mimeType: "image/jpeg" as const,
      sha256: "b".repeat(64)
    };
    const first = {
      ...base,
      kind: "macro coverage row 1 column 1",
      sourceBounds: {
        left: 0,
        top: 0,
        width: 640,
        height: 640,
        sourceWidth: 1280,
        sourceHeight: 1280
      }
    };
    const second = {
      ...base,
      kind: "macro coverage row 1 column 2",
      sourceBounds: {
        ...first.sourceBounds,
        left: 640
      }
    };
    const onChange = jest.fn();
    const screen = render(
      <EvidenceReviewPanel
        review={{
          ...incompleteReview,
          performed: true,
          inspectionViews: [first, second]
        }}
        feedDraftSelection={{ selectedViewKeys: [], maxSelected: 8, onChange }}
      />
    );

    expect(aiInspectionViewIdentityKey(first)).not.toBe(
      aiInspectionViewIdentityKey(second)
    );
    fireEvent.press(
      screen.getByLabelText(
        "Add macro coverage row 1 column 2 from source photo 4 to the private Feed review draft"
      )
    );
    expect(onChange).toHaveBeenCalledWith([aiInspectionViewIdentityKey(second)]);
  });

  it("uses the active facility workspace instead of descriptor defaults", async () => {
    const inspectionView = {
      sourceEvidenceAssetId: "facility-evidence",
      sourceImageIndex: 1,
      kind: "macro coverage row 1 column 1",
      cropStrategy: "macro_coverage" as const,
      derivationVersion: "retained-original-macro-jpeg-v1" as const,
      sourceBounds: {
        left: 0,
        top: 0,
        width: 640,
        height: 640,
        sourceWidth: 1280,
        sourceHeight: 1920
      },
      width: 640,
      height: 640,
      mimeType: "image/jpeg" as const,
      sha256: "c".repeat(64),
      workspaceType: "personal" as const,
      workspaceId: "stale-personal"
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
        inspectionWorkspace={{
          workspaceType: "facility",
          workspaceId: "facility-1",
          facilityId: "facility-1"
        }}
      />
    );

    fireEvent.press(
      screen.getByLabelText("View macro coverage row 1 column 1 from source photo 1")
    );
    expect(mockLoadAiInspectionView).toHaveBeenCalledWith(
      inspectionView,
      {
        workspaceType: "facility",
        workspaceId: "facility-1",
        facilityId: "facility-1"
      },
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(
      await screen.findByLabelText(
        "Full-size macro coverage row 1 column 1 from source photo 1"
      )
    ).toBeTruthy();
  });

  it("ignores a delayed zoom response after the signed review changes", async () => {
    let resolveFirst: ((value: any) => void) | undefined;
    const firstResponse = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const first = {
      sourceEvidenceAssetId: "evidence-a",
      sourceImageIndex: 13,
      kind: "review A crop",
      cropStrategy: "macro_coverage" as const,
      derivationVersion: "retained-original-macro-jpeg-v1" as const,
      sourceBounds: null,
      width: 640,
      height: 640,
      mimeType: "image/jpeg" as const,
      sha256: "d".repeat(64)
    };
    const second = {
      ...first,
      sourceEvidenceAssetId: "evidence-b",
      sourceImageIndex: 2,
      kind: "review B crop",
      sha256: "e".repeat(64)
    };
    mockLoadAiInspectionView.mockReturnValueOnce(firstResponse);
    const screen = render(
      <EvidenceReviewPanel
        review={{
          ...incompleteReview,
          performed: true,
          analysisId: "analysis-a",
          inspectionViews: [first]
        }}
        inspectionWorkspace={{ workspaceType: "personal" }}
      />
    );

    fireEvent.press(screen.getByLabelText("View review A crop from source photo 13"));
    const firstSignal = mockLoadAiInspectionView.mock.calls[0][2].signal;
    screen.rerender(
      <EvidenceReviewPanel
        review={{
          ...incompleteReview,
          performed: true,
          analysisId: "analysis-b",
          inspectionViews: [second]
        }}
        inspectionWorkspace={{ workspaceType: "personal" }}
      />
    );
    await waitFor(() => expect(firstSignal.aborted).toBe(true));
    await act(async () => {
      resolveFirst?.({ ...first, dataUrl: "data:image/jpeg;base64,ZmFrZQ==" });
      await firstResponse;
    });

    expect(
      screen.queryByLabelText("Full-size review A crop from source photo 13")
    ).toBeNull();
    expect(screen.getByText("Photo 2: review B crop")).toBeTruthy();
    expect(screen.queryByText(/Opened the exact review A crop/i)).toBeNull();
    expect(mockExportAiInspectionEvidence).not.toHaveBeenCalled();
  });

  it("keeps the latest View open when an earlier zoom rejects after cancellation", async () => {
    let rejectFirst: ((reason: any) => void) | undefined;
    const firstResponse = new Promise((_resolve, reject) => {
      rejectFirst = reject;
    });
    const first = {
      sourceEvidenceAssetId: "evidence-first",
      sourceImageIndex: 1,
      kind: "first crop",
      cropStrategy: "macro_coverage" as const,
      derivationVersion: "retained-original-macro-jpeg-v1" as const,
      sourceBounds: null,
      width: 640,
      height: 640,
      mimeType: "image/jpeg" as const,
      sha256: "1".repeat(64)
    };
    const second = {
      ...first,
      sourceEvidenceAssetId: "evidence-second",
      sourceImageIndex: 2,
      kind: "second crop",
      sha256: "2".repeat(64)
    };
    mockLoadAiInspectionView.mockReturnValueOnce(firstResponse).mockResolvedValueOnce({
      ...second,
      dataUrl: "data:image/jpeg;base64,c2Vjb25k"
    });
    const screen = render(
      <EvidenceReviewPanel
        review={{
          ...incompleteReview,
          performed: true,
          analysisId: "one-review-two-opens",
          inspectionViews: [first, second]
        }}
        inspectionWorkspace={{ workspaceType: "personal" }}
      />
    );

    fireEvent.press(screen.getByLabelText("View first crop from source photo 1"));
    const firstSignal = mockLoadAiInspectionView.mock.calls[0][2].signal;
    fireEvent.press(screen.getByLabelText("View second crop from source photo 2"));

    await waitFor(() => expect(firstSignal.aborted).toBe(true));
    expect(
      await screen.findByLabelText("Full-size second crop from source photo 2")
    ).toBeTruthy();
    await act(async () => {
      rejectFirst?.(Object.assign(new Error("cancelled"), { code: "ABORTED" }));
      await firstResponse.catch(() => undefined);
    });

    expect(
      screen.getByLabelText("Full-size second crop from source photo 2")
    ).toBeTruthy();
    expect(
      screen.queryByLabelText("Full-size first crop from source photo 1")
    ).toBeNull();
    expect(screen.queryByText("cancelled")).toBeNull();
  });
});
