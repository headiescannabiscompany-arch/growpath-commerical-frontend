import { createFeedCampaignStyles } from "../../src/app/feed";
import { getThemePalette } from "../../src/theme/appTheme";

describe("Feed campaign Night theme", () => {
  it("uses the active palette across campaign, filter, form, and result surfaces", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createFeedCampaignStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.card.backgroundColor).toBe(palette.card);
    expect(styles.filters.backgroundColor).toBe(palette.card);
    expect(styles.input.backgroundColor).toBe(palette.surface);
    expect(styles.input.color).toBe(palette.text);
    expect(styles.chip.backgroundColor).toBe(palette.surface);
    expect(styles.chipSelected.backgroundColor).toBe(palette.accent);
    expect(styles.post.backgroundColor).toBe(palette.card);
    expect(styles.secondaryButtonText.color).toBe(palette.link);
  });
});
