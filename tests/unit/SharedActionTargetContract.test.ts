import fs from "fs";
import path from "path";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("shared action target contract", () => {
  it("keeps contextual actions named and at least 44px", () => {
    const contextBar = source("src/components/ContextBar.js");
    expect(contextBar).toContain('accessibilityRole="button"');
    expect(contextBar).toContain("action.accessibilityLabel || action.label");
    expect(contextBar).toMatch(/actionBtn:[\s\S]*?minHeight: 44,[\s\S]*?minWidth: 44/);
  });

  it("keeps the global connection dismiss action at least 44px", () => {
    const banner = source("src/components/GlobalApiStatusBanner.tsx");
    expect(banner).toMatch(
      /accessibilityRole="button"[\s\S]*?accessibilityLabel="Dismiss connection message"/
    );
    expect(banner).toMatch(/dismiss:[\s\S]*?minHeight: 44,[\s\S]*?minWidth: 44/);
  });

  it("keeps inline Forum toggle, reply, retry, and full-page actions at least 44px", () => {
    const discussion = source("src/components/forum/InlineForumDiscussion.tsx");
    for (const styleName of [
      "toggle",
      "primaryAction",
      "secondaryAction",
      "fullPageLink"
    ]) {
      expect(discussion).toMatch(
        new RegExp(`${styleName}:[\\s\\S]*?minHeight: 44,[\\s\\S]*?minWidth: 44`)
      );
    }
  });
});
