import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import { API_URL } from "@/api/apiRequest";

const mockPermission = jest.fn();
const mockPicker = jest.fn();
const mockUpload = jest.fn();
const mockAbortEvidence = jest.fn();
const mockGetEvidencePlayback = jest.fn();
const mockUploadVideo = jest.fn();
const mockAbortVideo = jest.fn();
const mockCreate = jest.fn();
const mockDeleteEvidence = jest.fn();
const mockExtractVideoFrames = jest.fn();

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images", Videos: "Videos" },
  requestMediaLibraryPermissionsAsync: (...args: any[]) => mockPermission(...args),
  launchImageLibraryAsync: (...args: any[]) => mockPicker(...args)
}));

jest.mock("@/api/uploads", () => ({
  uploadEvidenceMedia: (...args: any[]) => mockUpload(...args),
  abortEvidenceUpload: (...args: any[]) => mockAbortEvidence(...args),
  getEvidenceUploadPlayback: (...args: any[]) => mockGetEvidencePlayback(...args)
}));

jest.mock("@/api/evidence", () => ({
  createEvidenceAsset: (...args: any[]) => mockCreate(...args),
  deleteEvidenceAsset: (...args: any[]) => mockDeleteEvidence(...args),
  isTerminalEvidenceRegistrationError: (error: any) =>
    [400, 413, 415, 422].includes(Number(error?.status || error?.statusCode || 0))
}));

jest.mock("@/api/videos", () => ({
  uploadVideoFile: (...args: any[]) => mockUploadVideo(...args),
  abortVideoUpload: (...args: any[]) => mockAbortVideo(...args)
}));

jest.mock("@/features/personal/harvest/videoFrameExtraction", () => ({
  extractVideoFrameCandidates: (...args: any[]) => mockExtractVideoFrames(...args)
}));

