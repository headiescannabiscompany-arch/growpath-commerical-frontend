import fs from "fs";
import path from "path";

describe("shared Profile hierarchy", () => {
  it("owns one H1 and structures each account section as H2", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/profile/index.tsx"),
      "utf8"
    );

    expect(source.match(/aria-level=\{1\}/g)).toHaveLength(1);
    expect(source.match(/aria-level=\{2\}/g)).toHaveLength(6);
    expect(source).toMatch(
      /aria-level=\{1\}[\s\S]{0,120}style=\{styles\.headerTitle\}[\s\S]{0,80}Profile/
    );
    [
      "Sign-in email",
      "Plan status",
      "Commercial brand identity",
      "Account type",
      "Session",
      "Privacy and account data"
    ].forEach((heading) => {
      const index = source.indexOf(heading);
      expect(index).toBeGreaterThan(0);
      expect(source.slice(Math.max(0, index - 150), index)).toContain("aria-level={2}");
    });
  });
});
