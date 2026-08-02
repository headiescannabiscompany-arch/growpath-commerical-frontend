import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Personal grow limit policy", () => {
  test.each([
    [
      "grow list",
      "src/app/home/personal/(tabs)/grows/index.tsx",
      "grows.length < maxGrows"
    ],
    [
      "new grow",
      "src/app/home/personal/(tabs)/grows/new.tsx",
      "existingGrowCount < maxGrows"
    ]
  ])(
    "%s combines write access with the quantitative plan limit",
    (_name, file, countCheck) => {
      const source = read(file);

      expect(source).toContain("hasCreateCapability &&");
      expect(source).not.toContain("hasCreateCapability ||");
      expect(source).toContain(countCheck);
      expect(source).toContain("Free grow limit reached");
      expect(source).toContain(
        "Free includes one active grow. Upgrade to Pro to create up to 10 active grows."
      );
    }
  );

  test("does not misreport a loading failure as a reached grow limit", () => {
    const source = read("src/app/home/personal/(tabs)/grows/index.tsx");

    expect(source).toContain("{error ? (");
    expect(source).toContain('accessibilityLabel="Try loading grows again"');
    expect(source).toContain(
      '<Text style={[styles.ctaText, { color: palette.link }]}>Try again</Text>'
    );
  });
});
