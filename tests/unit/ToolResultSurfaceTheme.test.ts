import { createToolResultStyles } from "../../src/features/personal/tools/ToolResultSurface";
import { getThemePalette } from "../../src/theme/appTheme";

describe("ToolResultSurface Night theme", () => {
  it("uses the active palette for cards, metrics, text, and actions", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createToolResultStyles(palette);

    expect(styles.card.backgroundColor).toBe(palette.card);
    expect(styles.metric.backgroundColor).toBe(palette.surface);
    expect(styles.metricValue.color).toBe(palette.text);
    expect(styles.dataColumn.backgroundColor).toBe(palette.surface);
    expect(styles.actionPrimary.backgroundColor).toBe(palette.accent);
    expect(styles.actionSecondary.backgroundColor).toBe(palette.surface);
    expect(styles.actionSecondaryText.color).toBe(palette.link);
  });
});
