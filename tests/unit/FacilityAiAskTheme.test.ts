import fs from "node:fs";
import path from "node:path";

import { createAiWorkspaceThemeStyles } from "../../src/app/home/personal/(tabs)/ai";
import { getThemePalette } from "../../src/theme/appTheme";

describe("Facility AI Ask theme", () => {
  it.each([
    ["Day", getThemePalette("day", "light")],
    ["Night", getThemePalette("night", "dark")]
  ])(
    "uses the active %s palette for every AI workspace surface and control",
    (_label, palette) => {
      const styles = createAiWorkspaceThemeStyles(palette);

      expect(styles.container.backgroundColor).toBe(palette.page);
      expect(styles.workspaceCard).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surfaceMuted,
          borderColor: palette.border
        })
      );
      expect(styles.workspaceChip.backgroundColor).toBe(palette.surface);
      expect(styles.workspaceChip.borderColor).toBe(palette.accent);
      expect(styles.workspaceChipOn.backgroundColor).toBe(palette.accent);
      expect(styles.workspaceChipText.color).toBe(palette.link);
      expect(styles.workspaceChipTextOn.color).toBe(palette.accentText);
      expect(styles.contextCard).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.border
        })
      );
      expect(styles.actionCard.backgroundColor).toBe(palette.surfaceMuted);
      expect(styles.referenceCard.backgroundColor).toBe(palette.surfaceMuted);
      expect(styles.draftCard.backgroundColor).toBe(palette.surfaceStrong);
      expect(styles.sopCard.backgroundColor).toBe(palette.surfaceStrong);
      expect(styles.sopChoice).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.accent
        })
      );
      expect(styles.sopChoiceText.color).toBe(palette.link);
      expect(styles.growChip.backgroundColor).toBe(palette.surface);
      expect(styles.growChip.borderColor).toBe(palette.border);
      expect(styles.growChipOn.backgroundColor).toBe(palette.accent);
      expect(styles.growChipOn.borderColor).toBe(palette.accent);
      expect(styles.growChipText.color).toBe(palette.textMuted);
      expect(styles.growChipTextOn.color).toBe(palette.accentText);
      expect(styles.msg).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.border
        })
      );
      expect(styles.msgRole.color).toBe(palette.textMuted);
      expect(styles.msgText.color).toBe(palette.text);
      expect(styles.composer).toEqual(
        expect.objectContaining({
          backgroundColor: palette.page,
          borderTopColor: palette.border
        })
      );
      expect(styles.input).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.border,
          color: palette.text
        })
      );
      expect(styles.actionButton.backgroundColor).toBe(palette.accent);
      expect(styles.actionButtonText.color).toBe(palette.accentText);
      expect(styles.send.backgroundColor).toBe(palette.accent);
      expect(styles.sendText.color).toBe(palette.accentText);
      expect(styles.creditNotice.color).toBe(palette.textMuted);
    }
  );

  it("keeps the shared AI source free of fixed Day colors and themes its composer", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/home/personal/(tabs)/ai/index.tsx"),
      "utf8"
    );

    expect(source.match(/<TextInput\b/g) || []).toHaveLength(1);
    expect(source).toContain("placeholderTextColor={palette.textMuted}");
    expect(source).toContain("selectionColor={palette.accent}");
    expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    expect(source).not.toMatch(
      /(?:backgroundColor|borderColor|color):\s*["'](?:white|black)["']/i
    );
  });
});
