import fs from "node:fs";
import path from "node:path";

import { createPersonalCommunityStyles } from "@/app/home/personal/(tabs)/community";
import { createPersonalForumStyles } from "@/app/home/personal/(tabs)/forum";
import { getThemePalette } from "@/theme/appTheme";

const SOURCE_FILES = [
  "src/app/home/personal/(tabs)/forum/index.tsx",
  "src/app/home/personal/(tabs)/community.tsx",
  "src/components/forum/InlineForumDiscussion.tsx"
];

describe("Personal Forum and community active palettes", () => {
  const nightPalette = getThemePalette("night", "dark");
  const dayPalette = getThemePalette("day", "light");

  it("themes the Night Forum feed, media, actions, filters, and error state", () => {
    const styles = createPersonalForumStyles(nightPalette);

    expect(styles.container.backgroundColor).toBe(nightPalette.page);
    expect(styles.title.color).toBe(nightPalette.heroText);
    expect(styles.card).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border
      })
    );
    expect(styles.videoStat).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.composer).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.accentSoft,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.scopeBtnActive).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.accentSoft,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.primaryBtn.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryText.color).toBe(nightPalette.accentText);
    expect(styles.secondaryBtn).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.secondaryText.color).toBe(nightPalette.link);
    expect(styles.photoThumb.backgroundColor).toBe(nightPalette.surfaceMuted);
    expect(styles.errorCard).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.danger
      })
    );
  });

  it("themes the Night community hero, posts, groups, media, and actions", () => {
    const styles = createPersonalCommunityStyles(nightPalette);

    expect(styles.container.backgroundColor).toBe(nightPalette.page);
    expect(styles.hero).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.hero,
        borderColor: nightPalette.border
      })
    );
    expect(styles.pulse).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.composer).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border
      })
    );
    expect(styles.postCard).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border
      })
    );
    expect(styles.postImage).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.tag).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.accentSoft,
        borderColor: nightPalette.border,
        color: nightPalette.accent
      })
    );
    expect(styles.row.borderTopColor).toBe(nightPalette.border);
    expect(styles.primaryBtn.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryText.color).toBe(nightPalette.accentText);
    expect(styles.secondaryBtn.backgroundColor).toBe(nightPalette.surfaceMuted);
    expect(styles.cta.color).toBe(nightPalette.link);
  });

  it("keeps Day mode palette-driven and themes the shared reply input", () => {
    const forumStyles = createPersonalForumStyles(dayPalette);
    const communityStyles = createPersonalCommunityStyles(dayPalette);

    expect(forumStyles.card.backgroundColor).toBe(dayPalette.surface);
    expect(forumStyles.scopeBtnActive.backgroundColor).toBe(dayPalette.accentSoft);
    expect(communityStyles.hero.backgroundColor).toBe(dayPalette.hero);
    expect(communityStyles.discoveryCard.backgroundColor).toBe(dayPalette.surfaceMuted);

    for (const file of SOURCE_FILES.slice(0, 2)) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source.match(/<TextInput\b/g) || []).toHaveLength(0);
      expect(source).toContain("tintColor={palette.accent}");
      expect(source).toContain("progressBackgroundColor={palette.surface}");
    }

    const discussionSource = fs.readFileSync(
      path.join(process.cwd(), SOURCE_FILES[2]),
      "utf8"
    );
    expect(discussionSource.match(/<TextInput\b/g) || []).toHaveLength(1);
    expect(discussionSource).toContain("placeholderTextColor={palette.textMuted}");
    expect(discussionSource).toContain("selectionColor={palette.accent}");

    for (const file of SOURCE_FILES) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
      expect(source).not.toMatch(
        /(?:backgroundColor|borderColor|color):\s*["'](?:white|black)["']/i
      );
    }
  });
});
