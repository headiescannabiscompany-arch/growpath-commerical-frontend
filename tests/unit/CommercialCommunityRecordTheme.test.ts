import fs from "node:fs";
import path from "node:path";

import { createCommercialAlertDetailStyles } from "@/app/(commercial)/alerts/[id]";
import { createCommercialLogDetailStyles } from "@/app/(commercial)/logs/[id]";
import { createCommercialCommunityStyles } from "@/app/home/commercial/community";
import { getThemePalette } from "@/theme/appTheme";

const SOURCE_FILES = [
  "src/app/home/commercial/community.tsx",
  "src/app/(commercial)/alerts/[id].tsx",
  "src/app/(commercial)/logs/[id].tsx"
];

describe("Commercial community and record detail active palettes", () => {
  const nightPalette = getThemePalette("night", "dark");
  const dayPalette = getThemePalette("day", "light");

  it("themes Night community fields, metrics, posts, and actions", () => {
    const styles = createCommercialCommunityStyles(nightPalette);

    expect(styles.title.color).toBe(nightPalette.text);
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
    expect(styles.metric).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.postRow).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.primaryAction.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryActionText.color).toBe(nightPalette.accentText);
    expect(styles.action).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.actionText.color).toBe(nightPalette.link);
  });

  it("themes Night alert feedback, cards, metadata, and actions", () => {
    const styles = createCommercialAlertDetailStyles(nightPalette);

    expect(styles.scroll.backgroundColor).toBe(nightPalette.page);
    expect(styles.card).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.card,
        borderColor: nightPalette.border
      })
    );
    expect(styles.cardText.color).toBe(nightPalette.textSoft);
    expect(styles.feedback).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.accentSoft,
        borderColor: nightPalette.success,
        color: nightPalette.success
      })
    );
    expect(styles.primaryBtn.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryText.color).toBe(nightPalette.accentText);
    expect(styles.secondaryBtn).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.secondaryText.color).toBe(nightPalette.link);
    expect(styles.v.color).toBe(nightPalette.text);
  });

  it("themes Night commercial log surfaces, values, and source link", () => {
    const styles = createCommercialLogDetailStyles(nightPalette);

    expect(styles.container.backgroundColor).toBe(nightPalette.page);
    expect(styles.card).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.card,
        borderColor: nightPalette.border
      })
    );
    expect(styles.k.color).toBe(nightPalette.textMuted);
    expect(styles.v.color).toBe(nightPalette.text);
    expect(styles.link.color).toBe(nightPalette.link);
  });

  it("keeps Day mode palette-driven and themes all nine community inputs", () => {
    expect(createCommercialCommunityStyles(dayPalette).input).toEqual(
      expect.objectContaining({
        backgroundColor: dayPalette.surface,
        borderColor: dayPalette.border,
        color: dayPalette.text
      })
    );
    expect(createCommercialAlertDetailStyles(dayPalette).card.backgroundColor).toBe(
      dayPalette.card
    );
    expect(createCommercialLogDetailStyles(dayPalette).link.color).toBe(dayPalette.link);

    const sources = SOURCE_FILES.map((file) =>
      fs.readFileSync(path.join(process.cwd(), file), "utf8")
    );
    const communitySource = sources[0];
    expect(communitySource.match(/<TextInput\b/g) || []).toHaveLength(9);
    expect(communitySource).toContain("placeholderTextColor={palette.textMuted}");
    expect(communitySource).toContain("selectionColor={palette.accent}");

    for (const source of sources) {
      expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
      expect(source).not.toMatch(
        /(?:backgroundColor|borderColor|color):\s*["'](?:white|black)["']/i
      );
    }
  });
});
