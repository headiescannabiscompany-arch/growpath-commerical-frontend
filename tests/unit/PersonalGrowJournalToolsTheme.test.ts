import fs from "node:fs";
import path from "node:path";

import { createGrowCompareStyles } from "@/app/home/personal/(tabs)/grows/[growId]/compare";
import { createGrowJournalStyles } from "@/app/home/personal/(tabs)/grows/[growId]/journal";
import { createGrowToolsStyles } from "@/app/home/personal/(tabs)/grows/[growId]/tools";
import { createCannabisToolAccessStyles } from "@/app/home/personal/(tabs)/tools/_layout";
import { getThemePalette } from "@/theme/appTheme";

const SOURCE_FILES = [
  "src/app/home/personal/(tabs)/grows/[growId]/journal.tsx",
  "src/app/home/personal/(tabs)/grows/[growId]/compare.tsx",
  "src/app/home/personal/(tabs)/grows/[growId]/tools.tsx",
  "src/app/home/personal/(tabs)/tools/_layout.tsx"
];

describe("Personal grow journal and tools active palette", () => {
  const nightPalette = getThemePalette("night", "dark");
  const dayPalette = getThemePalette("day", "light");

  it("themes journal cards, filters, links, and selected states", () => {
    const styles = createGrowJournalStyles(nightPalette);

    expect(styles.container.backgroundColor).toBe(nightPalette.page);
    expect(styles.card).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.cardText.color).toBe(nightPalette.textSoft);
    expect(styles.cardAction.color).toBe(nightPalette.link);
    expect(styles.chip.backgroundColor).toBe(nightPalette.surface);
    expect(styles.chipOn.backgroundColor).toBe(nightPalette.accent);
    expect(styles.chipTextOn.color).toBe(nightPalette.accentText);
    expect(createGrowJournalStyles(dayPalette).container.backgroundColor).toBe(
      dayPalette.page
    );
  });

  it("themes the comparison route and grow tool workspace in both modes", () => {
    const compare = createGrowCompareStyles(nightPalette);
    const tools = createGrowToolsStyles(nightPalette);

    expect(compare.container.backgroundColor).toBe(nightPalette.page);
    expect(compare.title.color).toBe(nightPalette.text);
    expect(compare.subtitle.color).toBe(nightPalette.textMuted);
    expect(tools.container.backgroundColor).toBe(nightPalette.page);
    expect(tools.card).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(tools.action.backgroundColor).toBe(nightPalette.surface);
    expect(tools.actionText.color).toBe(nightPalette.link);
    expect(tools.recentContext.color).toBe(nightPalette.link);
    expect(createGrowCompareStyles(dayPalette).title.color).toBe(dayPalette.text);
    expect(createGrowToolsStyles(dayPalette).card.backgroundColor).toBe(
      dayPalette.surfaceMuted
    );
  });

  it("themes the complete cannabis-tool access boundary", () => {
    const nightStyles = createCannabisToolAccessStyles(nightPalette);
    const dayStyles = createCannabisToolAccessStyles(dayPalette);

    expect(nightStyles.accessPage.backgroundColor).toBe(nightPalette.page);
    expect(nightStyles.accessNotice).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.warning
      })
    );
    expect(nightStyles.accessTitle.color).toBe(nightPalette.warning);
    expect(nightStyles.accessBody.color).toBe(nightPalette.textSoft);
    expect(nightStyles.accessLink.backgroundColor).toBe(nightPalette.accent);
    expect(nightStyles.accessLink.color).toBe(nightPalette.accentText);
    expect(dayStyles.accessPage.backgroundColor).toBe(dayPalette.page);
  });

  it("keeps the affected routes free of fixed color fallbacks", () => {
    for (const file of SOURCE_FILES) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");

      expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
      expect(source).not.toMatch(
        /(?:backgroundColor|borderColor|color):\s*["'](?:white|black)["']/i
      );
    }
  });
});
