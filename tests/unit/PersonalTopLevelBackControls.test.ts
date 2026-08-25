import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Personal top-level back controls", () => {
  test.each([
    ["grows", "src/app/home/personal/(tabs)/grows/index.tsx"],
    ["AI tools", "src/app/home/personal/(tabs)/tools/index.tsx"],
    ["forum", "src/app/home/personal/(tabs)/community.tsx"],
    ["profile", "src/app/home/personal/(tabs)/profile/index.tsx"]
  ])("keeps a shared Back control on %s", (_name, relativePath) => {
    const source = read(relativePath);

    expect(source).toContain('import BackButton from "@/components/nav/BackButton"');
    if (_name === "grows") {
      expect(source).toContain("const basePath = `/home/${workspace}`");
      expect(source).toContain("<BackButton fallbackHref={basePath} />");
      expect(source).toContain("listWorkspaceGrows,");
      expect(source).toContain("type GrowWorkspace");
      expect(source).toContain('from "@/features/grows/workspaceData"');
    } else {
      expect(source).toContain('<BackButton fallbackHref="/home/personal" />');
    }
  });

  test("keeps a shared Back control on the personal course catalog", () => {
    const source = read("src/app/home/personal/(tabs)/courses.tsx");

    expect(source).toContain("<ScreenBoundary");
    expect(source).toContain('backFallbackHref="/home/personal"');
  });

  test.each([
    ["Field Studies", "src/app/home/personal/(tabs)/field-studies/index.tsx"],
    ["Task Center", "src/app/home/personal/(tabs)/tasks.tsx"]
  ])("keeps a shared Back control on %s", (_name, relativePath) => {
    const source = read(relativePath);

    expect(source).toContain('import BackButton from "@/components/nav/BackButton"');
    expect(source).toContain('<BackButton fallbackHref="/home/personal/more" />');
  });

  test("keeps a universal Back control on the public Nature map", () => {
    const source = read("src/app/field-observations/index.tsx");

    expect(source).toContain('import BackButton from "@/components/nav/BackButton"');
    expect(source).toContain('<BackButton fallbackHref="/account/workspace" />');
  });
});
