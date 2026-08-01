import { createStyles as createVideoDetailStyles } from "@/app/videos/[videoId]";
import { createStyles as createLessonMediaStyles } from "@/components/learning/LessonMediaCard";

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
  success: "#78D69B",
  warning: "#E3BE63",
  danger: "#FF7B89"
} as any;

describe("video detail and lesson media themes", () => {
  it("uses the active palette for loaded video detail content", () => {
    const styles = createVideoDetailStyles(palette);

    expect(styles.title.color).toBe(palette.heroText);
    expect(styles.owner.color).toBe(palette.text);
    expect(styles.description.color).toBe(palette.text);
    expect(styles.reportButton).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.border
      })
    );
    expect(styles.tag.backgroundColor).toBe(palette.surfaceMuted);
  });

  it("uses the active palette for media, summaries, warnings, and actions", () => {
    const styles = createLessonMediaStyles(palette);

    expect(styles.card).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(styles.title.color).toBe(palette.text);
    expect(styles.summaryBox.backgroundColor).toBe(palette.accentSoft);
    expect(styles.warningBox.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.secondaryButton.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.statusText.color).toBe(palette.textMuted);
  });
});
