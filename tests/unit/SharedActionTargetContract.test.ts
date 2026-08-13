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

  it("keeps tappable cards and shared retry actions named", () => {
    const card = source("src/components/layout/AppCard.tsx");
    expect(card).toMatch(
      /<TouchableOpacity[\s\S]*?accessibilityRole="button"[\s\S]*?accessibilityLabel={accessibilityLabel \|\| title \|\| "Open card"}/
    );

    const inlineError = source("src/components/InlineError.tsx");
    expect(inlineError).toContain('Retry ${String(title || "request").toLowerCase()}');
    expect(inlineError).toMatch(/retryBtn:[\s\S]*?minHeight: 44,[\s\S]*?minWidth: 44/);

    const errorState = source("src/components/ErrorState.js");
    expect(errorState).toMatch(
      /accessibilityRole="button"[\s\S]*?accessibilityLabel={retryLabel}/
    );
    expect(errorState).toMatch(/retryBtn:[\s\S]*?minHeight: 44,[\s\S]*?minWidth: 44/);
  });
});