describe("MediaEvidencePicker", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPermission.mockResolvedValue({ granted: true });
    mockUpload.mockResolvedValue({
      assetId: "photo-upload-1",
      url: "/uploads/evidence.jpg",
      mimeType: "image/jpeg"
    });
    mockAbortEvidence.mockResolvedValue({ success: true });
    mockGetEvidencePlayback.mockResolvedValue({
      playbackUrl: "https://r2.example/protected-photo",
      expiresInSeconds: 3600
    });
    mockUploadVideo.mockResolvedValue({
      assetId: "video-asset-1",
      url: "/api/videos/assets/video-asset-1/stream",
      mimeType: "video/quicktime",
      bytes: 2048
    });
    mockAbortVideo.mockResolvedValue({ success: true });
    mockCreate.mockImplementation(async (input) => ({
      ...input,
      id: "saved-1",
      _id: "saved-1"
    }));
    mockDeleteEvidence.mockResolvedValue({ deleted: true });
  });

  it("can expose its title as an explicit workflow heading", () => {
    const screen = render(
      <MediaEvidencePicker purpose="diagnosis" titleHeadingLevel={2} />
    );

    expect(screen.getByText("Photos and video evidence")).toMatchObject({
      props: expect.objectContaining({
        accessibilityRole: "header",
        "aria-level": 2
      })
    });
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
          height: 900,
          exif: {
            GPSLatitude: 39.1023,
            GPSLongitude: 77.0123,
            GPSLongitudeRef: "W",
            DateTimeOriginal: "2026:08:20 14:15:16"
          }
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

    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1));
    const uploadInput = mockUpload.mock.calls[0][0];
    expect(uploadInput).toEqual(
      expect.objectContaining({
        assetType: "photo",
        clientUploadKey: expect.stringMatching(/^evidence_/),
        uri: "file:///leaf-top.jpg",
        workspaceType: "personal",
        signal: expect.anything(),
        onProgress: expect.any(Function)
      })
    );
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          clientUploadKey: uploadInput.clientUploadKey,
          growId: "grow-1",
          plantId: "plant-1",
          workspaceType: "personal",
          purpose: "diagnosis",
          durableUrl: "/uploads/evidence.jpg",
          uploadStatus: "uploaded",
          aiUsable: true,
          sourceCaptureMetadata: {
            latitude: 39.1023,
            longitude: -77.0123,
            capturedLocalDate: "2026-08-20",
            captureDatePrecision: "date",
            source: "picker_exif"
          }
        }),
        expect.objectContaining({ signal: expect.anything() })
      )
    );
    const personalRegistrationInput = mockCreate.mock.calls[0][0];
    expect(mockPicker).toHaveBeenCalledWith(expect.objectContaining({ exif: true }));
    expect(personalRegistrationInput).not.toHaveProperty("workspaceId");
    expect(personalRegistrationInput).not.toHaveProperty("facilityId");
    expect(
      screen.getByText(
        "Adding media approves AI use for this workflow only. It is not used for model training. Failed uploads are never sent to AI analysis."
      )
    ).toBeTruthy();
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        _id: "saved-1",
        originalUri: "/uploads/evidence.jpg",
        durableUrl: "/uploads/evidence.jpg"
      })
    ]);
  });

  it("registers Commercial evidence in the same explicit workspace as its upload", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///commercial-leaf.jpg",
          type: "image",
          mimeType: "image/jpeg",
          fileName: "commercial-leaf.jpg",
          width: 1200,
          height: 900
        }
      ]
    });
    const screen = render(
      <MediaEvidencePicker
        purpose="diagnosis"
        videoWorkspaceType="commercial"
        videoWorkspaceId="commercial-account-1"
      />
    );

    fireEvent.press(screen.getByLabelText("Add evidence photos"));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockUpload.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        workspaceType: "commercial",
        workspaceId: "commercial-account-1"
      })
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceType: "commercial",
        workspaceId: "commercial-account-1",
        assetType: "photo",
        durableUrl: "/uploads/evidence.jpg"
      }),
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty("facilityId");
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
        expect.objectContaining({ purpose: "product", aiUsable: false }),
        expect.objectContaining({ signal: expect.anything() })
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

  it("refreshes protected photo playback before the signed URL expires", async () => {
    jest.useFakeTimers();
    const screen = render(
      <MediaEvidencePicker
        purpose="diagnosis"
        value={[
          {
            id: "protected-photo",
            assetType: "photo",
            originalUri: "/api/evidence-assets/uploads/protected-asset/object",
            durableUrl: "/api/evidence-assets/uploads/protected-asset/object",
            source: "upload",
            purpose: "diagnosis",
            uploadStatus: "uploaded",
            qualityWarnings: []
          }
        ]}
      />
    );

    await waitFor(() => expect(mockGetEvidencePlayback).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByLabelText("Evidence photo 1").props.source.uri).toBe(
        "https://r2.example/protected-photo"
      )
    );

    await act(async () => {
      jest.advanceTimersByTime(59 * 60 * 1000);
      await Promise.resolve();
    });
    await waitFor(() => expect(mockGetEvidencePlayback).toHaveBeenCalledTimes(2));
    screen.unmount();
    jest.useRealTimers();
  });

  it("removes a saved EvidenceAsset through the record endpoint", async () => {
    function Harness() {
      const [value, setValue] = React.useState<any[]>([
        {
          id: "local-saved-photo",
          _id: "evidence-record-1",
          assetType: "photo",
          originalUri: "/uploads/protected-asset.jpg",
          durableUrl: "/uploads/protected-asset.jpg",
          source: "upload",
          purpose: "diagnosis",
          uploadStatus: "uploaded",
          qualityWarnings: []
        }
      ]);
      return (
        <MediaEvidencePicker purpose="diagnosis" value={value} onChange={setValue} />
      );
    }
    const screen = render(<Harness />);

    fireEvent.press(screen.getByLabelText("Remove evidence local-saved-photo"));

    expect(screen.queryByLabelText("Evidence photo 1")).toBeNull();
    await waitFor(() =>
      expect(mockDeleteEvidence).toHaveBeenCalledWith(
        "evidence-record-1",
        { workspaceType: "personal" },
        { timeoutMs: 5000 }
      )
    );
    expect(mockAbortEvidence).not.toHaveBeenCalled();
  });

  it("restores saved evidence when record deletion cannot reach the server", async () => {
    mockDeleteEvidence.mockRejectedValueOnce(new Error("Unable to reach server"));
    function Harness() {
      const [value, setValue] = React.useState<any[]>([
        {
          id: "restore-photo",
          _id: "evidence-record-restore",
          assetType: "photo",
          originalUri: "/uploads/restore-photo.jpg",
          durableUrl: "/uploads/restore-photo.jpg",
          source: "upload",
          purpose: "other",
          uploadStatus: "uploaded",
          qualityWarnings: []
        }
      ]);
      return <MediaEvidencePicker purpose="other" value={value} onChange={setValue} />;
    }
    const screen = render(<Harness />);

    fireEvent.press(screen.getByLabelText("Remove evidence restore-photo"));

    expect(
      await screen.findByText(
        "GrowPath could not remove this saved evidence. It has been restored; check your connection and try again."
      )
    ).toBeTruthy();
    expect(screen.getByLabelText("Evidence photo 1")).toBeTruthy();
  });

  it("removes a source video and every extracted child frame from the active review", async () => {
    function Harness() {
      const [value, setValue] = React.useState<any[]>([
        {
          id: "source-video-local",
          _id: "source-video-record",
          assetType: "video",
          originalUri: "/api/videos/assets/source-video/stream",
          durableUrl: "/api/videos/assets/source-video/stream",
          source: "upload",
          purpose: "crop_identification",
          uploadStatus: "uploaded",
          qualityWarnings: []
        },
        {
          id: "generated-frame-one",
          _id: "generated-frame-record-one",
          sourceVideoEvidenceAssetId: "source-video-record",
          assetType: "photo",
          originalUri: "/uploads/generated-frame-one.jpg",
          durableUrl: "/uploads/generated-frame-one.jpg",
          source: "generated",
          purpose: "crop_identification",
          uploadStatus: "uploaded",
          qualityWarnings: []
        },
        {
          id: "generated-frame-two",
          _id: "generated-frame-record-two",
          sourceVideoEvidenceAssetId: "source-video-record",
          assetType: "photo",
          originalUri: "/uploads/generated-frame-two.jpg",
          durableUrl: "/uploads/generated-frame-two.jpg",
          source: "generated",
          purpose: "crop_identification",
          uploadStatus: "uploaded",
          qualityWarnings: []
        },
        {
          id: "unrelated-photo",
          _id: "unrelated-photo-record",
          assetType: "photo",
          originalUri: "/uploads/unrelated.jpg",
          durableUrl: "/uploads/unrelated.jpg",
          source: "upload",
          purpose: "crop_identification",
          uploadStatus: "uploaded",
          qualityWarnings: []
        }
      ]);
      return (
        <MediaEvidencePicker
          allowVideo
          purpose="crop_identification"
          value={value}
          onChange={setValue}
        />
      );
    }
    const screen = render(<Harness />);

    fireEvent.press(screen.getByLabelText("Remove evidence source-video-local"));

    expect(screen.queryByLabelText("Remove evidence source-video-local")).toBeNull();
    expect(screen.queryByLabelText("Remove evidence generated-frame-one")).toBeNull();
    expect(screen.queryByLabelText("Remove evidence generated-frame-two")).toBeNull();
    expect(screen.getByLabelText("Remove evidence unrelated-photo")).toBeTruthy();
    await waitFor(() => expect(mockDeleteEvidence).toHaveBeenCalledTimes(3));
    expect(mockDeleteEvidence).toHaveBeenCalledWith(
      "source-video-record",
      { workspaceType: "personal" },
      { timeoutMs: 5000 }
    );
    expect(mockDeleteEvidence).toHaveBeenCalledWith(
      "generated-frame-record-one",
      { workspaceType: "personal" },
      { timeoutMs: 5000 }
    );
    expect(mockDeleteEvidence).toHaveBeenCalledWith(
      "generated-frame-record-two",
      { workspaceType: "personal" },
      { timeoutMs: 5000 }
    );
  });

  it("only deselects recovered Saved Run photos and videos without deleting them", () => {
    function Harness() {
      const [value, setValue] = React.useState<any[]>([
        {
          id: "recovered-photo-local",
          _id: "recovered-photo-record",
          assetType: "photo",
          originalUri: "/uploads/recovered-photo.jpg",
          durableUrl: "/uploads/recovered-photo.jpg",
          source: "upload",
          purpose: "crop_identification",
          uploadStatus: "uploaded",
          qualityWarnings: []
        },
        {
          id: "recovered-video-local",
          _id: "recovered-video-record",
          assetType: "video",
          originalUri: "/api/videos/assets/recovered-video/stream",
          durableUrl: "/api/videos/assets/recovered-video/stream",
          source: "upload",
          purpose: "crop_identification",
          uploadStatus: "uploaded",
          qualityWarnings: []
        },
        {
          id: "recovered-frame-local",
          _id: "recovered-frame-record",
          sourceVideoEvidenceAssetId: "recovered-video-record",
          assetType: "photo",
          originalUri: "/uploads/recovered-frame.jpg",
          durableUrl: "/uploads/recovered-frame.jpg",
          source: "generated",
          purpose: "crop_identification",
          uploadStatus: "uploaded",
          qualityWarnings: []
        }
      ]);
      return (
        <MediaEvidencePicker
          allowVideo
          purpose="crop_identification"
          value={value}
          onChange={setValue}
          retainOnRemoveAssetIds={[
            "recovered-photo-record",
            "recovered-video-record",
            "recovered-frame-record"
          ]}
        />
      );
    }
    const screen = render(<Harness />);

    fireEvent.press(screen.getByLabelText("Remove evidence recovered-photo-local"));
    fireEvent.press(screen.getByLabelText("Remove evidence recovered-video-local"));

    expect(screen.queryByLabelText("Remove evidence recovered-photo-local")).toBeNull();
    expect(screen.queryByLabelText("Remove evidence recovered-video-local")).toBeNull();
    expect(screen.queryByLabelText("Remove evidence recovered-frame-local")).toBeNull();
    expect(mockDeleteEvidence).not.toHaveBeenCalled();
    expect(mockAbortEvidence).not.toHaveBeenCalled();
    expect(mockAbortVideo).not.toHaveBeenCalled();
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

  it("keeps a Facility source video and generated frames in the same explicit workspace", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///macro-scan.mov",
          type: "video",
          mimeType: "video/quicktime",
          fileName: "macro-scan.mov",
          duration: 12000
        }
      ]
    });
    mockExtractVideoFrames.mockResolvedValue([
      {
        uri: "file:///frame-1.jpg",
        fileName: "frame-1.jpg",
        mimeType: "image/jpeg",
        width: 1600,
        height: 1200,
        timeSeconds: 2
      },
      {
        uri: "file:///frame-2.jpg",
        fileName: "frame-2.jpg",
        mimeType: "image/jpeg",
        width: 1600,
        height: 1200,
        timeSeconds: 8
      }
    ]);
    mockUpload
      .mockResolvedValueOnce({
        url: "/uploads/frame-1.jpg",
        mimeType: "image/jpeg"
      })
      .mockResolvedValueOnce({
        url: "/uploads/frame-2.jpg",
        mimeType: "image/jpeg"
      });
    mockCreate.mockImplementation(async (input) => ({
      ...input,
      id: `saved-${input.fileName}`,
      _id: `saved-${input.fileName}`
    }));
    const screen = render(
      <MediaEvidencePicker
        aiUsable
        allowVideo
        extractFramesFromVideo
        maxPhotos={12}
        maxExtractedVideoFrames={12}
        maxVideoSeconds={599}
        purpose="harvest"
        videoWorkspaceType="facility"
        videoWorkspaceId="facility-42"
      />
    );

    fireEvent.press(screen.getByLabelText("Add evidence video"));

    await waitFor(() =>
      expect(mockExtractVideoFrames).toHaveBeenCalledWith({
        uri: "file:///macro-scan.mov",
        durationSeconds: 12,
        maxFrames: 12
      })
    );
    await waitFor(() =>
      expect(screen.getByText(/2 still frames extracted/i)).toBeTruthy()
    );
    expect(mockUploadVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: "file:///macro-scan.mov",
        fileName: "macro-scan.mov",
        mimeType: "video/quicktime"
      }),
      {
        workspaceType: "facility",
        workspaceId: "facility-42",
        facilityId: "facility-42"
      },
      expect.any(Function),
      expect.objectContaining({
        signal: expect.anything(),
        clientUploadKey: expect.stringMatching(/^evidence_/),
        onReservation: expect.any(Function)
      })
    );
    expect(mockUpload).toHaveBeenCalledTimes(2);
    for (const [frameUploadInput] of mockUpload.mock.calls) {
      expect(frameUploadInput).toEqual(
        expect.objectContaining({
          workspaceType: "facility",
          workspaceId: "facility-42",
          facilityId: "facility-42"
        })
      );
    }
    expect(mockCreate).toHaveBeenCalledTimes(3);
    for (const [registrationInput] of mockCreate.mock.calls) {
      expect(registrationInput).toEqual(
        expect.objectContaining({
          workspaceType: "facility",
          workspaceId: "facility-42",
          facilityId: "facility-42"
        })
      );
    }
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        assetType: "video",
        aiUsable: false,
        durableUrl: "/api/videos/assets/video-asset-1/stream"
      }),
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        assetType: "photo",
        source: "generated",
        aiUsable: true,
        sourceVideoEvidenceAssetId: "saved-macro-scan.mov",
        originalUri: "/uploads/frame-1.jpg",
        durableUrl: "/uploads/frame-1.jpg",
        qualityWarnings: expect.arrayContaining([
          "Extracted from the source video at 2.0 seconds. Confirm the diagnostic plant structure, focus, color, and glare before analysis."
        ])
      }),
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(
      screen.getByText(
        "A video is kept as private evidence. GrowPath samples up to 12 timestamped still frames across the video. Each sampled frame is uploaded for image review; AI then evaluates focus, lighting, glare, and diagnostic detail and can exclude unusable frames. It does not guess from motion or rebuild detail hidden by blur or glare."
      )
    ).toBeTruthy();
    expect(screen.getByText(/does not guess from motion/i)).toBeTruthy();
  });

  it("saves a Plant ID source video without client thumbnail extraction or frame uploads", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///plant-id-source.mov",
          type: "video",
          mimeType: "video/quicktime",
          fileName: "plant-id-source.mov",
          duration: 14000
        }
      ]
    });
    const onChange = jest.fn();
    const screen = render(
      <MediaEvidencePicker
        aiUsable
        allowVideo
        serverFrameExtractionOnly
        maxPhotos={12}
        maxVideoSeconds={599}
        purpose="crop_identification"
        onChange={onChange}
      />
    );

    fireEvent.press(screen.getByLabelText("Add evidence video"));

    expect(
      await screen.findByText(/Private source video uploaded.*durable server job/i)
    ).toBeTruthy();
    expect(mockUploadVideo).toHaveBeenCalledTimes(1);
    expect(mockExtractVideoFrames).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        assetType: "video",
        purpose: "crop_identification",
        aiUsable: false
      }),
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        assetType: "video",
        aiUsable: false,
        purpose: "crop_identification"
      })
    ]);
    expect(
      screen.getByText(/This device does not create or upload local still frames/i)
    ).toBeTruthy();
    expect(screen.queryByText(/still frames extracted and uploaded/i)).toBeNull();
  });

  it("reports only successfully uploaded extracted frames and discloses partial failure", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///night-scan.mov",
          type: "video",
          mimeType: "video/quicktime",
          fileName: "night-scan.mov",
          duration: 12000
        }
      ]
    });
    mockExtractVideoFrames.mockResolvedValue([
      {
        uri: "file:///night-frame-1.jpg",
        fileName: "night-frame-1.jpg",
        mimeType: "image/jpeg",
        width: 1600,
        height: 1200,
        timeSeconds: 2
      },
      {
        uri: "file:///night-frame-2.jpg",
        fileName: "night-frame-2.jpg",
        mimeType: "image/jpeg",
        width: 1600,
        height: 1200,
        timeSeconds: 8
      }
    ]);
    mockUpload
      .mockRejectedValueOnce(new Error("Frame upload failed"))
      .mockResolvedValueOnce({
        url: "/uploads/night-frame-2.jpg",
        mimeType: "image/jpeg"
      });
    mockCreate.mockImplementation(async (input) => ({
      ...input,
      id: `saved-${input.fileName}`,
      _id: `saved-${input.fileName}`
    }));
    const screen = render(
      <MediaEvidencePicker
        aiUsable
        allowVideo
        extractFramesFromVideo
        maxPhotos={12}
        maxExtractedVideoFrames={12}
        maxVideoSeconds={599}
        purpose="ipm"
      />
    );

    fireEvent.press(screen.getByLabelText("Add evidence video"));

    expect(
      await screen.findByText(
        "1 of 2 extracted still frames uploaded for image review. 1 frame failed; tap Retry on each failed frame or add sharp photos instead."
      )
    ).toBeTruthy();
    expect(screen.getByText("Frame upload failed")).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  it("does not resume frame uploads or onChange after unmount", async () => {
    let finishFrames: ((frames: any[]) => void) | undefined;
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///field-walk.mov",
          type: "video",
          mimeType: "video/quicktime",
          fileName: "field-walk.mov",
          duration: 12000
        }
      ]
    });
    mockExtractVideoFrames.mockReturnValue(
      new Promise((resolve) => {
        finishFrames = resolve;
      })
    );
    const onChange = jest.fn();
    const screen = render(
      <MediaEvidencePicker
        aiUsable
        allowVideo
        extractFramesFromVideo
        maxPhotos={12}
        purpose="other"
        onChange={onChange}
      />
    );

    fireEvent.press(screen.getByLabelText("Add evidence video"));
    await waitFor(() => expect(mockExtractVideoFrames).toHaveBeenCalledTimes(1));
    const changesBeforeUnmount = onChange.mock.calls.length;
    screen.unmount();

    await act(async () => {
      finishFrames?.([
        {
          uri: "file:///late-frame.jpg",
          fileName: "late-frame.jpg",
          mimeType: "image/jpeg",
          width: 1600,
          height: 1200,
          timeSeconds: 4
        }
      ]);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockUpload).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(changesBeforeUnmount);
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

  it("turns a lost mobile connection into an actionable retry", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///roadside-flower.jpg", type: "image" }]
    });
    mockUpload.mockRejectedValueOnce(
      Object.assign(new Error("Unable to reach the server."), {
        code: "NETWORK_ERROR"
      })
    );
    const screen = render(<MediaEvidencePicker purpose="other" />);

    fireEvent.press(screen.getByLabelText("Add evidence photos"));

    expect(
      await screen.findByText(
        "The photo upload lost its connection. Check Wi-Fi or cellular signal, then tap Retry."
      )
    ).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  it("ends a photo upload that stops making progress and offers Retry", async () => {
    jest.useFakeTimers();
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///stalled-flower.jpg", type: "image" }]
    });
    mockUpload.mockImplementation(
      (input) =>
        new Promise((_resolve, reject) => {
          input.signal.addEventListener(
            "abort",
            () => reject(Object.assign(new Error("aborted"), { code: "ABORTED" })),
            { once: true }
          );
        })
    );
    const screen = render(<MediaEvidencePicker purpose="other" />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Add evidence photos"));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockUpload).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(75 * 1000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(
      screen.getByText(
        "The photo upload took too long on this connection. Try Wi-Fi or a stronger signal, then tap Retry."
      )
    ).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
    screen.unmount();
    jest.useRealTimers();
  });

  it("ends a video upload that stops making progress and offers Retry", async () => {
    jest.useFakeTimers();
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///stalled-walk.mov",
          type: "video",
          mimeType: "video/quicktime",
          duration: 14000
        }
      ]
    });
    mockUploadVideo.mockImplementation(
      (_file, _workspace, _onProgress, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener(
            "abort",
            () => reject(Object.assign(new Error("aborted"), { code: "ABORTED" })),
            { once: true }
          );
        })
    );
    const screen = render(
      <MediaEvidencePicker purpose="other" allowVideo maxVideoSeconds={30} />
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Add evidence video"));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockUploadVideo).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(90 * 1000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(
      screen.getByText(
        "The video upload took too long on this connection. Try Wi-Fi or a stronger signal, then tap Retry."
      )
    ).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
    screen.unmount();
    jest.useRealTimers();
  });

  it("explains what to do when a prepared phone photo still exceeds the server limit", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///full-resolution.heic", type: "image" }]
    });
    mockUpload.mockRejectedValueOnce(
      Object.assign(new Error("File too large"), {
        code: "UPLOAD_TOO_LARGE",
        status: 413
      })
    );
    const screen = render(<MediaEvidencePicker purpose="other" />);

    fireEvent.press(screen.getByLabelText("Add evidence photos"));

    expect(
      await screen.findByText(
        "This photo is still too large after GrowPath prepared it. Crop it or choose the phone's Medium or Large photo size, then retry."
      )
    ).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  it("retries evidence registration without uploading the binary twice", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///rose.jpg",
          type: "image",
          mimeType: "image/jpeg",
          fileName: "rose.jpg"
        }
      ]
    });
    mockCreate
      .mockRejectedValueOnce(new Error("Unable to save evidence record"))
      .mockImplementationOnce(async (input) => ({
        ...input,
        id: "saved-rose",
        _id: "saved-rose"
      }));
    const onChange = jest.fn();
    const screen = render(<MediaEvidencePicker purpose="other" onChange={onChange} />);

    fireEvent.press(screen.getByLabelText("Add evidence photos"));
    expect(
      await screen.findByText(
        "The file uploaded, but GrowPath could not finish saving it. Tap Retry; the file will not upload again."
      )
    ).toBeTruthy();

    fireEvent.press(screen.getByText("Retry"));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(2));
    expect(mockUpload).toHaveBeenCalledTimes(1);
    const clientUploadKey = mockUpload.mock.calls[0][0].clientUploadKey;
    expect(clientUploadKey).toMatch(/^evidence_/);
    expect(mockCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ clientUploadKey }),
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(mockCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ clientUploadKey }),
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        _id: "saved-rose",
        originalUri: "/uploads/evidence.jpg",
        durableUrl: "/uploads/evidence.jpg",
        uploadStatus: "uploaded"
      })
    ]);
  });

  it("shows protected photo upload progress", async () => {
    let finishUpload: ((value: any) => void) | undefined;
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///protected-photo.jpg",
          type: "image",
          mimeType: "image/jpeg",
          fileName: "protected-photo.jpg"
        }
      ]
    });
    mockUpload.mockImplementation((input) => {
      input.onProgress(0.37);
      return new Promise((resolve) => {
        finishUpload = resolve;
      });
    });
    const screen = render(<MediaEvidencePicker purpose="other" />);

    fireEvent.press(screen.getByLabelText("Add evidence photos"));

    expect(await screen.findByText("Uploading 37%")).toBeTruthy();
    expect(mockUpload.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        assetType: "photo",
        clientUploadKey: expect.stringMatching(/^evidence_/),
        workspaceType: "personal"
      })
    );

    await act(async () => {
      finishUpload?.({
        assetId: "protected-photo-1",
        url: "/api/evidence-assets/protected-photo-1/content",
        mimeType: "image/jpeg",
        bytes: 2048
      });
    });
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  });

  it("does not raw-delete an object while evidence registration is ambiguous", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///remove-protected.jpg",
          type: "image",
          mimeType: "image/jpeg"
        }
      ]
    });
    mockUpload.mockResolvedValueOnce({
      assetId: "protected-photo-remove",
      url: "/api/evidence-assets/protected-photo-remove/content",
      mimeType: "image/jpeg"
    });
    mockCreate
      .mockImplementationOnce(
        (_input, options) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener(
              "abort",
              () => reject(Object.assign(new Error("canceled"), { code: "ABORTED" })),
              { once: true }
            );
          })
      )
      .mockResolvedValueOnce({
        id: "reconciled-record",
        _id: "reconciled-record",
        durableUrl: "/api/evidence-assets/uploads/protected-photo-remove/object"
      });
    const screen = render(<MediaEvidencePicker purpose="other" />);

    fireEvent.press(screen.getByLabelText("Add evidence photos"));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByText("Remove"));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(2));
    for (const [registrationInput] of mockCreate.mock.calls) {
      expect(registrationInput).toEqual(
        expect.objectContaining({ workspaceType: "personal" })
      );
      expect(registrationInput).not.toHaveProperty("workspaceId");
      expect(registrationInput).not.toHaveProperty("facilityId");
    }
    await waitFor(() =>
      expect(mockDeleteEvidence).toHaveBeenCalledWith(
        "reconciled-record",
        { workspaceType: "personal" },
        { timeoutMs: 5000 }
      )
    );
    expect(mockAbortEvidence).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Evidence photo 1")).toBeNull();
  });

  it("releases an unregistered object after a terminal registration rejection", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///invalid-record.jpg", type: "image" }]
    });
    mockUpload.mockResolvedValueOnce({
      assetId: "terminal-object",
      url: "/api/evidence-assets/uploads/terminal-object/object",
      mimeType: "image/jpeg"
    });
    mockCreate.mockRejectedValueOnce(
      Object.assign(new Error("Invalid evidence"), {
        code: "VALIDATION",
        status: 422
      })
    );
    const screen = render(<MediaEvidencePicker purpose="other" />);

    fireEvent.press(screen.getByLabelText("Add evidence photos"));
    await waitFor(() => expect(screen.getByText("Retry")).toBeTruthy());
    fireEvent.press(screen.getByText("Remove"));

    await waitFor(() =>
      expect(mockAbortEvidence).toHaveBeenCalledWith("terminal-object", {
        workspaceType: "personal"
      })
    );
  });

  it("keeps a registered object's lifecycle intact when its response arrives after unmount", async () => {
    let finishRegistration: ((value: any) => void) | undefined;
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///unmount-protected.jpg",
          type: "image",
          mimeType: "image/jpeg"
        }
      ]
    });
    mockUpload.mockResolvedValueOnce({
      assetId: "protected-photo-unmount",
      url: "/api/evidence-assets/protected-photo-unmount/content",
      mimeType: "image/jpeg"
    });
    mockCreate.mockReturnValueOnce(
      new Promise((resolve) => {
        finishRegistration = resolve;
      })
    );
    const screen = render(<MediaEvidencePicker purpose="other" />);

    fireEvent.press(screen.getByLabelText("Add evidence photos"));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    screen.unmount();

    await act(async () => {
      finishRegistration?.({
        id: "saved-after-unmount",
        _id: "saved-after-unmount",
        durableUrl: "/api/evidence-assets/uploads/protected-photo-unmount/object"
      });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockAbortEvidence).not.toHaveBeenCalled();
    expect(mockDeleteEvidence).not.toHaveBeenCalled();
  });

  it("shows protected video upload progress and never uses the image endpoint", async () => {
    let finishVideo: ((value: any) => void) | undefined;
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///plant-walk.mov",
          type: null,
          mimeType: "video/quicktime",
          fileName: "plant-walk.mov",
          fileSize: 2048,
          duration: 14000
        }
      ]
    });
    mockUploadVideo.mockImplementation((_file, _workspace, onProgress) => {
      onProgress(0.42);
      return new Promise((resolve) => {
        finishVideo = resolve;
      });
    });
    const screen = render(
      <MediaEvidencePicker purpose="other" allowVideo maxVideoSeconds={30} />
    );

    fireEvent.press(screen.getByLabelText("Add evidence video"));

    expect(await screen.findByText("Uploading 42%")).toBeTruthy();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockUploadVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: "file:///plant-walk.mov",
        fileName: "plant-walk.mov"
      }),
      { workspaceType: "personal" },
      expect.any(Function),
      expect.objectContaining({ signal: expect.anything() })
    );

    await act(async () => {
      finishVideo?.({
        assetId: "video-asset-2",
        url: "/api/videos/assets/video-asset-2/stream",
        mimeType: "video/quicktime",
        bytes: 2048
      });
    });
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  });

  it("removes an active upload and ignores its late result", async () => {
    let finishUpload: ((value: any) => void) | undefined;
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///slow-photo.jpg", type: "image" }]
    });
    mockUpload.mockReturnValueOnce(
      new Promise((resolve) => {
        finishUpload = resolve;
      })
    );
    const onChange = jest.fn();
    const screen = render(<MediaEvidencePicker purpose="other" onChange={onChange} />);

    fireEvent.press(screen.getByLabelText("Add evidence photos"));
    expect(await screen.findByText("uploading")).toBeTruthy();
    fireEvent.press(screen.getByText("Remove"));
    expect(screen.queryByText("uploading")).toBeNull();

    await act(async () => {
      finishUpload?.({ url: "/uploads/slow-photo.jpg", mimeType: "image/jpeg" });
    });

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([]));
    expect(mockCreate).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Evidence photo 1")).toBeNull();
  });

  it("reports busy state until a selected photo finishes saving", async () => {
    let finishUpload: ((value: any) => void) | undefined;
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///busy-photo.jpg", type: "image" }]
    });
    mockUpload.mockReturnValueOnce(
      new Promise((resolve) => {
        finishUpload = resolve;
      })
    );
    const onBusyChange = jest.fn();
    const screen = render(
      <MediaEvidencePicker purpose="other" onBusyChange={onBusyChange} />
    );

    fireEvent.press(screen.getByLabelText("Add evidence photos"));
    await waitFor(() => expect(onBusyChange).toHaveBeenCalledWith(true));

    await act(async () => {
      finishUpload?.({ url: "/uploads/busy-photo.jpg", mimeType: "image/jpeg" });
    });

    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
  });

  it("rejects an obviously tiny diagnosis photo before upload or AI use", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tiny-leaf.jpg",
          type: "image",
          mimeType: "image/jpeg",
          width: 240,
          height: 180,
          fileSize: 30 * 1024
        }
      ]
    });
    const screen = render(
      <MediaEvidencePicker aiUsable purpose="diagnosis" maxPhotos={12} />
    );

    fireEvent.press(screen.getByLabelText("Add evidence photos"));

    await waitFor(() =>
      expect(
        screen.getByText(/This photo is too small for dependable plant review/i)
      ).toBeTruthy()
    );
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("shows role-diverse retake guidance and metadata warnings", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///Screenshot leaf.png",
          type: "image",
          mimeType: "image/png",
          fileName: "Screenshot leaf.png",
          width: 800,
          height: 600,
          fileSize: 70 * 1024
        }
      ]
    });
    const screen = render(<MediaEvidencePicker aiUsable purpose="ipm" maxPhotos={12} />);

    expect(screen.getByText("0/12 photos")).toBeTruthy();
    expect(screen.getByText(/One zoomed-out plant or scout-zone photo/i)).toBeTruthy();
    expect(screen.getByText(/Sharp leaf-top and leaf-underside photos/i)).toBeTruthy();
    expect(
      screen.getByText(/Photo count alone does not prove complete evidence/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/name the intended target and add a dedicated macro/i)
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Add evidence photos"));

    await waitFor(() =>
      expect(screen.getByText(/Photo check: Resolution is limited/i)).toBeTruthy()
    );
    expect(
      screen.getByText(/Photo check: Screenshots often remove detail/i)
    ).toBeTruthy();
    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  it("disables add, retry, and remove mutations while the parent workflow is locked", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///retry-photo.jpg", type: "image" }]
    });
    mockUpload.mockRejectedValueOnce(new Error("Temporary upload failure"));
    const onChange = jest.fn();
    const screen = render(
      <MediaEvidencePicker purpose="other" allowVideo onChange={onChange} />
    );

    fireEvent.press(screen.getByLabelText("Add evidence photos"));
    expect(await screen.findByRole("button", { name: /Retry evidence/i })).toBeTruthy();

    screen.rerender(
      <MediaEvidencePicker purpose="other" allowVideo disabled onChange={onChange} />
    );
    const addPhotos = screen.getByLabelText("Add evidence photos");
    const addVideo = screen.getByLabelText("Add evidence video");
    const retry = screen.getByRole("button", { name: /Retry evidence/i });
    const remove = screen.getByRole("button", { name: /Remove evidence/i });
    expect(addPhotos).toBeDisabled();
    expect(addVideo).toBeDisabled();
    expect(retry).toBeDisabled();
    expect(remove).toBeDisabled();
    expect(addPhotos.props.accessibilityState).toEqual({ disabled: true });
    expect(addVideo.props.accessibilityState).toEqual({ disabled: true });
    expect(retry.props.accessibilityState).toEqual({ disabled: true });
    expect(remove.props.accessibilityState).toEqual({ disabled: true });
    expect(addPhotos.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ minHeight: 44 })])
    );
    expect(retry.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ minHeight: 44 })])
    );
    expect(remove.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ minHeight: 44 })])
    );

    onChange.mockClear();
    mockPicker.mockClear();
    mockUpload.mockClear();
    mockCreate.mockClear();
    mockDeleteEvidence.mockClear();
    fireEvent.press(addPhotos);
    fireEvent.press(addVideo);
    fireEvent.press(retry);
    fireEvent.press(remove);
    expect(mockPicker).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockDeleteEvidence).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores a photo selection that resolves after the workflow becomes locked", async () => {
    let finishPicker: ((value: any) => void) | undefined;
    mockPicker.mockReturnValue(
      new Promise((resolve) => {
        finishPicker = resolve;
      })
    );
    const onChange = jest.fn();
    const screen = render(<MediaEvidencePicker purpose="other" onChange={onChange} />);

    fireEvent.press(screen.getByLabelText("Add evidence photos"));
    await waitFor(() => expect(mockPicker).toHaveBeenCalledTimes(1));
    screen.rerender(<MediaEvidencePicker purpose="other" disabled onChange={onChange} />);
    await act(async () => {
      finishPicker?.({
        canceled: false,
        assets: [{ uri: "file:///late-photo.jpg", type: "image" }]
      });
      await Promise.resolve();
    });

    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
