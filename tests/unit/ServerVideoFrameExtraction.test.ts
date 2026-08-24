import {
  isProtectedRetainedFrameSet,
  serverVideoFrameActionBeginsNewJob,
  serverVideoProviderReadyAssets
} from "@/components/media/useServerVideoFrameExtraction";
import type { EvidenceFrameExtraction } from "@/api/evidence";

function frame(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `local-frame-${index}`,
    _id: `saved-frame-${index}`,
    assetType: "photo" as const,
    originalUri: `/uploads/frame-${index}.jpg`,
    durableUrl: `/uploads/frame-${index}.jpg`,
    source: "generated" as const,
    purpose: "harvest" as const,
    uploadStatus: "uploaded" as const,
    aiUsable: true,
    qualityWarnings: [],
    sourceVideoEvidenceAssetId: "source-video-1",
    frameExtractionVersion: "harvest-video-preselection-v1",
    frameExtractionAttempt: 2,
    frameIndex: index,
    ...overrides
  };
}

const source = {
  id: "local-source-video",
  _id: "source-video-1",
  assetType: "video" as const,
  originalUri: "/api/videos/source-video-1/stream",
  durableUrl: "/api/videos/source-video-1/stream",
  source: "upload" as const,
  purpose: "harvest" as const,
  uploadStatus: "uploaded" as const,
  aiUsable: false,
  qualityWarnings: []
};

describe("serverVideoProviderReadyAssets", () => {
  it("admits only the exact verified canonical frame order", () => {
    const assets = [source, frame(1), frame(0)];
    const ready = serverVideoProviderReadyAssets(assets, {
      sourceId: "source-video-1",
      version: "harvest-video-preselection-v1",
      attemptCount: 2,
      frameIds: ["saved-frame-0", "saved-frame-1"]
    });

    expect(ready.map((asset) => asset._id)).toEqual([
      "source-video-1",
      "saved-frame-0",
      "saved-frame-1"
    ]);
  });

  it("keeps a protected partial retained-frame set out of completed restoration", () => {
    const retainedPartial: EvidenceFrameExtraction = {
      status: "partial",
      attemptCount: 2,
      retryable: true,
      cleanupPending: true,
      partialFrameCount: 1,
      errorCode: "EVIDENCE_FRAME_SET_RETAINED",
      error: "Remove the protected reference before extracting a replacement set.",
      frames: []
    };
    expect(isProtectedRetainedFrameSet(retainedPartial)).toBe(true);
    expect(serverVideoFrameActionBeginsNewJob("partial", retainedPartial)).toBe(false);
    expect(
      serverVideoFrameActionBeginsNewJob("partial", {
        ...retainedPartial,
        cleanupPending: false
      })
    ).toBe(true);
    expect(
      serverVideoProviderReadyAssets([source, frame(0)], null).map((asset) => asset._id)
    ).toEqual(["source-video-1"]);
  });

  it("withholds the whole generated set when one frame is stale or unverified", () => {
    const assets = [
      source,
      frame(0),
      frame(1, { frameExtractionVersion: "stale-version" })
    ];
    const ready = serverVideoProviderReadyAssets(assets, {
      sourceId: "source-video-1",
      version: "harvest-video-preselection-v1",
      attemptCount: 2,
      frameIds: ["saved-frame-0", "saved-frame-1"]
    });

    expect(ready).toEqual([source]);
  });
});
