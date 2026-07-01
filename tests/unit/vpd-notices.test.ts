import { buildVpdNotices } from "@/features/personal/tools/vpdNotices";

describe("buildVpdNotices", () => {
  it("surfaces crop-aware target source, confidence, and starter warnings", () => {
    const notices = buildVpdNotices({
      status: "high",
      targetSource: "starter_crop_profile:lettuce",
      targetConfidence: "low",
      warnings: [
        "Crop-specific VPD target is a starter default pending source/license review."
      ]
    });

    const text = notices.map((notice) => notice.message).join(" ");
    expect(text).toContain("starter default pending source/license review");
    expect(text).toContain("starter_crop_profile:lettuce");
    expect(text).toContain("confidence: low");
    expect(notices.map((notice) => notice.key)).toEqual([
      "target-status",
      "warning-0",
      "target-source"
    ]);
  });

  it("marks verified stage defaults as informational source notes", () => {
    const notices = buildVpdNotices({
      status: "in_range",
      targetSource: "stage_default",
      targetConfidence: "medium",
      warnings: []
    });

    expect(notices).toEqual([
      {
        key: "target-source",
        severity: "info",
        message: "Target source: stage_default; confidence: medium."
      }
    ]);
  });
});
