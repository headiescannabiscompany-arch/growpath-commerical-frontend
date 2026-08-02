import fs from "node:fs";
import path from "node:path";

import { createCoursesScreenStyles } from "@/screens/CoursesScreen";
import { createForumScreenStyles } from "@/screens/ForumScreen";
import { createTeamScreenStyles } from "@/screens/TeamScreen";
import { getThemePalette } from "@/theme/appTheme";

const SOURCE_FILES = [
  "src/screens/ForumScreen.js",
  "src/screens/CoursesScreen.js",
  "src/screens/TeamScreen.js"
];

describe("mapped personal screen themes", () => {
  const nightPalette = getThemePalette("night", "dark");
  const dayPalette = getThemePalette("day", "light");

  it.each([
    ["Night", nightPalette],
    ["Day", dayPalette]
  ])(
    "themes Forum surfaces, text, filters, and actions in %s mode",
    (_label, palette) => {
      const styles = createForumScreenStyles(palette);

      expect(styles.contextCard).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surfaceMuted,
          borderColor: palette.border
        })
      );
      expect(styles.guildHeader).toEqual(
        expect.objectContaining({
          backgroundColor: palette.hero,
          borderBottomColor: palette.accent
        })
      );
      expect(styles.card).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.border
        })
      );
      expect(styles.categoryChipActive.backgroundColor).toBe(palette.accent);
      expect(styles.categoryChipTextActive.color).toBe(palette.accentText);
      expect(styles.tabRow.backgroundColor).toBe(palette.surfaceMuted);
      expect(styles.filterToggleText.color).toBe(palette.link);
    }
  );

  it.each([
    ["Night", nightPalette],
    ["Day", dayPalette]
  ])(
    "themes Course surfaces, states, actions, and input in %s mode",
    (_label, palette) => {
      const styles = createCoursesScreenStyles(palette);

      expect(styles.container.backgroundColor).toBe(palette.page);
      expect(styles.publicCard).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.border
        })
      );
      expect(styles.builderCard.backgroundColor).toBe(palette.surfaceMuted);
      expect(styles.btn.backgroundColor).toBe(palette.accent);
      expect(styles.btnText.color).toBe(palette.accentText);
      expect(styles.statusText.color).toBe(palette.success);
      expect(styles.draftText.color).toBe(palette.warning);
      expect(styles.error.color).toBe(palette.danger);
      expect(styles.input).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.border,
          color: palette.text
        })
      );
    }
  );

  it.each([
    ["Night", nightPalette],
    ["Day", dayPalette]
  ])("themes Team list, modal, actions, and inputs in %s mode", (_label, palette) => {
    const styles = createTeamScreenStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.memberRow.borderColor).toBe(palette.border);
    expect(styles.memberName.color).toBe(palette.text);
    expect(styles.modalContent).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.saveBtn.backgroundColor).toBe(palette.accent);
    expect(styles.cancelBtn.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.errorText.color).toBe(palette.danger);
  });

  it("keeps routed sources palette-driven and themes refresh/input controls", () => {
    const sources = SOURCE_FILES.map((file) =>
      fs.readFileSync(path.join(process.cwd(), file), "utf8")
    );

    for (const source of sources) {
      expect(source).toContain("useAppTheme");
      expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
      expect(source).not.toMatch(
        /(?:backgroundColor|borderColor|color):\s*["'](?:white|black|crimson)["']/i
      );
    }

    expect(sources[0]).toContain("tintColor={palette.accent}");
    expect(sources[0]).toContain("progressBackgroundColor={palette.surface}");
    expect(sources[1].match(/<TextInput\b/g) || []).toHaveLength(1);
    expect(sources[2].match(/<TextInput\b/g) || []).toHaveLength(2);

    for (const source of sources.slice(1)) {
      expect(source).toContain("placeholderTextColor={palette.textMuted}");
      expect(source).toContain("selectionColor={palette.accent}");
    }

    expect(createForumScreenStyles(nightPalette).card.backgroundColor).not.toBe(
      createForumScreenStyles(dayPalette).card.backgroundColor
    );
    expect(createCoursesScreenStyles(nightPalette).container.backgroundColor).not.toBe(
      createCoursesScreenStyles(dayPalette).container.backgroundColor
    );
    expect(createTeamScreenStyles(nightPalette).modalContent.backgroundColor).not.toBe(
      createTeamScreenStyles(dayPalette).modalContent.backgroundColor
    );
  });
});
