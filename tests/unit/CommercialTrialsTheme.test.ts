import fs from "node:fs";
import path from "node:path";

import { createCommercialTrialDetailStyles } from "@/app/home/commercial/trials/[trialId]";
import { createCommercialTrialsStyles } from "@/app/home/commercial/trials";
import { getThemePalette } from "@/theme/appTheme";

const SOURCE_FILES = [
  "src/app/home/commercial/trials.tsx",
  "src/app/home/commercial/trials/[trialId].tsx"
];

describe("Commercial product trials active palette", () => {
  const nightPalette = getThemePalette("night", "dark");
  const dayPalette = getThemePalette("day", "light");

  it("themes Night trial fields, record pickers, rows, actions, and feedback", () => {
    const styles = createCommercialTrialsStyles(nightPalette);

    expect(styles.title.color).toBe(nightPalette.text);
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
    expect(styles.selectedButton).toEqual(
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
    expect(styles.outlineButton).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.primaryButton.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryText.color).toBe(nightPalette.accentText);
    expect(styles.feedback.color).toBe(nightPalette.success);
  });

  it("themes Night detail fields, evidence panels, claim states, and actions", () => {
    const styles = createCommercialTrialDetailStyles(nightPalette);

    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
    expect(styles.detailRow).toEqual(
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
    expect(styles.statusPill).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.warning,
        color: nightPalette.warning
      })
    );
    expect(styles.readyPill).toEqual(
      expect.objectContaining({
        borderColor: nightPalette.success,
        color: nightPalette.success
      })
    );
    expect(styles.warningBox).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.warning
      })
    );
    expect(styles.warningText.color).toBe(nightPalette.warning);
    expect(styles.success.color).toBe(nightPalette.success);
    expect(styles.primaryAction.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryActionText.color).toBe(nightPalette.accentText);
  });

  it("keeps Day mode palette-driven and themes all eighteen editable fields", () => {
    expect(createCommercialTrialsStyles(dayPalette).input).toEqual(
      expect.objectContaining({
        backgroundColor: dayPalette.surface,
        borderColor: dayPalette.border,
        color: dayPalette.text
      })
    );
    expect(createCommercialTrialDetailStyles(dayPalette).warningBox.borderColor).toBe(
      dayPalette.warning
    );

    const sources = SOURCE_FILES.map((file) =>
      fs.readFileSync(path.join(process.cwd(), file), "utf8")
    );
    expect(sources[0].match(/<TextInput\b/g) || []).toHaveLength(11);
    expect(sources[1].match(/<TextInput\b/g) || []).toHaveLength(8);
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
