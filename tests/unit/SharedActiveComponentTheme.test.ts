import fs from "node:fs";
import path from "node:path";

import { createTokenBalanceStyles } from "@/components/TokenBalanceWidget";
import { createCalendarDateFieldStyles } from "@/components/forms/CalendarDateField";
import { createStyles as createLessonMediaStyles } from "@/components/learning/LessonMediaCard";
import { getThemePalette } from "@/theme/appTheme";

const SOURCE_FILES = {
  calendar: "src/components/forms/CalendarDateField.tsx",
  lessonMedia: "src/components/learning/LessonMediaCard.tsx",
  tokenBalance: "src/components/TokenBalanceWidget.js"
};

describe("active shared component themes", () => {
  it.each([
    ["day", "light"],
    ["night", "dark"]
  ] as const)("uses the %s palette for AI-credit status and actions", (mode, scheme) => {
    const palette = getThemePalette(mode, scheme);
    const styles = createTokenBalanceStyles(palette);

    expect(styles.container).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(styles.containerLow.borderColor).toBe(palette.danger);
    expect(styles.iconContainer).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.border
      })
    );
    expect(styles.bar.backgroundColor).toBe(palette.accent);
    expect(styles.barLow.backgroundColor).toBe(palette.danger);
    expect(styles.description.color).toBe(palette.textMuted);
    expect(styles.syncWarning.color).toBe(palette.warning);
    expect(styles.ctaText.color).toBe(palette.link);
  });

  it.each([
    ["day", "light"],
    ["night", "dark"]
  ] as const)("uses the %s palette for the calendar field and modal", (mode, scheme) => {
    const palette = getThemePalette(mode, scheme);
    const styles = createCalendarDateFieldStyles(palette);

    expect(styles.fieldButton).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(styles.fieldValue.color).toBe(palette.text);
    expect(styles.placeholder.color).toBe(palette.textMuted);
    expect(styles.fieldAction.color).toBe(palette.link);
    expect(styles.panel.backgroundColor).toBe(palette.surface);
    expect(styles.picker).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.dayButtonSelected.backgroundColor).toBe(palette.accent);
    expect(styles.dayTextSelected.color).toBe(palette.accentText);
  });

  it.each([
    ["day", "light"],
    ["night", "dark"]
  ] as const)("uses the %s palette for lesson media states", (mode, scheme) => {
    const palette = getThemePalette(mode, scheme);
    const styles = createLessonMediaStyles(palette);

    expect(styles.card).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(styles.warningBox).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.warning
      })
    );
    expect(styles.consentBox).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.info
      })
    );
    expect(styles.summaryBox.backgroundColor).toBe(palette.accentSoft);
    expect(styles.primaryButton.backgroundColor).toBe(palette.accent);
    expect(styles.primaryButtonText.color).toBe(palette.accentText);
    expect(styles.secondaryButtonText.color).toBe(palette.link);
  });

  it("keeps fixed colors limited to deliberate overlays and video mattes", () => {
    const sources = Object.fromEntries(
      Object.entries(SOURCE_FILES).map(([key, file]) => [
        key,
        fs.readFileSync(path.join(process.cwd(), file), "utf8")
      ])
    );

    expect(sources.tokenBalance).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    expect(sources.calendar.match(/#[0-9a-f]{3,8}|rgba?\([^)]*\)/gi)).toEqual([
      "rgba(15, 23, 42, 0.58)"
    ]);
    expect(sources.lessonMedia.match(/#[0-9a-f]{3,8}|rgba?\([^)]*\)/gi)).toEqual([
      "#020617",
      "#020617",
      "#020617"
    ]);
  });
});
