import { createFacilityDashboardThemeStyles } from "@/app/home/facility/(tabs)/dashboard";
import { getThemePalette, type ThemeMode } from "@/theme/appTheme";

describe("Facility dashboard theme surfaces", () => {
  it.each(["day", "night"] as ThemeMode[])(
    "uses the %s palette for hero metric cards and row dividers",
    (mode) => {
      const palette = getThemePalette(mode, mode === "night" ? "dark" : "light");
      const styles = createFacilityDashboardThemeStyles(palette);

      expect(styles.pulse.backgroundColor).toBe(palette.surfaceStrong);
      expect(styles.pulse.borderColor).toBe(palette.border);
      expect(styles.pulseValue.color).toBe(palette.text);
      expect(styles.pulseLabel.color).toBe(palette.textMuted);
      expect(styles.rowDivider.borderTopColor).toBe(palette.borderSoft);
    }
  );
});
