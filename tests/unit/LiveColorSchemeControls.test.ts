import fs from "node:fs";
import path from "node:path";

const readSource = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

const switchBlocks = (source: string) => source.match(/<Switch[\s\S]*?\/>/g) ?? [];
const activityBlocks = (source: string) =>
  source.match(/<ActivityIndicator[\s\S]*?\/>/g) ?? [];
const refreshBlocks = (source: string) =>
  source.match(/<RefreshControl[\s\S]*?\/>/g) ?? [];

const facilityLoadingFiles = [
  "src/app/home/facility/_layout.tsx",
  "src/app/home/facility/(tabs)/_layout.tsx",
  "src/app/home/facility/(tabs)/analytics.tsx",
  "src/app/home/facility/(tabs)/compliance.tsx",
  "src/app/home/facility/(tabs)/dashboard.tsx",
  "src/app/home/facility/(tabs)/grows.tsx",
  "src/app/home/facility/(tabs)/inventory.tsx",
  "src/app/home/facility/(tabs)/logs.tsx",
  "src/app/home/facility/(tabs)/plants.tsx",
  "src/app/home/facility/(tabs)/profile.tsx",
  "src/app/home/facility/(tabs)/reports.tsx",
  "src/app/home/facility/(tabs)/rooms.tsx",
  "src/app/home/facility/(tabs)/tasks.tsx",
  "src/app/home/facility/(tabs)/team.tsx",
  "src/app/home/facility/(tabs)/transfers.tsx",
  "src/app/home/facility/grows/[id].tsx",
  "src/app/home/facility/logs/[id].tsx",
  "src/app/home/facility/plants/[id].tsx",
  "src/features/facility/routes/FacilitySopRunsIndexRoute.tsx",
  "src/app/home/facility/tasks/[id].tsx",
  "src/screens/facility/FacilityInventoryItemDetailScreen.tsx"
];

const facilityRefreshFiles = [
  "src/app/home/facility/(tabs)/compliance.tsx",
  "src/app/home/facility/(tabs)/dashboard.tsx",
  "src/app/home/facility/(tabs)/grows.tsx",
  "src/app/home/facility/(tabs)/inventory.tsx",
  "src/app/home/facility/(tabs)/logs.tsx",
  "src/app/home/facility/(tabs)/plants.tsx",
  "src/app/home/facility/(tabs)/profile.tsx",
  "src/app/home/facility/(tabs)/reports.tsx",
  "src/app/home/facility/(tabs)/rooms.tsx",
  "src/app/home/facility/(tabs)/tasks.tsx",
  "src/app/home/facility/(tabs)/team.tsx",
  "src/app/home/facility/grows/[id].tsx",
  "src/app/home/facility/logs/[id].tsx",
  "src/app/home/facility/plants/[id].tsx",
  "src/app/home/facility/tasks/[id].tsx",
  "src/screens/facility/FacilityInventoryItemDetailScreen.tsx"
];

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

  it.each(facilityLoadingFiles)("themes every loading indicator in %s", (file) => {
    const source = readSource(file);
    const blocks = activityBlocks(source);

    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block).toContain("color={palette.accent}");
    }
  });

  it.each(facilityRefreshFiles)("themes every refresh indicator in %s", (file) => {
    const blocks = refreshBlocks(readSource(file));

    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block).toContain("tintColor={palette.accent}");
      expect(block).toContain("colors={[palette.accent]}");
      expect(block).toContain("progressBackgroundColor={palette.surface}");
    }
  });
});
