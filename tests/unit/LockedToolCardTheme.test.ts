import fs from "node:fs";
import path from "node:path";

import { createLockedToolCardStyles } from "@/features/personal/tools/LockedToolCard";
import { getThemePalette } from "@/theme/appTheme";

describe("LockedToolCard active palette", () => {
  it.each([
    ["day" as const, "light" as const],
    ["night" as const, "dark" as const]
  ])("uses the %s palette for every locked-tool surface", (mode, systemScheme) => {
    const palette = getThemePalette(mode, systemScheme);
    const styles = createLockedToolCardStyles(palette);

    expect(styles.card).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.danger
      })
    );
    expect(styles.eyebrow.color).toBe(palette.danger);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.description.color).toBe(palette.textSoft);
    expect(styles.capability.color).toBe(palette.danger);
    expect(styles.link.color).toBe(palette.link);
  });

  it("contains no fixed light-theme color literals", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/features/personal/tools/LockedToolCard.tsx"),
      "utf8"
    );

    expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    expect(source).not.toMatch(
      /(?:backgroundColor|borderColor|color):\s*["'](?:white|black)["']/i
    );
  });
});
