import fs from "node:fs";
import path from "node:path";

import { createSpeciesCropIdStyles } from "@/app/home/personal/(tabs)/tools/species-crop-id";
import { createPlantIdentificationResultStyles } from "@/features/personal/tools/PlantIdentificationResultDetails";
import { getThemePalette } from "@/theme/appTheme";

const ROUTE_SOURCE = "src/app/home/personal/(tabs)/tools/species-crop-id.tsx";
const RESULT_SOURCE = "src/features/personal/tools/PlantIdentificationResultDetails.tsx";
const CALCULATOR_SOURCE = "src/features/personal/tools/BackendCalculatorToolScreen.tsx";

describe("Species / Crop Identification active palette", () => {
  const nightPalette = getThemePalette("night", "dark");
  const dayPalette = getThemePalette("day", "light");

  it("themes Night evidence, Field Study, selection, and feedback surfaces", () => {
    const styles = createSpeciesCropIdStyles(nightPalette);

    expect(styles.evidenceTitle.color).toBe(nightPalette.text);
    expect(styles.evidenceGuidance.color).toBe(nightPalette.textMuted);
    expect(styles.fieldStudySection).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.borderSoft
      })
    );
    expect(styles.choiceButton).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border
      })
    );
    expect(styles.choiceButtonSelected.backgroundColor).toBe(nightPalette.accent);
    expect(styles.choiceTextSelected.color).toBe(nightPalette.accentText);
    expect(styles.secondaryButton.borderColor).toBe(nightPalette.accent);
    expect(styles.secondaryButtonText.color).toBe(nightPalette.link);
    expect(styles.fieldStudyError.color).toBe(nightPalette.danger);
  });

  it("themes Night candidate and botanical verification details", () => {
    const styles = createPlantIdentificationResultStyles(nightPalette);

    expect(styles.sectionTitle.color).toBe(nightPalette.text);
    expect(styles.line.color).toBe(nightPalette.textMuted);
    expect(styles.candidate).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border
      })
    );
    expect(styles.candidateTitle.color).toBe(nightPalette.text);
    expect(styles.meta.color).toBe(nightPalette.textMuted);
    expect(styles.verification).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.accentSoft,
        borderColor: nightPalette.borderSoft
      })
    );
  });

  it("keeps Day mode palette-driven and removes fixed light UI colors", () => {
    expect(createSpeciesCropIdStyles(dayPalette).fieldStudySection).toEqual(
      expect.objectContaining({
        backgroundColor: dayPalette.surfaceMuted,
        borderColor: dayPalette.borderSoft
      })
    );
    expect(createPlantIdentificationResultStyles(dayPalette).candidate).toEqual(
      expect.objectContaining({
        backgroundColor: dayPalette.surface,
        borderColor: dayPalette.border
      })
    );

    for (const file of [ROUTE_SOURCE, RESULT_SOURCE]) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
      expect(source).not.toMatch(
        /(?:backgroundColor|borderColor|color):\s*["'](?:white|black)["']/i
      );
    }
  });

  it("themes every shared calculator input placeholder and text selection", () => {
    const source = fs.readFileSync(path.join(process.cwd(), CALCULATOR_SOURCE), "utf8");

    expect(source.match(/<TextInput\b/g) || []).toHaveLength(1);
    expect(source).toContain("placeholderTextColor={palette.textMuted}");
    expect(source).toContain("selectionColor={palette.accent}");
  });
});
