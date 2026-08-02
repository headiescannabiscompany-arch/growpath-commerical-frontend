import { getThemePalette, resolveThemeMode } from "@/theme/appTheme";

function relativeLuminance(hex: string) {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((value) => parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first: string, second: string) {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe("app theme modes", () => {
  it("resolves auto mode from the device color scheme", () => {
    expect(resolveThemeMode("auto", "light")).toBe("day");
    expect(resolveThemeMode("auto", "dark")).toBe("night");
  });

  it("keeps day mode aligned with the forum-style green theme", () => {
    const palette = getThemePalette("day", "dark");
    expect(palette.resolvedMode).toBe("day");
    expect(palette.page).toBe("#F1F7F2");
    expect(palette.hero).toBe("#ECFDF5");
    expect(palette.accent).toBe("#166534");
    expect(palette.link).toBe("#166534");
  });

  it("keeps night mode aligned with the dark green and blue-clickable theme", () => {
    const palette = getThemePalette("night", "light");
    expect(palette.resolvedMode).toBe("night");
    expect(palette.page).toBe("#0E141B");
    expect(palette.hero).toBe("#101823");
    expect(palette.accent).toBe("#78AAFF");
    expect(palette.link).toBe("#78AAFF");
  });

  it.each(["day", "night"] as const)(
    "keeps %s primary action text at WCAG AA contrast",
    (mode) => {
      const palette = getThemePalette(mode, mode === "night" ? "dark" : "light");
      expect(contrastRatio(palette.accent, palette.accentText)).toBeGreaterThanOrEqual(
        4.5
      );
      expect(contrastRatio(palette.page, palette.text)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.surface, palette.textMuted)).toBeGreaterThanOrEqual(
        4.5
      );
    }
  );
});
