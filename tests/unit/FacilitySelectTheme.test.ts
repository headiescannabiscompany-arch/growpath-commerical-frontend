import { createFacilitySelectStyles } from "@/app/home/facility/select";
import { getThemePalette } from "@/theme/appTheme";

describe("Facility selector theme", () => {
  it("uses the active Night palette for loaded and empty states", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createFacilitySelectStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.h1.color).toBe(palette.text);
    expect(styles.muted.color).toBe(palette.textMuted);
    expect(styles.row.backgroundColor).toBe(palette.card);
    expect(styles.row.borderColor).toBe(palette.border);
    expect(styles.rowTitle.color).toBe(palette.text);
    expect(styles.secondaryButton.backgroundColor).toBe(palette.surface);
    expect(styles.logoutText.color).toBe(palette.danger);
  });
});
