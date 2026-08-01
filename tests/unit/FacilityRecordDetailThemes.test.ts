import { createFacilityGrowDetailStyles } from "../../src/app/home/facility/grows/[id]";
import { createFacilityPlantDetailStyles } from "../../src/app/home/facility/plants/[id]";
import { createFacilityLogDetailStyles } from "../../src/app/home/facility/logs/[id]";
import { getThemePalette } from "../../src/theme/appTheme";

describe("Facility record detail Night themes", () => {
  it("uses the active palette for grow detail and workspace surfaces", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createFacilityGrowDetailStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.card.backgroundColor).toBe(palette.card);
    expect(styles.summaryItem.backgroundColor).toBe(palette.surface);
    expect(styles.summaryValue.color).toBe(palette.text);
    expect(styles.workspaceAction.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.workspaceLabel.color).toBe(palette.link);
  });

  it("uses the active palette for plant detail evidence", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createFacilityPlantDetailStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.card.backgroundColor).toBe(palette.card);
    expect(styles.h1.color).toBe(palette.text);
    expect(styles.k.color).toBe(palette.textMuted);
    expect(styles.v.color).toBe(palette.text);
  });

  it("uses the active palette for journal detail evidence", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createFacilityLogDetailStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.card.backgroundColor).toBe(palette.card);
    expect(styles.h1.color).toBe(palette.text);
    expect(styles.k.color).toBe(palette.textMuted);
    expect(styles.v.color).toBe(palette.text);
  });
});
