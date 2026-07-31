import React from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { usePathname } from "expo-router";

import ReportBugButton from "@/components/ReportBugButton";
import { useAppTheme } from "@/theme/appTheme";

export function shouldDockReportBugButton(width: number) {
  return width < 600;
}

export default function GlobalReportBugButton() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { palette } = useAppTheme();
  const isDocked = shouldDockReportBugButton(width);
  if (pathname === "/support") return null;
  return (
    <View
      pointerEvents="box-none"
      style={[
        isDocked ? styles.mobileDock : styles.layer,
        isDocked
          ? {
              backgroundColor: palette.page,
              borderTopColor: palette.borderSoft
            }
          : null
      ]}
    >
      <View style={[isDocked ? styles.mobileButton : styles.button]}>
        <ReportBugButton label="Report Bug" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderTopWidth: StyleSheet.hairlineWidth
  },
  mobileButton: {
    alignSelf: "flex-end"
  }
});
