import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";

import type { ThemePalette } from "@/theme/appTheme";

type WorkspaceTabOptionsInput = {
  compact: boolean;
  headerShown: boolean;
  hideTabBar: boolean;
  palette: ThemePalette;
};

export function getWorkspaceTabOptions({
  compact,
  headerShown,
  hideTabBar,
  palette
}: WorkspaceTabOptionsInput): BottomTabNavigationOptions {
  return {
    headerShown,
    tabBarHideOnKeyboard: true,
    tabBarIcon: () => null,
    tabBarIconStyle: { display: "none" },
    tabBarLabelPosition: "beside-icon",
    headerStyle: { backgroundColor: palette.surface },
    headerTintColor: palette.text,
    headerTitleStyle: { color: palette.text },
    tabBarActiveTintColor: palette.tabActive,
    tabBarInactiveTintColor: palette.tabInactive,
    tabBarShowLabel: true,
    tabBarLabelStyle: {
      fontSize: compact ? 10 : 12,
      fontWeight: "700",
      lineHeight: compact ? 12 : 14,
      marginEnd: 0,
      marginStart: 0,
      textAlign: "center"
    },
    tabBarItemStyle: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: compact ? 2 : 6
    },
    tabBarStyle: hideTabBar
      ? { display: "none" }
      : {
          backgroundColor: palette.tabBar,
          borderTopColor: palette.tabBarBorder,
          height: compact ? 72 : 58,
          paddingBottom: compact ? 22 : 6,
          paddingTop: 4
        }
  };
}
