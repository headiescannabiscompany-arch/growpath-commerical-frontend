import { providerEvidencePayload } from "@/api/evidence";

describe("providerEvidencePayload", () => {
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
});
