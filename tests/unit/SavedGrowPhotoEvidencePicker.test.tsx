import React, { useState } from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

import SavedGrowPhotoEvidencePicker, {
  createSavedGrowPhotoEvidenceStyles
} from "@/components/media/SavedGrowPhotoEvidencePicker";
import { getThemePalette } from "@/theme/appTheme";
import type { EvidenceAsset } from "@/types/evidence";

const mockListPersonalLogs = jest.fn();
const mockCreateEvidenceAsset = jest.fn();

jest.mock("@/api/logs", () => ({
  listPersonalLogs: (...args: any[]) => mockListPersonalLogs(...args)
}));

jest.mock("@/api/evidence", () => ({
  createEvidenceAsset: (...args: any[]) => mockCreateEvidenceAsset(...args)
}));

function Harness({ purpose = "ipm" }: { purpose?: "ipm" | "harvest" }) {
  const [assets, setAssets] = useState<EvidenceAsset[]>([]);
  return (
    <SavedGrowPhotoEvidencePicker
      growId="grow-1"
      plantId="plant-selected"
      purpose={purpose}
      value={assets}
      onChange={setAssets}
    />
  );
}

describe("SavedGrowPhotoEvidencePicker", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockListPersonalLogs.mockResolvedValue([
      {
        id: "log-1",
        growId: "grow-1",
        plantId: "plant-log",
        date: "2026-07-20T12:00:00.000Z",
        title: "Ready to chop",
        notes: "",
        photos: ["/uploads/ready.jpg"],
        createdAt: "2026-07-20T12:00:00.000Z",
        updatedAt: "2026-07-20T12:00:00.000Z"
      }
    ]);
    mockCreateEvidenceAsset.mockResolvedValue({
      id: "evidence-1",
      growId: "grow-1",
      plantId: "plant-log",
      logId: "log-1",
      assetType: "photo",
      originalUri: "/uploads/ready.jpg",
      durableUrl: "/uploads/ready.jpg",
      source: "upload",
      purpose: "ipm",
      uploadStatus: "uploaded",
      aiUsable: true,
      qualityWarnings: []
    });
  });

  it("uses the active Night palette for private-photo evidence surfaces", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createSavedGrowPhotoEvidenceStyles(palette);

    expect(styles.section.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.section.borderColor).toBe(palette.border);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.help.color).toBe(palette.textMuted);
    expect(styles.card.backgroundColor).toBe(palette.card);
    expect(styles.card.borderColor).toBe(palette.border);
    expect(styles.preview.backgroundColor).toBe(palette.surfaceStrong);
    expect(styles.photoTitle.color).toBe(palette.text);
    expect(styles.meta.color).toBe(palette.textMuted);
    expect(styles.status.color).toBe(palette.textMuted);
    expect(styles.button.backgroundColor).toBe(palette.accent);
    expect(styles.buttonText.color).toBe(palette.accentText);
  });

  it("requires an explicit selection and creates an IPM-purpose evidence link", async () => {
    const screen = render(<Harness />);

    await waitFor(() =>
      expect(screen.getByText("Source log: Ready to chop")).toBeTruthy()
    );
    expect(
      screen.getByRole("header", { name: "Use photos already in this grow" })
    ).toBeTruthy();
    const usePhoto = screen.getByLabelText(
      "Use saved photo Ready to chop, item 1 for IPM scout"
    );
    expect(usePhoto.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ minHeight: 44 })])
    );
    expect(mockCreateEvidenceAsset).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        /Selecting a photo explicitly includes it in this IPM scout request/
      )
    ).toBeTruthy();

    fireEvent.press(usePhoto);

    await waitFor(() =>
      expect(mockCreateEvidenceAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          plantId: "plant-log",
          logId: "log-1",
          originalUri: "/uploads/ready.jpg",
          purpose: "ipm"
        })
      )
    );
    expect(
      await screen.findByText("Added saved grow photo: Ready to chop.")
    ).toBeTruthy();
    expect(screen.getByText("Added")).toBeTruthy();
  });

  it("can explicitly attach a saved grow photo to harvest readiness", async () => {
    mockCreateEvidenceAsset.mockResolvedValue({
      id: "evidence-harvest-1",
      growId: "grow-1",
      plantId: "plant-log",
      logId: "log-1",
      assetType: "photo",
      originalUri: "/uploads/ready.jpg",
      durableUrl: "/uploads/ready.jpg",
      source: "upload",
      purpose: "harvest",
      uploadStatus: "uploaded",
      aiUsable: true,
      qualityWarnings: []
    });
    const screen = render(<Harness purpose="harvest" />);

    await waitFor(() =>
      expect(
        screen.getByText(
          /Selecting a photo explicitly includes it in this harvest readiness request/
        )
      ).toBeTruthy()
    );
    fireEvent.press(
      screen.getByLabelText("Use saved photo Ready to chop, item 1 for harvest readiness")
    );

    await waitFor(() =>
      expect(mockCreateEvidenceAsset).toHaveBeenCalledWith(
        expect.objectContaining({ purpose: "harvest", logId: "log-1" })
      )
    );
  });
});
