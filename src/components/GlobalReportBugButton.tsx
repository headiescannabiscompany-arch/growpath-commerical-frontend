import React from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { usePathname } from "expo-router";

import ReportBugButton from "@/components/ReportBugButton";

export function shouldDockReportBugButton(width: number) {
  return width < 600;
}

export default function GlobalReportBugButton() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
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
    backgroundColor: "#F4F7FB",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#D8DEE8"
  },
  mobileButton: {
    alignSelf: "flex-end"
  }
});
