import React, { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { usePathname } from "expo-router";

import ReportBugButton from "@/components/ReportBugButton";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

export function shouldDockReportBugButton(width: number) {
  // Keep the global support action in document flow at every real viewport width.
  // A floating desktop control can cover page actions near the lower-right corner.
  return width >= 0;
}

export default function GlobalReportBugButton() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createGlobalReportBugButtonStyles(palette), [palette]);
  const isDocked = shouldDockReportBugButton(width);
  if (pathname === "/support") return null;
  return (
    <View pointerEvents="box-none" style={isDocked ? styles.mobileDock : styles.layer}>
      <View style={isDocked ? styles.mobileButton : styles.button}>
        <ReportBugButton label="Report Bug" />
      </View>
    </View>
  );
}

export const createGlobalReportBugButtonStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    layer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 10000,
      elevation: 10000
    },
    button: {
      position: "absolute",
      right: 12,
      bottom: 76
    },
    mobileDock: {
      position: "relative",
      zIndex: 10000,
      elevation: 10000,
      flexShrink: 0,
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: palette.surfaceStrong,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.border
    },
    mobileButton: {
      alignSelf: "flex-end"
    }
  });
