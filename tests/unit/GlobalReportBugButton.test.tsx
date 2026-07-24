import { shouldDockReportBugButton } from "@/components/GlobalReportBugButton";

describe("GlobalReportBugButton", () => {
  it("docks the global control on narrow screens", () => {
    expect(shouldDockReportBugButton(390)).toBe(true);
    expect(shouldDockReportBugButton(599)).toBe(true);
  });

  it("keeps the global control floating on wider screens", () => {
    expect(shouldDockReportBugButton(600)).toBe(false);
    expect(shouldDockReportBugButton(1440)).toBe(false);
  });
});
