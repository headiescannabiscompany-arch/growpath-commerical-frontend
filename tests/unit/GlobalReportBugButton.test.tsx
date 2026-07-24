import { getReportBugButtonLabel } from "@/components/GlobalReportBugButton";

describe("GlobalReportBugButton", () => {
  it("uses a compact visible label on narrow screens", () => {
    expect(getReportBugButtonLabel(390)).toBe("Bug");
    expect(getReportBugButtonLabel(599)).toBe("Bug");
  });

  it("keeps the full visible label on wider screens", () => {
    expect(getReportBugButtonLabel(600)).toBe("Report Bug");
    expect(getReportBugButtonLabel(1440)).toBe("Report Bug");
  });
});
