import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import { API_URL } from "@/api/apiRequest";

const mockPermission = jest.fn();
const mockPicker = jest.fn();
const mockUpload = jest.fn();
const mockCreate = jest.fn();

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images", Videos: "Videos" },
  requestMediaLibraryPermissionsAsync: (...args: any[]) => mockPermission(...args),
  launchImageLibraryAsync: (...args: any[]) => mockPicker(...args)
}));

jest.mock("@/api/uploads", () => ({
  uploadEvidenceMedia: (...args: any[]) => mockUpload(...args)
}));

jest.mock("@/api/evidence", () => ({
  createEvidenceAsset: (...args: any[]) => mockCreate(...args)
}));

describe("MediaEvidencePicker", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPermission.mockResolvedValue({ granted: true });
    mockUpload.mockResolvedValue({
      url: "/uploads/evidence.jpg",
      mimeType: "image/jpeg"
    });
    mockCreate.mockImplementation(async (input) => ({
      ...input,
      id: "saved-1",
      _id: "saved-1"
    }));
  });

  it("uploads selected photos, persists evidence, and exposes durable records", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///leaf-top.jpg",
          type: "image",
          mimeType: "image/jpeg",
          fileName: "leaf-top.jpg",
          width: 1200,
          height: 900
        }
      ]
    });
    const onChange = jest.fn();
    const screen = render(
      <MediaEvidencePicker
        aiUsable
        purpose="diagnosis"
        sourceContext={{ growId: "grow-1", plantId: "plant-1" }}
        onChange={onChange}
      />
    );

    fireEvent.press(screen.getByLabelText("Add evidence photos"));

    await waitFor(() =>
      expect(mockUpload).toHaveBeenCalledWith(
        expect.objectContaining({ uri: "file:///leaf-top.jpg" })
      )
    );
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          plantId: "plant-1",
          purpose: "diagnosis",
          durableUrl: "/uploads/evidence.jpg",
          uploadStatus: "uploaded",
          aiUsable: true
        })
      )
    );
    expect(
      screen.getByText(
        "Adding media approves AI use for this workflow only. It is not used for model training. Failed uploads are never sent to AI analysis."
      )
    ).toBeTruthy();
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: "saved-1", durableUrl: "/uploads/evidence.jpg" })
    ]);
  });

  it("does not approve ordinary record media for AI unless the surface opts in", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///label.jpg", type: "image", mimeType: "image/jpeg" }]
    });
    const screen = render(<MediaEvidencePicker purpose="product" />);

    fireEvent.press(screen.getByLabelText("Add evidence photos"));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ purpose: "product", aiUsable: false })
      )
    );
  });

  it("limits selection to remaining photo capacity", async () => {
    mockPicker.mockResolvedValue({ canceled: true, assets: [] });
    const existing = Array.from({ length: 9 }, (_, index) => ({
      id: `photo-${index}`,
      assetType: "photo" as const,
      originalUri: `file:///photo-${index}.jpg`,
      durableUrl: `/uploads/photo-${index}.jpg`,
      source: "library" as const,
      purpose: "diagnosis" as const,
      uploadStatus: "uploaded" as const,
      qualityWarnings: []
    }));
    const screen = render(
      <MediaEvidencePicker purpose="diagnosis" value={existing} maxPhotos={10} />
    );

    fireEvent.press(screen.getByLabelText("Add evidence photos"));

    await waitFor(() =>
      expect(mockPicker).toHaveBeenCalledWith(
        expect.objectContaining({ selectionLimit: 1, allowsMultipleSelection: true })
      )
    );
  });

  it("resolves backend-relative evidence URLs for preview", () => {
    const screen = render(
      <MediaEvidencePicker
        purpose="diagnosis"
        value={[
          {
            id: "existing-photo",
            assetType: "photo",
            originalUri: "/uploads/existing-photo.jpg",
            durableUrl: "/uploads/existing-photo.jpg",
            source: "upload",
            purpose: "diagnosis",
            uploadStatus: "uploaded",
            qualityWarnings: []
          }
        ]}
      />
    );

    expect(screen.getByLabelText("Evidence photo 1").props.source.uri).toBe(
      `${API_URL}/uploads/existing-photo.jpg`
    );
  });

  it("rejects a video longer than the configured limit without uploading", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///long.mov",
          type: "video",
          mimeType: "video/quicktime",
          duration: 45000
        }
      ]
    });
    const screen = render(
      <MediaEvidencePicker purpose="clone" allowVideo maxVideoSeconds={30} />
    );

    fireEvent.press(screen.getByLabelText("Add evidence video"));

    await waitFor(() =>
      expect(screen.getByText("Video must be 30 seconds or shorter.")).toBeTruthy()
    );
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("keeps failed uploads visible and removable", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///failed.jpg", type: "image" }]
    });
    mockUpload.mockRejectedValue(new Error("Upload failed"));
    const screen = render(<MediaEvidencePicker purpose="ipm" />);

    fireEvent.press(screen.getByLabelText("Add evidence photos"));
    await waitFor(() => expect(screen.getByText("Upload failed")).toBeTruthy());

    fireEvent.press(screen.getByText("Remove"));
    expect(screen.queryByText("Upload failed")).toBeNull();
  });
});
