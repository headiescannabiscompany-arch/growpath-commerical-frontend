import {
  createGlobalReportBugButtonStyles,
  shouldDockReportBugButton
} from "@/components/GlobalReportBugButton";
import { createReportBugButtonStyles } from "@/components/ReportBugButton";

const nightPalette = {
  surface: "#111827",
  surfaceStrong: "#1A2330",
  border: "#334355",
  warning: "#F6C453"
} as any;

describe("GlobalReportBugButton", () => {
  it("docks the global control on narrow screens", () => {
    expect(shouldDockReportBugButton(390)).toBe(true);
    expect(shouldDockReportBugButton(599)).toBe(true);
  });

  it("keeps the global control floating on wider screens", () => {
    expect(shouldDockReportBugButton(600)).toBe(false);
    expect(shouldDockReportBugButton(1440)).toBe(false);
  });

  it("uses the active palette for the shared mobile dock and report control", () => {
    const dockStyles = createGlobalReportBugButtonStyles(nightPalette);
    const buttonStyles = createReportBugButtonStyles(nightPalette);

    expect(dockStyles.mobileDock).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceStrong,
        borderTopColor: nightPalette.border
      })
    );
    expect(buttonStyles.button).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.warning
      })
    );
    expect(buttonStyles.text).toEqual(
      expect.objectContaining({ color: nightPalette.warning })
    );
  });
});
