import fs from "fs";
import path from "path";

import { createGrowAutomationStyles } from "@/app/home/personal/(tabs)/grows/[growId]/automation";
import { createGrowOverviewStyles } from "@/app/home/personal/(tabs)/grows/[growId]";
import { createGrowPlantsStyles } from "@/app/home/personal/(tabs)/grows/[growId]/plants";
import { createGrowTasksStyles } from "@/app/home/personal/(tabs)/grows/[growId]/tasks";
import { createGrowTimelineStyles } from "@/app/home/personal/(tabs)/grows/[growId]/timeline";
import { createGrowWorkspaceNavStyles } from "@/components/personal/GrowWorkspaceNav";
import { getThemePalette } from "@/theme/appTheme";

const nightPalette = getThemePalette("night", "dark");
const dayPalette = getThemePalette("day", "light");

describe("Personal grow workspace active palette", () => {
  it("themes the grow overview in Night and Day modes", () => {
    const nightStyles = createGrowOverviewStyles(nightPalette);
    const dayStyles = createGrowOverviewStyles(dayPalette);

    expect(nightStyles.container.backgroundColor).toBe(nightPalette.page);
    expect(nightStyles.panel).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(nightStyles.stat.backgroundColor).toBe(nightPalette.surface);
    expect(nightStyles.action.backgroundColor).toBe(nightPalette.surface);
    expect(nightStyles.actionText.color).toBe(nightPalette.link);
    expect(nightStyles.error.color).toBe(nightPalette.danger);
    expect(dayStyles.container.backgroundColor).toBe(dayPalette.page);
    expect(dayStyles.panel.backgroundColor).toBe(dayPalette.surfaceMuted);
    expect(dayStyles.statValue.color).toBe(dayPalette.text);
  });

  it("themes timeline filters, events, source actions, tags, and empty states", () => {
    const nightStyles = createGrowTimelineStyles(nightPalette);
    const dayStyles = createGrowTimelineStyles(dayPalette);

    expect(nightStyles.container.backgroundColor).toBe(nightPalette.page);
    expect(nightStyles.filter.backgroundColor).toBe(nightPalette.surface);
    expect(nightStyles.filterActive.backgroundColor).toBe(nightPalette.accent);
    expect(nightStyles.filterTextActive.color).toBe(nightPalette.accentText);
    expect(nightStyles.event).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(nightStyles.sourceActionText.color).toBe(nightPalette.link);
    expect(nightStyles.tag.backgroundColor).toBe(nightPalette.accentSoft);
    expect(nightStyles.empty.backgroundColor).toBe(nightPalette.surfaceMuted);
    expect(dayStyles.container.backgroundColor).toBe(dayPalette.page);
    expect(dayStyles.eventTitle.color).toBe(dayPalette.text);
  });

  it("themes automation cards, actions, statuses, and failures", () => {
    const nightStyles = createGrowAutomationStyles(nightPalette);
    const dayStyles = createGrowAutomationStyles(dayPalette);

    expect(nightStyles.container.backgroundColor).toBe(nightPalette.page);
    expect(nightStyles.card).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(nightStyles.button.backgroundColor).toBe(nightPalette.surface);
    expect(nightStyles.primaryButton.backgroundColor).toBe(nightPalette.accent);
    expect(nightStyles.primaryButtonText.color).toBe(nightPalette.accentText);
    expect(nightStyles.status.color).toBe(nightPalette.success);
    expect(nightStyles.dangerButton.borderColor).toBe(nightPalette.danger);
    expect(nightStyles.error.color).toBe(nightPalette.danger);
    expect(dayStyles.container.backgroundColor).toBe(dayPalette.page);
    expect(dayStyles.card.backgroundColor).toBe(dayPalette.surfaceMuted);
    expect(dayStyles.buttonText.color).toBe(dayPalette.link);
  });

  it("themes grow tasks, including linked states, fields, actions, and danger controls", () => {
    const styles = createGrowTasksStyles(nightPalette);

    expect(styles.container.backgroundColor).toBe(nightPalette.page);
    expect(styles.form).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
    expect(styles.card.backgroundColor).toBe(nightPalette.surface);
    expect(styles.focusedCard).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.accentSoft,
        borderColor: nightPalette.accent
      })
    );
    expect(styles.chipOn.backgroundColor).toBe(nightPalette.accent);
    expect(styles.dangerBtn.borderColor).toBe(nightPalette.danger);
    expect(styles.dangerText.color).toBe(nightPalette.danger);
  });

  it("themes grow plants, including empty, selected, field, and action states", () => {
    const styles = createGrowPlantsStyles(nightPalette);

    expect(styles.container.backgroundColor).toBe(nightPalette.page);
    expect(styles.form).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
    expect(styles.empty.backgroundColor).toBe(nightPalette.surfaceMuted);
    expect(styles.card.backgroundColor).toBe(nightPalette.surface);
    expect(styles.cardFocused.borderColor).toBe(nightPalette.accent);
    expect(styles.quickAction.backgroundColor).toBe(nightPalette.accentSoft);
    expect(styles.quickActionText.color).toBe(nightPalette.link);
  });

  it("themes the shared grow workspace navigation in both modes", () => {
    const nightStyles = createGrowWorkspaceNavStyles(nightPalette);
    const dayStyles = createGrowWorkspaceNavStyles(dayPalette);

    expect(nightStyles.pill).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border
      })
    );
    expect(nightStyles.pillActive.backgroundColor).toBe(nightPalette.accent);
    expect(nightStyles.text.color).toBe(nightPalette.text);
    expect(nightStyles.textActive.color).toBe(nightPalette.accentText);
    expect(dayStyles.pill.backgroundColor).toBe(dayPalette.surface);
    expect(dayStyles.text.color).toBe(dayPalette.text);
  });

  it("keeps every grow form field and loading state palette-aware", () => {
    const sources = [
      "src/app/home/personal/(tabs)/grows/[growId]/index.tsx",
      "src/app/home/personal/(tabs)/grows/[growId]/timeline.tsx",
      "src/app/home/personal/(tabs)/grows/[growId]/automation.tsx",
      "src/app/home/personal/(tabs)/grows/[growId]/tasks.tsx",
      "src/app/home/personal/(tabs)/grows/[growId]/plants.tsx"
    ].map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"));

    for (const source of sources) {
      const fields = source.match(/<TextInput\b/g) || [];
      const placeholders =
        source.match(/placeholderTextColor={palette\.textMuted}/g) || [];
      const selections = source.match(/selectionColor={palette\.accent}/g) || [];

      expect(placeholders).toHaveLength(fields.length);
      expect(selections).toHaveLength(fields.length);
      expect(source).toContain("<ActivityIndicator color={palette.accent} />");
      expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    }

    const navSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/personal/GrowWorkspaceNav.tsx"),
      "utf8"
    );
    expect(navSource).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
  });
});
