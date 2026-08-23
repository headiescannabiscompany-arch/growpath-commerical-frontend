import fs from "node:fs";
import path from "node:path";

import { createForumPostDetailStyles } from "@/app/home/personal/(tabs)/forum/post/[id]";
import { getThemePalette } from "@/theme/appTheme";

const ROUTE_FILE = "src/app/home/personal/(tabs)/forum/post/[id].tsx";
const IMAGE_FILE = "src/components/forum/ExpandableForumImage.tsx";

describe.each([
  ["Day", getThemePalette("day", "light")],
  ["Night", getThemePalette("night", "dark")]
])("Forum post detail %s theme", (_label, palette) => {
  it("uses the active palette for the page, content, actions, and status state", () => {
    const styles = createForumPostDetailStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.unavailablePage.backgroundColor).toBe(palette.page);
    expect(styles.card).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(styles.title.color).toBe(palette.text);
    expect(styles.body.color).toBe(palette.textMuted);
    expect(styles.meta.color).toBe(palette.textMuted);
    expect(styles.tag).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.border,
        color: palette.accent
      })
    );
    expect(styles.postPhoto.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.commentPhoto.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.comment.borderTopColor).toBe(palette.border);
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.primaryBtn.backgroundColor).toBe(palette.accent);
    expect(styles.primaryText.color).toBe(palette.accentText);
    expect(styles.secondaryBtn).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.accent
      })
    );
    expect(styles.secondaryText.color).toBe(palette.accent);
    expect(styles.dangerBtn).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.danger
      })
    );
    expect(styles.feedback).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        color: palette.danger
      })
    );
  });
});

describe("Forum post detail theme source guards", () => {
  it("themes every input, pull-to-refresh, and route color", () => {
    const source = fs.readFileSync(path.join(process.cwd(), ROUTE_FILE), "utf8");
    const textInputs = source.match(/<TextInput[\s\S]*?\/>/g) || [];

    expect(textInputs).toHaveLength(4);
    textInputs.forEach((input) => {
      expect(input).toContain("placeholderTextColor={palette.textMuted}");
      expect(input).toContain("selectionColor={palette.accent}");
    });
    expect(source).toContain("colors={[palette.accent]}");
    expect(source).toContain("tintColor={palette.accent}");
    expect(source).toContain("progressBackgroundColor={palette.surface}");
    expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    expect(source).not.toMatch(
      /(?:backgroundColor|borderColor|color):\s*["'](?:white|black)["']/i
    );
  });

  it("keeps the directly rendered expandable image palette-aware", () => {
    const source = fs.readFileSync(path.join(process.cwd(), IMAGE_FILE), "utf8");

    expect(source).toContain("backgroundColor: palette.surfaceMuted");
    expect(source).toContain("backgroundColor: palette.surfaceStrong");
    expect(source).toContain("borderColor: palette.border");
    expect(source).toContain("color: palette.textMuted");
    expect(source).not.toMatch(/#[0-9a-f]{3,8}/i);
  });
});
