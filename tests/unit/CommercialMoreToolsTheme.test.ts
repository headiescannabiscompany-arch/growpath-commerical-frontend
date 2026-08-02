import fs from "node:fs";
import path from "node:path";

import { createCommercialMoreStyles } from "@/app/home/commercial/more";
import { createCommercialToolLibraryStyles } from "@/app/home/commercial/tools/library";
import { getThemePalette } from "@/theme/appTheme";

const SOURCE_FILES = [
  "src/app/home/commercial/more.tsx",
  "src/app/home/commercial/tools/library.tsx"
];

describe("Commercial overflow and tool-library active palette", () => {
  const nightPalette = getThemePalette("night", "dark");
  const dayPalette = getThemePalette("day", "light");

  it("themes Night overflow destinations, headings, and actions", () => {
    const styles = createCommercialMoreStyles(nightPalette);

    expect(styles.destination).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border
      })
    );
    expect(styles.destinationTitle.color).toBe(nightPalette.text);
    expect(styles.destinationDescription.color).toBe(nightPalette.textMuted);
    expect(styles.destinationAction.color).toBe(nightPalette.link);
    expect(styles.groupTitle.color).toBe(nightPalette.text);
    expect(styles.title.color).toBe(nightPalette.text);
    expect(styles.subtitle.color).toBe(nightPalette.textMuted);
  });

  it("themes Night tool-library content and primary actions", () => {
    const styles = createCommercialToolLibraryStyles(nightPalette);

    expect(styles.title.color).toBe(nightPalette.text);
    expect(styles.subtitle.color).toBe(nightPalette.textMuted);
    expect(styles.cardTitle.color).toBe(nightPalette.text);
    expect(styles.description.color).toBe(nightPalette.textMuted);
    expect(styles.button.backgroundColor).toBe(nightPalette.accent);
    expect(styles.buttonText.color).toBe(nightPalette.accentText);
  });

  it("keeps Day mode palette-driven and the route inventory unchanged", () => {
    expect(createCommercialMoreStyles(dayPalette).destination).toEqual(
      expect.objectContaining({
        backgroundColor: dayPalette.surface,
        borderColor: dayPalette.border
      })
    );
    expect(createCommercialToolLibraryStyles(dayPalette).button).toEqual(
      expect.objectContaining({ backgroundColor: dayPalette.accent })
    );

    const sources = SOURCE_FILES.map((file) =>
      fs.readFileSync(path.join(process.cwd(), file), "utf8")
    );
    expect(sources[0]).toContain("accessibilityLabel={`Open ${label}`}");
    expect(sources[1].match(/\/home\/commercial\/tools\//g) || []).toHaveLength(4);
    for (const source of sources) {
      expect(source).toContain("useAppTheme");
      expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
      expect(source).not.toMatch(
        /(?:backgroundColor|borderColor|color):\s*["'](?:white|black)["']/i
      );
    }
  });
});
