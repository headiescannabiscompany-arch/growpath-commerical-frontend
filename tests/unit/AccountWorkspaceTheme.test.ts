import fs from "node:fs";
import path from "node:path";

import { createAccountModeStyles } from "@/app/account/mode";
import { createLoginWorkspaceChoiceStyles } from "@/app/account/workspace";
import { createModeSwitcherStyles } from "@/components/ModeSwitcher";
import { getThemePalette } from "@/theme/appTheme";

const nightPalette = getThemePalette("night", "dark");
const dayPalette = getThemePalette("day", "light");

describe("account workspace active palette", () => {
  it.each([
    ["Night", nightPalette],
    ["Day", dayPalette]
  ])("themes the shared mode selector in %s mode", (_label, palette) => {
    const styles = createModeSwitcherStyles(palette);

    expect(styles.identityPanel).toEqual(
      expect.objectContaining({
        backgroundColor: palette.hero,
        borderColor: palette.border
      })
    );
    expect(styles.identityName.color).toBe(palette.heroText);
    expect(styles.identityMeta.color).toBe(palette.heroMuted);
    expect(styles.selector.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.segmentActive.backgroundColor).toBe(palette.surface);
    expect(styles.segmentText.color).toBe(palette.textMuted);
    expect(styles.segmentTextActive.color).toBe(palette.text);
    expect(styles.card).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(styles.cardActive.borderColor).toBe(palette.accent);
    expect(styles.badge.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.badgeActive.backgroundColor).toBe(palette.accentSoft);
    expect(styles.cardAction.color).toBe(palette.accent);
  });

  it.each([
    ["Night", nightPalette],
    ["Day", dayPalette]
  ])("themes the account mode page in %s mode", (_label, palette) => {
    const styles = createAccountModeStyles(palette);

    expect(styles.kicker.color).toBe(palette.link);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.subtitle.color).toBe(palette.textMuted);
    expect(styles.noteCard).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(styles.noteTitle.color).toBe(palette.text);
    expect(styles.noteText.color).toBe(palette.textMuted);
  });

  it.each([
    ["Night", nightPalette],
    ["Day", dayPalette]
  ])("themes the login workspace chooser in %s mode", (_label, palette) => {
    const styles = createLoginWorkspaceChoiceStyles(palette);

    expect(styles.loadingText.color).toBe(palette.textMuted);
    expect(styles.kicker.color).toBe(palette.link);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.subtitle.color).toBe(palette.textMuted);
  });

  it("keeps every account workspace surface free of fixed color fallbacks", () => {
    const files = [
      "src/components/ModeSwitcher.tsx",
      "src/app/account/mode.tsx",
      "src/app/account/workspace.tsx"
    ];

    for (const file of files) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    }

    const workspaceSource = fs.readFileSync(
      path.join(process.cwd(), "src/app/account/workspace.tsx"),
      "utf8"
    );
    expect(workspaceSource).toContain("<ActivityIndicator color={palette.accent} />");
  });
});
