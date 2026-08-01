import fs from "node:fs";
import path from "node:path";

import { createCommercialProductLineDetailStyles } from "@/app/home/commercial/product-lines/[lineId]";
import { createCommercialProductLinesStyles } from "@/app/home/commercial/product-lines";
import { getThemePalette } from "@/theme/appTheme";

const SOURCE_FILES = [
  "src/app/home/commercial/product-lines.tsx",
  "src/app/home/commercial/product-lines/[lineId].tsx"
];

describe("Commercial product-line active palette", () => {
  const nightPalette = getThemePalette("night", "dark");
  const dayPalette = getThemePalette("day", "light");

  it("themes Night product-line fields, rows, actions, and feedback", () => {
    const styles = createCommercialProductLinesStyles(nightPalette);

    expect(styles.title.color).toBe(nightPalette.text);
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
    expect(styles.lineRow).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.outlineButton).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.primaryButton.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryText.color).toBe(nightPalette.accentText);
    expect(styles.feedback.backgroundColor).toBe(nightPalette.accentSoft);
    expect(styles.feedback.color).toBe(nightPalette.success);
  });

  it("themes Night product-line detail panels, fields, actions, and status", () => {
    const styles = createCommercialProductLineDetailStyles(nightPalette);

    expect(styles.detailRow).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.productRow).toEqual(
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
    expect(styles.success.color).toBe(nightPalette.success);
    expect(styles.primaryAction.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryActionText.color).toBe(nightPalette.accentText);
  });

  it("keeps Day mode palette-driven and themes all eleven inputs", () => {
    expect(createCommercialProductLinesStyles(dayPalette).input).toEqual(
      expect.objectContaining({
        backgroundColor: dayPalette.surface,
        borderColor: dayPalette.border,
        color: dayPalette.text
      })
    );
    expect(
      createCommercialProductLineDetailStyles(dayPalette).productRow.backgroundColor
    ).toBe(dayPalette.surfaceMuted);

    const sources = SOURCE_FILES.map((file) =>
      fs.readFileSync(path.join(process.cwd(), file), "utf8")
    );
    expect(sources[0].match(/<TextInput\b/g) || []).toHaveLength(6);
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
