import { getThemePalette, resolveThemeMode } from "@/theme/appTheme";

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
  });

  it("keeps night mode aligned with the dark green and blue-clickable theme", () => {
    const palette = getThemePalette("night", "light");
    expect(palette.resolvedMode).toBe("night");
    expect(palette.page).toBe("#0E141B");
    expect(palette.hero).toBe("#101823");
    expect(palette.accent).toBe("#78AAFF");
    expect(palette.link).toBe("#78AAFF");
  });
});
