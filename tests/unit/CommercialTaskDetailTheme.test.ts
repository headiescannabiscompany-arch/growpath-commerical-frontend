import fs from "node:fs";
import path from "node:path";

import { createCommercialTaskDetailStyles } from "@/app/(commercial)/tasks/[id]";
import { getThemePalette } from "@/theme/appTheme";

describe("Commercial task detail active palette", () => {
  it.each([
    ["day" as const, "light" as const],
    ["night" as const, "dark" as const]
  ])("uses the %s palette for task details and actions", (mode, systemScheme) => {
    const palette = getThemePalette(mode, systemScheme);
    const styles = createCommercialTaskDetailStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.card).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(styles.feedback).toEqual(
      expect.objectContaining({
        backgroundColor: palette.accentSoft,
        borderColor: palette.success,
        color: palette.success
      })
    );
    expect(styles.badge.backgroundColor).toBe(palette.accentSoft);
    expect(styles.badgeMuted.backgroundColor).toBe(palette.surfaceStrong);
    expect(styles.primaryBtn.backgroundColor).toBe(palette.accent);
    expect(styles.primaryText.color).toBe(palette.accentText);
    expect(styles.secondaryBtn.borderColor).toBe(palette.accent);
    expect(styles.secondaryText.color).toBe(palette.link);
  });

  it("contains no fixed light-theme color literals", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/(commercial)/tasks/[id].tsx"),
      "utf8"
    );

    expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    expect(source).not.toMatch(
      /(?:backgroundColor|borderColor|color):\s*["'](?:white|black)["']/i
    );
  });
});
