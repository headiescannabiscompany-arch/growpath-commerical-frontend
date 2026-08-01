import fs from "fs";
import path from "path";

describe("Facility profile hierarchy", () => {
  it("structures profile and appearance sections below the shell page heading", () => {
    const profile = fs.readFileSync(
      path.join(process.cwd(), "src/app/home/facility/(tabs)/profile.tsx"),
      "utf8"
    );
    const themeSelector = fs.readFileSync(
      path.join(process.cwd(), "src/components/ThemeModeSelector.tsx"),
      "utf8"
    );

    for (const title of [
      "Operational facility identity",
      "Facility",
      "Notification settings",
      "Account",
      "AI usage",
      "Facility setup"
    ]) {
      expect(profile).toMatch(
        new RegExp(
          `accessibilityRole="header"[\\s\\S]{0,120}aria-level=\\{2\\}[\\s\\S]{0,180}>\\s*${title}\\s*<`
        )
      );
    }

    const appearanceIndex = themeSelector.indexOf("Day, night, or auto");
    expect(themeSelector.slice(appearanceIndex - 220, appearanceIndex)).toContain(
      "aria-level={2}"
    );
    const autoIndex = themeSelector.indexOf("Auto theme behavior");
    expect(themeSelector.slice(autoIndex - 220, autoIndex)).toContain("aria-level={3}");
  });
});
