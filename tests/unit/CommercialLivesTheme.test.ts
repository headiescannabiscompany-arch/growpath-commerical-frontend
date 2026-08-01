import fs from "node:fs";
import path from "node:path";

import { createCommercialLivesStyles } from "@/app/home/commercial/lives";
import { getThemePalette } from "@/theme/appTheme";

const SOURCE_FILE = "src/app/home/commercial/lives.tsx";

describe("Commercial Lives active palette", () => {
  const nightPalette = getThemePalette("night", "dark");
  const dayPalette = getThemePalette("day", "light");

  it("themes Night scheduling fields, connection panels, warnings, and actions", () => {
    const styles = createCommercialLivesStyles(nightPalette);

    expect(styles.title.color).toBe(nightPalette.text);
    expect(styles.metric).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
    expect(styles.integrationStatus).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.action).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.actionSelected).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.accent,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.actionTextSelected.color).toBe(nightPalette.accentText);
    expect(styles.warningBox).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.warning
      })
    );
    expect(styles.warningText.color).toBe(nightPalette.warning);
    expect(styles.primaryAction.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryActionText.color).toBe(nightPalette.accentText);
  });

  it("themes live records, focus states, previews, loading, and feedback", () => {
    const styles = createCommercialLivesStyles(nightPalette);

    expect(styles.liveRow).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.liveRowFocused).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.accentSoft,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.livePreview.backgroundColor).toBe(nightPalette.surfaceStrong);
    expect(styles.liveThumbnail.backgroundColor).toBe(nightPalette.surfaceStrong);
    expect(styles.liveTitle.color).toBe(nightPalette.text);
    expect(styles.liveMeta.color).toBe(nightPalette.textMuted);
    expect(styles.muted.color).toBe(nightPalette.textMuted);
    expect(styles.success.color).toBe(nightPalette.success);
  });

  it("keeps Day mode palette-driven and themes all thirteen editable fields", () => {
    const styles = createCommercialLivesStyles(dayPalette);

    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: dayPalette.surface,
        borderColor: dayPalette.border,
        color: dayPalette.text
      })
    );
    expect(styles.warningBox.borderColor).toBe(dayPalette.warning);
    expect(styles.liveRowFocused.backgroundColor).toBe(dayPalette.accentSoft);

    const source = fs.readFileSync(path.join(process.cwd(), SOURCE_FILE), "utf8");
    expect(source.match(/<TextInput\b/g) || []).toHaveLength(13);
    expect(source).toContain("placeholderTextColor={palette.textMuted}");
    expect(source).toContain("selectionColor={palette.accent}");
    expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    expect(source).not.toMatch(
      /(?:backgroundColor|borderColor|color):\s*["'](?:white|black)["']/i
    );
  });
});
