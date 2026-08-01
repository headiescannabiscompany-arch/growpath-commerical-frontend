import fs from "node:fs";
import path from "node:path";

import { createCommercialGrowDetailStyles } from "@/app/home/commercial/grows/[growId]";
import { createCommercialGrowsStyles } from "@/app/home/commercial/grows";
import { getThemePalette } from "@/theme/appTheme";

const SOURCE_FILES = [
  "src/app/home/commercial/grows/index.tsx",
  "src/app/home/commercial/grows/[growId].tsx"
];

describe("Commercial evidence run active palette", () => {
  const nightPalette = getThemePalette("night", "dark");
  const dayPalette = getThemePalette("day", "light");

  it("themes evidence run overview, pickers, statuses, records, and actions", () => {
    const styles = createCommercialGrowsStyles(nightPalette);

    expect(styles.title.color).toBe(nightPalette.text);
    expect(styles.metric).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.recordPicker).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.sharePicker.backgroundColor).toBe(nightPalette.surfaceMuted);
    expect(styles.shareChoice.backgroundColor).toBe(nightPalette.surface);
    expect(styles.selectedAction).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.accentSoft,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.growRow).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.actionText.color).toBe(nightPalette.link);
    expect(styles.primaryAction.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryActionText.color).toBe(nightPalette.accentText);
  });

  it("themes evidence run detail fields, panels, links, and feedback", () => {
    const styles = createCommercialGrowDetailStyles(nightPalette);

    expect(styles.title.color).toBe(nightPalette.text);
    expect(styles.detailRow).toEqual(
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
    expect(styles.action).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.primaryAction.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryActionText.color).toBe(nightPalette.accentText);
    expect(styles.success.color).toBe(nightPalette.success);
    expect(styles.bullet.color).toBe(nightPalette.textSoft);
  });

  it("keeps Day mode palette-driven and themes every editable field", () => {
    expect(createCommercialGrowsStyles(dayPalette).input).toEqual(
      expect.objectContaining({
        backgroundColor: dayPalette.surface,
        borderColor: dayPalette.border,
        color: dayPalette.text
      })
    );
    expect(createCommercialGrowDetailStyles(dayPalette).detailRow.backgroundColor).toBe(
      dayPalette.surfaceMuted
    );

    const sources = SOURCE_FILES.map((file) =>
      fs.readFileSync(path.join(process.cwd(), file), "utf8")
    );

    expect(sources[0].match(/<TextInput\b/g) || []).toHaveLength(12);
    expect(sources[1].match(/<TextInput\b/g) || []).toHaveLength(5);
    for (const source of sources) {
      expect(source).toContain("placeholderTextColor={palette.textMuted}");
      expect(source).toContain("selectionColor={palette.accent}");
      expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
      expect(source).not.toMatch(
        /(?:backgroundColor|borderColor|color):\s*["'](?:white|black)["']/i
      );
    }
  });
});
