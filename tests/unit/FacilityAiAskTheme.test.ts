import { createAiWorkspaceThemeStyles } from "../../src/app/home/personal/(tabs)/ai";
import { getThemePalette } from "../../src/theme/appTheme";

describe("Facility AI Ask theme", () => {
  it.each([
    ["Day", getThemePalette("day", "light")],
    ["Night", getThemePalette("night", "dark")]
  ])(
    "uses the active %s palette for workspace and grow selectors and the credit notice",
    (_label, palette) => {
      const styles = createAiWorkspaceThemeStyles(palette);

      expect(styles.workspaceChip.backgroundColor).toBe(palette.surface);
      expect(styles.workspaceChip.borderColor).toBe(palette.accent);
      expect(styles.workspaceChipOn.backgroundColor).toBe(palette.accent);
      expect(styles.workspaceChipText.color).toBe(palette.link);
      expect(styles.workspaceChipTextOn.color).toBe(palette.accentText);
      expect(styles.growChip.backgroundColor).toBe(palette.surface);
      expect(styles.growChip.borderColor).toBe(palette.border);
      expect(styles.growChipOn.backgroundColor).toBe(palette.accent);
      expect(styles.growChipOn.borderColor).toBe(palette.accent);
      expect(styles.growChipText.color).toBe(palette.textMuted);
      expect(styles.growChipTextOn.color).toBe(palette.accentText);
      expect(styles.creditNotice.color).toBe(palette.textMuted);
    }
  );
});
