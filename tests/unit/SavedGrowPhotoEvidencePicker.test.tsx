import React, { useState } from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

import SavedGrowPhotoEvidencePicker from "@/components/media/SavedGrowPhotoEvidencePicker";
import type { EvidenceAsset } from "@/types/evidence";

const mockListPersonalLogs = jest.fn();
const mockCreateEvidenceAsset = jest.fn();

jest.mock("@/api/logs", () => ({
  listPersonalLogs: (...args: any[]) => mockListPersonalLogs(...args)
}));

jest.mock("@/api/evidence", () => ({
  createEvidenceAsset: (...args: any[]) => mockCreateEvidenceAsset(...args)
}));

function Harness() {
  const [assets, setAssets] = useState<EvidenceAsset[]>([]);
  return (
    <SavedGrowPhotoEvidencePicker
      growId="grow-1"
      plantId="plant-selected"
      purpose="ipm"
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

  it("requires an explicit selection and creates an IPM-purpose evidence link", async () => {
    const screen = render(<Harness />);

    await waitFor(() =>
      expect(screen.getByText("Source log: Ready to chop")).toBeTruthy()
    );
    expect(mockCreateEvidenceAsset).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        /Selecting a photo explicitly includes it in this IPM scout request/
      )
    ).toBeTruthy();

    fireEvent.press(
      screen.getByLabelText("Use saved photo Ready to chop, item 1 for IPM scout")
    );

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
});
