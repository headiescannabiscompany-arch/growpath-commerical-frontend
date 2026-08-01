import fs from "fs";
import path from "path";

describe("Facility dashboard hierarchy", () => {
  it("structures the operational dashboard sections below the shell page heading", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/home/facility/(tabs)/dashboard.tsx"),
      "utf8"
    );

    for (const title of [
      "Operations Live",
      "Learning &amp; community",
      "At a glance",
      "Priority status",
      "Command actions"
    ]) {
      const titleIndex = source.indexOf(title);
      expect(titleIndex).toBeGreaterThan(-1);
      const precedingMarkup = source.slice(Math.max(0, titleIndex - 220), titleIndex);
      expect(precedingMarkup).toContain('accessibilityRole="header"');
      expect(precedingMarkup).toContain("aria-level={2}");
    }

    expect(source.match(/aria-level=\{3\}/g)).toHaveLength(4);
    for (const styleName of ["learningTitle", "tileLabel", "rowTitle"]) {
      const styleIndex = source.indexOf(`styles.${styleName}`);
      const precedingMarkup = source.slice(Math.max(0, styleIndex - 180), styleIndex);
      expect(precedingMarkup).toContain('accessibilityRole="header"');
      expect(precedingMarkup).toContain("aria-level={3}");
    }
  });
});
