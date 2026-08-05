const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

import {
  deleteEvidenceAsset,
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
    expect(payload.images).toEqual(["/uploads/photo.jpg"]);
    expect(payload.videos).toEqual(["https://cdn.example.test/video.mp4"]);
    expect(payload.media).toHaveLength(2);
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

  it("distinguishes safe terminal registration rejection from ambiguous transport", () => {
    expect(isTerminalEvidenceRegistrationError({ status: 422 })).toBe(true);
    expect(isTerminalEvidenceRegistrationError({ status: 503 })).toBe(false);
    expect(isTerminalEvidenceRegistrationError({ code: "TIMEOUT" })).toBe(false);
    expect(isTerminalEvidenceRegistrationError({ code: "NETWORK_ERROR" })).toBe(false);
  });
});
