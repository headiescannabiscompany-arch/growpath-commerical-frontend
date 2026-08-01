import { createStyles } from "@/components/videos/VideoCard";

describe("VideoCard theme", () => {
  it("uses the active palette for cards, copy, status, and actions", () => {
    const palette = {
      surface: "#151D27",
      surfaceMuted: "#1A2330",
      border: "#283545",
      text: "#F4F7FB",
      textMuted: "#C9D4DF",
      heroText: "#FFFFFF",
      accent: "#78AAFF",
      accentSoft: "#16263A",
      accentText: "#FFFFFF",
      info: "#78AAFF",
      link: "#78AAFF",
      danger: "#FF7B89"
    } as any;

    const styles = createStyles(palette);

    expect(styles.card).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(styles.title.color).toBe(palette.text);
    expect(styles.meta.color).toBe(palette.textMuted);
    expect(styles.status.backgroundColor).toBe(palette.accentSoft);
    expect(styles.primaryButton.backgroundColor).toBe(palette.accent);
    expect(styles.secondaryButton.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.dangerText.color).toBe(palette.danger);
  });
});
