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

  it("keeps shared follow and record-row actions named, busy-safe, and themed", () => {
    const follow = source("src/components/FollowButton.js");
    expect(follow).toContain('accessibilityRole="button"');
    expect(follow).toContain('following ? "Unfollow user" : "Follow user"');
    expect(follow).toContain("accessibilityState={{ busy, disabled: busy }}");
    expect(follow).toMatch(/minHeight: 44,[\s\S]*?minWidth: 44/);

    const inventory = source("src/components/InventoryRow.tsx");
    expect(inventory).toContain("Edit inventory item ${item.name}");
    expect(inventory).toMatch(/editBtn:[\s\S]*?minHeight: 44,[\s\S]*?minWidth: 44/);
    expect(inventory).toContain("palette.accent");

    const room = source("src/components/RoomCard.tsx");
    expect(room).toContain("Open facility room ${room.name}");
    expect(room).toContain("backgroundColor: palette.surface");
    expect(room).not.toContain('backgroundColor: "#fff"');

    const task = source("src/components/TaskRow.js");
    expect(task).toContain("Open task ${task.title}");
    expect(task).toContain("backgroundColor: palette.surface");
    expect(task).not.toContain('backgroundColor: "#fff"');
  });

  it("keeps the active Grow Interest picker readable and touch accessible", () => {
    const picker = source("src/components/GrowInterestPicker.js");
    expect(picker).toContain('expanded ? "▲" : "▼"');
    expect(picker).toMatch(/headerRow:[\s\S]*?minHeight: 44/);
    expect(picker).toMatch(/chip:[\s\S]*?minHeight: 44,[\s\S]*?minWidth: 44/);
    expect(picker).toContain('accessibilityRole="checkbox"');
  });
});
