import { restorableHarvestEvidence } from "../harvestEvidenceRestore";
import type { EvidenceAsset } from "@/types/evidence";

function asset(
  id: string,
  values: Partial<EvidenceAsset> = {}
): EvidenceAsset {
  return {
    id,
    assetType: "photo",
    originalUri: `file://${id}`,
    durableUrl: `/api/evidence-assets/uploads/${id}/object`,
    source: "upload",
    purpose: "harvest",
    uploadStatus: "uploaded",
    qualityWarnings: [],
    ...values
  };
}

describe("restorableHarvestEvidence", () => {
  test("restores an exact standalone retained-frame set with its private source", () => {
    const video = asset("video-new", { assetType: "video", aiUsable: false });
    const rows = [
      asset("frame-new", {
        source: "generated",
        sourceVideoEvidenceAssetId: "video-new"
      }),
      video,
      asset("frame-old", {
        source: "generated",
        sourceVideoEvidenceAssetId: "video-old"
      }),
      asset("unrelated-grow", { growId: "grow-1" })
    ];

    expect(restorableHarvestEvidence(rows, "").map((row) => row.id)).toEqual([
      "frame-new",
      "video-new"
    ]);
  });

  test("restores grow-linked direct and generated photos using the existing boundary", () => {
    const rows = [
      asset("direct", { growId: "grow-1" }),
      asset("frame", {
        growId: "grow-1",
        source: "generated",
        sourceVideoEvidenceAssetId: "video"
      }),
      asset("video", { growId: "grow-1", assetType: "video", aiUsable: false }),
      asset("standalone")
    ];

    expect(restorableHarvestEvidence(rows, "grow-1").map((row) => row.id)).toEqual([
      "direct",
      "frame",
      "video"
    ]);
  });

  test("never restores failed or non-Harvest evidence", () => {
    const rows = [
      asset("failed", { uploadStatus: "failed" }),
      asset("diagnosis", { purpose: "diagnosis" }),
      asset("missing", { durableUrl: undefined })
    ];

    expect(restorableHarvestEvidence(rows, "")).toEqual([]);
  });
});
