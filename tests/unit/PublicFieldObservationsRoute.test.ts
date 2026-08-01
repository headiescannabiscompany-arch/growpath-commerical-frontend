import {
  createStyles,
  fieldStudiesActionLabel,
  fieldStudiesDestination
} from "@/app/field-observations";

describe("Public Field Observations route", () => {
  it("keeps Field Study creation inside the Personal workspace", () => {
    expect(fieldStudiesDestination("personal")).toBe("/home/personal/field-studies");
    expect(fieldStudiesActionLabel("personal")).toBe("Start a Field Study");
    expect(fieldStudiesDestination("facility")).toBe("/account/mode");
    expect(fieldStudiesActionLabel("facility")).toBe(
      "Switch to Personal for Field Studies"
    );
    expect(fieldStudiesDestination("commercial")).toBe("/account/mode");
  });

  it("uses the active palette across search, filters, map, and result states", () => {
    const palette = {
      page: "#0E141B",
      surface: "#151D27",
      surfaceMuted: "#1A2330",
      border: "#283545",
      text: "#F4F7FB",
      textMuted: "#C9D4DF",
      heroText: "#FFFFFF",
      accent: "#78AAFF",
      accentSoft: "#16263A",
      accentText: "#FFFFFF",
      link: "#78AAFF",
      danger: "#FF7B89"
    } as any;

    const styles = createStyles(palette);

    expect(styles.screen.backgroundColor).toBe(palette.page);
    expect(styles.searchInput).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.filterChip.backgroundColor).toBe(palette.surface);
    expect(styles.mapPanel.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.status.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.card.backgroundColor).toBe(palette.surface);
  });
});
