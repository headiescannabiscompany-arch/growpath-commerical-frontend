import fs from "node:fs";
import path from "node:path";

import { createCommercialInventoryStyles } from "@/app/home/commercial/inventory";
import { createStorefrontProductImportStyles } from "@/app/home/commercial/products/import";
import { getThemePalette } from "@/theme/appTheme";

const SOURCE_FILES = [
  "src/app/home/commercial/inventory.tsx",
  "src/app/home/commercial/products/import.tsx"
];

describe("Commercial inventory and product import active palettes", () => {
  const nightPalette = getThemePalette("night", "dark");
  const dayPalette = getThemePalette("day", "light");

  it("themes Night inventory cards, rows, actions, and stock states", () => {
    const styles = createCommercialInventoryStyles(nightPalette);

    expect(styles.container.backgroundColor).toBe(nightPalette.page);
    expect(styles.summaryCard).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.accentSoft,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.guideCard).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.row).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border
      })
    );
    expect(styles.createBtn.borderColor).toBe(nightPalette.accent);
    expect(styles.badgeOk.color).toBe(nightPalette.success);
    expect(styles.badgeWarn.color).toBe(nightPalette.warning);
    expect(styles.badgeDanger.color).toBe(nightPalette.danger);
  });

  it("themes Night import fields, rows, filters, actions, and feedback", () => {
    const styles = createStorefrontProductImportStyles(nightPalette);

    expect(styles.csvInput).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
    expect(styles.row).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.filterSelected.backgroundColor).toBe(nightPalette.accentSoft);
    expect(styles.selected.borderColor).toBe(nightPalette.accent);
    expect(styles.button.backgroundColor).toBe(nightPalette.accent);
    expect(styles.buttonText.color).toBe(nightPalette.accentText);
    expect(styles.feedback.color).toBe(nightPalette.success);
  });

  it("keeps Day mode palette-driven and removes fixed light literals", () => {
    expect(createCommercialInventoryStyles(dayPalette).row.backgroundColor).toBe(
      dayPalette.surface
    );
    expect(createStorefrontProductImportStyles(dayPalette).csvInput.color).toBe(
      dayPalette.text
    );

    const sources = SOURCE_FILES.map((file) =>
      fs.readFileSync(path.join(process.cwd(), file), "utf8")
    );
    expect(sources[1].match(/<TextInput\b/g) || []).toHaveLength(1);
    expect(sources[1]).toContain("placeholderTextColor={palette.textMuted}");
    expect(sources[1]).toContain("selectionColor={palette.accent}");
    for (const source of sources) {
      expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
      expect(source).not.toMatch(
        /(?:backgroundColor|borderColor|color):\s*["'](?:white|black)["']/i
      );
    }
  });
});
