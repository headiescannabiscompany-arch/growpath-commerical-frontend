import {
  BUSINESS_DESK_ARTIFACT_PROJECTION_VERSION,
  BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES,
  type BusinessDeskTransientArtifact
} from "@/api/businessDeskArtifacts";
import {
  handoffReviewedBusinessDeskArtifact,
  reviewedArtifactOutcomeMessage
} from "@/features/businessDesk/reviewedArtifactHandoff";

function csvArtifact(content: string): BusinessDeskTransientArtifact {
  return {
    mode: "csv",
    contentType: "text/csv; charset=utf-8",
    filename: "formula-safe.csv",
    content,
    projectionVersion: BUSINESS_DESK_ARTIFACT_PROJECTION_VERSION,
    redactionProfile: BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.expense_csv_batch,
    fieldManifest: ["merchant", "notes"],
    checksumSha256: "a".repeat(64),
    bytes: content.length,
    rowCount: 2,
    recordCount: 1,
    deliveryStatus: "not_observed"
  };
}

describe("reviewed artifact device handoff", () => {
  it("hands formula-safe server CSV content off byte-for-byte without rebuilding it", async () => {
    const content = '"merchant","notes"\r\n"\'=cmd|\'/C calc\'!A0","\'  +SUM(1,2)"';
    const exportCsv = jest.fn().mockResolvedValue({
      ok: true,
      filename: "formula-safe",
      rowCount: 0,
      method: "web-download"
    });

    await expect(
      handoffReviewedBusinessDeskArtifact(csvArtifact(content), { exportCsv })
    ).resolves.toEqual({ method: "web-download" });
    expect(exportCsv).toHaveBeenCalledWith("formula-safe.csv", content);
  });

  it("does not turn a device share action into delivery or acceptance", () => {
    const message = reviewedArtifactOutcomeMessage(1, false, {
      method: "native-share",
      action: "shared"
    });

    expect(message).toMatch(/device reported a completed local share action/i);
    expect(message).toMatch(/did not observe recipient delivery or acceptance/i);
    expect(message).not.toMatch(/was delivered|was accepted/i);
  });
});
