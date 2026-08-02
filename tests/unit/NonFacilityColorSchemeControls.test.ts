import fs from "node:fs";
import path from "node:path";

const readSource = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

const activityIndicatorBlocks = (source: string) =>
  source.match(/<ActivityIndicator[\s\S]*?\/>/g) ?? [];

const refreshControlBlocks = (source: string) =>
  source.match(/<RefreshControl[\s\S]*?\/>/g) ?? [];

describe("non-facility color-scheme controls", () => {
  it.each([
    "src/components/ForumFilters.js",
    "src/components/FollowButton.js",
    "src/components/fieldStudies/FieldObservationGlobe.native.tsx",
    "src/components/LoadingSpinner.tsx"
  ])("uses the active palette instead of fixed colors in %s", (file) => {
    const source = readSource(file);

    expect(source).toContain("useAppTheme");
    expect(source).toContain("palette.");
    expect(source).not.toMatch(/#[\da-f]{3,8}/i);
  });

  it.each([
    "src/app/(commercial)/_layout.tsx",
    "src/app/discover.tsx",
    "src/app/feed/index.tsx",
    "src/app/home/commercial/_layout.tsx",
    "src/app/home/commercial/product-lines.tsx",
    "src/app/home/index.tsx",
    "src/app/home/personal/(tabs)/_layout.tsx",
    "src/app/home/personal/(tabs)/tasks.tsx",
    "src/app/home/personal/(tabs)/tools/ingredient-library.tsx",
    "src/app/home/schedule/index.tsx",
    "src/app/onboarding/create-facility.tsx",
    "src/app/onboarding/guilds.tsx",
    "src/app/onboarding/index.tsx",
    "src/app/onboarding/join-facility.tsx",
    "src/app/onboarding/pick-facility.tsx",
    "src/app/videos/[videoId].tsx",
    "src/app/videos/index.tsx",
    "src/auth/RequireAuth.tsx",
    "src/features/grows/screens/AssignPlantsToGrow.tsx",
    "src/features/grows/screens/StartGrowWizard.tsx",
    "src/features/rooms/screens/FirstSetupRooms.tsx"
  ])("themes every loading indicator in %s", (file) => {
    const blocks = activityIndicatorBlocks(readSource(file));

    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block).toMatch(/color={palette\.[A-Za-z]+}/);
    }
  });

  it.each([
    "src/app/communities/index.tsx",
    "src/app/feed/index.tsx",
    "src/app/home/personal/(tabs)/grows/index.tsx",
    "src/screens/MarketplaceScreen.js"
  ])("themes every pull-to-refresh control in %s", (file) => {
    const blocks = refreshControlBlocks(readSource(file));

    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block).toContain("colors={[palette.accent]}");
      expect(block).toContain("progressBackgroundColor={palette.surface}");
      expect(block).toContain("tintColor={palette.accent}");
    }
  });

  it.each([
    "src/app/(commercial)/_layout.tsx",
    "src/app/home/commercial/_layout.tsx",
    "src/app/home/index.tsx",
    "src/app/home/personal/(tabs)/_layout.tsx"
  ])("keeps entitlement loading surfaces on the active page color in %s", (file) => {
    expect(readSource(file)).toContain("backgroundColor: palette.page");
  });
});
