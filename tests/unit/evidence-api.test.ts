const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

import {
  deleteEvidenceAsset,
  getEvidenceAssetsByIds,
  isTerminalEvidenceRegistrationError,
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
      params: {
        ids: "older-photo-1,older-video-1",
        workspaceType: "facility",
        workspaceId: "facility-1",
        facilityId: "facility-1"
      }
    });
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
});
