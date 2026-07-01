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

  it("surfaces unconfirmed crop fallback warnings", () => {
    const notices = buildVpdNotices({
      status: "in_range",
      targetSource: "stage_default_unconfirmed_crop",
      targetConfidence: "medium",
      requiresCropConfirmation: true,
      warnings: [
        "Crop identity is not confirmed, so VPD used the generic stage target. Confirm species/crop profile before applying crop-specific defaults."
      ]
    });

    const text = notices.map((notice) => notice.message).join(" ");
    expect(text).toContain("Crop identity is not confirmed");
    expect(text).toContain("stage_default_unconfirmed_crop");
    expect(text).toContain("confidence: medium");
  });
});
