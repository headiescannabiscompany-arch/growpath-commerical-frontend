import { createFacilityAiTemplateStyles } from "@/app/home/facility/(tabs)/ai-template";
import { getThemePalette } from "@/theme/appTheme";

describe("Facility AI Templates theme", () => {
  it("uses the active Night palette for the page and workflow cards", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createFacilityAiTemplateStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.h1.color).toBe(palette.text);
    expect(styles.sub.color).toBe(palette.textMuted);
    expect(styles.card.backgroundColor).toBe(palette.card);
    expect(styles.card.borderColor).toBe(palette.border);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.desc.color).toBe(palette.textMuted);
    expect(styles.link.color).toBe(palette.link);
  });
});
