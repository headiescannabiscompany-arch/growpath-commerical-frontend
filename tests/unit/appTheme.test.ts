import { getThemePalette, resolveThemeMode } from "@/theme/appTheme";

function relativeLuminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first: string, second: string) {
  const brighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (brighter + 0.05) / (darker + 0.05);
}

describe("app theme modes", () => {
  it("resolves auto mode from the device color scheme", () => {
    expect(resolveThemeMode("auto", "light")).toBe("day");
    expect(resolveThemeMode("auto", "dark")).toBe("night");
  });

  it("resolves location auto mode from sunrise and sunset instead of device theme", () => {
    const location = {
      latitude: 0,
      longitude: 0,
      updatedAt: "2026-06-21T00:00:00.000Z"
    };
    const midday = new Date(2026, 5, 21, 12, 0, 0).getTime();
    const midnight = new Date(2026, 5, 21, 0, 0, 0).getTime();

    expect(resolveThemeMode("auto", "dark", "location", location, midday)).toBe("day");
    expect(resolveThemeMode("auto", "light", "location", location, midnight)).toBe(
      "night"
    );
  });

  it("keeps day mode aligned with the forum-style green theme", () => {
    const palette = getThemePalette("day", "dark");
    expect(palette.resolvedMode).toBe("day");
    expect(palette.page).toBe("#F1F7F2");
    expect(palette.hero).toBe("#ECFDF5");
    expect(palette.accent).toBe("#166534");
    expect(palette.link).toBe("#166534");
    expect(palette.dangerText).toBe("#FFFFFF");
  });

  it("keeps night mode aligned with the dark green and blue-clickable theme", () => {
    const palette = getThemePalette("night", "light");
    expect(palette.resolvedMode).toBe("night");
    expect(palette.page).toBe("#0E141B");
    expect(palette.hero).toBe("#101823");
    expect(palette.accent).toBe("#78AAFF");
    expect(palette.link).toBe("#78AAFF");
    expect(palette.dangerText).toBe("#0E141B");
  });

  it.each([
    ["day", "light"],
    ["night", "dark"]
  ] as const)("keeps %s danger labels at accessible contrast", (mode, scheme) => {
    const palette = getThemePalette(mode, scheme);

    expect(contrastRatio(palette.danger, palette.dangerText)).toBeGreaterThanOrEqual(4.5);
  });
});
