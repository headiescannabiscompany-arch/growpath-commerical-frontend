import fs from "node:fs";
import path from "node:path";

import { createStyles as createLessonMediaStyles } from "@/components/learning/LessonMediaSourceEditor";
import { createCourseStyles } from "@/screens/commercial/CreateCourseScreen";
import { getThemePalette } from "@/theme/appTheme";

const COURSE_SOURCE = "src/screens/commercial/CreateCourseScreen.js";
const CHILD_SOURCES = [
  "src/components/forms/CalendarDateField.tsx",
  "src/components/GrowInterestPicker.js",
  "src/components/learning/LessonMediaSourceEditor.tsx",
  "src/components/feed/FeedBanner.tsx"
];

describe("Create Course active palette", () => {
  const nightPalette = getThemePalette("night", "dark");
  const dayPalette = getThemePalette("day", "light");

  it("themes every Night course-builder surface, field, action, and status", () => {
    const styles = createCourseStyles(nightPalette);

    expect(styles.sectionCard).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border
      })
    );
    expect(styles.workflowCard).toEqual(
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
    expect(styles.integrationCard).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.button.backgroundColor).toBe(nightPalette.accent);
    expect(styles.buttonText.color).toBe(nightPalette.accentText);
    expect(styles.secondaryButton).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.readyText.color).toBe(nightPalette.success);
    expect(styles.integrationMessage.color).toBe(nightPalette.info);
  });

  it("keeps Day mode and the lesson media editor palette-driven", () => {
    const courseStyles = createCourseStyles(dayPalette);
    const lessonStyles = createLessonMediaStyles(nightPalette);

    expect(courseStyles.coverPreview.backgroundColor).toBe(dayPalette.surfaceMuted);
    expect(courseStyles.pricingModeButtonActive).toEqual(
      expect.objectContaining({
        backgroundColor: dayPalette.accentSoft,
        borderColor: dayPalette.accent
      })
    );
    expect(lessonStyles.card).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border
      })
    );
    expect(lessonStyles.input).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
  });

  it("themes all course and lesson-media placeholders and selections without fixed light colors", () => {
    const courseSource = fs.readFileSync(path.join(process.cwd(), COURSE_SOURCE), "utf8");
    const courseInputs = courseSource.match(/<TextInput[\s\S]*?\/>/g) || [];
    expect(courseInputs).toHaveLength(17);
    courseInputs.forEach((input) => {
      expect(input).toContain("placeholderTextColor={palette.textMuted}");
      expect(input).toContain("selectionColor={palette.accent}");
    });

    const childSources = CHILD_SOURCES.map((file) => ({
      file,
      source: fs.readFileSync(path.join(process.cwd(), file), "utf8")
    }));
    const lessonSource = childSources.find(
      ({ file }) => file === "src/components/learning/LessonMediaSourceEditor.tsx"
    )?.source;
    const lessonInputs = lessonSource?.match(/<TextInput[\s\S]*?\/>/g) || [];
    expect(lessonInputs).toHaveLength(5);
    lessonInputs.forEach((input) => {
      expect(input).toContain("placeholderTextColor={palette.textMuted}");
      expect(input).toContain("selectionColor={palette.accent}");
    });

    expect(courseSource).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    childSources.forEach(({ file, source }) => {
      expect(source).toContain("useAppTheme");
      expect(source).not.toMatch(/#[0-9a-f]{3,8}/i);
      if (!file.endsWith("CalendarDateField.tsx")) {
        expect(source).not.toMatch(/rgba?\(/i);
      }
    });
  });
});
