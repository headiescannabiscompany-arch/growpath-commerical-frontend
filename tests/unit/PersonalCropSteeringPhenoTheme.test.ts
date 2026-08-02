import fs from "fs";
import path from "path";

import { createPhenoMatrixStyles } from "@/app/home/personal/(tabs)/tools/pheno-matrix";
import { createCropSteeringProjectStyles } from "@/features/personal/tools/CropSteeringProjectPanel";
import { getThemePalette } from "@/theme/appTheme";

describe("Personal crop steering and pheno matrix themes", () => {
  it("uses the active palette for crop steering surfaces, actions, and feedback", () => {
    const nightPalette = getThemePalette("night", "dark");
    const dayPalette = getThemePalette("day", "light");
    const night = createCropSteeringProjectStyles(nightPalette);
    const day = createCropSteeringProjectStyles(dayPalette);

    expect(night.card).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(night.title.color).toBe(nightPalette.text);
    expect(night.help.color).toBe(nightPalette.textMuted);
    expect(night.projectPill.backgroundColor).toBe(nightPalette.surface);
    expect(night.projectPillSelected.backgroundColor).toBe(nightPalette.accent);
    expect(night.projectPillTextSelected.color).toBe(nightPalette.accentText);
    expect(night.input).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
    expect(night.primaryButton.backgroundColor).toBe(nightPalette.accent);
    expect(night.primaryButtonText.color).toBe(nightPalette.accentText);
    expect(night.historyRow.backgroundColor).toBe(nightPalette.surface);
    expect(night.feedback.color).toBe(nightPalette.success);
    expect(night.feedbackDanger.color).toBe(nightPalette.danger);

    expect(day.card.backgroundColor).toBe(dayPalette.surfaceMuted);
    expect(day.projectPillText.color).toBe(dayPalette.link);
    expect(day.secondaryButton.borderColor).toBe(dayPalette.accent);
  });

  it("uses the active palette for pheno matrix fields, ranking, and lock state", () => {
    const nightPalette = getThemePalette("night", "dark");
    const dayPalette = getThemePalette("day", "light");
    const night = createPhenoMatrixStyles(nightPalette);
    const day = createPhenoMatrixStyles(dayPalette);

    expect(night.container.backgroundColor).toBe(nightPalette.page);
    expect(night.title.color).toBe(nightPalette.text);
    expect(night.subtitle.color).toBe(nightPalette.textMuted);
    expect(night.card).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    for (const input of [
      night.input,
      night.weightInput,
      night.scoreInput,
      night.notesInput
    ]) {
      expect(input).toEqual(
        expect.objectContaining({
          borderColor: nightPalette.border,
          color: nightPalette.text
        })
      );
    }
    expect(night.rankRow).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.accentSoft,
        borderColor: nightPalette.accent
      })
    );
    expect(night.scoreBadge.backgroundColor).toBe(nightPalette.accent);
    expect(night.scoreText.color).toBe(nightPalette.accentText);
    expect(night.lockedCard.borderColor).toBe(nightPalette.danger);
    expect(night.lockedTitle.color).toBe(nightPalette.danger);

    expect(day.container.backgroundColor).toBe(dayPalette.page);
    expect(day.rankTitle.color).toBe(dayPalette.text);
    expect(day.context.color).toBe(dayPalette.link);
  });

  it("keeps every editable field and source color palette-aware", () => {
    const sourceFiles = [
      "src/features/personal/tools/CropSteeringProjectPanel.tsx",
      "src/app/home/personal/(tabs)/tools/crop-steering-project.tsx",
      "src/app/home/personal/(tabs)/tools/pheno-matrix.tsx"
    ];
    const sources = sourceFiles.map((file) =>
      fs.readFileSync(path.join(process.cwd(), file), "utf8")
    );

    for (const source of sources) {
      expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    }

    for (const source of [sources[0], sources[2]]) {
      const fields = source.match(/<TextInput\b/g) || [];
      expect(
        source.match(/placeholderTextColor={palette\.textMuted}/g) || []
      ).toHaveLength(fields.length);
      expect(source.match(/selectionColor={palette\.accent}/g) || []).toHaveLength(
        fields.length
      );
    }
  });
});
