import fs from "node:fs";
import path from "node:path";

import { createCloneRootingStyles } from "@/app/home/personal/(tabs)/tools/clone-rooting";
import { createDryCureGuardStyles } from "@/app/home/personal/(tabs)/tools/dry-cure-guard";
import { createIpmScoutStyles } from "@/app/home/personal/(tabs)/tools/ipm-scout";
import { createTissueCultureStyles } from "@/app/home/personal/(tabs)/tools/tissue-culture";
import { getThemePalette } from "@/theme/appTheme";

const SOURCE_FILES = [
  "src/app/home/personal/(tabs)/tools/dry-cure-guard.tsx",
  "src/app/home/personal/(tabs)/tools/clone-rooting.tsx",
  "src/app/home/personal/(tabs)/tools/tissue-culture.tsx",
  "src/app/home/personal/(tabs)/tools/ipm-scout.tsx"
];

function fieldCount(source: string) {
  const fieldsStart = source.indexOf("fields={[");
  const fieldsEnd = source.indexOf("buildMetrics=", fieldsStart);
  return (source.slice(fieldsStart, fieldsEnd).match(/\bkey:\s*"/g) || []).length;
}

describe("Personal risk tool active palettes", () => {
  const nightPalette = getThemePalette("night", "dark");
  const dayPalette = getThemePalette("day", "light");

  it.each([
    ["Night", nightPalette],
    ["Day", dayPalette]
  ])("themes measurement and evidence guidance in %s", (_name, palette) => {
    const dryCure = createDryCureGuardStyles(palette);
    const cloneRooting = createCloneRootingStyles(palette);
    const tissueCulture = createTissueCultureStyles(palette);
    const ipmScout = createIpmScoutStyles(palette);

    expect(dryCure.measurementCard).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.border
      })
    );
    expect(dryCure.measurementTitle.color).toBe(palette.text);
    expect(dryCure.measurementText.color).toBe(palette.textMuted);
    expect(dryCure.measurementWarning.color).toBe(palette.warning);

    for (const styles of [cloneRooting, tissueCulture]) {
      expect(styles.guidanceCard).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surfaceMuted,
          borderColor: palette.border
        })
      );
      expect(styles.guidanceTitle.color).toBe(palette.text);
      expect(styles.guidanceText.color).toBe(palette.textMuted);
      expect(styles.guidanceWarning.color).toBe(palette.warning);
    }

    expect(ipmScout.evidenceTitle.color).toBe(palette.text);
    expect(ipmScout.evidenceGuidance.color).toBe(palette.textMuted);
  });

  it("keeps all 122 active risk-tool fields and source colors palette-aware", () => {
    const sources = SOURCE_FILES.map((file) =>
      fs.readFileSync(path.join(process.cwd(), file), "utf8")
    );
    const backendSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/features/personal/tools/BackendCalculatorToolScreen.tsx"
      ),
      "utf8"
    );

    expect(sources.map(fieldCount)).toEqual([15, 24, 67, 16]);
    expect(sources.map(fieldCount).reduce((sum, count) => sum + count, 0)).toBe(122);

    expect(backendSource).toContain("placeholderTextColor={palette.textMuted}");
    expect(backendSource).toContain("selectionColor={palette.accent}");
    expect(backendSource).toContain("styles.optionCardOn");

    for (const source of sources) {
      expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
      expect(source).not.toMatch(
        /(?:backgroundColor|borderColor|color):\s*["'](?:white|black)["']/i
      );
    }
  });
});
