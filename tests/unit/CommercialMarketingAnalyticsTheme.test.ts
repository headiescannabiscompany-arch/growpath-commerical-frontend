import fs from "node:fs";
import path from "node:path";

import { createCommercialAnalyticsStyles } from "@/app/home/commercial/analytics";
import { createCommercialMarketingStyles } from "@/app/home/commercial/marketing";
import { getThemePalette } from "@/theme/appTheme";

const SOURCE_FILES = [
  "src/app/home/commercial/marketing.tsx",
  "src/app/home/commercial/analytics.tsx"
];

describe("Commercial marketing and analytics active palette", () => {
  const nightPalette = getThemePalette("night", "dark");
  const dayPalette = getThemePalette("day", "light");

  it("themes Night marketing metrics, fields, selectors, rows, and actions", () => {
    const styles = createCommercialMarketingStyles(nightPalette);

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
    expect(styles.lineSelector).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.selectedAction).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.accentSoft,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.row).toEqual(
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
    expect(styles.submit.backgroundColor).toBe(nightPalette.accent);
    expect(styles.submitText.color).toBe(nightPalette.accentText);
    expect(styles.clearButton.borderColor).toBe(nightPalette.danger);
    expect(styles.clearButtonText.color).toBe(nightPalette.danger);
  });

  it("themes Night analytics metrics, breakdowns, empty state, and actions", () => {
    const styles = createCommercialAnalyticsStyles(nightPalette);

    expect(styles.title.color).toBe(nightPalette.text);
    expect(styles.metricCard).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.breakdownBox).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border
      })
    );
    expect(styles.breakdownRow.borderTopColor).toBe(nightPalette.borderSoft);
    expect(styles.emptyNotice).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.success
      })
    );
    expect(styles.outlineButton).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.refreshButton).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.breakdownCount.color).toBe(nightPalette.link);
  });

  it("keeps Day mode palette-driven and themes all fourteen marketing fields", () => {
    expect(createCommercialMarketingStyles(dayPalette).input).toEqual(
      expect.objectContaining({
        backgroundColor: dayPalette.surface,
        borderColor: dayPalette.border,
        color: dayPalette.text
      })
    );
    expect(createCommercialAnalyticsStyles(dayPalette).metricCard).toEqual(
      expect.objectContaining({
        backgroundColor: dayPalette.surfaceMuted,
        borderColor: dayPalette.border
      })
    );

    const sources = SOURCE_FILES.map((file) =>
      fs.readFileSync(path.join(process.cwd(), file), "utf8")
    );
    expect(sources[0].match(/<TextInput\b/g) || []).toHaveLength(14);
    expect(sources[0]).toContain("placeholderTextColor={palette.textMuted}");
    expect(sources[0]).toContain("selectionColor={palette.accent}");
    for (const source of sources) {
      expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
      expect(source).not.toMatch(
        /(?:backgroundColor|borderColor|color):\s*["'](?:white|black)["']/i
      );
    }
  });
});
