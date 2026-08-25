const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

import {
  deleteEvidenceAsset,
  extractEvidenceVideoFrames,
  getEvidenceAssetsByIds,
  getEvidenceSourceMetadata,
  getEvidenceVideoFrameExtraction,
  isTerminalEvidenceRegistrationError,
  loadAiInspectionView,
  listEvidenceAssets,
  providerEvidencePayload
} from "@/api/evidence";

describe("providerEvidencePayload", () => {
  beforeEach(() => mockApiRequest.mockReset());

  it("includes only durable uploaded evidence in provider-ready groups", () => {
    const payload = providerEvidencePayload([
      {
        id: "photo-1",
        assetType: "photo",
        originalUri: "file:///photo.jpg",
        durableUrl: "/uploads/photo.jpg",
        source: "library",
        purpose: "diagnosis",
        uploadStatus: "uploaded",
        qualityWarnings: []
      },
      {
        id: "video-1",
        assetType: "video",
        originalUri: "file:///video.mp4",
        durableUrl: "https://cdn.example.test/video.mp4",
        source: "library",
        purpose: "diagnosis",
        uploadStatus: "uploaded",
        qualityWarnings: ["Low light"]
      },
      {
        id: "failed-1",
        assetType: "photo",
        originalUri: "file:///failed.jpg",
        source: "library",
        purpose: "diagnosis",
        uploadStatus: "failed",
        qualityWarnings: []
      }
    ]);

    expect(payload.evidenceAssetIds).toEqual(["photo-1", "video-1"]);
    expect(payload.imageEvidenceAssetIds).toEqual(["photo-1"]);
    expect(payload.images).toEqual(["/uploads/photo.jpg"]);
    expect(payload.videos).toEqual(["https://cdn.example.test/video.mp4"]);
    expect(payload.media).toHaveLength(2);
    expect(payload.media).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "photo-1", source: "library" }),
        expect.objectContaining({ id: "video-1", source: "library" })
      ])
    );
  });

  it("preserves generated video-frame provenance for downstream result accounting", () => {
    const payload = providerEvidencePayload([
      {
        id: "frame-1",
        assetType: "photo",
        originalUri: "file:///frame-1.jpg",
        durableUrl: "/uploads/frame-1.jpg",
        source: "generated",
        sourceVideoEvidenceAssetId: "video-1",
        frameExtractionVersion: "frames-v1",
        frameExtractionAttempt: 2,
        frameIndex: 0,
        frameTimeSeconds: 4.5,
        frameTimeBasis: "actual",
        purpose: "crop_identification",
        uploadStatus: "uploaded",
        aiUsable: true,
        qualityWarnings: [
          "Extracted from the source video at 4.5 seconds. Confirm the diagnostic plant structure, focus, color, and glare before analysis."
        ]
      }
    ]);

    expect(payload.media).toEqual([
      expect.objectContaining({
        id: "frame-1",
        type: "photo",
        source: "generated",
        sourceVideoEvidenceAssetId: "video-1",
        frameExtractionVersion: "frames-v1",
        frameExtractionAttempt: 2,
        frameIndex: 0,
        frameTimeSeconds: 4.5,
        frameTimeBasis: "actual",
        qualityWarnings: [expect.stringMatching(/source video at 4\.5 seconds/i)]
      })
    ]);
  });

  it("deletes the saved record and protected object through one bounded request", async () => {
    mockApiRequest.mockResolvedValue({ deleted: true });

    await expect(
      deleteEvidenceAsset(
        "record/1",
        {
          workspaceType: "facility",
          workspaceId: "facility-1",
          facilityId: "facility-1"
        },
        { timeoutMs: 3000 }
      )
    ).resolves.toEqual({ deleted: true });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/evidence-assets/record%2F1", {
      method: "DELETE",
      signal: undefined,
      timeoutMs: 3000,
      body: {
        workspaceType: "facility",
        workspaceId: "facility-1",
        facilityId: "facility-1"
      }
    });
  });

  it("fetches authorized evidence by exact ID with the current workspace scope", async () => {
    mockApiRequest.mockResolvedValue({
      assets: [
        {
          _id: "older-photo-1",
          assetType: "photo",
          originalUri: "file:///older-photo.jpg",
          source: "library",
          purpose: "crop_identification",
          uploadStatus: "uploaded"
        }
      ]
    });

    await expect(
      getEvidenceAssetsByIds(["older-photo-1", " older-photo-1 ", "older-video-1"], {
        workspaceType: "facility",
        workspaceId: "facility-1",
        facilityId: "facility-1"
      })
    ).resolves.toEqual([
      expect.objectContaining({
        id: "older-photo-1",
        _id: "older-photo-1",
        qualityWarnings: []
      })
    ]);

    expect(mockApiRequest).toHaveBeenCalledWith("/api/evidence-assets", {
      signal: undefined,
      params: {
        ids: "older-photo-1,older-video-1",
        workspaceType: "facility",
        workspaceId: "facility-1",
        facilityId: "facility-1"
      }
    });
  });

  it("loads an exact fingerprinted AI inspection view in its authorized workspace", async () => {
    const view = {
      sourceEvidenceAssetId: "photo/1",
      sourceImageIndex: 13,
      kind: "upper coverage",
      cropStrategy: "coverage" as const,
      derivationVersion: "retained-original-macro-jpeg-v1" as const,
      sourceBounds: {
        left: 10,
        top: 20,
        width: 900,
        height: 900,
        sourceWidth: 1920,
        sourceHeight: 1080
      },
      width: 900,
      height: 900,
      mimeType: "image/jpeg" as const,
      sha256: "b".repeat(64)
    };
    mockApiRequest.mockResolvedValue({
      view: {
        ...view,
        sourceImageIndex: 1,
        workspaceType: "personal",
        dataUrl: "data:image/jpeg;base64,eA=="
      }
    });

    await expect(
      loadAiInspectionView(view, {
        workspaceType: "facility",
        workspaceId: "facility-1",
        facilityId: "facility-1"
      })
    ).resolves.toEqual(
      expect.objectContaining({
        sourceImageIndex: 13,
        workspaceType: "facility",
        workspaceId: "facility-1",
        facilityId: "facility-1",
        dataUrl: expect.stringContaining("base64")
      })
    );

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/evidence-assets/photo%2F1/inspection-view",
      expect.objectContaining({
        timeoutMs: 30000,
        params: expect.objectContaining({
          sha256: "b".repeat(64),
          kind: "upper coverage",
          cropStrategy: "coverage",
          derivationVersion: "retained-original-macro-jpeg-v1",
          sourceBounds: JSON.stringify(view.sourceBounds),
          width: 900,
          height: 900,
          format: "json",
          workspaceType: "facility",
          facilityId: "facility-1"
        })
      })
    );
  });

  it("keeps an unversioned historical inspection request on the legacy path", async () => {
    const view = {
      sourceEvidenceAssetId: "legacy-photo-1",
      sourceImageIndex: 1,
      kind: "center",
      cropStrategy: "focus" as const,
      sourceBounds: null,
      width: 640,
      height: 640,
      mimeType: "image/jpeg" as const,
      sha256: "c".repeat(64)
    };
    mockApiRequest.mockResolvedValue({
      view: { ...view, dataUrl: "data:image/jpeg;base64,eA==" }
    });

    await loadAiInspectionView(view, { workspaceType: "personal" });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/evidence-assets/legacy-photo-1/inspection-view",
      expect.objectContaining({
        params: expect.not.objectContaining({
          derivationVersion: expect.anything(),
          sourceBounds: expect.anything(),
          width: expect.anything(),
          height: expect.anything()
        })
      })
    );
  });

  it("rejects a regenerated inspection image that drifts from its signed descriptor", async () => {
    const view = {
      sourceEvidenceAssetId: "photo-13",
      sourceImageIndex: 13,
      kind: "macro center",
      cropStrategy: "macro_coverage" as const,
      derivationVersion: "retained-original-macro-jpeg-v1" as const,
      sourceBounds: {
        left: 100,
        top: 50,
        width: 800,
        height: 800,
        sourceWidth: 1800,
        sourceHeight: 1200
      },
      width: 800,
      height: 800,
      mimeType: "image/jpeg" as const,
      sha256: "d".repeat(64)
    };
    mockApiRequest.mockResolvedValue({
      view: {
        ...view,
        sourceImageIndex: 1,
        sha256: "e".repeat(64),
        dataUrl: "data:image/jpeg;base64,eA=="
      }
    });

    await expect(
      loadAiInspectionView(view, { workspaceType: "personal" })
    ).rejects.toThrow(/did not match its signed result descriptor/i);
  });

  it("loads private GPS and capture date from one retained original", async () => {
    mockApiRequest.mockResolvedValue({
      sourceEvidenceAssetId: "photo/1",
      sourceAssetType: "photo",
      metadata: {
        latitude: 35.78613,
        longitude: -78.78119,
        capturedAt: "2026-07-27T14:20:00.000Z",
        hasLocation: true,
        hasCaptureDate: true
      }
    });

    await expect(
      getEvidenceSourceMetadata("photo/1", {
        workspaceType: "personal"
      })
    ).resolves.toEqual({
      sourceEvidenceAssetId: "photo/1",
      sourceAssetType: "photo",
      latitude: 35.78613,
      longitude: -78.78119,
      capturedAt: "2026-07-27T14:20:00.000Z",
      capturedLocalDate: "2026-07-27",
      captureDatePrecision: "instant",
      hasLocation: true,
      hasCaptureDate: true
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/evidence-assets/photo%2F1/source-metadata",
      expect.objectContaining({
        timeoutMs: 30000,
        params: { workspaceType: "personal" }
      })
    );
  });

  it("accepts the wrapped source-metadata response used by API envelopes", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        sourceEvidenceAssetId: "video-1",
        sourceAssetType: "video",
        metadata: {
          latitude: "39.1023",
          longitude: "-77.0123",
          capturedAt: "2026-08-20T14:15:16.000Z",
          hasLocation: true,
          hasCaptureDate: true
        }
      }
    });

    await expect(
      getEvidenceSourceMetadata("video-1", { workspaceType: "commercial" })
    ).resolves.toEqual({
      sourceEvidenceAssetId: "video-1",
      sourceAssetType: "video",
      latitude: 39.1023,
      longitude: -77.0123,
      capturedAt: "2026-08-20T14:15:16.000Z",
      capturedLocalDate: "2026-08-20",
      captureDatePrecision: "instant",
      hasLocation: true,
      hasCaptureDate: true
    });
  });

  it("never turns missing or invalid source metadata into a coordinate or date", async () => {
    mockApiRequest.mockResolvedValue({
      sourceEvidenceAssetId: "photo-2",
      sourceAssetType: "photo",
      metadata: {
        latitude: null,
        longitude: "",
        capturedAt: "2026-02-31T10:00:00.000Z",
        hasLocation: true,
        hasCaptureDate: true
      }
    });

    await expect(
      getEvidenceSourceMetadata("photo-2", {
        workspaceType: "facility",
        facilityId: "f-1"
      })
    ).resolves.toEqual({
      sourceEvidenceAssetId: "photo-2",
      sourceAssetType: "photo",
      latitude: null,
      longitude: null,
      capturedAt: null,
      capturedLocalDate: null,
      captureDatePrecision: null,
      hasLocation: false,
      hasCaptureDate: false
    });

    mockApiRequest.mockResolvedValue({
      metadata: {
        latitude: 91,
        longitude: -181,
        hasLocation: true,
        hasCaptureDate: false
      }
    });
    await expect(
      getEvidenceSourceMetadata("photo-3", { workspaceType: "personal" })
    ).resolves.toEqual(
      expect.objectContaining({
        latitude: null,
        longitude: null,
        hasLocation: false
      })
    );
  });

  it("retires the obsolete Harvest dimension warning without hiding real quality findings", async () => {
    mockApiRequest.mockResolvedValue({
      assets: [
        {
          _id: "harvest-photo-1",
          assetType: "photo",
          purpose: "harvest",
          uploadStatus: "uploaded",
          qualityWarnings: [
            "Harvest macro review may not resolve intact trichome heads at this resolution.",
            "This photo may be compressed; confirm fine detail before relying on it.",
            "Extracted from the source video at 4.5 seconds."
          ]
        }
      ]
    });

    await expect(listEvidenceAssets({ growId: "grow-1" })).resolves.toEqual([
      expect.objectContaining({
        id: "harvest-photo-1",
        qualityWarnings: [
          "This photo may be compressed; confirm fine detail before relying on it.",
          "Extracted from the source video at 4.5 seconds."
        ]
      })
    ]);
  });

  it("passes cancellation through an exact evidence reload", async () => {
    const controller = new AbortController();
    mockApiRequest.mockImplementationOnce(
      (_path: string, options: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
          });
        })
    );

    const pending = getEvidenceAssetsByIds(
      ["frame-1"],
      { workspaceType: "personal" },
      { signal: controller.signal }
    );
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/evidence-assets",
      expect.objectContaining({ signal: controller.signal })
    );
  });

  it("rejects an oversized exact evidence lookup before making a request", async () => {
    await expect(
      getEvidenceAssetsByIds(
        Array.from({ length: 51 }, (_, index) => `evidence-${index}`),
        { workspaceType: "personal" }
      )
    ).rejects.toThrow(/no more than 50 evidence assets/i);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("distinguishes safe terminal registration rejection from ambiguous transport", () => {
    expect(isTerminalEvidenceRegistrationError({ status: 422 })).toBe(true);
    expect(isTerminalEvidenceRegistrationError({ status: 503 })).toBe(false);
    expect(isTerminalEvidenceRegistrationError({ code: "TIMEOUT" })).toBe(false);
    expect(isTerminalEvidenceRegistrationError({ code: "NETWORK_ERROR" })).toBe(false);
  });

  it("starts scoped server frame extraction with expected Plant ID lineage", async () => {
    mockApiRequest.mockResolvedValue({
      sourceVideo: {
        _id: "video-1",
        assetType: "video",
        purpose: "crop_identification",
        uploadStatus: "uploaded"
      },
      extraction: {
        status: "processing",
        attemptCount: 2,
        version: "server-frames-v1",
        retryable: true,
        frames: []
      }
    });

    await expect(
      extractEvidenceVideoFrames("video/1", {
        workspaceType: "facility",
        workspaceId: "facility-1",
        facilityId: "facility-1",
        maxFrames: 10,
        purpose: "crop_identification",
        growId: "grow-1",
        plantId: "plant-1"
      })
    ).resolves.toEqual({
      sourceVideo: expect.objectContaining({ id: "video-1", _id: "video-1" }),
      extraction: expect.objectContaining({
        status: "processing",
        attemptCount: 2,
        retryable: true,
        frames: []
      })
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/evidence-assets/video%2F1/extract-frames",
      {
        method: "POST",
        signal: undefined,
        timeoutMs: 45000,
        body: {
          workspaceType: "facility",
          workspaceId: "facility-1",
          facilityId: "facility-1",
          maxFrames: 10,
          purpose: "crop_identification",
          growId: "grow-1",
          plantId: "plant-1"
        }
      }
    );
  });

  it("loads persisted partial extraction with normalized uploaded frame rows", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        sourceVideo: { _id: "video-2", assetType: "video" },
        extraction: {
          status: "partial",
          attemptCount: "not-a-number",
          errorMessage: "One frame could not be finalized.",
          retryable: true,
          frames: [
            {
              _id: "frame-2",
              assetType: "photo",
              source: "generated",
              uploadStatus: "uploaded"
            }
          ]
        }
      }
    });

    await expect(
      getEvidenceVideoFrameExtraction("video-2", {
        workspaceType: "commercial"
      })
    ).resolves.toEqual({
      sourceVideo: expect.objectContaining({ id: "video-2" }),
      extraction: expect.objectContaining({
        status: "partial",
        attemptCount: 0,
        error: "One frame could not be finalized.",
        frames: [expect.objectContaining({ id: "frame-2", qualityWarnings: [] })]
      })
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/evidence-assets/video-2/frame-extraction",
      {
        signal: undefined,
        timeoutMs: 30000,
        params: { workspaceType: "commercial" }
      }
    );
  });

  it("preserves the protected retained-frame cleanup state without inventing completed frames", async () => {
    mockApiRequest.mockResolvedValue({
      sourceVideo: { _id: "video-retained-1", assetType: "video" },
      extraction: {
        status: "partial",
        attemptCount: 3,
        retryable: true,
        cleanupPending: true,
        errorCode: "EVIDENCE_FRAME_SET_RETAINED",
        errorMessage:
          "Unreferenced frames were removed. Remove the protected reference before extracting a replacement set.",
        frameAssetIds: ["retained-frame-1"],
        frameCount: 1,
        partialFrameCount: 1,
        frames: []
      }
    });

    await expect(
      getEvidenceVideoFrameExtraction("video-retained-1", {
        workspaceType: "personal"
      })
    ).resolves.toEqual({
      sourceVideo: expect.objectContaining({ id: "video-retained-1" }),
      extraction: expect.objectContaining({
        status: "partial",
        retryable: true,
        cleanupPending: true,
        partialFrameCount: 1,
        errorCode: "EVIDENCE_FRAME_SET_RETAINED",
        frames: []
      })
    });
  });
});
