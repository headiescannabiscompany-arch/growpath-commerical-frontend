import fs from "node:fs";
import path from "node:path";

import { createCommercialBatchDetailStyles } from "@/app/home/commercial/batch-planner/[batchId]";
import { createCommercialBatchPlannerStyles } from "@/app/home/commercial/batch-planner";
import { getThemePalette } from "@/theme/appTheme";

const SOURCE_FILES = [
  "src/app/home/commercial/batch-planner.tsx",
  "src/app/home/commercial/batch-planner/[batchId].tsx"
];

describe("Commercial batch planner active palette", () => {
  const nightPalette = getThemePalette("night", "dark");
  const dayPalette = getThemePalette("day", "light");

  it("themes Night batch metrics, fields, record pickers, rows, and actions", () => {
    const styles = createCommercialBatchPlannerStyles(nightPalette);

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
    expect(styles.recordPicker).toEqual(
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
    expect(styles.batchRow).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.actionText.color).toBe(nightPalette.link);
    expect(styles.primaryAction.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryActionText.color).toBe(nightPalette.accentText);
  });

  it("themes Night batch detail panels, fields, warnings, and feedback", () => {
    const styles = createCommercialBatchDetailStyles(nightPalette);

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
    expect(styles.warningText.color).toBe(nightPalette.warning);
    expect(styles.success.color).toBe(nightPalette.success);
    expect(styles.primaryAction.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryActionText.color).toBe(nightPalette.accentText);
  });

  it("keeps Day mode palette-driven and themes all twenty-two inputs", () => {
    expect(createCommercialBatchPlannerStyles(dayPalette).input).toEqual(
      expect.objectContaining({
        backgroundColor: dayPalette.surface,
        borderColor: dayPalette.border,
        color: dayPalette.text
      })
    );
    expect(createCommercialBatchDetailStyles(dayPalette).detailRow.backgroundColor).toBe(
      dayPalette.surfaceMuted
    );

    const sources = SOURCE_FILES.map((file) =>
      fs.readFileSync(path.join(process.cwd(), file), "utf8")
    );
    expect(sources[0].match(/<TextInput\b/g) || []).toHaveLength(15);
    expect(sources[1].match(/<TextInput\b/g) || []).toHaveLength(7);
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
