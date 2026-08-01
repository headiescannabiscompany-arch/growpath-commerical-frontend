import fs from "fs";
import path from "path";

import { createCommercialCoursesStyles } from "@/app/home/commercial/courses";
import { createCommercialCourseDetailStyles } from "@/app/home/commercial/courses/[courseId]";
import { getThemePalette } from "@/theme/appTheme";

const ROUTE_FILES = [
  "src/app/home/commercial/courses.tsx",
  "src/app/home/commercial/courses/[courseId].tsx"
];

describe("commercial course Night theme", () => {
  const palette = getThemePalette("night", "dark");

  it("uses the active palette for the course list and quick builder", () => {
    const styles = createCommercialCoursesStyles(palette);

    expect(styles.title.color).toBe(palette.text);
    expect(styles.subtitle.color).toBe(palette.textMuted);
    expect(styles.metric).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.border
      })
    );
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.courseRow).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.border
      })
    );
    expect(styles.action.backgroundColor).toBe(palette.surface);
    expect(styles.actionSelected.backgroundColor).toBe(palette.accent);
    expect(styles.actionTextSelected.color).toBe(palette.accentText);
    expect(styles.warningBox).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.warning
      })
    );
    expect(styles.primaryAction.backgroundColor).toBe(palette.accent);
    expect(styles.primaryActionText.color).toBe(palette.accentText);
  });

  it("uses the active palette for course detail, editing, and lesson states", () => {
    const styles = createCommercialCourseDetailStyles(palette);

    expect(styles.title.color).toBe(palette.text);
    expect(styles.muted.color).toBe(palette.textMuted);
    expect(styles.detailRow).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.border
      })
    );
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.clearButton.backgroundColor).toBe(palette.surface);
    expect(styles.actionSelected.backgroundColor).toBe(palette.accent);
    expect(styles.actionTextSelected.color).toBe(palette.accentText);
    expect(styles.secondaryAction).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.accent
      })
    );
    expect(styles.dangerAction.borderColor).toBe(palette.danger);
    expect(styles.warningBox).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.warning
      })
    );
    expect(styles.row).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.border
      })
    );
  });

  it("keeps every course placeholder palette-aware and removes fixed hex colors", () => {
    ROUTE_FILES.forEach((relativePath) => {
      const source = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
      const textInputs = source.match(/<TextInput[\s\S]*?\/>/g) || [];

      expect(textInputs.length).toBeGreaterThan(0);
      textInputs.forEach((input) => {
        expect(input).toContain("placeholderTextColor={palette.textMuted}");
      });
      expect(source).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    });
  });
});
