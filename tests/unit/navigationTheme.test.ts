jest.unmock("@react-navigation/native");

import { getThemePalette } from "@/theme/appTheme";
import { getNavigationTheme } from "@/theme/navigationTheme";

describe("navigation theme bridge", () => {
  it("maps the day app palette to React Navigation colors", () => {
    const palette = getThemePalette("day", "dark");
    const navigationTheme = getNavigationTheme(palette);

    expect(navigationTheme.dark).toBe(false);
    expect(navigationTheme.colors).toMatchObject({
      primary: palette.link,
      background: palette.page,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.danger
    });
    expect(navigationTheme.fonts).toBeDefined();
  });

  it("maps the night app palette to React Navigation colors", () => {
    const palette = getThemePalette("night", "light");
    const navigationTheme = getNavigationTheme(palette);

    expect(navigationTheme.dark).toBe(true);
    expect(navigationTheme.colors).toMatchObject({
      primary: palette.link,
      background: palette.page,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.danger
    });
    expect(navigationTheme.fonts).toBeDefined();
  });
});
