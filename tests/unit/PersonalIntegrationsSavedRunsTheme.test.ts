import fs from "node:fs";
import path from "node:path";

import { createDataIntegrationsStyles } from "@/app/home/personal/(tabs)/tools/integrations";
import { createSavedToolRunsStyles } from "@/app/home/personal/(tabs)/tools/saved-runs";
import { getThemePalette } from "@/theme/appTheme";

const SOURCE_FILES = [
  "src/app/home/personal/(tabs)/tools/integrations.tsx",
  "src/app/home/personal/(tabs)/tools/saved-runs.tsx"
];

describe("Personal integrations and saved runs active palette", () => {
  const nightPalette = getThemePalette("night", "dark");
  const dayPalette = getThemePalette("day", "light");

  it("themes Data Integrations and Growlink surfaces, fields, states, and actions", () => {
    const styles = createDataIntegrationsStyles(nightPalette);

    expect(styles.screen.backgroundColor).toBe(nightPalette.page);
    expect(styles.center.backgroundColor).toBe(nightPalette.page);
    expect(styles.container.backgroundColor).toBe(nightPalette.page);
    expect(styles.title.color).toBe(nightPalette.text);
    expect(styles.growlinkPanel).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.provider.backgroundColor).toBe(nightPalette.surface);
    expect(styles.controllerOption.backgroundColor).toBe(nightPalette.surface);
    expect(styles.controllerSelected).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.accentSoft,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.importPreview).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.accentSoft,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
    expect(styles.button).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.buttonText.color).toBe(nightPalette.link);
    expect(styles.primaryButton.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryText.color).toBe(nightPalette.accentText);
  });

  it("themes Saved Tool Runs filters, selection, cards, fields, and actions", () => {
    const styles = createSavedToolRunsStyles(nightPalette);

    expect(styles.screen.backgroundColor).toBe(nightPalette.page);
    expect(styles.title.color).toBe(nightPalette.text);
    expect(styles.chip.backgroundColor).toBe(nightPalette.surface);
    expect(styles.chipOn).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.accent,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.selectedResult).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.accentSoft,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.card.backgroundColor).toBe(nightPalette.surfaceMuted);
    expect(styles.cardOn.backgroundColor).toBe(nightPalette.accentSoft);
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
    expect(styles.primary.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryText.color).toBe(nightPalette.accentText);
  });

  it("keeps Day mode palette-driven and themes all eight text fields", () => {
    expect(createDataIntegrationsStyles(dayPalette).container.backgroundColor).toBe(
      dayPalette.page
    );
    expect(createDataIntegrationsStyles(dayPalette).input).toEqual(
      expect.objectContaining({
        backgroundColor: dayPalette.surface,
        borderColor: dayPalette.border,
        color: dayPalette.text
      })
    );
    expect(createSavedToolRunsStyles(dayPalette).card.backgroundColor).toBe(
      dayPalette.surfaceMuted
    );
    expect(createSavedToolRunsStyles(dayPalette).input.color).toBe(dayPalette.text);

    const sources = SOURCE_FILES.map((file) =>
      fs.readFileSync(path.join(process.cwd(), file), "utf8")
    );
    expect(sources[0].match(/<TextInput\b/g) || []).toHaveLength(6);
    expect(sources[1].match(/<TextInput\b/g) || []).toHaveLength(2);
    for (const source of sources) {
      const inputCount = (source.match(/<TextInput\b/g) || []).length;
      expect(
        source.match(/placeholderTextColor={palette\.textMuted}/g) || []
      ).toHaveLength(inputCount);
      expect(source.match(/selectionColor={palette\.accent}/g) || []).toHaveLength(
        inputCount
      );
      expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
      expect(source).not.toMatch(
        /(?:backgroundColor|borderColor|color):\s*["'](?:white|black)["']/i
      );
    }
  });
});
