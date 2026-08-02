import fs from "node:fs";
import path from "node:path";

const readSource = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

const switchBlocks = (source: string) => source.match(/<Switch[\s\S]*?\/>/g) ?? [];
const refreshBlocks = (source: string) =>
  source.match(/<RefreshControl[\s\S]*?\/>/g) ?? [];

describe("live color-scheme controls", () => {
  it.each([
    "src/app/home/notifications/index.tsx",
    "src/app/home/facility/(tabs)/profile.tsx"
  ])("themes every switch in %s", (file) => {
    const blocks = switchBlocks(readSource(file));

    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block).toContain("ios_backgroundColor={palette.surfaceStrong}");
      expect(block).toContain("thumbColor={palette.accentText}");
      expect(block).toContain(
        "trackColor={{ false: palette.surfaceStrong, true: palette.accent }}"
      );
    }
  });

  it.each([
    "src/app/home/facility/(tabs)/inventory.tsx",
    "src/screens/facility/FacilityInventoryItemDetailScreen.tsx",
    "src/app/home/facility/(tabs)/profile.tsx"
  ])("themes every loading and refresh indicator in %s", (file) => {
    const source = readSource(file);
    const blocks = refreshBlocks(source);

    expect(source).not.toMatch(/<ActivityIndicator\s*\/>/);
    expect(source).toContain("<ActivityIndicator color={palette.accent} />");
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block).toContain("tintColor={palette.accent}");
      expect(block).toContain("colors={[palette.accent]}");
      expect(block).toContain("progressBackgroundColor={palette.surface}");
    }
  });
});
