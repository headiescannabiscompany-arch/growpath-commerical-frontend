import { createAiWorkspaceThemeStyles } from "../../src/app/home/personal/(tabs)/ai";
import { getThemePalette } from "../../src/theme/appTheme";

describe("Facility AI Ask theme", () => {
  it("uses the active Night palette for the workspace selector and credit notice", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createAiWorkspaceThemeStyles(palette);

    expect(styles.workspaceChip.backgroundColor).toBe(palette.surface);
    expect(styles.workspaceChip.borderColor).toBe(palette.accent);
    expect(styles.workspaceChipOn.backgroundColor).toBe(palette.accent);
    expect(styles.workspaceChipText.color).toBe(palette.link);
    expect(styles.workspaceChipTextOn.color).toBe(palette.accentText);
    expect(styles.creditNotice.color).toBe(palette.textMuted);
  });
});
