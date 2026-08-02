import {
  DarkTheme,
  DefaultTheme,
  type Theme as NavigationTheme
} from "@react-navigation/native";

import type { ThemePalette } from "@/theme/appTheme";

export function getNavigationTheme(palette: ThemePalette): NavigationTheme {
  const baseTheme = palette.resolvedMode === "night" ? DarkTheme : DefaultTheme;

  return {
    ...baseTheme,
    dark: palette.resolvedMode === "night",
    colors: {
      ...baseTheme.colors,
      primary: palette.link,
      background: palette.page,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.danger
    }
  };
}
